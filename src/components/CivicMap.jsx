import { useEffect, useMemo, useRef, useState } from 'react';
import { Layers, LocateFixed, ArrowUpRight, X } from 'lucide-react';
import { loadGoogleMaps, LOKIFY_DARK_MAP_STYLES, extractLocality } from '../googleMaps';
import { formatIssueId, STATUS_CONFIG, getCategoryName } from '../constants/theme';

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 }; // Default Bengaluru coordinates

function parseCoords(loc, lat, lng) {
  if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
    return { lat: Number(lat), lng: Number(lng) };
  }
  if (!loc) return null;
  if (typeof loc === 'object') {
    if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
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
}

export default function CivicMap({
  latitude,
  longitude,
  issues = [],
  addresses = {},
  onSelectIssue,
  height = 'h-[500px]',
}) {
  const mapElement = useRef(null);
  const mapInstanceRef = useRef(null);
  const mapsSdkRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);

  const [mapError, setMapError] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All'); // 'All' | 'Active' | 'Resolved'
  const [selectedPinIssue, setSelectedPinIssue] = useState(null);

  const userCenter = useMemo(() => {
    if (latitude != null && longitude != null && !isNaN(latitude) && !isNaN(longitude)) {
      return { lat: Number(latitude), lng: Number(longitude) };
    }
    return null;
  }, [latitude, longitude]);

  // Initialize Map with Lokify Dark Styling
  useEffect(() => {
    let active = true;

    loadGoogleMaps()
      .then((maps) => {
        if (!active || !mapElement.current) return;
        mapsSdkRef.current = maps;

        const initialCenter = userCenter || DEFAULT_CENTER;

        const map = new maps.Map(mapElement.current, {
          center: initialCenter,
          zoom: 14,
          mapTypeId: maps.MapTypeId.ROADMAP,
          styles: LOKIFY_DARK_MAP_STYLES,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          zoomControlOptions: {
            position: maps.ControlPosition.RIGHT_BOTTOM,
          },
          clickableIcons: false,
        });

        mapInstanceRef.current = map;
        setIsLoaded(true);

        maps.event.addListener(map, 'click', () => {
          setSelectedPinIssue(null);
        });
      })
      .catch((error) => {
        if (active) setMapError(error.message || 'Failed to load Google Maps');
      });

    return () => {
      active = false;
    };
  }, [userCenter]);

  // Update user position marker
  useEffect(() => {
    if (!mapInstanceRef.current || !mapsSdkRef.current || !userCenter) return;
    const maps = mapsSdkRef.current;
    const map = mapInstanceRef.current;

    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(userCenter);
    } else {
      userMarkerRef.current = new maps.Marker({
        position: userCenter,
        map,
        title: 'You are here',
        zIndex: 999,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#A3DCE3',
          fillOpacity: 1,
          strokeColor: '#080F0F',
          strokeWeight: 3,
        },
      });
    }
  }, [userCenter, isLoaded]);

  // Filter issues
  const visibleIssues = useMemo(() => {
    return issues.filter((issue) => {
      const isResolved = issue.status === 'Resolved';
      if (selectedFilter === 'Active') return !isResolved;
      if (selectedFilter === 'Resolved') return isResolved;
      return true;
    });
  }, [issues, selectedFilter]);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current || !mapsSdkRef.current || !isLoaded) return;
    const maps = mapsSdkRef.current;
    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    visibleIssues.forEach((issue) => {
      const coords = parseCoords(issue.location, issue.latitude, issue.longitude);
      if (!coords) return;

      const isResolved = issue.status === 'Resolved';
      let pinColor = '#A3DCE3'; // Lokify teal default
      if (isResolved) {
        pinColor = '#43C88A'; // Resolved success green
      } else if (String(issue.category_id) === '1') {
        pinColor = '#EF6666'; // Pothole danger red
      } else if (String(issue.category_id) === '2') {
        pinColor = '#E9B85C'; // Streetlight amber
      } else if (String(issue.category_id) === '3') {
        pinColor = '#8DBBEB'; // Water cyan/light blue
      } else if (String(issue.category_id) === '4') {
        pinColor = '#D8B4FE'; // Garbage purple
      }

      const marker = new maps.Marker({
        position: coords,
        map,
        title: `${issue.title} (${formatIssueId(issue.id)})`,
        icon: {
          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
          fillColor: pinColor,
          fillOpacity: 1,
          strokeColor: '#080F0F',
          strokeWeight: 2,
          scale: 1.4,
          anchor: new maps.Point(12, 22),
        },
      });

      marker.addListener('click', () => {
        setSelectedPinIssue(issue);
        map.panTo(coords);
      });

      markersRef.current.push(marker);
    });
  }, [visibleIssues, isLoaded]);

  // Toggle Satellite
  const handleToggleSatellite = () => {
    if (!mapInstanceRef.current || !mapsSdkRef.current) return;
    const next = !isSatellite;
    setIsSatellite(next);
    if (next) {
      mapInstanceRef.current.setMapTypeId(mapsSdkRef.current.MapTypeId.HYBRID);
    } else {
      mapInstanceRef.current.setMapTypeId(mapsSdkRef.current.MapTypeId.ROADMAP);
      mapInstanceRef.current.setOptions({ styles: LOKIFY_DARK_MAP_STYLES });
    }
  };

  // Recenter map
  const handleRecenter = () => {
    if (!mapInstanceRef.current || !mapsSdkRef.current) return;
    const map = mapInstanceRef.current;
    const maps = mapsSdkRef.current;

    if (userCenter) {
      map.panTo(userCenter);
      map.setZoom(15);
      return;
    }

    if (markersRef.current.length > 0) {
      const bounds = new maps.LatLngBounds();
      markersRef.current.forEach((m) => bounds.extend(m.getPosition()));
      map.fitBounds(bounds);
      return;
    }

    map.panTo(DEFAULT_CENTER);
    map.setZoom(13);
  };

  const totalCount = issues.length;
  const activeCount = issues.filter((i) => i.status !== 'Resolved').length;
  const resolvedCount = issues.filter((i) => i.status === 'Resolved').length;

  return (
    <div className={`relative w-full ${height} rounded-3xl overflow-hidden border border-[#354144] bg-[#101819] flex flex-col shadow-2xl`}>
      {/* Map Canvas */}
      <div ref={mapElement} className="w-full h-full" aria-label="Lokify Map" />

      {mapError && (
        <div className="absolute bottom-4 left-4 right-4 z-30 p-3 bg-[#321616] border border-[#5C2424] text-[#EF6666] text-xs font-mono font-medium rounded-2xl">
          {mapError}
        </div>
      )}

      {/* Top Filter Chips */}
      <div className="absolute top-4 left-4 right-16 z-10 flex items-center gap-2 overflow-x-auto no-scrollbar pointer-events-auto">
        {[
          { key: 'All', label: `All (${totalCount})` },
          { key: 'Active', label: `Active (${activeCount})` },
          { key: 'Resolved', label: `Resolved (${resolvedCount})` },
        ].map((f) => {
          const isSelected = selectedFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setSelectedFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold backdrop-blur-md transition-all whitespace-nowrap border ${
                isSelected
                  ? 'bg-[#A3DCE3] text-[#080F0F] border-[#A3DCE3] shadow-md shadow-[#A3DCE3]/20'
                  : 'bg-[#192223]/90 text-[#A5B1B3] border-[#354144] hover:text-[#F0F4F4]'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleToggleSatellite}
          className={`w-9 h-9 rounded-2xl flex items-center justify-center transition border shadow-lg ${
            isSatellite
              ? 'bg-[#A3DCE3] text-[#080F0F] border-[#A3DCE3]'
              : 'bg-[#192223]/90 text-[#A5B1B3] border-[#354144] hover:text-[#F0F4F4]'
          }`}
          title="Toggle Satellite"
        >
          <Layers size={16} />
        </button>

        <button
          onClick={handleRecenter}
          className="w-9 h-9 rounded-2xl bg-[#192223]/90 text-[#A5B1B3] border border-[#354144] hover:text-[#A3DCE3] flex items-center justify-center transition shadow-lg"
          title="Recenter location"
        >
          <LocateFixed size={16} />
        </button>
      </div>

      {/* Selected Issue Preview Card at bottom */}
      {selectedPinIssue && (
        <div className="absolute bottom-4 left-4 right-4 z-20 bg-[#192223]/95 backdrop-blur-md border border-[#354144] rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono font-bold text-[#A3DCE3]">
                {formatIssueId(selectedPinIssue.id)}
              </span>
              <span className="text-xs text-[#758588]">·</span>
              <span className="text-[11px] font-medium text-[#A5B1B3]">
                {getCategoryName(selectedPinIssue.category_id)}
              </span>
              <span
                className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border"
                style={{
                  color: STATUS_CONFIG[selectedPinIssue.status]?.color || '#A5B1B3',
                  backgroundColor: STATUS_CONFIG[selectedPinIssue.status]?.bg || '#192223',
                  borderColor: STATUS_CONFIG[selectedPinIssue.status]?.border || '#354144',
                }}
              >
                {selectedPinIssue.status}
              </span>
            </div>
            <h4 className="text-sm font-semibold text-[#F0F4F4] truncate">
              {selectedPinIssue.title}
            </h4>
            <p className="text-xs text-[#758588] truncate mt-0.5">
              {addresses[selectedPinIssue.id] || extractLocality(null, selectedPinIssue.latitude, selectedPinIssue.longitude)}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onSelectIssue && onSelectIssue(selectedPinIssue)}
              className="bg-[#A3DCE3] text-[#080F0F] text-xs font-semibold px-3 py-2 rounded-xl hover:bg-[#85CBD3] transition active:scale-95 flex items-center gap-1 shadow-sm"
            >
              <span>Details</span>
              <ArrowUpRight size={14} />
            </button>
            <button
              onClick={() => setSelectedPinIssue(null)}
              className="p-1.5 text-[#758588] hover:text-[#F0F4F4] rounded-xl hover:bg-[#202B2D] transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
