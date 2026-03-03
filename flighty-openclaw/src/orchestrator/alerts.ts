import type { FlightEvent, FlightSnapshot } from "../types/models.js";
import { sha256 } from "../utils/id.js";

export function diffToEvents(prev: FlightSnapshot | undefined, next: FlightSnapshot): FlightEvent[] {
  const events: FlightEvent[] = [];

  if (!prev) {
    return events;
  }

  if (prev.status !== next.status) {
    events.push(evt("status_change", { from: prev.status, to: next.status }, next.trackedFlightId));
  }

  const prevDelay = delayMinutes(prev);
  const nextDelay = delayMinutes(next);
  if (nextDelay - prevDelay >= 15) {
    events.push(evt("delay_increase", { fromMin: prevDelay, toMin: nextDelay }, next.trackedFlightId));
  }

  if (prev.depGate && next.depGate && prev.depGate !== next.depGate) {
    events.push(evt("gate_change", { from: prev.depGate, to: next.depGate }, next.trackedFlightId));
  }

  if (next.status === "cancelled") events.push(evt("cancelled", {}, next.trackedFlightId));
  if (next.status === "active" && prev.status !== "active") events.push(evt("departed", {}, next.trackedFlightId));
  if (next.status === "landed" && prev.status !== "landed") events.push(evt("arrived", {}, next.trackedFlightId));

  return events;
}

function delayMinutes(s: FlightSnapshot): number {
  if (!s.schedDep || !s.estDep) return 0;
  return Math.max(0, Math.round((new Date(s.estDep).getTime() - new Date(s.schedDep).getTime()) / 60000));
}

function evt(
  eventType: FlightEvent["eventType"],
  eventPayload: FlightEvent["eventPayload"],
  trackedFlightId: string
): FlightEvent {
  const fingerprint = sha256(`${eventType}:${JSON.stringify(eventPayload)}`);
  return {
    trackedFlightId,
    eventType,
    eventPayload,
    fingerprint,
    createdAt: new Date().toISOString()
  };
}
