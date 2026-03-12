import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { futuresData, supplyMetrics, terminalReserves, alerts, geopoliticalEvents, priceHistory } from "../drizzle/schema";
import { desc, eq, gte, and } from "drizzle-orm";
import { runFullDataRefresh, INSTRUMENTS, backfillSupplyMetricsHistory } from "./dataIngestion";
import { z } from "zod/v4";

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
  }),
});

export type AppRouter = typeof appRouter;
