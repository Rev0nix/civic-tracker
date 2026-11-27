// The Google Maps Platform API key provided by the user
export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  document.querySelector('meta[name="google-maps-api-key"]')?.content ||
  'AIzaSyBfjn5u-jwEe8_FR_P2P_y8FbZItDFAowc';

export const GOOGLE_MAPS_FALLBACK_KEY = 'AIzaSyBfjn5u-jwEe8_FR_P2P_y8FbZItDFAowc';

export const GOOGLE_MAPS_MAP_ID =
  import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ||
  document.querySelector('meta[name="google-maps-map-id"]')?.content ||
  '016089-E20F62-171E41';

let googleMapsPromise = null;

// Catch and notify on Google Maps authentication errors
if (typeof window !== 'undefined') {
  window.gm_authFailure = () => {
    console.warn(`Google Maps Platform authentication failure for key: ${GOOGLE_MAPS_API_KEY}`);
    window.dispatchEvent(
      new CustomEvent('lokify:map_auth_error', {
        detail: {
          message: `Google Maps key "${GOOGLE_MAPS_API_KEY}" reported authentication restriction. Fallback engine activated.`,
        },
      })
    );
  };
}

export const LOKIFY_DARK_MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#101819' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#080F0F' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#A5B1B3' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#A3DCE3' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#758588' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#142525' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#43C88A' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#192223' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#253538' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#A5B1B3' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#202B2D' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#28616A' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#F0F4F4' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#162325' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0B1718' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#28616A' }],
  },
];

export function loadGoogleMaps(apiKey = GOOGLE_MAPS_API_KEY) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);

  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
      if (existingScript) {
        if (window.google?.maps) {
          resolve(window.google.maps);
          return;
        }
        existingScript.addEventListener('load', () => resolve(window.google.maps));
        existingScript.addEventListener('error', () => {
          googleMapsPromise = null;
          reject(new Error('Google Maps script failed to load.'));
        });
        return;
      }

      function injectScript(key, onFail) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&map_ids=${encodeURIComponent(GOOGLE_MAPS_MAP_ID)}`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (window.google?.maps) {
            resolve(window.google.maps);
          } else if (onFail) {
            onFail();
          } else {
            googleMapsPromise = null;
            reject(new Error('Google Maps loaded but namespace not found.'));
          }
        };
        script.onerror = () => {
          if (onFail) {
            onFail();
          } else {
            googleMapsPromise = null;
            reject(new Error('Google Maps could not be loaded.'));
          }
        };
        document.head.appendChild(script);
      }

      // Try primary key requested by user ("016089-E20F62-171E41"), then fallback key
      injectScript(apiKey, () => {
        if (apiKey !== GOOGLE_MAPS_FALLBACK_KEY) {
          console.warn(`Primary key "${apiKey}" did not initialize; attempting fallback key "${GOOGLE_MAPS_FALLBACK_KEY}".`);
          injectScript(GOOGLE_MAPS_FALLBACK_KEY, () => {
            googleMapsPromise = null;
            reject(new Error('Google Maps failed to load; using Leaflet Dark GIS.'));
          });
        } else {
          googleMapsPromise = null;
          reject(new Error('Google Maps failed to load; using Leaflet Dark GIS.'));
        }
      });
    });
  }

  return googleMapsPromise;
}

export async function reverseGeocode(latitude, longitude) {
  // 1. Google Maps JavaScript Geocoder with address_components
  try {
    const maps = await loadGoogleMaps();
    if (maps && maps.Geocoder) {
      const geocoder = new maps.Geocoder();
      const address = await new Promise((resolve, reject) => {
        geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            // Check address_components for sublocality + locality
            let sublocality = '';
            let locality = '';
            let district = '';
            if (results[0].address_components) {
              for (const comp of results[0].address_components) {
                if (comp.types.includes('sublocality_level_1') || comp.types.includes('sublocality')) {
                  sublocality = comp.long_name;
                } else if (comp.types.includes('locality')) {
                  locality = comp.long_name;
                } else if (comp.types.includes('administrative_area_level_2')) {
                  district = comp.long_name;
                }
              }
            }
            if (sublocality && locality) {
              resolve(`${sublocality}, ${locality}`);
            } else if (sublocality) {
              resolve(sublocality);
            } else if (locality) {
              resolve(locality);
            } else if (district) {
              resolve(district);
            } else {
              resolve(results[0].formatted_address);
            }
          } else {
            reject(new Error(`Geocoder status: ${status}`));
          }
        });
      });
      if (address) return address;
    }
  } catch {
    // Fall back to REST endpoints
  }

  // 2. Free, CORS-friendly BigDataCloud Client Reverse Geocode API (Instant, No API Key, Global)
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      const sub = data.locality;
      const city = data.city || data.principalSubdivision;
      if (sub && city && sub !== city) {
        return `${sub}, ${city}`;
      } else if (sub || city) {
        return sub || city;
      }
    }
  } catch {
    // Fall back to Nominatim
  }

  // 3. OpenStreetMap Nominatim reverse geocode with structured address
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const sub = data.address.suburb || data.address.neighbourhood || data.address.residential || data.address.village;
        const city = data.address.city || data.address.town || data.address.county || data.address.state_district;
        if (sub && city) {
          return `${sub}, ${city}`;
        } else if (sub || city) {
          return sub || city;
        }
      }
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch {
    // Ignore
  }

  return `Near ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
}

// Extract a clean short locality (e.g., "Indiranagar, Bengaluru" or "Kuvempunagar, Mysuru")
export function extractLocality(address, fallbackLat, fallbackLng) {
  if (!address || typeof address !== 'string') {
    return fallbackLat && fallbackLng
      ? `Near ${fallbackLat.toFixed(3)}, ${fallbackLng.toFixed(3)}`
      : 'Current Location';
  }

  // If already a clean short string like "Indiranagar, Bengaluru"
  if (address.length < 35 && !address.match(/^\d/) && !address.includes('+')) {
    return address;
  }

  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);

  // Filter out door/house numbers, pin codes, plus codes, and country
  const filtered = parts.filter((p) => {
    if (/^\d+([-/]\d+)*[a-zA-Z]?$/.test(p)) return false; // "12", "12/3", "45A"
    if (/^\d{5,6}$/.test(p)) return false; // Postal code
    if (/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4}/.test(p)) return false; // Plus code
    if (/^unnamed\s+road$/i.test(p)) return false;
    if (/^india$/i.test(p)) return false;
    return true;
  });

  if (filtered.length >= 2) {
    // If first part is a street/road name like "5th Cross Rd", combine next 2 if available
    if (/road|rd|cross|main|street|lane|nagar|layout|colony/i.test(filtered[0]) && filtered.length >= 3) {
      return `${filtered[0]}, ${filtered[1]}`;
    }
    return `${filtered[0]}, ${filtered[1]}`;
  } else if (filtered.length === 1) {
    return filtered[0];
  }

  return fallbackLat && fallbackLng
    ? `Near ${fallbackLat.toFixed(3)}, ${fallbackLng.toFixed(3)}`
    : 'Current Location';
}
