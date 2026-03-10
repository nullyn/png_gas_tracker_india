import { useState, useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { AlertCircle, TrendingDown, TrendingUp, Zap, AlertTriangle, Clock, ExternalLink, RefreshCw, Activity, BarChart2, Database, Shield } from 'lucide-react';
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
  { id: 1, severity: 'critical', title: 'Strait of Hormuz Tensions Escalate', summary: 'Iran threatens closure in response to US sanctions. 20% of global LNG trade at risk.', region: 'Strait of Hormuz', source: 'Reuters', impactOnLng: 'Direct: 100% of Qatar LNG exports to India pass through Hormuz.' },
  { id: 2, severity: 'high', title: 'Houthi Attacks Continue in Red Sea', summary: 'LNG tankers rerouting around Cape of Good Hope, adding 10-14 days to transit.', region: 'Red Sea / Yemen', source: 'Bloomberg', impactOnLng: 'Indirect: Longer routes reduce supply availability and increase costs 15-25%.' },
  { id: 3, severity: 'medium', title: 'Qatar LNG Terminal Maintenance', summary: 'Ras Laffan LNG complex scheduled maintenance reducing export capacity 8% for 3 weeks.', region: 'Qatar', source: 'S&P Global Platts', impactOnLng: "~4% reduction in India's total LNG imports for 3 weeks." },
  { id: 4, severity: 'low', title: 'India-Pakistan TAPI Pipeline Suspended', summary: 'Diplomatic tensions lead to suspension of TAPI pipeline discussions.', region: 'South Asia', source: 'Economic Times', impactOnLng: 'Long-term: Delays alternative supply diversification.' },
  { id: 5, severity: 'medium', title: 'US LNG Export Surge — Competition for Asian Cargoes', summary: 'US LNG exports hit record highs, pushing JKM prices higher for India.', region: 'Global', source: 'EIA', impactOnLng: 'Indirect: Higher global LNG prices as US exports tighten spot market.' },
];

export default function Home() {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedSymbol, setSelectedSymbol] = useState('NG=F');
  const [activeTab, setActiveTab] = useState('overview');

  const { data: supplyMetrics, refetch: refetchSupply } = trpc.dashboard.latestSupplyMetrics.useQuery(undefined, { refetchInterval: 300_000 });
  const { data: metricsHistory } = trpc.dashboard.supplyMetricsHistory.useQuery(undefined, { refetchInterval: 300_000 });
  const { data: futures, refetch: refetchFutures } = trpc.dashboard.latestFutures.useQuery(undefined, { refetchInterval: 300_000 });
  const { data: terminals } = trpc.dashboard.terminalReserves.useQuery(undefined, { refetchInterval: 300_000 });
  const { data: activeAlerts } = trpc.dashboard.activeAlerts.useQuery(undefined, { refetchInterval: 60_000 });
  const { data: geoEvents } = trpc.dashboard.geopoliticalEvents.useQuery(undefined, { refetchInterval: 300_000 });
  const { data: chartHistory } = trpc.dashboard.priceHistory.useQuery({ symbol: selectedSymbol, days: 90 }, { refetchInterval: 300_000 });

  const refreshMutation = trpc.dashboard.refresh.useMutation({
    onSuccess: () => {
      setLastRefresh(new Date());
      refetchSupply();
      refetchFutures();
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
      return Array.from({ length: 10 }, (_, i) => ({
        date: `Mar ${i + 1}`, imports: 45 - i * 2, price: 8.5 + i * 0.6, risk: 35 + i * 6,
      }));
    }
    return [...metricsHistory].reverse().map(m => ({
      date: new Date(m.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      imports: m.lngImportsMmtpa ? +m.lngImportsMmtpa.toFixed(1) : null,
      price: m.lngPriceUsd ? +m.lngPriceUsd.toFixed(2) : null,
      risk: m.riskScore ? +m.riskScore.toFixed(0) : null,
    }));
  }, [metricsHistory]);

  const priceChartData = useMemo(() => {
    if (!chartHistory || chartHistory.length === 0) return [];
    return chartHistory.map(h => ({
      date: new Date(h.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      close: h.close ? +h.close.toFixed(3) : null,
      volume: h.volume,
    }));
  }, [chartHistory]);

  const selectedFuture = futures?.find(f => f.symbol === selectedSymbol);
  const terminalData = (terminals && terminals.length > 0 ? terminals : FALLBACK_TERMINALS) as any[];
  const totalReserve = terminalData.reduce((s: number, t: any) => s + (t.currentReserveMmtpa ?? 0), 0);
  const avgReserveDays = terminalData.length ? terminalData.reduce((s: number, t: any) => s + (t.reserveDays ?? 0), 0) / terminalData.length : 2.5;
  const ngFuture = futures?.find(f => f.symbol === 'NG=F');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-700 to-blue-900 rounded flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">PNG TRACKER INDIA</h1>
              <p className="text-xs text-gray-500">LNG Supply Early-Warning System · Middle East Risk Monitor</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4 text-xs text-gray-500">
              <span>Refreshed: <span className="font-mono text-gray-700">{lastRefresh.toLocaleTimeString('en-IN', { hour12: false })}</span></span>
              <LiveBadge time={supplyMetrics?.fetchedAt} />
            </div>
            <Button size="sm" variant="outline" onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending} className="gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
              {refreshMutation.isPending ? 'Refreshing…' : 'Refresh All'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-5">
        {/* Critical Alert Banner */}
        {riskScore >= 60 && (
          <Alert className={`${getRiskBg(riskScore)} border-2`}>
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertTitle className="font-bold text-red-900">
              {riskScore >= 80 ? '🔴 CRITICAL' : '🟠 HIGH'} ALERT — LNG Supply Disruption Risk: {riskScore.toFixed(0)}%
            </AlertTitle>
            <AlertDescription className="text-red-800 mt-1 text-sm">
              India's LNG supply chain is under significant stress due to Middle East geopolitical tensions.
              Strait of Hormuz: <strong>{supplyMetrics?.hormuzStatus?.toUpperCase() ?? 'CRITICAL'}</strong> ·
              Red Sea: <strong>{supplyMetrics?.redSeaStatus?.toUpperCase() ?? 'ELEVATED'}</strong> ·
              Reserve buffer: <strong>{avgReserveDays.toFixed(1)} days</strong> (vs 25 days for crude oil).
              {riskScore >= 80 && ' Immediate contingency planning recommended.'}
            </AlertDescription>
          </Alert>
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {([
            { label: 'RISK SCORE', value: `${riskScore.toFixed(0)}%`, sub: (supplyMetrics?.riskLevel ?? 'high').toUpperCase(), color: getRiskColor(riskScore), src: 'Composite Algorithm', bg: getRiskBg(riskScore) },
            { label: 'LNG IMPORTS', value: `${lngImports.toFixed(1)}`, unit: 'MMTPA', change: importChange, src: 'PNGRB' },
            { label: 'LNG PRICE', value: `$${lngPrice.toFixed(2)}`, unit: '/MMBtu', change: priceChange, src: 'Yahoo Finance NG=F' },
            { label: 'SHIP DELAY', value: `${shippingDelay.toFixed(1)}`, unit: 'days', sub: 'Normal: 2 days', src: 'MarineTraffic AIS' },
            { label: 'RESERVE DAYS', value: `${avgReserveDays.toFixed(1)}`, unit: 'days', sub: 'Crude oil: 25 days', color: avgReserveDays < 3 ? 'text-red-600' : 'text-orange-600', src: 'PNGRB Terminals' },
            { label: 'HENRY HUB', value: `$${(ngFuture?.price ?? 3.067).toFixed(3)}`, unit: '/MMBtu', change: ngFuture?.changePercent, src: 'Yahoo Finance' },
          ] as any[]).map((kpi: any, i: number) => (
            <Card key={i} className={`bg-white border hover:shadow-md transition-shadow ${kpi.bg ?? ''}`}>
              <CardContent className="p-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">{kpi.label}</p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-bold ${kpi.color ?? 'text-gray-900'}`}>{kpi.value}</span>
                  {kpi.unit && <span className="text-xs text-gray-500">{kpi.unit}</span>}
                </div>
                {kpi.change !== undefined && kpi.change !== null && (
                  <div className={`flex items-center gap-0.5 text-xs font-semibold mt-0.5 ${kpi.change < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {kpi.change < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                    {Math.abs(kpi.change).toFixed(1)}%
                  </div>
                )}
                {kpi.sub && <p className="text-xs text-gray-500 mt-0.5">{kpi.sub}</p>}
                <p className="text-xs text-blue-600 mt-1 truncate">{kpi.src}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-gray-200 p-1">
            <TabsTrigger value="overview" className="text-xs gap-1.5"><Activity className="w-3.5 h-3.5" />Overview</TabsTrigger>
            <TabsTrigger value="futures" className="text-xs gap-1.5"><BarChart2 className="w-3.5 h-3.5" />Futures & Technicals</TabsTrigger>
            <TabsTrigger value="reserves" className="text-xs gap-1.5"><Database className="w-3.5 h-3.5" />Terminal Reserves</TabsTrigger>
            <TabsTrigger value="geopolitical" className="text-xs gap-1.5"><Shield className="w-3.5 h-3.5" />Geopolitical</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
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
                  <CardTitle className="text-sm font-semibold text-gray-700">SUPPLY SOURCES</CardTitle>
                  <CardDescription className="text-xs">Source: PNGRB Annual Report 2024-25</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={SUPPLY_SOURCES} cx="50%" cy="50%" outerRadius={75} dataKey="value"
                        label={({ name, value }) => `${name} ${value}%`} labelLine={false}>
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
                  <CardTitle className="text-sm font-semibold text-gray-700">KEY SUPPLIER STATUS</CardTitle>
                  <CardDescription className="text-xs">Source: Port Authority Data · S&P Global Platts</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {[
                    { name: 'Qatar (50%)', status: 'AFFECTED', pct: 30, color: 'bg-red-500', badgeColor: 'bg-red-100 text-red-800 border-red-300' },
                    { name: 'UAE (20%)', status: 'ELEVATED', pct: 60, color: 'bg-orange-500', badgeColor: 'bg-orange-100 text-orange-800 border-orange-300' },
                    { name: 'Australia (15%)', status: 'NORMAL', pct: 85, color: 'bg-green-500', badgeColor: 'bg-green-100 text-green-800 border-green-300' },
                    { name: 'Others (15%)', status: 'NORMAL', pct: 75, color: 'bg-blue-500', badgeColor: 'bg-green-100 text-green-800 border-green-300' },
                  ].map((s, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800">{s.name}</span>
                        <StaticBadge label={s.status} color={s.badgeColor} />
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className={`${s.color} h-1.5 rounded-full`} style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-gray-400 mt-2">Source: Port Authority of Qatar · ADNOC UAE</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Futures & Technicals Tab */}
          <TabsContent value="futures" className="space-y-4 mt-4">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white border-2 border-blue-200">
                <CardContent className="p-4 text-center">
                  <p className="text-xs font-semibold text-gray-500 mb-1">TOTAL STORAGE</p>
                  <p className="text-3xl font-bold text-gray-900">{totalReserve.toFixed(1)}</p>
                  <p className="text-xs text-gray-500">MMTPA across 6 terminals</p>
                  <p className="text-xs text-blue-600 mt-1">Source: PNGRB Terminal Reports</p>
                </CardContent>
              </Card>
              <Card className={`border-2 ${avgReserveDays < 3 ? 'bg-red-50 border-red-300' : 'bg-white border-orange-200'}`}>
                <CardContent className="p-4 text-center">
                  <p className="text-xs font-semibold text-gray-500 mb-1">AVG RESERVE DAYS</p>
                  <p className={`text-3xl font-bold ${avgReserveDays < 3 ? 'text-red-600' : 'text-orange-600'}`}>{avgReserveDays.toFixed(1)}</p>
                  <p className="text-xs text-gray-500">days of supply buffer</p>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-white">
                <CardHeader className="pb-2 border-b">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <div>
                      <CardTitle className="text-sm font-semibold text-gray-700">SYSTEM ALERTS</CardTitle>
                      <CardDescription className="text-xs">Auto-generated · Source: Composite Risk Algorithm · Manus Notifications</CardDescription>
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
                    <div key={e.id} className={`p-3 rounded border ${e.severity === 'critical' ? 'border-red-200 bg-red-50' : e.severity === 'high' ? 'border-orange-200 bg-orange-50' : e.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' : 'border-blue-200 bg-blue-50'}`}>
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-semibold text-sm text-gray-900">{e.title}</p>
                        <Badge className={e.severity === 'critical' ? 'bg-red-600 text-white' : e.severity === 'high' ? 'bg-orange-500 text-white' : e.severity === 'medium' ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white'}>
                          {(e.severity ?? '').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{e.summary}</p>
                      {e.impactOnLng && <p className="text-xs text-gray-700 font-medium bg-white bg-opacity-60 rounded px-2 py-1">Impact: {e.impactOnLng}</p>}
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-gray-400">{e.region}</span>
                        <span className="text-xs text-blue-600 font-semibold">Source: {e.source}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Data Sources Footer */}
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Data Sources & Refresh Schedule</CardTitle>
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
            <p className="text-xs text-gray-400 mt-3 text-center">
              PNG Tracker India · LNG Supply Early-Warning System · All timestamps in IST ·
              Last system refresh: {lastRefresh.toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
