import { GeoCoords, MapEngineMode } from '../types/civic';
import { loadGoogleMaps, GOOGLE_MAPS_API_KEY } from '../googleMaps';

// Default center (Bengaluru, India)
export const DEFAULT_COORDS: GeoCoords = { lat: 12.9716, lng: 77.5946 };

// Reliable OpenStreetMap Standard tile URL for default high-contrast street map
export const LOKIFY_DARK_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const LOKIFY_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export interface MapLayerConfig {
  id: 'standard' | 'satellite' | 'hybrid' | 'terrain';
  name: string;
  subtitle: string;
  url: string;
  overlayUrl?: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string[];
  badge: string;
}

export const MAP_LAYERS: Record<string, MapLayerConfig> = {
  standard: {
    id: 'standard',
    name: 'Standard Map',
    subtitle: 'Streets, localities & places',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    badge: 'OSM',
  },
  satellite: {
    id: 'satellite',
    name: 'Satellite',
    subtitle: 'High-res aerial imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
    badge: 'SATELLITE',
  },
  hybrid: {
    id: 'hybrid',
    name: 'Hybrid',
    subtitle: 'Satellite with street labels',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar',
    maxZoom: 19,
    badge: 'HYBRID',
  },
  terrain: {
    id: 'terrain',
    name: 'Terrain',
    subtitle: 'Topography & elevation contours',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Sources: Esri, USGS, NOAA',
    maxZoom: 19,
    badge: 'TERRAIN',
  },
};

/**
 * Returns canonical status color according to Lokify GIS specifications:
 * - Open: Grey (#758588)
 * - Acknowledged: Teal (#A3DCE3)
 * - Assigned: Blue (#3B82F6)
 * - In Progress: Cyan (#38BDF8)
 * - Resolved: Green (#43C88A)
 * - Reopened: Red (#EF4444)
 */
export function getMarkerStatusColor(status?: string): string {
  switch (status) {
    case 'Resolved':
      return '#43C88A'; // Green
    case 'In Progress':
      return '#38BDF8'; // Cyan
    case 'Assigned':
      return '#3B82F6'; // Blue
    case 'Acknowledged':
      return '#A3DCE3'; // Teal
    case 'Reopened':
      return '#EF4444'; // Red
    case 'Open':
    case 'Submitted':
    default:
      return '#758588'; // Grey
  }
}

// Preferred engine stored in localStorage
const ENGINE_STORAGE_KEY = 'lokify_preferred_map_engine';

export function getPreferredMapEngine(): MapEngineMode {
  if (typeof window === 'undefined') return 'leaflet';
  const saved = localStorage.getItem(ENGINE_STORAGE_KEY);
  if (saved === 'leaflet' || saved === 'google') return saved;
  return 'leaflet';
}

export function setPreferredMapEngine(mode: MapEngineMode): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ENGINE_STORAGE_KEY, mode);
    window.dispatchEvent(new CustomEvent('lokify:map_engine_changed', { detail: { engine: mode } }));
  }
}

/**
 * Robust reverse geocoding with 3-layer fallback:
 * 1. Google Maps JS Geocoder
 * 2. Google Maps REST Geocoder
 * 3. OpenStreetMap Nominatim Geocoder
 */
export async function reverseGeocodeUnified(latitude: number, longitude: number): Promise<string> {
  // Layer 1: Google Maps Client SDK
  try {
    const maps = await loadGoogleMaps();
    if (maps && maps.Geocoder) {
      const geocoder = new maps.Geocoder();
      const addr = await new Promise<string>((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results: any, status: any) => {
          if (status === 'OK' && results && results[0]) {
            resolve(results[0].formatted_address);
          } else {
            reject(new Error(status));
          }
        });
      });
      if (addr) return addr;
    }
  } catch {
    // Proceed to next fallback
  }

  // Layer 2: Google Maps REST endpoint
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.results && data.results[0]?.formatted_address) {
        return data.results[0].formatted_address;
      }
    }
  } catch {
    // Proceed to next fallback
  }

  // Layer 3: OpenStreetMap Nominatim reverse geocode (always active & free)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      { headers: { Accept: 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch {
    // Proceed to coordinate display
  }

  return `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

/**
 * Calculates geographical distance in meters using Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Generates custom SVG Pin markup for Leaflet map markers with category emblems
 */
export function createLeafletSvgIconHtml(
  statusColor: string = '#A3DCE3',
  categoryId?: string | number,
  size: number = 34
): string {
  let symbolPath = '<circle cx="12" cy="10" r="3.2" fill="#F0F4F4" />';
  const catStr = String(categoryId || '');

  if (catStr === '1') {
    // Pothole - hazard triangle
    symbolPath = '<path d="M12 7l3 5h-6l3-5z" fill="#F0F4F4" />';
  } else if (catStr === '2') {
    // Streetlight - lightbulb
    symbolPath = '<circle cx="12" cy="9.5" r="2.5" fill="#F0F4F4" /><path d="M12 5.5v1.2M12 12.3v1.2M8.2 9.5H7M17 9.5h-1.2" stroke="#F0F4F4" stroke-width="1.2" stroke-linecap="round" />';
  } else if (catStr === '3') {
    // Garbage - waste bin
    symbolPath = '<path d="M8.5 7.5h7M9.5 7.5v5a1 1 0 001 1h3a1 1 0 001-1v-5M10.5 6h3" stroke="#F0F4F4" stroke-width="1.2" stroke-linecap="round" fill="none" />';
  } else if (catStr === '4') {
    // Water & Sewage - droplet
    symbolPath = '<path d="M12 6.5s-3 3.5-3 5a3 3 0 006 0c0-1.5-3-5-3-5z" fill="#F0F4F4" />';
  } else if (catStr === '5') {
    // Drainage - wave lines
    symbolPath = '<path d="M7.5 9c1.5-1 3 1 4.5 0s3 1 4.5 0M7.5 11.5c1.5-1 3 1 4.5 0s3 1 4.5 0" stroke="#F0F4F4" stroke-width="1.2" stroke-linecap="round" fill="none" />';
  } else if (catStr === '6') {
    // Road Damage - exclamation warning
    symbolPath = '<path d="M12 6.5l3.8 6.5h-7.6L12 6.5z" stroke="#F0F4F4" stroke-width="1.2" fill="none" /><circle cx="12" cy="11.5" r="0.6" fill="#F0F4F4" />';
  } else if (catStr === '7') {
    // Public Safety - shield
    symbolPath = '<path d="M12 6.5s3.2 1 3.2 3.8c0 2.2-3.2 4-3.2 4s-3.2-1.8-3.2-4c0-2.8 3.2-3.8 3.2-3.8z" stroke="#F0F4F4" stroke-width="1.2" fill="none" />';
  }

  return `
    <div style="position: relative; width: ${size}px; height: ${size * 1.25}px; transform: translate(-50%, -100%); filter: drop-shadow(0 4px 6px rgba(0,0,0,0.6));">
      <svg width="${size}" height="${size * 1.25}" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Pin Shape -->
        <path d="M12 1.5C6.75 1.5 2.5 5.75 2.5 11C2.5 17.5 12 28.5 12 28.5S21.5 17.5 21.5 11C21.5 5.75 17.25 1.5 12 1.5Z" 
          fill="${statusColor}" stroke="#080F0F" stroke-width="1.5" />
        <!-- Inner Disc -->
        <circle cx="12" cy="10" r="5.5" fill="#101819" stroke="#080F0F" stroke-width="0.8" />
        <!-- Center Glyph -->
        ${symbolPath}
      </svg>
    </div>
  `;
}
