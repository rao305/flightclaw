import { createServer } from "node:http";

interface BridgeRequest {
  userKey: string;
  message: string;
  channel?: string;
  target?: string;
}

export function startNotifierBridge(port = 8788) {
  const server = createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/notify") {
      res.statusCode = 404;
      res.end("not found");
      return;
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const payload = JSON.parse(body) as BridgeRequest;

        // NOTE:
        // This bridge is intentionally simple and safe by default.
        // Wire this section to your OpenClaw delivery endpoint/service.
        console.log("[bridge:notify]", payload);

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.statusCode = 400;
        res.end("invalid json");
      }
    });
  });

  server.listen(port, () => {
    console.log(`[bridge] notifier bridge listening on http://localhost:${port}/notify`);
  });

  return server;
}
