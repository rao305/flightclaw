---
name: email-parser
description: Parse flight confirmation emails from connected inboxes and extract structured itinerary data.
---

# email-parser

## Actions

- `list_candidate_emails(start_iso, end_iso)`
- `parse_itinerary(email_id)`

## Rules

1. Match common airline/OTA confirmation templates.
2. Return airline, flight number, date, route, confirmation id.
3. Redact PII in logs.
