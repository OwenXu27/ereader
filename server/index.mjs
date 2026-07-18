import express from "express";
import dotenv from "dotenv";
import {
  resolveUpstream,
  resolveApiKey,
  normalizeBody,
} from "../api/_shared.js";

// Load env from .env.local first, then .env
dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = Number(process.env.PORT || 5177);
const UPSTREAM = resolveUpstream(process.env);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/chat/completions", async (req, res) => {
  const apiKey = resolveApiKey(process.env, (name) => req.headers[name]);
  if (!apiKey) {
    return res.status(500).json({
      error: {
        message:
          "Missing API key. Set MOONSHOT_API_KEY in .env.local, or paste your Kimi Code API key in Settings.",
        type: "server_config_error",
      },
    });
  }

  try {
    const upstreamRes = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(normalizeBody(req.body ?? {}, UPSTREAM, process.env)),
    });

    const contentType = upstreamRes.headers.get("content-type") || "";
    const isStream = req.body?.stream === true && contentType.includes("text/event-stream");

    if (isStream && upstreamRes.body) {
      res.status(upstreamRes.status);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const reader = upstreamRes.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { res.end(); return; }
          res.write(value);
        }
      };
      req.on("close", () => reader.cancel());
      await pump();
      return;
    }

    const raw = await upstreamRes.text();
    res.status(upstreamRes.status);
    if (contentType.includes("application/json")) {
      try {
        res.type("application/json").send(JSON.parse(raw));
      } catch {
        res.type("text/plain").send(raw);
      }
      return;
    }

    res.type("text/plain").send(raw);
  } catch (err) {
    if (!res.headersSent) {
      res.status(502).json({
        error: {
          message: String(err?.message || err),
          type: "upstream_fetch_error",
        },
      });
    }
  }
});

const server = app.listen(PORT, () => {
  console.log(`[proxy] listening on http://localhost:${PORT}`);
  console.log(`[proxy] forwarding to ${UPSTREAM}`);
});

server.on("error", (err) => {
  console.error("[proxy] server error", err);
});

// Keep event loop alive reliably in dev environments
setInterval(() => {}, 1 << 30);

