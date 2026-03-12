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

// ─── Vessel Tracking (AISStream) ────────────────────────────────────────────
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

let _vesselCache: VesselSnapshot | null = null;
let _vesselCacheAt = 0;
const VESSEL_CACHE_TTL = 60 * 60 * 1000; // 1 hour

const VESSEL_FALLBACK: (AisVessel & { region: string; isLngCandidate: boolean; flag: string })[] = [
  { mmsi: "538005682", imo: "9654614", name: "BW PAVILION LEEARA",   type: 80, lat: 25.9, lon: 52.3, speed: 13.8, heading: 295, navstat: 0, destination: "DAHEJ INDIA",      flag: "🇸🇬", region: "persian_gulf", isLngCandidate: true  },
  { mmsi: "354784000", imo: "9213348", name: "AL HUWAILA",           type: 80, lat: 26.2, lon: 53.1, speed: 12.1, heading: 310, navstat: 0, destination: "KOCHI INDIA",      flag: "🇶🇦", region: "persian_gulf", isLngCandidate: true  },
  { mmsi: "370791000", imo: "9390177", name: "AL SHEEHANIYA",        type: 80, lat: 25.4, lon: 50.8, speed: 0.1,  heading: 180, navstat: 1, destination: "RAS LAFFAN",       flag: "🇶🇦", region: "persian_gulf", isLngCandidate: true  },
  { mmsi: "563024400", imo: "9628984", name: "GASLOG SKAGEN",        type: 80, lat: 26.1, lon: 49.5, speed: 14.2, heading: 135, navstat: 0, destination: "BAHRAIN",          flag: "🇸🇬", region: "persian_gulf", isLngCandidate: true  },
  { mmsi: "636016818", imo: "9614580", name: "TRITON VOYAGER",       type: 80, lat: 25.8, lon: 54.7, speed: 11.5, heading: 107, navstat: 0, destination: "HORMUZ/INDIA",     flag: "🇲🇭", region: "persian_gulf", isLngCandidate: true  },
  { mmsi: "477294100", imo: "9271123", name: "PACIFIC INEOS",        type: 80, lat: 26.4, lon: 55.0, speed: 9.8,  heading: 120, navstat: 0, destination: "DAHEJ INDIA",      flag: "🇭🇰", region: "persian_gulf", isLngCandidate: false },
  { mmsi: "470102000", imo: "9261634", name: "MARAN GAS MYSTRAS",    type: 80, lat: 25.7, lon: 51.5, speed: 0.2,  heading: 240, navstat: 1, destination: "RAS LAFFAN",       flag: "🇦🇪", region: "persian_gulf", isLngCandidate: true  },
  { mmsi: "457024300", imo: "9597052", name: "MOZAH",                type: 80, lat: 26.3, lon: 56.4, speed: 13.5, heading: 105, navstat: 0, destination: "DAHEJ INDIA",      flag: "🇶🇦", region: "hormuz",       isLngCandidate: true  },
  { mmsi: "370809000", imo: "9292465", name: "AL ZUBARAH",           type: 80, lat: 26.0, lon: 56.8, speed: 14.0, heading: 98,  navstat: 0, destination: "MUNDRA INDIA",     flag: "🇶🇦", region: "hormuz",       isLngCandidate: true  },
  { mmsi: "538006437", imo: "9702541", name: "FLEX CONSTELLATION",   type: 80, lat: 26.1, lon: 56.2, speed: 0.3,  heading: 45,  navstat: 5, destination: "AWAITING ORDERS",  flag: "🇸🇬", region: "hormuz",       isLngCandidate: true  },
  { mmsi: "236118000", imo: "9322465", name: "ENERGY EMPRESS",       type: 80, lat: 25.9, lon: 56.9, speed: 13.2, heading: 115, navstat: 0, destination: "HAZIRA INDIA",     flag: "🇬🇧", region: "hormuz",       isLngCandidate: true  },
  { mmsi: "636017845", imo: "9701899", name: "GAS AGILITY",          type: 80, lat: 25.7, lon: 57.1, speed: 12.9, heading: 285, navstat: 0, destination: "MUSCAT/ANCHOR",    flag: "🇲🇭", region: "hormuz",       isLngCandidate: false },
  { mmsi: "563076700", imo: "9703412", name: "BW MAGNOLIA",          type: 80, lat: 23.8, lon: 59.2, speed: 14.5, heading: 72,  navstat: 0, destination: "DAHEJ INDIA",      flag: "🇸🇬", region: "gulf_of_oman", isLngCandidate: true  },
  { mmsi: "636091234", imo: "9651234", name: "ENERGY HORIZON",       type: 80, lat: 23.1, lon: 60.8, speed: 13.1, heading: 68,  navstat: 0, destination: "KOCHI INDIA",      flag: "🇲🇭", region: "gulf_of_oman", isLngCandidate: true  },
  { mmsi: "304010417", imo: "9631760", name: "PACIFIC BREEZE",       type: 80, lat: 20.5, lon: 38.2, speed: 14.8, heading: 345, navstat: 0, destination: "SUEZ CANAL",        flag: "🇦🇬", region: "red_sea",      isLngCandidate: false },
  { mmsi: "548543000", imo: "9394910", name: "LNG RIVERS",           type: 80, lat: 17.3, lon: 40.1, speed: 11.2, heading: 155, navstat: 0, destination: "ADEN/CAPE ROUTE",   flag: "🇵🇭", region: "red_sea",      isLngCandidate: true  },
  { mmsi: "636017012", imo: "9681234", name: "SERI BEGAWAN",         type: 80, lat: 14.8, lon: 42.7, speed: 8.5,  heading: 190, navstat: 0, destination: "ADEN REROUTE",      flag: "🇲🇭", region: "red_sea",      isLngCandidate: true  },
  { mmsi: "255803930", imo: "9481231", name: "GASLOG SALEM",         type: 80, lat: 22.1, lon: 37.4, speed: 15.1, heading: 340, navstat: 0, destination: "SUEZ NORTH",        flag: "🇵🇹", region: "red_sea",      isLngCandidate: true  },
];

function classifyVesselRegion(lat: number, lon: number): string {
  if (lat >= 25.5 && lat <= 27.5 && lon >= 55.5 && lon <= 58) return "hormuz";
  if (lat >= 23 && lat <= 30.5 && lon >= 47 && lon <= 57.5) return "persian_gulf";
  if (lat >= 21 && lat <= 26.5 && lon >= 57 && lon <= 64) return "gulf_of_oman";
  if (lon >= 32 && lon <= 45 && lat >= 11 && lat <= 30) return "red_sea";
  return "arabian_sea";
}

async function fetchAisstreamVessels(apiKey: string): Promise<AisVessel[]> {
  return new Promise((resolve) => {
    const posMap = new Map<string, AisVessel>();
    const staticMap = new Map<string, { type: number; imo: string; destination: string }>();

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.terminate(); } catch { /* ignore */ }
      const vessels: AisVessel[] = Array.from(posMap.entries()).map(([mmsi, v]) => {
        const s = staticMap.get(mmsi);
        return { ...v, type: s?.type ?? v.type, imo: s?.imo || v.imo, destination: s?.destination || v.destination };
      });
      resolve(vessels);
    };

    const timer = setTimeout(settle, 25000); // 25-second collection window

    const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
    console.log("[VesselTracking] Connecting to AISStream...");

    ws.on("open", () => {
      console.log("[VesselTracking] WebSocket opened, sending subscription");
      // AISStream JS docs use 'Apikey' (lowercase k); trying that over 'APIKey'
      ws.send(JSON.stringify({
        Apikey: apiKey,
        BoundingBoxes: [
          [[22, 47], [30.5, 64]],  // Persian Gulf + Hormuz + Gulf of Oman
          [[11, 32], [30, 45]],    // Red Sea
        ],
        FilterMessageTypes: ["PositionReport", "ShipStaticData"],
      }));
    });

    let firstMsgLogged = false;
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString()) as any;
        if (!firstMsgLogged) {
          firstMsgLogged = true;
          console.log("[VesselTracking] First message type:", msg.MessageType ?? JSON.stringify(msg).slice(0, 120));
        }
        const meta = msg.Metadata ?? msg.MetaData ?? {};
        const mmsi = String(meta.MMSI ?? "");
        if (!mmsi) return;

        if (msg.MessageType === "PositionReport") {
          const pos = msg.Message?.PositionReport ?? {};
          posMap.set(mmsi, {
            mmsi,
            imo: "",
            name: String(meta.ShipName ?? "UNKNOWN").trim(),
            type: 0,
            lat: Number(pos.Latitude ?? meta.Latitude ?? 0),
            lon: Number(pos.Longitude ?? meta.Longitude ?? 0),
            speed: Number(pos.SpeedOverGround ?? 0),
            heading: Number(pos.TrueHeading ?? 511),
            navstat: Number(pos.NavigationalStatus ?? 15),
            destination: "",
          });
        } else if (msg.MessageType === "ShipStaticData") {
          const info = msg.Message?.ShipStaticData ?? {};
          staticMap.set(mmsi, {
            type: Number(info.Type ?? 0),
            imo: String(info.ImoNumber ?? ""),
            destination: String(info.Destination ?? "").trim(),
          });
        }
      } catch { /* ignore parse errors */ }
    });

    ws.on("error", (err) => {
      console.warn("[VesselTracking] WebSocket error:", err.message);
      settle();
    });
    ws.on("close", (code, reason) => {
      console.log(`[VesselTracking] WebSocket closed — code=${code} reason=${reason?.toString() || '(none)'} vessels_so_far=${posMap.size}`);
      settle();
    });
  });
}

async function getVesselSnapshot(): Promise<VesselSnapshot> {
  const now = Date.now();
  if (_vesselCache && now - _vesselCacheAt < VESSEL_CACHE_TTL) return _vesselCache;

  const apiKey = process.env.AISSTREAM_API_KEY ?? "";
  console.log(`[VesselTracking] getVesselSnapshot — API key ${apiKey ? `SET (${apiKey.length} chars)` : 'NOT SET'}`);
  let vessels: (AisVessel & { region: string; isLngCandidate: boolean; flag: string })[] = [];
  let isLive = false;
  let source = "Demo data — set AISSTREAM_API_KEY env var (free account at aisstream.io)";

  if (apiKey) {
    try {
      const raw = await fetchAisstreamVessels(apiKey);
      console.log(`[VesselTracking] AISStream returned ${raw.length} vessels`);
      if (raw.length > 0) {
        const liveVessels = raw.map(v => ({
          ...v,
          region: classifyVesselRegion(v.lat, v.lon),
          isLngCandidate: v.name.includes("GAS") || v.name.includes("LNG") || v.name.includes("TANKER"),
          flag: "",
        }));
        isLive = true;
        if (liveVessels.length >= 5) {
          vessels = liveVessels;
          source = `AISStream — ${liveVessels.length} live vessels`;
        } else {
          // Free tier returns very few vessels — merge live vessels over the demo
          // set so the map stays useful. Live vessels override demo by MMSI.
          const liveMmsis = new Set(liveVessels.map(v => v.mmsi));
          vessels = [
            ...liveVessels,
            ...VESSEL_FALLBACK.filter(v => !liveMmsis.has(v.mmsi)),
          ];
          source = `AISStream — ${liveVessels.length} live vessel${liveVessels.length !== 1 ? 's' : ''} + demo context (free tier)`;
        }
      }
    } catch (err) {
      console.warn("[VesselTracking] AISStream fetch failed, using demo data:", err);
      source = "Demo data — AISStream unavailable";
    }
  }
  if (vessels.length === 0) vessels = VESSEL_FALLBACK;

  const countFor = (region: string): VesselRegionCounts => {
    const vs = vessels.filter(v => v.region === region);
    return { total: vs.length, tankers: vs.filter(v => v.type >= 80 && v.type <= 89).length, underway: vs.filter(v => v.navstat === 0).length };
  };

  const snapshot: VesselSnapshot = {
    vessels: vessels.slice(0, 40),
    counts: { persianGulf: countFor("persian_gulf"), hormuz: countFor("hormuz"), gulfOfOman: countFor("gulf_of_oman"), redSea: countFor("red_sea") },
    fetchedAt: new Date().toISOString(),
    isLive,
    source,
  };
  _vesselCache = snapshot;
  _vesselCacheAt = now;
  return snapshot;
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
