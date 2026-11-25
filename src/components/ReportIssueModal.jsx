import { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Image as ImageIcon,
  MapPin,
  RefreshCw,
  AlertTriangle,
  Car,
  Lightbulb,
  Trash2,
  Droplets,
  Waves,
  ShieldAlert,
  HelpCircle,
  Phone,
  Mail,
  LocateFixed,
} from 'lucide-react';
import L from 'leaflet';
import {
  reverseGeocodeUnified,
  LOKIFY_SATELLITE_TILE_URL,
  LOKIFY_SATELLITE_LABELS_URL,
  LOKIFY_SATELLITE_ATTRIBUTION,
  createLeafletSvgIconHtml,
} from '../services/mapEngine';

const CATEGORY_CHIPS = [
  { id: '1', label: 'Pothole', icon: Car },
  { id: '2', label: 'Streetlight', icon: Lightbulb },
  { id: '3', label: 'Garbage', icon: Trash2 },
  { id: '4', label: 'Water & Sewage', icon: Droplets },
  { id: '5', label: 'Drainage', icon: Waves },
  { id: '6', label: 'Road Damage', icon: AlertTriangle },
  { id: '7', label: 'Public Safety', icon: ShieldAlert },
  { id: '8', label: 'Other', icon: HelpCircle },
];

export default function ReportIssueModal({
  isOpen,
  onClose,
  onSubmit,
  currentLocation,
  onRefreshLocation,
  initialEmail = '',
  initialPhone = '',
}) {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('1');
  const [description, setDescription] = useState('');
  const [userEmail, setUserEmail] = useState(initialEmail);
  const [userPhone, setUserPhone] = useState(initialPhone);
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Map & Pin Location State
  const [customCoords, setCustomCoords] = useState(null);
  const activeCoords = customCoords || currentLocation || { lat: 12.9716, lng: 77.5946 };
  const [geocodedAddress, setGeocodedAddress] = useState('');

  const fileInputCamera = useRef(null);
  const fileInputGallery = useRef(null);
  const mapContainerRef = useRef(null);

  const leafletMapRef = useRef(null);
  const leafletMarkerRef = useRef(null);

  // Synchronize GPS location when updated from parent
  useEffect(() => {
    if (currentLocation && !customCoords) {
      if (leafletMarkerRef.current) {
        leafletMarkerRef.current.setLatLng([currentLocation.lat, currentLocation.lng]);
      }
      if (leafletMapRef.current) {
        leafletMapRef.current.setView([currentLocation.lat, currentLocation.lng], 16);
      }
      reverseGeocodeUnified(currentLocation.lat, currentLocation.lng).then((addr) => {
        setGeocodedAddress(addr);
      });
    }
  }, [currentLocation, customCoords]);

  // Functional GPS Refresh Button
  const handleGpsRefresh = () => {
    setIsLocating(true);
    if (onRefreshLocation) {
      onRefreshLocation();
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const fresh = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCustomCoords(fresh);
          if (leafletMarkerRef.current) {
            leafletMarkerRef.current.setLatLng([fresh.lat, fresh.lng]);
          }
          if (leafletMapRef.current) {
            leafletMapRef.current.setView([fresh.lat, fresh.lng], 17, { animate: true });
          }
          try {
            const addr = await reverseGeocodeUnified(fresh.lat, fresh.lng);
            setGeocodedAddress(addr);
          } catch {
            setGeocodedAddress('Current GPS Location');
          }
          setIsLocating(false);
        },
        (err) => {
          console.warn('GPS refresh error:', err);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setIsLocating(false);
    }
  };

  // Initialize Interactive Map (Leaflet)
  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;
      mapContainerRef.current.innerHTML = '';

      const initial = activeCoords;

      try {
        const lmap = L.map(mapContainerRef.current, {
          center: [initial.lat, initial.lng],
          zoom: 17,
          zoomControl: false,
        });

        // 1. High-resolution Satellite Imagery (report page only)
        L.tileLayer(LOKIFY_SATELLITE_TILE_URL, {
          attribution: LOKIFY_SATELLITE_ATTRIBUTION,
          maxZoom: 19,
        }).addTo(lmap);

        // 2. High-contrast road & place label overlay on satellite
        L.tileLayer(LOKIFY_SATELLITE_LABELS_URL, {
          maxZoom: 19,
        }).addTo(lmap);

        leafletMapRef.current = lmap;

        const icon = L.divIcon({
          html: createLeafletSvgIconHtml('#EF6666', 36),
          className: 'custom-leaflet-pin',
          iconSize: [36, 36],
          iconAnchor: [18, 36],
        });

        const marker = L.marker([initial.lat, initial.lng], {
          icon,
          draggable: false, // Pin is locked to GPS location
        }).addTo(lmap);
        leafletMarkerRef.current = marker;

        reverseGeocodeUnified(initial.lat, initial.lng).then((addr) => {
          if (active) setGeocodedAddress(addr);
        });
      } catch (e) {
        console.error('Leaflet modal init error:', e);
      }
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFile = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setImagePreview(URL.createObjectURL(selected));
      setValidationError('');
    }
  };

  const removePhoto = () => {
    setFile(null);
    setImagePreview(null);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!title.trim()) {
      setValidationError('Please enter an issue title.');
      return;
    }
    if (!categoryId) {
      setValidationError('Please select an issue category.');
      return;
    }
    const finalLocation = activeCoords;
    if (!file) {
      setValidationError('Photo proof is required. Reports with photos are verified 3x faster.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        categoryId,
        description: description.trim(),
        userEmail: userEmail.trim() || initialEmail,
        userPhone: userPhone.trim() || initialPhone,
        file,
        location: finalLocation,
      });
      onClose();
    } catch (err) {
      setValidationError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0D1117]/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div
        className="bg-[#161B22] border border-[#30363D] rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl relative animate-in fade-in slide-in-from-bottom-3 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4 pb-3 border-b border-[#30363D]">
          <div>
            <h2 className="text-xl font-bold text-[#F0F6FC] tracking-tight">
              Report an issue
            </h2>
            <p className="text-xs text-[#8B949E] mt-0.5">
              Submit photo proof and location for ward remediation
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] flex items-center justify-center transition active:scale-95"
          >
            <X size={16} />
          </button>
        </div>

        {/* Validation Alert */}
        {validationError && (
          <div className="mb-4 p-3 bg-[#321616] border border-[#5C2424] rounded-xl text-xs text-[#F85149] flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* 1. Photo Upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#F0F6FC]">
                Photo proof <span className="text-[#F85149]">*</span>
              </label>
              <span className="text-[11px] text-[#8B949E]">
                Required for quick verification
              </span>
            </div>

            {imagePreview ? (
              <div className="relative w-full h-44 rounded-xl overflow-hidden border border-[#30363D] bg-[#0D1117]">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-[#0D1117]/80 backdrop-blur-md text-[#F0F6FC] hover:text-[#F85149] border border-[#30363D] flex items-center justify-center transition"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputCamera.current?.click()}
                  className="h-24 rounded-xl border border-dashed border-[#30363D] hover:border-[#58A6FF] bg-[#0D1117]/60 hover:bg-[#21262D]/60 flex flex-col items-center justify-center gap-1.5 text-[#8B949E] hover:text-[#58A6FF] transition active:scale-98"
                >
                  <div className="w-8 h-8 rounded-full bg-[#21262D] text-[#58A6FF] flex items-center justify-center">
                    <Camera size={16} />
                  </div>
                  <span className="text-xs font-medium">Take Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputGallery.current?.click()}
                  className="h-24 rounded-xl border border-dashed border-[#30363D] hover:border-[#58A6FF] bg-[#0D1117]/60 hover:bg-[#21262D]/60 flex flex-col items-center justify-center gap-1.5 text-[#8B949E] hover:text-[#58A6FF] transition active:scale-98"
                >
                  <div className="w-8 h-8 rounded-full bg-[#21262D] text-[#58A6FF] flex items-center justify-center">
                    <ImageIcon size={16} />
                  </div>
                  <span className="text-xs font-medium">Choose from Gallery</span>
                </button>
              </div>
            )}

            <input
              ref={fileInputCamera}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              className="hidden"
            />
            <input
              ref={fileInputGallery}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
            />
          </div>

          {/* 2. Issue Title */}
          <div>
            <label className="block text-xs font-semibold text-[#F0F6FC] mb-1.5">
              Issue Title <span className="text-[#F85149]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Broken streetlight or deep pothole"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#0D1117] border border-[#30363D] focus:border-[#58A6FF] text-[#F0F6FC] placeholder-[#8B949E] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition font-medium"
              required
            />
          </div>

          {/* 3. Category Selection (Small Toggle Chips) */}
          <div>
            <label className="block text-xs font-semibold text-[#F0F6FC] mb-1.5">
              Category <span className="text-[#F85149]">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {CATEGORY_CHIPS.map((cat) => {
                const Icon = cat.icon;
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs transition text-left active:scale-95 ${
                      isSelected
                        ? 'bg-[#1F6FEB]/15 border-[#58A6FF] text-[#58A6FF] font-semibold'
                        : 'bg-[#0D1117] border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] hover:border-[#444C56]'
                    }`}
                  >
                    <Icon size={13} className={isSelected ? 'text-[#58A6FF]' : 'text-[#8B949E]'} />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#F0F6FC]">
                Description
              </label>
              <span className={`text-[11px] ${description.length >= 480 ? 'text-[#F85149]' : 'text-[#8B949E]'}`}>
                {description.length}/500
              </span>
            </div>
            <textarea
              placeholder="Add details, landmarks, or specific hazards..."
              maxLength={500}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0D1117] border border-[#30363D] focus:border-[#58A6FF] text-[#F0F6FC] placeholder-[#8B949E] text-xs p-3 rounded-xl focus:outline-none transition leading-relaxed resize-none"
            />
          </div>

          {/* 5. Contact Info for Updates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-medium text-[#8B949E] block mb-1 flex items-center gap-1">
                <Phone size={11} className="text-[#58A6FF]" />
                <span>Phone (SMS Updates)</span>
              </label>
              <input
                type="tel"
                placeholder="Mobile number for SMS"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                className="w-full bg-[#0D1117] border border-[#30363D] focus:border-[#58A6FF] text-xs text-[#F0F6FC] placeholder-[#8B949E] px-3 py-2 rounded-xl focus:outline-none transition font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#8B949E] block mb-1 flex items-center gap-1">
                <Mail size={11} className="text-[#58A6FF]" />
                <span>Email (Optional)</span>
              </label>
              <input
                type="email"
                placeholder="Email address"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full bg-[#0D1117] border border-[#30363D] focus:border-[#58A6FF] text-xs text-[#F0F6FC] placeholder-[#8B949E] px-3 py-2 rounded-xl focus:outline-none transition font-medium"
              />
            </div>
          </div>

          {/* 6. Issue Location & Satellite Map */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#F0F6FC] flex items-center gap-1">
                <MapPin size={12} className="text-[#58A6FF]" />
                <span>Location <span className="text-[#F85149]">*</span></span>
              </label>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#238636]/15 text-[#3FB950] border border-[#238636]/40">
                Satellite View
              </span>
            </div>

            {/* Interactive Satellite Map Canvas */}
            <div className="relative w-full h-48 sm:h-52 rounded-xl overflow-hidden border border-[#30363D] bg-[#0D1117] mb-1 shadow-sm">
              <div ref={mapContainerRef} className="w-full h-full" />

              {/* Single Floating Button on Map: Live GPS Locate & Recenter */}
              <div className="absolute top-2 right-2 z-10">
                <button
                  type="button"
                  onClick={handleGpsRefresh}
                  disabled={isLocating}
                  className="w-8 h-8 rounded-lg bg-[#161B22]/95 hover:bg-[#21262D] backdrop-blur-md border border-[#30363D] text-[#58A6FF] flex items-center justify-center shadow-md active:scale-95 transition disabled:opacity-60"
                  title="Refresh GPS"
                  aria-label="Refresh GPS"
                >
                  <LocateFixed size={15} className={isLocating ? 'animate-spin text-[#3FB950]' : ''} />
                </button>
              </div>

              {/* Live Pin & Locality Address Bar */}
              <div className="absolute bottom-2 left-2 right-2 z-10 bg-[#161B22]/95 backdrop-blur-md border border-[#30363D] px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-xs shadow-md">
                <div className={`w-2 h-2 rounded-full ${isLocating ? 'bg-[#58A6FF] animate-ping' : 'bg-[#3FB950] animate-pulse'} shrink-0`} />
                <div className="min-w-0 flex-1">
                  <span className="text-[#F0F6FC] font-medium block truncate text-[11px]">
                    {isLocating ? 'Acquiring high accuracy GPS...' : (geocodedAddress || 'Locating address...')}
                  </span>
                  <span className="text-[#8B949E] text-[10px] block">
                    {activeCoords.lat.toFixed(5)}, {activeCoords.lng.toFixed(5)} · GPS locked
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 7. Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#1F6FEB] hover:bg-[#388BFD] text-white font-semibold text-xs py-3 px-4 rounded-xl shadow-sm transition active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Submitting report...</span>
                </>
              ) : (
                <span>Submit Report</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
