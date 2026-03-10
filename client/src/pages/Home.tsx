import { useState, useEffect } from 'react';
import { AlertCircle, TrendingDown, TrendingUp, Zap, Ship, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

/**
 * PNG Tracker India - LNG Supply Early Warning System
 * Monitors LNG imports, geopolitical risks, and shipping routes
 * Provides advance warning of potential supply disruptions
 */

interface MetricData {
  timestamp: string;
  value: number;
  risk: 'low' | 'medium' | 'high' | 'critical';
}

interface SupplyMetrics {
  lngImports: number;
  importTrend: number;
  priceTrend: number;
  shippingDelay: number;
  hormuzStatus: 'normal' | 'elevated' | 'critical';
  redSeaStatus: 'normal' | 'elevated' | 'critical';
  qatarSupply: number;
  uaeSupply: number;
  australiaSupply: number;
}

const mockTrendData = [
  { date: 'Mar 1', imports: 45, price: 8.5, risk: 35 },
  { date: 'Mar 2', imports: 44, price: 8.7, risk: 38 },
  { date: 'Mar 3', imports: 42, price: 9.1, risk: 42 },
  { date: 'Mar 4', imports: 40, price: 9.8, risk: 48 },
  { date: 'Mar 5', imports: 38, price: 10.5, risk: 55 },
  { date: 'Mar 6', imports: 35, price: 11.2, risk: 62 },
  { date: 'Mar 7', imports: 32, price: 12.1, risk: 72 },
  { date: 'Mar 8', imports: 30, price: 12.8, risk: 78 },
  { date: 'Mar 9', imports: 28, price: 13.5, risk: 85 },
  { date: 'Mar 10', imports: 25, price: 14.2, risk: 92 },
];

const supplySourceData = [
  { name: 'Qatar', value: 50, fill: '#3b82f6' },
  { name: 'UAE', value: 20, fill: '#10b981' },
  { name: 'Australia', value: 15, fill: '#f59e0b' },
  { name: 'Others', value: 15, fill: '#8b5cf6' },
];

const geopoliticalAlerts = [
  {
    id: 1,
    severity: 'critical',
    title: 'Strait of Hormuz - Elevated Risk',
    description: '80-90% of LNG shipments pass through this route. Current tensions affecting shipping.',
    time: '2 hours ago',
  },
  {
    id: 2,
    severity: 'high',
    title: 'LNG Price Spike - 40% increase',
    description: 'Commodity prices surged due to supply concerns. Current: $14.2/MMBtu',
    time: '4 hours ago',
  },
  {
    id: 3,
    severity: 'high',
    title: 'Shipping Delays - Port Congestion',
    description: 'Average delay increased from 2 days to 5 days at Qatar terminals.',
    time: '6 hours ago',
  },
  {
    id: 4,
    severity: 'medium',
    title: 'Red Sea Route Disruption',
    description: 'Alternative shipping routes experiencing 3-5 day delays.',
    time: '8 hours ago',
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

export default function Home() {
  const [metrics, setMetrics] = useState<SupplyMetrics>({
    lngImports: 25,
    importTrend: -44,
    priceTrend: 67,
    shippingDelay: 5,
    hormuzStatus: 'critical',
    redSeaStatus: 'elevated',
    qatarSupply: 50,
    uaeSupply: 20,
    australiaSupply: 15,
  });

  const [riskScore, setRiskScore] = useState(92);

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        lngImports: Math.max(20, prev.lngImports - Math.random() * 2),
        priceTrend: prev.priceTrend + (Math.random() - 0.3) * 2,
        shippingDelay: Math.min(10, prev.shippingDelay + Math.random() * 0.5),
      }));
      setRiskScore(prev => Math.min(100, prev + Math.random() * 2));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <Zap className="w-8 h-8 text-blue-400" />
                PNG Tracker India
              </h1>
              <p className="text-slate-400 mt-1">LNG Supply Early Warning System</p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${getRiskColor(riskScore)}`}>
                {riskScore.toFixed(0)}%
              </div>
              <p className="text-slate-400 text-sm">Overall Risk Score</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Critical Risk Alert */}
        {riskScore >= 80 && (
          <Alert className={`${getRiskBgColor(riskScore)} border-2`}>
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertTitle className="text-lg font-bold text-red-900">
              ⚠️ CRITICAL: LNG Supply Disruption Risk
            </AlertTitle>
            <AlertDescription className="text-red-800 mt-2">
              India's LNG imports are at critical risk. Risk score: {riskScore.toFixed(0)}%. 
              WhatsApp alert has been sent. Monitor shipping routes and geopolitical developments closely.
            </AlertDescription>
          </Alert>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* LNG Imports */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300">LNG Imports (MMTPA)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{metrics.lngImports.toFixed(1)}</span>
                <span className={`text-sm font-semibold flex items-center gap-1 ${metrics.importTrend < 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {metrics.importTrend < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                  {Math.abs(metrics.importTrend).toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Last 30 days average: 45 MMTPA</p>
            </CardContent>
          </Card>

          {/* LNG Price */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300">LNG Price ($/MMBtu)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">$14.2</span>
                <span className="text-sm font-semibold text-red-400 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  +67%
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Normal range: $8-10/MMBtu</p>
            </CardContent>
          </Card>

          {/* Shipping Delays */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300">Avg Shipping Delay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{metrics.shippingDelay.toFixed(1)}</span>
                <span className="text-sm text-slate-400">days</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Normal: 2 days | Alert: 5+ days</p>
            </CardContent>
          </Card>

          {/* Overall Risk */}
          <Card className={`${getRiskBgColor(riskScore)}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Supply Disruption Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${getRiskColor(riskScore)}`}>
                  {riskScore.toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-2">
                {riskScore >= 80 ? 'CRITICAL' : riskScore >= 60 ? 'HIGH' : 'MEDIUM'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Import Trend */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">LNG Import Trend (Last 10 Days)</CardTitle>
              <CardDescription>Showing declining imports and rising prices</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={mockTrendData}>
                  <defs>
                    <linearGradient id="colorImports" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Area type="monotone" dataKey="imports" stroke="#3b82f6" fillOpacity={1} fill="url(#colorImports)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Risk Score Trend */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Risk Score Evolution</CardTitle>
              <CardDescription>Composite risk indicator trending upward</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="risk" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Supply Sources & Route Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Supply Sources */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">LNG Supply Sources</CardTitle>
              <CardDescription>Current import distribution</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Shipping Routes Status */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Shipping Routes Status</CardTitle>
              <CardDescription>Critical chokepoints monitoring</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-red-500/30">
                  <div className="flex items-center gap-2">
                    <Ship className="w-5 h-5 text-red-400" />
                    <div>
                      <p className="font-semibold text-white text-sm">Strait of Hormuz</p>
                      <p className="text-xs text-slate-400">80-90% of LNG passes</p>
                    </div>
                  </div>
                  <Badge className="bg-red-600 text-white">CRITICAL</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-orange-500/30">
                  <div className="flex items-center gap-2">
                    <Ship className="w-5 h-5 text-orange-400" />
                    <div>
                      <p className="font-semibold text-white text-sm">Red Sea Route</p>
                      <p className="text-xs text-slate-400">Alternate path delays</p>
                    </div>
                  </div>
                  <Badge className="bg-orange-600 text-white">ELEVATED</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-green-500/30">
                  <div className="flex items-center gap-2">
                    <Ship className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="font-semibold text-white text-sm">Australia Route</p>
                      <p className="text-xs text-slate-400">Normal operations</p>
                    </div>
                  </div>
                  <Badge className="bg-green-600 text-white">NORMAL</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Suppliers Status */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Key Suppliers Status</CardTitle>
              <CardDescription>Supply capacity & status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Qatar (50%)</span>
                  <Badge className="bg-red-600 text-white text-xs">AFFECTED</Badge>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">UAE (20%)</span>
                <Badge className="bg-orange-600 text-white text-xs">ELEVATED</Badge>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '60%' }}></div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Australia (15%)</span>
                <Badge className="bg-green-600 text-white text-xs">NORMAL</Badge>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '80%' }}></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Geopolitical Alerts */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              Real-Time Geopolitical Alerts
            </CardTitle>
            <CardDescription>Events affecting LNG supply chain</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {geopoliticalAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-l-4 ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1">{alert.title}</h4>
                      <p className="text-sm opacity-90">{alert.description}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs opacity-75 ml-4 whitespace-nowrap">
                      <Clock className="w-3 h-3" />
                      {alert.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Panel */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Monitoring & Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                Configure Alert Thresholds
              </Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white w-full">
                View Detailed Analytics
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white w-full">
                Export Report
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-4">
              💬 WhatsApp alerts enabled | 📊 Real-time updates every 5 minutes | 🔔 Critical alerts: Immediate
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
