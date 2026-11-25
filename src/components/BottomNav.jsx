import { Home, MapPin, Plus, Bot, User } from 'lucide-react';

export default function BottomNav({ activeTab, onTabChange, onOpenReport }) {
  return (
    <nav
      className="shrink-0 w-full z-40 bg-[#0D1117]/95 backdrop-blur-md border-t border-[#21262D] px-3 py-1.5 select-none relative"
      aria-label="Mobile Navigation"
    >
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Tab 1: Feed */}
        <button
          onClick={() => onTabChange('feed')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            activeTab === 'feed'
              ? 'text-[#58A6FF]'
              : 'text-[#8B949E] hover:text-[#C9D1D9] active:scale-95'
          }`}
        >
          <Home size={20} strokeWidth={activeTab === 'feed' ? 2.4 : 1.8} />
          <span className={`text-[10px] mt-0.5 font-medium ${activeTab === 'feed' ? 'font-bold text-[#58A6FF]' : ''}`}>
            Feed
          </span>
        </button>

        {/* Tab 2: Map */}
        <button
          onClick={() => onTabChange('map')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            activeTab === 'map'
              ? 'text-[#58A6FF]'
              : 'text-[#8B949E] hover:text-[#C9D1D9] active:scale-95'
          }`}
        >
          <MapPin size={20} strokeWidth={activeTab === 'map' ? 2.4 : 1.8} />
          <span className={`text-[10px] mt-0.5 font-medium ${activeTab === 'map' ? 'font-bold text-[#58A6FF]' : ''}`}>
            Map
          </span>
        </button>

        {/* Center Floating Action Button: Report Issue */}
        <button
          onClick={onOpenReport}
          className="relative -top-2.5 w-11 h-11 rounded-full bg-[#1F6FEB] hover:bg-[#388BFD] text-white flex items-center justify-center shadow-lg shadow-[#1F6FEB]/30 active:scale-90 transition-transform border-2 border-[#0D1117]"
          title="Report an Issue"
          aria-label="Report an Issue"
        >
          <Plus size={22} strokeWidth={2.8} />
        </button>

        {/* Tab 3: Dedicated Lok AI Page */}
        <button
          onClick={() => onTabChange('lok-ai')}
          className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            activeTab === 'lok-ai'
              ? 'text-[#58A6FF]'
              : 'text-[#8B949E] hover:text-[#C9D1D9] active:scale-95'
          }`}
        >
          <div className="relative">
            <Bot size={20} strokeWidth={activeTab === 'lok-ai' ? 2.4 : 1.8} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#3FB950] absolute -top-0.5 -right-0.5" />
          </div>
          <span className={`text-[10px] mt-0.5 font-medium ${activeTab === 'lok-ai' ? 'font-bold text-[#58A6FF]' : ''}`}>
            Lok AI
          </span>
        </button>

        {/* Tab 4: Profile */}
        <button
          onClick={() => onTabChange('profile')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            activeTab === 'profile'
              ? 'text-[#58A6FF]'
              : 'text-[#8B949E] hover:text-[#C9D1D9] active:scale-95'
          }`}
        >
          <User size={20} strokeWidth={activeTab === 'profile' ? 2.4 : 1.8} />
          <span className={`text-[10px] mt-0.5 font-medium ${activeTab === 'profile' ? 'font-bold text-[#58A6FF]' : ''}`}>
            Profile
          </span>
        </button>
      </div>
    </nav>
  );
}
