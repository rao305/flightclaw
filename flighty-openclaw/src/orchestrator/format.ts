import type { FlightSnapshot, PriceQuote, TrackedFlight } from "../types/models.js";

export function flightCard(f: TrackedFlight, s: FlightSnapshot): string {
  const route = `${f.departureAirport ?? "???"} -> ${f.arrivalAirport ?? "???"}`;
  const delay = s.schedDep && s.estDep
    ? Math.max(0, Math.round((new Date(s.estDep).getTime() - new Date(s.schedDep).getTime()) / 60000))
    : 0;

  return [
    `✈️ ${f.airlineCode}${f.flightNumber} • ${route}`,
    `Status: ${s.status.toUpperCase()}${delay ? ` (+${delay}m)` : ""}`,
    `Dep: ${fmt(s.schedDep)} -> ${fmt(s.estDep)}${s.depGate ? ` (Gate ${s.depGate})` : ""}`,
    `Arr: ${fmt(s.schedArr)} -> ${fmt(s.estArr)}${s.arrGate ? ` (Gate ${s.arrGate})` : ""}`,
    `Aircraft: ${s.aircraftType ?? "Unknown"}${s.tailNumber ? ` (${s.tailNumber})` : ""}`
  ].join("\n");
}

export const priceAlertCard = (watch: {origin: string; destination: string; targetPriceUsd: number}, q: PriceQuote) =>
  [
    `💸 Price Drop: ${watch.origin} -> ${watch.destination}`,
    `Now: $${q.amountUsd.toFixed(2)} (target: $${watch.targetPriceUsd.toFixed(2)})`,
    q.deeplink ? `Book: ${q.deeplink}` : ""
  ].filter(Boolean).join("\n");

const fmt = (iso?: string) => iso ? new Date(iso).toLocaleString() : "-";
