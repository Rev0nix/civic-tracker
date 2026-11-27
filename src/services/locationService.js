import { registerPlugin, Capacitor } from '@capacitor/core';
import { reverseGeocode, extractLocality } from '../googleMaps';

const LokifyNativeLocation = registerPlugin('LokifyNativeLocation');

/**
 * High-Accuracy GPS & Locality Service for Lokify.
 * Automatically utilizes native Android hardware GPS & native Geocoder on device,
 * and high-accuracy HTML5 Geolocation with multi-provider reverse geocoding on Web.
 */
export async function getAccurateLocation() {
  // 1. Native Android Device Hardware GPS
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await LokifyNativeLocation.getCurrentLocation();
      if (res && res.success && typeof res.latitude === 'number' && typeof res.longitude === 'number') {
        const locality = res.locality || extractLocality(res.fullAddress, res.latitude, res.longitude);
        try {
          if (locality && locality !== 'Locating...') {
            localStorage.setItem('lokify_last_locality', locality);
          }
        } catch {
          // ignore
        }
        return {
          lat: res.latitude,
          lng: res.longitude,
          accuracy: res.accuracy || 10,
          locality: locality || `Near ${res.latitude.toFixed(3)}, ${res.longitude.toFixed(3)}`,
          city: res.city || 'Local Ward',
          fullAddress: res.fullAddress || `GPS: ${res.latitude.toFixed(5)}, ${res.longitude.toFixed(5)}`,
          source: 'native-android-gps',
        };
      }
    } catch (nativeErr) {
      console.warn('Native GPS plugin fallback to web geolocation:', nativeErr);
    }
  }

  // 2. High-Accuracy Web / Browser Geolocation
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by your browser or device');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        let address = '';
        let locality = '';

        try {
          address = await reverseGeocode(lat, lng);
          if (address) {
            locality = extractLocality(address, lat, lng);
            try {
              if (locality) {
                localStorage.setItem('lokify_last_locality', locality);
              }
            } catch {
              // ignore
            }
          }
        } catch (geoErr) {
          console.warn('Reverse geocode error:', geoErr);
        }

        const finalLocality = locality || `Near ${lat.toFixed(3)}, ${lng.toFixed(3)}`;

        resolve({
          lat,
          lng,
          accuracy,
          locality: finalLocality,
          city: finalLocality.includes(',') ? finalLocality.split(',').pop().trim() : 'Local Area',
          fullAddress: address || `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          source: 'high-accuracy-web-gps',
        });
      },
      (err) => {
        reject(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10000,
      }
    );
  });
}
