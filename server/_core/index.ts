import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerChatRoutes } from "./chat";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./static";
import { runFullDataRefresh, backfillSupplyMetricsHistory } from "../dataIngestion";
import { initVesselTracking } from "../routers";

// ─── Data Refresh Scheduler ───────────────────────────────────────────────────
const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // every 1 hour

function startScheduler() {
  console.log("[Scheduler] Starting data refresh scheduler (every 1 hour)...");
  // Backfill historical data on startup (runs only once if already backfilled)
  backfillSupplyMetricsHistory(30)
    .then(() => console.log("[Scheduler] Historical backfill complete"))
    .catch(err => console.error("[Scheduler] Backfill failed:", err));
  // Run immediate full refresh
  runFullDataRefresh()
    .then(r => console.log("[Scheduler] Initial refresh:", r.message))
    .catch(err => console.error("[Scheduler] Initial refresh failed:", err));
  // Then run on interval
  setInterval(() => {
    console.log("[Scheduler] Running scheduled data refresh...");
    runFullDataRefresh()
      .then(r => console.log("[Scheduler] Refresh:", r.message))
      .catch(err => console.error("[Scheduler] Refresh failed:", err));
  }, REFRESH_INTERVAL_MS);
}
// ─────────────────────────────────────────────────────────────────────────────

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// ─── Keep-Alive Self-Ping (prevents Railway container sleep) ─────────────────
// Railway sleeps containers that receive no external traffic.
// We self-ping our own /health endpoint every 4 min via our public URL,
// which creates a real round-trip through Railway's proxy — counted as activity.
function startKeepAlive() {
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (!domain) {
    console.log("[KeepAlive] RAILWAY_PUBLIC_DOMAIN not set — skipping (local dev)");
    return;
  }
  const url = `https://${domain}/health`;
  const INTERVAL_MS = 4 * 60 * 1000; // 4 minutes (Railway sleep threshold is ~5 min)
  console.log(`[KeepAlive] Self-ping active → ${url} every 4 min`);
  setInterval(async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) console.warn(`[KeepAlive] Ping returned ${res.status}`);
    } catch (err: any) {
      console.warn("[KeepAlive] Ping failed:", err?.message ?? err);
    }
  }, INTERVAL_MS);
}
// ─────────────────────────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Health check endpoint (used by Railway and the keep-alive self-ping)
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", uptime: Math.floor(process.uptime()) });
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Chat API with streaming and tool calling
  registerChatRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // production mode uses static files; development mode uses Vite dev server
  serveStatic(app);
  const port = parseInt(process.env.PORT || "3000");
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Start the data refresh scheduler after server is up
    startScheduler();
    // Open persistent AISStream WebSocket connection
    initVesselTracking();
    // Keep Railway container alive with periodic self-ping
    startKeepAlive();
  });
}

startServer().catch(console.error);
