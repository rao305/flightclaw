// src/index.ts
import "dotenv/config";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

// src/utils/http.ts
async function fetchJsonWithRetry(url, init, retries = 2, baseDelayMs = 400) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (i === retries) break;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Unknown request failure");
}

// src/adapters/notifier.ts
var ConsoleNotifier = class {
  async notify(userKey, message) {
    console.log(`[notify:${userKey}] ${message}`);
  }
};
var WebhookNotifier = class {
  constructor(webhookUrl, fallback = new ConsoleNotifier()) {
    this.webhookUrl = webhookUrl;
    this.fallback = fallback;
  }
  async notify(userKey, message) {
    try {
      await fetchJsonWithRetry(
        this.webhookUrl,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userKey, message })
        },
        1
      );
    } catch {
      await this.fallback.notify(userKey, message);
    }
  }
};
var OpenClawRelayNotifier = class {
  constructor(relay, fallback = new ConsoleNotifier()) {
    this.relay = relay;
    this.fallback = fallback;
  }
  async notify(userKey, message) {
    try {
      await this.relay.send({ userKey, message });
    } catch {
      await this.fallback.notify(userKey, message);
    }
  }
};

// src/types/providers.ts
import { z } from "zod";
var aviationStackResponseSchema = z.object({
  data: z.array(
    z.object({
      flight_status: z.string().optional(),
      departure: z.object({
        scheduled: z.string().nullable().optional(),
        estimated: z.string().nullable().optional(),
        actual: z.string().nullable().optional(),
        gate: z.string().nullable().optional()
      }).optional(),
      arrival: z.object({
        scheduled: z.string().nullable().optional(),
        estimated: z.string().nullable().optional(),
        actual: z.string().nullable().optional(),
        gate: z.string().nullable().optional()
      }).optional(),
      aircraft: z.object({
        iata: z.string().nullable().optional(),
        registration: z.string().nullable().optional()
      }).optional(),
      live: z.object({
        latitude: z.number().nullable().optional(),
        longitude: z.number().nullable().optional(),
        altitude: z.number().nullable().optional(),
        speed_horizontal: z.number().nullable().optional()
      }).optional()
    })
  )
});
var flightclawResponseSchema = z.object({
  bestPriceUsd: z.number(),
  bookingLink: z.string().url().optional(),
  quotes: z.array(
    z.object({
      priceUsd: z.number(),
      airline: z.string().optional(),
      deeplink: z.string().url().optional()
    })
  ).optional()
});

// src/utils/mock.ts
function mockNow(fixedNowIso) {
  return fixedNowIso ? new Date(fixedNowIso) : /* @__PURE__ */ new Date();
}
function seededRandom(seed) {
  let state = hash32(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) % 1e6 / 1e6;
  };
}
function hash32(input2) {
  let hash = 2166136261;
  for (let i = 0; i < input2.length; i++) {
    hash ^= input2.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// src/adapters/flightTracker.ts
var statuses = ["scheduled", "active", "delayed", "landed"];
var MockFlightTrackerAdapter = class {
  constructor(opts = {}) {
    this.opts = opts;
  }
  async getFlightStatus(ref) {
    const rng = seededRandom(`${this.opts.seed ?? "default"}:${ref.airlineCode}:${ref.flightNumber}:${ref.flightDate}`);
    const now = mockNow(this.opts.fixedNowIso);
    const status = statuses[Math.floor(rng() * statuses.length)];
    const delayMinutes2 = status === "delayed" ? 20 + Math.floor(rng() * 50) : 0;
    return {
      trackedFlightId: "",
      status,
      schedDep: new Date(now.getTime() + 2 * 36e5).toISOString(),
      estDep: new Date(now.getTime() + (2 * 36e5 + delayMinutes2 * 6e4)).toISOString(),
      schedArr: new Date(now.getTime() + 6 * 36e5).toISOString(),
      estArr: new Date(now.getTime() + (6 * 36e5 + delayMinutes2 * 6e4)).toISOString(),
      depGate: "A12",
      arrGate: "C7",
      aircraftType: "B738",
      tailNumber: "N12345",
      lat: status === "active" ? 39.1 : void 0,
      lon: status === "active" ? -96.8 : void 0,
      altitudeFt: status === "active" ? 31e3 : void 0,
      speedKts: status === "active" ? 440 : void 0,
      rawJson: { mock: true, ref },
      createdAt: now.toISOString()
    };
  }
};
var AviationStackFlightTrackerAdapter = class {
  constructor(apiKey, fallback) {
    this.apiKey = apiKey;
    this.fallback = fallback;
  }
  async getFlightStatus(ref) {
    try {
      const query = new URLSearchParams({
        access_key: this.apiKey,
        flight_iata: `${ref.airlineCode}${ref.flightNumber}`
      });
      const url = `http://api.aviationstack.com/v1/flights?${query.toString()}`;
      const raw = await fetchJsonWithRetry(url);
      const parsed = aviationStackResponseSchema.safeParse(raw);
      if (!parsed.success) throw new Error("Invalid aviationstack payload");
      return mapAviationStackToSnapshot(parsed.data);
    } catch {
      return this.fallback.getFlightStatus(ref);
    }
  }
};
var HttpFlightTrackerAdapter = class {
  constructor(baseUrl, apiKey, fallback = new MockFlightTrackerAdapter()) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.fallback = fallback;
  }
  async getFlightStatus(ref) {
    try {
      const query = new URLSearchParams({
        airline: ref.airlineCode,
        flight_number: ref.flightNumber,
        date: ref.flightDate
      });
      if (ref.departureAirport) query.set("departure", ref.departureAirport);
      if (ref.arrivalAirport) query.set("arrival", ref.arrivalAirport);
      const url = `${this.baseUrl.replace(/\/$/, "")}/flight/status?${query.toString()}`;
      const response = await fetchJsonWithRetry(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        }
      });
      return {
        trackedFlightId: "",
        status: normalizeStatus(response?.status),
        schedDep: response?.times?.scheduledDeparture,
        estDep: response?.times?.estimatedDeparture,
        actDep: response?.times?.actualDeparture,
        schedArr: response?.times?.scheduledArrival,
        estArr: response?.times?.estimatedArrival,
        actArr: response?.times?.actualArrival,
        depGate: response?.gates?.departure,
        arrGate: response?.gates?.arrival,
        aircraftType: response?.aircraft?.type,
        tailNumber: response?.aircraft?.tail,
        lat: response?.live?.lat,
        lon: response?.live?.lon,
        altitudeFt: response?.live?.altitudeFt,
        speedKts: response?.live?.speedKts,
        rawJson: response,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch {
      return this.fallback.getFlightStatus(ref);
    }
  }
};
function mapAviationStackToSnapshot(res) {
  const first = res.data[0];
  const dep = first?.departure;
  const arr = first?.arrival;
  const live = first?.live;
  return {
    trackedFlightId: "",
    status: normalizeStatus(first?.flight_status),
    schedDep: dep?.scheduled ?? void 0,
    estDep: dep?.estimated ?? void 0,
    actDep: dep?.actual ?? void 0,
    schedArr: arr?.scheduled ?? void 0,
    estArr: arr?.estimated ?? void 0,
    actArr: arr?.actual ?? void 0,
    depGate: dep?.gate ?? void 0,
    arrGate: arr?.gate ?? void 0,
    aircraftType: first?.aircraft?.iata ?? void 0,
    tailNumber: first?.aircraft?.registration ?? void 0,
    lat: live?.latitude ?? void 0,
    lon: live?.longitude ?? void 0,
    altitudeFt: live?.altitude ?? void 0,
    speedKts: live?.speed_horizontal ?? void 0,
    rawJson: res,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function normalizeStatus(status) {
  const value = (status ?? "scheduled").toLowerCase();
  if (["scheduled", "active", "delayed", "landed", "cancelled"].includes(value)) {
    return value;
  }
  if (["en-route", "in_air", "in-air"].includes(value)) return "active";
  if (["incident", "diverted"].includes(value)) return "delayed";
  return "scheduled";
}

// src/adapters/priceTracker.ts
var MockPriceTrackerAdapter = class {
  constructor(opts = {}) {
    this.opts = opts;
  }
  async searchRoute(input2) {
    const rng = seededRandom(
      `${this.opts.seed ?? "default"}:${input2.origin}:${input2.destination}:${input2.startDate}:${input2.endDate}`
    );
    const amountUsd = Math.round((180 + rng() * 220) * 100) / 100;
    return {
      amountUsd,
      deeplink: "https://flightclaw.com",
      observedAt: mockNow(this.opts.fixedNowIso).toISOString()
    };
  }
};
var FlightclawApiPriceTrackerAdapter = class {
  constructor(baseUrl, apiKey, fallback = new MockPriceTrackerAdapter()) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.fallback = fallback;
  }
  async searchRoute(input2) {
    try {
      const query = new URLSearchParams({
        origin: input2.origin,
        destination: input2.destination,
        start_date: input2.startDate,
        end_date: input2.endDate
      });
      const url = `${this.baseUrl.replace(/\/$/, "")}/prices/search?${query.toString()}`;
      const raw = await fetchJsonWithRetry(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        }
      });
      const parsed = flightclawResponseSchema.safeParse(raw);
      if (!parsed.success) throw new Error("Invalid flightclaw payload");
      return mapFlightclawQuote(parsed.data);
    } catch {
      return this.fallback.searchRoute(input2);
    }
  }
};
function mapFlightclawQuote(resp) {
  return {
    amountUsd: resp.bestPriceUsd,
    deeplink: resp.bookingLink,
    observedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// src/utils/id.ts
import crypto from "crypto";
var uid = () => crypto.randomUUID();
var sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

// src/orchestrator/alerts.ts
function diffToEvents(prev, next) {
  const events = [];
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
function delayMinutes(s) {
  if (!s.schedDep || !s.estDep) return 0;
  return Math.max(0, Math.round((new Date(s.estDep).getTime() - new Date(s.schedDep).getTime()) / 6e4));
}
function evt(eventType, eventPayload, trackedFlightId) {
  const fingerprint = sha256(`${eventType}:${JSON.stringify(eventPayload)}`);
  return {
    trackedFlightId,
    eventType,
    eventPayload,
    fingerprint,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// src/orchestrator/format.ts
function flightCard(f, s) {
  const route = `${f.departureAirport ?? "???"} -> ${f.arrivalAirport ?? "???"}`;
  const delay = s.schedDep && s.estDep ? Math.max(0, Math.round((new Date(s.estDep).getTime() - new Date(s.schedDep).getTime()) / 6e4)) : 0;
  return [
    `\u2708\uFE0F ${f.airlineCode}${f.flightNumber} \u2022 ${route}`,
    `Status: ${s.status.toUpperCase()}${delay ? ` (+${delay}m)` : ""}`,
    `Dep: ${fmt(s.schedDep)} -> ${fmt(s.estDep)}${s.depGate ? ` (Gate ${s.depGate})` : ""}`,
    `Arr: ${fmt(s.schedArr)} -> ${fmt(s.estArr)}${s.arrGate ? ` (Gate ${s.arrGate})` : ""}`,
    `Aircraft: ${s.aircraftType ?? "Unknown"}${s.tailNumber ? ` (${s.tailNumber})` : ""}`
  ].join("\n");
}
var priceAlertCard = (watch, q) => [
  `\u{1F4B8} Price Drop: ${watch.origin} -> ${watch.destination}`,
  `Now: $${q.amountUsd.toFixed(2)} (target: $${watch.targetPriceUsd.toFixed(2)})`,
  q.deeplink ? `Book: ${q.deeplink}` : ""
].filter(Boolean).join("\n");
var fmt = (iso) => iso ? new Date(iso).toLocaleString() : "-";

// src/orchestrator/intents.ts
import { z as z2 } from "zod";
var trackFlightRegex = /track\s+([A-Za-z]{2})\s*(\d+)\s+on\s+(\d{4}-\d{2}-\d{2})\s+from\s+([A-Za-z]{3})\s+to\s+([A-Za-z]{3})/i;
var priceRegex = /alert me when\s+([A-Za-z]{3})\s*-?>\s*([A-Za-z]{3}).*?(\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2}).*?below\s*\$?(\d+)/i;
var flightSchema = z2.object({
  airlineCode: z2.string().min(2).max(3),
  flightNumber: z2.string().min(1),
  flightDate: z2.string(),
  departureAirport: z2.string().length(3).optional(),
  arrivalAirport: z2.string().length(3).optional()
});
function parseIntent(input2) {
  const normalized = input2.trim();
  const tf = normalized.match(trackFlightRegex);
  if (tf) {
    const payload = {
      airlineCode: tf[1].toUpperCase(),
      flightNumber: tf[2],
      flightDate: tf[3],
      departureAirport: tf[4].toUpperCase(),
      arrivalAirport: tf[5].toUpperCase()
    };
    const parsed = flightSchema.safeParse(payload);
    if (parsed.success) return { type: "track_flight", payload: parsed.data };
  }
  const pw = normalized.match(priceRegex);
  if (pw) {
    return {
      type: "price_watch_create",
      payload: {
        origin: pw[1].toUpperCase(),
        destination: pw[2].toUpperCase(),
        startDate: pw[3],
        endDate: pw[4],
        targetPriceUsd: Number(pw[5])
      }
    };
  }
  if (/next flight/i.test(normalized)) return { type: "next_flight" };
  if (/list my price alerts|list price/i.test(normalized)) return { type: "price_watch_list" };
  return { type: "unknown", raw: input2 };
}

// src/orchestrator/engine.ts
var FlightyEngine = class {
  constructor(db, flightTracker = new MockFlightTrackerAdapter(), priceTracker = new MockPriceTrackerAdapter(), notifier = new ConsoleNotifier()) {
    this.db = db;
    this.flightTracker = flightTracker;
    this.priceTracker = priceTracker;
    this.notifier = notifier;
  }
  async handleMessage(externalUserKey, text) {
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
      return `Tracking enabled.

${flightCard(tracked, snap)}`;
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
      return watches.map((w) => `\u2022 ${w.origin}->${w.destination} $${w.targetPriceUsd} (${w.startDate} to ${w.endDate})`).join("\n");
    }
    return [
      "I can help with:",
      "\u2022 Track AA100 on 2026-04-10 from JFK to LAX",
      "\u2022 What\u2019s my next flight?",
      "\u2022 Alert me when IND->SFO 2026-05-01 to 2026-05-10 below $250"
    ].join("\n");
  }
  async pollTrackedFlights() {
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
          `\u{1F514} ${flight.airlineCode}${flight.flightNumber}: ${event.eventType.replace("_", " ")}`
        );
      }
    }
  }
  async pollPriceWatches() {
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
};

// src/jobs/scheduler.ts
function startSchedulers(engine) {
  safeRun("tracked-flight poll", () => engine.pollTrackedFlights());
  safeRun("price-watch poll", () => engine.pollPriceWatches());
  setInterval(() => {
    safeRun("tracked-flight poll", () => engine.pollTrackedFlights());
  }, 2 * 6e4);
  setInterval(() => {
    safeRun("price-watch poll", () => engine.pollPriceWatches());
  }, 5 * 6e4);
}
async function safeRun(label, fn) {
  try {
    await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[scheduler] ${label} failed: ${message}`);
  }
}

// src/db/store.ts
var InMemoryDatabase = class {
  users = /* @__PURE__ */ new Map();
  usersByExternalKey = /* @__PURE__ */ new Map();
  trackedFlights = /* @__PURE__ */ new Map();
  snapshots = /* @__PURE__ */ new Map();
  events = /* @__PURE__ */ new Map();
  eventFingerprints = /* @__PURE__ */ new Set();
  priceWatches = /* @__PURE__ */ new Map();
  priceHits = /* @__PURE__ */ new Map();
  async getOrCreateUser(externalUserKey) {
    const existingId = this.usersByExternalKey.get(externalUserKey);
    if (existingId) return this.users.get(existingId);
    const user = {
      id: uid(),
      externalUserKey,
      timeZone: "America/New_York"
    };
    this.users.set(user.id, user);
    this.usersByExternalKey.set(externalUserKey, user.id);
    return user;
  }
  async getUserById(userId) {
    return this.users.get(userId);
  }
  async addTrackedFlight(flight) {
    const tf = { ...flight, id: uid(), createdAt: (/* @__PURE__ */ new Date()).toISOString() };
    this.trackedFlights.set(tf.id, tf);
    return tf;
  }
  async listTrackedFlights(userId) {
    return [...this.trackedFlights.values()].filter(
      (f) => f.userId === userId && f.trackingState === "active"
    );
  }
  async listAllActiveTrackedFlights() {
    return [...this.trackedFlights.values()].filter((f) => f.trackingState === "active");
  }
  async latestSnapshot(trackedFlightId) {
    const arr = this.snapshots.get(trackedFlightId) ?? [];
    return arr.at(-1);
  }
  async addSnapshot(snapshot) {
    const arr = this.snapshots.get(snapshot.trackedFlightId) ?? [];
    arr.push(snapshot);
    this.snapshots.set(snapshot.trackedFlightId, arr);
  }
  async addEvent(event) {
    const key = `${event.trackedFlightId}:${event.fingerprint}`;
    if (this.eventFingerprints.has(key)) return false;
    this.eventFingerprints.add(key);
    const arr = this.events.get(event.trackedFlightId) ?? [];
    arr.push(event);
    this.events.set(event.trackedFlightId, arr);
    return true;
  }
  async addPriceWatch(watch) {
    const pw = { ...watch, id: uid(), active: true };
    this.priceWatches.set(pw.id, pw);
    return pw;
  }
  async listPriceWatches(userId) {
    return [...this.priceWatches.values()].filter((w) => w.userId === userId && w.active);
  }
  async listAllActivePriceWatches() {
    return [...this.priceWatches.values()].filter((w) => w.active);
  }
  async addPriceHit(watchId, quote) {
    const arr = this.priceHits.get(watchId) ?? [];
    arr.push(quote);
    this.priceHits.set(watchId, arr);
  }
  async hasRecentHit(watchId, withinHours = 12) {
    const arr = this.priceHits.get(watchId) ?? [];
    const latest = arr.at(-1);
    if (!latest) return false;
    return Date.now() - new Date(latest.observedAt).getTime() < withinHours * 36e5;
  }
};

// src/db/postgres.ts
import { Pool } from "pg";
var PostgresDatabase = class {
  constructor(pool) {
    this.pool = pool;
  }
  async getOrCreateUser(externalUserKey) {
    const existing = await this.pool.query(
      `select id, external_user_key, display_name, time_zone, home_airport,
              quiet_hours_start, quiet_hours_end
       from users where external_user_key = $1`,
      [externalUserKey]
    );
    if (existing.rowCount) return this.rowToUser(existing.rows[0]);
    const id = uid();
    await this.pool.query(
      `insert into users (id, external_user_key, time_zone)
       values ($1, $2, 'America/New_York')`,
      [id, externalUserKey]
    );
    return { id, externalUserKey, timeZone: "America/New_York" };
  }
  async getUserById(userId) {
    const res = await this.pool.query(
      `select id, external_user_key, display_name, time_zone, home_airport,
              quiet_hours_start, quiet_hours_end
       from users where id = $1`,
      [userId]
    );
    return res.rowCount ? this.rowToUser(res.rows[0]) : void 0;
  }
  async addTrackedFlight(flight) {
    const id = uid();
    const createdAt = (/* @__PURE__ */ new Date()).toISOString();
    await this.pool.query(
      `insert into tracked_flights
        (id, user_id, airline_code, flight_number, flight_date, departure_airport, arrival_airport, tracking_state, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (user_id, airline_code, flight_number, flight_date)
       do update set tracking_state='active'
      `,
      [
        id,
        flight.userId,
        flight.airlineCode,
        flight.flightNumber,
        flight.flightDate,
        flight.departureAirport ?? null,
        flight.arrivalAirport ?? null,
        flight.trackingState,
        createdAt
      ]
    );
    return { ...flight, id, createdAt };
  }
  async listTrackedFlights(userId) {
    const res = await this.pool.query(
      `select id, user_id, airline_code, flight_number, flight_date, departure_airport, arrival_airport, tracking_state, created_at
       from tracked_flights
       where user_id = $1 and tracking_state = 'active'
       order by flight_date asc`,
      [userId]
    );
    return res.rows.map(this.rowToTrackedFlight);
  }
  async listAllActiveTrackedFlights() {
    const res = await this.pool.query(
      `select id, user_id, airline_code, flight_number, flight_date, departure_airport, arrival_airport, tracking_state, created_at
       from tracked_flights
       where tracking_state = 'active'`
    );
    return res.rows.map(this.rowToTrackedFlight);
  }
  async latestSnapshot(trackedFlightId) {
    const res = await this.pool.query(
      `select * from flight_snapshots where tracked_flight_id=$1 order by created_at desc limit 1`,
      [trackedFlightId]
    );
    return res.rowCount ? this.rowToSnapshot(res.rows[0]) : void 0;
  }
  async addSnapshot(snapshot) {
    await this.pool.query(
      `insert into flight_snapshots
      (tracked_flight_id, provider, status, sched_dep, est_dep, act_dep, sched_arr, est_arr, act_arr,
       dep_gate, arr_gate, aircraft_type, tail_number, lat, lon, altitude_ft, speed_kts, raw_json, created_at)
      values
      ($1,'flight-tracker',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        snapshot.trackedFlightId,
        snapshot.status,
        snapshot.schedDep ?? null,
        snapshot.estDep ?? null,
        snapshot.actDep ?? null,
        snapshot.schedArr ?? null,
        snapshot.estArr ?? null,
        snapshot.actArr ?? null,
        snapshot.depGate ?? null,
        snapshot.arrGate ?? null,
        snapshot.aircraftType ?? null,
        snapshot.tailNumber ?? null,
        snapshot.lat ?? null,
        snapshot.lon ?? null,
        snapshot.altitudeFt ?? null,
        snapshot.speedKts ?? null,
        snapshot.rawJson ? JSON.stringify(snapshot.rawJson) : null,
        snapshot.createdAt
      ]
    );
  }
  async addEvent(event) {
    const res = await this.pool.query(
      `insert into flight_events (tracked_flight_id, event_type, event_payload, fingerprint)
       values ($1,$2,$3,$4)
       on conflict (tracked_flight_id, fingerprint) do nothing`,
      [event.trackedFlightId, event.eventType, JSON.stringify(event.eventPayload), event.fingerprint]
    );
    return (res.rowCount ?? 0) > 0;
  }
  async addPriceWatch(watch) {
    const id = uid();
    await this.pool.query(
      `insert into price_watches (id, user_id, origin, destination, start_date, end_date, target_price_usd, active)
       values ($1,$2,$3,$4,$5,$6,$7,true)`,
      [id, watch.userId, watch.origin, watch.destination, watch.startDate, watch.endDate, watch.targetPriceUsd]
    );
    return { ...watch, id, active: true };
  }
  async listPriceWatches(userId) {
    const res = await this.pool.query(
      `select id, user_id, origin, destination, start_date, end_date, target_price_usd, active
       from price_watches where user_id=$1 and active=true`,
      [userId]
    );
    return res.rows.map(this.rowToPriceWatch);
  }
  async listAllActivePriceWatches() {
    const res = await this.pool.query(
      `select id, user_id, origin, destination, start_date, end_date, target_price_usd, active
       from price_watches where active=true`
    );
    return res.rows.map(this.rowToPriceWatch);
  }
  async addPriceHit(watchId, quote) {
    await this.pool.query(
      `insert into price_watch_hits (watch_id, seen_price_usd, deep_link, raw_json)
       values ($1,$2,$3,$4)`,
      [watchId, quote.amountUsd, quote.deeplink ?? null, JSON.stringify(quote)]
    );
  }
  async hasRecentHit(watchId, withinHours = 12) {
    const res = await this.pool.query(
      `select 1 from price_watch_hits
       where watch_id=$1 and created_at > now() - ($2 || ' hours')::interval
       limit 1`,
      [watchId, String(withinHours)]
    );
    return (res.rowCount ?? 0) > 0;
  }
  rowToUser = (row) => ({
    id: row.id,
    externalUserKey: row.external_user_key,
    displayName: row.display_name ?? void 0,
    timeZone: row.time_zone,
    homeAirport: row.home_airport ?? void 0,
    quietHoursStart: row.quiet_hours_start ?? void 0,
    quietHoursEnd: row.quiet_hours_end ?? void 0
  });
  rowToTrackedFlight = (row) => ({
    id: row.id,
    userId: row.user_id,
    airlineCode: row.airline_code,
    flightNumber: row.flight_number,
    flightDate: row.flight_date,
    departureAirport: row.departure_airport ?? void 0,
    arrivalAirport: row.arrival_airport ?? void 0,
    trackingState: row.tracking_state,
    createdAt: new Date(row.created_at).toISOString()
  });
  rowToSnapshot = (row) => ({
    trackedFlightId: row.tracked_flight_id,
    status: row.status,
    schedDep: row.sched_dep?.toISOString?.() ?? row.sched_dep ?? void 0,
    estDep: row.est_dep?.toISOString?.() ?? row.est_dep ?? void 0,
    actDep: row.act_dep?.toISOString?.() ?? row.act_dep ?? void 0,
    schedArr: row.sched_arr?.toISOString?.() ?? row.sched_arr ?? void 0,
    estArr: row.est_arr?.toISOString?.() ?? row.est_arr ?? void 0,
    actArr: row.act_arr?.toISOString?.() ?? row.act_arr ?? void 0,
    depGate: row.dep_gate ?? void 0,
    arrGate: row.arr_gate ?? void 0,
    aircraftType: row.aircraft_type ?? void 0,
    tailNumber: row.tail_number ?? void 0,
    lat: row.lat ?? void 0,
    lon: row.lon ?? void 0,
    altitudeFt: row.altitude_ft ?? void 0,
    speedKts: row.speed_kts ?? void 0,
    rawJson: row.raw_json ?? void 0,
    createdAt: new Date(row.created_at).toISOString()
  });
  rowToPriceWatch = (row) => ({
    id: row.id,
    userId: row.user_id,
    origin: row.origin,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    targetPriceUsd: Number(row.target_price_usd),
    active: row.active
  });
};
function createPostgresDatabase(databaseUrl) {
  const pool = new Pool({ connectionString: databaseUrl });
  return new PostgresDatabase(pool);
}

// src/config/env.ts
import { z as z3 } from "zod";
var envSchema = z3.object({
  DEMO_USER_KEY: z3.string().min(1).default("whatsapp:+16692602830"),
  AVIATIONSTACK_API_KEY: z3.string().optional(),
  FLIGHT_TRACKER_BASE_URL: z3.string().url().optional(),
  FLIGHT_TRACKER_API_KEY: z3.string().optional(),
  FLIGHTCLAW_BASE_URL: z3.string().url().optional(),
  FLIGHTCLAW_API_KEY: z3.string().optional(),
  DATABASE_URL: z3.string().optional(),
  NOTIFY_WEBHOOK_URL: z3.string().url().optional(),
  OPENCLAW_RELAY_URL: z3.string().url().optional(),
  OPENCLAW_RELAY_TOKEN: z3.string().optional(),
  START_BRIDGE: z3.enum(["true", "false"]).default("false"),
  BRIDGE_PORT: z3.coerce.number().int().min(1).max(65535).default(8788),
  MOCK_SEED: z3.string().default("flighty-openclaw"),
  MOCK_FIXED_NOW: z3.string().datetime({ offset: true }).optional()
}).superRefine((env, ctx) => {
  if (env.FLIGHT_TRACKER_BASE_URL && !env.FLIGHT_TRACKER_API_KEY) {
    ctx.addIssue({
      code: z3.ZodIssueCode.custom,
      path: ["FLIGHT_TRACKER_API_KEY"],
      message: "FLIGHT_TRACKER_API_KEY is required when FLIGHT_TRACKER_BASE_URL is set"
    });
  }
  if (env.FLIGHTCLAW_BASE_URL && !env.FLIGHTCLAW_API_KEY) {
    ctx.addIssue({
      code: z3.ZodIssueCode.custom,
      path: ["FLIGHTCLAW_API_KEY"],
      message: "FLIGHTCLAW_API_KEY is required when FLIGHTCLAW_BASE_URL is set"
    });
  }
});
function loadRuntimeConfig(source = process.env) {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid runtime configuration: ${details}`);
  }
  return {
    ...parsed.data,
    startBridge: parsed.data.START_BRIDGE === "true"
  };
}

// src/adapters/openclawRelay.ts
var OpenClawRelayClient = class {
  constructor(relayUrl, relayToken) {
    this.relayUrl = relayUrl;
    this.relayToken = relayToken;
  }
  async send(payload) {
    await fetchJsonWithRetry(
      this.relayUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.relayToken ? { Authorization: `Bearer ${this.relayToken}` } : {}
        },
        body: JSON.stringify(payload)
      },
      1
    );
  }
};

// src/bridge/notifier-bridge.ts
import { createServer } from "http";
function startNotifierBridge(port = 8788) {
  const server = createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/notify") {
      res.statusCode = 404;
      res.end("not found");
      return;
    }
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        console.log("[bridge:notify]", payload);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.statusCode = 400;
        res.end("invalid json");
      }
    });
  });
  server.listen(port, () => {
    console.log(`[bridge] notifier bridge listening on http://localhost:${port}/notify`);
  });
  return server;
}

// src/index.ts
async function main() {
  const config = loadRuntimeConfig();
  if (config.startBridge) {
    startNotifierBridge(config.BRIDGE_PORT);
  }
  const db = config.DATABASE_URL ? createPostgresDatabase(config.DATABASE_URL) : new InMemoryDatabase();
  const notifier = config.OPENCLAW_RELAY_URL ? new OpenClawRelayNotifier(new OpenClawRelayClient(config.OPENCLAW_RELAY_URL, config.OPENCLAW_RELAY_TOKEN)) : config.NOTIFY_WEBHOOK_URL ? new WebhookNotifier(config.NOTIFY_WEBHOOK_URL) : new ConsoleNotifier();
  const mockOptions = {
    seed: config.MOCK_SEED,
    fixedNowIso: config.MOCK_FIXED_NOW
  };
  const flightTracker = config.AVIATIONSTACK_API_KEY ? new AviationStackFlightTrackerAdapter(config.AVIATIONSTACK_API_KEY, new MockFlightTrackerAdapter(mockOptions)) : config.FLIGHT_TRACKER_BASE_URL && config.FLIGHT_TRACKER_API_KEY ? new HttpFlightTrackerAdapter(config.FLIGHT_TRACKER_BASE_URL, config.FLIGHT_TRACKER_API_KEY) : new MockFlightTrackerAdapter(mockOptions);
  const priceTracker = config.FLIGHTCLAW_BASE_URL && config.FLIGHTCLAW_API_KEY ? new FlightclawApiPriceTrackerAdapter(config.FLIGHTCLAW_BASE_URL, config.FLIGHTCLAW_API_KEY) : new MockPriceTrackerAdapter(mockOptions);
  const engine = new FlightyEngine(db, flightTracker, priceTracker, notifier);
  startSchedulers(engine);
  const rl = readline.createInterface({ input, output });
  console.log("Flighty OpenClaw MVP (local engine) started.");
  console.log(`Mode: ${config.DATABASE_URL ? "postgres" : "in-memory"} DB, mockSeed=${config.MOCK_SEED}`);
  if (config.MOCK_FIXED_NOW) {
    console.log(`Mock fixed time enabled: ${config.MOCK_FIXED_NOW}`);
  }
  console.log("Try: Track AA100 on 2026-04-10 from JFK to LAX");
  while (true) {
    const msg = await rl.question("\n> ");
    if (msg.trim().toLowerCase() === "exit") break;
    const reply = await engine.handleMessage(config.DEMO_USER_KEY, msg);
    console.log(`
${reply}`);
  }
  rl.close();
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
