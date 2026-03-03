---
name: flightclaw
description: Search airfare and monitor price drops for routes/date ranges. Use for creating, listing, and evaluating price watches.
---

# flightclaw

## Actions

- `search_route(origin, destination, start_date, end_date, filters?)`
- `create_price_watch(origin, destination, start_date, end_date, target_price, channels?)`
- `list_price_watches(user_id)`
- `delete_price_watch(watch_id)`

## Output contract

- `best_price_usd`
- `observed_at`
- `booking_link` (optional)
- `supporting_quotes` (optional)

## Alerting rule

Trigger alert when `best_price_usd <= target_price` and no recent alert for same watch in 12h.
