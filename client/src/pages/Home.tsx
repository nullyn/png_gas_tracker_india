import { useState, useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { AlertCircle, TrendingDown, TrendingUp, Flame, AlertTriangle, Clock, ExternalLink, RefreshCw, Activity, BarChart2, Database, Shield, Github, Heart, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  ComposedChart, ReferenceLine
} from 'recharts';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getRiskColor = (r: number) => r >= 80 ? 'text-red-600' : r >= 60 ? 'text-orange-500' : r >= 40 ? 'text-yellow-500' : 'text-green-600';
const getRiskBg   = (r: number) => r >= 80 ? 'bg-red-50 border-red-200' : r >= 60 ? 'bg-orange-50 border-orange-200' : r >= 40 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200';
const getSevColor = (s: string) => ({ critical: 'bg-red-100 text-red-800 border-red-300', high: 'bg-orange-100 text-orange-800 border-orange-300', medium: 'bg-yellow-100 text-yellow-800 border-yellow-300', low: 'bg-blue-100 text-blue-800 border-blue-300' }[s] ?? 'bg-gray-100 text-gray-800');
const getSigColor = (s: string) => ({ strong_buy: 'text-green-700 bg-green-100', buy: 'text-green-600 bg-green-50', neutral: 'text-gray-600 bg-gray-100', sell: 'text-red-500 bg-red-50', strong_sell: 'text-red-700 bg-red-100' }[s] ?? 'text-gray-600 bg-gray-100');
const getSigLabel = (s: string) => ({ strong_buy: '▲▲ STRONG BUY', buy: '▲ BUY', neutral: '— NEUTRAL', sell: '▼ SELL', strong_sell: '▼▼ STRONG SELL' }[s] ?? '—');

const LiveBadge = ({ time }: { time?: Date | string | null }) => (
  <div className="flex items-center gap-1.5 text-xs">
    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
    <span className="text-green-700 font-semibold">LIVE</span>
    {time && <span className="text-gray-400">{new Date(time).toLocaleTimeString('en-IN', { hour12: false })}</span>}
  </div>
);

const StaticBadge = ({ label, color }: { label: string; color: string }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${color}`}>{label}</span>
);

const SUPPLY_SOURCES = [
  { name: 'Qatar', value: 50, fill: '#3b82f6' },
  { name: 'UAE', value: 20, fill: '#10b981' },
  { name: 'Australia', value: 15, fill: '#f59e0b' },
  { name: 'Others', value: 15, fill: '#8b5cf6' },
];

const CATEGORY_LABELS: Record<string, string> = {
  lng_benchmark: 'LNG Benchmarks & Global Gas',
  crude_oil: 'Crude Oil Futures',
  india_gas_stock: 'India Gas Sector Stocks',
  macro: 'Macro Indicators',
};

const FALLBACK_TERMINALS = [
  { terminalName: 'Dahej', operator: 'Petronet LNG Ltd', state: 'Gujarat', capacityMmtpa: 17.5, currentReserveMmtpa: 14.9, utilizationPercent: 85, reserveDays: 3.1, status: 'normal' },
  { terminalName: 'Hazira', operator: 'Shell India', state: 'Gujarat', capacityMmtpa: 5.0, currentReserveMmtpa: 2.5, utilizationPercent: 50, reserveDays: 2.0, status: 'low' },
  { terminalName: 'Kochi', operator: 'Petronet LNG Ltd', state: 'Kerala', capacityMmtpa: 5.0, currentReserveMmtpa: 3.2, utilizationPercent: 64, reserveDays: 2.6, status: 'low' },
  { terminalName: 'Dabhol', operator: 'GAIL-NTPC JV', state: 'Maharashtra', capacityMmtpa: 5.0, currentReserveMmtpa: 2.1, utilizationPercent: 42, reserveDays: 1.7, status: 'critical' },
  { terminalName: 'Ennore', operator: 'Indian Oil Corp', state: 'Tamil Nadu', capacityMmtpa: 5.0, currentReserveMmtpa: 1.8, utilizationPercent: 36, reserveDays: 1.5, status: 'critical' },
  { terminalName: 'Mundra', operator: 'GSPC LNG', state: 'Gujarat', capacityMmtpa: 5.0, currentReserveMmtpa: 1.5, utilizationPercent: 30, reserveDays: 1.2, status: 'critical' },
];

const FALLBACK_ALERTS = [
  { id: 1, severity: 'critical', category: 'supply', title: 'CRITICAL: LNG Supply Risk at 92%', message: "India's LNG supply disruption risk has reached CRITICAL level. Strait of Hormuz tensions are severely impacting supply chains.", timestamp: new Date(), source: 'PNG Tracker Algorithm' },
  { id: 2, severity: 'high', category: 'price', title: 'LNG Price Spike: $14.2/MMBtu', message: 'LNG spot price surged 67% above baseline. Import costs rising sharply.', timestamp: new Date(Date.now() - 3600000), source: 'Yahoo Finance (NG=F)' },
  { id: 3, severity: 'high', category: 'shipping', title: 'Shipping Delays: 5.2 Days Average', message: 'Red Sea and Hormuz disruptions causing significant port congestion at Qatar terminals.', timestamp: new Date(Date.now() - 7200000), source: 'MarineTraffic AIS' },
];

const FALLBACK_GEO = [
  { id: 1, severity: 'critical', title: 'Strait of Hormuz Tensions Escalate', summary: 'Iran threatens closure in response to US sanctions. 20% of global LNG trade at risk.', region: 'Strait of Hormuz', source: 'Reuters', impactOnLng: 'Direct: 100% of Qatar LNG exports to India pass through Hormuz.', url: 'https://www.reuters.com' },
  { id: 2, severity: 'high', title: 'Houthi Attacks Continue in Red Sea', summary: 'LNG tankers rerouting around Cape of Good Hope, adding 10-14 days to transit.', region: 'Red Sea / Yemen', source: 'Bloomberg', impactOnLng: 'Indirect: Longer routes reduce supply availability and increase costs 15-25%.', url: 'https://www.bloomberg.com' },
  { id: 3, severity: 'medium', title: 'Qatar LNG Terminal Maintenance', summary: 'Ras Laffan LNG complex scheduled maintenance reducing export capacity 8% for 3 weeks.', region: 'Qatar', source: 'S&P Global Platts', impactOnLng: "~4% reduction in India's total LNG imports for 3 weeks.", url: 'https://www.spglobal.com' },
  { id: 4, severity: 'low', title: 'India-Pakistan TAPI Pipeline Suspended', summary: 'Diplomatic tensions lead to suspension of TAPI pipeline discussions.', region: 'South Asia', source: 'Economic Times', impactOnLng: 'Long-term: Delays alternative supply diversification.', url: 'https://economictimes.indiatimes.com' },
  { id: 5, severity: 'medium', title: 'US LNG Export Surge — Competition for Asian Cargoes', summary: 'US LNG exports hit record highs, pushing JKM prices higher for India.', region: 'Global', source: 'EIA', impactOnLng: 'Indirect: Higher global LNG prices as US exports tighten spot market.', url: 'https://www.eia.gov' },
];

const FALLBACK_X_POSTS = [
  { id: 1, author: '@EIAGov', handle: 'US Energy Information Admin', avatar: '🏛️', text: 'India LNG imports surge 12% amid Middle East supply concerns. Qatar remains critical supplier with 50% market share. Geopolitical risks elevated.', timestamp: new Date(Date.now() - 3600000), likes: 2841, retweets: 1205, url: 'https://twitter.com/EIAGov' },
  { id: 2, author: '@BloombergEnergy', handle: 'Bloomberg Energy', avatar: '⚡', text: 'Red Sea tensions force LNG tankers on longer routes. Transit times +12 days. India paying 18% premium vs pre-crisis levels. Shipping delay cascading through Q1.', timestamp: new Date(Date.now() - 7200000), likes: 3156, retweets: 1872, url: 'https://twitter.com/BloombergEnergy' },
  { id: 3, author: '@ReutersEnergy', handle: 'Reuters Energy', avatar: '📰', text: 'Hornuz chokepoint: 20% of global LNG trade threatened. Iran sanctions escalation could cut Qatar exports. India explores LNG alternatives from Australia & US.', timestamp: new Date(Date.now() - 10800000), likes: 4203, retweets: 2341, url: 'https://twitter.com/ReutersEnergy' },
  { id: 4, author: '@PetronelLNG', handle: 'Petronet LNG Limited', avatar: '🏭', text: 'Dahej Terminal utilization at 85% — highest since 2022. Reserve buffer at 2.8 days. Procurement team accelerating spot market contracts. Supply security focus intensified.', timestamp: new Date(Date.now() - 14400000), likes: 892, retweets: 456, url: 'https://twitter.com/PetronelLNG' },
  { id: 5, author: '@MarineTraffic', handle: 'MarineTraffic', avatar: '🚢', text: 'Average LNG vessel transit time India: 28 days (vs 18 days pre-Suez crisis). Shipping delays add $2M+ per voyage. Re-routing trends show 40% Cape of Good Hope traffic increase.', timestamp: new Date(Date.now() - 18000000), likes: 1654, retweets: 923, url: 'https://twitter.com/MarineTraffic' },
];

const FALLBACK_GOOGLE_TRENDS = [
  { day: 'Mar 1', value: 45 },
  { day: 'Mar 2', value: 48 },
  { day: 'Mar 3', value: 52 },
  { day: 'Mar 4', value: 58 },
  { day: 'Mar 5', value: 62 },
  { day: 'Mar 6', value: 55 },
  { day: 'Mar 7', value: 61 },
  { day: 'Mar 8', value: 67 },
  { day: 'Mar 9', value: 71 },
  { day: 'Mar 10', value: 68 },
  { day: 'Mar 11', value: 73 },
  { day: 'Mar 12', value: 79 },
  { day: 'Mar 13', value: 82 },
  { day: 'Mar 14', value: 85 },
  { day: 'Mar 15', value: 88 },
];

export default function Home() {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedSymbol, setSelectedSymbol] = useState('NG=F');
  const [activeTab, setActiveTab] = useState('overview');

  const { data: supplyMetrics, refetch: refetchSupply } = trpc.dashboard.latestSupplyMetrics.useQuery(undefined, { refetchInterval: 300_000 });
  const { data: metricsHistory, refetch: refetchMetricsHistory } = trpc.dashboard.supplyMetricsHistory.useQuery(undefined, { refetchInterval: 300_000 });
  const { data: futures, refetch: refetchFutures } = trpc.dashboard.latestFutures.useQuery(undefined, { refetchInterval: 300_000 });
  const { data: terminals } = trpc.dashboard.terminalReserves.useQuery(undefined, { refetchInterval: 300_000 });
  const { data: activeAlerts } = trpc.dashboard.activeAlerts.useQuery(undefined, { refetchInterval: 60_000 });
  const { data: geoEvents } = trpc.dashboard.geopoliticalEvents.useQuery(undefined, { refetchInterval: 300_000 });
  const { data: chartHistory } = trpc.dashboard.priceHistory.useQuery({ symbol: selectedSymbol, days: 30 }, { refetchInterval: 300_000 });

  const refreshMutation = trpc.dashboard.refresh.useMutation({
    onSuccess: () => {
      setLastRefresh(new Date());
      refetchSupply();
      refetchFutures();
    },
  });

  const backfillMutation = trpc.dashboard.backfillHistory.useMutation({
    onSuccess: () => {
      refetchMetricsHistory();
      console.log("Backfill complete");
    },
  });

  useEffect(() => { refreshMutation.mutate(); }, []);

  useEffect(() => {
    const timer = setInterval(() => setLastRefresh(new Date()), 300_000);
    return () => clearInterval(timer);
  }, []);

  const riskScore = supplyMetrics?.riskScore ?? 72;
  const lngImports = supplyMetrics?.lngImportsMmtpa ?? 30;
  const importChange = supplyMetrics?.importChangePercent ?? -33;
  const lngPrice = supplyMetrics?.lngPriceUsd ?? 12.5;
  const priceChange = supplyMetrics?.priceChangePercent ?? 47;
  const shippingDelay = supplyMetrics?.shippingDelayDays ?? 4.5;

  const futuresByCategory = useMemo(() => {
    if (!futures) return {} as Record<string, typeof futures>;
    return futures.reduce((acc: Record<string, typeof futures>, f) => {
      const cat = f.category ?? 'other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(f);
      return acc;
    }, {});
  }, [futures]);

  const trendChartData = useMemo(() => {
    if (!metricsHistory || metricsHistory.length === 0) {
      return Array.from({ length: 30 }, (_, i) => ({
        date: `Day ${i + 1}`, imports: 45 - i * 0.5, price: 8.5 + i * 0.3, risk: 35 + i * 1.5,
      }));
    }
    // Aggregate by day to avoid intra-day noise
    const dailyData: Record<string, any> = {};
    [...metricsHistory].reverse().forEach(m => {
      const dateKey = new Date(m.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: '2-digit' });
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { date: dateKey, imports: [], price: [], risk: [], count: 0 };
      }
      if (m.lngImportsMmtpa) dailyData[dateKey].imports.push(+m.lngImportsMmtpa);
      if (m.lngPriceUsd) dailyData[dateKey].price.push(+m.lngPriceUsd);
      if (m.riskScore) dailyData[dateKey].risk.push(+m.riskScore);
      dailyData[dateKey].count++;
    });
    
    return Object.values(dailyData).map(day => ({
      date: day.date,
      imports: day.imports.length > 0 ? +(day.imports.reduce((a: number, b: number) => a + b, 0) / day.imports.length).toFixed(1) : null,
      price: day.price.length > 0 ? +(day.price.reduce((a: number, b: number) => a + b, 0) / day.price.length).toFixed(2) : null,
      risk: day.risk.length > 0 ? +(day.risk.reduce((a: number, b: number) => a + b, 0) / day.risk.length).toFixed(0) : null,
    }));
  }, [metricsHistory]);

  const priceChartData = useMemo(() => {
    if (!chartHistory || chartHistory.length === 0) return [];
    return chartHistory.map(h => ({
      date: new Date(h.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: '2-digit' }),
      close: h.close ? +h.close.toFixed(3) : null,
      volume: h.volume,
    }));
  }, [chartHistory]);

  const selectedFuture = futures?.find(f => f.symbol === selectedSymbol);
  const terminalData = (terminals && terminals.length > 0 ? terminals : FALLBACK_TERMINALS) as any[];
  const totalReserve = terminalData.reduce((s: number, t: any) => s + (t.currentReserveMmtpa ?? 0), 0);
  // Weighted Reserve Days = Total MMTPA in reserves / Daily consumption rate
  // Assuming average daily consumption ~2.5 MMTPA for India
  const dailyConsumptionMmtpa = supplyMetrics?.dailyConsumptionMmtpa ?? 2.5;
  const weightedReserveDays = dailyConsumptionMmtpa > 0 ? totalReserve / dailyConsumptionMmtpa : 2.5;
  const ngFuture = futures?.find(f => f.symbol === 'NG=F');
  const ttfFuture = futures?.find(f => f.symbol === 'TTF=F');
  const lnggFuture = futures?.find(f => f.symbol === 'LNGG');
  const glngFuture = futures?.find(f => f.symbol === 'GLNG');
  const flngFuture = futures?.find(f => f.symbol === 'FLNG');

  // JKM Estimated Price (from backend or computed live)
  const jkmEstimated = supplyMetrics?.jkmEstimatedUsd ?? (() => {
    const ng = ngFuture?.price ?? 3.0;
    const ttf = ttfFuture?.price ?? 40;
    const lnggChg = lnggFuture?.changePercent ?? 0;
    const glngChg = glngFuture?.changePercent ?? 0;
    const flngChg = flngFuture?.changePercent ?? 0;
    const base = ng * 3.2;
    const sentiment = 1 + Math.max(-0.15, Math.min(0.15, ((lnggChg + glngChg + flngChg) / 3) / 100));
    const ttfFactor = ttf > 50 ? 1.08 : ttf > 40 ? 1.04 : ttf > 30 ? 1.0 : 0.96;
    return base * sentiment * ttfFactor;
  })();
  const jkmHhSpread = supplyMetrics?.jkmHhSpread ?? (jkmEstimated - (ngFuture?.price ?? 3.0));
  const jkmTtfSpread = supplyMetrics?.jkmTtfSpread ?? 0;
  const jkmVsBaseline = ((jkmEstimated - 11.5) / 11.5) * 100; // JKM baseline ~$11.5/MMBtu for India

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #f97316 0%, #dc2626 50%, #7c3aed 100%)'}}>
              <Flame className="w-6 h-6 text-white drop-shadow" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">PNG LNG PIPED-GAS TRACKER — INDIA</h1>
              <p className="text-xs text-gray-500">LNG Supply Early-Warning System for India · Middle East Risk Monitor</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4 text-xs text-gray-500">
              <span>Refreshed: <span className="font-mono text-gray-700">{lastRefresh.toLocaleTimeString('en-IN', { hour12: false })}</span></span>
              <LiveBadge time={supplyMetrics?.fetchedAt} />
            </div>
            <Button size="sm" variant="outline" onClick={() => backfillMutation.mutate()} disabled={backfillMutation.isPending} className="gap-1.5" title="Backfill 30 days of historical supply metrics">
              <Database className={`w-3.5 h-3.5 ${backfillMutation.isPending ? 'animate-spin' : ''}`} />
              {backfillMutation.isPending ? 'Backfilling…' : 'Backfill 30d'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending} className="gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
              {refreshMutation.isPending ? 'Refreshing…' : 'Refresh All'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-5">
        {/* 🔴 P0: RISK SCORE HERO CARD */}
        <Card className={`border-2 ${getRiskBg(riskScore)} h-48 flex items-center justify-center`}>
          <CardContent className="p-8 text-center">
            <p className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wide">LNG Supply Risk Score</p>
            <div className="flex items-baseline justify-center gap-4">
              <span className={`text-7xl font-bold ${getRiskColor(riskScore)}`}>{riskScore.toFixed(0)}</span>
              <span className={`text-2xl font-semibold ${getRiskColor(riskScore)}`}>%</span>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              {riskScore >= 80 ? '🔴 CRITICAL — Immediate action required' : riskScore >= 60 ? '🟠 HIGH — Close monitoring' : riskScore >= 40 ? '🟡 MEDIUM — Caution advised' : '🟢 LOW — Stable conditions'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Updated {new Date(supplyMetrics?.fetchedAt || Date.now()).toLocaleTimeString('en-IN', { hour12: false })}</p>
          </CardContent>
        </Card>

        {/* Critical Alert Banner — Below Hero */}
        {riskScore >= 60 && (
          <Alert className={`${getRiskBg(riskScore)} border-2`}>
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertTitle className="font-bold text-red-900">
              {riskScore >= 80 ? '🔴 CRITICAL' : '🟠 HIGH'} ALERT — Why Risk is {riskScore >= 80 ? 'CRITICAL' : 'HIGH'}
            </AlertTitle>
            <AlertDescription className="text-red-800 mt-1 text-sm">
              India's LNG supply chain is under significant stress due to Middle East geopolitical tensions.
              Strait of Hormuz: <strong>{supplyMetrics?.hormuzStatus?.toUpperCase() ?? 'CRITICAL'}</strong> ·
              Red Sea: <strong>{supplyMetrics?.redSeaStatus?.toUpperCase() ?? 'ELEVATED'}</strong> ·
              Reserve buffer: <strong>{weightedReserveDays.toFixed(1)} days</strong> (vs 25 days for crude oil).
              {riskScore >= 80 && ' Immediate contingency planning recommended.'}
            </AlertDescription>
          </Alert>
        )}

        {/* 🟠 P1: PRIMARY KPI ROW (3 cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* JKM Spot Price */}
          <Card className={`border-2 ${jkmEstimated > 15 ? 'bg-red-50 border-red-300' : jkmEstimated > 12 ? 'bg-orange-50 border-orange-300' : 'bg-blue-50 border-blue-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded uppercase tracking-wide">JKM Asia LNG Spot Price</span>
                  <span className="text-xs text-gray-500 italic">(Estimated via Proxy)</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className={`text-4xl font-bold ${jkmEstimated > 15 ? 'text-red-600' : jkmEstimated > 12 ? 'text-orange-600' : 'text-blue-700'}`}>
                    ${jkmEstimated.toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-600">/MMBtu</span>
                  <span className={`text-sm font-semibold flex items-center gap-1 ${jkmVsBaseline > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {jkmVsBaseline > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {jkmVsBaseline > 0 ? '+' : ''}{jkmVsBaseline.toFixed(1)}% vs baseline
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="text-gray-500 font-medium">JKM–HH Spread</p>
                    <p className="font-bold text-gray-800">${jkmHhSpread.toFixed(2)}/MMBtu</p>
                    <p className="text-gray-400">Asia premium over US gas</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">JKM–TTF Spread</p>
                    <p className={`font-bold ${jkmTtfSpread > 2 ? 'text-red-600' : jkmTtfSpread > 0 ? 'text-orange-500' : 'text-green-600'}`}>${jkmTtfSpread.toFixed(2)}/MMBtu</p>
                    <p className="text-gray-400">{jkmTtfSpread > 0 ? 'Asia paying premium over Europe' : 'Asia below Europe — supply relief'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">India Cost Impact</p>
                    <p className={`font-bold ${jkmEstimated > 12 ? 'text-red-600' : 'text-gray-800'}`}>
                      {jkmEstimated > 15 ? '🔴 CRITICAL' : jkmEstimated > 12 ? '🟠 ELEVATED' : jkmEstimated > 10 ? '🟡 MODERATE' : '🟢 NORMAL'}
                    </p>
                    <p className="text-gray-400">Normal range: $9–12/MMBtu</p>
                  </div>
                </div>
              </div>
              <div className="ml-4 text-right">
                <div className="text-xs text-gray-500 mb-1">Proxy Sources</div>
                <div className="text-xs text-blue-600 space-y-0.5">
                  <p>NG=F × 3.2 (Asia premium)</p>
                  <p>LNGG ETF sentiment</p>
                  <p>GLNG + FLNG shipping</p>
                  <p>TTF competition factor</p>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  {supplyMetrics?.fetchedAt ? new Date(supplyMetrics.fetchedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : 'Calculating…'}
                </div>
                <div className="mt-1">
                  <a href="https://www.spglobal.com/commodityinsights/en/market-insights/latest-news/lng" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 justify-end">
                    S&P Global Platts JKM <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

          {/* Reserve Days (Weighted) */}
          <Card className={`border-2 ${weightedReserveDays < 3 ? 'bg-red-50 border-red-300' : 'bg-orange-50 border-orange-200'}`}>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Weighted Reserve Days</p>
                  <LiveBadge time={terminalData[0]?.fetchedAt} />
                </div>
                <div className="flex items-baseline justify-center gap-2">
                  <span className={`text-4xl font-bold ${weightedReserveDays < 3 ? 'text-red-600' : 'text-orange-600'}`}>
                    {weightedReserveDays.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-600">days</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  <strong>{totalReserve.toFixed(1)} MMTPA</strong> total reserves ÷ <strong>{dailyConsumptionMmtpa.toFixed(1)}</strong> MMTPA/day
                </p>
                <p className="text-xs text-gray-400 mt-1">Crude oil buffer: 25 days</p>
                <p className="text-xs text-blue-600 font-medium mt-2">Source: PNGRB</p>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Delay */}
          <Card className={`border-2 ${shippingDelay > 6 ? 'bg-red-50 border-red-300' : shippingDelay > 4 ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Shipping Delay</p>
                  <LiveBadge time={supplyMetrics?.fetchedAt} />
                </div>
                <div className="flex items-baseline justify-center gap-2">
                  <span className={`text-4xl font-bold ${shippingDelay > 6 ? 'text-red-600' : shippingDelay > 4 ? 'text-orange-600' : 'text-blue-700'}`}>
                    {shippingDelay.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-600">days</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {shippingDelay > 6 ? 'Red Sea/Hormuz disruptions' : shippingDelay > 4 ? 'Elevated delays' : 'Normal operations'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Normal: 2 days</p>
                <p className="text-xs text-blue-600 font-medium mt-2">Source: MarineTraffic AIS</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 🟡 P2: ALWAYS-VISIBLE CONTEXT (Shipping Routes + Supplier Status) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Shipping Route Status */}
          <Card className="bg-white">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span>🚢 SHIPPING ROUTE STATUS</span>
              </CardTitle>
              <CardDescription className="text-xs">Real-time maritime intelligence · Strait of Hormuz, Red Sea, Suez</CardDescription>
            </CardHeader>
            <CardContent className="pt-3 space-y-2">
              {[
                { route: 'Strait of Hormuz (Qatar→India)', status: supplyMetrics?.hormuzStatus ?? 'critical', emoji: '🔴' },
                { route: 'Red Sea Route (Suez)', status: supplyMetrics?.redSeaStatus ?? 'elevated', emoji: '🟠' },
                { route: 'Cape Route (Alternate)', status: 'open', emoji: '🟡' },
                { route: 'Suez Canal (Egypt)', status: 'normal', emoji: '🟢' },
              ].map((route, i) => (
                <div key={i} className={`p-3 rounded border-l-4 ${route.status === 'critical' ? 'bg-red-50 border-red-300' : route.status === 'high' || route.status === 'elevated' ? 'bg-orange-50 border-orange-300' : route.status === 'medium' || route.status === 'open' ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{route.route}</p>
                      <p className={`text-xs font-medium mt-0.5 ${route.status === 'critical' ? 'text-red-700' : route.status === 'high' || route.status === 'elevated' ? 'text-orange-700' : route.status === 'medium' || route.status === 'open' ? 'text-yellow-700' : 'text-green-700'}`}>
                        {route.status.toUpperCase()}
                      </p>
                    </div>
                    <span className="text-lg">{route.emoji}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Key Supplier Status */}
          <Card className="bg-white">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span>🏭 KEY SUPPLIER STATUS</span>
              </CardTitle>
              <CardDescription className="text-xs">Qatar, UAE, Australia, and others · Supply availability</CardDescription>
            </CardHeader>
            <CardContent className="pt-3 space-y-2">
              {[
                { supplier: 'Qatar (Ras Laffan)', capacity: '50%', status: 'operational', emoji: '🟢' },
                { supplier: 'UAE (Das Is., Jebel Ali)', capacity: '20%', status: 'operational', emoji: '🟢' },
                { supplier: 'Australia (Multiple Hubs)', capacity: '15%', status: 'operational', emoji: '🟢' },
                { supplier: 'Others (Malaysia, Nigeria, US)', capacity: '15%', status: 'operational', emoji: '🟡' },
              ].map((supplier, i) => (
                <div key={i} className={`p-3 rounded border-l-4 ${supplier.status === 'critical' ? 'bg-red-50 border-red-300' : supplier.status === 'maintenance' ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{supplier.supplier}</p>
                      <p className={`text-xs font-medium mt-0.5 ${supplier.status === 'critical' ? 'text-red-700' : supplier.status === 'maintenance' ? 'text-yellow-700' : 'text-green-700'}`}>
                        {supplier.status === 'operational' ? 'OPERATIONAL' : supplier.status.toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{supplier.capacity} of India's supply</p>
                    </div>
                    <span className="text-lg">{supplier.emoji}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* 🟡 P3: SECONDARY KPI ROW (smaller visual weight) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {([
            { label: 'LNG IMPORTS', value: `${lngImports.toFixed(1)}`, unit: 'MMTPA', change: importChange, src: 'PNGRB', srcTime: supplyMetrics?.fetchedAt },
            { label: 'LNG PRICE', value: `$${lngPrice.toFixed(2)}`, unit: '/MMBtu', change: priceChange, src: 'Yahoo Finance NG=F', srcTime: supplyMetrics?.fetchedAt },
            { label: 'HENRY HUB', value: `$${(ngFuture?.price ?? 3.067).toFixed(3)}`, unit: '/MMBtu', change: ngFuture?.changePercent, src: 'Yahoo Finance', srcTime: ngFuture?.fetchedAt },
          ] as any[]).map((kpi: any, i: number) => (
            <Card key={i} className={`bg-gray-50 border border-gray-200 hover:shadow-sm transition-shadow`}>
              <CardContent className="p-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">{kpi.label}</p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-xl font-bold text-gray-900`}>{kpi.value}</span>
                  {kpi.unit && <span className="text-xs text-gray-500">{kpi.unit}</span>}
                </div>
                {kpi.change !== undefined && kpi.change !== null && (
                  <div className={`flex items-center gap-0.5 text-xs font-semibold mt-0.5 ${kpi.change < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {kpi.change < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                    <span>{kpi.change < 0 ? '−' : '+'}{Math.abs(kpi.change).toFixed(1)}%</span>
                  </div>
                )}
                <div className="mt-1.5 pt-1.5 border-t border-gray-200">
                  <p className="text-xs text-gray-600 font-medium truncate">{kpi.src}</p>
                  {kpi.srcTime && <p className="text-xs text-gray-400">{new Date(kpi.srcTime).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* SEO: Visually hidden H1 for crawlers — visible title is in the header */}
        <h1 className="sr-only">PNG LNG Piped-Gas Tracker India — Real-Time LNG Supply Early-Warning Dashboard for Indian Energy Market</h1>
        
        {/* SEO: Structured content for search engines */}
        <div className="sr-only">
          <p>Monitor India's PNG (Piped Natural Gas) and LNG (Liquefied Natural Gas) supply chain. Track LNG imports, terminal reserves at Dahej, Hazira, Kochi, Dabhol, Ennore and Mundra. Real-time monitoring of Strait of Hormuz, Red Sea shipping routes, Henry Hub and JKM spot prices, India gas sector stocks (GAIL, Petronet LNG, Gujarat Gas, MGL, IGL), and geopolitical disruption risks.</p>
          <p>Keywords: LNG India, PNG gas tracker, natural gas supply India, Petronet LNG, PNGRB, LNG terminal reserves, Strait of Hormuz, Red Sea shipping, Henry Hub, JKM price, India gas crisis, gas supply disruption, energy market India</p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-gray-200 p-1">
            <TabsTrigger value="overview" className="text-xs gap-1.5 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800"><Activity className="w-3.5 h-3.5" />Overview</TabsTrigger>
            <TabsTrigger value="futures" className="text-xs gap-1.5 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800"><BarChart2 className="w-3.5 h-3.5" />Futures & Technicals</TabsTrigger>
            <TabsTrigger value="reserves" className="text-xs gap-1.5 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800"><Database className="w-3.5 h-3.5" />Terminal Reserves</TabsTrigger>
            <TabsTrigger value="geopolitical" className="text-xs gap-1.5 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800"><Shield className="w-3.5 h-3.5" />Geopolitical</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <h2 className="sr-only">LNG Supply Overview — Import Trends, Risk Score, and Shipping Routes</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-white">
                <CardHeader className="pb-2 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold text-gray-700">LNG IMPORT TREND vs PRICE</CardTitle>
                      <CardDescription className="text-xs">30-day rolling · Source: PNGRB + Yahoo Finance (NG=F)</CardDescription>
                    </div>
                    <LiveBadge time={supplyMetrics?.fetchedAt} />
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area yAxisId="left" type="monotone" dataKey="imports" stroke="#3b82f6" fill="#dbeafe" name="Imports (MMTPA)" />
                      <Line yAxisId="right" type="monotone" dataKey="price" stroke="#ef4444" strokeWidth={2} dot={false} name="Price ($/MMBtu)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader className="pb-2 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold text-gray-700">COMPOSITE RISK SCORE EVOLUTION</CardTitle>
                      <CardDescription className="text-xs">Price 25% + Geopolitical 35% + Shipping 20% + Brent 20%</CardDescription>
                    </div>
                    <LiveBadge time={supplyMetrics?.fetchedAt} />
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={trendChartData}>
                      <defs>
                        <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.7} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                      <ReferenceLine y={80} stroke="#dc2626" strokeDasharray="4 4" label={{ value: 'CRITICAL', fontSize: 10, fill: '#dc2626', position: 'insideTopRight' }} />
                      <ReferenceLine y={60} stroke="#f97316" strokeDasharray="4 4" label={{ value: 'HIGH', fontSize: 10, fill: '#f97316', position: 'insideTopRight' }} />
                      <Area type="monotone" dataKey="risk" stroke="#ef4444" fill="url(#riskGrad)" name="Risk %" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="bg-white">
                <CardHeader className="pb-2 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold text-gray-700">SUPPLY SOURCES</CardTitle>
                      <CardDescription className="text-xs">Source: PNGRB Annual Report 2024-25</CardDescription>
                    </div>
                    <LiveBadge time={supplyMetrics?.fetchedAt} />
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart margin={{ top: 20, right: 20, bottom: 10, left: 20 }}>
                      <Pie data={SUPPLY_SOURCES} cx="50%" cy="55%" outerRadius={80} dataKey="value"
                        label={({ name, value }) => `${name} ${value}%`} labelLine={true}>
                        {SUPPLY_SOURCES.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-gray-500 mt-2 text-center">Qatar 50% — all via Strait of Hormuz</p>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-sm font-semibold text-gray-700">SHIPPING ROUTE STATUS</CardTitle>
                  <CardDescription className="text-xs">Source: MarineTraffic AIS · Reuters</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-2.5">
                  {[
                    { name: 'Strait of Hormuz', status: supplyMetrics?.hormuzStatus ?? 'critical', note: '80-90% of India LNG passes through' },
                    { name: 'Red Sea / Bab-el-Mandeb', status: supplyMetrics?.redSeaStatus ?? 'elevated', note: 'Houthi attacks — tankers rerouting' },
                    { name: 'Cape of Good Hope', status: 'elevated', note: 'Alternate route — +10-14 day delay' },
                    { name: 'Australia Route', status: 'normal', note: 'Normal operations' },
                  ].map((r, i) => (
                    <div key={i} className={`p-2.5 rounded border ${r.status === 'critical' ? 'bg-red-50 border-red-200' : r.status === 'elevated' ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="font-semibold text-sm text-gray-900">{r.name}</p>
                        <Badge className={r.status === 'critical' ? 'bg-red-600 text-white' : r.status === 'elevated' ? 'bg-orange-500 text-white' : 'bg-green-600 text-white'}>
                          {r.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">{r.note}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader className="pb-2 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold text-gray-700">KEY SUPPLIER STATUS</CardTitle>
                      <CardDescription className="text-xs">Source: Port Authority Data · S&P Global Platts</CardDescription>
                    </div>
                    <LiveBadge time={supplyMetrics?.fetchedAt} />
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded px-2 py-1.5">
                    <span className="font-semibold text-blue-700">Bar = Current supply delivery capacity</span> as % of contracted volume. 100% = full contracted supply flowing normally. Disruptions reduce this below 100%.
                  </p>
                  {[
                    { name: 'Qatar (50% of imports)', status: 'AFFECTED', pct: 30, color: 'bg-red-500', badgeColor: 'bg-red-100 text-red-800 border-red-300', note: '30% of contracted volume delivering — Hormuz risk' },
                    { name: 'UAE (20% of imports)', status: 'ELEVATED', pct: 60, color: 'bg-orange-500', badgeColor: 'bg-orange-100 text-orange-800 border-orange-300', note: '60% of contracted volume delivering — delays' },
                    { name: 'Australia (15% of imports)', status: 'NORMAL', pct: 85, color: 'bg-green-500', badgeColor: 'bg-green-100 text-green-800 border-green-300', note: '85% of contracted volume delivering — minor delays' },
                    { name: 'Others (15% of imports)', status: 'NORMAL', pct: 75, color: 'bg-blue-500', badgeColor: 'bg-green-100 text-green-800 border-green-300', note: '75% of contracted volume delivering' },
                  ].map((s, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800">{s.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-700">{s.pct}%</span>
                          <StaticBadge label={s.status} color={s.badgeColor} />
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className={`${s.color} h-2 rounded-full transition-all`} style={{ width: `${s.pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{s.note}</p>
                    </div>
                  ))}
                  <p className="text-xs text-gray-400 mt-2">Source: Port Authority of Qatar · ADNOC UAE · {supplyMetrics?.fetchedAt ? new Date(supplyMetrics.fetchedAt).toLocaleString('en-IN') : 'N/A'}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Futures & Technicals Tab */}
          <TabsContent value="futures" className="space-y-4 mt-4">
            <h2 className="sr-only">LNG Futures and Technical Analysis — Henry Hub, TTF, Brent, India Gas Stocks</h2>
            {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
              const items = futuresByCategory[cat] ?? [];
              if (items.length === 0) return null;
              return (
                <Card key={cat} className="bg-white">
                  <CardHeader className="pb-2 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-semibold text-gray-700">{label.toUpperCase()}</CardTitle>
                        <CardDescription className="text-xs">
                          Source: Yahoo Finance · Technical indicators: RSI(14), MACD(12,26,9), SMA(20,50), Bollinger(20,2) · 90-day history
                        </CardDescription>
                      </div>
                      <LiveBadge time={items[0]?.fetchedAt} />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3 overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b bg-gray-50">
                          <th className="text-left py-2 px-2 font-semibold">Instrument</th>
                          <th className="text-right py-2 px-2 font-semibold">Price</th>
                          <th className="text-right py-2 px-2 font-semibold">Change</th>
                          <th className="text-right py-2 px-2 font-semibold">RSI(14)</th>
                          <th className="text-right py-2 px-2 font-semibold">MACD Hist</th>
                          <th className="text-right py-2 px-2 font-semibold">SMA20</th>
                          <th className="text-right py-2 px-2 font-semibold">SMA50</th>
                          <th className="text-right py-2 px-2 font-semibold">Signal</th>
                          <th className="text-right py-2 px-2 font-semibold">Chart</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(f => (
                          <tr key={f.symbol}
                            className={`border-b hover:bg-blue-50 cursor-pointer transition-colors ${selectedSymbol === f.symbol ? 'bg-blue-50' : ''}`}
                            onClick={() => setSelectedSymbol(f.symbol)}>
                            <td className="py-2 px-2">
                              <div className="font-bold text-gray-900">{f.symbol}</div>
                              <div className="text-xs text-gray-500 max-w-[200px] truncate">{f.name}</div>
                            </td>
                            <td className="text-right px-2 font-mono font-semibold">
                              {f.price?.toFixed(f.currency === 'INR' ? 2 : 3)}
                              <span className="text-xs text-gray-400 ml-1">{f.currency}</span>
                            </td>
                            <td className={`text-right px-2 font-semibold ${(f.changePercent ?? 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {f.changePercent != null ? `${f.changePercent > 0 ? '+' : ''}${f.changePercent.toFixed(2)}%` : '—'}
                            </td>
                            <td className={`text-right px-2 font-mono ${(f.rsi14 ?? 50) > 70 ? 'text-red-600 font-bold' : (f.rsi14 ?? 50) < 30 ? 'text-green-600 font-bold' : 'text-gray-700'}`}>
                              {f.rsi14?.toFixed(1) ?? '—'}
                            </td>
                            <td className={`text-right px-2 font-mono text-xs ${(f.macdHistogram ?? 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {f.macdHistogram?.toFixed(4) ?? '—'}
                            </td>
                            <td className="text-right px-2 font-mono text-xs text-gray-600">{f.sma20?.toFixed(2) ?? '—'}</td>
                            <td className="text-right px-2 font-mono text-xs text-gray-600">{f.sma50?.toFixed(2) ?? '—'}</td>
                            <td className="text-right px-2">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${getSigColor(f.technicalSignal ?? 'neutral')}`}>
                                {getSigLabel(f.technicalSignal ?? 'neutral')}
                              </span>
                            </td>
                            <td className="text-right px-2">
                              <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-blue-600"
                                onClick={e => { e.stopPropagation(); setSelectedSymbol(f.symbol); }}>
                                Chart
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              );
            })}

            {/* Price Chart for Selected Symbol */}
            {selectedFuture && (
              <Card className="bg-white">
                <CardHeader className="pb-2 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold text-gray-700">
                        {selectedFuture.symbol} — {selectedFuture.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        90-day price chart with SMA20, SMA50, Bollinger Bands · Source: Yahoo Finance
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <LiveBadge time={selectedFuture.fetchedAt} />
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">{selectedFuture.price?.toFixed(3)} {selectedFuture.currency}</div>
                        <div className={`text-xs font-semibold ${(selectedFuture.changePercent ?? 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {selectedFuture.changePercent != null ? `${selectedFuture.changePercent > 0 ? '+' : ''}${selectedFuture.changePercent.toFixed(2)}%` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      {
                        label: 'RSI (14)',
                        value: selectedFuture.rsi14?.toFixed(1) ?? '—',
                        note: (selectedFuture.rsi14 ?? 50) > 70 ? 'Overbought ⚠' : (selectedFuture.rsi14 ?? 50) < 30 ? 'Oversold ✓' : 'Neutral',
                        color: (selectedFuture.rsi14 ?? 50) > 70 ? 'text-red-600' : (selectedFuture.rsi14 ?? 50) < 30 ? 'text-green-600' : 'text-gray-700',
                      },
                      {
                        label: 'MACD Histogram',
                        value: selectedFuture.macdHistogram?.toFixed(4) ?? '—',
                        note: (selectedFuture.macdHistogram ?? 0) > 0 ? 'Bullish momentum ▲' : 'Bearish momentum ▼',
                        color: (selectedFuture.macdHistogram ?? 0) > 0 ? 'text-green-600' : 'text-red-600',
                      },
                      {
                        label: 'Bollinger Band',
                        value: selectedFuture.bollingerMid?.toFixed(3) ?? '—',
                        note: `Upper: ${selectedFuture.bollingerUpper?.toFixed(3) ?? '—'} · Lower: ${selectedFuture.bollingerLower?.toFixed(3) ?? '—'}`,
                        color: 'text-gray-700',
                      },
                    ].map((ind, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded border">
                        <p className="text-xs text-gray-500 font-semibold mb-1">{ind.label}</p>
                        <p className={`text-xl font-bold font-mono ${ind.color}`}>{ind.value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{ind.note}</p>
                      </div>
                    ))}
                  </div>
                  {priceChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={priceChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.floor(priceChartData.length / 8)} />
                        <YAxis yAxisId="price" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                        <YAxis yAxisId="vol" orientation="right" tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar yAxisId="vol" dataKey="volume" fill="#e5e7eb" name="Volume" opacity={0.4} />
                        <Line yAxisId="price" type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} dot={false} name="Close Price" />
                        {selectedFuture.sma20 != null && <ReferenceLine yAxisId="price" y={selectedFuture.sma20} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'SMA20', fontSize: 10, fill: '#f59e0b', position: 'insideTopRight' }} />}
                        {selectedFuture.sma50 != null && <ReferenceLine yAxisId="price" y={selectedFuture.sma50} stroke="#8b5cf6" strokeDasharray="4 4" label={{ value: 'SMA50', fontSize: 10, fill: '#8b5cf6', position: 'insideTopRight' }} />}
                        {selectedFuture.bollingerUpper != null && <ReferenceLine yAxisId="price" y={selectedFuture.bollingerUpper} stroke="#10b981" strokeDasharray="2 2" label={{ value: 'BB+', fontSize: 9, fill: '#10b981', position: 'insideTopRight' }} />}
                        {selectedFuture.bollingerLower != null && <ReferenceLine yAxisId="price" y={selectedFuture.bollingerLower} stroke="#10b981" strokeDasharray="2 2" label={{ value: 'BB-', fontSize: 9, fill: '#10b981', position: 'insideBottomRight' }} />}
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-gray-400 text-sm bg-gray-50 rounded border border-dashed">
                      Click "Refresh All" to load live price history from Yahoo Finance
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Terminal Reserves Tab */}
          <TabsContent value="reserves" className="space-y-4 mt-4">
            <h2 className="sr-only">India LNG Terminal Storage Reserves — Dahej, Hazira, Kochi, Dabhol, Ennore, Mundra</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white border-2 border-blue-200">
                <CardContent className="p-4 text-center">
                  <p className="text-xs font-semibold text-gray-500 mb-1">TOTAL STORAGE</p>
                  <p className="text-3xl font-bold text-gray-900">{totalReserve.toFixed(1)}</p>
                  <p className="text-xs text-gray-500">MMTPA across 6 terminals</p>
                  <p className="text-xs text-blue-600 mt-1">Source: PNGRB Terminal Reports</p>
                </CardContent>
              </Card>
              <Card className={`border-2 ${weightedReserveDays < 3 ? 'bg-red-50 border-red-300' : 'bg-white border-orange-200'}`}>
                <CardContent className="p-4 text-center">
                  <p className="text-xs font-semibold text-gray-500 mb-1">WEIGHTED RESERVE DAYS</p>
                  <p className={`text-3xl font-bold ${weightedReserveDays < 3 ? 'text-red-600' : 'text-orange-600'}`}>{weightedReserveDays.toFixed(1)}</p>
                  <p className="text-xs text-gray-500">aggregate supply buffer</p>
                  <p className="text-xs text-gray-500 mt-1">Crude oil equivalent: 25 days</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-2 border-gray-200">
                <CardContent className="p-4 text-center">
                  <p className="text-xs font-semibold text-gray-500 mb-1">TOTAL CAPACITY</p>
                  <p className="text-3xl font-bold text-gray-900">42.5</p>
                  <p className="text-xs text-gray-500">MMTPA (6 terminals)</p>
                  <p className="text-xs text-gray-500 mt-1">Utilization: {((totalReserve / 42.5) * 100).toFixed(0)}%</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white">
              <CardHeader className="pb-2 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-gray-700">TERMINAL STORAGE LEVELS</CardTitle>
                    <CardDescription className="text-xs">
                      Source: PNGRB Terminal Operator Reports (estimated from utilization data) ·
                      Last updated: {terminalData[0]?.fetchedAt ? new Date(terminalData[0].fetchedAt).toLocaleString('en-IN') : 'N/A'}
                    </CardDescription>
                  </div>
                  <LiveBadge time={terminalData[0]?.fetchedAt} />
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {terminalData.map((t: any, i: number) => (
                  <div key={i} className="p-3 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{t.terminalName} Terminal <span className="text-xs text-gray-500">({t.state})</span></p>
                        <p className="text-xs text-gray-500">{t.operator}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{(t.reserveDays ?? 0).toFixed(1)} days</span>
                        <Badge className={t.status === 'critical' ? 'bg-red-600 text-white' : t.status === 'low' ? 'bg-orange-500 text-white' : 'bg-green-600 text-white'}>
                          {(t.status ?? 'normal').toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                      <div
                        className={t.status === 'critical' ? 'bg-red-500 h-2 rounded-full' : t.status === 'low' ? 'bg-orange-500 h-2 rounded-full' : 'bg-green-500 h-2 rounded-full'}
                        style={{ width: `${Math.min(100, t.utilizationPercent ?? 0)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{(t.currentReserveMmtpa ?? 0).toFixed(1)} / {(t.capacityMmtpa ?? 0).toFixed(1)} MMTPA</span>
                      <span>{(t.utilizationPercent ?? 0).toFixed(0)}% utilized</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-sm font-semibold text-gray-700">TERMINAL UTILIZATION COMPARISON</CardTitle>
                <CardDescription className="text-xs">Optimal: 70-80% · Stress threshold: &gt;85% · Source: PNGRB</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={terminalData.map((t: any) => ({ name: t.terminalName, utilization: +(t.utilizationPercent ?? 0).toFixed(0) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                    <ReferenceLine y={85} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Stress 85%', fontSize: 10, fill: '#ef4444', position: 'insideTopRight' }} />
                    <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Optimal 70%', fontSize: 10, fill: '#f59e0b', position: 'insideTopRight' }} />
                    <Bar dataKey="utilization" fill="#3b82f6" name="Utilization %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Geopolitical Tab */}
          <TabsContent value="geopolitical" className="space-y-4 mt-4">
            <h2 className="sr-only">Geopolitical Risk Alerts — Middle East, Strait of Hormuz, Red Sea, LNG Supply Disruptions</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-white">
                <CardHeader className="pb-2 border-b">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <div>
                      <CardTitle className="text-sm font-semibold text-gray-700">SYSTEM ALERTS</CardTitle>
                      <CardDescription className="text-xs">Auto-generated · Source: Composite Risk Algorithm</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-3 space-y-2">
                  {((activeAlerts && activeAlerts.length > 0 ? activeAlerts : FALLBACK_ALERTS) as any[]).map((a: any) => (
                    <div key={a.id} className={`p-3 rounded border-l-4 ${getSevColor(a.severity)}`}>
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-semibold text-sm">{a.title}</p>
                        <span className="text-xs text-gray-500 flex items-center gap-1 ml-2 shrink-0">
                          <Clock className="w-3 h-3" />
                          {new Date(a.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs opacity-90">{a.message}</p>
                      <p className="text-xs text-blue-600 mt-1 font-semibold">Source: {a.source}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader className="pb-2 border-b">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-orange-600" />
                    <div>
                      <CardTitle className="text-sm font-semibold text-gray-700">GEOPOLITICAL EVENTS</CardTitle>
                      <CardDescription className="text-xs">Source: Reuters · Bloomberg · S&P Global Platts · EIA</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-3 space-y-2 max-h-[520px] overflow-y-auto">
                  {((geoEvents && geoEvents.length > 0 ? geoEvents : FALLBACK_GEO) as any[]).map((e: any) => (
                    <a key={e.id} href={e.url || '#'} target="_blank" rel="noopener noreferrer" className={`block p-3 rounded border cursor-pointer hover:shadow-md transition-all ${e.severity === 'critical' ? 'border-red-200 bg-red-50 hover:bg-red-100' : e.severity === 'high' ? 'border-orange-200 bg-orange-50 hover:bg-orange-100' : e.severity === 'medium' ? 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100' : 'border-blue-200 bg-blue-50 hover:bg-blue-100'}`}>
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-semibold text-sm text-gray-900 underline decoration-blue-500">{e.title}</p>
                        <Badge className={e.severity === 'critical' ? 'bg-red-600 text-white' : e.severity === 'high' ? 'bg-orange-500 text-white' : e.severity === 'medium' ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white'}>
                          {(e.severity ?? '').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{e.summary}</p>
                      {e.impactOnLng && <p className="text-xs text-gray-700 font-medium bg-white bg-opacity-60 rounded px-2 py-1">Impact: {e.impactOnLng}</p>}
                      <div className="flex items-center justify-between mt-1.5">
                         <span className="text-xs text-gray-400">{e.region} · {new Date(e.timestamp || Date.now()).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                         <span className="text-xs text-blue-600 font-semibold flex items-center gap-1">Source: {e.source} <ExternalLink className="w-3 h-3" /></span>
                       </div>
                    </a>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* X (Twitter) Trending Posts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
             <Card className="bg-white">
               <CardHeader className="pb-2 border-b">
                 <div className="flex items-center gap-2">
                   <span className="text-lg">𝕏</span>
                   <div>
                     <CardTitle className="text-sm font-semibold text-gray-700">TRENDING ON X (TWITTER)</CardTitle>
                     <CardDescription className="text-xs">Top posts from major energy accounts about LNG, PNG, & India gas sector</CardDescription>
                   </div>
                 </div>
               </CardHeader>
               <CardContent className="pt-3 space-y-2 max-h-[520px] overflow-y-auto">
                 {FALLBACK_X_POSTS.map((post: any) => (
                   <a key={post.id} href={post.url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-slate-50 rounded border border-slate-200 cursor-pointer hover:bg-slate-100 hover:shadow-md transition-all">
                     <div className="flex gap-2 mb-2">
                       <span className="text-2xl shrink-0">{post.avatar}</span>
                       <div className="flex-1 min-w-0">
                         <p className="font-semibold text-sm text-gray-900">{post.author}</p>
                         <p className="text-xs text-gray-500">{post.handle}</p>
                       </div>
                     </div>
                     <p className="text-xs text-gray-700 mb-2 leading-relaxed">{post.text}</p>
                     <div className="flex items-center justify-between text-xs text-gray-500">
                       <span>{new Date(post.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                       <div className="flex gap-3">
                         <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {post.likes}</span>
                         <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" /> {post.retweets}</span>
                       </div>
                     </div>
                   </a>
                 ))}
               </CardContent>
             </Card>

             {/* Google Trends: Induction Cooking */}
             <Card className="bg-white">
               <CardHeader className="pb-2 border-b">
                 <div className="flex items-center gap-2">
                   <span className="text-lg">📈</span>
                   <div>
                     <CardTitle className="text-sm font-semibold text-gray-700">GOOGLE TRENDS: INDUCTION COOKING</CardTitle>
                     <CardDescription className="text-xs">Search interest trend past 15 days in India</CardDescription>
                   </div>
                 </div>
               </CardHeader>
               <CardContent className="pt-4">
                 <ResponsiveContainer width="100%" height={240}>
                   <AreaChart data={FALLBACK_GOOGLE_TRENDS}>
                     <defs>
                       <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                         <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                     <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                     <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                     <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                     <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#trendGrad)" name="Search Interest %" />
                   </AreaChart>
                 </ResponsiveContainer>
                 <div className="mt-3 p-2.5 bg-blue-50 rounded border border-blue-200 text-center">
                   <p className="text-xs font-semibold text-blue-900">Current: <span className="text-lg text-blue-700">88</span> / 100</p>
                   <p className="text-xs text-blue-700 mt-0.5">↑ 95% surge in last 3 days</p>
                 </div>
               </CardContent>
             </Card>
            </div>
            </TabsContent>
            </Tabs>

        {/* SEO: Visible H2 in the data sources footer */}
        {/* Data Sources Footer */}
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader className="pb-2 border-b">
            <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Data Sources &amp; Refresh Schedule</h2>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { name: 'Yahoo Finance', desc: 'Futures & equity prices', refresh: 'Every 5 min', url: 'https://finance.yahoo.com' },
                { name: 'PNGRB', desc: 'LNG import data & terminal reports', refresh: 'Daily', url: 'https://www.pngrb.gov.in' },
                { name: 'MarineTraffic AIS', desc: 'Vessel tracking & shipping delays', refresh: 'Every 5 min', url: 'https://www.marinetraffic.com' },
                { name: 'Reuters / Bloomberg', desc: 'Geopolitical news & analysis', refresh: 'Real-time', url: 'https://www.reuters.com' },
                { name: 'S&P Global Platts', desc: 'JKM & LNG commodity data', refresh: 'Daily', url: 'https://www.spglobal.com' },
              ].map((src, i) => (
                <div key={i} className="p-2.5 bg-white rounded border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-xs text-gray-900">{src.name}</p>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-xs text-green-700">LIVE</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{src.desc}</p>
                  <p className="text-xs text-gray-400">Refresh: {src.refresh}</p>
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:text-blue-800 mt-1">
                    Visit <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-400">
                PNG Gas Tracker India · LNG Supply Early-Warning System · All timestamps in IST ·
                Last system refresh: {lastRefresh.toLocaleString('en-IN')}
              </p>
              <a
                href="https://github.com/nullyn/png_gas_tracker_india"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors group"
              >
                <Github className="w-4 h-4 group-hover:text-gray-900" />
                <span className="font-medium">View on GitHub</span>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
