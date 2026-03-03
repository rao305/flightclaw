---
name: notification-hub
description: Send flight and price alerts to user channels (WhatsApp/Telegram/Discord/Slack/email) with quiet-hours aware delivery.
---

# notification-hub

## Actions

- `send_message(user_id, channel, message, severity)`
- `queue_for_quiet_hours(user_id, message)`

## Rules

1. Respect quiet hours for non-critical alerts.
2. Bypass quiet hours for cancellations/diversions.
3. Deduplicate identical alerts within a suppression window.
