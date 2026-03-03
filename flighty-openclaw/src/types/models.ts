export type FlightStatus = "scheduled" | "active" | "delayed" | "landed" | "cancelled";

export interface User {
  id: string;
  externalUserKey: string;
  displayName?: string;
  timeZone: string;
  homeAirport?: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface FlightRef {
  airlineCode: string;
  flightNumber: string;
  flightDate: string;
  departureAirport?: string;
  arrivalAirport?: string;
}

export interface TrackedFlight extends FlightRef {
  id: string;
  userId: string;
  trackingState: "active" | "completed" | "cancelled";
  createdAt: string;
}

export interface FlightSnapshot {
  trackedFlightId: string;
  status: FlightStatus;
  schedDep?: string;
  estDep?: string;
  actDep?: string;
  schedArr?: string;
  estArr?: string;
  actArr?: string;
  depGate?: string;
  arrGate?: string;
  aircraftType?: string;
  tailNumber?: string;
  lat?: number;
  lon?: number;
  altitudeFt?: number;
  speedKts?: number;
  rawJson?: unknown;
  createdAt: string;
}

export interface FlightEvent {
  trackedFlightId: string;
  eventType: "status_change" | "delay_increase" | "gate_change" | "departed" | "arrived" | "cancelled";
  eventPayload: Record<string, unknown>;
  fingerprint: string;
  createdAt: string;
}

export interface PriceWatch {
  id: string;
  userId: string;
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  targetPriceUsd: number;
  active: boolean;
}

export interface PriceQuote {
  amountUsd: number;
  deeplink?: string;
  observedAt: string;
}
