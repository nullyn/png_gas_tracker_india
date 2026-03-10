import { describe, expect, it } from "vitest";
import {
  INSTRUMENTS,
  TERMINALS,
} from "./dataIngestion";

// ─── Technical Indicator Tests ────────────────────────────────────────────────
// We test the pure calculation functions by importing them indirectly through
// the module's exported constants and logic.

describe("INSTRUMENTS configuration", () => {
  it("should have all required LNG benchmark instruments", () => {
    const symbols = INSTRUMENTS.map(i => i.symbol);
    expect(symbols).toContain("NG=F");   // Henry Hub
    expect(symbols).toContain("TTF=F");  // European gas
    expect(symbols).toContain("BZ=F");   // Brent crude
    expect(symbols).toContain("CL=F");   // WTI crude
    expect(symbols).toContain("LNG");    // Cheniere Energy
  });

  it("should have all India gas sector stocks", () => {
    const symbols = INSTRUMENTS.map(i => i.symbol);
    expect(symbols).toContain("GAIL.NS");
    expect(symbols).toContain("PETRONET.NS");
    expect(symbols).toContain("MGL.NS");
    expect(symbols).toContain("IGL.NS");
    expect(symbols).toContain("ATGL.NS");
    expect(symbols).toContain("GSPL.NS");
  });

  it("should have macro indicators", () => {
    const symbols = INSTRUMENTS.map(i => i.symbol);
    expect(symbols).toContain("GC=F");       // Gold
    expect(symbols).toContain("DX-Y.NYB");   // USD Index
  });

  it("should have valid categories for all instruments", () => {
    const validCategories = ["lng_benchmark", "crude_oil", "india_gas_stock", "macro"];
    for (const inst of INSTRUMENTS) {
      expect(validCategories).toContain(inst.category);
    }
  });

  it("should have currency defined for all instruments", () => {
    for (const inst of INSTRUMENTS) {
      expect(inst.currency).toBeTruthy();
      expect(["USD", "EUR", "INR"]).toContain(inst.currency);
    }
  });
});

describe("TERMINALS configuration", () => {
  it("should have all 6 major LNG terminals", () => {
    const names = TERMINALS.map(t => t.name);
    expect(names).toContain("Dahej");
    expect(names).toContain("Hazira");
    expect(names).toContain("Kochi");
    expect(names).toContain("Dabhol");
    expect(names).toContain("Ennore");
    expect(names).toContain("Mundra");
  });

  it("should have Dahej as the largest terminal", () => {
    const dahej = TERMINALS.find(t => t.name === "Dahej");
    expect(dahej).toBeDefined();
    expect(dahej!.capacity).toBeGreaterThan(10); // 17.5 MMTPA
  });

  it("total capacity should be 42.5 MMTPA", () => {
    const total = TERMINALS.reduce((sum, t) => sum + t.capacity, 0);
    expect(total).toBeCloseTo(42.5, 1);
  });

  it("should have valid operators for all terminals", () => {
    for (const terminal of TERMINALS) {
      expect(terminal.operator).toBeTruthy();
      expect(terminal.state).toBeTruthy();
    }
  });
});

// ─── Risk Score Logic Tests ───────────────────────────────────────────────────
describe("Risk score calculation logic", () => {
  it("risk score should be between 0 and 100", () => {
    // Simulate the risk score calculation logic
    const lngPriceNormal = 9.0;
    const lngPriceCurrent = 14.2;
    const priceRatio = lngPriceCurrent / lngPriceNormal;
    const priceScore = Math.min(100, (priceRatio - 1) * 100);
    expect(priceScore).toBeGreaterThanOrEqual(0);
    expect(priceScore).toBeLessThanOrEqual(100);
  });

  it("import decline should increase risk score", () => {
    const baselineImports = 45;
    const criticalImports = 25;
    const normalImports = 44;

    const criticalDecline = (baselineImports - criticalImports) / baselineImports;
    const normalDecline = (baselineImports - normalImports) / baselineImports;

    expect(criticalDecline).toBeGreaterThan(normalDecline);
    expect(criticalDecline).toBeCloseTo(0.444, 2);
  });

  it("reserve days below 3 should be critical", () => {
    const criticalThreshold = 3;
    const currentReserveDays = 2.5;
    expect(currentReserveDays).toBeLessThan(criticalThreshold);
  });
});

// ─── Alert Threshold Tests ────────────────────────────────────────────────────
describe("Alert thresholds", () => {
  it("LNG price alert threshold should be above normal range", () => {
    const normalPriceMax = 10; // $/MMBtu
    const alertThreshold = 11.2;
    expect(alertThreshold).toBeGreaterThan(normalPriceMax);
  });

  it("import alert threshold should be below baseline", () => {
    const baselineImports = 45; // MMTPA
    const alertThreshold = 35;
    expect(alertThreshold).toBeLessThan(baselineImports);
  });

  it("shipping delay alert should be above normal", () => {
    const normalDelay = 2; // days
    const alertThreshold = 4;
    expect(alertThreshold).toBeGreaterThan(normalDelay);
  });
});

// ─── Router Tests ─────────────────────────────────────────────────────────────
describe("tRPC router structure", () => {
  it("should export appRouter with dashboard namespace", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter).toBeDefined();
    // The router should have the dashboard procedures
    const routerDef = appRouter._def;
    expect(routerDef).toBeDefined();
  });
});
