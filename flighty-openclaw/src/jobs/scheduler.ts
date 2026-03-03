import { FlightyEngine } from "../orchestrator/engine.js";

export function startSchedulers(engine: FlightyEngine) {
  safeRun("tracked-flight poll", () => engine.pollTrackedFlights());
  safeRun("price-watch poll", () => engine.pollPriceWatches());

  setInterval(() => {
    safeRun("tracked-flight poll", () => engine.pollTrackedFlights());
  }, 2 * 60_000);

  setInterval(() => {
    safeRun("price-watch poll", () => engine.pollPriceWatches());
  }, 5 * 60_000);
}

async function safeRun(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[scheduler] ${label} failed: ${message}`);
  }
}
