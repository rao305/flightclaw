import "dotenv/config";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { FlightyEngine } from "./orchestrator/engine.js";
import { startSchedulers } from "./jobs/scheduler.js";
import { InMemoryDatabase } from "./db/store.js";
import { createPostgresDatabase } from "./db/postgres.js";
import { loadRuntimeConfig } from "./config/env.js";
import {
  ConsoleNotifier,
  OpenClawRelayNotifier,
  WebhookNotifier
} from "./adapters/notifier.js";
import {
  AviationStackFlightTrackerAdapter,
  HttpFlightTrackerAdapter,
  MockFlightTrackerAdapter
} from "./adapters/flightTracker.js";
import { FlightclawApiPriceTrackerAdapter, MockPriceTrackerAdapter } from "./adapters/priceTracker.js";
import { OpenClawRelayClient } from "./adapters/openclawRelay.js";
import { startNotifierBridge } from "./bridge/notifier-bridge.js";

async function main() {
  const config = loadRuntimeConfig();

  if (config.startBridge) {
    startNotifierBridge(config.BRIDGE_PORT);
  }

  const db = config.DATABASE_URL ? createPostgresDatabase(config.DATABASE_URL) : new InMemoryDatabase();

  const notifier = config.OPENCLAW_RELAY_URL
    ? new OpenClawRelayNotifier(new OpenClawRelayClient(config.OPENCLAW_RELAY_URL, config.OPENCLAW_RELAY_TOKEN))
    : config.NOTIFY_WEBHOOK_URL
      ? new WebhookNotifier(config.NOTIFY_WEBHOOK_URL)
      : new ConsoleNotifier();

  const mockOptions = {
    seed: config.MOCK_SEED,
    fixedNowIso: config.MOCK_FIXED_NOW
  };

  const liveFallbackFlight = config.liveDataOnly ? undefined : new MockFlightTrackerAdapter(mockOptions);
  const liveFallbackPrice = config.liveDataOnly ? undefined : new MockPriceTrackerAdapter(mockOptions);

  const flightTracker = config.AVIATIONSTACK_API_KEY
    ? new AviationStackFlightTrackerAdapter(config.AVIATIONSTACK_API_KEY, liveFallbackFlight)
    : config.FLIGHT_TRACKER_BASE_URL && config.FLIGHT_TRACKER_API_KEY
      ? new HttpFlightTrackerAdapter(config.FLIGHT_TRACKER_BASE_URL, config.FLIGHT_TRACKER_API_KEY, liveFallbackFlight)
      : new MockFlightTrackerAdapter(mockOptions);

  const priceTracker = config.FLIGHTCLAW_BASE_URL && config.FLIGHTCLAW_API_KEY
    ? new FlightclawApiPriceTrackerAdapter(config.FLIGHTCLAW_BASE_URL, config.FLIGHTCLAW_API_KEY, liveFallbackPrice)
    : new MockPriceTrackerAdapter(mockOptions);

  const engine = new FlightyEngine(db, flightTracker, priceTracker, notifier);
  startSchedulers(engine);

  const rl = readline.createInterface({ input, output });

  console.log("Flighty OpenClaw MVP (local engine) started.");
  console.log(
    `Mode: ${config.DATABASE_URL ? "postgres" : "in-memory"} DB, liveDataOnly=${config.liveDataOnly}, mockSeed=${config.MOCK_SEED}`
  );
  if (config.MOCK_FIXED_NOW) {
    console.log(`Mock fixed time enabled: ${config.MOCK_FIXED_NOW}`);
  }
  console.log("Try: Track AA100 on 2026-04-10 from JFK to LAX");

  while (true) {
    const msg = await rl.question("\n> ");
    if (msg.trim().toLowerCase() === "exit") break;
    const reply = await engine.handleMessage(config.DEMO_USER_KEY, msg);
    console.log(`\n${reply}`);
  }

  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
