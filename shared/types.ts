/**
 * Shared Types for PNG Tracker India
 */

export interface SupplyMetric {
  timestamp: Date;
  lngImports: number; // MMTPA
  lngPrice: number; // $/MMBtu
  shippingDelay: number; // days
  hormuzStatus: 'normal' | 'elevated' | 'critical';
  redSeaStatus: 'normal' | 'elevated' | 'critical';
  riskScore: number; // 0-100
}

export interface AlertConfig {
  priceThreshold: number; // % increase
  importThreshold: number; // % decrease
  delayThreshold: number; // days
  riskThreshold: number; // 0-100
}

export interface WhatsAppAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  sent: boolean;
}

export interface HealthStatus {
  status: 'ok' | 'warning' | 'critical';
  timestamp: Date;
  metricsCount: number;
  alertsCount: number;
}
