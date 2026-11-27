import { useState, useEffect } from 'react';
import { registerPlugin, Capacitor } from '@capacitor/core';
import { User, Plus, X, Loader2, Check, Smartphone } from 'lucide-react';

const LokifyGoogleAuth = registerPlugin('LokifyGoogleAuth');

export default function GoogleAccountChooserSheet({ isOpen, onClose, onSelectAccount }) {
  const [accounts, setAccounts] = useState([]);
  const [isLoadingDeviceAccounts, setIsLoadingDeviceAccounts] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);

  // "Use another account" view state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customEmailError, setCustomEmailError] = useState('');

  const handleClose = () => {
    setIsAddingNew(false);
    setCustomEmail('');
    setCustomEmailError('');
    setSelectedEmail(null);
    onClose();
  };

  // Load device accounts & previously saved accounts on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function loadAccounts() {
      const accountMap = new Map();

      // 1. Load previously saved accounts from local cache
      try {
        const cached = localStorage.getItem('lokify_google_accounts');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            parsed.forEach((acc) => {
              if (acc?.email) accountMap.set(acc.email.toLowerCase(), acc);
            });
          }
        }
      } catch {
        // ignore
      }

      // 2. If on native Android, query device accounts via LokifyGoogleAuth plugin
      if (Capacitor.isNativePlatform()) {
        setIsLoadingDeviceAccounts(true);
        try {
          const res = await LokifyGoogleAuth.getDeviceAccounts();
          if (res && Array.isArray(res.accounts)) {
            res.accounts.forEach((acc) => {
              if (acc?.email) {
                const emailLower = acc.email.toLowerCase();
                if (!accountMap.has(emailLower)) {
                  accountMap.set(emailLower, acc);
                }
              }
            });
          }
        } catch (e) {
          console.warn('Native getDeviceAccounts failed:', e);
        } finally {
          if (isMounted) setIsLoadingDeviceAccounts(false);
        }
      }

      if (isMounted) {
        setAccounts(Array.from(accountMap.values()));
      }
    }

    loadAccounts();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle tapping an account card (Instant Amazon-style 1-tap sign-in)
  const handleAccountClick = (acc) => {
    setSelectedEmail(acc.email);
    // Save to local storage for quick access next time
    try {
      const updated = [acc, ...accounts.filter((a) => a.email.toLowerCase() !== acc.email.toLowerCase())].slice(0, 5);
      localStorage.setItem('lokify_google_accounts', JSON.stringify(updated));
    } catch {
      // ignore
    }

    setTimeout(() => {
      onSelectAccount({
        id: acc.id || 'g_' + Math.abs(acc.email.hashCode ? acc.email.hashCode() : Date.now()),
        email: acc.email,
        displayName: acc.displayName || acc.email.split('@')[0],
        photoUrl: acc.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(acc.displayName || 'Citizen')}&background=1F6FEB&color=fff`,
        authProvider: 'firebase-google',
      });
    }, 200);
  };

  // Submit custom / new Google email
  const handleCustomEmailSubmit = (e) => {
    e.preventDefault();
    const email = customEmail.trim().toLowerCase();
    if (!email || !email.includes('@') || !email.includes('.')) {
      setCustomEmailError('Enter a valid Google email address');
      return;
    }

    const username = email.split('@')[0];
    const nameParts = username.split(/[._-]/);
    const displayName = nameParts
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ') || 'Citizen';

    const newAcc = {
      id: 'g_' + Date.now().toString(36),
      email,
      displayName,
      photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1F6FEB&color=fff`,
    };

    handleAccountClick(newAcc);
  };

  // Launch system Android Account Chooser if requested
  const handleLaunchSystemPicker = async () => {
    try {
      const res = await LokifyGoogleAuth.signIn();
      if (res && res.success && res.email) {
        handleAccountClick({
          id: res.id,
          email: res.email,
          displayName: res.displayName,
          photoUrl: res.photoUrl,
        });
      }
    } catch {
      // Cancelled by user
    }
  };

  // Avatar color generator based on email hash
  const getAvatarBg = (email) => {
    const colors = [
      'bg-blue-600',
      'bg-emerald-600',
      'bg-indigo-600',
      'bg-amber-600',
      'bg-purple-600',
      'bg-rose-600',
      'bg-teal-600',
    ];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
    >
      {/* Bottom Sheet Card */}
      <div
        className="w-full sm:max-w-md bg-[#161B26] border-t sm:border border-[#2E3748] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl relative select-none animate-in slide-in-from-bottom duration-250 max-h-[90vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle pill (mobile) */}
        <div className="w-10 h-1 bg-[#30363D] rounded-full mx-auto mb-3 sm:hidden" />

        {/* Top Header with Google 'G' Logo & Close Button */}
        <div className="flex items-center justify-between pb-3 border-b border-[#212A38]">
          <div className="flex items-center gap-2.5">
            {/* Authentic Google 4-Color Icon */}
            <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">Choose an account</h2>
              <p className="text-[11px] text-slate-400">to continue to Lokify</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-[#21262D] transition"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Area */}
        <div className="py-2 space-y-1">
          {/* Loading indicator if scanning device accounts */}
          {isLoadingDeviceAccounts && accounts.length === 0 && (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 size={20} className="animate-spin text-blue-500" />
              <span className="text-xs">Finding Google accounts...</span>
            </div>
          )}

          {/* List of Known Accounts */}
          {accounts.map((acc) => {
            const isSelected = selectedEmail === acc.email;
            const initial = (acc.displayName || acc.email).charAt(0).toUpperCase();

            return (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleAccountClick(acc)}
                disabled={Boolean(selectedEmail)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition text-left active:scale-[0.99] border ${
                  isSelected
                    ? 'bg-blue-950/40 border-blue-600'
                    : 'bg-[#0D121D]/60 hover:bg-[#212A38] border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar Circle with Initial or Photo */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm ${getAvatarBg(
                      acc.email
                    )}`}
                  >
                    {acc.photoUrl && !acc.photoUrl.includes('ui-avatars') ? (
                      <img
                        src={acc.photoUrl}
                        alt={acc.displayName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      initial
                    )}
                  </div>

                  {/* Name & Email Details */}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white truncate">
                      {acc.displayName || acc.email.split('@')[0]}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{acc.email}</div>
                  </div>
                </div>

                {/* Selection state */}
                <div className="shrink-0 ml-2">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">›</span>
                  )}
                </div>
              </button>
            );
          })}

          {/* "Use another account" button */}
          {!isAddingNew && (
            <button
              type="button"
              onClick={() => setIsAddingNew(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#212A38] transition text-left text-slate-300 hover:text-white group border border-transparent"
            >
              <div className="w-10 h-10 rounded-full bg-[#212A38] group-hover:bg-[#2D3748] flex items-center justify-center text-slate-400 group-hover:text-white transition shrink-0">
                <Plus size={18} />
              </div>
              <div className="text-xs font-medium">Use another account</div>
            </button>
          )}

          {/* Inline Email Input for "Use another account" */}
          {isAddingNew && (
            <form onSubmit={handleCustomEmailSubmit} className="pt-2 pb-1 space-y-3">
              <div className="bg-[#0D121D] p-3 rounded-xl border border-[#2E3748] space-y-2">
                <label className="text-[11px] font-medium text-slate-400 block">
                  Sign in with your Google email
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    placeholder="Enter your Gmail address"
                    value={customEmail}
                    onChange={(e) => {
                      setCustomEmail(e.target.value);
                      setCustomEmailError('');
                    }}
                    autoFocus
                    className="w-full bg-[#161B26] border border-[#2E3748] focus:border-blue-500 text-white placeholder-slate-500 text-xs pl-9 pr-3 py-2 rounded-lg outline-none transition"
                  />
                </div>
                {customEmailError && (
                  <p className="text-[10px] text-rose-400">{customEmailError}</p>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNew(false);
                      setCustomEmail('');
                      setCustomEmailError('');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm active:scale-95"
                  >
                    Continue
                  </button>
                </div>
              </div>

              {/* Native Android Device Account Chooser button */}
              {Capacitor.isNativePlatform() && (
                <button
                  type="button"
                  onClick={handleLaunchSystemPicker}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-[#30363D] hover:bg-[#21262D] text-slate-400 hover:text-slate-200 text-xs transition"
                >
                  <Smartphone size={13} />
                  <span>Choose from device accounts picker</span>
                </button>
              )}
            </form>
          )}
        </div>

        {/* Footer Google Sharing & Privacy Policy Disclaimer */}
        <div className="pt-3 border-t border-[#212A38] text-center space-y-1">
          <p className="text-[10px] text-slate-400 leading-relaxed">
            To continue, Google will share your name, email address, language preference, and profile picture with Lokify.
          </p>
          <div className="flex items-center justify-center gap-3 text-[10px] text-blue-400">
            <span className="hover:underline cursor-pointer">Privacy Policy</span>
            <span className="text-slate-600">·</span>
            <span className="hover:underline cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </div>
    </div>
  );
}
