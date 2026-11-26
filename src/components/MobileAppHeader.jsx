import { MapPin, RefreshCw, AlertTriangle, MapPinOff, Loader2, Bell } from 'lucide-react';
import AppLogo from './AppLogo';

export default function MobileAppHeader({
  currentLocality,
  locationState = 'found',
  onRefreshLocation,
  onOpenAlerts,
  unreadAlertsCount = 0,
}) {
  return (
    <header className="shrink-0 w-full z-40 bg-[#0D1117]/95 backdrop-blur-md border-b border-[#21262D] px-4 pt-3.5 pb-2.5 safe-area-pt select-none">
      <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2">
          <AppLogo size="xs" showGlow={false} />
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold tracking-tight text-[#F0F6FC]">
              Lokify
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#3FB950]" />
          </div>
        </div>

        {/* Center: GPS Locality Pill */}
        <button
          onClick={onRefreshLocation}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium max-w-[170px] truncate active:scale-95 transition shadow-sm ${
            locationState === 'locating'
              ? 'bg-[#161B22] border-[#30363D] text-[#8B949E]'
              : locationState === 'permission_denied'
              ? 'bg-[#321616] border-[#5C2424] text-[#F85149]'
              : locationState === 'unavailable'
              ? 'bg-[#2A2315] border-[#5C4824] text-[#D29922]'
              : 'bg-[#161B22] border-[#30363D] text-[#C9D1D9]'
          }`}
          title="Tap to refresh location"
        >
          {locationState === 'locating' ? (
            <Loader2 size={11} className="shrink-0 text-[#58A6FF] animate-spin" />
          ) : locationState === 'permission_denied' ? (
            <AlertTriangle size={11} className="shrink-0 text-[#F85149]" />
          ) : locationState === 'unavailable' ? (
            <MapPinOff size={11} className="shrink-0 text-[#D29922]" />
          ) : (
            <MapPin size={11} className="shrink-0 text-[#58A6FF]" />
          )}

          <span className="truncate">
            {locationState === 'locating'
              ? 'Updating...'
              : locationState === 'permission_denied'
              ? 'Permission needed'
              : locationState === 'unavailable'
              ? 'Retry Location'
              : currentLocality || 'Bengaluru'}
          </span>

          <RefreshCw size={10} className="shrink-0 text-[#8B949E]" />
        </button>

        {/* Right: Alerts only (Sign out button removed from top right as requested) */}
        <div className="flex items-center gap-1.5">
          {onOpenAlerts && (
            <button
              onClick={onOpenAlerts}
              className="relative p-1.5 rounded-lg bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] active:scale-95 transition"
              title="Alerts"
            >
              <Bell size={15} />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 px-0.5 bg-[#F85149] text-white text-[8px] font-bold rounded-full flex items-center justify-center ring-1 ring-[#0D1117]">
                  {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
