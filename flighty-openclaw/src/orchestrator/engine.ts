import { ConsoleNotifier, type Notifier } from "../adapters/notifier.js";
import { MockFlightTrackerAdapter, type FlightTrackerAdapter } from "../adapters/flightTracker.js";
import { MockPriceTrackerAdapter, type PriceTrackerAdapter } from "../adapters/priceTracker.js";
import { diffToEvents } from "./alerts.js";
import { flightCard, priceAlertCard } from "./format.js";
import { parseIntent } from "./intents.js";
import type { Database } from "../db/store.js";

export class FlightyEngine {
  constructor(
    private readonly db: Database,
    private readonly flightTracker: FlightTrackerAdapter = new MockFlightTrackerAdapter(),
    private readonly priceTracker: PriceTrackerAdapter = new MockPriceTrackerAdapter(),
    private readonly notifier: Notifier = new ConsoleNotifier()
  ) {}

  async handleMessage(externalUserKey: string, text: string): Promise<string> {
    const user = await this.db.getOrCreateUser(externalUserKey);
    const intent = parseIntent(text);

    if (intent.type === "track_flight") {
      const tracked = await this.db.addTrackedFlight({
        userId: user.id,
        trackingState: "active",
        ...intent.payload
      });
      const snap = await this.flightTracker.getFlightStatus(intent.payload);
      snap.trackedFlightId = tracked.id;
      await this.db.addSnapshot(snap);
      return `Tracking enabled.\n\n${flightCard(tracked, snap)}`;
    }

    if (intent.type === "next_flight") {
      const flights = await this.db.listTrackedFlights(user.id);
      const next = flights[0];
      if (!next) return "No active tracked flights yet. Say: Track AA100 on 2026-04-10 from JFK to LAX";
      const snap = await this.db.latestSnapshot(next.id);
      if (!snap) return `${next.airlineCode}${next.flightNumber} is tracked, but no status yet.`;
      return flightCard(next, snap);
    }

    if (intent.type === "price_watch_create") {
      const watch = await this.db.addPriceWatch({ userId: user.id, ...intent.payload });
      return `Price watch created: ${watch.origin} -> ${watch.destination} (${watch.startDate} to ${watch.endDate}) target $${watch.targetPriceUsd}`;
    }

    if (intent.type === "price_watch_list") {
      const watches = await this.db.listPriceWatches(user.id);
      if (!watches.length) return "You have no active price watches.";
      return watches
        .map((w) => `• ${w.origin}->${w.destination} $${w.targetPriceUsd} (${w.startDate} to ${w.endDate})`)
        .join("\n");
    }

    return [
      "I can help with:",
      "• Track AA100 on 2026-04-10 from JFK to LAX",
      "• What’s my next flight?",
      "• Alert me when IND->SFO 2026-05-01 to 2026-05-10 below $250"
    ].join("\n");
  }

  async pollTrackedFlights(): Promise<void> {
    const flights = await this.db.listAllActiveTrackedFlights();

    for (const flight of flights) {
      const prev = await this.db.latestSnapshot(flight.id);
      const next = await this.flightTracker.getFlightStatus(flight);
      next.trackedFlightId = flight.id;
      await this.db.addSnapshot(next);

      const events = diffToEvents(prev, next);
      for (const event of events) {
        const added = await this.db.addEvent(event);
        if (!added) continue;
        const user = await this.db.getUserById(flight.userId);
        if (!user) continue;
        await this.notifier.notify(
          user.externalUserKey,
          `🔔 ${flight.airlineCode}${flight.flightNumber}: ${event.eventType.replace("_", " ")}`
        );
      }
    }
  }

  async pollPriceWatches(): Promise<void> {
    const watches = await this.db.listAllActivePriceWatches();

    for (const watch of watches) {
      const quote = await this.priceTracker.searchRoute(watch);
      const isRecent = await this.db.hasRecentHit(watch.id, 12);
      if (quote.amountUsd <= watch.targetPriceUsd && !isRecent) {
        await this.db.addPriceHit(watch.id, quote);
        const user = await this.db.getUserById(watch.userId);
        if (!user) continue;
        await this.notifier.notify(user.externalUserKey, priceAlertCard(watch, quote));
      }
    }
  }
}
