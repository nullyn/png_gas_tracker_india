import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerChatRoutes } from "./chat";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { runFullDataRefresh } from "../dataIngestion";

// ─── Data Refresh Scheduler ───────────────────────────────────────────────────
const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes

function startScheduler() {
  console.log("[Scheduler] Starting data refresh scheduler (every 15 min)...");
  // Run immediately on startup
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

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
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
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "3000");
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Start the data refresh scheduler after server is up
    startScheduler();
  });
}

startServer().catch(console.error);
