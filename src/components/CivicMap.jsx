import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Compass,
  Layers,
  LocateFixed,
  Plus,
  Minus,
  ArrowUpRight,
  X,
  Clock,
  MapPin,
  Check,
  AlertTriangle,
  RefreshCw,
  Layers as LayersIcon,
} from 'lucide-react';
import L from 'leaflet';
import { extractLocality } from '../googleMaps';
import { formatIssueId, STATUS_CONFIG, getCategoryName, getRelativeTime } from '../constants/theme';
import {
  DEFAULT_COORDS,
  MAP_LAYERS,
  getMarkerStatusColor,
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
  onRefreshLocation,
  height = 'h-full',
}) {
  const mapElement = useRef(null);

  // Layer State
  const [activeLayerId, setActiveLayerId] = useState('standard');
  const [isLayerSheetOpen, setIsLayerSheetOpen] = useState(false);
  const [tileError, setTileError] = useState(false);

  // Leaflet refs
  const leafletMapRef = useRef(null);
  const leafletTileLayerRef = useRef(null);
  const leafletOverlayLayerRef = useRef(null);
  const leafletMarkersRef = useRef([]);
  const leafletUserMarkerRef = useRef(null);
  const fallbackUsedRef = useRef(false);

  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedPinIssue, setSelectedPinIssue] = useState(null);

  const userCenter = useMemo(() => {
    if (latitude != null && longitude != null && !isNaN(latitude) && !isNaN(longitude)) {
      return { lat: Number(latitude), lng: Number(longitude) };
    }
    return null;
  }, [latitude, longitude]);

  const activeCenter = userCenter || DEFAULT_COORDS;

  // Show all issues directly on the GIS map
  const visibleIssues = issues;

  // Cleanup helper
  const destroyCurrentMap = useCallback(() => {
    if (leafletMapRef.current) {
      leafletMarkersRef.current.forEach((m) => m.remove());
      leafletMarkersRef.current = [];
      if (leafletUserMarkerRef.current) leafletUserMarkerRef.current.remove();
      leafletUserMarkerRef.current = null;
      if (leafletTileLayerRef.current) leafletTileLayerRef.current.remove();
      leafletTileLayerRef.current = null;
      if (leafletOverlayLayerRef.current) leafletOverlayLayerRef.current.remove();
      leafletOverlayLayerRef.current = null;
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }
    if (mapElement.current) {
      mapElement.current.innerHTML = '';
    }
    setIsLoaded(false);
  }, []);

  // Layer switching helper
  const switchLayer = useCallback((layerId) => {
    setActiveLayerId(layerId);
    setTileError(false);
    fallbackUsedRef.current = false;
    const config = MAP_LAYERS[layerId];
    if (!config || !leafletMapRef.current) return;

    if (leafletTileLayerRef.current) {
      leafletTileLayerRef.current.remove();
    }
    if (leafletOverlayLayerRef.current) {
      leafletOverlayLayerRef.current.remove();
      leafletOverlayLayerRef.current = null;
    }

    const baseLayer = L.tileLayer(config.url, {
      subdomains: config.subdomains || ['a', 'b', 'c'],
      attribution: config.attribution,
      maxZoom: config.maxZoom,
    });

    baseLayer.on('tileerror', () => {
      // If standard OSM fails, auto-fallback to Esri World Street Map
      if (layerId === 'standard' && !fallbackUsedRef.current) {
        fallbackUsedRef.current = true;
        if (leafletMapRef.current) {
          baseLayer.remove();
          const fallback = L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
            { attribution: 'Tiles &copy; Esri', maxZoom: 19 }
          ).addTo(leafletMapRef.current);
          leafletTileLayerRef.current = fallback;
        }
      } else {
        setTileError(true);
      }
    });

    baseLayer.on('load', () => {
      setTileError(false);
    });

    baseLayer.addTo(leafletMapRef.current);
    leafletTileLayerRef.current = baseLayer;

    if (config.overlayUrl) {
      const overlay = L.tileLayer(config.overlayUrl, {
        attribution: '',
        maxZoom: config.maxZoom,
      }).addTo(leafletMapRef.current);
      leafletOverlayLayerRef.current = overlay;
    }
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    let active = true;
    if (!mapElement.current) return;

    destroyCurrentMap();

    try {
      const map = L.map(mapElement.current, {
        center: [activeCenter.lat, activeCenter.lng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
      });

      // Add subtle attribution in corner
      L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

      const config = MAP_LAYERS[activeLayerId] || MAP_LAYERS.standard;
      const tileLayer = L.tileLayer(config.url, {
        subdomains: config.subdomains || ['a', 'b', 'c'],
        attribution: config.attribution,
        maxZoom: config.maxZoom,
      });

      tileLayer.on('tileerror', () => {
        if (activeLayerId === 'standard' && !fallbackUsedRef.current) {
          fallbackUsedRef.current = true;
          if (map) {
            tileLayer.remove();
            const fallback = L.tileLayer(
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
              { attribution: 'Tiles &copy; Esri', maxZoom: 19 }
            ).addTo(map);
            leafletTileLayerRef.current = fallback;
          }
        } else {
          setTileError(true);
        }
      });

      tileLayer.on('load', () => {
        setTileError(false);
      });

      tileLayer.addTo(map);
      leafletTileLayerRef.current = tileLayer;

      if (config.overlayUrl) {
        leafletOverlayLayerRef.current = L.tileLayer(config.overlayUrl, {
          attribution: '',
          maxZoom: config.maxZoom,
        }).addTo(map);
      }

      leafletMapRef.current = map;

      map.whenReady(() => {
        if (active) {
          setIsLoaded(true);
          map.invalidateSize();
        }
      });

      // Invalidate multiple times for smooth mobile container layout
      const t1 = setTimeout(() => { if (active && leafletMapRef.current) leafletMapRef.current.invalidateSize(); }, 50);
      const t2 = setTimeout(() => { if (active && leafletMapRef.current) leafletMapRef.current.invalidateSize(); }, 200);
      const t3 = setTimeout(() => { if (active && leafletMapRef.current) leafletMapRef.current.invalidateSize(); }, 500);

      map.on('click', () => {
        setSelectedPinIssue(null);
      });

      const handleResize = () => {
        if (leafletMapRef.current) leafletMapRef.current.invalidateSize();
      };
      window.addEventListener('resize', handleResize);

      return () => {
        active = false;
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        window.removeEventListener('resize', handleResize);
      };
    } catch (err) {
      console.error('Leaflet initialization error:', err);
    }

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update User Marker
  useEffect(() => {
    if (!isLoaded || !userCenter || !leafletMapRef.current) return;
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
  }, [userCenter, isLoaded]);

  // Update Issue Markers
  useEffect(() => {
    if (!isLoaded || !leafletMapRef.current) return;
    const map = leafletMapRef.current;

    leafletMarkersRef.current.forEach((m) => m.remove());
    leafletMarkersRef.current = [];

    visibleIssues.forEach((issue) => {
      const coords = parseCoords(issue.location, issue.latitude, issue.longitude);
      if (!coords) return;

      const statusColor = getMarkerStatusColor(issue.status);
      const iconHtml = createLeafletSvgIconHtml(statusColor, issue.category_id, 32);

      const icon = L.divIcon({
        html: iconHtml,
        className: 'lokify-gis-marker',
        iconSize: [32, 40],
        iconAnchor: [16, 40],
      });

      const marker = L.marker([coords.lat, coords.lng], { icon, title: issue.title }).addTo(map);
      marker.on('click', () => {
        setSelectedPinIssue(issue);
        map.panTo([coords.lat, coords.lng], { animate: true, duration: 0.5 });
      });

      leafletMarkersRef.current.push(marker);
    });
  }, [visibleIssues, isLoaded]);

  // Floating GIS Controls Handlers
  const handleZoomIn = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.zoomOut();
    }
  };

  const handleRecenter = () => {
    const target = userCenter || DEFAULT_COORDS;
    if (onRefreshLocation) {
      onRefreshLocation();
    }
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([target.lat, target.lng], 15, { animate: true });
    }
  };

  const handleResetView = () => {
    const target = activeCenter;
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([target.lat, target.lng], 14, { animate: true });
    }
  };

  return (
    <div className={`relative w-full ${height} overflow-hidden bg-[#080F0F] flex flex-col`}>
      {/* Map DOM Element */}
      <div ref={mapElement} className="w-full h-full absolute inset-0 z-0" aria-label="Lokify GIS Map" />

      {/* Floating Right-Side GIS Control Column - High z-index [1000] */}
      <div className="absolute right-3.5 top-3.5 z-[1000] flex flex-col items-center gap-2 pointer-events-auto">
        {/* Compass / Reset View */}
        <button
          onClick={handleResetView}
          className="w-10 h-10 rounded-2xl bg-[#192223]/95 hover:bg-[#202B2D] text-[#A3DCE3] border border-[#354144] shadow-xl backdrop-blur-md flex items-center justify-center transition active:scale-95"
          title="Reset Orientation / Center"
          aria-label="Reset View"
        >
          <Compass size={18} className="transform hover:rotate-45 transition-transform" />
        </button>

        {/* Map Layers */}
        <button
          onClick={() => setIsLayerSheetOpen(true)}
          className={`w-10 h-10 rounded-2xl border shadow-xl backdrop-blur-md flex items-center justify-center transition active:scale-95 ${
            isLayerSheetOpen || activeLayerId !== 'standard'
              ? 'bg-[#A3DCE3] text-[#080F0F] border-[#A3DCE3]'
              : 'bg-[#192223]/95 hover:bg-[#202B2D] text-[#A3DCE3] border-[#354144]'
          }`}
          title="Map Layers"
          aria-label="Map Layers"
        >
          <Layers size={18} />
        </button>

        {/* My Location */}
        <button
          onClick={handleRecenter}
          className="w-10 h-10 rounded-2xl bg-[#192223]/95 hover:bg-[#202B2D] text-[#A3DCE3] border border-[#354144] shadow-xl backdrop-blur-md flex items-center justify-center transition active:scale-95"
          title="My Location"
          aria-label="My Location"
        >
          <LocateFixed size={18} />
        </button>

        <div className="h-px w-6 bg-[#354144] my-0.5" />

        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 rounded-2xl bg-[#192223]/95 hover:bg-[#202B2D] text-[#A3DCE3] border border-[#354144] shadow-xl backdrop-blur-md flex items-center justify-center transition active:scale-95"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <Plus size={18} />
        </button>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 rounded-2xl bg-[#192223]/95 hover:bg-[#202B2D] text-[#A3DCE3] border border-[#354144] shadow-xl backdrop-blur-md flex items-center justify-center transition active:scale-95"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <Minus size={18} />
        </button>
      </div>

      {/* Tile Loading Error Banner */}
      {tileError && (
        <div className="absolute top-14 left-3 right-16 z-[1001] bg-[#321616]/95 border border-[#5C2424] rounded-xl p-2.5 text-xs text-[#EF6666] flex items-center justify-between shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>Map tile loading error. Check connection.</span>
          </div>
          <button
            onClick={() => switchLayer(activeLayerId)}
            className="px-2 py-1 rounded bg-[#5C2424] hover:bg-[#782D2D] text-[#F0F4F4] font-semibold text-[11px] flex items-center gap-1"
          >
            <RefreshCw size={11} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Selected Issue Preview Card at bottom - High z-index [1001] */}
      {selectedPinIssue && (
        <div className="absolute bottom-4 left-3 right-3 z-[1001] bg-[#192223]/95 backdrop-blur-md border border-[#354144] rounded-2xl p-4 shadow-2xl flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#A3DCE3]">
                {formatIssueId(selectedPinIssue.id)}
              </span>
              <span className="text-xs text-[#758588]">·</span>
              <span className="text-xs font-medium text-[#A5B1B3]">
                {getCategoryName(selectedPinIssue.category_id)}
              </span>
            </div>

            <div className="flex items-center gap-2">
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
              <button
                onClick={() => setSelectedPinIssue(null)}
                className="p-1 text-[#758588] hover:text-[#F0F4F4] rounded-lg hover:bg-[#202B2D] transition"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#F0F4F4] leading-snug">
              {selectedPinIssue.title}
            </h4>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-[#A5B1B3]">
              <span className="flex items-center gap-1 truncate">
                <MapPin size={12} className="text-[#A3DCE3] shrink-0" />
                <span className="truncate">
                  {addresses[selectedPinIssue.id] ||
                    extractLocality(null, selectedPinIssue.latitude, selectedPinIssue.longitude)}
                </span>
              </span>
              {selectedPinIssue.created_at && (
                <span className="flex items-center gap-1 shrink-0 text-[#758588]">
                  <Clock size={11} />
                  <span>{getRelativeTime(selectedPinIssue.created_at)}</span>
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => onSelectIssue && onSelectIssue(selectedPinIssue)}
            className="w-full mt-1 bg-[#A3DCE3] hover:bg-[#85CBD3] text-[#080F0F] text-xs font-bold py-2.5 px-4 rounded-xl transition active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
          >
            <span>View Full Issue Details</span>
            <ArrowUpRight size={15} />
          </button>
        </div>
      )}

      {/* Map Layer Switcher Backdrop & Bottom Sheet - Highest z-index [1002] */}
      {isLayerSheetOpen && (
        <>
          <div
            className="absolute inset-0 z-[1001] bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsLayerSheetOpen(false)}
            aria-label="Close Layer Selector"
          />
          <div className="absolute inset-x-0 bottom-0 z-[1002] bg-[#101819]/95 backdrop-blur-xl border-t border-[#354144] rounded-t-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-250">
          <div className="flex items-center justify-between pb-3 border-b border-[#202B2D] mb-4">
            <div className="flex items-center gap-2">
              <LayersIcon size={18} className="text-[#A3DCE3]" />
              <h3 className="text-sm font-bold text-[#F0F4F4]">Select Map Layer</h3>
            </div>
            <button
              onClick={() => setIsLayerSheetOpen(false)}
              className="w-8 h-8 rounded-full bg-[#192223] text-[#A5B1B3] hover:text-[#F0F4F4] flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-2">
            {Object.values(MAP_LAYERS).map((layer) => {
              const isSelected = activeLayerId === layer.id;
              return (
                <button
                  key={layer.id}
                  onClick={() => {
                    switchLayer(layer.id);
                    setIsLayerSheetOpen(false);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] flex flex-col justify-between h-28 relative overflow-hidden ${
                    isSelected
                      ? 'bg-[#192223] border-[#A3DCE3] shadow-[0_0_15px_rgba(163,220,227,0.15)] ring-1 ring-[#A3DCE3]'
                      : 'bg-[#192223]/60 border-[#354144] hover:border-[#758588]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 w-full">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                        isSelected ? 'bg-[#A3DCE3] text-[#080F0F]' : 'bg-[#202B2D] text-[#A5B1B3]'
                      }`}
                    >
                      {layer.badge}
                    </span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#A3DCE3] text-[#080F0F] flex items-center justify-center">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  <div className="mt-2">
                    <h4
                      className={`text-xs font-bold leading-tight ${
                        isSelected ? 'text-[#A3DCE3]' : 'text-[#F0F4F4]'
                      }`}
                    >
                      {layer.name}
                    </h4>
                    <p className="text-[10px] text-[#758588] line-clamp-2 mt-0.5">
                      {layer.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </>
    )}
    </div>
  );
}
