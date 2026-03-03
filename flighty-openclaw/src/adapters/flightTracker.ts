import type { FlightRef, FlightSnapshot, FlightStatus } from "../types/models.js";
import type { AviationStackResponse } from "../types/providers.js";
import { aviationStackResponseSchema } from "../types/providers.js";
import { fetchJsonWithRetry } from "../utils/http.js";

export interface FlightTrackerAdapter {
  getFlightStatus(ref: FlightRef): Promise<FlightSnapshot>;
}

const randomStatus = (): FlightStatus => {
  const statuses: FlightStatus[] = ["scheduled", "active", "delayed", "landed"];
  return statuses[Math.floor(Math.random() * statuses.length)]!;
};

export class MockFlightTrackerAdapter implements FlightTrackerAdapter {
  async getFlightStatus(ref: FlightRef): Promise<FlightSnapshot> {
    const now = new Date();
    const status = randomStatus();
    const delayMinutes = status === "delayed" ? 20 + Math.floor(Math.random() * 50) : 0;

    return {
      trackedFlightId: "",
      status,
      schedDep: new Date(now.getTime() + 2 * 3600_000).toISOString(),
      estDep: new Date(now.getTime() + (2 * 3600_000 + delayMinutes * 60_000)).toISOString(),
      schedArr: new Date(now.getTime() + 6 * 3600_000).toISOString(),
      estArr: new Date(now.getTime() + (6 * 3600_000 + delayMinutes * 60_000)).toISOString(),
      depGate: "A12",
      arrGate: "C7",
      aircraftType: "B738",
      tailNumber: "N12345",
      lat: status === "active" ? 39.1 : undefined,
      lon: status === "active" ? -96.8 : undefined,
      altitudeFt: status === "active" ? 31000 : undefined,
      speedKts: status === "active" ? 440 : undefined,
      rawJson: { mock: true, ref },
      createdAt: new Date().toISOString()
    };
  }
}

export class AviationStackFlightTrackerAdapter implements FlightTrackerAdapter {
  constructor(private readonly apiKey: string, private readonly fallback: FlightTrackerAdapter) {}

  async getFlightStatus(ref: FlightRef): Promise<FlightSnapshot> {
    try {
      const query = new URLSearchParams({
        access_key: this.apiKey,
        flight_iata: `${ref.airlineCode}${ref.flightNumber}`
      });

      const url = `http://api.aviationstack.com/v1/flights?${query.toString()}`;
      const raw = await fetchJsonWithRetry<unknown>(url);
      const parsed = aviationStackResponseSchema.safeParse(raw);
      if (!parsed.success) throw new Error("Invalid aviationstack payload");

      return mapAviationStackToSnapshot(parsed.data);
    } catch {
      return this.fallback.getFlightStatus(ref);
    }
  }
}

export class HttpFlightTrackerAdapter implements FlightTrackerAdapter {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly fallback: FlightTrackerAdapter = new MockFlightTrackerAdapter()
  ) {}

  async getFlightStatus(ref: FlightRef): Promise<FlightSnapshot> {
    try {
      const query = new URLSearchParams({
        airline: ref.airlineCode,
        flight_number: ref.flightNumber,
        date: ref.flightDate
      });
      if (ref.departureAirport) query.set("departure", ref.departureAirport);
      if (ref.arrivalAirport) query.set("arrival", ref.arrivalAirport);

      const url = `${this.baseUrl.replace(/\/$/, "")}/flight/status?${query.toString()}`;
      const response = await fetchJsonWithRetry<any>(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        }
      });

      return {
        trackedFlightId: "",
        status: normalizeStatus(response?.status),
        schedDep: response?.times?.scheduledDeparture,
        estDep: response?.times?.estimatedDeparture,
        actDep: response?.times?.actualDeparture,
        schedArr: response?.times?.scheduledArrival,
        estArr: response?.times?.estimatedArrival,
        actArr: response?.times?.actualArrival,
        depGate: response?.gates?.departure,
        arrGate: response?.gates?.arrival,
        aircraftType: response?.aircraft?.type,
        tailNumber: response?.aircraft?.tail,
        lat: response?.live?.lat,
        lon: response?.live?.lon,
        altitudeFt: response?.live?.altitudeFt,
        speedKts: response?.live?.speedKts,
        rawJson: response,
        createdAt: new Date().toISOString()
      };
    } catch {
      return this.fallback.getFlightStatus(ref);
    }
  }
}

function mapAviationStackToSnapshot(res: AviationStackResponse): FlightSnapshot {
  const first = res.data[0];
  const dep = first?.departure;
  const arr = first?.arrival;
  const live = first?.live;

  return {
    trackedFlightId: "",
    status: normalizeStatus(first?.flight_status),
    schedDep: dep?.scheduled ?? undefined,
    estDep: dep?.estimated ?? undefined,
    actDep: dep?.actual ?? undefined,
    schedArr: arr?.scheduled ?? undefined,
    estArr: arr?.estimated ?? undefined,
    actArr: arr?.actual ?? undefined,
    depGate: dep?.gate ?? undefined,
    arrGate: arr?.gate ?? undefined,
    aircraftType: first?.aircraft?.iata ?? undefined,
    tailNumber: first?.aircraft?.registration ?? undefined,
    lat: live?.latitude ?? undefined,
    lon: live?.longitude ?? undefined,
    altitudeFt: live?.altitude ?? undefined,
    speedKts: live?.speed_horizontal ?? undefined,
    rawJson: res,
    createdAt: new Date().toISOString()
  };
}

function normalizeStatus(status: string | undefined): FlightStatus {
  const value = (status ?? "scheduled").toLowerCase();
  if (["scheduled", "active", "delayed", "landed", "cancelled"].includes(value)) {
    return value as FlightStatus;
  }

  if (["en-route", "in_air", "in-air"].includes(value)) return "active";
  if (["incident", "diverted"].includes(value)) return "delayed";

  return "scheduled";
}
