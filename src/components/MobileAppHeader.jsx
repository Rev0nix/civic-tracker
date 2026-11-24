import { MapPin, RefreshCw, LogOut, ShieldCheck, AlertTriangle, MapPinOff, Loader2 } from 'lucide-react';
import AppLogo from './AppLogo';

export default function MobileAppHeader({
  currentLocality,
  locationState = 'found',
  onRefreshLocation,
  currentUser,
  onLogout,
  onOpenAdminPortal,
}) {
  return (
    <header className="shrink-0 w-full z-40 bg-[#101819]/95 backdrop-blur-xl border-b border-[#253538] px-4 pt-3.5 pb-2.5 safe-area-pt select-none">
      <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2.5">
          <AppLogo size="xs" showGlow={false} />
          <div className="flex items-center gap-1.5">
            <span className="text-base font-black tracking-tight text-[#F0F4F4] font-mono">
              LOKIFY
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#43C88A] animate-pulse" />
          </div>
        </div>

        {/* Center: GPS Locality Pill with Multi-State Indicators */}
        <button
          onClick={onRefreshLocation}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono font-medium max-w-[170px] truncate active:scale-95 transition shadow-sm ${
            locationState === 'locating'
              ? 'bg-[#192223] border-[#354144] text-[#A5B1B3]'
              : locationState === 'permission_denied'
              ? 'bg-[#321616] border-[#5C2424] text-[#EF6666]'
              : locationState === 'unavailable'
              ? 'bg-[#2A2315] border-[#5C4824] text-[#E9B85C]'
              : 'bg-[#132B2F] border-[#28616A] text-[#A3DCE3]'
          }`}
          title="Tap to refresh or retry GPS location"
        >
          {locationState === 'locating' ? (
            <Loader2 size={11} className="shrink-0 text-[#A3DCE3] animate-spin" />
          ) : locationState === 'permission_denied' ? (
            <AlertTriangle size={11} className="shrink-0 text-[#EF6666]" />
          ) : locationState === 'unavailable' ? (
            <MapPinOff size={11} className="shrink-0 text-[#E9B85C]" />
          ) : (
            <MapPin size={11} className="shrink-0 text-[#43C88A]" />
          )}

          <span className="truncate">
            {locationState === 'locating'
              ? 'Locating...'
              : locationState === 'permission_denied'
              ? 'Permission needed'
              : locationState === 'unavailable'
              ? 'Retry Location'
              : currentLocality || 'Bengaluru'}
          </span>

          <RefreshCw size={10} className="shrink-0 text-[#758588]" />
        </button>

        {/* Right: User / Admin / Logout Actions */}
        <div className="flex items-center gap-1.5">
          {currentUser?.role === 'admin' && (
            <button
              onClick={onOpenAdminPortal}
              className="p-1.5 rounded-xl bg-[#132B2F] border border-[#28616A] text-[#A3DCE3] active:scale-95 transition"
              title="Admin Portal"
            >
              <ShieldCheck size={16} />
            </button>
          )}

          <button
            onClick={onLogout}
            className="p-1.5 rounded-xl bg-[#192223] hover:bg-[#321616] border border-[#354144] hover:border-[#5C2424] text-[#A5B1B3] hover:text-[#EF6666] active:scale-95 transition"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
