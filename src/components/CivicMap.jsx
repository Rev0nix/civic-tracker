import { useEffect, useMemo, useRef, useState } from 'react';
import { Layers, LocateFixed, ArrowUpRight, X, Globe, Map as MapIcon } from 'lucide-react';
import L from 'leaflet';
import { loadGoogleMaps, LOKIFY_DARK_MAP_STYLES, extractLocality } from '../googleMaps';
import { formatIssueId, STATUS_CONFIG, getCategoryName } from '../constants/theme';
import {
  DEFAULT_COORDS,
  LOKIFY_DARK_TILE_URL,
  LOKIFY_TILE_ATTRIBUTION,
  getPreferredMapEngine,
  setPreferredMapEngine,
  createLeafletSvgIconHtml,
} from '../services/mapEngine';

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

  // Engine state: 'google' | 'leaflet'
  const [engine, setEngine] = useState(getPreferredMapEngine);

  // Google Maps refs
  const googleMapRef = useRef(null);
  const mapsSdkRef = useRef(null);
  const googleMarkersRef = useRef([]);
  const googleUserMarkerRef = useRef(null);

  // Leaflet refs
  const leafletMapRef = useRef(null);
  const leafletTileLayerRef = useRef(null);
  const leafletMarkersRef = useRef([]);
  const leafletUserMarkerRef = useRef(null);

  const [mapError, setMapError] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All'); // 'All' | 'Active' | 'Resolved'
  const [selectedPinIssue, setSelectedPinIssue] = useState(null);

  const userCenter = useMemo(() => {
    if (latitude != null && longitude != null && !isNaN(latitude) && !isNaN(longitude)) {
      return { lat: Number(latitude), lng: Number(longitude) };
    }
    return null;
  }, [latitude, longitude]);

  const activeCenter = userCenter || DEFAULT_COORDS;

  // Filter issues
  const visibleIssues = useMemo(() => {
    return issues.filter((issue) => {
      const isResolved = issue.status === 'Resolved';
      if (selectedFilter === 'Active') return !isResolved;
      if (selectedFilter === 'Resolved') return isResolved;
      return true;
    });
  }, [issues, selectedFilter]);

  // Listen for Google Maps authentication failures and auto-fallback to Leaflet
  useEffect(() => {
    const handleAuthError = (e) => {
      console.warn('Google Maps auth error caught. Auto-switching to Leaflet Dark GIS engine:', e.detail);
      setMapError('Google Maps API key not activated for web. Seamlessly switched to Leaflet Dark GIS engine.');
      setEngine('leaflet');
      setPreferredMapEngine('leaflet');
    };
    window.addEventListener('lokify:map_auth_error', handleAuthError);
    return () => window.removeEventListener('lokify:map_auth_error', handleAuthError);
  }, []);

  // Cleanup helper
  const destroyCurrentMap = () => {
    if (googleMapRef.current) {
      googleMarkersRef.current.forEach((m) => m.setMap(null));
      googleMarkersRef.current = [];
      if (googleUserMarkerRef.current) googleUserMarkerRef.current.setMap(null);
      googleUserMarkerRef.current = null;
      googleMapRef.current = null;
    }
    if (leafletMapRef.current) {
      leafletMarkersRef.current.forEach((m) => m.remove());
      leafletMarkersRef.current = [];
      if (leafletUserMarkerRef.current) leafletUserMarkerRef.current.remove();
      leafletUserMarkerRef.current = null;
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }
    if (mapElement.current) {
      mapElement.current.innerHTML = '';
    }
    setIsLoaded(false);
  };

  // Switch engine manually
  const toggleEngine = () => {
    const nextEngine = engine === 'google' ? 'leaflet' : 'google';
    setMapError('');
    destroyCurrentMap();
    setEngine(nextEngine);
    setPreferredMapEngine(nextEngine);
  };

  // Initialize Map Engine (Google or Leaflet)
  useEffect(() => {
    let active = true;
    if (!mapElement.current) return;

    destroyCurrentMap();

    if (engine === 'google') {
      loadGoogleMaps()
        .then((maps) => {
          if (!active || !mapElement.current) return;
          mapsSdkRef.current = maps;

          const map = new maps.Map(mapElement.current, {
            center: activeCenter,
            zoom: 14,
            mapTypeId: isSatellite ? maps.MapTypeId.HYBRID : maps.MapTypeId.ROADMAP,
            styles: isSatellite ? [] : LOKIFY_DARK_MAP_STYLES,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            zoomControlOptions: {
              position: maps.ControlPosition.RIGHT_BOTTOM,
            },
            clickableIcons: false,
          });

          googleMapRef.current = map;
          setIsLoaded(true);

          maps.event.addListener(map, 'click', () => {
            setSelectedPinIssue(null);
          });
        })
        .catch((err) => {
          if (!active) return;
          console.warn('Google Maps failed to load, falling back to Leaflet:', err);
          setMapError('Google Maps load issue. Auto-switched to Leaflet Dark GIS.');
          setEngine('leaflet');
          setPreferredMapEngine('leaflet');
        });
    } else {
      // Leaflet Engine
      try {
        const map = L.map(mapElement.current, {
          center: [activeCenter.lat, activeCenter.lng],
          zoom: 14,
          zoomControl: false,
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        const tileUrl = isSatellite
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          : LOKIFY_DARK_TILE_URL;
        const attr = isSatellite ? 'Tiles &copy; Esri' : LOKIFY_TILE_ATTRIBUTION;

        const tileLayer = L.tileLayer(tileUrl, {
          attribution: attr,
          maxZoom: 19,
        }).addTo(map);

        leafletTileLayerRef.current = tileLayer;
        leafletMapRef.current = map;

        map.whenReady(() => {
          if (active) {
            setIsLoaded(true);
            map.invalidateSize();
          }
        });

        setTimeout(() => {
          if (active && leafletMapRef.current) {
            leafletMapRef.current.invalidateSize();
          }
        }, 150);

        map.on('click', () => {
          setSelectedPinIssue(null);
        });
      } catch (err) {
        console.error('Leaflet initialization error:', err);
      }
    }

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  // Update User Marker
  useEffect(() => {
    if (!isLoaded || !userCenter) return;

    if (engine === 'google' && googleMapRef.current && mapsSdkRef.current) {
      const maps = mapsSdkRef.current;
      const map = googleMapRef.current;
      if (googleUserMarkerRef.current) {
        googleUserMarkerRef.current.setPosition(userCenter);
      } else {
        googleUserMarkerRef.current = new maps.Marker({
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
    } else if (engine === 'leaflet' && leafletMapRef.current) {
      const map = leafletMapRef.current;
      if (leafletUserMarkerRef.current) {
        leafletUserMarkerRef.current.setLatLng([userCenter.lat, userCenter.lng]);
      } else {
        const userIcon = L.divIcon({
          html: `<div class="w-4 h-4 rounded-full bg-[#A3DCE3] border-2 border-[#080F0F] gps-radar-pulse"></div>`,
          className: 'user-gps-marker',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        leafletUserMarkerRef.current = L.marker([userCenter.lat, userCenter.lng], {
          icon: userIcon,
          zIndexOffset: 1000,
        }).addTo(map);
      }
    }
  }, [userCenter, isLoaded, engine]);

  // Update Issue Markers
  useEffect(() => {
    if (!isLoaded) return;

    // Helper for category pin colors
    const getPinColor = (issue) => {
      if (issue.status === 'Resolved') return '#43C88A';
      if (String(issue.category_id) === '1') return '#EF6666'; // Pothole
      if (String(issue.category_id) === '2') return '#E9B85C'; // Streetlight
      if (String(issue.category_id) === '3') return '#8DBBEB'; // Water
      if (String(issue.category_id) === '4') return '#D8B4FE'; // Garbage
      return '#A3DCE3';
    };

    if (engine === 'google' && googleMapRef.current && mapsSdkRef.current) {
      const maps = mapsSdkRef.current;
      const map = googleMapRef.current;

      googleMarkersRef.current.forEach((m) => m.setMap(null));
      googleMarkersRef.current = [];

      visibleIssues.forEach((issue) => {
        const coords = parseCoords(issue.location, issue.latitude, issue.longitude);
        if (!coords) return;

        const pinColor = getPinColor(issue);
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

        googleMarkersRef.current.push(marker);
      });
    } else if (engine === 'leaflet' && leafletMapRef.current) {
      const map = leafletMapRef.current;

      leafletMarkersRef.current.forEach((m) => m.remove());
      leafletMarkersRef.current = [];

      visibleIssues.forEach((issue) => {
        const coords = parseCoords(issue.location, issue.latitude, issue.longitude);
        if (!coords) return;

        const pinColor = getPinColor(issue);
        const icon = L.divIcon({
          html: createLeafletSvgIconHtml(pinColor, 30),
          className: 'custom-leaflet-marker',
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        });

        const marker = L.marker([coords.lat, coords.lng], { icon, title: issue.title }).addTo(map);
        marker.on('click', () => {
          setSelectedPinIssue(issue);
          map.panTo([coords.lat, coords.lng]);
        });

        leafletMarkersRef.current.push(marker);
      });
    }
  }, [visibleIssues, isLoaded, engine]);

  // Toggle Satellite
  const handleToggleSatellite = () => {
    const next = !isSatellite;
    setIsSatellite(next);

    if (engine === 'google' && googleMapRef.current && mapsSdkRef.current) {
      if (next) {
        googleMapRef.current.setMapTypeId(mapsSdkRef.current.MapTypeId.HYBRID);
      } else {
        googleMapRef.current.setMapTypeId(mapsSdkRef.current.MapTypeId.ROADMAP);
        googleMapRef.current.setOptions({ styles: LOKIFY_DARK_MAP_STYLES });
      }
    } else if (engine === 'leaflet' && leafletMapRef.current) {
      if (leafletTileLayerRef.current) {
        leafletTileLayerRef.current.remove();
      }
      const tileUrl = next
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : LOKIFY_DARK_TILE_URL;
      const attr = next ? 'Tiles &copy; Esri' : LOKIFY_TILE_ATTRIBUTION;
      leafletTileLayerRef.current = L.tileLayer(tileUrl, { attribution: attr, maxZoom: 19 }).addTo(leafletMapRef.current);
    }
  };

  // Recenter Map
  const handleRecenter = () => {
    const target = userCenter || DEFAULT_COORDS;

    if (engine === 'google' && googleMapRef.current) {
      googleMapRef.current.panTo(target);
      googleMapRef.current.setZoom(15);
    } else if (engine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.setView([target.lat, target.lng], 15);
    }
  };

  const totalCount = issues.length;
  const activeCount = issues.filter((i) => i.status !== 'Resolved').length;
  const resolvedCount = issues.filter((i) => i.status === 'Resolved').length;

  return (
    <div
      className={`relative w-full ${height} overflow-hidden bg-[#101819] flex flex-col`}
    >
      {/* Map Container */}
      <div ref={mapElement} className="w-full h-full" aria-label="Lokify Map" />

      {/* Map Error / Auto-switch Toast */}
      {mapError && (
        <div className="absolute top-3 left-3 right-16 z-30 p-2.5 bg-[#192223]/95 border border-[#354144] text-[#A3DCE3] text-xs font-mono rounded-2xl shadow-xl flex items-center justify-between gap-2 backdrop-blur-md">
          <span className="truncate">{mapError}</span>
          <button
            onClick={() => setMapError('')}
            className="p-1 text-[#758588] hover:text-[#F0F4F4] rounded-lg shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Unobtrusive Floating Map Action Buttons */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 pointer-events-auto">
        <button
          onClick={handleRecenter}
          className="w-8 h-8 rounded-full bg-[#101819]/80 backdrop-blur-md border border-[#354144]/80 text-[#A5B1B3] hover:text-[#A3DCE3] flex items-center justify-center shadow-md active:scale-90 transition"
          title="Recenter location"
          aria-label="Recenter"
        >
          <LocateFixed size={14} />
        </button>
        <button
          onClick={() => setShowControls((prev) => !prev)}
          className={`w-8 h-8 rounded-full backdrop-blur-md border flex items-center justify-center shadow-md active:scale-90 transition ${
            showControls
              ? 'bg-[#A3DCE3] text-[#080F0F] border-[#A3DCE3]'
              : 'bg-[#101819]/80 text-[#A5B1B3] border-[#354144]/80 hover:text-[#A3DCE3]'
          }`}
          title={showControls ? 'Close map controls' : 'Open map controls'}
          aria-label="Toggle map controls"
        >
          {showControls ? <X size={14} /> : <Layers size={14} />}
        </button>
      </div>

      {/* Floating Controls Overlay (disappears by default when map appears; opens only when toggled) */}
      {showControls && (
        <div className="absolute top-13 left-3 right-3 z-20 p-3 bg-[#101819]/95 backdrop-blur-xl border border-[#354144] rounded-2xl shadow-2xl flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-[#A5B1B3] uppercase tracking-wider">
              Filter Issues
            </span>
            {/* Engine Switcher */}
            <button
              onClick={toggleEngine}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#192223] border border-[#354144] text-[11px] font-mono text-[#A3DCE3] active:scale-95"
            >
              {engine === 'google' ? <MapIcon size={12} /> : <Globe size={12} />}
              <span>{engine === 'google' ? 'Google Maps' : 'Leaflet GIS'}</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
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
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-medium transition ${
                    isSelected
                      ? 'bg-[#A3DCE3] text-[#080F0F] font-bold shadow-sm'
                      : 'bg-[#192223] text-[#A5B1B3] hover:text-[#F0F4F4] border border-[#354144]'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Satellite Layer Toggle */}
          <div className="flex items-center justify-between pt-1 border-t border-[#253538]">
            <span className="text-xs text-[#A5B1B3] font-mono">Satellite View</span>
            <button
              onClick={handleToggleSatellite}
              className={`px-3 py-1 rounded-xl text-xs font-mono font-semibold border transition ${
                isSatellite
                  ? 'bg-[#A3DCE3] text-[#080F0F] border-[#A3DCE3]'
                  : 'bg-[#192223] text-[#A5B1B3] border-[#354144]'
              }`}
            >
              {isSatellite ? 'Satellite ON' : 'Dark GIS'}
            </button>
          </div>
        </div>
      )}

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
              {addresses[selectedPinIssue.id] ||
                extractLocality(null, selectedPinIssue.latitude, selectedPinIssue.longitude)}
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
