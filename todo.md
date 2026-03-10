# PNG Tracker India - TODO

## Completed
- [x] Basic dashboard layout (Bloomberg-style)
- [x] LNG import metrics with data source attribution
- [x] LNG price tracking
- [x] Shipping delay monitoring
- [x] Risk score composite indicator
- [x] Geopolitical alerts panel
- [x] Supply source distribution chart
- [x] Shipping route status (Hormuz, Red Sea)
- [x] Terminal storage reserves tracking
- [x] Terminal utilization bar chart
- [x] Reserve days comparison (LNG vs crude oil)
- [x] Data sources reference section with last fetch timestamps
- [x] Auto-refresh with live status indicators
- [x] Reserve analysis document
- [x] Backend feature upgrade (db, server, user)
- [x] Research futures markets and technical indicators for LNG
- [x] Database schema for metrics, reserves, futures, alerts, price history
- [x] Backend data ingestion service (Yahoo Finance API via Manus Data API)
- [x] Futures data integration: Henry Hub (NG=F), TTF, Brent, WTI, Cheniere Energy
- [x] India gas sector stocks: GAIL, Petronet, Gujarat Gas, MGL, IGL, ATGL, GSPL, ONGC, IOC
- [x] Macro indicators: Gold (GC=F), USD Index (DX-Y.NYB)
- [x] Technical indicators: RSI(14), MACD(12,26,9), SMA(20,50), Bollinger Bands(20,2)
- [x] Technical signal classification (strong_buy, buy, neutral, sell, strong_sell)
- [x] Futures & Technicals tab with interactive price chart
- [x] Bloomberg-style dashboard with 4 tabs (Overview, Futures, Reserves, Geopolitical)
- [x] Historical price chart with Bollinger Bands and SMA reference lines
- [x] Composite risk score algorithm (price 25% + geopolitical 35% + shipping 20% + Brent 20%)
- [x] Owner notification via Manus built-in notification API
- [x] Alert system with severity levels (critical, high, medium, low)
- [x] tRPC API layer wiring frontend to live database data
- [x] Vitest unit tests (17 tests passing)

## Pending
- [ ] Email alerts via SendGrid (free tier) for critical risk events
- [ ] Historical trend charts with more than 1 day of data (accumulates over time)
- [ ] News feed scraper for geopolitical events (currently using curated static data)
- [ ] PNGRB official data scraper for actual import volumes

## UI Improvements (Round 2)
- [ ] Improve app icon — replace dull icon with a vivid flame/gas-themed SVG
- [ ] Clarify key supplier status bars — label what the bar length represents (current supply capacity %)
- [ ] Fix supply sources pie chart being cut from top — add proper padding/overflow
- [ ] Add last-updated source + date+time to every metric card
- [ ] Rename app from "PNG Tracker India" to "PNG Gas Tracker India"
- [ ] Add GitHub logo in footer linking to the repository

## SEO Fixes
- [x] Add meta description (155 chars, within 50-160 limit)
- [x] Add meta keywords (14 relevant terms: PNG gas India, LNG supply, PNGRB, JKM, etc.)
- [x] Add H1 (sr-only) for crawlers
- [x] Add H2 headings to all 4 tab sections (sr-only)
- [x] Add visible H2 to Data Sources footer
- [x] Add Open Graph and Twitter Card meta tags
- [x] Update page title to "PNG Gas Tracker India — LNG Supply Early-Warning System"

## SEO Enhancements (Round 2)
- [x] Add canonical URL tag in index.html
- [x] Add sitemap.xml in client/public/
- [x] Add robots.txt in client/public/
- [x] Add JSON-LD structured data (WebApplication + Dataset schema) in index.html
- [ ] Commit all changes to Git (pending checkpoint)
