import { useState } from 'react';
import {
  Mail,
  MapPin,
  ClipboardList,
  Bookmark,
  Bell,
  Compass,
  Shield,
  Info,
  LogOut,
  ChevronRight,
  Edit3,
  DownloadCloud,
  User,
} from 'lucide-react';

export default function ProfileScreen({
  userEmail,
  userName = 'Citizen Reporter',
  userLocality = 'Bengaluru',
  issues = [],
  myIssuesCount = 0,
  isAdmin = false,
  onNavigateTab,
  onLogout,
  onCheckUpdate,
  onUpdateProfile,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(userName);
  const [editEmail, setEditEmail] = useState(userEmail || '');
  const [editLocality, setEditLocality] = useState(userLocality);

  const resolvedCount = issues.filter(
    (i) => i.status === 'Resolved' && (i.user_email === userEmail || !userEmail)
  ).length;
  const activeCount = myIssuesCount - resolvedCount;

  const handleSaveProfile = (e) => {
    e.preventDefault();
    onUpdateProfile({
      name: editName.trim() || (isAdmin ? 'Municipal Ward Officer' : 'Citizen Reporter'),
      email: editEmail.trim(),
      locality: editLocality.trim(),
    });
    setIsEditing(false);
  };

  const menuSections = [
    {
      title: 'Activity & Alerts',
      items: [
        {
          id: 'my-reports',
          label: 'My Reports',
          icon: ClipboardList,
          badge: myIssuesCount > 0 ? `${myIssuesCount}` : null,
          onClick: () => onNavigateTab('my-issues'),
        },
        {
          id: 'saved-issues',
          label: 'Saved Issues',
          icon: Bookmark,
          onClick: () => alert('Showing your saved issues in this session.'),
        },
        {
          id: 'notifications',
          label: 'Notifications',
          icon: Bell,
          subtitle: 'Real-time issue status updates & alerts',
          onClick: () => onNavigateTab('alerts'),
        },
      ],
    },
    {
      title: 'Preferences & App',
      items: [
        {
          id: 'software-update',
          label: 'Software Update',
          icon: DownloadCloud,
          subtitle: 'Version 1.4.7 · Tap to check updates',
          badge: 'v1.4.7',
          onClick: onCheckUpdate,
        },
        {
          id: 'location-settings',
          label: 'Location Accuracy',
          icon: Compass,
          subtitle: 'High accuracy device GPS enabled',
          onClick: () => alert('Location mode: High Accuracy GPS via device geolocation sensor.'),
        },
        {
          id: 'privacy',
          label: 'Privacy & Security',
          icon: Shield,
          subtitle: 'Encrypted & Play Protect Verified',
          onClick: () => alert('Lokify is certified clean with zero harmful permissions.'),
        },
        {
          id: 'about',
          label: 'About Lokify',
          icon: Info,
          subtitle: 'v1.4.7 · Civic Grievance Tracker',
          onClick: () =>
            alert(
              'Lokify v1.4.7\nCivic Grievance & Municipal Issue Redressal Platform\nClean, Harm-Free Native Android Release'
            ),
        },
      ],
    },
  ];

  return (
    <div className="h-full w-full flex flex-col bg-[#0D1117] text-[#F0F6FC] overflow-hidden">
      {/* Pinned Top Tab Header */}
      <header className="shrink-0 w-full px-4 pt-3.5 pb-2.5 bg-[#0D1117]/95 backdrop-blur-md border-b border-[#21262D] z-20">
        <h1 className="text-xl font-bold tracking-tight text-[#F0F6FC] leading-none">
          Settings & Profile
        </h1>
        <p className="text-xs text-[#8B949E] mt-1">
          {isAdmin ? 'Ward administrative controls and account settings' : 'Citizen account, notifications, and preferences'}
        </p>
      </header>

      {/* Scrollable Content Container */}
      <div className="flex-1 w-full overflow-y-auto overscroll-contain px-3.5 py-3 pb-24 no-scrollbar">
        <div className="flex flex-col gap-3.5">
          {/* Official Ward Officer Status Card (Shown ONLY when logged in as Officer) */}
          {isAdmin && (
            <div className="bg-[#1F6FEB]/15 border border-[#388BFD]/40 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-sm animate-in fade-in duration-150">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#1F6FEB] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Shield size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#58A6FF] uppercase tracking-wider block">
                      Ward Officer Active
                    </span>
                    <span className="w-2 h-2 rounded-full bg-[#58A6FF] animate-pulse" />
                  </div>
                  <p className="text-[11px] text-[#8B949E] mt-0.5 leading-tight">
                    Official municipal control over report cards active
                  </p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="text-[11px] font-semibold text-[#F85149] bg-[#321616] hover:bg-[#481d1d] border border-[#5C2424] px-2.5 py-1.5 rounded-xl transition active:scale-95 shrink-0"
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Header Profile Card */}
          <section className="bg-[#161B22] border border-[#30363D] rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3.5">
                {/* Avatar */}
                <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center font-bold text-lg shadow-sm ${
                  isAdmin
                    ? 'bg-[#1F6FEB]/20 border-[#388BFD] text-[#58A6FF]'
                    : 'bg-[#21262D] border-[#30363D] text-[#58A6FF]'
                }`}>
                  {isAdmin
                    ? 'WO'
                    : (userName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase() || 'CR')}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#F0F6FC] tracking-tight">
                      {isAdmin
                        ? (userName?.includes('Citizen') ? 'Municipal Ward Officer' : userName)
                        : userName}
                    </h2>
                    {isAdmin ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1F6FEB]/20 text-[#58A6FF] border border-[#1F6FEB]/40 flex items-center gap-1 shadow-sm">
                        <Shield size={10} />
                        <span>ADMIN</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#238636]/15 text-[#3FB950] border border-[#238636]/40 flex items-center gap-1">
                        <User size={10} />
                        <span>CITIZEN</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#8B949E] mt-1 flex items-center gap-1.5">
                    <Mail size={12} className="text-[#58A6FF]" />
                    <span className="truncate max-w-[190px]">{userEmail || 'No email linked'}</span>
                  </p>

                  <p className="text-xs text-[#8B949E] mt-0.5 flex items-center gap-1.5">
                    <MapPin size={12} className="text-[#58A6FF]" />
                    <span>{userLocality}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEditing(true)}
                className="p-2 rounded-xl bg-[#21262D] border border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] transition active:scale-95"
                title="Edit profile"
              >
                <Edit3 size={15} />
              </button>
            </div>

            {/* Inline Edit Form (No phone numbers) */}
            {isEditing && (
              <div className="mt-4 pt-4 border-t border-[#30363D] animate-in fade-in duration-150">
                <h4 className="text-xs font-semibold text-[#F0F6FC] mb-3">
                  Edit Profile
                </h4>
                <form onSubmit={handleSaveProfile} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-[#8B949E] block mb-1">Display Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] px-3 py-2 rounded-xl focus:outline-none focus:border-[#58A6FF]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#8B949E] block mb-1">Email</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] px-3 py-2 rounded-xl focus:outline-none focus:border-[#58A6FF]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#8B949E] block mb-1">Locality</label>
                    <input
                      type="text"
                      value={editLocality}
                      onChange={(e) => setEditLocality(e.target.value)}
                      className="w-full bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] px-3 py-2 rounded-xl focus:outline-none focus:border-[#58A6FF]"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 bg-[#1F6FEB] hover:bg-[#388BFD] text-white text-xs font-semibold py-2 px-3 rounded-xl transition"
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] text-xs font-semibold py-2 px-3 rounded-xl transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#30363D]/60 text-center">
              <div className="bg-[#0D1117]/60 p-2.5 rounded-xl border border-[#30363D]/40">
                <span className="text-base font-bold text-[#F0F6FC] block">{myIssuesCount}</span>
                <span className="text-[10px] text-[#8B949E] font-medium uppercase tracking-wider">Reports</span>
              </div>
              <div className="bg-[#0D1117]/60 p-2.5 rounded-xl border border-[#30363D]/40">
                <span className="text-base font-bold text-[#3FB950] block">{resolvedCount}</span>
                <span className="text-[10px] text-[#8B949E] font-medium uppercase tracking-wider">Resolved</span>
              </div>
              <div className="bg-[#0D1117]/60 p-2.5 rounded-xl border border-[#30363D]/40">
                <span className="text-base font-bold text-[#D29922] block">{activeCount}</span>
                <span className="text-[10px] text-[#8B949E] font-medium uppercase tracking-wider">Active</span>
              </div>
            </div>
          </section>

          {/* Menu Sections */}
          <div className="space-y-4">
            {menuSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-xs font-semibold text-[#8B949E] mb-2 px-1">
                  {section.title}
                </h3>
                <div className="bg-[#161B22] border border-[#30363D] rounded-2xl overflow-hidden divide-y divide-[#30363D]/60 shadow-sm">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={item.onClick}
                        className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-[#1C2128] transition text-left group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border bg-[#21262D] border-[#30363D] text-[#58A6FF]">
                            <Icon size={15} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-[#F0F6FC] group-hover:text-[#58A6FF] transition-colors block">
                              {item.label}
                            </span>
                            {item.subtitle && (
                              <span className="text-[11px] block truncate max-w-[210px] sm:max-w-xs text-[#8B949E]">
                                {item.subtitle}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.badge ? (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#21262D] text-[#58A6FF] border border-[#30363D]">
                              {item.badge}
                            </span>
                          ) : (
                            <ChevronRight size={15} className="text-[#8B949E] group-hover:text-[#F0F6FC] transition-transform group-hover:translate-x-0.5" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sign Out Button (Cleanly in Settings) */}
          <div className="pt-2">
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 bg-[#161B22] hover:bg-[#21262D] text-[#F85149] border border-[#30363D] hover:border-[#F85149]/40 py-3 rounded-xl text-xs font-semibold transition active:scale-95"
            >
              <LogOut size={15} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
