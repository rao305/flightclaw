# Event Debug Queries

Useful Supabase / psql queries for inspecting widget events.

## Recent events for a shop

```sql
SELECT type, session_id, payload, ts
FROM events
WHERE shop_domain = '<your-shop>.myshopify.com'
ORDER BY ts DESC
LIMIT 50;
```

## Count by event type per day

```sql
SELECT
  date_trunc('day', ts) AS day,
  type,
  count(*) AS total
FROM events
WHERE shop_domain = '<your-shop>.myshopify.com'
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC;
```

## Sessions that produced errors

```sql
SELECT DISTINCT session_id, payload->>'code' AS error_code, ts
FROM events
WHERE shop_domain = '<your-shop>.myshopify.com'
  AND type = 'error'
ORDER BY ts DESC;
```

## Full flow trace for a session

```sql
SELECT type, payload, ts
FROM events
WHERE session_id = '<session-uuid>'
ORDER BY ts ASC;
```

Expected sequence for a complete happy-path session:
1. `widget_open`
2. `avatar_created`
3. `tryon_requested`
4. `fit_result_shown`

A `avatar_override` appears instead of (or after) `avatar_created` when the user
hits **Back** and re-submits the form.
