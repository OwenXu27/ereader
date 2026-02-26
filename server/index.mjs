import express from "express";
import dotenv from "dotenv";

// Load env from .env.local first, then .env
dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = Number(process.env.PORT || 5177);
const UPSTREAM =
  process.env.MOONSHOT_UPSTREAM || "https://api.moonshot.cn/v1/chat/completions";

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/chat/completions", async (req, res) => {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: {
        message:
          "Server missing MOONSHOT_API_KEY. Set it in .env.local (not starting with VITE_).",
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
      body: JSON.stringify(req.body ?? {}),
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

