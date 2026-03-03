import { OpenClawRelayClient } from "./openclawRelay.js";
import { fetchJsonWithRetry } from "../utils/http.js";

export interface Notifier {
  notify(userKey: string, message: string): Promise<void>;
}

export class ConsoleNotifier implements Notifier {
  async notify(userKey: string, message: string) {
    console.log(`[notify:${userKey}] ${message}`);
  }
}

export class WebhookNotifier implements Notifier {
  constructor(
    private readonly webhookUrl: string,
    private readonly fallback: Notifier = new ConsoleNotifier()
  ) {}

  async notify(userKey: string, message: string): Promise<void> {
    try {
      await fetchJsonWithRetry<{ ok: boolean }>(
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
}

export class OpenClawRelayNotifier implements Notifier {
  constructor(
    private readonly relay: OpenClawRelayClient,
    private readonly fallback: Notifier = new ConsoleNotifier()
  ) {}

  async notify(userKey: string, message: string): Promise<void> {
    try {
      await this.relay.send({ userKey, message });
    } catch {
      await this.fallback.notify(userKey, message);
    }
  }
}
