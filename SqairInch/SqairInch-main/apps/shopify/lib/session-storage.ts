/**
 * File-backed stub session store.
 * Location: apps/shopify/.data/sessions.json
 *
 * NOT suitable for production (file I/O race conditions).
 * Swap for Supabase adapter when TSQA-002 DB migrations land.
 */
import fs from "node:fs";
import path from "node:path";
import type { Session } from "@shopify/shopify-api";

const DATA_DIR = path.join(process.cwd(), ".data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readAll(): Record<string, object> {
  ensureDir();
  if (!fs.existsSync(SESSIONS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8")) as Record<string, object>;
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, object>): void {
  ensureDir();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export const sessionStorage = {
  storeSession(session: Session): boolean {
    const all = readAll();
    all[session.id] = session.toObject();
    writeAll(all);
    return true;
  },

  loadSession(id: string): Session | undefined {
    const all = readAll();
    const raw = all[id];
    if (!raw) return undefined;
    // Reconstruct via shopify-api Session
    // Lazy import to avoid circular dependency at top level
    const { Session: ShopifySession } = require("@shopify/shopify-api");
    return ShopifySession.fromPropertyArray(Object.entries(raw as Record<string, unknown>));
  },

  deleteSession(id: string): boolean {
    const all = readAll();
    if (!(id in all)) return false;
    delete all[id];
    writeAll(all);
    return true;
  },

  deleteSessions(ids: string[]): boolean {
    const all = readAll();
    for (const id of ids) delete all[id];
    writeAll(all);
    return true;
  },

  findSessionsByShop(shop: string): Session[] {
    const all = readAll();
    const { Session: ShopifySession } = require("@shopify/shopify-api");
    return Object.values(all)
      .filter((s) => (s as Record<string, unknown>).shop === shop)
      .map((raw) =>
        ShopifySession.fromPropertyArray(Object.entries(raw as Record<string, unknown>))
      );
  },
};
