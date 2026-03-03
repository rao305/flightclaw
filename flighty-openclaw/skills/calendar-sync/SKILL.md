---
name: calendar-sync
description: Read user calendar events and extract likely flight itineraries for tracking.
---

# calendar-sync

## Actions

- `list_events(start_iso, end_iso)`
- `extract_flight_candidates(events)`

## Rules

1. Detect airline code + flight number patterns in title/body.
2. Extract route/date when present.
3. Return candidates with confidence score and source event id.
