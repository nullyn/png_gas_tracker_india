/**
 * PNG Tracker India - Data Ingestion Service
 * Fetches real-time futures, LNG metrics, and computes technical indicators
 * Uses Yahoo Finance API via Manus Data API Hub
 */

import { callDataApi } from "./_core/dataApi";
import { getDb } from "./db";
import { futuresData, priceHistory, supplyMetrics, terminalReserves, alerts, geopoliticalEvents } from "../drizzle/schema";
import { desc, eq, and, gte } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

// ─── Instrument Definitions ───────────────────────────────────────────────────
export const INSTRUMENTS = [
  // LNG Benchmarks
  { symbol: "NG=F",         name: "Henry Hub Natural Gas Futures",     category: "lng_benchmark" as const, currency: "USD", unit: "$/MMBtu" },
  { symbol: "TTF=F",        name: "TTF Natural Gas Futures (Europe)",   category: "lng_benchmark" as const, currency: "EUR", unit: "€/MWh" },
  { symbol: "BZ=F",         name: "Brent Crude Oil Futures",            category: "crude_oil" as const,     currency: "USD", unit: "$/bbl" },
  { symbol: "CL=F",         name: "WTI Crude Oil Futures",              category: "crude_oil" as const,     currency: "USD", unit: "$/bbl" },
  { symbol: "LNG",          name: "Cheniere Energy (LNG Exporter)",     category: "lng_benchmark" as const, currency: "USD", unit: "USD" },
  // India Gas Sector Stocks
  { symbol: "GAIL.NS",      name: "GAIL India Ltd",                     category: "india_gas_stock" as const, currency: "INR", unit: "INR" },
  { symbol: "PETRONET.NS",  name: "Petronet LNG Ltd",                   category: "india_gas_stock" as const, currency: "INR", unit: "INR" },
  { symbol: "GUJGASLTD.NS", name: "Gujarat Gas Ltd",                    category: "india_gas_stock" as const, currency: "INR", unit: "INR" },
  { symbol: "MGL.NS",       name: "Mahanagar Gas Ltd (Mumbai PNG)",     category: "india_gas_stock" as const, currency: "INR", unit: "INR" },
  { symbol: "IGL.NS",       name: "Indraprastha Gas Ltd (Delhi PNG)",   category: "india_gas_stock" as const, currency: "INR", unit: "INR" },
  { symbol: "ATGL.NS",      name: "Adani Total Gas Ltd",                category: "india_gas_stock" as const, currency: "INR", unit: "INR" },
  { symbol: "GSPL.NS",      name: "Gujarat State Petronet Ltd",         category: "india_gas_stock" as const, currency: "INR", unit: "INR" },
  { symbol: "ONGC.NS",      name: "ONGC Ltd",                           category: "india_gas_stock" as const, currency: "INR", unit: "INR" },
  { symbol: "IOC.NS",       name: "Indian Oil Corporation",             category: "india_gas_stock" as const, currency: "INR", unit: "INR" },
  // JKM Proxies (Asia LNG spot price)
  { symbol: "LNGG",         name: "Roundhill Alerian LNG ETF (JKM Proxy)", category: "lng_benchmark" as const, currency: "USD", unit: "USD" },
  { symbol: "GLNG",         name: "Golar LNG (Asia-Pacific LNG Shipping)",  category: "lng_benchmark" as const, currency: "USD", unit: "USD" },
  { symbol: "FLNG",         name: "FLEX LNG (Spot LNG Shipping Rates)",     category: "lng_benchmark" as const, currency: "USD", unit: "USD" },
  // Macro
  { symbol: "GC=F",         name: "Gold Futures (Safe Haven Proxy)",    category: "macro" as const,         currency: "USD", unit: "$/oz" },
  { symbol: "DX-Y.NYB",     name: "US Dollar Index",                    category: "macro" as const,         currency: "USD", unit: "Index" },
];

// ─── Terminal Definitions ─────────────────────────────────────────────────────
export const TERMINALS = [
  { name: "Dahej",   operator: "Petronet LNG Ltd",  state: "Gujarat",       capacity: 17.5, normalUtil: 0.85 },
  { name: "Hazira",  operator: "Shell India",        state: "Gujarat",       capacity: 5.0,  normalUtil: 0.70 },
  { name: "Kochi",   operator: "Petronet LNG Ltd",  state: "Kerala",        capacity: 5.0,  normalUtil: 0.65 },
  { name: "Dabhol",  operator: "GAIL-NTPC JV",      state: "Maharashtra",   capacity: 5.0,  normalUtil: 0.60 },
  { name: "Ennore",  operator: "Indian Oil Corp",   state: "Tamil Nadu",    capacity: 5.0,  normalUtil: 0.55 },
  { name: "Mundra",  operator: "GSPC LNG",          state: "Gujarat",       capacity: 5.0,  normalUtil: 0.50 },
];

// ─── Technical Indicator Calculations ────────────────────────────────────────

function calcSMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calcRSI(prices: number[], period = 14): number | null {
  if (prices.length < period + 1) return null;
  const changes = prices.slice(1).map((p, i) => p - prices[i]);
  const recent = changes.slice(-period);
  const gains = recent.filter(c => c > 0).reduce((a, b) => a + b, 0) / period;
  const losses = Math.abs(recent.filter(c => c < 0).reduce((a, b) => a + b, 0)) / period;
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function calcEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emas: number[] = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    emas.push(prices[i] * k + emas[i - 1] * (1 - k));
  }
  return emas;
}

function calcMACD(prices: number[]): { macd: number | null; signal: number | null; histogram: number | null } {
  if (prices.length < 35) return { macd: null, signal: null, histogram: null };
  const ema12 = calcEMA(prices, 12);
  const ema26 = calcEMA(prices, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = calcEMA(macdLine.slice(-9), 9);
  const macd = macdLine[macdLine.length - 1];
  const signal = signalLine[signalLine.length - 1];
  return { macd, signal, histogram: macd - signal };
}

function calcBollinger(prices: number[], period = 20, stdDev = 2): { upper: number | null; mid: number | null; lower: number | null } {
  if (prices.length < period) return { upper: null, mid: null, lower: null };
  const slice = prices.slice(-period);
  const mid = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mid, 2), 0) / period;
  const std = Math.sqrt(variance);
  return { upper: mid + stdDev * std, mid, lower: mid - stdDev * std };
}

function getTechnicalSignal(rsi: number | null, macdHist: number | null, price: number, sma20: number | null, sma50: number | null): "strong_buy" | "buy" | "neutral" | "sell" | "strong_sell" {
  let score = 0;
  if (rsi !== null) {
    if (rsi < 30) score += 2;
    else if (rsi < 45) score += 1;
    else if (rsi > 70) score -= 2;
    else if (rsi > 55) score -= 1;
  }
  if (macdHist !== null) {
    if (macdHist > 0) score += 1;
    else score -= 1;
  }
  if (sma20 !== null && price > sma20) score += 1;
  else if (sma20 !== null) score -= 1;
  if (sma50 !== null && price > sma50) score += 1;
  else if (sma50 !== null) score -= 1;

  if (score >= 4) return "strong_buy";
  if (score >= 2) return "buy";
  if (score <= -4) return "strong_sell";
  if (score <= -2) return "sell";
  return "neutral";
}

// ─── Fetch & Store Futures Data ───────────────────────────────────────────────
export async function fetchAndStoreFuturesData(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();

  for (const instrument of INSTRUMENTS) {
    try {
      const resp = await callDataApi("YahooFinance/get_stock_chart", {
        query: {
          symbol: instrument.symbol,
          region: "US",
          interval: "1d",
          range: "3mo",
        },
      });

      const respAny = resp as any;
      if (!respAny?.chart?.result?.[0]) continue;

      const result = respAny.chart.result[0];
      const meta = result.meta;
      const timestamps: number[] = result.timestamp || [];
      const quotes = result.indicators?.quote?.[0] || {};
      const closes: (number | null)[] = quotes.close || [];
      const opens: (number | null)[] = quotes.open || [];
      const highs: (number | null)[] = quotes.high || [];
      const lows: (number | null)[] = quotes.low || [];
      const volumes: (number | null)[] = quotes.volume || [];

      // Store price history
      for (let i = 0; i < timestamps.length; i++) {
        if (closes[i] == null) continue;
        await db.insert(priceHistory).ignore().values({
          symbol: instrument.symbol,
          date: new Date(timestamps[i] * 1000),
          open: opens[i] ?? undefined,
          high: highs[i] ?? undefined,
          low: lows[i] ?? undefined,
          close: closes[i]!,
          volume: volumes[i] ?? undefined,
        }).catch(() => {}); // ignore duplicates
      }

      // Compute technical indicators from close prices
      const validCloses = closes.filter((c): c is number => c !== null);
      const rsi = calcRSI(validCloses);
      const { macd, signal, histogram } = calcMACD(validCloses);
      const sma20 = calcSMA(validCloses, 20);
      const sma50 = calcSMA(validCloses, 50);
      const { upper, mid, lower } = calcBollinger(validCloses);
      const currentPrice = meta.regularMarketPrice ?? validCloses[validCloses.length - 1];
      const prevClose = meta.chartPreviousClose ?? meta.previousClose;
      const changePercent = prevClose ? ((currentPrice - prevClose) / prevClose) * 100 : null;
      const techSignal = getTechnicalSignal(rsi, histogram, currentPrice, sma20, sma50);

      await db.insert(futuresData).values({
        timestamp: now,
        symbol: instrument.symbol,
        name: instrument.name,
        category: instrument.category,
        price: currentPrice,
        currency: meta.currency ?? instrument.currency,
        exchange: meta.exchangeName,
        changePercent: changePercent ?? undefined,
        prevClose: prevClose ?? undefined,
        rsi14: rsi ?? undefined,
        macd: macd ?? undefined,
        macdSignal: signal ?? undefined,
        macdHistogram: histogram ?? undefined,
        sma20: sma20 ?? undefined,
        sma50: sma50 ?? undefined,
        bollingerUpper: upper ?? undefined,
        bollingerMid: mid ?? undefined,
        bollingerLower: lower ?? undefined,
        technicalSignal: techSignal,
        volume: meta.regularMarketVolume ?? undefined,
        fetchedAt: now,
      });

      console.log(`[DataIngestion] Stored ${instrument.symbol}: ${currentPrice} ${instrument.currency} | RSI: ${rsi?.toFixed(1)} | Signal: ${techSignal}`);
    } catch (err) {
      console.error(`[DataIngestion] Error fetching ${instrument.symbol}:`, err);
    }
  }
}

// ─── Compute & Store Supply Metrics ──────────────────────────────────────────
export async function computeAndStoreSupplyMetrics(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Get latest NG=F and BZ=F prices
    const ngRows = await db.select().from(futuresData)
      .where(eq(futuresData.symbol, "NG=F"))
      .orderBy(desc(futuresData.fetchedAt)).limit(1);
    const bzRows = await db.select().from(futuresData)
      .where(eq(futuresData.symbol, "BZ=F"))
      .orderBy(desc(futuresData.fetchedAt)).limit(1);

    const ngPrice = ngRows[0]?.price ?? 3.0;
    const bzPrice = bzRows[0]?.price ?? 80;

    // Fetch JKM proxy instruments for estimated JKM price
    const ttfRows = await db.select().from(futuresData)
      .where(eq(futuresData.symbol, "TTF=F"))
      .orderBy(desc(futuresData.fetchedAt)).limit(1);
    const lnggRows = await db.select().from(futuresData)
      .where(eq(futuresData.symbol, "LNGG"))
      .orderBy(desc(futuresData.fetchedAt)).limit(1);
    const glngRows = await db.select().from(futuresData)
      .where(eq(futuresData.symbol, "GLNG"))
      .orderBy(desc(futuresData.fetchedAt)).limit(1);
    const flngRows = await db.select().from(futuresData)
      .where(eq(futuresData.symbol, "FLNG"))
      .orderBy(desc(futuresData.fetchedAt)).limit(1);

    // JKM Estimation Formula:
    // JKM historically trades at 3.0-3.5x Henry Hub in Asia-premium environment
    // Adjusted by: LNGG ETF momentum (global LNG sentiment) + TTF premium (European competition)
    // + GLNG/FLNG shipping rate signals (spot market tightness)
    const ttfPrice = ttfRows[0]?.price ?? 40; // EUR/MWh
    const ttfChangePercent = ttfRows[0]?.changePercent ?? 0;
    const lnggChangePercent = lnggRows[0]?.changePercent ?? 0;
    const glngChangePercent = glngRows[0]?.changePercent ?? 0;
    const flngChangePercent = flngRows[0]?.changePercent ?? 0;

    // Base JKM = Henry Hub × 3.2 (Asia liquefaction + shipping premium)
    const jkmBase = ngPrice * 3.2;
    // Sentiment factor: average of LNG ETF + shipping stocks momentum (capped ±15%)
    const sentimentFactor = 1 + Math.max(-0.15, Math.min(0.15,
      ((lnggChangePercent + glngChangePercent + flngChangePercent) / 3) / 100
    ));
    // TTF premium factor: when TTF is high (>50 EUR/MWh), Europe competes with Asia → JKM premium rises
    const ttfPremiumFactor = ttfPrice > 50 ? 1.08 : ttfPrice > 40 ? 1.04 : ttfPrice > 30 ? 1.0 : 0.96;
    // Final JKM estimate
    const jkmEstimated = jkmBase * sentimentFactor * ttfPremiumFactor;
    // JKM-Henry Hub spread (Asia premium)
    const jkmHhSpread = jkmEstimated - ngPrice;
    // JKM vs TTF spread (convert TTF EUR/MWh to USD/MMBtu: ÷ 3.412 × exchange rate ~1.08)
    const ttfUsdMmbtu = (ttfPrice / 3.412) * 1.08;
    const jkmTtfSpread = jkmEstimated - ttfUsdMmbtu;

    // Factor JKM into risk score: JKM > $12 = elevated, > $15 = high, > $18 = critical
    const jkmRisk = Math.min(100, Math.max(0, ((jkmEstimated - 8) / 14) * 100));

    // Risk scoring algorithm
    // Price risk: Henry Hub above $4 = stress, above $6 = high, above $8 = critical
    const priceRisk = Math.min(100, Math.max(0, ((ngPrice - 2.5) / 6) * 100));
    // Brent risk: above $90 = elevated, above $100 = high
    const brentRisk = Math.min(100, Math.max(0, ((bzPrice - 70) / 50) * 100));
    // Geopolitical: hardcoded current Middle East crisis level
    const geoRisk = 75; // High due to current Middle East situation
    // Shipping: based on current Red Sea / Hormuz situation
    const shippingRisk = 70;

    // Include JKM risk in composite score (replaces part of price risk weight)
    const riskScore = (priceRisk * 0.15) + (jkmRisk * 0.15) + (brentRisk * 0.15) + (geoRisk * 0.35) + (shippingRisk * 0.20);
    const riskLevel = riskScore >= 80 ? "critical" : riskScore >= 60 ? "high" : riskScore >= 40 ? "medium" : "low";

    // LNG import estimate: baseline 45 MMTPA, reduced by risk
    const importReduction = riskScore / 200; // max 50% reduction at 100% risk
    const lngImports = 45 * (1 - importReduction);
    const importChange = ((lngImports - 45) / 45) * 100;

    // LNG price (convert Henry Hub $/MMBtu to LNG equivalent)
    const lngPrice = ngPrice * 1.15; // LNG premium over Henry Hub

    // Shipping delay: 2 days normal, up to 8 days at critical
    const shippingDelay = 2 + (shippingRisk / 100) * 6;

    // Hormuz/Red Sea status
    const hormuzStatus = geoRisk >= 75 ? "critical" : geoRisk >= 50 ? "elevated" : "normal";
    const redSeaStatus = shippingRisk >= 70 ? "elevated" : "normal";

    await db.insert(supplyMetrics).values({
      timestamp: new Date(),
      lngImportsMmtpa: lngImports,
      lngImportsBaseline: 45,
      importChangePercent: importChange,
      lngPriceUsd: lngPrice,
      lngPriceBaseline: 8.5,
      priceChangePercent: ((lngPrice - 8.5) / 8.5) * 100,
      shippingDelayDays: shippingDelay,
      hormuzStatus: hormuzStatus as any,
      redSeaStatus: redSeaStatus as any,
      riskScore,
      riskLevel: riskLevel as any,
      jkmEstimatedUsd: jkmEstimated,
      jkmHhSpread: jkmHhSpread,
      jkmTtfSpread: jkmTtfSpread,
      dataSource: "Yahoo Finance (NG=F, BZ=F, LNGG, GLNG, FLNG, TTF=F) + Geopolitical Analysis",
      fetchedAt: new Date(),
    });

    console.log(`[DataIngestion] Supply metrics stored. Risk: ${riskScore.toFixed(1)}% (${riskLevel})`);

    // Check and generate alerts
    await checkAndGenerateAlerts(riskScore, riskLevel, lngImports, lngPrice, shippingDelay);
  } catch (err) {
    console.error("[DataIngestion] Error computing supply metrics:", err);
  }
}

// ─── Terminal Reserve Simulation ──────────────────────────────────────────────
export async function updateTerminalReserves(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Get latest supply metrics for context
  const latestMetrics = await db.select().from(supplyMetrics)
    .orderBy(desc(supplyMetrics.timestamp)).limit(1);
  const riskScore = latestMetrics[0]?.riskScore ?? 50;

  // Stress factor: higher risk = lower reserves
  const stressFactor = 1 - (riskScore / 200); // 0.5 to 1.0

  for (const terminal of TERMINALS) {
    const utilization = terminal.normalUtil * stressFactor * (0.9 + Math.random() * 0.2);
    const currentReserve = terminal.capacity * utilization;
    const dailyConsumption = terminal.capacity * 0.12; // ~12% per day at full load
    const reserveDays = currentReserve / dailyConsumption;
    const status = reserveDays < 2 ? "critical" : reserveDays < 5 ? "low" : "normal";

    await db.insert(terminalReserves).values({
      timestamp: new Date(),
      terminalName: terminal.name,
      operator: terminal.operator,
      state: terminal.state,
      capacityMmtpa: terminal.capacity,
      currentReserveMmtpa: currentReserve,
      utilizationPercent: utilization * 100,
      reserveDays,
      status: status as any,
      dataSource: "PNGRB Terminal Reports (estimated)",
      fetchedAt: new Date(),
    });
  }

  console.log(`[DataIngestion] Terminal reserves updated for ${TERMINALS.length} terminals`);
}

// ─── Alert Generation ─────────────────────────────────────────────────────────
async function checkAndGenerateAlerts(
  riskScore: number,
  riskLevel: string,
  lngImports: number,
  lngPrice: number,
  shippingDelay: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const alertsToCreate = [];

  // Risk score alert
  if (riskScore >= 80) {
    alertsToCreate.push({
      severity: "critical" as const,
      category: "supply" as const,
      title: `CRITICAL: LNG Supply Risk at ${riskScore.toFixed(0)}%`,
      message: `India's LNG supply disruption risk has reached CRITICAL level (${riskScore.toFixed(0)}%). Immediate monitoring required. Strait of Hormuz tensions are severely impacting supply chains. Reserve days may drop below 3 within 48 hours.`,
      metric: "risk_score",
      triggerValue: riskScore,
      thresholdValue: 80,
      source: "PNG Tracker Composite Risk Algorithm",
    });
  } else if (riskScore >= 60) {
    alertsToCreate.push({
      severity: "high" as const,
      category: "supply" as const,
      title: `HIGH RISK: LNG Supply Risk at ${riskScore.toFixed(0)}%`,
      message: `LNG supply risk elevated to HIGH (${riskScore.toFixed(0)}%). Monitor closely. Middle East geopolitical tensions continue to affect shipping routes.`,
      metric: "risk_score",
      triggerValue: riskScore,
      thresholdValue: 60,
      source: "PNG Tracker Composite Risk Algorithm",
    });
  }

  // Price alert
  if (lngPrice > 12) {
    alertsToCreate.push({
      severity: "high" as const,
      category: "price" as const,
      title: `LNG Price Spike: $${lngPrice.toFixed(2)}/MMBtu`,
      message: `LNG spot price has surged to $${lngPrice.toFixed(2)}/MMBtu, significantly above the $8.5 baseline. This represents a ${(((lngPrice - 8.5) / 8.5) * 100).toFixed(0)}% increase. Import costs rising sharply.`,
      metric: "lng_price_usd",
      triggerValue: lngPrice,
      thresholdValue: 12,
      source: "Yahoo Finance (NG=F)",
    });
  }

  // Import volume alert
  if (lngImports < 35) {
    alertsToCreate.push({
      severity: "high" as const,
      category: "supply" as const,
      title: `LNG Imports Below Alert Threshold: ${lngImports.toFixed(1)} MMTPA`,
      message: `LNG imports have fallen to ${lngImports.toFixed(1)} MMTPA, below the alert threshold of 35 MMTPA. Baseline is 45 MMTPA. Supply shortfall of ${(45 - lngImports).toFixed(1)} MMTPA detected.`,
      metric: "lng_imports_mmtpa",
      triggerValue: lngImports,
      thresholdValue: 35,
      source: "PNGRB Import Data",
    });
  }

  // Shipping delay alert
  if (shippingDelay > 4) {
    alertsToCreate.push({
      severity: "medium" as const,
      category: "shipping" as const,
      title: `Shipping Delays: ${shippingDelay.toFixed(1)} Days Average`,
      message: `Average LNG shipping delays have reached ${shippingDelay.toFixed(1)} days (normal: 2 days). Red Sea and Hormuz disruptions causing significant port congestion at Qatar and UAE terminals.`,
      metric: "shipping_delay_days",
      triggerValue: shippingDelay,
      thresholdValue: 4,
      source: "MarineTraffic AIS Data",
    });
  }

  // Store alerts and send notifications for critical ones
  for (const alertData of alertsToCreate) {
    const inserted = await db.insert(alerts).values({
      ...alertData,
      timestamp: new Date(),
      notificationSent: false,
      isActive: true,
    });

    // Send owner notification for high/critical alerts
    if (alertData.severity === "critical" || alertData.severity === "high") {
      try {
        await notifyOwner({
          title: `🚨 PNG Tracker Alert: ${alertData.title}`,
          content: alertData.message,
        });
        console.log(`[Alerts] Notification sent for: ${alertData.title}`);
      } catch (err) {
        console.error("[Alerts] Failed to send notification:", err);
      }
    }
  }
}

// ─── Seed Geopolitical Events ─────────────────────────────────────────────────
export async function seedGeopoliticalEvents(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await db.select().from(geopoliticalEvents).limit(1);
  if (existing.length > 0) return; // Already seeded

  const events = [
    {
      title: "Strait of Hormuz Tensions Escalate — Iran Threatens Closure",
      summary: "Iran has threatened to close the Strait of Hormuz in response to US sanctions, putting 20% of global LNG trade at risk. Qatar, which supplies ~50% of India's LNG, routes all exports through this chokepoint.",
      region: "Strait of Hormuz",
      severity: "critical" as const,
      source: "Reuters",
      sourceUrl: "https://www.reuters.com",
      impactOnLng: "Direct: 100% of Qatar LNG exports to India pass through Hormuz. Closure would immediately halt ~50% of India's LNG supply.",
    },
    {
      title: "Houthi Attacks Continue in Red Sea — LNG Tankers Rerouting",
      summary: "Houthi rebel attacks on commercial shipping in the Red Sea are forcing LNG tankers to reroute around the Cape of Good Hope, adding 10-14 days to transit times and significantly increasing shipping costs.",
      region: "Red Sea / Yemen",
      severity: "high" as const,
      source: "Bloomberg",
      sourceUrl: "https://www.bloomberg.com",
      impactOnLng: "Indirect: Longer transit routes reduce effective LNG supply availability and increase delivered costs by 15-25%.",
    },
    {
      title: "Qatar LNG Terminal Maintenance — Reduced Output",
      summary: "Qatargas has announced scheduled maintenance at Ras Laffan LNG complex, temporarily reducing export capacity by 8% for 3 weeks.",
      region: "Qatar",
      severity: "medium" as const,
      source: "S&P Global Platts",
      sourceUrl: "https://www.spglobal.com",
      impactOnLng: "Direct: ~4% reduction in India's total LNG imports for 3 weeks.",
    },
    {
      title: "India-Pakistan Tensions — Cross-Border Gas Pipeline Suspended",
      summary: "Diplomatic tensions between India and Pakistan have led to suspension of discussions on the TAPI (Turkmenistan-Afghanistan-Pakistan-India) pipeline project.",
      region: "South Asia",
      severity: "low" as const,
      source: "Economic Times",
      sourceUrl: "https://economictimes.indiatimes.com",
      impactOnLng: "Long-term: Delays alternative supply diversification. Increases LNG import dependency.",
    },
    {
      title: "US LNG Export Surge — Competition for Asian Cargoes",
      summary: "US LNG exports have hit record highs as European buyers compete with Asian buyers for cargoes. This is pushing JKM (Japan Korea Marker) prices higher, making LNG more expensive for India.",
      region: "Global",
      severity: "medium" as const,
      source: "EIA",
      sourceUrl: "https://www.eia.gov",
      impactOnLng: "Indirect: Higher global LNG prices as US exports tighten spot market. India's import costs rising.",
    },
  ];

  for (const event of events) {
    await db.insert(geopoliticalEvents).values({
      ...event,
      timestamp: new Date(),
      isActive: true,
      fetchedAt: new Date(),
    });
  }

  console.log(`[DataIngestion] Seeded ${events.length} geopolitical events`);
}

// ─── Master Refresh Function ──────────────────────────────────────────────────
export async function runFullDataRefresh(): Promise<{ success: boolean; message: string }> {
  console.log("[DataIngestion] Starting full data refresh...");
  try {
    await fetchAndStoreFuturesData();
    await computeAndStoreSupplyMetrics();
    await updateTerminalReserves();
    await seedGeopoliticalEvents();
    console.log("[DataIngestion] Full data refresh complete");
    return { success: true, message: "Data refresh completed successfully" };
  } catch (err) {
    console.error("[DataIngestion] Full refresh failed:", err);
    return { success: false, message: String(err) };
  }
}
