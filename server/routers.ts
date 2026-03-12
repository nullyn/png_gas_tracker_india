import WebSocket from "ws";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { futuresData, supplyMetrics, terminalReserves, alerts, geopoliticalEvents, priceHistory } from "../drizzle/schema";
import { desc, eq, gte, and } from "drizzle-orm";
import { runFullDataRefresh, INSTRUMENTS, backfillSupplyMetricsHistory } from "./dataIngestion";
import { z } from "zod/v4";

// ─── Vessel Tracking (AISStream — persistent connection) ─────────────────────
//
// Instead of polling (connect → collect 25s → disconnect → wait 1hr), we keep
// a single long-lived WebSocket open. Vessels transmit every 10–30 seconds;
// over minutes we accumulate many more than a 25s burst would ever catch.
// Positions are pruned after 30 min of silence (vessel left the bounding box
// or went out of terrestrial-receiver range).

interface AisVessel {
  mmsi: string;
  imo: string;
  name: string;
  type: number;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  navstat: number;
  destination: string;
}
interface VesselRegionCounts { total: number; tankers: number; underway: number; }
interface VesselSnapshot {
  vessels: (AisVessel & { region: string; isLngCandidate: boolean; flag: string })[];
  counts: { persianGulf: VesselRegionCounts; hormuz: VesselRegionCounts; gulfOfOman: VesselRegionCounts; redSea: VesselRegionCounts };
  fetchedAt: string;
  isLive: boolean;
  source: string;
}

interface LiveEntry {
  pos: AisVessel;
  type: number;
  imo: string;
  destination: string;
  lastSeen: number;
}

const _liveMap = new Map<string, LiveEntry>();
const VESSEL_STALE_MS = 30 * 60 * 1000; // prune if not heard from in 30 min
let _aisConnected = false;
let _aisWs: WebSocket | null = null;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function classifyVesselRegion(lat: number, lon: number): string {
  if (lat >= 25.5 && lat <= 27.5 && lon >= 55.5 && lon <= 58) return "hormuz";
  if (lat >= 23 && lat <= 30.5 && lon >= 47 && lon <= 57.5) return "persian_gulf";
  if (lat >= 21 && lat <= 26.5 && lon >= 57 && lon <= 64) return "gulf_of_oman";
  if (lon >= 32 && lon <= 45 && lat >= 11 && lat <= 30) return "red_sea";
  return "arabian_sea";
}

function connectAisStream(apiKey: string): void {
  if (_aisWs) { try { _aisWs.terminate(); } catch { /* ignore */ } _aisWs = null; }
  _aisConnected = false;

  const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
  _aisWs = ws;
  console.log("[VesselTracking] Opening persistent connection...");

  ws.on("open", () => {
    _aisConnected = true;
    console.log(`[VesselTracking] Connected. Subscribing (${_liveMap.size} vessels in map)`);
    ws.send(JSON.stringify({
      Apikey: apiKey,
      BoundingBoxes: [
        [[22, 47], [30.5, 64]],  // Persian Gulf + Hormuz + Gulf of Oman
        [[11, 32], [30, 45]],    // Red Sea
      ],
      FilterMessageTypes: ["PositionReport", "ShipStaticData"],
    }));
  });

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString()) as any;
      const meta = msg.Metadata ?? msg.MetaData ?? {};
      const mmsi = String(meta.MMSI ?? "");
      if (!mmsi) return;
      const now = Date.now();

      if (msg.MessageType === "PositionReport") {
        const pos = msg.Message?.PositionReport ?? {};
        const existing = _liveMap.get(mmsi);
        _liveMap.set(mmsi, {
          pos: {
            mmsi,
            imo: existing?.imo ?? "",
            name: String(meta.ShipName ?? existing?.pos.name ?? "UNKNOWN").trim(),
            type: existing?.type ?? 0,
            lat: Number(pos.Latitude ?? meta.latitude ?? 0),
            lon: Number(pos.Longitude ?? meta.longitude ?? 0),
            speed: Number(pos.SpeedOverGround ?? 0),
            heading: Number(pos.TrueHeading ?? 511),
            navstat: Number(pos.NavigationalStatus ?? 15),
            destination: existing?.destination ?? "",
          },
          type: existing?.type ?? 0,
          imo: existing?.imo ?? "",
          destination: existing?.destination ?? "",
          lastSeen: now,
        });
      } else if (msg.MessageType === "ShipStaticData") {
        const info = msg.Message?.ShipStaticData ?? {};
        const existing = _liveMap.get(mmsi);
        const type = Number(info.Type ?? existing?.type ?? 0);
        const imo = String(info.ImoNumber ?? existing?.imo ?? "");
        const destination = String(info.Destination ?? existing?.destination ?? "").trim();
        if (existing) {
          existing.type = type; existing.imo = imo; existing.destination = destination;
          existing.pos.type = type; existing.pos.imo = imo; existing.pos.destination = destination;
          existing.lastSeen = now;
        } else {
          // Static data arrived before position — store partial entry
          _liveMap.set(mmsi, {
            pos: { mmsi, imo, name: String(meta.ShipName ?? "").trim(), type, lat: 0, lon: 0, speed: 0, heading: 511, navstat: 15, destination },
            type, imo, destination, lastSeen: now,
          });
        }
      }
    } catch { /* ignore parse errors */ }
  });

  ws.on("error", (err) => {
    console.warn("[VesselTracking] WS error:", err.message);
  });

  ws.on("close", (code) => {
    _aisConnected = false;
    _aisWs = null;
    console.log(`[VesselTracking] Disconnected (code=${code}), reconnecting in 30s. Map has ${_liveMap.size} vessels.`);
    if (_reconnectTimer) clearTimeout(_reconnectTimer);
    _reconnectTimer = setTimeout(() => connectAisStream(apiKey), 30_000);
  });
}

export function initVesselTracking(): void {
  const apiKey = process.env.AISSTREAM_API_KEY ?? "";
  if (!apiKey) {
    console.log("[VesselTracking] AISSTREAM_API_KEY not set — vessel tracking disabled");
    return;
  }
  connectAisStream(apiKey);
}

function getVesselSnapshot(): VesselSnapshot {
  const now = Date.now();
  // Prune vessels silent for > 30 min
  for (const [mmsi, entry] of Array.from(_liveMap.entries())) {
    if (now - entry.lastSeen > VESSEL_STALE_MS) _liveMap.delete(mmsi);
  }
  // Only include vessels with a known position (lat/lon != 0,0)
  const vessels = Array.from(_liveMap.values())
    .filter(({ pos }) => pos.lat !== 0 || pos.lon !== 0)
    .map(({ pos }) => ({
      ...pos,
      region: classifyVesselRegion(pos.lat, pos.lon),
      isLngCandidate: pos.name.includes("GAS") || pos.name.includes("LNG") || pos.name.includes("TANKER"),
      flag: "",
    }));

  const countFor = (region: string): VesselRegionCounts => {
    const vs = vessels.filter(v => v.region === region);
    return { total: vs.length, tankers: vs.filter(v => v.type >= 80 && v.type <= 89).length, underway: vs.filter(v => v.navstat === 0).length };
  };

  const apiKey = process.env.AISSTREAM_API_KEY ?? "";
  const connStatus = _aisConnected ? "connected" : "reconnecting...";
  const source = apiKey
    ? `AISStream — ${vessels.length} live vessel${vessels.length !== 1 ? "s" : ""} (${connStatus})`
    : "Set AISSTREAM_API_KEY env var for live vessel tracking (free at aisstream.io)";

  return {
    vessels: vessels.slice(0, 100),
    counts: { persianGulf: countFor("persian_gulf"), hormuz: countFor("hormuz"), gulfOfOman: countFor("gulf_of_oman"), redSea: countFor("red_sea") },
    fetchedAt: new Date().toISOString(),
    isLive: _aisConnected,
    source,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  dashboard: router({
    latestSupplyMetrics: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(supplyMetrics)
        .orderBy(desc(supplyMetrics.timestamp)).limit(1);
      return rows[0] ?? null;
    }),

    supplyMetricsHistory: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return db.select().from(supplyMetrics)
        .where(gte(supplyMetrics.timestamp, since))
        .orderBy(desc(supplyMetrics.timestamp))
        .limit(200);
    }),

    latestFutures: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const results = [];
      for (const inst of INSTRUMENTS) {
        const rows = await db.select().from(futuresData)
          .where(eq(futuresData.symbol, inst.symbol))
          .orderBy(desc(futuresData.fetchedAt)).limit(1);
        if (rows[0]) results.push(rows[0]);
      }
      return results;
    }),

    priceHistory: publicProcedure
      .input(z.object({
        symbol: z.string(),
        days: z.number().default(90),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
        return db.select().from(priceHistory)
          .where(and(
            eq(priceHistory.symbol, input.symbol),
            gte(priceHistory.date, since)
          ))
          .orderBy(priceHistory.date)
          .limit(500);
      }),

    terminalReserves: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const terminals = ["Dahej", "Hazira", "Kochi", "Dabhol", "Ennore", "Mundra"];
      const results = [];
      for (const name of terminals) {
        const rows = await db.select().from(terminalReserves)
          .where(eq(terminalReserves.terminalName, name))
          .orderBy(desc(terminalReserves.timestamp)).limit(1);
        if (rows[0]) results.push(rows[0]);
      }
      return results;
    }),

    activeAlerts: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(alerts)
        .where(eq(alerts.isActive, true))
        .orderBy(desc(alerts.timestamp))
        .limit(20);
    }),

    geopoliticalEvents: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(geopoliticalEvents)
        .where(eq(geopoliticalEvents.isActive, true))
        .orderBy(desc(geopoliticalEvents.timestamp))
        .limit(10);
    }),

    refresh: publicProcedure.mutation(async () => {
      return runFullDataRefresh();
    }),

    backfillHistory: publicProcedure
      .input(z.object({
        days: z.number().default(30).optional(),
      }))
      .mutation(async ({ input }) => {
        await backfillSupplyMetricsHistory(input.days ?? 30);
        return { success: true, message: "Backfill completed" };
      }),

    instruments: publicProcedure.query(() => INSTRUMENTS),

    vesselSnapshot: publicProcedure.query(() => getVesselSnapshot()),
  }),
});

export type AppRouter = typeof appRouter;
