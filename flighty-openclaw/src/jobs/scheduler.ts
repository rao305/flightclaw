import { FlightyEngine } from "../orchestrator/engine.js";

export function startSchedulers(engine: FlightyEngine) {
  setInterval(() => {
    void engine.pollTrackedFlights();
  }, 2 * 60_000);

  setInterval(() => {
    void engine.pollPriceWatches();
  }, 5 * 60_000);
}
