import { GeoCoords, MapEngineMode } from '../types/civic';
import { loadGoogleMaps, GOOGLE_MAPS_API_KEY } from '../googleMaps';

// Default center (Bengaluru, India)
export const DEFAULT_COORDS: GeoCoords = { lat: 12.9716, lng: 77.5946 };

// CartoDB Dark Matter tile URL for high-contrast dark GIS rendering in Leaflet
export const LOKIFY_DARK_TILE_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png';
export const LOKIFY_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Preferred engine stored in localStorage
const ENGINE_STORAGE_KEY = 'lokify_preferred_map_engine';

export function getPreferredMapEngine(): MapEngineMode {
  if (typeof window === 'undefined') return 'google';
  const saved = localStorage.getItem(ENGINE_STORAGE_KEY);
  if (saved === 'leaflet' || saved === 'google') return saved;
  return 'google';
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
 * Generates custom SVG Pin markup for Leaflet map markers
 */
export function createLeafletSvgIconHtml(color: string = '#EF6666', size: number = 32): string {
  return `
    <div style="position: relative; width: ${size}px; height: ${size}px; transform: translate(-50%, -100%);">
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" 
          fill="${color}" stroke="#080F0F" stroke-width="1.5" />
      </svg>
    </div>
  `;
}
