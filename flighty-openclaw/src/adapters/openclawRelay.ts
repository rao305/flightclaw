import { fetchJsonWithRetry } from "../utils/http.js";

export interface RelayPayload {
  userKey: string;
  message: string;
  channel?: string;
  target?: string;
}

export class OpenClawRelayClient {
  constructor(private readonly relayUrl: string, private readonly relayToken?: string) {}

  async send(payload: RelayPayload): Promise<void> {
    await fetchJsonWithRetry<{ ok: boolean }>(
      this.relayUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.relayToken ? { Authorization: `Bearer ${this.relayToken}` } : {})
        },
        body: JSON.stringify(payload)
      },
      1
    );
  }
}
