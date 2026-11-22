// Distance calculator helper for AI Duplicate Detection (Haversine formula in meters)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// AI Smart Priority Scoring Analyzer
export const analyzePriority = (title, description) => {
  const text = `${title} ${description}`.toLowerCase();
  if (
    text.includes('danger') ||
    text.includes('accident') ||
    text.includes('burst') ||
    text.includes('severe') ||
    text.includes('live wire') ||
    text.includes('overflow')
  ) {
    return 'Critical';
  } else if (
    text.includes('broken') ||
    text.includes('damaged') ||
    text.includes('leak') ||
    text.includes('dark')
  ) {
    return 'Medium';
  }
  return 'Low';
};

// Canvas Image Compression Helper (Downscales high-res photos to 1200px and 0.75 JPEG)
export const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          0.75
        );
      };
    };
  });
};

// Universal Location Parser (Handles PostGIS Point strings, GeoJSON objects, lat/lng objects)
export const parseLocation = (loc, fallbackLat, fallbackLng) => {
  if (fallbackLat != null && fallbackLng != null && !isNaN(Number(fallbackLat)) && !isNaN(Number(fallbackLng))) {
    return { lat: Number(fallbackLat), lng: Number(fallbackLng) };
  }

  if (!loc) return null;

  if (typeof loc === 'object') {
    if (loc.coordinates && Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
      return { lng: parseFloat(loc.coordinates[0]), lat: parseFloat(loc.coordinates[1]) };
    }
    if (loc.lat != null && loc.lng != null) {
      return { lat: parseFloat(loc.lat), lng: parseFloat(loc.lng) };
    }
  }

  if (typeof loc === 'string') {
    const pointMatch = loc.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (pointMatch) {
      return { lng: parseFloat(pointMatch[1]), lat: parseFloat(pointMatch[2]) };
    }

    const parts = loc.split(',');
    if (parts.length === 2) {
      const p1 = parseFloat(parts[0]);
      const p2 = parseFloat(parts[1]);
      if (!isNaN(p1) && !isNaN(p2)) {
        if (Math.abs(p1) <= 90 && Math.abs(p2) <= 180) {
          return { lat: p1, lng: p2 };
        }
        return { lat: p2, lng: p1 };
      }
    }
  }

  return null;
};
