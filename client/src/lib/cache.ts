/**
 * Cache utility for managing data freshness
 * Real-time data: 30 minutes
 * Historical data: Indefinite (never expires)
 */

const CACHE_KEYS = {
  SUPPLY_METRICS: 'png_supply_metrics',
  METRICS_HISTORY: 'png_metrics_history',
  FUTURES: 'png_futures',
  TERMINALS: 'png_terminals',
  ALERTS: 'png_alerts',
  GEO_EVENTS: 'png_geo_events',
  PRICE_HISTORY: 'png_price_history',
  VESSELS: 'png_vessels',
};

const CACHE_DURATION = {
  REAL_TIME: 30 * 60 * 1000, // 30 minutes
  HISTORICAL: Infinity, // Never expires
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Get cached data if fresh, otherwise null
 */
export function getCachedData<T>(key: string, duration: number = CACHE_DURATION.REAL_TIME): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    const age = Date.now() - entry.timestamp;

    if (duration === Infinity) {
      // Historical data never expires
      return entry.data;
    }

    if (age > duration) {
      // Data is stale, remove it
      localStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch (err) {
    console.error(`Cache read error for ${key}:`, err);
    return null;
  }
}

/**
 * Store data in cache with current timestamp
 */
export function setCachedData<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (err) {
    console.error(`Cache write error for ${key}:`, err);
  }
}

/**
 * Check if data is stale (older than 30 minutes)
 */
export function isDataStale(key: string): boolean {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return true;

    const entry: CacheEntry<any> = JSON.parse(cached);
    const age = Date.now() - entry.timestamp;
    return age > CACHE_DURATION.REAL_TIME;
  } catch {
    return true;
  }
}

/**
 * Get age of cached data in seconds
 */
export function getCacheAge(key: string): number | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const entry: CacheEntry<any> = JSON.parse(cached);
    return Math.floor((Date.now() - entry.timestamp) / 1000);
  } catch {
    return null;
  }
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  Object.values(CACHE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

export { CACHE_KEYS, CACHE_DURATION };
