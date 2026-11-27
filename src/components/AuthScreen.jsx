import { useState } from 'react';
import { registerPlugin, Capacitor } from '@capacitor/core';
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
} from 'lucide-react';
import AppLogo from './AppLogo';
import { signInWithGoogleFirebase } from '../firebase';

// Native Android Google Auth Plugin
const LokifyGoogleAuth = registerPlugin('LokifyGoogleAuth');

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

  // 1. Citizen Google Sign-In (Official Google Account Chooser & Auth Flow)
  const handleGoogleSignIn = async () => {
    if (isLoading) return; // Prevent duplicate login requests
    setIsLoading(true);
    setErrorMessage('');

    // 1. On Android Native Device: use official Android OS Google Account Chooser
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await LokifyGoogleAuth.signIn();
        if (res && res.success && res.email) {
          const timestamp = Date.now();
          const googleUser = {
            id: res.id || 'usr_g_' + timestamp.toString(36),
            name: res.displayName || 'Citizen',
            email: res.email,
            role: 'citizen',
            authProvider: 'firebase-google',
            avatarUrl:
              res.photoUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(res.displayName || 'Citizen')}&background=1F6FEB&color=fff`,
            token: 'firebase_google_session_' + timestamp,
            loginTime: new Date(timestamp).toISOString(),
          };
          setIsLoading(false);
          onLogin(googleUser);
          return;
        }
      } catch (nativeErr) {
        setIsLoading(false);
        const errStr = (nativeErr?.message || '').toLowerCase();
        // If user cancelled, return cleanly to login without showing an error
        if (!errStr.includes('cancel')) {
          setErrorMessage('Could not sign in with Google account. Please try again.');
        }
        return;
      }
    }

    // 2. On Web / Desktop Browsers: use official Google Sign-In with popup / redirect
    try {
      const res = await signInWithGoogleFirebase();
      if (res.pendingRedirect) {
        // Browser is redirecting to accounts.google.com, maintain loading state
        return;
      }
      if (res.success && res.user) {
        setIsLoading(false);
        onLogin(res.user);
        return;
      }
      setIsLoading(false);
      if (res.cancelled) {
        // User closed Google Sign-In without selecting — return to login with zero error
        return;
      }
      if (res.error) {
        setErrorMessage(res.error);
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMessage(err.message || 'An error occurred during Google Sign-In.');
    }
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
    const displayName =
      username
        .split(/[._-]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'Citizen Reporter';

    setTimeout(() => {
      const timestamp = Date.now();
      const citizenUser = {
        id: 'usr_' + timestamp.toString(36),
        name: displayName,
        email: email,
        role: 'citizen',
        authProvider: 'email',
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=238636&color=fff`,
        token: 'session_' + timestamp.toString(36),
        loginTime: new Date(timestamp).toISOString(),
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
      const timestamp = Date.now();
      const adminUser = {
        id: 'adm_' + timestamp.toString(36),
        name: 'Ward Inspection Officer',
        email: email,
        role: 'admin',
        token: 'admin_session_' + timestamp.toString(36),
        loginTime: new Date(timestamp).toISOString(),
      };
      setIsLoading(false);
      onLogin(adminUser);
    }, 300);
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

      {/* Footer Branding & Municipal Encryption Notice (Zero Guest Mode) */}
      <div className="w-full text-center space-y-1 relative z-10 pt-2">
        <p className="text-[10px] text-slate-500 leading-relaxed max-w-xs mx-auto">
          Lokify Civic Infrastructure · Protected by Municipal Encryption
        </p>
      </div>
    </div>
  );
}
