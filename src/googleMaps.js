const googleMapsApiKey =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  document.querySelector('meta[name="google-maps-api-key"]')?.content ||
  'AIzaSyBfjn5u-jwEe8_FR_P2P_y8FbZItDFAowc';

let googleMapsPromise = null;

export function loadGoogleMaps() {
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
        existingScript.addEventListener('error', () => reject(new Error('Google Maps script failed to load.')));
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google?.maps) {
          resolve(window.google.maps);
        } else {
          reject(new Error('Google Maps loaded but namespace not found.'));
        }
      };
      script.onerror = () => reject(new Error('Google Maps could not be loaded.'));
      document.head.appendChild(script);
    });
  }

  return googleMapsPromise;
}

export async function reverseGeocode(latitude, longitude) {
  try {
    const maps = await loadGoogleMaps();
    if (maps && maps.Geocoder) {
      const geocoder = new maps.Geocoder();
      const address = await new Promise((resolve, reject) => {
        geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            resolve(results[0].formatted_address);
          } else {
            reject(new Error(`Geocoder status: ${status}`));
          }
        });
      });
      if (address) return address;
    }
  } catch {
    // Fall back to Nominatim if Google Geocoding is not enabled
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch {
    // ignore
  }

  return `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}
