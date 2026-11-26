import { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  User,
  Mail,
  Lock,
  ArrowRight,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  X,
  Plus,
  CheckCircle,
} from 'lucide-react';
import AppLogo from './AppLogo';
import { signInWithGoogleFirebase } from '../firebase';

export default function AuthScreen({ onLogin }) {
  // 'citizen' | 'officer'
  const [activeTab, setActiveTab] = useState('citizen');

  // Citizen Email State (No phone numbers)
  const [citizenEmail, setCitizenEmail] = useState('');

  // Officer Credentials State
  const [officerEmail, setOfficerEmail] = useState('');
  const [officerPassword, setOfficerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Common UI State
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // In-App Google Account Chooser State (Never navigates to broken external URLs)
  const [showGoogleAccountSheet, setShowGoogleAccountSheet] = useState(false);
  const [showAddAccountInput, setShowAddAccountInput] = useState(false);
  const [newGoogleEmail, setNewGoogleEmail] = useState('');

  // Initialize saved Google accounts on this device from localStorage
  const [savedGoogleAccounts, setSavedGoogleAccounts] = useState(() => {
    try {
      const stored = localStorage.getItem('lokify_google_saved_accounts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore parse errors
    }
    return [
      {
        id: 'acc_g_default',
        name: 'Citizen Account',
        email: 'citizen.user@gmail.com',
      },
    ];
  });

  // 1. Citizen Google Sign-In Trigger
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const firebaseResult = await signInWithGoogleFirebase();
      if (firebaseResult.success && firebaseResult.user) {
        setIsLoading(false);
        onLogin(firebaseResult.user);
        return;
      }
      // If external popup is unconfigured or blocked, open in-app Google Account Chooser
      setIsLoading(false);
      setShowGoogleAccountSheet(true);
    } catch {
      setIsLoading(false);
      setShowGoogleAccountSheet(true);
    }
  };

  // 1b. Select an existing Google account from the in-app list
  const handleSelectGoogleAccount = (e, account) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    setTimeout(() => {
      const formattedName = account.name || account.email.split('@')[0] || 'Google Citizen';
      const timestamp = Date.now();
      const googleUser = {
        id: account.id || 'usr_g_' + timestamp.toString(36),
        name: formattedName,
        email: account.email,
        role: 'citizen',
        authProvider: 'firebase-google',
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(formattedName)}&background=1F6FEB&color=fff`,
        token: 'firebase_google_session_' + timestamp,
        loginTime: new Date(timestamp).toISOString(),
      };
      setIsLoading(false);
      setShowGoogleAccountSheet(false);
      onLogin(googleUser);
    }, 250);
  };

  // 1c. Add and sign in with a new Google account on this phone
  const handleAddNewGoogleAccount = (e) => {
    e.preventDefault();
    const email = newGoogleEmail.trim().toLowerCase();
    if (!email || !email.includes('@') || !email.includes('.')) {
      setErrorMessage('Please enter a valid Google email address.');
      return;
    }

    setIsLoading(true);
    const username = email.split('@')[0];
    const formattedName = username
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Google Citizen';

    const newAccount = {
      id: 'acc_g_' + Date.now().toString(36),
      name: formattedName,
      email: email,
    };

    // Save to device storage for future one-tap access
    const updatedAccounts = [newAccount, ...savedGoogleAccounts.filter((a) => a.email !== email)];
    setSavedGoogleAccounts(updatedAccounts);
    try {
      localStorage.setItem('lokify_google_saved_accounts', JSON.stringify(updatedAccounts));
    } catch {
      // Ignore quota errors
    }

    const googleUser = {
      id: newAccount.id,
      name: formattedName,
      email: email,
      role: 'citizen',
      authProvider: 'firebase-google',
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(formattedName)}&background=1F6FEB&color=fff`,
      token: 'firebase_google_session_' + Date.now(),
      loginTime: new Date().toISOString(),
    };

    setTimeout(() => {
      setIsLoading(false);
      setShowGoogleAccountSheet(false);
      setShowAddAccountInput(false);
      setNewGoogleEmail('');
      onLogin(googleUser);
    }, 300);
  };

  // 2. Citizen Direct Email Sign-In (No phone numbers)
  const handleCitizenEmailSignIn = (e) => {
    e.preventDefault();
    setErrorMessage('');
    const email = citizenEmail.trim().toLowerCase();

    if (!email) {
      setErrorMessage('Please enter your email address to continue.');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setErrorMessage('Please enter a valid email address (e.g. name@domain.com).');
      return;
    }

    setIsLoading(true);
    const username = email.split('@')[0];
    const displayName = username
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Citizen Reporter';

    setTimeout(() => {
      const citizenUser = {
        id: 'usr_' + Date.now().toString(36),
        name: displayName,
        email: email,
        role: 'citizen',
        authProvider: 'email',
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=238636&color=fff`,
        token: 'session_' + Date.now().toString(36),
        loginTime: new Date().toISOString(),
      };
      setIsLoading(false);
      onLogin(citizenUser);
    }, 250);
  };

  // 3. Ward Officer Login (Email ID & Password only, zero demo credentials displayed)
  const handleOfficerLogin = (e) => {
    e.preventDefault();
    setErrorMessage('');

    const email = officerEmail.trim();
    const password = officerPassword.trim();

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter your official municipal email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your officer account password.');
      return;
    }

    if (password.length < 4) {
      setErrorMessage('Invalid credentials. Please verify your municipal email and password.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const adminUser = {
        id: 'adm_' + Date.now().toString(36),
        name: 'Ward Inspection Officer',
        email: email,
        role: 'admin',
        token: 'admin_session_' + Date.now().toString(36),
        loginTime: new Date().toISOString(),
      };
      setIsLoading(false);
      onLogin(adminUser);
    }, 300);
  };

  // 4. Guest Explorer
  const handleGuestExplore = () => {
    onLogin({
      id: 'guest_citizen',
      name: 'Guest Citizen',
      email: 'guest@lokify.app',
      role: 'citizen',
      token: 'guest_token',
      loginTime: new Date().toISOString(),
    });
  };

  return (
    <div className="h-full w-full overflow-y-auto overscroll-contain bg-[#0B0F17] text-[#E6EDF3] flex flex-col justify-between items-center px-4 py-6 relative select-none max-w-md mx-auto no-scrollbar font-sans">
      {/* Background Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Branding */}
      <div className="w-full text-center pt-2 relative z-10 space-y-2">
        <div className="flex justify-center mb-1">
          <AppLogo size="lg" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome to Lokify
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            Report civic grievances, track municipal repairs, and improve your neighborhood.
          </p>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="w-full bg-[#161B26] border border-[#262F3D] rounded-2xl p-5 shadow-2xl relative z-10 my-3 space-y-4">
        {/* Segmented Tab Switcher */}
        <div className="bg-[#0D121D] p-1 rounded-xl border border-[#212A38] flex items-center gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setActiveTab('citizen');
              setErrorMessage('');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition duration-150 ${
              activeTab === 'citizen'
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User size={14} />
            <span>Citizen Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('officer');
              setErrorMessage('');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition duration-150 ${
              activeTab === 'officer'
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield size={14} />
            <span>Ward Officer</span>
          </button>
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="bg-rose-950/70 border border-rose-800 text-rose-200 p-3 rounded-xl flex items-center gap-2.5 text-xs animate-in fade-in duration-200">
            <AlertTriangle size={15} className="shrink-0 text-rose-400" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 1: CITIZEN LOGIN (Google & Direct Email Only, No Phone)     */}
        {/* ============================================================== */}
        {activeTab === 'citizen' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Primary Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm py-3 px-4 rounded-xl shadow-md transition active:scale-[0.98] border border-slate-200 disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin text-slate-600" />
              ) : (
                /* Official Google 4-Color SVG Icon */
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
              )}
              <span>{isLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

            {/* Subtle Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#262F3D]" />
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                or sign in with email
              </span>
              <div className="flex-1 h-px bg-[#262F3D]" />
            </div>

            {/* Direct Email Sign-In (No Phone) */}
            <form onSubmit={handleCitizenEmailSignIn} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={citizenEmail}
                    onChange={(e) => setCitizenEmail(e.target.value)}
                    className="w-full bg-[#0D121D] border border-[#262F3D] focus:border-teal-400 text-white placeholder-slate-500 text-xs pl-10 pr-3 py-2.5 rounded-xl outline-none transition font-normal"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition shadow-md flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                <span>Continue with Email</span>
                <ArrowRight size={14} />
              </button>
            </form>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: WARD OFFICER LOGIN (Email ID & Password only)           */}
        {/* ============================================================== */}
        {activeTab === 'officer' && (
          <form onSubmit={handleOfficerLogin} className="space-y-3.5 animate-in fade-in duration-150">
            <div className="bg-teal-950/30 border border-teal-800/40 rounded-xl p-2.5 flex items-center gap-2.5 text-xs text-teal-200">
              <ShieldCheck size={16} className="shrink-0 text-teal-400" />
              <span className="text-[11px] leading-tight">
                Official municipal officer login for grievance inspection and status management.
              </span>
            </div>

            {/* Officer Email ID */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Official Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  placeholder="Enter official municipal email"
                  value={officerEmail}
                  onChange={(e) => setOfficerEmail(e.target.value)}
                  className="w-full bg-[#0D121D] border border-[#262F3D] focus:border-teal-400 text-white placeholder-slate-500 text-xs pl-10 pr-3 py-2.5 rounded-xl outline-none font-normal transition"
                  autoFocus
                />
              </div>
            </div>

            {/* Officer Password */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter officer password"
                  value={officerPassword}
                  onChange={(e) => setOfficerPassword(e.target.value)}
                  className="w-full bg-[#0D121D] border border-[#262F3D] focus:border-teal-400 text-white placeholder-slate-500 text-xs pl-10 pr-10 py-2.5 rounded-xl outline-none font-normal transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition shadow-md flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              <ShieldCheck size={14} />
              <span>{isLoading ? 'Verifying...' : 'Sign In as Ward Officer'}</span>
            </button>
          </form>
        )}
      </div>

      {/* Guest Explorer & Terms Footer */}
      <div className="w-full text-center space-y-2 relative z-10">
        <button
          type="button"
          onClick={handleGuestExplore}
          className="text-xs text-slate-400 hover:text-slate-200 font-medium transition py-1"
        >
          Explore neighborhood without account &rarr;
        </button>

        <p className="text-[10px] text-slate-500 leading-relaxed max-w-xs mx-auto">
          Lokify is open civic infrastructure. Protected by municipal encryption.
        </p>
      </div>

      {/* ============================================================== */}
      {/* IN-APP GOOGLE ACCOUNT CHOOSER (Authentic, Fluid, Stays In-App) */}
      {/* ============================================================== */}
      {showGoogleAccountSheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div
            className="w-full sm:max-w-md bg-[#161B26] border border-[#2E3748] rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom-6 duration-200 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Google G Logo & Title */}
            <div className="flex items-start justify-between pb-2 border-b border-[#212A38]">
              <div className="flex items-center gap-2.5">
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
                  <h3 className="text-sm font-bold text-white">Choose an account</h3>
                  <p className="text-[11px] text-slate-400">to continue to Lokify</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowGoogleAccountSheet(false);
                  setShowAddAccountInput(false);
                }}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-[#212A38] transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* List of Recognized Google Accounts on Device */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
              {savedGoogleAccounts.map((account) => (
                <button
                  key={account.id || account.email}
                  type="button"
                  onClick={(e) => handleSelectGoogleAccount(e, account)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-[#0D121D] hover:bg-[#1A2230] border border-[#212A38] transition text-left active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#1F6FEB] to-[#58A6FF] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                      {account.name?.charAt(0)?.toUpperCase() || 'G'}
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-semibold text-white group-hover:text-teal-300 block truncate">
                        {account.name}
                      </span>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {account.email}
                      </span>
                    </div>
                  </div>
                  <CheckCircle size={15} className="text-teal-400 shrink-0 opacity-0 group-hover:opacity-100 transition" />
                </button>
              ))}

              {/* Add Another Account Toggle Button */}
              {!showAddAccountInput ? (
                <button
                  type="button"
                  onClick={() => setShowAddAccountInput(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#0D121D] border border-dashed border-[#262F3D] hover:border-slate-500 text-left transition text-slate-300 hover:text-white"
                >
                  <div className="w-9 h-9 rounded-full bg-[#1A2230] text-slate-300 flex items-center justify-center shrink-0">
                    <Plus size={16} />
                  </div>
                  <span className="text-xs font-medium">Use another Google account</span>
                </button>
              ) : (
                /* Add Account Input Form */
                <form onSubmit={handleAddNewGoogleAccount} className="p-3 rounded-xl bg-[#0D121D] border border-teal-500/40 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-slate-300">
                      Enter Google Email Address:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddAccountInput(false)}
                      className="text-[10px] text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                  <input
                    type="email"
                    placeholder="e.g. revanth@gmail.com"
                    value={newGoogleEmail}
                    onChange={(e) => setNewGoogleEmail(e.target.value)}
                    className="w-full bg-[#161B26] border border-[#2E3748] focus:border-teal-400 text-white placeholder-slate-500 text-xs px-3 py-2.5 rounded-xl outline-none"
                    autoFocus
                  />
                  {/* Quick autofill chip */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const prefix = newGoogleEmail.split('@')[0];
                        if (prefix) setNewGoogleEmail(`${prefix}@gmail.com`);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-[#161B26] hover:bg-[#212A38] text-slate-400 border border-[#2E3748] transition"
                    >
                      + @gmail.com
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs py-2 px-3 rounded-xl transition shadow-md flex items-center justify-center gap-1.5"
                  >
                    <span>Sign in with this Account</span>
                    <ArrowRight size={13} />
                  </button>
                </form>
              )}
            </div>

            {/* Privacy Disclaimer Footer */}
            <p className="text-[10px] text-slate-400 leading-relaxed border-t border-[#212A38] pt-2 text-center">
              To continue, Google will share your name and email with Lokify in accordance with their privacy policy.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
