import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, float, boolean } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const supplyMetrics = mysqlTable("supply_metrics", {
  id: int("id").autoincrement().primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  lngImportsMmtpa: float("lng_imports_mmtpa"),
  lngImportsBaseline: float("lng_imports_baseline").default(45),
  importChangePercent: float("import_change_percent"),
  lngPriceUsd: float("lng_price_usd"),
  lngPriceBaseline: float("lng_price_baseline").default(8.5),
  priceChangePercent: float("price_change_percent"),
  shippingDelayDays: float("shipping_delay_days"),
  hormuzStatus: mysqlEnum("hormuz_status", ["normal", "elevated", "critical"]).default("normal"),
  redSeaStatus: mysqlEnum("red_sea_status", ["normal", "elevated", "critical"]).default("normal"),
  riskScore: float("risk_score"),
  riskLevel: mysqlEnum("risk_level", ["low", "medium", "high", "critical"]).default("low"),
  dataSource: varchar("data_source", { length: 255 }),
  fetchedAt: timestamp("fetched_at").defaultNow(),
});

export type SupplyMetric = typeof supplyMetrics.$inferSelect;
export type InsertSupplyMetric = typeof supplyMetrics.$inferInsert;

export const terminalReserves = mysqlTable("terminal_reserves", {
  id: int("id").autoincrement().primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  terminalName: varchar("terminal_name", { length: 100 }).notNull(),
  operator: varchar("operator", { length: 100 }),
  state: varchar("state", { length: 50 }),
  capacityMmtpa: float("capacity_mmtpa"),
  currentReserveMmtpa: float("current_reserve_mmtpa"),
  utilizationPercent: float("utilization_percent"),
  reserveDays: float("reserve_days"),
  status: mysqlEnum("status", ["normal", "low", "critical"]).default("normal"),
  dataSource: varchar("data_source", { length: 255 }),
  fetchedAt: timestamp("fetched_at").defaultNow(),
});

export type TerminalReserve = typeof terminalReserves.$inferSelect;
export type InsertTerminalReserve = typeof terminalReserves.$inferInsert;

export const futuresData = mysqlTable("futures_data", {
  id: int("id").autoincrement().primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  symbol: varchar("symbol", { length: 30 }).notNull(),
  name: varchar("name", { length: 150 }),
  category: mysqlEnum("category", ["lng_benchmark", "crude_oil", "india_gas_stock", "macro"]).notNull(),
  price: float("price"),
  currency: varchar("currency", { length: 10 }),
  exchange: varchar("exchange", { length: 50 }),
  changePercent: float("change_percent"),
  prevClose: float("prev_close"),
  rsi14: float("rsi_14"),
  macd: float("macd"),
  macdSignal: float("macd_signal"),
  macdHistogram: float("macd_histogram"),
  sma20: float("sma_20"),
  sma50: float("sma_50"),
  bollingerUpper: float("bollinger_upper"),
  bollingerMid: float("bollinger_mid"),
  bollingerLower: float("bollinger_lower"),
  technicalSignal: mysqlEnum("technical_signal", ["strong_buy", "buy", "neutral", "sell", "strong_sell"]).default("neutral"),
  volume: float("volume"),
  fetchedAt: timestamp("fetched_at").defaultNow(),
});

export type FuturesData = typeof futuresData.$inferSelect;
export type InsertFuturesData = typeof futuresData.$inferInsert;

export const priceHistory = mysqlTable("price_history", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 30 }).notNull(),
  date: timestamp("date").notNull(),
  open: float("open"),
  high: float("high"),
  low: float("low"),
  close: float("close"),
  volume: float("volume"),
  adjClose: float("adj_close"),
});

export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = typeof priceHistory.$inferInsert;

export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).notNull(),
  category: mysqlEnum("category", ["supply", "price", "shipping", "reserve", "futures", "geopolitical"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  metric: varchar("metric", { length: 100 }),
  triggerValue: float("trigger_value"),
  thresholdValue: float("threshold_value"),
  source: varchar("source", { length: 255 }),
  notificationSent: boolean("notification_sent").default(false),
  notificationChannel: varchar("notification_channel", { length: 50 }),
  resolvedAt: timestamp("resolved_at"),
  isActive: boolean("is_active").default(true),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

export const geopoliticalEvents = mysqlTable("geopolitical_events", {
  id: int("id").autoincrement().primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  summary: text("summary"),
  region: varchar("region", { length: 100 }),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium"),
  source: varchar("source", { length: 255 }),
  sourceUrl: varchar("source_url", { length: 1000 }),
  impactOnLng: text("impact_on_lng"),
  isActive: boolean("is_active").default(true),
  fetchedAt: timestamp("fetched_at").defaultNow(),
});

export type GeopoliticalEvent = typeof geopoliticalEvents.$inferSelect;
export type InsertGeopoliticalEvent = typeof geopoliticalEvents.$inferInsert;
