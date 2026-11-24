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
    <div className="fixed inset-0 z-50 bg-[#080F0F]/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div
        className="bg-[#101819] border border-[#354144] rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-5 sm:p-7 shadow-2xl relative animate-in fade-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5 pb-4 border-b border-[#354144]">
          <div>
            <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-[#758588] block mb-1">
              NEW REPORT
            </span>
            <h2 className="text-2xl font-black text-[#F0F4F4] tracking-tight">
              Report an issue
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-[#192223] hover:bg-[#202B2D] border border-[#354144] text-[#A5B1B3] hover:text-[#F0F4F4] flex items-center justify-center transition active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Validation Alert */}
        {validationError && (
          <div className="mb-5 p-3.5 bg-[#321616] border border-[#5C2424] rounded-2xl text-xs text-[#EF6666] flex items-center gap-2 font-mono">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-5">
          {/* 1. Photo Upload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#A5B1B3]">
                Photo Proof <span className="text-[#EF6666]">*</span>
              </label>
              <span className="text-[11px] text-[#758588] font-mono">
                Required for verification
              </span>
            </div>

            {imagePreview ? (
              <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-[#354144] bg-[#080F0F]">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#080F0F]/80 backdrop-blur-md text-[#F0F4F4] hover:text-[#EF6666] border border-[#354144] flex items-center justify-center transition"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => fileInputCamera.current?.click()}
                  className="h-28 rounded-2xl border border-dashed border-[#354144] hover:border-[#A3DCE3] bg-[#192223] hover:bg-[#202B2D] flex flex-col items-center justify-center gap-2 text-[#A5B1B3] hover:text-[#A3DCE3] transition active:scale-98"
                >
                  <div className="w-10 h-10 rounded-full bg-[#132B2F] border border-[#28616A] text-[#A3DCE3] flex items-center justify-center">
                    <Camera size={18} />
                  </div>
                  <span className="text-xs font-mono font-medium">Take Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputGallery.current?.click()}
                  className="h-28 rounded-2xl border border-dashed border-[#354144] hover:border-[#A3DCE3] bg-[#192223] hover:bg-[#202B2D] flex flex-col items-center justify-center gap-2 text-[#A5B1B3] hover:text-[#A3DCE3] transition active:scale-98"
                >
                  <div className="w-10 h-10 rounded-full bg-[#132B2F] border border-[#28616A] text-[#A3DCE3] flex items-center justify-center">
                    <ImageIcon size={18} />
                  </div>
                  <span className="text-xs font-mono font-medium">Add Photo</span>
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
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#A5B1B3] mb-2">
              Issue Title <span className="text-[#EF6666]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Deep pothole near 2nd Avenue bus stop"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#192223] border border-[#354144] focus:border-[#A3DCE3] text-[#F0F4F4] placeholder-[#758588] text-sm px-4 py-3 rounded-xl focus:outline-none transition font-medium"
              required
            />
          </div>

          {/* 3. Category Selection (Chips) */}
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#A5B1B3] mb-2">
              Category <span className="text-[#EF6666]">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORY_CHIPS.map((cat) => {
                const Icon = cat.icon;
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-mono transition text-left ${
                      isSelected
                        ? 'bg-[#315C60] border-[#A3DCE3] text-[#A3DCE3] font-semibold'
                        : 'bg-[#192223] border-[#354144] text-[#A5B1B3] hover:text-[#F0F4F4] hover:border-[#758588]'
                    }`}
                  >
                    <Icon size={14} className={isSelected ? 'text-[#A3DCE3]' : 'text-[#758588]'} />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Description with Character Counter */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#A5B1B3]">
                Description
              </label>
              <span
                className={`text-[11px] font-mono ${
                  description.length >= 480 ? 'text-[#EF6666]' : 'text-[#758588]'
                }`}
              >
                {description.length}/500
              </span>
            </div>
            <textarea
              placeholder="Describe the problem, safety hazards, or landmark details..."
              maxLength={500}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#192223] border border-[#354144] focus:border-[#A3DCE3] text-[#F0F4F4] placeholder-[#758588] text-sm p-3.5 rounded-xl focus:outline-none transition leading-relaxed"
            />
          </div>

          {/* 5. Notifications Binding: Phone (SMS) & Gmail */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#A5B1B3] block mb-1.5 flex items-center gap-1">
                <Phone size={12} className="text-[#A3DCE3]" />
                <span>SMS Alerts Phone</span>
              </label>
              <input
                type="tel"
                placeholder="Mobile number for SMS"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                className="w-full bg-[#192223] border border-[#354144] focus:border-[#A3DCE3] text-xs text-[#F0F4F4] placeholder-[#758588] px-3.5 py-2.5 rounded-xl focus:outline-none transition font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#A5B1B3] block mb-1.5 flex items-center gap-1">
                <Mail size={12} className="text-[#A3DCE3]" />
                <span>Resolution Email</span>
              </label>
              <input
                type="email"
                placeholder="Email for dispatch notification"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full bg-[#192223] border border-[#354144] focus:border-[#A3DCE3] text-xs text-[#F0F4F4] placeholder-[#758588] px-3.5 py-2.5 rounded-xl focus:outline-none transition font-medium"
              />
            </div>
          </div>

          {/* 6. Issue Location & Satellite Map Tab */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#A5B1B3] flex items-center gap-1.5">
                <MapPin size={13} className="text-[#A3DCE3]" />
                <span>Issue Location & Map Pin <span className="text-[#EF6666]">*</span></span>
              </label>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#112C20] text-[#43C88A] border border-[#1D5C3F]">
                SATELLITE VIEW
              </span>
            </div>

            {/* Interactive Satellite Map Canvas */}
            <div className="relative w-full h-52 sm:h-60 rounded-2xl overflow-hidden border border-[#354144] bg-[#080F0F] mb-1 shadow-lg">
              <div ref={mapContainerRef} className="w-full h-full" />

              {/* Single Floating Button on Map: Live GPS Locate & Recenter */}
              <div className="absolute top-2.5 right-2.5 z-10">
                <button
                  type="button"
                  onClick={handleGpsRefresh}
                  disabled={isLocating}
                  className="w-9 h-9 rounded-xl bg-[#101819]/95 hover:bg-[#192223] backdrop-blur-md border border-[#354144] hover:border-[#A3DCE3] text-[#A3DCE3] flex items-center justify-center shadow-lg active:scale-95 transition disabled:opacity-60"
                  title="Refresh GPS & Recenter Map"
                  aria-label="Refresh GPS"
                >
                  <LocateFixed size={18} className={isLocating ? 'animate-spin text-[#43C88A]' : ''} />
                </button>
              </div>

              {/* Live Pin & Locality Address Bar */}
              <div className="absolute bottom-2 left-2 right-2 z-10 bg-[#101819]/95 backdrop-blur-md border border-[#354144] px-3 py-2 rounded-xl flex items-center gap-2 text-xs shadow-md">
                <div className={`w-2.5 h-2.5 rounded-full ${isLocating ? 'bg-[#A3DCE3] animate-ping' : 'bg-[#43C88A] animate-pulse'} shrink-0`} />
                <div className="min-w-0 flex-1">
                  <span className="text-[#F0F4F4] font-medium block truncate text-[11px]">
                    {isLocating ? 'Acquiring high-accuracy GPS...' : (geocodedAddress || 'Locating address...')}
                  </span>
                  <span className="text-[#758588] text-[10px] font-mono block">
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
              className="w-full bg-[#A3DCE3] hover:bg-[#85CBD3] text-[#080F0F] font-bold text-sm py-4 px-6 rounded-2xl shadow-xl shadow-[#A3DCE3]/20 transition-all duration-200 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-[#A3DCE3]"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Posting report...</span>
                </>
              ) : (
                <span>Post report</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
