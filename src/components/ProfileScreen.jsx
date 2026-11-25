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
  Phone,
  MessageSquare,
  DownloadCloud,
} from 'lucide-react';
import { getSmsHistory } from '../utils/smsService';

export default function ProfileScreen({
  userEmail,
  userPhone = '',
  userName = 'Citizen Reporter',
  userLocality = 'Bengaluru',
  issues = [],
  myIssuesCount = 0,
  upvotesReceived = 0,
  isAdmin = false,
  onToggleAdmin,
  onNavigateTab,
  onLogout,
  onCheckUpdate,
  onUpdateProfile,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showSmsHistory, setShowSmsHistory] = useState(false);
  const [editName, setEditName] = useState(userName);
  const [editEmail, setEditEmail] = useState(userEmail || '');
  const [editPhone, setEditPhone] = useState(userPhone || '');
  const [editLocality, setEditLocality] = useState(userLocality);

  const smsLogs = getSmsHistory();

  const resolvedCount = issues.filter(
    (i) => i.status === 'Resolved' && (i.user_email === userEmail || !userEmail)
  ).length;
  const activeCount = myIssuesCount - resolvedCount;

  const handleSaveProfile = (e) => {
    e.preventDefault();
    onUpdateProfile({
      name: editName.trim() || 'Citizen Reporter',
      email: editEmail.trim(),
      phone: editPhone.trim(),
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
          id: 'sms-logs',
          label: 'SMS Dispatch Logs',
          icon: MessageSquare,
          subtitle: `${smsLogs.length} updates sent to your phone`,
          onClick: () => setShowSmsHistory(true),
        },
        {
          id: 'admin-mode',
          label: 'Ward Officer Mode',
          icon: Shield,
          subtitle: isAdmin
            ? 'Officer controls active · You can manage reports'
            : 'Turn on to unlock municipal officer tools',
          isToggle: true,
          toggleValue: isAdmin,
          onClick: onToggleAdmin,
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
          subtitle: `SMS alerts routed to ${userPhone || 'your registered number'}`,
          onClick: () => alert(`SMS notifications are routed to ${userPhone || 'your registered number'}.`),
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
          subtitle: 'Version 1.4.1 · Tap to check updates',
          badge: 'v1.4.1',
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
          subtitle: 'Encrypted and protected data',
          onClick: () => alert('Your data and reports are securely stored with Supabase.'),
        },
        {
          id: 'about',
          label: 'About Lokify',
          icon: Info,
          subtitle: 'v1.4.1 · Civic Issue Tracker',
          onClick: () =>
            alert(
              'Lokify v1.4.1\nCivic Grievance & Municipal Issue Tracker\nConnected to Supabase Realtime, SMS Gateway & GIS'
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
          Profile & Settings
        </h1>
        <p className="text-xs text-[#8B949E] mt-1">
          Account details, notifications, and preferences
        </p>
      </header>

      {/* Scrollable Content Container */}
      <div className="flex-1 w-full overflow-y-auto overscroll-contain px-3.5 py-3 pb-24 no-scrollbar">
        <div className="flex flex-col gap-4">
          {/* Header Profile Card */}
          <section className="bg-[#161B22] border border-[#30363D] rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3.5">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-2xl bg-[#21262D] border border-[#30363D] text-[#58A6FF] font-bold text-lg flex items-center justify-center shadow-sm">
                  {userName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase() || 'CR'}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#F0F6FC] tracking-tight">
                      {userName}
                    </h2>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#238636]/15 text-[#3FB950] border border-[#238636]/40">
                      Verified
                    </span>
                  </div>

                  {userPhone && (
                    <p className="text-xs text-[#8B949E] mt-1 flex items-center gap-1.5">
                      <Phone size={12} className="text-[#58A6FF]" />
                      <span>{userPhone}</span>
                    </p>
                  )}

                  <p className="text-xs text-[#8B949E] mt-0.5 flex items-center gap-1.5">
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

            {/* Inline Edit Form */}
            {isEditing && (
              <div className="mt-4 pt-4 border-t border-[#30363D] animate-in fade-in duration-150">
                <h4 className="text-xs font-semibold text-[#F0F6FC] mb-3">
                  Edit Profile
                </h4>
                <form onSubmit={handleSaveProfile} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-[#8B949E] block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] px-3 py-2 rounded-xl focus:outline-none focus:border-[#58A6FF]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#8B949E] block mb-1">Phone Number (SMS)</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
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
                    <label className="text-[11px] font-medium text-[#8B949E] block mb-1">Locality / Ward</label>
                    <input
                      type="text"
                      value={editLocality}
                      onChange={(e) => setEditLocality(e.target.value)}
                      className="w-full bg-[#0D1117] border border-[#30363D] text-xs text-[#F0F6FC] px-3 py-2 rounded-xl focus:outline-none focus:border-[#58A6FF]"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="bg-[#1F6FEB] hover:bg-[#388BFD] text-white font-medium text-xs px-4 py-2 rounded-xl transition active:scale-95"
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="bg-[#21262D] text-[#8B949E] hover:text-[#C9D1D9] text-xs px-3 py-2 rounded-xl transition active:scale-95"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>

          {/* Quick Stats Grid */}
          <section className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-3.5 text-center">
              <span className="text-[11px] font-medium text-[#8B949E] block">
                Total Reports
              </span>
              <span className="text-xl font-bold text-[#F0F6FC] mt-0.5 block">
                {myIssuesCount}
              </span>
            </div>

            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-3.5 text-center">
              <span className="text-[11px] font-medium text-[#3FB950] block">
                Resolved
              </span>
              <span className="text-xl font-bold text-[#3FB950] mt-0.5 block">
                {resolvedCount}
              </span>
            </div>

            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-3.5 text-center">
              <span className="text-[11px] font-medium text-[#58A6FF] block">
                In Progress
              </span>
              <span className="text-xl font-bold text-[#58A6FF] mt-0.5 block">
                {Math.max(0, activeCount)}
              </span>
            </div>

            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-3.5 text-center">
              <span className="text-[11px] font-medium text-[#D29922] block">
                Support Received
              </span>
              <span className="text-xl font-bold text-[#F0F6FC] mt-0.5 block">
                👍 {upvotesReceived}
              </span>
            </div>
          </section>

          {/* Menu Sections with Sleek Small Toggle Switch */}
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
                          <div className="w-8 h-8 rounded-xl bg-[#21262D] text-[#58A6FF] flex items-center justify-center shrink-0 border border-[#30363D]">
                            <Icon size={15} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-[#F0F6FC] group-hover:text-[#58A6FF] transition-colors block">
                              {item.label}
                            </span>
                            {item.subtitle && (
                              <span className="text-[11px] text-[#8B949E] block truncate max-w-[210px] sm:max-w-xs">
                                {item.subtitle}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Small iOS-style Toggle Switch if item has isToggle */}
                          {item.isToggle ? (
                            <div
                              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out shrink-0 flex items-center ${
                                item.toggleValue ? 'bg-[#238636]' : 'bg-[#30363D]'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${
                                  item.toggleValue ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </div>
                          ) : item.badge ? (
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

          {/* Sign Out Button */}
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

        {/* SMS Logs Modal */}
        {showSmsHistory && (
          <div
            className="fixed inset-0 z-50 bg-[#0D1117]/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setShowSmsHistory(false)}
          >
            <div
              className="bg-[#161B22] border border-[#30363D] rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#30363D] mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#F0F6FC]">SMS History</h3>
                  <p className="text-xs text-[#8B949E]">Updates dispatched to your phone</p>
                </div>
                <button
                  onClick={() => setShowSmsHistory(false)}
                  className="p-1 rounded-lg text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] transition"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-2.5">
                {smsLogs.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#8B949E]">
                    No SMS notifications sent yet.
                  </div>
                ) : (
                  smsLogs.map((log) => (
                    <div key={log.id} className="bg-[#0D1117] border border-[#30363D] p-3 rounded-xl text-xs">
                      <div className="flex items-center justify-between mb-1 text-[11px]">
                        <span className="text-[#58A6FF] font-medium">To: {log.toPhone}</span>
                        <span className="text-[#8B949E]">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[#F0F6FC] leading-relaxed mt-1">
                        {log.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
