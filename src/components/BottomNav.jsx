import { Home, MapPin, Plus, Bell, User } from 'lucide-react';

export default function BottomNav({ activeTab, onTabChange, onOpenReport, unreadAlertsCount = 0 }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#101819]/95 backdrop-blur-xl border-t border-[#354144] px-3 py-1.5 safe-area-pb select-none"
      aria-label="Mobile Navigation"
    >
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Tab 1: Feed */}
        <button
          onClick={() => onTabChange('feed')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            activeTab === 'feed'
              ? 'text-[#A3DCE3]'
              : 'text-[#758588] hover:text-[#A5B1B3] active:scale-95'
          }`}
        >
          <Home size={22} strokeWidth={activeTab === 'feed' ? 2.5 : 1.8} />
          <span className={`text-[10px] mt-0.5 font-medium ${activeTab === 'feed' ? 'font-bold text-[#A3DCE3]' : ''}`}>
            Feed
          </span>
        </button>

        {/* Tab 2: Map */}
        <button
          onClick={() => onTabChange('map')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            activeTab === 'map'
              ? 'text-[#A3DCE3]'
              : 'text-[#758588] hover:text-[#A5B1B3] active:scale-95'
          }`}
        >
          <MapPin size={22} strokeWidth={activeTab === 'map' ? 2.5 : 1.8} />
          <span className={`text-[10px] mt-0.5 font-medium ${activeTab === 'map' ? 'font-bold text-[#A3DCE3]' : ''}`}>
            Map
          </span>
        </button>

        {/* Center Floating Action Button: Report Issue */}
        <button
          onClick={onOpenReport}
          className="relative -top-3 w-13 h-13 rounded-full bg-gradient-to-tr from-[#28616A] via-[#A3DCE3] to-[#43C88A] text-[#080F0F] flex items-center justify-center shadow-lg shadow-[#A3DCE3]/30 active:scale-90 transition-transform border-2 border-[#080F0F]"
          title="Report Municipal Issue"
          aria-label="Report Issue"
        >
          <Plus size={26} strokeWidth={3} />
        </button>

        {/* Tab 3: Alerts */}
        <button
          onClick={() => onTabChange('alerts')}
          className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            activeTab === 'alerts'
              ? 'text-[#A3DCE3]'
              : 'text-[#758588] hover:text-[#A5B1B3] active:scale-95'
          }`}
        >
          <div className="relative">
            <Bell size={22} strokeWidth={activeTab === 'alerts' ? 2.5 : 1.8} />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 bg-[#EF6666] text-white text-[9px] font-mono font-bold rounded-full flex items-center justify-center ring-2 ring-[#101819]">
                {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
              </span>
            )}
          </div>
          <span className={`text-[10px] mt-0.5 font-medium ${activeTab === 'alerts' ? 'font-bold text-[#A3DCE3]' : ''}`}>
            Alerts
          </span>
        </button>

        {/* Tab 4: Profile */}
        <button
          onClick={() => onTabChange('profile')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            activeTab === 'profile'
              ? 'text-[#A3DCE3]'
              : 'text-[#758588] hover:text-[#A5B1B3] active:scale-95'
          }`}
        >
          <User size={22} strokeWidth={activeTab === 'profile' ? 2.5 : 1.8} />
          <span className={`text-[10px] mt-0.5 font-medium ${activeTab === 'profile' ? 'font-bold text-[#A3DCE3]' : ''}`}>
            Profile
          </span>
        </button>
      </div>
    </nav>
  );
}
