import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Rectangle } from 'react-leaflet';

// ─── Types ────────────────────────────────────────────────────────────────────
type Vessel = {
  mmsi: string;
  name: string;
  type: number;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  navstat: number;
  destination: string;
  flag: string;
  region: string;
  isLngCandidate: boolean;
};

interface VesselMapProps {
  vessels: Vessel[];
  isLive: boolean;
}

// ─── Map config ───────────────────────────────────────────────────────────────
const TILES_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILES_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Covers Persian Gulf, Hormuz, Gulf of Oman, Red Sea in one view
const MAP_BOUNDS: L.LatLngBoundsExpression = [
  [9, 29],
  [32, 69],
];

// ─── Risk zone definitions ────────────────────────────────────────────────────
const RISK_ZONES = [
  {
    id: 'persian_gulf',
    bounds: [[22, 47], [30.5, 57]] as L.LatLngBoundsExpression,
    color: '#3b82f6',
    fillColor: '#1d4ed8',
    fillOpacity: 0.07,
    weight: 0.6,
    dash: '6,4',
    tooltip: 'Persian Gulf — Qatar LNG loading zone\n~50% of India\'s LNG originates here',
    tooltipClass: 'blue',
  },
  {
    id: 'gulf_of_oman',
    bounds: [[21, 57], [26.5, 65]] as L.LatLngBoundsExpression,
    color: '#6366f1',
    fillColor: '#4338ca',
    fillOpacity: 0.05,
    weight: 0.5,
    dash: '6,4',
    tooltip: 'Gulf of Oman — transit corridor from Hormuz to open sea',
    tooltipClass: 'blue',
  },
  {
    id: 'hormuz',
    bounds: [[25, 55.5], [27.5, 57.5]] as L.LatLngBoundsExpression,
    color: '#ef4444',
    fillColor: '#ef4444',
    fillOpacity: 0.22,
    weight: 1.5,
    dash: undefined,
    tooltip: '⚠ STRAIT OF HORMUZ — Critical chokepoint\n~20% of global LNG trade passes here\nIran/Oman border · 34 km wide at narrowest',
    tooltipClass: 'red',
  },
  {
    id: 'red_sea',
    bounds: [[11, 32], [28, 44]] as L.LatLngBoundsExpression,
    color: '#f97316',
    fillColor: '#f97316',
    fillOpacity: 0.08,
    weight: 0.7,
    dash: '6,4',
    tooltip: '⚠ RED SEA CORRIDOR — Houthi threat zone\nShips rerouting via Cape of Good Hope (+14 days)',
    tooltipClass: 'orange',
  },
  {
    id: 'bab_mandeb',
    bounds: [[11.5, 43.2], [13.5, 45]] as L.LatLngBoundsExpression,
    color: '#ef4444',
    fillColor: '#ef4444',
    fillOpacity: 0.32,
    weight: 1.5,
    dash: undefined,
    tooltip: '⚠ BAB-EL-MANDEB — Southern Red Sea chokepoint\nActive Houthi missile / drone zone',
    tooltipClass: 'red',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const NAVSTAT: Record<number, string> = {
  0: '▶ Underway (engine)',
  1: '⚓ At anchor',
  2: 'Not under command',
  3: 'Restricted manoeuvrability',
  5: '⏸ Moored',
  6: 'Aground',
  8: 'Under way (sailing)',
};

function vesselColor(v: Vessel): string {
  if (v.isLngCandidate) return '#22d3ee';   // cyan  — LNG / gas carrier
  if (v.navstat === 0)   return '#f59e0b';   // amber — underway tanker / cargo
  return '#94a3b8';                           // slate — anchored / moored / other
}

function vesselRadius(v: Vessel): number {
  return v.isLngCandidate ? 7 : 5;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function VesselMap({ vessels, isLive }: VesselMapProps) {
  const valid = vessels.filter(
    (v) => v.lat !== 0 && v.lon !== 0 && Math.abs(v.lat) <= 90 && Math.abs(v.lon) <= 180,
  );

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-700 shadow-lg" style={{ height: 440 }}>
      <MapContainer
        bounds={MAP_BOUNDS}
        style={{ height: '100%', width: '100%', background: '#0f172a' }}
        scrollWheelZoom
        zoomControl
        attributionControl
      >
        {/* Dark maritime base tiles — CartoDB DarkMatter */}
        <TileLayer
          attribution={TILES_ATTR}
          url={TILES_URL}
          maxZoom={18}
          subdomains="abcd"
        />

        {/* ── Risk / region overlays ── */}
        {RISK_ZONES.map((zone) => (
          <Rectangle
            key={zone.id}
            bounds={zone.bounds}
            pathOptions={{
              color: zone.color,
              fillColor: zone.fillColor,
              fillOpacity: zone.fillOpacity,
              weight: zone.weight,
              dashArray: zone.dash,
            }}
          >
            <Tooltip
              sticky
              className={`vessel-map-tooltip vessel-map-tooltip--${zone.tooltipClass}`}
            >
              <span className="whitespace-pre-line text-[11px] leading-snug">{zone.tooltip}</span>
            </Tooltip>
          </Rectangle>
        ))}

        {/* ── Vessel markers ── */}
        {valid.map((v) => {
          const fill = vesselColor(v);
          const r = vesselRadius(v);
          const underway = v.navstat === 0;
          return (
            <CircleMarker
              key={v.mmsi}
              center={[v.lat, v.lon]}
              radius={r}
              pathOptions={{
                fillColor: fill,
                fillOpacity: 0.92,
                color: underway ? '#ffffff' : '#475569',
                weight: v.isLngCandidate ? 1.5 : 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -7]} className="vessel-map-tooltip vessel-map-tooltip--vessel">
                <div className="text-[11px] leading-snug">
                  <p className="font-bold text-sm mb-1">
                    {v.flag} {v.name}
                  </p>
                  <p className="text-slate-400 font-mono">MMSI {v.mmsi}{v.mmsi && ` · IMO ${(v as any).imo || '—'}`}</p>
                  <p className="mt-0.5">
                    <span className="text-slate-300">{v.speed.toFixed(1)} kn</span>
                    {v.heading < 511 && (
                      <span className="text-slate-400"> · Hdg {v.heading}°</span>
                    )}
                  </p>
                  {v.destination && (
                    <p className="text-cyan-300 mt-0.5">→ {v.destination}</p>
                  )}
                  <p className={`mt-0.5 font-medium ${underway ? 'text-green-400' : 'text-slate-400'}`}>
                    {NAVSTAT[v.navstat] ?? 'Other'}
                  </p>
                  {v.isLngCandidate && (
                    <p className="text-cyan-400 font-semibold mt-0.5">⛽ LNG / Gas carrier</p>
                  )}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* ── React legend overlay (above Leaflet layers) ── */}
      <div
        className="absolute bottom-8 right-3 z-[1000] pointer-events-none select-none"
        style={{ backdropFilter: 'blur(6px)' }}
      >
        <div className="bg-slate-900/90 border border-slate-700 rounded-lg p-3 text-[11px] text-white min-w-[150px]">
          <p className="text-slate-500 uppercase tracking-widest text-[9px] font-semibold mb-2">Vessels</p>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-3 h-3 rounded-full bg-cyan-400 border border-white flex-shrink-0" />
            <span>LNG / Gas carrier</span>
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-400 border border-white flex-shrink-0" />
            <span>Tanker underway</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-3 h-3 rounded-full bg-slate-400 flex-shrink-0" />
            <span>Anchored / Moored</span>
          </div>
          <p className="text-slate-500 uppercase tracking-widest text-[9px] font-semibold mb-2">Risk Zones</p>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-3.5 h-2.5 flex-shrink-0 border border-red-400 bg-red-400/20 rounded-sm" />
            <span className="text-red-300">Chokepoint</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-2.5 flex-shrink-0 border border-orange-400 bg-orange-400/10 rounded-sm" style={{ borderStyle: 'dashed' }} />
            <span className="text-orange-300">Conflict zone</span>
          </div>
        </div>
      </div>

      {/* ── Live / demo indicator badge ── */}
      {!isLive && (
        <div className="absolute top-3 left-3 z-[1000] pointer-events-none">
          <span className="bg-amber-900/90 border border-amber-600 text-amber-300 text-[10px] font-semibold px-2 py-1 rounded">
            ⚠ Demo positions — set AISSTREAM_API_KEY for live AIS
          </span>
        </div>
      )}
    </div>
  );
}
