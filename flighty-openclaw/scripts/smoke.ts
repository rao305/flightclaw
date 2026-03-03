import { FlightyEngine } from "../src/orchestrator/engine.js";
import { InMemoryDatabase } from "../src/db/store.js";
import { MockFlightTrackerAdapter } from "../src/adapters/flightTracker.js";
import { MockPriceTrackerAdapter } from "../src/adapters/priceTracker.js";
import { ConsoleNotifier } from "../src/adapters/notifier.js";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Smoke test failed: ${message}`);
}

async function run() {
  const db = new InMemoryDatabase();
  const engine = new FlightyEngine(
    db,
    new MockFlightTrackerAdapter({ seed: "smoke", fixedNowIso: "2026-03-03T18:00:00-05:00" }),
    new MockPriceTrackerAdapter({ seed: "smoke", fixedNowIso: "2026-03-03T18:00:00-05:00" }),
    new ConsoleNotifier()
  );

  const trackReply = await engine.handleMessage("smoke-user", "Track AA100 on 2026-04-10 from JFK to LAX");
  assert(trackReply.includes("Tracking enabled."), "track flow should confirm tracking");

  const nextReply = await engine.handleMessage("smoke-user", "What is my next flight?");
  assert(/AA100/i.test(nextReply), "next flight should include tracked flight");

  const createPriceReply = await engine.handleMessage(
    "smoke-user",
    "Alert me when IND->SFO 2026-05-01 to 2026-05-10 below $250"
  );
  assert(/Price watch created/i.test(createPriceReply), "price watch create should succeed");

  const listPriceReply = await engine.handleMessage("smoke-user", "list my price alerts");
  assert(listPriceReply.includes("IND->SFO"), "price watch list should include created watch");

  await engine.pollTrackedFlights();
  await engine.pollPriceWatches();

  console.log("✅ Smoke test passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
