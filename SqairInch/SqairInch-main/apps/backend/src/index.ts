import { Hono } from "hono";

// TODO: TSQA-003 — implement route handlers with Supabase integration
const app = new Hono();

const NOT_IMPLEMENTED = { ok: false, error: { code: "NOT_IMPLEMENTED" } };

// GET /apps/sqairinch/config — returns WidgetConfig (see docs/API_CONTRACTS.md §3)
app.get("/apps/sqairinch/config", (c) => {
  return c.json(NOT_IMPLEMENTED, 501);
});

// GET /apps/sqairinch/sku — returns SkuResponse (see docs/API_CONTRACTS.md §4)
app.get("/apps/sqairinch/sku", (c) => {
  return c.json(NOT_IMPLEMENTED, 501);
});

// POST /apps/sqairinch/event — accepts EventPayload (see docs/API_CONTRACTS.md §5)
app.post("/apps/sqairinch/event", (c) => {
  return c.json(NOT_IMPLEMENTED, 501);
});

const port = Number(process.env.PORT ?? 3001);
console.log(`Backend listening on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
