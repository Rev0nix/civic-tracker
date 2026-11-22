import {
  Home,
  MapPin,
  ClipboardList,
  Bell,
  User,
  Plus,
  LogOut,
  ShieldCheck,
  Phone,
} from 'lucide-react';
import AppLogo from './AppLogo';

export default function DesktopHeader({
  activeTab,
  onTabChange,
  unreadAlertsCount = 0,
  currentUser,
  currentLocality,
  onOpenReport,
  onLogout,
  onOpenAdminPortal,
}) {
  const navTabs = [
    { id: 'feed', label: 'Feed', icon: Home },
    { id: 'map', label: 'Civic Map', icon: MapPin },
    { id: 'my-issues', label: 'My Issues', icon: ClipboardList },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: unreadAlertsCount },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <header className="hidden md:block sticky top-0 z-40 bg-[#101819]/95 backdrop-blur-xl border-b border-[#354144] px-6 py-3 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
        {/* Brand Left with Modern App Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange('feed')}>
          <AppLogo size="sm" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-[#F0F4F4] font-mono">
                LOKIFY
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#192223] text-[#A3DCE3] border border-[#354144]">
                Web & Mobile
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#758588] truncate max-w-[200px]">
              {currentLocality || 'Bengaluru Municipal Area'}
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs (includes Civic Map) */}
        <nav className="flex items-center gap-2 bg-[#192223] border border-[#354144] p-1.5 rounded-2xl">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all relative ${
                  isActive
                    ? 'bg-[#315C60] text-[#A3DCE3] shadow-md border border-[#A3DCE3]'
                    : 'text-[#758588] hover:text-[#A5B1B3] hover:bg-[#202B2D]'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="min-w-4 h-4 px-1 bg-[#EF6666] text-white text-[10px] font-mono font-bold rounded-full flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Actions & User Identity */}
        <div className="flex items-center gap-3">
          {/* Post Report Action */}
          <button
            onClick={onOpenReport}
            className="flex items-center gap-1.5 bg-[#A3DCE3] hover:bg-[#85CBD3] text-[#080F0F] px-4 py-2 rounded-xl font-bold text-xs font-mono transition active:scale-95 shadow-md shadow-[#A3DCE3]/15"
          >
            <Plus size={15} strokeWidth={2.6} />
            <span>Report Issue</span>
          </button>

          {/* User / Admin Chip */}
          <div className="flex items-center gap-2 bg-[#192223] border border-[#354144] pl-3 pr-2 py-1.5 rounded-2xl">
            <div className="text-right">
              <span className="text-xs font-bold text-[#F0F4F4] block truncate max-w-[120px]">
                {currentUser?.name || 'Citizen'}
              </span>
              <span className="text-[10px] font-mono text-[#A3DCE3] flex items-center justify-end gap-1">
                <Phone size={10} />
                <span className="truncate max-w-[110px]">{currentUser?.phone || 'SMS Active'}</span>
              </span>
            </div>

            {currentUser?.role === 'admin' ? (
              <button
                onClick={onOpenAdminPortal}
                className="p-1.5 rounded-xl bg-[#132B2F] border border-[#28616A] text-[#A3DCE3]"
                title="Admin Portal"
              >
                <ShieldCheck size={16} />
              </button>
            ) : null}

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="p-1.5 rounded-xl bg-[#202B2D] hover:bg-[#321616] border border-[#354144] hover:border-[#5C2424] text-[#A5B1B3] hover:text-[#EF6666] transition"
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
