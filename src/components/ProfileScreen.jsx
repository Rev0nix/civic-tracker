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
  userLocality = 'Near Ward Office',
  issues = [],
  myIssuesCount = 0,
  upvotesReceived = 0,
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
      title: 'ACCOUNT & ACTIVITY',
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
          label: 'SMS Alert Dispatch Logs',
          icon: MessageSquare,
          subtitle: `${smsLogs.length} messages delivered`,
          onClick: () => setShowSmsHistory(true),
        },
        {
          id: 'saved-issues',
          label: 'Saved & Followed Issues',
          icon: Bookmark,
          onClick: () => alert('Showing your followed issues in this session.'),
        },
        {
          id: 'notifications',
          label: 'Notification Settings',
          icon: Bell,
          subtitle: 'SMS & Email alerts active',
          onClick: () => alert(`SMS notifications are routed to ${userPhone || 'your registered number'}.`),
        },
      ],
    },
    {
      title: 'PREFERENCES & SYSTEM',
      items: [
        {
          id: 'software-update',
          label: 'Software Update',
          icon: DownloadCloud,
          subtitle: 'Version 1.3.7 · Tap to check in-app updates',
          badge: 'v1.3.7',
          onClick: onCheckUpdate,
        },
        {
          id: 'location-settings',
          label: 'Location Settings',
          icon: Compass,
          subtitle: 'High-accuracy GPS enabled',
          onClick: () => alert('Current Mode: High Accuracy GPS via device geolocation sensor.'),
        },
        {
          id: 'privacy',
          label: 'Privacy & Security',
          icon: Shield,
          subtitle: 'Protected with 8+ character password',
          onClick: () => alert('Your credentials and reports are encrypted and protected.'),
        },
        {
          id: 'about',
          label: 'About Lokify',
          icon: Info,
          subtitle: 'v1.3.7 · Production Mobile',
          onClick: () =>
            alert(
              'Lokify v1.3.7\nSmart Municipal Grievance & Issue Tracking Platform\nConnected to Supabase Realtime, SMS Gateway & Leaflet GIS'
            ),
        },
      ],
    },
  ];

  return (
    <div className="h-full w-full flex flex-col bg-[#080F0F] text-[#F0F4F4] overflow-hidden">
      {/* Pinned Top Tab Header */}
      <header className="shrink-0 w-full px-3 pt-2.5 pb-2 bg-[#080F0F] border-b border-[#253538] z-20">
        <h1 className="text-lg font-black tracking-tight text-[#F0F4F4] font-mono leading-none">
          Profile & Settings
        </h1>
        <p className="text-[10px] font-mono text-[#758588] mt-0.5">
          Citizen account, ward location & SMS settings
        </p>
      </header>

      {/* Scrollable Content Container */}
      <div className="flex-1 w-full overflow-y-auto overscroll-contain px-3 py-3 pb-24 no-scrollbar">

      <div className="flex flex-col gap-4">
        {/* Profile, Stats, Municipal Admin, Sign Out */}
        <div className="space-y-4">
          {/* Header Profile Card */}
          <section className="bg-[#192223] border border-[#354144] rounded-3xl p-6 sm:p-7 relative overflow-hidden shadow-xl">
            <div className="flex items-start justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-3xl bg-[#132B2F] border border-[#28616A] text-[#A3DCE3] font-mono font-extrabold text-xl flex items-center justify-center shadow-lg shadow-[#132B2F]/50">
                  {userName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase() || 'LK'}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-[#F0F4F4] tracking-tight">
                      {userName}
                    </h2>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#112C20] text-[#43C88A] border border-[#1D5C3F]">
                      Verified
                    </span>
                  </div>

                  {userPhone && (
                    <p className="text-xs font-mono text-[#A3DCE3] mt-1 flex items-center gap-1.5">
                      <Phone size={12} />
                      <span>{userPhone}</span>
                    </p>
                  )}

                  <p className="text-xs font-mono text-[#A5B1B3] mt-0.5 flex items-center gap-1.5">
                    <Mail size={12} className="text-[#A3DCE3]" />
                    <span className="truncate max-w-[180px] sm:max-w-xs">{userEmail || 'No email attached'}</span>
                  </p>

                  <p className="text-xs font-mono text-[#758588] mt-0.5 flex items-center gap-1.5">
                    <MapPin size={12} className="text-[#A3DCE3]" />
                    <span>{userLocality}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEditing(true)}
                className="p-2.5 rounded-2xl bg-[#202B2D] border border-[#354144] text-[#A5B1B3] hover:text-[#A3DCE3] transition active:scale-95"
                title="Edit Profile"
              >
                <Edit3 size={16} />
              </button>
            </div>

            {/* Edit Profile Form */}
            {isEditing && (
              <div className="mt-5 pt-5 border-t border-[#354144] animate-in fade-in duration-200">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#A3DCE3] mb-3">
                  EDIT CITIZEN CREDENTIALS
                </h4>
                <form onSubmit={handleSaveProfile} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-mono text-[#758588] block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-[#101819] border border-[#354144] text-xs text-[#F0F4F4] px-3 py-2 rounded-xl focus:outline-none focus:border-[#A3DCE3]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-[#758588] block mb-1">Phone Number (SMS)</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-[#101819] border border-[#354144] text-xs text-[#F0F4F4] px-3 py-2 rounded-xl focus:outline-none focus:border-[#A3DCE3] font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-[#758588] block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-[#101819] border border-[#354144] text-xs text-[#F0F4F4] px-3 py-2 rounded-xl focus:outline-none focus:border-[#A3DCE3]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-[#758588] block mb-1">Locality / Ward</label>
                    <input
                      type="text"
                      value={editLocality}
                      onChange={(e) => setEditLocality(e.target.value)}
                      className="w-full bg-[#101819] border border-[#354144] text-xs text-[#F0F4F4] px-3 py-2 rounded-xl focus:outline-none focus:border-[#A3DCE3]"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="bg-[#A3DCE3] text-[#080F0F] font-bold text-xs px-4 py-2 rounded-xl"
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="bg-[#202B2D] text-[#A5B1B3] text-xs px-3 py-2 rounded-xl"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>

          {/* Statistics 4-Grid */}
          <section className="grid grid-cols-2 gap-3">
            <div className="bg-[#192223] border border-[#354144] rounded-2xl p-4 text-center">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#758588] block">
                Total Reports
              </span>
              <span className="text-2xl font-black text-[#F0F4F4] mt-1 block">
                {myIssuesCount}
              </span>
            </div>

            <div className="bg-[#192223] border border-[#354144] rounded-2xl p-4 text-center">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#43C88A] block">
                Resolved
              </span>
              <span className="text-2xl font-black text-[#43C88A] mt-1 block">
                {resolvedCount}
              </span>
            </div>

            <div className="bg-[#192223] border border-[#354144] rounded-2xl p-4 text-center">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#38BDF8] block">
                Active
              </span>
              <span className="text-2xl font-black text-[#38BDF8] mt-1 block">
                {Math.max(0, activeCount)}
              </span>
            </div>

            <div className="bg-[#192223] border border-[#354144] rounded-2xl p-4 text-center">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A3DCE3] block">
                Upvotes
              </span>
              <span className="text-2xl font-black text-[#A3DCE3] mt-1 block">
                👍 {upvotesReceived}
              </span>
            </div>
          </section>

          {/* Sign Out Button */}
          <div className="pt-2">
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 bg-[#192223] hover:bg-[#321616] text-[#EF6666] border border-[#354144] hover:border-[#5C2424] py-3.5 rounded-2xl font-mono text-xs font-semibold transition active:scale-98"
            >
              <LogOut size={16} />
              <span>Sign Out of Lokify</span>
            </button>
          </div>
        </div>

        {/* Mobile Settings Sections */}
        <div className="space-y-4">
          {menuSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#758588] mb-3 px-2">
                {section.title}
              </h3>
              <div className="bg-[#192223] border border-[#354144] rounded-3xl overflow-hidden divide-y divide-[#354144]/60">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#202B2D] transition text-left group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-[#202B2D] text-[#A3DCE3] flex items-center justify-center shrink-0 border border-[#354144]">
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-[#F0F4F4] group-hover:text-[#A3DCE3] transition-colors block">
                            {item.label}
                          </span>
                          {item.subtitle && (
                            <span className="text-[11px] text-[#758588] font-mono block">
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.badge && (
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#132B2F] text-[#A3DCE3] border border-[#28616A]">
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight size={16} className="text-[#758588] group-hover:text-[#F0F4F4]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SMS Logs Modal */}
      {showSmsHistory && (
        <div
          className="fixed inset-0 z-50 bg-[#080F0F]/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowSmsHistory(false)}
        >
          <div
            className="bg-[#101819] border border-[#354144] rounded-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#354144] mb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A3DCE3] block">
                  CARRIER LOGS
                </span>
                <h3 className="text-lg font-bold text-[#F0F4F4]">SMS Dispatch History</h3>
              </div>
              <button
                onClick={() => setShowSmsHistory(false)}
                className="p-1.5 rounded-xl bg-[#192223] text-[#A5B1B3] hover:text-[#F0F4F4]"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3">
              {smsLogs.length === 0 ? (
                <div className="text-center py-8 text-xs font-mono text-[#758588]">
                  No SMS dispatches recorded yet.
                </div>
              ) : (
                smsLogs.map((log) => (
                  <div key={log.id} className="bg-[#192223] border border-[#354144] p-3.5 rounded-2xl text-xs">
                    <div className="flex items-center justify-between mb-1 font-mono text-[11px]">
                      <span className="text-[#A3DCE3] font-bold">To: {log.toPhone}</span>
                      <span className="text-[#758588]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[#F0F4F4] font-mono leading-relaxed bg-[#080F0F] p-2.5 rounded-xl border border-[#354144]/60">
                      {log.message}
                    </p>
                    <span className="text-[10px] font-mono text-[#43C88A] block mt-1">
                      Status: {log.status} · Gateway: {log.carrier}
                    </span>
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
