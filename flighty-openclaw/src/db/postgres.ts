import { Pool } from "pg";
import type { FlightEvent, FlightSnapshot, PriceQuote, PriceWatch, TrackedFlight, User } from "../types/models.js";
import { uid } from "../utils/id.js";
import type { Database } from "./store.js";

export class PostgresDatabase implements Database {
  constructor(private readonly pool: Pool) {}

  async getOrCreateUser(externalUserKey: string): Promise<User> {
    const existing = await this.pool.query(
      `select id, external_user_key, display_name, time_zone, home_airport,
              quiet_hours_start, quiet_hours_end
       from users where external_user_key = $1`,
      [externalUserKey]
    );

    if (existing.rowCount) return this.rowToUser(existing.rows[0]);

    const id = uid();
    await this.pool.query(
      `insert into users (id, external_user_key, time_zone)
       values ($1, $2, 'America/New_York')`,
      [id, externalUserKey]
    );
    return { id, externalUserKey, timeZone: "America/New_York" };
  }

  async getUserById(userId: string): Promise<User | undefined> {
    const res = await this.pool.query(
      `select id, external_user_key, display_name, time_zone, home_airport,
              quiet_hours_start, quiet_hours_end
       from users where id = $1`,
      [userId]
    );
    return res.rowCount ? this.rowToUser(res.rows[0]) : undefined;
  }

  async addTrackedFlight(flight: Omit<TrackedFlight, "id" | "createdAt">): Promise<TrackedFlight> {
    const id = uid();
    const createdAt = new Date().toISOString();
    await this.pool.query(
      `insert into tracked_flights
        (id, user_id, airline_code, flight_number, flight_date, departure_airport, arrival_airport, tracking_state, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (user_id, airline_code, flight_number, flight_date)
       do update set tracking_state='active'
      `,
      [
        id,
        flight.userId,
        flight.airlineCode,
        flight.flightNumber,
        flight.flightDate,
        flight.departureAirport ?? null,
        flight.arrivalAirport ?? null,
        flight.trackingState,
        createdAt
      ]
    );
    return { ...flight, id, createdAt };
  }

  async listTrackedFlights(userId: string): Promise<TrackedFlight[]> {
    const res = await this.pool.query(
      `select id, user_id, airline_code, flight_number, flight_date, departure_airport, arrival_airport, tracking_state, created_at
       from tracked_flights
       where user_id = $1 and tracking_state = 'active'
       order by flight_date asc`,
      [userId]
    );
    return res.rows.map(this.rowToTrackedFlight);
  }

  async listAllActiveTrackedFlights(): Promise<TrackedFlight[]> {
    const res = await this.pool.query(
      `select id, user_id, airline_code, flight_number, flight_date, departure_airport, arrival_airport, tracking_state, created_at
       from tracked_flights
       where tracking_state = 'active'`
    );
    return res.rows.map(this.rowToTrackedFlight);
  }

  async latestSnapshot(trackedFlightId: string): Promise<FlightSnapshot | undefined> {
    const res = await this.pool.query(
      `select * from flight_snapshots where tracked_flight_id=$1 order by created_at desc limit 1`,
      [trackedFlightId]
    );
    return res.rowCount ? this.rowToSnapshot(res.rows[0]) : undefined;
  }

  async addSnapshot(snapshot: FlightSnapshot): Promise<void> {
    await this.pool.query(
      `insert into flight_snapshots
      (tracked_flight_id, provider, status, sched_dep, est_dep, act_dep, sched_arr, est_arr, act_arr,
       dep_gate, arr_gate, aircraft_type, tail_number, lat, lon, altitude_ft, speed_kts, raw_json, created_at)
      values
      ($1,'flight-tracker',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        snapshot.trackedFlightId,
        snapshot.status,
        snapshot.schedDep ?? null,
        snapshot.estDep ?? null,
        snapshot.actDep ?? null,
        snapshot.schedArr ?? null,
        snapshot.estArr ?? null,
        snapshot.actArr ?? null,
        snapshot.depGate ?? null,
        snapshot.arrGate ?? null,
        snapshot.aircraftType ?? null,
        snapshot.tailNumber ?? null,
        snapshot.lat ?? null,
        snapshot.lon ?? null,
        snapshot.altitudeFt ?? null,
        snapshot.speedKts ?? null,
        snapshot.rawJson ? JSON.stringify(snapshot.rawJson) : null,
        snapshot.createdAt
      ]
    );
  }

  async addEvent(event: FlightEvent): Promise<boolean> {
    const res = await this.pool.query(
      `insert into flight_events (tracked_flight_id, event_type, event_payload, fingerprint)
       values ($1,$2,$3,$4)
       on conflict (tracked_flight_id, fingerprint) do nothing`,
      [event.trackedFlightId, event.eventType, JSON.stringify(event.eventPayload), event.fingerprint]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async addPriceWatch(watch: Omit<PriceWatch, "id" | "active">): Promise<PriceWatch> {
    const id = uid();
    await this.pool.query(
      `insert into price_watches (id, user_id, origin, destination, start_date, end_date, target_price_usd, active)
       values ($1,$2,$3,$4,$5,$6,$7,true)`,
      [id, watch.userId, watch.origin, watch.destination, watch.startDate, watch.endDate, watch.targetPriceUsd]
    );
    return { ...watch, id, active: true };
  }

  async listPriceWatches(userId: string): Promise<PriceWatch[]> {
    const res = await this.pool.query(
      `select id, user_id, origin, destination, start_date, end_date, target_price_usd, active
       from price_watches where user_id=$1 and active=true`,
      [userId]
    );
    return res.rows.map(this.rowToPriceWatch);
  }

  async listAllActivePriceWatches(): Promise<PriceWatch[]> {
    const res = await this.pool.query(
      `select id, user_id, origin, destination, start_date, end_date, target_price_usd, active
       from price_watches where active=true`
    );
    return res.rows.map(this.rowToPriceWatch);
  }

  async addPriceHit(watchId: string, quote: PriceQuote): Promise<void> {
    await this.pool.query(
      `insert into price_watch_hits (watch_id, seen_price_usd, deep_link, raw_json)
       values ($1,$2,$3,$4)`,
      [watchId, quote.amountUsd, quote.deeplink ?? null, JSON.stringify(quote)]
    );
  }

  async hasRecentHit(watchId: string, withinHours = 12): Promise<boolean> {
    const res = await this.pool.query(
      `select 1 from price_watch_hits
       where watch_id=$1 and created_at > now() - ($2 || ' hours')::interval
       limit 1`,
      [watchId, String(withinHours)]
    );
    return (res.rowCount ?? 0) > 0;
  }

  private rowToUser = (row: any): User => ({
    id: row.id,
    externalUserKey: row.external_user_key,
    displayName: row.display_name ?? undefined,
    timeZone: row.time_zone,
    homeAirport: row.home_airport ?? undefined,
    quietHoursStart: row.quiet_hours_start ?? undefined,
    quietHoursEnd: row.quiet_hours_end ?? undefined
  });

  private rowToTrackedFlight = (row: any): TrackedFlight => ({
    id: row.id,
    userId: row.user_id,
    airlineCode: row.airline_code,
    flightNumber: row.flight_number,
    flightDate: row.flight_date,
    departureAirport: row.departure_airport ?? undefined,
    arrivalAirport: row.arrival_airport ?? undefined,
    trackingState: row.tracking_state,
    createdAt: new Date(row.created_at).toISOString()
  });

  private rowToSnapshot = (row: any): FlightSnapshot => ({
    trackedFlightId: row.tracked_flight_id,
    status: row.status,
    schedDep: row.sched_dep?.toISOString?.() ?? row.sched_dep ?? undefined,
    estDep: row.est_dep?.toISOString?.() ?? row.est_dep ?? undefined,
    actDep: row.act_dep?.toISOString?.() ?? row.act_dep ?? undefined,
    schedArr: row.sched_arr?.toISOString?.() ?? row.sched_arr ?? undefined,
    estArr: row.est_arr?.toISOString?.() ?? row.est_arr ?? undefined,
    actArr: row.act_arr?.toISOString?.() ?? row.act_arr ?? undefined,
    depGate: row.dep_gate ?? undefined,
    arrGate: row.arr_gate ?? undefined,
    aircraftType: row.aircraft_type ?? undefined,
    tailNumber: row.tail_number ?? undefined,
    lat: row.lat ?? undefined,
    lon: row.lon ?? undefined,
    altitudeFt: row.altitude_ft ?? undefined,
    speedKts: row.speed_kts ?? undefined,
    rawJson: row.raw_json ?? undefined,
    createdAt: new Date(row.created_at).toISOString()
  });

  private rowToPriceWatch = (row: any): PriceWatch => ({
    id: row.id,
    userId: row.user_id,
    origin: row.origin,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    targetPriceUsd: Number(row.target_price_usd),
    active: row.active
  });
}

export function createPostgresDatabase(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  return new PostgresDatabase(pool);
}
