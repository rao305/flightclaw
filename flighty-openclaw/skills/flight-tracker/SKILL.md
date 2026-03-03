---
name: flight-tracker
description: Track commercial flights by airline+flight number and date. Use for status checks, live position, gate/time changes, and flight timeline updates.
---

# flight-tracker

## Actions

- `get_flight_status(flight_code, date, departure_airport?, arrival_airport?)`
  - Return status, scheduled/estimated/actual times, gates, aircraft, and metadata.
- `get_live_position(flight_code, date)`
  - Return lat/lon, altitude, speed, and timestamp when available.

## Output contract

Return strict JSON with:
- `status`: scheduled|active|delayed|landed|cancelled
- `times`: sched/est/act departure and arrival
- `gates`: dep/arr gates and terminals
- `aircraft`: type + tail (if present)
- `live`: lat/lon/altitude/speed when in-air

## Reliability rules

1. Normalize all times to ISO-8601 UTC.
2. Include provider timestamp and source confidence.
3. If data missing, return null fields (do not fabricate).
4. Never fail silently; return structured error with retriable flag.
