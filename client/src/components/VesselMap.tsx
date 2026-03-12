import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Tooltip, Rectangle } from 'react-leaflet';

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

// ─── Map config — CartoDB Positron (light, clean) ─────────────────────────────
const TILES_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILES_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const MAP_BOUNDS: L.LatLngBoundsExpression = [
  [9, 29],
  [32, 69],
];

// ─── Risk zone definitions — tuned for light map ──────────────────────────────
const RISK_ZONES = [
  {
    id: 'persian_gulf',
    bounds: [[22, 47], [30.5, 57]] as L.LatLngBoundsExpression,
    color: '#2563eb',
    fillColor: '#3b82f6',
    fillOpacity: 0.1,
    weight: 1,
    dash: '6,4',
    tooltip: 'Persian Gulf — Qatar LNG loading zone\n~50% of India\'s LNG originates here',
    tooltipClass: 'blue',
  },
  {
    id: 'gulf_of_oman',
    bounds: [[21, 57], [26.5, 65]] as L.LatLngBoundsExpression,
    color: '#6366f1',
    fillColor: '#6366f1',
    fillOpacity: 0.08,
    weight: 0.8,
    dash: '6,4',
    tooltip: 'Gulf of Oman — transit corridor from Hormuz to open sea',
    tooltipClass: 'blue',
  },
  {
    id: 'hormuz',
    bounds: [[25, 55.5], [27.5, 57.5]] as L.LatLngBoundsExpression,
    color: '#dc2626',
    fillColor: '#ef4444',
    fillOpacity: 0.28,
    weight: 2,
    dash: undefined,
    tooltip: '⚠ STRAIT OF HORMUZ — Critical chokepoint\n~20% of global LNG trade passes here\nIran/Oman border · 34 km wide at narrowest',
    tooltipClass: 'red',
  },
  {
    id: 'red_sea',
    bounds: [[11, 32], [28, 44]] as L.LatLngBoundsExpression,
    color: '#ea580c',
    fillColor: '#f97316',
    fillOpacity: 0.12,
    weight: 1,
    dash: '6,4',
    tooltip: '⚠ RED SEA CORRIDOR — Houthi threat zone\nShips rerouting via Cape of Good Hope (+14 days)',
    tooltipClass: 'orange',
  },
  {
    id: 'bab_mandeb',
    bounds: [[11.5, 43.2], [13.5, 45]] as L.LatLngBoundsExpression,
    color: '#dc2626',
    fillColor: '#ef4444',
    fillOpacity: 0.38,
    weight: 2,
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

// Vessel fill colors — darker shades for readability on a light map
function vesselFill(v: Vessel): string {
  if (v.isLngCandidate) return '#0e7490'; // deep cyan — LNG carrier
  if (v.navstat === 0)   return '#b45309'; // dark amber — tanker underway
  return '#475569';                        // slate — anchored / moored
}

// Vessel stroke — white for LNG to pop, dark for others
function vesselStroke(v: Vessel): string {
  return v.isLngCandidate ? '#fff' : '#1e293b';
}

/**
 * Ship-shaped SVG DivIcon.
 * Shape: pointed bow (top), wider stern (bottom) — a classic top-down vessel silhouette.
 * Rotated by the vessel's AIS heading so it points in the right direction.
 */
function createShipIcon(v: Vessel): L.DivIcon {
  const fill   = vesselFill(v);
  const stroke = vesselStroke(v);
  const isLng  = v.isLngCandidate;

  // LNG carriers get a slightly larger icon
  const W = isLng ? 14 : 11;
  const H = isLng ? 22 : 17;

  // Heading: 0 = north (bow points up in SVG). 511 = unknown → default north.
  const hdg = v.heading >= 0 && v.heading < 360 ? v.heading : 0;

  // Ship silhouette in a 14×22 (or 11×17) viewBox — bow at top.
  // The path draws: sharp bow → flared stern quarters → flat transom.
  const path = 'M 7 1 L 13 18 L 10 15 L 7 17 L 4 15 L 1 18 Z';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg"
     width="${W}" height="${H}"
     viewBox="0 0 14 22"
     style="display:block;transform:rotate(${hdg}deg);transform-origin:50% 50%;overflow:visible">
  <path d="${path}"
        fill="${fill}"
        stroke="${stroke}"
        stroke-width="1.8"
        stroke-linejoin="round"/>
  ${isLng ? `<circle cx="7" cy="12" r="2" fill="white" opacity="0.5"/>` : ''}
</svg>`;

  return L.divIcon({
    html: svg,
    className: 'vessel-ship-icon',
    iconSize:   [W, H],
    iconAnchor: [W / 2, H / 2],
    tooltipAnchor: [W / 2 + 4, 0],
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export function VesselMap({ vessels, isLive }: VesselMapProps) {
  const valid = vessels.filter(
    (v) => v.lat !== 0 && v.lon !== 0 && Math.abs(v.lat) <= 90 && Math.abs(v.lon) <= 180,
  );

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-md" style={{ height: 440 }}>
      <MapContainer
        bounds={MAP_BOUNDS}
        style={{ height: '100%', width: '100%', background: '#f8fafc' }}
        scrollWheelZoom
        zoomControl
        attributionControl
      >
        {/* Light maritime base tiles — CartoDB Positron */}
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

        {/* ── Vessel markers — custom ship icons ── */}
        {valid.map((v) => (
          <Marker
            key={v.mmsi}
            position={[v.lat, v.lon]}
            icon={createShipIcon(v)}
          >
            <Tooltip direction="top" offset={[0, -8]} className="vessel-map-tooltip vessel-map-tooltip--vessel">
              <div className="text-[11px] leading-snug">
                <p className="font-bold text-sm mb-1">{v.flag} {v.name}</p>
                <p className="text-slate-400 font-mono text-[10px]">MMSI {v.mmsi}</p>
                <p className="mt-0.5">
                  <span className="text-slate-300">{v.speed.toFixed(1)} kn</span>
                  {v.heading < 511 && (
                    <span className="text-slate-400"> · Hdg {v.heading}°</span>
                  )}
                </p>
                {v.destination && (
                  <p className="text-cyan-300 mt-0.5">→ {v.destination}</p>
                )}
                <p className={`mt-0.5 font-medium ${
                  v.navstat === 0 ? 'text-green-400' : 'text-slate-400'
                }`}>
                  {NAVSTAT[v.navstat] ?? 'Other'}
                </p>
                {v.isLngCandidate && (
                  <p className="text-cyan-400 font-semibold mt-0.5">⛽ LNG / Gas carrier</p>
                )}
              </div>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>

      {/* ── Legend overlay ── */}
      <div
        className="absolute bottom-8 right-3 z-[1000] pointer-events-none select-none"
        style={{ backdropFilter: 'blur(6px)' }}
      >
        <div className="bg-white/95 border border-slate-200 shadow-lg rounded-lg p-3 text-[11px] text-slate-800 min-w-[152px]">
          <p className="text-slate-400 uppercase tracking-widest text-[9px] font-semibold mb-2">Vessels</p>
          <div className="flex items-center gap-2 mb-1.5">
            <span style={{ display:'inline-block', width:11, height:17, flexShrink:0 }}>
              <svg viewBox="0 0 14 22" width="11" height="17">
                <path d="M 7 1 L 13 18 L 10 15 L 7 17 L 4 15 L 1 18 Z" fill="#0e7490" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/>
                <circle cx="7" cy="12" r="2" fill="white" opacity="0.5"/>
              </svg>
            </span>
            <span>LNG / Gas carrier</span>
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <span style={{ display:'inline-block', width:11, height:17, flexShrink:0 }}>
              <svg viewBox="0 0 14 22" width="11" height="17">
                <path d="M 7 1 L 13 18 L 10 15 L 7 17 L 4 15 L 1 18 Z" fill="#b45309" stroke="#1e293b" strokeWidth="1.8" strokeLinejoin="round"/>
              </svg>
            </span>
            <span>Tanker underway</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span style={{ display:'inline-block', width:11, height:17, flexShrink:0 }}>
              <svg viewBox="0 0 14 22" width="11" height="17">
                <path d="M 7 1 L 13 18 L 10 15 L 7 17 L 4 15 L 1 18 Z" fill="#475569" stroke="#1e293b" strokeWidth="1.8" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="text-slate-500">Anchored / Moored</span>
          </div>
          <p className="text-slate-400 uppercase tracking-widest text-[9px] font-semibold mb-2">Risk Zones</p>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-3.5 h-2.5 flex-shrink-0 border-2 border-red-500 bg-red-200 rounded-sm" />
            <span className="text-red-700">Chokepoint</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-2.5 flex-shrink-0 border border-orange-400 bg-orange-100 rounded-sm" style={{ borderStyle:'dashed' }} />
            <span className="text-orange-700">Conflict zone</span>
          </div>
        </div>
      </div>

      {/* ── Demo mode badge ── */}
      {!isLive && (
        <div className="absolute top-3 left-3 z-[1000] pointer-events-none">
          <span className="bg-amber-50 border border-amber-400 text-amber-700 text-[10px] font-semibold px-2 py-1 rounded shadow-sm">
            ⚠ Demo positions — set AISSTREAM_API_KEY for live AIS
          </span>
        </div>
      )}
    </div>
  );
}
