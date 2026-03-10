import express, { Express, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist/client')));

/**
 * PNG Tracker Backend - LNG Supply Monitoring & Alert System
 * 
 * This server monitors:
 * 1. LNG import trends
 * 2. Commodity prices
 * 3. Shipping route status
 * 4. Geopolitical events
 * 5. Port congestion
 * 
 * Triggers WhatsApp alerts when risk thresholds are exceeded
 */

// ============================================
// Data Models & Types
// ============================================

interface SupplyMetric {
  timestamp: Date;
  lngImports: number;
  lngPrice: number;
  shippingDelay: number;
  hormuzStatus: 'normal' | 'elevated' | 'critical';
  redSeaStatus: 'normal' | 'elevated' | 'critical';
  riskScore: number;
}

interface AlertConfig {
  priceThreshold: number; // % increase
  importThreshold: number; // % decrease
  delayThreshold: number; // days
  riskThreshold: number; // 0-100
}

interface WhatsAppAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  sent: boolean;
}

// ============================================
// In-Memory Data Store (Replace with DB in production)
// ============================================

let supplyMetrics: SupplyMetric[] = [];
let alertHistory: WhatsAppAlert[] = [];
let lastAlertTime: Record<string, Date> = {};

const alertConfig: AlertConfig = {
  priceThreshold: 40, // Alert if price increases by 40%
  importThreshold: 30, // Alert if imports decrease by 30%
  delayThreshold: 4, // Alert if delays exceed 4 days
  riskThreshold: 75, // Alert if risk score exceeds 75
};

// ============================================
// Mock Data Generators (Simulate Real Data Sources)
// ============================================

/**
 * Simulates fetching LNG import data from PNGRB/government sources
 */
function fetchLNGImportData(): number {
  // Simulating declining imports due to Middle East crisis
  const baseImport = 45; // MMTPA
  const decline = Math.random() * 2; // 0-2 MMTPA decline per day
  return Math.max(20, baseImport - decline);
}

/**
 * Simulates fetching LNG commodity prices
 */
function fetchLNGPrices(): number {
  // Simulating price surge due to supply disruptions
  const basePrice = 8.5; // $/MMBtu
  const surge = Math.random() * 6; // 0-6 increase due to crisis
  return basePrice + surge;
}

/**
 * Simulates shipping delay data from port authorities
 */
function fetchShippingDelays(): number {
  // Normal: 2 days, Crisis: 5-10 days
  const baseDelay = 2;
  const crisisDelay = Math.random() * 8;
  return baseDelay + crisisDelay;
}

/**
 * Simulates geopolitical risk assessment
 * Combines multiple factors: Hormuz status, Red Sea status, price trends, import trends
 */
function calculateRiskScore(
  lngPrice: number,
  imports: number,
  delay: number,
  hormuzStatus: string,
  redSeaStatus: string
): number {
  let score = 0;

  // Price component (0-30 points)
  const priceIncrease = ((lngPrice - 8.5) / 8.5) * 100;
  score += Math.min(30, (priceIncrease / 100) * 30);

  // Import decline component (0-30 points)
  const importDecline = ((45 - imports) / 45) * 100;
  score += Math.min(30, (importDecline / 100) * 30);

  // Shipping delay component (0-20 points)
  score += Math.min(20, (delay / 10) * 20);

  // Hormuz status component (0-10 points)
  if (hormuzStatus === 'critical') score += 10;
  else if (hormuzStatus === 'elevated') score += 5;

  // Red Sea status component (0-10 points)
  if (redSeaStatus === 'critical') score += 10;
  else if (redSeaStatus === 'elevated') score += 5;

  return Math.min(100, score);
}

/**
 * Determines route status based on geopolitical events
 */
function getRouteStatus(): { hormuz: string; redSea: string } {
  // Simulating current Middle East crisis
  return {
    hormuz: 'critical', // Strait of Hormuz closure
    redSea: 'elevated', // Red Sea disruptions
  };
}

// ============================================
// Alert System
// ============================================

/**
 * Checks if alert should be sent based on thresholds
 */
function shouldSendAlert(metric: SupplyMetric, previousMetric?: SupplyMetric): boolean {
  if (!previousMetric) return false;

  const priceIncrease = ((metric.lngPrice - previousMetric.lngPrice) / previousMetric.lngPrice) * 100;
  const importDecrease = ((previousMetric.lngImports - metric.lngImports) / previousMetric.lngImports) * 100;

  return (
    priceIncrease > alertConfig.priceThreshold ||
    importDecrease > alertConfig.importThreshold ||
    metric.shippingDelay > alertConfig.delayThreshold ||
    metric.riskScore > alertConfig.riskThreshold ||
    metric.hormuzStatus === 'critical' ||
    metric.redSeaStatus === 'critical'
  );
}

/**
 * Generates alert message based on metrics
 */
function generateAlertMessage(metric: SupplyMetric, previousMetric?: SupplyMetric): string {
  const alerts: string[] = [];

  if (metric.riskScore > alertConfig.riskThreshold) {
    alerts.push(`🚨 CRITICAL RISK: Supply disruption risk at ${metric.riskScore.toFixed(0)}%`);
  }

  if (previousMetric) {
    const priceIncrease = ((metric.lngPrice - previousMetric.lngPrice) / previousMetric.lngPrice) * 100;
    if (priceIncrease > alertConfig.priceThreshold) {
      alerts.push(`💰 LNG Price Surge: +${priceIncrease.toFixed(1)}% to $${metric.lngPrice.toFixed(2)}/MMBtu`);
    }

    const importDecrease = ((previousMetric.lngImports - metric.lngImports) / previousMetric.lngImports) * 100;
    if (importDecrease > alertConfig.importThreshold) {
      alerts.push(`📉 Import Decline: -${importDecrease.toFixed(1)}% to ${metric.lngImports.toFixed(1)} MMTPA`);
    }
  }

  if (metric.shippingDelay > alertConfig.delayThreshold) {
    alerts.push(`⏱️ Shipping Delays: ${metric.shippingDelay.toFixed(1)} days (Normal: 2 days)`);
  }

  if (metric.hormuzStatus === 'critical') {
    alerts.push(`⚠️ Strait of Hormuz: CRITICAL - 80-90% of LNG passes through this route`);
  }

  if (metric.redSeaStatus === 'critical') {
    alerts.push(`⚠️ Red Sea Route: CRITICAL - Alternate shipping routes affected`);
  }

  return alerts.join('\n\n');
}

/**
 * Sends WhatsApp alert (Mock implementation)
 * In production, integrate with Twilio WhatsApp API
 */
async function sendWhatsAppAlert(message: string, severity: 'low' | 'medium' | 'high' | 'critical'): Promise<boolean> {
  const alert: WhatsAppAlert = {
    id: `alert-${Date.now()}`,
    severity,
    message,
    timestamp: new Date(),
    sent: false,
  };

  try {
    // TODO: Integrate with Twilio WhatsApp API
    // const client = twilio(accountSid, authToken);
    // await client.messages.create({
    //   from: 'whatsapp:+14155552671',
    //   to: 'whatsapp:+YOUR_NUMBER',
    //   body: message
    // });

    alert.sent = true;
    console.log(`[WhatsApp Alert - ${severity.toUpperCase()}] ${message}`);
    
    alertHistory.push(alert);
    lastAlertTime[severity] = new Date();
    
    return true;
  } catch (error) {
    console.error('Failed to send WhatsApp alert:', error);
    return false;
  }
}

/**
 * Main monitoring loop - runs every 5 minutes
 */
async function monitorSupplyChain(): Promise<void> {
  const routes = getRouteStatus();
  
  const metric: SupplyMetric = {
    timestamp: new Date(),
    lngImports: fetchLNGImportData(),
    lngPrice: fetchLNGPrices(),
    shippingDelay: fetchShippingDelays(),
    hormuzStatus: routes.hormuz as 'normal' | 'elevated' | 'critical',
    redSeaStatus: routes.redSea as 'normal' | 'elevated' | 'critical',
    riskScore: 0,
  };

  // Calculate risk score
  metric.riskScore = calculateRiskScore(
    metric.lngPrice,
    metric.lngImports,
    metric.shippingDelay,
    metric.hormuzStatus,
    metric.redSeaStatus
  );

  supplyMetrics.push(metric);

  // Keep only last 100 metrics
  if (supplyMetrics.length > 100) {
    supplyMetrics = supplyMetrics.slice(-100);
  }

  // Check if alert should be sent
  const previousMetric = supplyMetrics[supplyMetrics.length - 2];
  if (shouldSendAlert(metric, previousMetric)) {
    const message = generateAlertMessage(metric, previousMetric);
    const severity = metric.riskScore > 85 ? 'critical' : metric.riskScore > 70 ? 'high' : 'medium';
    
    // Rate limiting: Don't send same severity alert more than once per 30 minutes
    const lastAlert = lastAlertTime[severity];
    if (!lastAlert || Date.now() - lastAlert.getTime() > 30 * 60 * 1000) {
      await sendWhatsAppAlert(message, severity as 'low' | 'medium' | 'high' | 'critical');
    }
  }
}

// ============================================
// API Endpoints
// ============================================

/**
 * GET /api/metrics - Get latest supply metrics
 */
app.get('/api/metrics', (req: Request, res: Response) => {
  const latest = supplyMetrics[supplyMetrics.length - 1];
  res.json(latest || {});
});

/**
 * GET /api/metrics/history - Get historical metrics
 */
app.get('/api/metrics/history', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  res.json(supplyMetrics.slice(-limit));
});

/**
 * GET /api/alerts - Get alert history
 */
app.get('/api/alerts', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  res.json(alertHistory.slice(-limit));
});

/**
 * POST /api/alerts/config - Update alert configuration
 */
app.post('/api/alerts/config', (req: Request, res: Response) => {
  const { priceThreshold, importThreshold, delayThreshold, riskThreshold } = req.body;
  
  if (priceThreshold !== undefined) alertConfig.priceThreshold = priceThreshold;
  if (importThreshold !== undefined) alertConfig.importThreshold = importThreshold;
  if (delayThreshold !== undefined) alertConfig.delayThreshold = delayThreshold;
  if (riskThreshold !== undefined) alertConfig.riskThreshold = riskThreshold;
  
  res.json({ success: true, config: alertConfig });
});

/**
 * GET /api/alerts/config - Get current alert configuration
 */
app.get('/api/alerts/config', (req: Request, res: Response) => {
  res.json(alertConfig);
});

/**
 * GET /api/health - Health check
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    metricsCount: supplyMetrics.length,
    alertsCount: alertHistory.length,
  });
});

// Serve client app
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../dist/client/index.html'));
});

// ============================================
// Server Initialization
// ============================================

const server = app.listen(PORT, () => {
  console.log(`🚀 PNG Tracker Server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔌 API: http://localhost:${PORT}/api`);
});

// Start monitoring loop - runs every 5 minutes
setInterval(() => {
  monitorSupplyChain().catch(error => {
    console.error('Monitoring error:', error);
  });
}, 5 * 60 * 1000); // 5 minutes

// Initial monitoring run
monitorSupplyChain().catch(error => {
  console.error('Initial monitoring error:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
