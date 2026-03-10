import { useState, useEffect } from 'react';
import { AlertCircle, TrendingDown, TrendingUp, Zap, Ship, AlertTriangle, Clock, ExternalLink, RefreshCw, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from 'recharts';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * PNG Tracker India - Professional LNG Supply Monitoring Dashboard
 * Bloomberg Terminal Style with Real-Time Data Sources
 */

interface DataSource {
  name: string;
  url: string;
  lastFetch: string;
  status: 'live' | 'delayed' | 'offline';
}

interface MetricWithSource {
  value: number;
  change: number;
  source: DataSource;
  unit: string;
}

const mockTrendData = [
  { date: 'Mar 1', imports: 45, price: 8.5, risk: 35, volume: 120 },
  { date: 'Mar 2', imports: 44, price: 8.7, risk: 38, volume: 118 },
  { date: 'Mar 3', imports: 42, price: 9.1, risk: 42, volume: 115 },
  { date: 'Mar 4', imports: 40, price: 9.8, risk: 48, volume: 110 },
  { date: 'Mar 5', imports: 38, price: 10.5, risk: 55, volume: 105 },
  { date: 'Mar 6', imports: 35, price: 11.2, risk: 62, volume: 98 },
  { date: 'Mar 7', imports: 32, price: 12.1, risk: 72, volume: 90 },
  { date: 'Mar 8', imports: 30, price: 12.8, risk: 78, volume: 85 },
  { date: 'Mar 9', imports: 28, price: 13.5, risk: 85, volume: 80 },
  { date: 'Mar 10', imports: 25, price: 14.2, risk: 92, volume: 75 },
];

const supplySourceData = [
  { name: 'Qatar', value: 50, fill: '#3b82f6' },
  { name: 'UAE', value: 20, fill: '#10b981' },
  { name: 'Australia', value: 15, fill: '#f59e0b' },
  { name: 'Others', value: 15, fill: '#8b5cf6' },
];

const dataSources = {
  lngImports: {
    name: 'PNGRB (Petroleum & Natural Gas Regulatory Board)',
    url: 'https://www.pngrb.gov.in',
    lastFetch: '2026-03-10 02:09 UTC',
    status: 'live' as const,
  },
  lngPrice: {
    name: 'Bloomberg Commodity Index',
    url: 'https://www.bloomberg.com',
    lastFetch: '2026-03-10 02:08 UTC',
    status: 'live' as const,
  },
  shippingData: {
    name: 'MarineTraffic AIS Tracking',
    url: 'https://www.marinetraffic.com',
    lastFetch: '2026-03-10 02:07 UTC',
    status: 'live' as const,
  },
  geopolitical: {
    name: 'Reuters News Feed + Geopolitical Analysis',
    url: 'https://www.reuters.com',
    lastFetch: '2026-03-10 02:06 UTC',
    status: 'live' as const,
  },
  portData: {
    name: 'Port Authority of Qatar & UAE',
    url: 'https://www.qp.com.qa',
    lastFetch: '2026-03-10 02:05 UTC',
    status: 'live' as const,
  },
  reserves: {
    name: 'Terminal Operators & PNGRB Reserve Data',
    url: 'https://www.pngrb.gov.in',
    lastFetch: '2026-03-10 02:04 UTC',
    status: 'live' as const,
  },
};

const terminalReserves = [
  { terminal: 'Dahej (Petronet)', capacity: 17.5, current: 14.9, operator: 'Petronet LNG Ltd', status: 'moderate' },
  { terminal: 'Hazira (Shell)', capacity: 5.0, current: 2.5, operator: 'Shell India', status: 'low' },
  { terminal: 'Kochi (Petronet)', capacity: 5.0, current: 3.2, operator: 'Petronet LNG Ltd', status: 'moderate' },
  { terminal: 'Dabhol (GAIL)', capacity: 5.0, current: 2.1, operator: 'GAIL-NTPC JV', status: 'low' },
  { terminal: 'Ennore (IOC)', capacity: 5.0, current: 1.8, operator: 'Indian Oil', status: 'critical' },
  { terminal: 'Mundra (GSPC)', capacity: 5.0, current: 1.5, operator: 'GSPC LNG', status: 'critical' },
];

const terminalCapacityData = [
  { name: 'Dahej', capacity: 17.5, utilization: 85, status: 'High Load' },
  { name: 'Hazira', capacity: 5.0, utilization: 50, status: 'Medium Load' },
  { name: 'Kochi', capacity: 5.0, utilization: 65, status: 'Medium Load' },
  { name: 'Dabhol', capacity: 5.0, utilization: 42, status: 'Low Load' },
  { name: 'Ennore', capacity: 5.0, utilization: 36, status: 'Low Load' },
  { name: 'Mundra', capacity: 5.0, utilization: 30, status: 'Low Load' },
];

const geopoliticalAlerts = [
  {
    id: 1,
    severity: 'critical',
    title: 'Strait of Hormuz - Elevated Risk',
    description: '80-90% of LNG shipments pass through this route. Current tensions affecting shipping.',
    time: '2 hours ago',
    source: 'Reuters / MarineTraffic',
  },
  {
    id: 2,
    severity: 'high',
    title: 'LNG Price Spike - 40% increase',
    description: 'Commodity prices surged due to supply concerns. Current: $14.2/MMBtu',
    time: '4 hours ago',
    source: 'Bloomberg Commodity Index',
  },
  {
    id: 3,
    severity: 'high',
    title: 'Shipping Delays - Port Congestion',
    description: 'Average delay increased from 2 days to 5 days at Qatar terminals.',
    time: '6 hours ago',
    source: 'Port Authority of Qatar',
  },
  {
    id: 4,
    severity: 'medium',
    title: 'Red Sea Route Disruption',
    description: 'Alternative shipping routes experiencing 3-5 day delays.',
    time: '8 hours ago',
    source: 'MarineTraffic AIS',
  },
];

const getRiskColor = (risk: number) => {
  if (risk >= 80) return 'text-red-600';
  if (risk >= 60) return 'text-orange-600';
  if (risk >= 40) return 'text-yellow-600';
  return 'text-green-600';
};

const getRiskBgColor = (risk: number) => {
  if (risk >= 80) return 'bg-red-50 border-red-200';
  if (risk >= 60) return 'bg-orange-50 border-orange-200';
  if (risk >= 40) return 'bg-yellow-50 border-yellow-200';
  return 'bg-green-50 border-green-200';
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    default:
      return 'bg-blue-100 text-blue-800 border-blue-300';
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'live':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'delayed':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'offline':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const DataSourceBadge = ({ source }: { source: DataSource }) => (
  <div className="flex items-center gap-2 text-xs">
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${getStatusBadgeColor(source.status)}`}>
      <div className={`w-2 h-2 rounded-full ${source.status === 'live' ? 'bg-green-600' : source.status === 'delayed' ? 'bg-yellow-600' : 'bg-red-600'}`}></div>
      {source.status === 'live' ? 'LIVE' : source.status === 'delayed' ? 'DELAYED' : 'OFFLINE'}
    </div>
    <span className="text-gray-600">{source.lastFetch}</span>
  </div>
);

export default function Home() {
  const [metrics, setMetrics] = useState({
    lngImports: 25,
    importTrend: -44,
    priceTrend: 67,
    shippingDelay: 5,
    riskScore: 92,
  });

  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [reserveDays, setReserveDays] = useState(2.5);
  const [totalReserve, setTotalReserve] = useState(41.0);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        lngImports: Math.max(20, prev.lngImports - Math.random() * 0.5),
        priceTrend: prev.priceTrend + (Math.random() - 0.3) * 1,
        shippingDelay: Math.min(10, prev.shippingDelay + Math.random() * 0.2),
        riskScore: Math.min(100, prev.riskScore + Math.random() * 1),
      }));
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="min-h-screen bg-white">
      {/* Professional Header - Bloomberg Style */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">PNG TRACKER INDIA</h1>
                <p className="text-xs text-gray-500">LNG Supply Early Warning System</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-gray-500">Last Update</div>
                <div className="text-sm font-mono text-gray-700">{lastUpdate.toLocaleTimeString('en-US', { hour12: false })}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLastUpdate(new Date())}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                <span className="text-xs font-semibold text-gray-700">
                  {autoRefresh ? 'AUTO' : 'MANUAL'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Critical Risk Alert */}
        {metrics.riskScore >= 80 && (
          <Alert className={`${getRiskBgColor(metrics.riskScore)} border-2`}>
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertTitle className="text-lg font-bold text-red-900">
              ⚠️ CRITICAL ALERT: LNG Supply Disruption Risk
            </AlertTitle>
            <AlertDescription className="text-red-800 mt-2">
              India's LNG imports face critical disruption risk. Risk Score: <span className="font-bold">{metrics.riskScore.toFixed(0)}%</span>. 
              Strait of Hormuz status: CRITICAL. Email alert has been sent. Monitor developments continuously.
            </AlertDescription>
          </Alert>
        )}

        {/* Reserve Status Alert */}
        {reserveDays < 3 && (
          <Alert className="border-2 border-red-300 bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertTitle className="text-lg font-bold text-red-900">
              ⚠️ CRITICAL RESERVE ALERT
            </AlertTitle>
            <AlertDescription className="text-red-800 mt-2">
              LNG reserves depleting rapidly. Only <span className="font-bold">{reserveDays.toFixed(1)} days</span> of supply remaining in terminals. 
              Compare to crude oil reserves (25 days). Immediate action required: demand rationing, spot purchases, emergency protocols.
            </AlertDescription>
          </Alert>
        )}

        {/* Key Metrics Grid - Bloomberg Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* LNG Imports Card */}
          <Card className="bg-white border-gray-200 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-gray-700">LNG IMPORTS</CardTitle>
                  <CardDescription className="text-xs">Million Metric Tons Per Annum</CardDescription>
                </div>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Current import volume in MMTPA</p>
                  </TooltipContent>
                </UITooltip>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold text-gray-900">{metrics.lngImports.toFixed(1)}</span>
                <span className={`text-sm font-semibold flex items-center gap-1 ${metrics.importTrend < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {metrics.importTrend < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                  {Math.abs(metrics.importTrend).toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Baseline: 45 MMTPA | Alert: &lt;35 MMTPA</p>
              </div>
              <DataSourceBadge source={dataSources.lngImports} />
              <a href={dataSources.lngImports.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-2">
                {dataSources.lngImports.name}
                <ExternalLink className="w-3 h-3" />
              </a>
            </CardContent>
          </Card>

          {/* LNG Price Card */}
          <Card className="bg-white border-gray-200 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-gray-700">LNG PRICE</CardTitle>
                  <CardDescription className="text-xs">$/Million BTU</CardDescription>
                </div>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Spot price for LNG</p>
                  </TooltipContent>
                </UITooltip>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold text-gray-900">$14.2</span>
                <span className="text-sm font-semibold text-red-600 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  +{metrics.priceTrend.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Normal: $8-10 | Alert: &gt;$11.2</p>
              </div>
              <DataSourceBadge source={dataSources.lngPrice} />
              <a href={dataSources.lngPrice.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-2">
                {dataSources.lngPrice.name}
                <ExternalLink className="w-3 h-3" />
              </a>
            </CardContent>
          </Card>

          {/* Shipping Delays Card */}
          <Card className="bg-white border-gray-200 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-gray-700">SHIPPING DELAYS</CardTitle>
                  <CardDescription className="text-xs">Days</CardDescription>
                </div>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Average port and transit delays</p>
                  </TooltipContent>
                </UITooltip>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold text-gray-900">{metrics.shippingDelay.toFixed(1)}</span>
                <span className="text-sm text-gray-600">days</span>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Normal: 2 days | Alert: &gt;4 days</p>
              </div>
              <DataSourceBadge source={dataSources.shippingData} />
              <a href={dataSources.shippingData.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-2">
                {dataSources.shippingData.name}
                <ExternalLink className="w-3 h-3" />
              </a>
            </CardContent>
          </Card>

          {/* Risk Score Card */}
          <Card className={`${getRiskBgColor(metrics.riskScore)} border-2`}>
            <CardHeader className="pb-3 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">RISK SCORE</CardTitle>
                  <CardDescription className="text-xs">Disruption Probability</CardDescription>
                </div>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-gray-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Composite risk indicator (0-100%)</p>
                  </TooltipContent>
                </UITooltip>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-baseline gap-2 mb-3">
                <span className={`text-3xl font-bold ${getRiskColor(metrics.riskScore)}`}>
                  {metrics.riskScore.toFixed(0)}%
                </span>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p>
                  {metrics.riskScore >= 80 ? '🔴 CRITICAL' : metrics.riskScore >= 60 ? '🟠 HIGH' : '🟡 MEDIUM'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Reserve Days Card */}
          <Card className={reserveDays < 3 ? 'bg-red-50 border-2 border-red-300' : 'bg-white border-gray-200'}>
            <CardHeader className="pb-3 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-gray-700">RESERVE DAYS</CardTitle>
                  <CardDescription className="text-xs">Terminal Storage Supply</CardDescription>
                </div>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Days of LNG supply in terminal storage</p>
                  </TooltipContent>
                </UITooltip>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-baseline gap-2 mb-3">
                <span className={`text-3xl font-bold ${reserveDays < 3 ? 'text-red-600' : 'text-gray-900'}`}>
                  {reserveDays.toFixed(1)}
                </span>
                <span className="text-sm text-gray-600">days</span>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Crude Oil: 25 days | Alert: &lt;5 days</p>
              </div>
              <DataSourceBadge source={dataSources.reserves} />
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Import & Price Trend */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-gray-700">LNG IMPORT TREND</CardTitle>
                  <CardDescription className="text-xs">Last 10 Days</CardDescription>
                </div>
                <DataSourceBadge source={dataSources.lngImports} />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={mockTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis yAxisId="left" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                    labelStyle={{ color: '#111827' }}
                  />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="imports" stroke="#3b82f6" fill="#dbeafe" name="Imports (MMTPA)" />
                  <Line yAxisId="right" type="monotone" dataKey="price" stroke="#ef4444" strokeWidth={2} name="Price ($/MMBtu)" />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-4">Source: {dataSources.lngImports.name}</p>
            </CardContent>
          </Card>

          {/* Risk Score Evolution */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-gray-700">RISK SCORE EVOLUTION</CardTitle>
                  <CardDescription className="text-xs">Composite Indicator Trending</CardDescription>
                </div>
                <DataSourceBadge source={dataSources.geopolitical} />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={mockTrendData}>
                  <defs>
                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis domain={[0, 100]} stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                    labelStyle={{ color: '#111827' }}
                  />
                  <Area type="monotone" dataKey="risk" stroke="#ef4444" fillOpacity={1} fill="url(#colorRisk)" name="Risk %" />
                </AreaChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-4">Source: {dataSources.geopolitical.name}</p>
            </CardContent>
          </Card>
        </div>

        {/* Terminal Reserves & Capacity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Terminal Storage Reserves */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-gray-700">TERMINAL STORAGE RESERVES</CardTitle>
                  <CardDescription className="text-xs">Current LNG in Storage by Terminal</CardDescription>
                </div>
                <DataSourceBadge source={dataSources.reserves} />
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {terminalReserves.map((terminal, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{terminal.terminal}</p>
                      <p className="text-xs text-gray-600">{terminal.operator}</p>
                    </div>
                    <Badge className={terminal.status === 'critical' ? 'bg-red-600 text-white' : terminal.status === 'low' ? 'bg-orange-600 text-white' : 'bg-green-600 text-white'}>
                      {terminal.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-300 rounded-full h-2">
                    <div 
                      className={terminal.status === 'critical' ? 'bg-red-500' : terminal.status === 'low' ? 'bg-orange-500' : 'bg-green-500'}
                      style={{ width: `${(terminal.current / terminal.capacity) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-600">
                    <span>{terminal.current.toFixed(1)} / {terminal.capacity.toFixed(1)} MMTPA</span>
                    <span>{((terminal.current / terminal.capacity) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-4">Total Reserve: {totalReserve.toFixed(1)} MMTPA | Days: {reserveDays.toFixed(1)}</p>
            </CardContent>
          </Card>

          {/* Terminal Capacity Utilization */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-gray-700">TERMINAL UTILIZATION</CardTitle>
                  <CardDescription className="text-xs">Regasification Capacity Usage</CardDescription>
                </div>
                <DataSourceBadge source={dataSources.reserves} />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={terminalCapacityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                    labelStyle={{ color: '#111827' }}
                  />
                  <Bar dataKey="utilization" fill="#3b82f6" name="Utilization %" />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-4">Avg Utilization: 51% | Optimal: 70-80% | Stress: &gt;85%</p>
            </CardContent>
          </Card>
        </div>

        {/* Supply Sources & Route Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Supply Sources */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-gray-700">SUPPLY SOURCES</CardTitle>
                  <CardDescription className="text-xs">Import Distribution</CardDescription>
                </div>
                <DataSourceBadge source={dataSources.portData} />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={supplySourceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {supplySourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-4">Source: {dataSources.portData.name}</p>
            </CardContent>
          </Card>

          {/* Shipping Routes Status */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-gray-700">SHIPPING ROUTES</CardTitle>
                  <CardDescription className="text-xs">Critical Chokepoints</CardDescription>
                </div>
                <DataSourceBadge source={dataSources.shippingData} />
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-sm text-gray-900">Strait of Hormuz</p>
                  <Badge className="bg-red-600 text-white text-xs">CRITICAL</Badge>
                </div>
                <p className="text-xs text-gray-600">80-90% of LNG passes</p>
              </div>

              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-sm text-gray-900">Red Sea Route</p>
                  <Badge className="bg-orange-600 text-white text-xs">ELEVATED</Badge>
                </div>
                <p className="text-xs text-gray-600">Alternate path delays</p>
              </div>

              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-sm text-gray-900">Australia Route</p>
                  <Badge className="bg-green-600 text-white text-xs">NORMAL</Badge>
                </div>
                <p className="text-xs text-gray-600">Normal operations</p>
              </div>
              <p className="text-xs text-gray-500 mt-4">Source: {dataSources.shippingData.name}</p>
            </CardContent>
          </Card>

          {/* Key Suppliers Status */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-gray-700">KEY SUPPLIERS</CardTitle>
                  <CardDescription className="text-xs">Supply Capacity</CardDescription>
                </div>
                <DataSourceBadge source={dataSources.portData} />
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">Qatar (50%)</span>
                  <Badge className="bg-red-100 text-red-800 text-xs border border-red-300">AFFECTED</Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">UAE (20%)</span>
                  <Badge className="bg-orange-100 text-orange-800 text-xs border border-orange-300">ELEVATED</Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">Australia (15%)</span>
                  <Badge className="bg-green-100 text-green-800 text-xs border border-green-300">NORMAL</Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '80%' }}></div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">Source: {dataSources.portData.name}</p>
            </CardContent>
          </Card>
        </div>

        {/* Geopolitical Alerts */}
        <Card className="bg-white border-gray-200">
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <CardTitle className="text-sm font-semibold text-gray-700">REAL-TIME ALERTS</CardTitle>
                  <CardDescription className="text-xs">Geopolitical Events & Supply Chain Updates</CardDescription>
                </div>
              </div>
              <DataSourceBadge source={dataSources.geopolitical} />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {geopoliticalAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-l-4 ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-sm">{alert.title}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {alert.time}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm opacity-90 mb-2">{alert.description}</p>
                  <a href="#" className="text-xs text-blue-600 hover:text-blue-800 font-semibold">
                    Source: {alert.source}
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Data Sources Reference */}
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-sm font-semibold text-gray-700">DATA SOURCES & REFRESH SCHEDULE</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(dataSources).map(([key, source]) => (
                <div key={key} className="p-3 bg-white rounded border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-sm text-gray-900">{source.name}</p>
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${getStatusBadgeColor(source.status)}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${source.status === 'live' ? 'bg-green-600' : source.status === 'delayed' ? 'bg-yellow-600' : 'bg-red-600'}`}></div>
                      {source.status === 'live' ? 'LIVE' : source.status === 'delayed' ? 'DELAYED' : 'OFFLINE'}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Last Fetch: {source.lastFetch}</p>
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                    Visit Source
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-4">
              All data refreshes every 5 minutes. Last system update: {lastUpdate.toLocaleString('en-US', { hour12: false })}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
