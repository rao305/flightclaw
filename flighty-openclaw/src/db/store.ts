import type { FlightEvent, FlightSnapshot, PriceQuote, PriceWatch, TrackedFlight, User } from "../types/models.js";
import { uid } from "../utils/id.js";

export interface Database {
  getOrCreateUser(externalUserKey: string): Promise<User>;
  addTrackedFlight(flight: Omit<TrackedFlight, "id" | "createdAt">): Promise<TrackedFlight>;
  listTrackedFlights(userId: string): Promise<TrackedFlight[]>;
  listAllActiveTrackedFlights(): Promise<TrackedFlight[]>;
  latestSnapshot(trackedFlightId: string): Promise<FlightSnapshot | undefined>;
  addSnapshot(snapshot: FlightSnapshot): Promise<void>;
  addEvent(event: FlightEvent): Promise<boolean>;
  addPriceWatch(watch: Omit<PriceWatch, "id" | "active">): Promise<PriceWatch>;
  listPriceWatches(userId: string): Promise<PriceWatch[]>;
  listAllActivePriceWatches(): Promise<PriceWatch[]>;
  addPriceHit(watchId: string, quote: PriceQuote): Promise<void>;
  hasRecentHit(watchId: string, withinHours?: number): Promise<boolean>;
  getUserById(userId: string): Promise<User | undefined>;
}

export class InMemoryDatabase implements Database {
  private users = new Map<string, User>();
  private usersByExternalKey = new Map<string, string>();
  private trackedFlights = new Map<string, TrackedFlight>();
  private snapshots = new Map<string, FlightSnapshot[]>();
  private events = new Map<string, FlightEvent[]>();
  private eventFingerprints = new Set<string>();
  private priceWatches = new Map<string, PriceWatch>();
  private priceHits = new Map<string, PriceQuote[]>();

  async getOrCreateUser(externalUserKey: string): Promise<User> {
    const existingId = this.usersByExternalKey.get(externalUserKey);
    if (existingId) return this.users.get(existingId)!;

    const user: User = {
      id: uid(),
      externalUserKey,
      timeZone: "America/New_York"
    };
    this.users.set(user.id, user);
    this.usersByExternalKey.set(externalUserKey, user.id);
    return user;
  }

  async getUserById(userId: string): Promise<User | undefined> {
    return this.users.get(userId);
  }

  async addTrackedFlight(flight: Omit<TrackedFlight, "id" | "createdAt">): Promise<TrackedFlight> {
    const tf: TrackedFlight = { ...flight, id: uid(), createdAt: new Date().toISOString() };
    this.trackedFlights.set(tf.id, tf);
    return tf;
  }

  async listTrackedFlights(userId: string): Promise<TrackedFlight[]> {
    return [...this.trackedFlights.values()].filter(
      (f) => f.userId === userId && f.trackingState === "active"
    );
  }

  async listAllActiveTrackedFlights(): Promise<TrackedFlight[]> {
    return [...this.trackedFlights.values()].filter((f) => f.trackingState === "active");
  }

  async latestSnapshot(trackedFlightId: string): Promise<FlightSnapshot | undefined> {
    const arr = this.snapshots.get(trackedFlightId) ?? [];
    return arr.at(-1);
  }

  async addSnapshot(snapshot: FlightSnapshot): Promise<void> {
    const arr = this.snapshots.get(snapshot.trackedFlightId) ?? [];
    arr.push(snapshot);
    this.snapshots.set(snapshot.trackedFlightId, arr);
  }

  async addEvent(event: FlightEvent): Promise<boolean> {
    const key = `${event.trackedFlightId}:${event.fingerprint}`;
    if (this.eventFingerprints.has(key)) return false;
    this.eventFingerprints.add(key);
    const arr = this.events.get(event.trackedFlightId) ?? [];
    arr.push(event);
    this.events.set(event.trackedFlightId, arr);
    return true;
  }

  async addPriceWatch(watch: Omit<PriceWatch, "id" | "active">): Promise<PriceWatch> {
    const pw: PriceWatch = { ...watch, id: uid(), active: true };
    this.priceWatches.set(pw.id, pw);
    return pw;
  }

  async listPriceWatches(userId: string): Promise<PriceWatch[]> {
    return [...this.priceWatches.values()].filter((w) => w.userId === userId && w.active);
  }

  async listAllActivePriceWatches(): Promise<PriceWatch[]> {
    return [...this.priceWatches.values()].filter((w) => w.active);
  }

  async addPriceHit(watchId: string, quote: PriceQuote): Promise<void> {
    const arr = this.priceHits.get(watchId) ?? [];
    arr.push(quote);
    this.priceHits.set(watchId, arr);
  }

  async hasRecentHit(watchId: string, withinHours = 12): Promise<boolean> {
    const arr = this.priceHits.get(watchId) ?? [];
    const latest = arr.at(-1);
    if (!latest) return false;
    return Date.now() - new Date(latest.observedAt).getTime() < withinHours * 3600_000;
  }
}
