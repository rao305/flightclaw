import "dotenv/config";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { FlightyEngine } from "./orchestrator/engine.js";
import { startSchedulers } from "./jobs/scheduler.js";
import { InMemoryDatabase } from "./db/store.js";
import { createPostgresDatabase } from "./db/postgres.js";
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
  if (process.env.START_BRIDGE === "true") {
    startNotifierBridge(Number(process.env.BRIDGE_PORT ?? 8788));
  }

  const db = process.env.DATABASE_URL
    ? createPostgresDatabase(process.env.DATABASE_URL)
    : new InMemoryDatabase();

  const notifier = process.env.OPENCLAW_RELAY_URL
    ? new OpenClawRelayNotifier(
        new OpenClawRelayClient(process.env.OPENCLAW_RELAY_URL, process.env.OPENCLAW_RELAY_TOKEN)
      )
    : process.env.NOTIFY_WEBHOOK_URL
      ? new WebhookNotifier(process.env.NOTIFY_WEBHOOK_URL)
      : new ConsoleNotifier();

  const flightTracker = process.env.AVIATIONSTACK_API_KEY
    ? new AviationStackFlightTrackerAdapter(process.env.AVIATIONSTACK_API_KEY, new MockFlightTrackerAdapter())
    : process.env.FLIGHT_TRACKER_BASE_URL && process.env.FLIGHT_TRACKER_API_KEY
      ? new HttpFlightTrackerAdapter(
          process.env.FLIGHT_TRACKER_BASE_URL,
          process.env.FLIGHT_TRACKER_API_KEY
        )
      : new MockFlightTrackerAdapter();

  const priceTracker = process.env.FLIGHTCLAW_BASE_URL && process.env.FLIGHTCLAW_API_KEY
    ? new FlightclawApiPriceTrackerAdapter(process.env.FLIGHTCLAW_BASE_URL, process.env.FLIGHTCLAW_API_KEY)
    : new MockPriceTrackerAdapter();

  const engine = new FlightyEngine(db, flightTracker, priceTracker, notifier);
  startSchedulers(engine);

  const rl = readline.createInterface({ input, output });
  const user = process.env.DEMO_USER_KEY ?? "whatsapp:+16692602830";

  console.log("Flighty OpenClaw MVP (local engine) started.");
  console.log("Try: Track AA100 on 2026-04-10 from JFK to LAX");

  while (true) {
    const msg = await rl.question("\n> ");
    if (msg.trim().toLowerCase() === "exit") break;
    const reply = await engine.handleMessage(user, msg);
    console.log(`\n${reply}`);
  }

  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
