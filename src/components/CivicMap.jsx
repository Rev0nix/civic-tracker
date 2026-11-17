import { useEffect, useMemo, useRef, useState } from 'react';
import { Layers, LocateFixed, MapPin, ArrowUpRight, X, Navigation } from 'lucide-react';
import { loadGoogleMaps } from '../googleMaps';

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 }; // Bangalore coordinates

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
  categoryNames = {},
  onSelectIssue,
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
  const [selectedIssue, setSelectedIssue] = useState(null);

  const userCenter = useMemo(() => {
    if (latitude != null && longitude != null && !isNaN(latitude) && !isNaN(longitude)) {
      return { lat: Number(latitude), lng: Number(longitude) };
    }
    return null;
  }, [latitude, longitude]);

  // Initialize Map
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

        // Map click dismisses the floating issue card
        maps.event.addListener(map, 'click', () => {
          setSelectedIssue(null);
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
        title: 'Your Location',
        zIndex: 999,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
      });
    }
  }, [userCenter, isLoaded]);

  // Filter issues based on selectedFilter
  const visibleIssues = useMemo(() => {
    return issues.filter((issue) => {
      const isResolved = issue.status === 'Resolved';
      if (selectedFilter === 'Active') return !isResolved;
      if (selectedFilter === 'Resolved') return isResolved;
      return true;
    });
  }, [issues, selectedFilter]);

  // Keep selected issue only if visible in current filter
  const activeSelectedIssue = useMemo(() => {
    if (!selectedIssue) return null;
    return visibleIssues.find((i) => i.id === selectedIssue.id) || null;
  }, [selectedIssue, visibleIssues]);

  // Update issue markers when visibleIssues change
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
      let pinColor = '#ea580c'; // default Active orange
      if (isResolved) {
        pinColor = '#16a34a'; // Resolved green
      } else if (issue.category_id === 1) {
        pinColor = '#f43f5e'; // Roads - rose
      } else if (issue.category_id === 2) {
        pinColor = '#f59e0b'; // Lighting - amber
      } else if (issue.category_id === 3) {
        pinColor = '#06b6d4'; // Water - cyan
      } else if (issue.category_id === 4) {
        pinColor = '#a855f7'; // Sanitation - purple
      }

      const marker = new maps.Marker({
        position: coords,
        map,
        title: `${issue.title} (#${issue.id})`,
        icon: {
          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
          fillColor: pinColor,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
          scale: 1.5,
          anchor: new maps.Point(12, 22),
        },
      });

      marker.addListener('click', () => {
        setSelectedIssue(issue);
        map.panTo(coords);
      });

      markersRef.current.push(marker);
    });
  }, [visibleIssues, isLoaded]);

  // Toggle Satellite / Roadmap
  const handleToggleSatellite = () => {
    if (!mapInstanceRef.current || !mapsSdkRef.current) return;
    const next = !isSatellite;
    setIsSatellite(next);
    mapInstanceRef.current.setMapTypeId(
      next ? mapsSdkRef.current.MapTypeId.HYBRID : mapsSdkRef.current.MapTypeId.ROADMAP
    );
  };

  // Recenter map
  const handleRecenter = () => {
    if (!mapInstanceRef.current || !mapsSdkRef.current) return;
    const map = mapInstanceRef.current;
    const maps = mapsSdkRef.current;

    if (activeSelectedIssue) {
      const coords = parseCoords(
        activeSelectedIssue.location,
        activeSelectedIssue.latitude,
        activeSelectedIssue.longitude
      );
      if (coords) {
        map.panTo(coords);
        map.setZoom(16);
        return;
      }
    }

    if (userCenter) {
      map.panTo(userCenter);
      map.setZoom(15);
      return;
    }

    // Fit bounds of all issue pins
    if (markersRef.current.length > 0) {
      const bounds = new maps.LatLngBounds();
      markersRef.current.forEach((m) => bounds.extend(m.getPosition()));
      map.fitBounds(bounds);
      return;
    }

    map.panTo(DEFAULT_CENTER);
    map.setZoom(13);
  };

  // Counts for filter pills
  const totalCount = issues.length;
  const activeCount = issues.filter((i) => i.status !== 'Resolved').length;
  const resolvedCount = issues.filter((i) => i.status === 'Resolved').length;

  const selectedCoords = activeSelectedIssue
    ? parseCoords(
        activeSelectedIssue.location,
        activeSelectedIssue.latitude,
        activeSelectedIssue.longitude
      )
    : null;

  return (
    <div className="relative w-full h-[460px] rounded-3xl overflow-hidden shadow-lg border border-slate-200/90 bg-slate-100 flex flex-col">
      {/* Map Canvas */}
      <div ref={mapElement} className="w-full h-full min-h-[460px]" aria-label="Interactive Civic Map" />

      {mapError && (
        <div className="absolute bottom-4 left-4 right-4 z-30 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl shadow-lg">
          {mapError}
        </div>
      )}

      {/* Top Filter Chips Bar */}
      <div className="absolute top-3 left-3 right-16 z-10 flex items-center gap-2 overflow-x-auto no-scrollbar pointer-events-auto py-1">
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
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold shadow-md backdrop-blur-md transition-all whitespace-nowrap border ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-slate-900/25 scale-105'
                  : 'bg-white/95 text-slate-700 hover:bg-white border-white/80 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Top Right Map Action Buttons */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        {/* Satellite / Roadmap Toggle */}
        <button
          onClick={handleToggleSatellite}
          title={isSatellite ? 'Switch to Standard Map' : 'Switch to Satellite View'}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md transition border active:scale-95 ${
            isSatellite
              ? 'bg-indigo-600 text-white border-indigo-500 ring-2 ring-indigo-300'
              : 'bg-white/95 text-slate-700 hover:bg-white border-slate-200 hover:text-indigo-600'
          }`}
        >
          <Layers size={18} />
        </button>

        {/* Recenter Button */}
        <button
          onClick={handleRecenter}
          title="Recenter Map"
          className="w-10 h-10 rounded-full bg-white/95 text-slate-700 hover:bg-white flex items-center justify-center shadow-lg backdrop-blur-md transition border border-slate-200 hover:text-indigo-600 active:scale-95"
        >
          <LocateFixed size={18} />
        </button>
      </div>

      {/* Bottom Floating Issue Details Card */}
      {activeSelectedIssue && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-4 z-20 pointer-events-auto transition-all duration-200 ease-out">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-4 max-w-lg mx-auto">
            {/* Header: Ticket ID + Status badge + Close button */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                  #{activeSelectedIssue.id}
                </span>

                <span
                  className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                    activeSelectedIssue.status === 'Resolved'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : activeSelectedIssue.status === 'In Progress'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      activeSelectedIssue.status === 'Resolved'
                        ? 'bg-emerald-600'
                        : activeSelectedIssue.status === 'In Progress'
                        ? 'bg-amber-600'
                        : 'bg-blue-600'
                    }`}
                  />
                  {activeSelectedIssue.status || 'Submitted'}
                </span>

                {activeSelectedIssue.category_id && categoryNames[activeSelectedIssue.category_id] && (
                  <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    {categoryNames[activeSelectedIssue.category_id]}
                  </span>
                )}
              </div>

              <button
                onClick={() => setSelectedIssue(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
                aria-label="Close preview"
              >
                <X size={15} />
              </button>
            </div>

            {/* Title */}
            <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug line-clamp-1 mb-1">
              {activeSelectedIssue.title}
            </h3>

            {/* Address */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
              <MapPin size={13} className="text-indigo-600 shrink-0" />
              <span className="truncate">
                {addresses[activeSelectedIssue.id] ||
                  (selectedCoords
                    ? `Lat: ${selectedCoords.lat.toFixed(5)}, Lng: ${selectedCoords.lng.toFixed(5)}`
                    : 'Location attached')}
              </span>
            </div>

            {/* Actions: View Details + Directions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              {onSelectIssue && (
                <button
                  onClick={() => onSelectIssue(activeSelectedIssue)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black py-2 px-3 rounded-xl transition flex items-center justify-center gap-1 shadow-md shadow-indigo-200 active:scale-95"
                >
                  <span>View Details</span>
                  <ArrowUpRight size={14} />
                </button>
              )}

              {selectedCoords && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedCoords.lat},${selectedCoords.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl transition flex items-center gap-1 active:scale-95"
                  title="Open in Google Maps navigation"
                >
                  <Navigation size={13} />
                  <span>Directions</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
