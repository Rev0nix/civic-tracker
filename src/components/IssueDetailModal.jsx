import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  MapPin,
  ThumbsUp,
  Share2,
  Bookmark,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  Phone,
  Mail,
} from 'lucide-react';
import {
  STATUS_CONFIG,
  formatIssueId,
  getCategoryName,
  getRelativeTime,
  getCategoryIllustration,
} from '../constants/theme';
import { extractLocality } from '../googleMaps';
import L from 'leaflet';
import {
  LOKIFY_DARK_TILE_URL,
  createLeafletSvgIconHtml,
} from '../services/mapEngine';
import AppLogo from './AppLogo';

export default function IssueDetailModal({
  issue,
  onClose,
  addressText,
  onUpvote,
  isUpvoted = false,
  onShare,
  onConfirmFixed,
}) {
  const [isFollowed, setIsFollowed] = useState(false);
  const [confirmedStatus, setConfirmedStatus] = useState(null); // 'confirmed' | 'disputed'
  const previewMapRef = useRef(null);

  // Parse location coordinates
  let coords = null;
  if (issue?.location) {
    if (typeof issue.location === 'object' && issue.location.coordinates) {
      coords = { lng: issue.location.coordinates[0], lat: issue.location.coordinates[1] };
    } else if (typeof issue.location === 'string') {
      const match = issue.location.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (match) {
        coords = { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
      }
    }
  }
  if (!coords && issue?.latitude && issue?.longitude) {
    coords = { lat: Number(issue.latitude), lng: Number(issue.longitude) };
  }

  // Initialize Mini Map Preview
  useEffect(() => {
    if (!issue || !coords) return;
    let active = true;

    const timer = setTimeout(() => {
      if (!previewMapRef.current) return;
      previewMapRef.current.innerHTML = '';

      const initLeaflet = () => {
        if (!active || !previewMapRef.current) return;
        try {
          const lmap = L.map(previewMapRef.current, {
            center: [coords.lat, coords.lng],
            zoom: 16,
            zoomControl: false,
            attributionControl: false,
          });
          L.tileLayer(LOKIFY_DARK_TILE_URL, { maxZoom: 19 }).addTo(lmap);
          const icon = L.divIcon({
            html: createLeafletSvgIconHtml(issue.status === 'Resolved' ? '#43C88A' : '#EF6666', 30),
            className: 'custom-leaflet-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 30],
          });
          L.marker([coords.lat, coords.lng], { icon }).addTo(lmap);
        } catch (e) {
          console.warn('Leaflet detail modal init error:', e);
        }
      };

      initLeaflet();
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [issue, coords]);

  if (!issue) return null;

  const statusCfg = STATUS_CONFIG[issue.status] || STATUS_CONFIG.Open;
  const formattedId = formatIssueId(issue.id);
  const categoryLabel = getCategoryName(issue.category_id);
  const relativeTime = getRelativeTime(issue.created_at);
  const imageSrc = issue.photo_url || getCategoryIllustration(issue.category_id);

  const googleMapsUrl = coords ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}` : null;
  const localityName = addressText
    ? extractLocality(addressText)
    : extractLocality(null, coords?.lat, coords?.lng);

  // Vertical timeline milestones calculation
  const timelineSteps = [
    { key: 'Open', label: 'Open', timestamp: 'Report logged & time-stamped' },
    { key: 'Acknowledged', label: 'Acknowledged', timestamp: 'Verified by ward monitoring cell' },
    { key: 'Assigned', label: 'Assigned', timestamp: 'Dispatched to zonal maintenance contractor' },
    { key: 'In Progress', label: 'In Progress', timestamp: 'On-site remediation underway' },
    { key: 'Resolved', label: 'Resolved', timestamp: 'Work completed & signed off' },
  ];

  const getStepState = (stepKey) => {
    const order = ['Open', 'Acknowledged', 'Assigned', 'In Progress', 'Resolved'];
    const currentStatus = issue.status === 'Submitted' ? 'Open' : issue.status;
    const currentIdx = order.indexOf(currentStatus);
    const stepIdx = order.indexOf(stepKey);

    if (currentIdx === -1) return 'pending';
    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'active';
    return 'pending';
  };

  const isResolved = issue.status === 'Resolved';

  return (
    <div className="fixed inset-0 z-50 bg-[#080F0F]/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div
        className="bg-[#101819] border border-[#354144] rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Navigation Top Header */}
        <div className="sticky top-0 z-20 bg-[#101819]/90 backdrop-blur-md px-5 py-3.5 border-b border-[#354144] flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-xs font-mono font-semibold text-[#A5B1B3] hover:text-[#F0F4F4] transition active:scale-95"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <span className="text-xs font-mono font-bold text-[#A3DCE3]">
            {formattedId}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onShare && onShare(issue)}
              className="p-2 rounded-xl bg-[#192223] border border-[#354144] text-[#A5B1B3] hover:text-[#A3DCE3] transition active:scale-95"
              title="Share"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#192223] border border-[#354144] text-[#A5B1B3] hover:text-[#F0F4F4] transition active:scale-95"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Hero Media Preview */}
        <div className="relative w-full h-64 sm:h-72 bg-[#080F0F] shrink-0 overflow-hidden">
          <img
            src={imageSrc}
            alt={issue.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101819] via-transparent to-black/30" />

          {/* Status Badge Over Image */}
          <div className="absolute bottom-4 left-5">
            <span
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold backdrop-blur-md border shadow-lg"
              style={{
                color: statusCfg.color,
                backgroundColor: `${statusCfg.bg}EE`,
                borderColor: statusCfg.border,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: statusCfg.dot }}
              />
              {statusCfg.label}
            </span>
          </div>
        </div>

        {/* Detail Content Container */}
        <div className="p-5 sm:p-7 space-y-6 flex-1">
          {/* Main Title & Meta */}
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#758588] mb-2">
              <span className="text-[#A3DCE3] font-bold">{formattedId}</span>
              <span>·</span>
              <span className="text-[#A5B1B3]">{categoryLabel}</span>
              <span>·</span>
              <span>{relativeTime}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F0F4F4] leading-snug">
              {issue.title}
            </h1>
          </div>

          {/* Status Timeline */}
          <section className="bg-[#192223] border border-[#354144] rounded-3xl p-5">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#758588] mb-4">
              STATUS TIMELINE
            </h3>

            <div className="space-y-4 relative pl-2">
              {timelineSteps.map((step, idx) => {
                const state = getStepState(step.key);
                if (step.key === 'Resolved' && !isResolved && state !== 'active') {
                  // Only show resolved milestone if completed or active
                  return null;
                }

                const isCompleted = state === 'completed';
                const isActive = state === 'active';

                return (
                  <div key={step.key} className="flex items-start gap-3.5 relative">
                    {/* Connecting Line */}
                    {idx < timelineSteps.length - 1 && (
                      <div
                        className={`absolute left-3.5 top-7 bottom-0 w-0.5 -translate-x-1/2 ${
                          isCompleted ? 'bg-[#A3DCE3]' : 'bg-[#354144]'
                        }`}
                      />
                    )}

                    {/* Step Icon */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 text-xs font-mono transition-all ${
                        isActive
                          ? 'bg-[#A3DCE3] text-[#080F0F] ring-4 ring-[#A3DCE3]/20 font-bold'
                          : isCompleted
                          ? 'bg-[#132B2F] border border-[#28616A] text-[#A3DCE3]'
                          : 'bg-[#101819] border border-[#354144] text-[#758588]'
                      }`}
                    >
                      {isCompleted ? '✓' : idx + 1}
                    </div>

                    {/* Step Label */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-mono font-bold ${
                            isActive
                              ? 'text-[#A3DCE3]'
                              : isCompleted
                              ? 'text-[#F0F4F4]'
                              : 'text-[#758588]'
                          }`}
                        >
                          {step.label}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-mono text-[#A3DCE3] bg-[#132B2F] border border-[#28616A] px-2 py-0.5 rounded-full">
                            Current Stage
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#A5B1B3] mt-0.5 leading-relaxed">
                        {step.timestamp}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Location Section */}
          <section className="bg-[#192223] border border-[#354144] rounded-3xl p-5">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#758588] mb-3">
              LOCATION & MAP PIN
            </h3>

            {/* Embedded Mini Google Map */}
            {coords && (
              <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-[#354144] bg-[#080F0F] mb-3 shadow-inner">
                <div ref={previewMapRef} className="w-full h-full" />
              </div>
            )}

            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-2xl bg-[#132B2F] border border-[#28616A] text-[#A3DCE3] flex items-center justify-center shrink-0">
                <MapPin size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-[#F0F4F4] block truncate">
                  {localityName}
                </span>
                <p className="text-xs text-[#A5B1B3] mt-1 leading-relaxed">
                  {addressText || (coords ? `Lat ${coords.lat.toFixed(5)}, Lng ${coords.lng.toFixed(5)}` : 'Coordinates recorded')}
                </p>
              </div>
            </div>

            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-[#A3DCE3] hover:underline bg-[#101819] border border-[#354144] px-3.5 py-2 rounded-xl transition"
              >
                <span>Open in Google Maps</span>
                <ExternalLink size={13} />
              </a>
            )}
          </section>

          {/* About Section */}
          <section className="bg-[#192223] border border-[#354144] rounded-3xl p-5">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#758588] mb-2">
              ABOUT
            </h3>
            <p className="text-xs sm:text-sm text-[#F0F4F4] leading-relaxed whitespace-pre-wrap font-medium">
              {issue.description || 'No detailed written description was provided for this issue.'}
            </p>
          </section>

          {/* Reported By & Verification */}
          <section className="bg-[#192223] border border-[#354144] rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AppLogo size="sm" />
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#758588] block">
                  REPORTED BY
                </span>
                <span className="text-sm font-semibold text-[#F0F4F4]">
                  {issue.user_email ? issue.user_email.split('@')[0] : 'Citizen Reporter'}
                </span>
                <div className="flex items-center gap-3 text-[11px] font-mono text-[#A5B1B3] mt-0.5">
                  {issue.user_email && (
                    <span className="flex items-center gap-1">
                      <Mail size={11} className="text-[#A3DCE3]" />
                      <span>{issue.user_email}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[11px] font-mono text-[#A3DCE3] bg-[#132B2F] border border-[#28616A] px-2.5 py-1 rounded-full">
                <Phone size={11} />
                <span>SMS Alert Active</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-[#43C88A] bg-[#112C20] border border-[#1D5C3F] px-2.5 py-1 rounded-full">
                <ShieldCheck size={13} />
                <span>Verified</span>
              </div>
            </div>
          </section>

          {/* Citizen Resolution Confirmation (if resolved) */}
          {isResolved && (
            <section className="bg-[#112C20] border border-[#1D5C3F] rounded-3xl p-5">
              <div className="flex items-start gap-3 mb-3">
                <CheckCircle2 size={18} className="text-[#43C88A] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#F0F4F4]">
                    Authority marked this fixed
                  </h4>
                  <p className="text-xs text-[#A5B1B3] mt-0.5 leading-relaxed">
                    Have you been to the site recently? Confirm whether the issue is resolved properly.
                  </p>
                </div>
              </div>

              {confirmedStatus ? (
                <div className="text-xs font-mono text-[#43C88A] bg-[#080F0F]/60 p-2.5 rounded-xl text-center">
                  Thank you! Your community feedback was registered.
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setConfirmedStatus('confirmed');
                      onConfirmFixed && onConfirmFixed(issue.id, true);
                    }}
                    className="flex-1 bg-[#43C88A] hover:bg-[#38b279] text-[#080F0F] font-bold text-xs py-2.5 px-3 rounded-xl transition active:scale-95"
                  >
                    Confirm Fixed 👍
                  </button>
                  <button
                    onClick={() => {
                      setConfirmedStatus('disputed');
                      onConfirmFixed && onConfirmFixed(issue.id, false);
                    }}
                    className="flex-1 bg-[#192223] hover:bg-[#202B2D] text-[#EF6666] border border-[#5C2424] font-bold text-xs py-2.5 px-3 rounded-xl transition active:scale-95"
                  >
                    Still Broken ⚠️
                  </button>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="sticky bottom-0 z-20 bg-[#101819]/95 backdrop-blur-md px-5 py-4 border-t border-[#354144] flex items-center justify-between gap-3">
          {/* Upvote Button */}
          <button
            onClick={() => onUpvote(issue.id, issue.upvotes)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-mono font-bold transition active:scale-95 border ${
              isUpvoted
                ? 'bg-[#315C60] border-[#A3DCE3] text-[#A3DCE3]'
                : 'bg-[#192223] border-[#354144] text-[#A5B1B3] hover:text-[#F0F4F4]'
            }`}
          >
            <ThumbsUp size={15} className={isUpvoted ? 'fill-current' : ''} />
            <span>Upvote ({issue.upvotes || 0})</span>
          </button>

          {/* Follow Button */}
          <button
            onClick={() => setIsFollowed(!isFollowed)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-mono font-bold transition active:scale-95 border ${
              isFollowed
                ? 'bg-[#202B2D] border-[#A3DCE3] text-[#A3DCE3]'
                : 'bg-[#192223] border-[#354144] text-[#A5B1B3] hover:text-[#F0F4F4]'
            }`}
          >
            <Bookmark size={15} className={isFollowed ? 'fill-current' : ''} />
            <span>{isFollowed ? 'Following' : 'Follow'}</span>
          </button>

          {/* Share */}
          <button
            onClick={() => onShare && onShare(issue)}
            className="p-3 rounded-2xl bg-[#192223] border border-[#354144] text-[#A5B1B3] hover:text-[#A3DCE3] transition active:scale-95"
            title="Share Issue"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
