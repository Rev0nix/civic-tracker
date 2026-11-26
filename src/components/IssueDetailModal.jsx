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
  Trash2,
  Clock,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
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

export default function IssueDetailModal({
  issue,
  onClose,
  addressText,
  onUpvote,
  isUpvoted = false,
  onShare,
  onConfirmFixed,
  isAdmin = false,
  onUpdateStatus,
  onDeleteIssue,
}) {
  const [isFollowed, setIsFollowed] = useState(false);
  const [confirmedStatus, setConfirmedStatus] = useState(null); // 'confirmed' | 'disputed'
  const [statusUpdating, setStatusUpdating] = useState(false);
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
            html: createLeafletSvgIconHtml(issue.status === 'Resolved' ? '#3FB950' : '#F85149', 28),
            className: 'custom-leaflet-marker',
            iconSize: [28, 28],
            iconAnchor: [14, 28],
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
    { key: 'Open', label: 'Reported', timestamp: 'Report logged with verified GPS & photo' },
    { key: 'Acknowledged', label: 'Acknowledged', timestamp: 'Verified by local ward monitoring cell' },
    { key: 'In Progress', label: 'In Progress', timestamp: 'Dispatched to zonal field team' },
    { key: 'Resolved', label: 'Resolved', timestamp: 'Remediation completed and verified' },
  ];

  const getStepState = (stepKey) => {
    const order = ['Open', 'Acknowledged', 'In Progress', 'Resolved'];
    const currentStatus = issue.status === 'Submitted' ? 'Open' : issue.status;
    const currentIdx = order.indexOf(currentStatus);
    const stepIdx = order.indexOf(stepKey);

    if (currentIdx === -1) return 'pending';
    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'active';
    return 'pending';
  };

  const isResolved = issue.status === 'Resolved';

  const handleAdminStatusChange = async (newStatus) => {
    if (issue.status === newStatus || statusUpdating) return;
    setStatusUpdating(true);
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(issue, newStatus);
      }
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0D1117]/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div
        className="bg-[#161B22] border border-[#30363D] rounded-t-2xl sm:rounded-2xl w-full max-w-xl max-h-[95vh] overflow-y-auto shadow-2xl relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Navigation Top Header */}
        <div className="sticky top-0 z-20 bg-[#161B22]/95 backdrop-blur-md px-4 py-3 border-b border-[#30363D] flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#8B949E] hover:text-[#F0F6FC] transition active:scale-95"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium text-[#8B949E]">
              {formattedId}
            </span>
            {isAdmin && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#1F6FEB]/15 text-[#58A6FF] border border-[#1F6FEB]/30 flex items-center gap-1">
                <ShieldCheck size={11} />
                <span>Officer View</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onShare && onShare(issue)}
              className="p-1.5 rounded-lg bg-[#21262D] border border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] transition active:scale-95"
              title="Share"
            >
              <Share2 size={15} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#21262D] border border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] transition active:scale-95"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Hero Media Preview */}
        <div className="relative w-full h-60 sm:h-64 bg-[#0D1117] shrink-0 overflow-hidden">
          <img
            src={imageSrc}
            alt={issue.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#161B22] via-transparent to-black/30" />

          {/* Status Badge Over Image */}
          <div className="absolute bottom-3 left-4 flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md border shadow-md"
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

            {issue.priority && (
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border backdrop-blur-md ${
                  issue.priority === 'High'
                    ? 'bg-[#321616]/90 border-[#5C2424] text-[#F85149]'
                    : issue.priority === 'Medium'
                    ? 'bg-[#2A2315]/90 border-[#5C4824] text-[#D29922]'
                    : 'bg-[#112C20]/90 border-[#1D5C3F] text-[#3FB950]'
                }`}
              >
                {issue.priority} Priority
              </span>
            )}
          </div>
        </div>

        {/* Detail Content Container */}
        <div className="p-4 sm:p-5 space-y-4 flex-1">
          {/* Main Title & Meta */}
          <div>
            <div className="flex items-center gap-2 text-xs text-[#8B949E] mb-1.5">
              <span className="font-medium text-[#C9D1D9]">{categoryLabel}</span>
              <span>·</span>
              <span>{relativeTime}</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-[#F0F6FC] leading-snug">
              {issue.title}
            </h1>
          </div>

          {/* ============================================================== */}
          {/* WARD OFFICER CONTROLS (Only visible in officer mode)          */}
          {/* ============================================================== */}
          {isAdmin && (
            <section className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#30363D]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#1F6FEB]/15 text-[#58A6FF] flex items-center justify-center">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-[#F0F6FC]">
                      Officer Actions
                    </h3>
                    <p className="text-[11px] text-[#8B949E]">
                      Update status & notify citizen via SMS
                    </p>
                  </div>
                </div>

                {onDeleteIssue && (
                  <button
                    onClick={() => onDeleteIssue(issue.id)}
                    className="flex items-center gap-1 text-[#F85149] hover:bg-[#321616] px-2.5 py-1 rounded-lg text-xs font-medium transition active:scale-95"
                    title="Delete report"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                )}
              </div>

              {/* Small Sleek Status Switch Buttons */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#8B949E]">
                    Tap status to update:
                  </span>
                  {statusUpdating && (
                    <span className="text-[11px] text-[#58A6FF] flex items-center gap-1">
                      <RefreshCw size={10} className="animate-spin" />
                      Updating...
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {/* Open / New */}
                  <button
                    onClick={() => handleAdminStatusChange('Submitted')}
                    disabled={statusUpdating}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95 ${
                      issue.status === 'Submitted' || issue.status === 'Open'
                        ? 'bg-[#2A2315] border-[#D29922] text-[#D29922] shadow-sm font-semibold'
                        : 'bg-[#161B22] border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC]'
                    }`}
                  >
                    <Clock size={13} />
                    <span>Open</span>
                  </button>

                  {/* Acknowledged */}
                  <button
                    onClick={() => handleAdminStatusChange('Acknowledged')}
                    disabled={statusUpdating}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95 ${
                      issue.status === 'Acknowledged'
                        ? 'bg-[#1F6FEB]/15 border-[#58A6FF] text-[#58A6FF] shadow-sm font-semibold'
                        : 'bg-[#161B22] border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC]'
                    }`}
                  >
                    <RotateCcw size={13} />
                    <span>Acknowledged</span>
                  </button>

                  {/* In Progress */}
                  <button
                    onClick={() => handleAdminStatusChange('In Progress')}
                    disabled={statusUpdating}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95 ${
                      issue.status === 'In Progress'
                        ? 'bg-[#1F6FEB]/20 border-[#388BFD] text-[#58A6FF] shadow-sm font-semibold'
                        : 'bg-[#161B22] border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC]'
                    }`}
                  >
                    <AlertTriangle size={13} />
                    <span>In Progress</span>
                  </button>

                  {/* Resolved */}
                  <button
                    onClick={() => handleAdminStatusChange('Resolved')}
                    disabled={statusUpdating}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95 ${
                      issue.status === 'Resolved'
                        ? 'bg-[#238636]/20 border-[#3FB950] text-[#3FB950] shadow-sm font-semibold'
                        : 'bg-[#161B22] border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC]'
                    }`}
                  >
                    <CheckCircle2 size={13} />
                    <span>Resolved</span>
                  </button>
                </div>
              </div>

              {/* Citizen Email Contact (if available) */}
              {issue.user_email && (
                <div className="mt-3 pt-2.5 border-t border-[#30363D] flex items-center justify-between gap-2 text-xs">
                  <span className="text-[#8B949E]">Reported by:</span>
                  <span className="text-[#F0F6FC] font-medium">{issue.user_email}</span>
                </div>
              )}
            </section>
          )}

          {/* Status Timeline */}
          <section className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
            <h3 className="text-xs font-semibold text-[#8B949E] mb-3">
              Progress Timeline
            </h3>

            <div className="space-y-3.5 relative pl-1">
              {timelineSteps.map((step, idx) => {
                const state = getStepState(step.key);
                if (step.key === 'Resolved' && !isResolved && state !== 'active') {
                  return null;
                }

                const isCompleted = state === 'completed';
                const isActive = state === 'active';

                return (
                  <div key={step.key} className="flex items-start gap-3 relative">
                    {/* Connecting Line */}
                    {idx < timelineSteps.length - 1 && (
                      <div
                        className={`absolute left-3 top-6 bottom-0 w-0.5 -translate-x-1/2 ${
                          isCompleted ? 'bg-[#58A6FF]' : 'bg-[#30363D]'
                        }`}
                      />
                    )}

                    {/* Step Dot */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 text-[11px] font-medium transition-all ${
                        isActive
                          ? 'bg-[#1F6FEB] text-white ring-3 ring-[#1F6FEB]/20 font-bold'
                          : isCompleted
                          ? 'bg-[#21262D] border border-[#58A6FF] text-[#58A6FF]'
                          : 'bg-[#0D1117] border border-[#30363D] text-[#8B949E]'
                      }`}
                    >
                      {isCompleted ? '✓' : idx + 1}
                    </div>

                    {/* Step Label */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold ${
                            isActive
                              ? 'text-[#58A6FF]'
                              : isCompleted
                              ? 'text-[#F0F6FC]'
                              : 'text-[#8B949E]'
                          }`}
                        >
                          {step.label}
                        </span>
                        {isActive && (
                          <span className="text-[10px] text-[#58A6FF] bg-[#1F6FEB]/15 border border-[#1F6FEB]/30 px-2 py-0.5 rounded-full font-medium">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#8B949E] mt-0.5 leading-relaxed">
                        {step.timestamp}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Location Section */}
          <section className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
            <h3 className="text-xs font-semibold text-[#8B949E] mb-2.5">
              Location & Map
            </h3>

            {/* Embedded Mini Leaflet Map */}
            {coords && (
              <div className="relative w-full h-36 rounded-xl overflow-hidden border border-[#30363D] bg-[#0D1117] mb-3">
                <div ref={previewMapRef} className="w-full h-full" />
              </div>
            )}

            <div className="flex items-start gap-2.5 mb-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#21262D] text-[#58A6FF] flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-[#F0F6FC] block truncate">
                  {localityName}
                </span>
                <p className="text-xs text-[#8B949E] mt-0.5 leading-relaxed">
                  {addressText || (coords ? `Coordinates: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'Location pinned')}
                </p>
              </div>
            </div>

            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#58A6FF] hover:underline bg-[#0D1117] border border-[#30363D] px-3 py-1.5 rounded-lg transition"
              >
                <span>Open in Google Maps</span>
                <ExternalLink size={12} />
              </a>
            )}
          </section>

          {/* Description Section */}
          <section className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
            <h3 className="text-xs font-semibold text-[#8B949E] mb-1.5">
              Details
            </h3>
            <p className="text-xs text-[#F0F6FC] leading-relaxed whitespace-pre-wrap">
              {issue.description || 'No additional description was provided.'}
            </p>
          </section>

          {/* Citizen Resolution Confirmation (if resolved) */}
          {isResolved && (
            <section className="bg-[#238636]/10 border border-[#238636]/30 rounded-xl p-4">
              <div className="flex items-start gap-2.5 mb-2.5">
                <CheckCircle2 size={16} className="text-[#3FB950] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#F0F6FC]">
                    Marked resolved by municipal team
                  </h4>
                  <p className="text-[11px] text-[#8B949E] mt-0.5 leading-relaxed">
                    Have you verified the site recently? Let the community know if it's fixed.
                  </p>
                </div>
              </div>

              {confirmedStatus ? (
                <div className="text-xs text-[#3FB950] bg-[#0D1117] p-2 rounded-lg text-center font-medium">
                  Thank you! Your feedback has been recorded.
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setConfirmedStatus('confirmed');
                      onConfirmFixed && onConfirmFixed(issue.id, true);
                    }}
                    className="flex-1 bg-[#238636] hover:bg-[#2ea043] text-white font-medium text-xs py-2 px-3 rounded-lg transition active:scale-95"
                  >
                    Confirm Fixed 👍
                  </button>
                  <button
                    onClick={() => {
                      setConfirmedStatus('disputed');
                      onConfirmFixed && onConfirmFixed(issue.id, false);
                    }}
                    className="flex-1 bg-[#21262D] hover:bg-[#30363D] text-[#F85149] font-medium text-xs py-2 px-3 rounded-lg transition active:scale-95"
                  >
                    Still Broken ⚠️
                  </button>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="sticky bottom-0 z-20 bg-[#161B22]/95 backdrop-blur-md px-4 py-3 border-t border-[#30363D] flex items-center justify-between gap-2.5">
          {/* Upvote Button */}
          <button
            onClick={() => onUpvote(issue.id, issue.upvotes)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition active:scale-95 border ${
              isUpvoted
                ? 'bg-[#1F6FEB]/20 border-[#58A6FF] text-[#58A6FF] font-semibold'
                : 'bg-[#21262D] border-[#30363D] text-[#C9D1D9] hover:text-[#F0F6FC]'
            }`}
          >
            <ThumbsUp size={14} className={isUpvoted ? 'fill-current' : ''} />
            <span>Upvote ({issue.upvotes || 0})</span>
          </button>

          {/* Follow Button */}
          <button
            onClick={() => setIsFollowed(!isFollowed)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition active:scale-95 border ${
              isFollowed
                ? 'bg-[#21262D] border-[#58A6FF] text-[#58A6FF] font-semibold'
                : 'bg-[#21262D] border-[#30363D] text-[#C9D1D9] hover:text-[#F0F6FC]'
            }`}
          >
            <Bookmark size={14} className={isFollowed ? 'fill-current' : ''} />
            <span>{isFollowed ? 'Following' : 'Follow'}</span>
          </button>

          {/* Share */}
          <button
            onClick={() => onShare && onShare(issue)}
            className="p-2.5 rounded-xl bg-[#21262D] border border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] transition active:scale-95"
            title="Share"
          >
            <Share2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
