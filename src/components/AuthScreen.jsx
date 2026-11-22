import { useState, useMemo } from 'react';
import {
  ShieldCheck,
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Building2,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Check,
  Compass,
} from 'lucide-react';
import { sendSmsNotification } from '../utils/smsService';

export default function AuthScreen({ onLogin }) {
  const [role, setRole] = useState('citizen'); // 'citizen' | 'admin'
  const [isRegistering, setIsRegistering] = useState(false);

  // Citizen Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Admin Form State
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPasscode, setAdminPasscode] = useState('');

  // UI state
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // STRICT CREDENTIAL VALIDATIONS:
  // 1. Phone: exactly 10 digits (digits only)
  const phoneDigits = useMemo(() => phone.replace(/\D/g, ''), [phone]);
  const isPhoneValid = useMemo(() => {
    // Valid if exactly 10 digits and starts with 6, 7, 8, or 9 (Indian mobile) or 10 digits
    return phoneDigits.length === 10 && /^[6-9]\d{9}$/.test(phoneDigits);
  }, [phoneDigits]);

  // 2. Email: RFC standard format
  const isEmailValid = useMemo(() => {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
  }, [email]);

  // 3. Password: 8+ characters strength check
  const passwordChecks = useMemo(() => {
    return {
      hasLength: password.length >= 8,
      hasNumber: /\d/.test(password),
      hasLetter: /[a-zA-Z]/.test(password),
      hasSpecial: /[^a-zA-Z0-9]/.test(password),
    };
  }, [password]);

  const passwordScore = useMemo(() => {
    let score = 0;
    if (passwordChecks.hasLength) score += 1;
    if (passwordChecks.hasNumber) score += 1;
    if (passwordChecks.hasLetter) score += 1;
    if (passwordChecks.hasSpecial) score += 1;
    return score;
  }, [passwordChecks]);

  const handleCitizenSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Enforce 8+ character password rule
    if (!passwordChecks.hasLength) {
      setErrorMessage('Security Rule: Password must be at least 8 characters long.');
      return;
    }

    if (isRegistering) {
      if (!name.trim()) {
        setErrorMessage('Full name is required to create a citizen profile.');
        return;
      }

      // Enforce 10-digit mobile check
      if (!isPhoneValid) {
        setErrorMessage('Credential Error: Mandatory 10-digit valid mobile number required (e.g. 9845123456).');
        return;
      }

      // Enforce valid email
      if (!isEmailValid) {
        setErrorMessage('Credential Error: Valid email address required (e.g. yourname@gmail.com).');
        return;
      }
    } else {
      // Citizen Sign In
      if (!phone.trim() && !email.trim()) {
        setErrorMessage('Please enter your registered 10-digit phone number or email.');
        return;
      }
    }

    setIsLoading(true);

    setTimeout(() => {
      const formattedPhone = phoneDigits ? `+91 ${phoneDigits}` : '+91 9845123456';
      const userEmail = email.trim() || 'citizen@gmail.com';
      const userName = name.trim() || userEmail.split('@')[0] || 'Citizen Reporter';

      const citizenUser = {
        id: 'usr_' + Date.now().toString(36),
        name: userName,
        phone: formattedPhone,
        email: userEmail,
        role: 'citizen',
        token: 'auth_' + Math.random().toString(36).substr(2, 10),
        loginTime: new Date().toISOString(),
      };

      // Dispatch SMS confirmation
      sendSmsNotification({
        toPhone: citizenUser.phone,
        message: `Lokify Security: Welcome ${citizenUser.name}! SMS alerts for neighborhood reports are now active.`,
        eventType: 'LOGIN_WELCOME',
      });

      setIsLoading(false);
      onLogin(citizenUser);
    }, 500);
  };

  const handleAdminSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (adminPasscode !== 'admin123' && adminPasscode.length < 8) {
      setErrorMessage('Security error: Official municipal passcode required (Default: admin123).');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const adminUser = {
        id: 'adm_01',
        name: 'Municipal Ward Officer',
        email: adminIdentifier.trim() || 'ward.engineer@lokify.gov',
        phone: '+91 8022211100',
        role: 'admin',
        token: 'admin_tok_' + Date.now().toString(36),
        loginTime: new Date().toISOString(),
      };

      sendSmsNotification({
        toPhone: adminUser.phone,
        message: `Lokify Security: Municipal Admin session authenticated.`,
        eventType: 'ADMIN_AUTH',
      });

      setIsLoading(false);
      onLogin(adminUser);
    }, 500);
  };

  const fillCitizenDemo = () => {
    setName('Revanth Gowda');
    setPhone('9845123456');
    setEmail('revanth.citizen@gmail.com');
    setPassword('lokifyPass2026');
    setErrorMessage('');
  };

  const fillAdminDemo = () => {
    setAdminIdentifier('ward.engineer@lokify.gov');
    setAdminPasscode('admin123');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-[#080F0F] text-[#F0F4F4] flex flex-col justify-center items-center px-4 py-8 relative selection:bg-[#315C60] selection:text-[#A3DCE3]">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#132B2F] rounded-full blur-[150px] pointer-events-none opacity-30" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#28616A] rounded-full blur-[160px] pointer-events-none opacity-20" />

      {/* Responsive Website Layout Container */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Column (Desktop Hero Presentation) */}
        <div className="lg:col-span-6 space-y-6 text-center lg:text-left pr-0 lg:pr-4">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#132B2F] border border-[#28616A] text-xs font-mono text-[#A3DCE3]">
            <span className="w-2 h-2 rounded-full bg-[#43C88A] animate-pulse" />
            <span>Lokify Smart Municipal Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#F0F4F4] leading-tight font-mono">
            Civic action, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A3DCE3] via-[#8DBBEB] to-[#43C88A]">
              simplified.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-[#A5B1B3] max-w-lg mx-auto lg:mx-0 leading-relaxed font-sans">
            Report neighborhood infrastructure defects—potholes, streetlights, drainage, and garbage—with GPS locking and instant carrier SMS progress notifications.
          </p>

          {/* Platform Highlights */}
          <div className="grid grid-cols-2 gap-3 pt-2 max-w-md mx-auto lg:mx-0">
            <div className="bg-[#101819] border border-[#354144] p-3.5 rounded-2xl flex items-center gap-3 text-left">
              <div className="w-8 h-8 rounded-xl bg-[#132B2F] text-[#A3DCE3] flex items-center justify-center shrink-0">
                <MapPin size={16} />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-[#F0F4F4] block">GPS Precision</span>
                <span className="text-[11px] text-[#758588] font-mono">100m duplicate filter</span>
              </div>
            </div>

            <div className="bg-[#101819] border border-[#354144] p-3.5 rounded-2xl flex items-center gap-3 text-left">
              <div className="w-8 h-8 rounded-xl bg-[#112C20] text-[#43C88A] flex items-center justify-center shrink-0">
                <Phone size={16} />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-[#F0F4F4] block">SMS Tracking</span>
                <span className="text-[11px] text-[#758588] font-mono">Live carrier alerts</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4 pt-2 text-xs font-mono text-[#758588]">
            <span className="flex items-center gap-1.5 text-[#43C88A]">
              <CheckCircle2 size={14} /> 10-Digit Mobile Check
            </span>
            <span className="flex items-center gap-1.5 text-[#43C88A]">
              <CheckCircle2 size={14} /> Gmail Verification
            </span>
            <span className="flex items-center gap-1.5 text-[#43C88A]">
              <CheckCircle2 size={14} /> 8+ Char Password
            </span>
          </div>
        </div>

        {/* Right Column (Dual Login Portals Box) */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto bg-[#101819] border border-[#354144] rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          {/* Header Branding */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#354144]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#132B2F] border border-[#28616A] text-[#A3DCE3] font-mono font-black text-xl flex items-center justify-center shadow-lg shadow-[#132B2F]/60">
                LK
              </div>
              <div>
                <h2 className="text-lg font-black text-[#F0F4F4] font-mono tracking-tight">
                  Lokify Authentication
                </h2>
                <span className="text-[11px] font-mono text-[#758588]">
                  Select your portal to continue
                </span>
              </div>
            </div>
          </div>

          {/* Portal Selector (User / Common People vs Admin) */}
          <div className="grid grid-cols-2 gap-2 bg-[#192223] p-1.5 rounded-2xl border border-[#354144] mb-6">
            <button
              type="button"
              onClick={() => {
                setRole('citizen');
                setErrorMessage('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all ${
                role === 'citizen'
                  ? 'bg-[#315C60] text-[#A3DCE3] shadow-md border border-[#A3DCE3]'
                  : 'text-[#758588] hover:text-[#A5B1B3]'
              }`}
            >
              <User size={15} />
              <span>Citizen Portal</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRole('admin');
                setErrorMessage('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all ${
                role === 'admin'
                  ? 'bg-[#315C60] text-[#A3DCE3] shadow-md border border-[#A3DCE3]'
                  : 'text-[#758588] hover:text-[#A5B1B3]'
              }`}
            >
              <ShieldCheck size={15} />
              <span>Municipal Admin</span>
            </button>
          </div>

          {/* Validation Alert Message */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-[#321616] border border-[#5C2424] rounded-2xl text-xs text-[#EF6666] font-mono flex items-center gap-2 animate-in fade-in duration-200">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. CITIZEN PORTAL (Common People) */}
          {role === 'citizen' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#A5B1B3]">
                  {isRegistering ? 'Citizen Registration' : 'Citizen Sign In'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setErrorMessage('');
                  }}
                  className="text-xs font-mono text-[#A3DCE3] hover:underline"
                >
                  {isRegistering ? 'Have an account? Sign In' : 'New user? Register'}
                </button>
              </div>

              <form onSubmit={handleCitizenSubmit} className="space-y-4">
                {isRegistering && (
                  <div>
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#A5B1B3] block mb-1">
                      Full Name <span className="text-[#EF6666]">*</span>
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#758588]" />
                      <input
                        type="text"
                        placeholder="e.g. Revanth Gowda"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-[#192223] border border-[#354144] focus:border-[#A3DCE3] text-sm text-[#F0F4F4] placeholder-[#758588] pl-10 pr-4 py-2.5 rounded-xl focus:outline-none transition"
                        required={isRegistering}
                      />
                    </div>
                  </div>
                )}

                {/* 10-Digit Mobile Phone Input with Validation */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#A5B1B3]">
                      Phone Number (SMS Alerts) <span className="text-[#EF6666]">*</span>
                    </label>
                    {phone.length > 0 && (
                      <span
                        className={`text-[10px] font-mono font-bold ${
                          isPhoneValid ? 'text-[#43C88A]' : 'text-[#EF6666]'
                        }`}
                      >
                        {isPhoneValid ? '✓ 10 Digits Valid' : `${phoneDigits.length}/10 digits`}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#A3DCE3] font-bold">
                      +91
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="9845123456 (10 digits)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className={`w-full bg-[#192223] border text-sm text-[#F0F4F4] placeholder-[#758588] pl-12 pr-4 py-2.5 rounded-xl focus:outline-none transition font-mono ${
                        phone.length > 0
                          ? isPhoneValid
                            ? 'border-[#43C88A] focus:border-[#43C88A]'
                            : 'border-[#EF6666] focus:border-[#EF6666]'
                          : 'border-[#354144] focus:border-[#A3DCE3]'
                      }`}
                      required={isRegistering}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[#758588] mt-1 block">
                    Mandatory 10-digit mobile number for real-time status updates via SMS
                  </span>
                </div>

                {/* Gmail / Email Input with Validation */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#A5B1B3]">
                      Gmail / Email Address <span className="text-[#EF6666]">*</span>
                    </label>
                    {email.length > 0 && (
                      <span
                        className={`text-[10px] font-mono font-bold ${
                          isEmailValid ? 'text-[#43C88A]' : 'text-[#EF6666]'
                        }`}
                      >
                        {isEmailValid ? '✓ Valid format' : 'Invalid email'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#758588]" />
                    <input
                      type="email"
                      placeholder="yourname@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full bg-[#192223] border text-sm text-[#F0F4F4] placeholder-[#758588] pl-10 pr-4 py-2.5 rounded-xl focus:outline-none transition ${
                        email.length > 0
                          ? isEmailValid
                            ? 'border-[#43C88A] focus:border-[#43C88A]'
                            : 'border-[#EF6666] focus:border-[#EF6666]'
                          : 'border-[#354144] focus:border-[#A3DCE3]'
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* Password Input with 8+ Character Validation */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#A5B1B3]">
                      Password <span className="text-[#EF6666]">*</span>
                    </label>
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        passwordChecks.hasLength ? 'text-[#43C88A]' : 'text-[#EF6666]'
                      }`}
                    >
                      {password.length}/8+ min
                    </span>
                  </div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#758588]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter 8 or more characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full bg-[#192223] border text-sm text-[#F0F4F4] placeholder-[#758588] pl-10 pr-10 py-2.5 rounded-xl focus:outline-none transition font-mono ${
                        password.length > 0
                          ? passwordChecks.hasLength
                            ? 'border-[#43C88A] focus:border-[#43C88A]'
                            : 'border-[#EF6666] focus:border-[#EF6666]'
                          : 'border-[#354144] focus:border-[#A3DCE3]'
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#758588] hover:text-[#F0F4F4]"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {/* 8+ Char Strength Checklist */}
                  <div className="mt-2.5 p-2.5 bg-[#080F0F] rounded-xl border border-[#354144]/60 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[#758588]">Strength Rating:</span>
                      <span
                        className={`font-bold ${
                          passwordScore >= 3 ? 'text-[#43C88A]' : passwordScore >= 2 ? 'text-[#E9B85C]' : 'text-[#EF6666]'
                        }`}
                      >
                        {passwordScore >= 3 ? 'Strong' : passwordScore >= 2 ? 'Moderate' : 'Weak (Min 8 chars)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                      <div className={`h-1.5 rounded-full ${password.length >= 8 ? 'bg-[#43C88A]' : 'bg-[#354144]'}`} />
                      <div className={`h-1.5 rounded-full ${passwordChecks.hasNumber ? 'bg-[#43C88A]' : 'bg-[#354144]'}`} />
                      <div className={`h-1.5 rounded-full ${passwordChecks.hasLetter ? 'bg-[#43C88A]' : 'bg-[#354144]'}`} />
                      <div className={`h-1.5 rounded-full ${passwordChecks.hasSpecial ? 'bg-[#43C88A]' : 'bg-[#354144]'}`} />
                    </div>

                    <div className="flex items-center gap-3 text-[10px] font-mono text-[#758588] pt-1">
                      <span className={`flex items-center gap-1 ${passwordChecks.hasLength ? 'text-[#43C88A]' : ''}`}>
                        {passwordChecks.hasLength ? <Check size={11} /> : '•'} 8+ Characters
                      </span>
                      <span className={`flex items-center gap-1 ${passwordChecks.hasNumber ? 'text-[#43C88A]' : ''}`}>
                        {passwordChecks.hasNumber ? <Check size={11} /> : '•'} Number
                      </span>
                      <span className={`flex items-center gap-1 ${passwordChecks.hasLetter ? 'text-[#43C88A]' : ''}`}>
                        {passwordChecks.hasLetter ? <Check size={11} /> : '•'} Letters
                      </span>
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading || (isRegistering && (!isPhoneValid || !isEmailValid || !passwordChecks.hasLength))}
                    className="w-full bg-[#A3DCE3] hover:bg-[#85CBD3] disabled:opacity-40 disabled:cursor-not-allowed text-[#080F0F] font-bold text-xs py-3.5 px-4 rounded-2xl shadow-xl shadow-[#A3DCE3]/20 transition active:scale-98 flex items-center justify-center gap-2 border border-[#A3DCE3]"
                  >
                    <span>{isRegistering ? 'Register Verified Citizen Account' : 'Sign In to Citizen Portal'}</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </form>

              {/* Demo Pre-fill & Instant Guest Access */}
              <div className="mt-4 pt-3 border-t border-[#354144]/60 space-y-2 text-center">
                <button
                  type="button"
                  onClick={fillCitizenDemo}
                  className="w-full text-[11px] font-mono text-[#A3DCE3] hover:underline bg-[#192223] border border-[#354144] py-2 px-3 rounded-xl inline-flex items-center justify-center gap-1.5 transition hover:bg-[#202b2d]"
                >
                  <Sparkles size={13} />
                  <span>Auto-fill Citizen Demo (10-digit phone + 8+ char pass)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onLogin({
                      email: 'citizen.explorer@lokify.gov',
                      phone: '9876543210',
                      name: 'Citizen Explorer',
                      locality: 'Bengaluru Central',
                      role: 'citizen',
                    });
                  }}
                  className="w-full text-xs font-mono font-semibold text-[#F0F4F4] hover:text-[#A3DCE3] bg-[#132B2F]/60 border border-[#28616A] py-2.5 px-3 rounded-xl inline-flex items-center justify-center gap-2 transition hover:bg-[#132B2F] active:scale-95 shadow-sm"
                >
                  <Compass size={14} className="text-[#A3DCE3]" />
                  <span>Instant Guest Access (Explore App & Map)</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. MUNICIPAL ADMIN PORTAL */}
          {role === 'admin' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#A5B1B3]">
                  Municipal Authority Sign In
                </span>
                <span className="text-[10px] font-mono text-[#E9B85C] bg-[#2d2516] border border-[#5c4a24] px-2 py-0.5 rounded-full">
                  Government Jurisdiction Only
                </span>
              </div>

              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#A5B1B3] block mb-1">
                    Official Identifier / Email
                  </label>
                  <div className="relative">
                    <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#758588]" />
                    <input
                      type="text"
                      placeholder="ward.engineer@lokify.gov"
                      value={adminIdentifier}
                      onChange={(e) => setAdminIdentifier(e.target.value)}
                      className="w-full bg-[#192223] border border-[#354144] focus:border-[#A3DCE3] text-sm text-[#F0F4F4] placeholder-[#758588] pl-10 pr-4 py-2.5 rounded-xl focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#A5B1B3] block mb-1">
                    Admin Passcode / Security Key <span className="text-[#EF6666]">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#758588]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter Passcode (admin123)"
                      value={adminPasscode}
                      onChange={(e) => setAdminPasscode(e.target.value)}
                      className="w-full bg-[#192223] border border-[#354144] focus:border-[#A3DCE3] text-sm text-[#F0F4F4] placeholder-[#758588] pl-10 pr-10 py-2.5 rounded-xl focus:outline-none transition font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#758588] hover:text-[#F0F4F4]"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#A3DCE3] hover:bg-[#85CBD3] text-[#080F0F] font-bold text-xs py-3.5 px-4 rounded-2xl shadow-xl shadow-[#A3DCE3]/20 transition active:scale-98 flex items-center justify-center gap-2 border border-[#A3DCE3]"
                  >
                    <ShieldCheck size={16} />
                    <span>Access Municipal Admin Center</span>
                  </button>
                </div>
              </form>

              <div className="mt-4 pt-3 border-t border-[#354144]/60 text-center">
                <button
                  type="button"
                  onClick={fillAdminDemo}
                  className="text-[11px] font-mono text-[#A3DCE3] hover:underline bg-[#192223] border border-[#354144] px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
                >
                  <Sparkles size={11} />
                  <span>Auto-fill Admin Demo (admin123)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
