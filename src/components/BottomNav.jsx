import { Home, ClipboardList, Bell, User } from 'lucide-react';

export default function BottomNav({ activeTab, onTabChange, unreadAlertsCount = 0 }) {
  const tabs = [
    { id: 'feed', label: 'Feed', icon: Home },
    { id: 'my-issues', label: 'My Issues', icon: ClipboardList },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: unreadAlertsCount },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#101819]/95 backdrop-blur-xl border-t border-[#354144] px-4 py-2"
      aria-label="Bottom navigation"
    >
      <div className="max-w-md mx-auto flex items-center justify-between">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-4 rounded-2xl transition-all duration-200 select-none ${
                isActive
                  ? 'bg-[#315C60] text-[#A3DCE3]'
                  : 'text-[#758588] hover:text-[#A5B1B3] active:scale-95'
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                {tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 bg-[#EF6666] text-white text-[10px] font-mono font-bold rounded-full flex items-center justify-center leading-none ring-2 ring-[#101819]">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] mt-1 font-medium tracking-tight ${
                  isActive ? 'font-semibold text-[#A3DCE3]' : 'text-[#758588]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
