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
  AlertTriangle,
  Compass,
} from 'lucide-react';
import { sendSmsNotification } from '../utils/smsService';
import AppLogo from './AppLogo';

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

  // 1. Phone validation: exactly 10 digits
  const phoneDigits = useMemo(() => phone.replace(/\D/g, ''), [phone]);
  const isPhoneValid = useMemo(() => {
    return phoneDigits.length === 10 && /^[6-9]\d{9}$/.test(phoneDigits);
  }, [phoneDigits]);

  // 2. Email validation
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

    if (!passwordChecks.hasLength) {
      setErrorMessage('Security Rule: Password must be at least 8 characters long.');
      return;
    }

    if (isRegistering) {
      if (!name.trim()) {
        setErrorMessage('Full name is required to create a citizen profile.');
        return;
      }
      if (!isPhoneValid) {
        setErrorMessage('Credential Error: Mandatory 10-digit valid mobile number required (e.g. 9845123456).');
        return;
      }
      if (!isEmailValid) {
        setErrorMessage('Credential Error: Valid email address required (e.g. yourname@gmail.com).');
        return;
      }
    } else {
      if (!phone.trim() && !email.trim()) {
        setErrorMessage('Please enter your registered 10-digit phone number or email.');
        return;
      }
    }

    setIsLoading(true);

    setTimeout(() => {
      const formattedPhone = phoneDigits ? `+91 ${phoneDigits}` : '';
      const userEmail = email.trim();
      const userName = name.trim() || userEmail.split('@')[0] || (phoneDigits ? `Citizen-${phoneDigits.slice(-4)}` : 'Citizen');

      const citizenUser = {
        id: 'usr_' + Date.now().toString(36),
        name: userName,
        phone: formattedPhone,
        email: userEmail,
        role: 'citizen',
        token: 'auth_' + Math.random().toString(36).substr(2, 10),
        loginTime: new Date().toISOString(),
      };

      if (citizenUser.phone) {
        sendSmsNotification({
          toPhone: citizenUser.phone,
          message: `Lokify Security: Welcome ${citizenUser.name}! SMS alerts for neighborhood reports are now active.`,
          eventType: 'LOGIN_WELCOME',
        });
      }

      setIsLoading(false);
      onLogin(citizenUser);
    }, 400);
  };

  const handleAdminSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (adminPasscode !== 'admin123' && adminPasscode.length < 8) {
      setErrorMessage('Security error: Official municipal passcode required.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const adminUser = {
        id: 'adm_01',
        name: 'Municipal Ward Officer',
        email: adminIdentifier.trim() || 'officer@lokify.gov',
        phone: '',
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
    }, 400);
  };

  const guestExplore = () => {
    onLogin({
      id: 'guest_citizen',
      name: 'Guest Citizen',
      phone: '+91 9845100000',
      email: 'guest@lokify.app',
      role: 'citizen',
      token: 'guest_tok',
      loginTime: new Date().toISOString(),
    });
  };

  return (
    <div className="h-full w-full overflow-y-auto overscroll-contain bg-[#080F0F] text-[#F0F4F4] flex flex-col justify-between items-center px-4 py-6 relative select-none max-w-md mx-auto no-scrollbar">
      {/* Background ambient lighting */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-[#132B2F] rounded-full blur-[100px] pointer-events-none opacity-40" />

      {/* Top Mobile Header & Branding */}
      <div className="w-full text-center pt-2 relative z-10 space-y-3">
        <div className="flex justify-center">
          <AppLogo size="lg" />
        </div>
        <div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-[#F0F4F4] font-mono">
              LOKIFY
            </h1>
            <span className="w-2 h-2 rounded-full bg-[#43C88A] animate-pulse" />
          </div>
          <p className="text-xs font-mono text-[#A3DCE3] mt-0.5">
            Smart Municipal Grievance Redressal
          </p>
        </div>

        {/* Role Segmented Mobile Switcher */}
        <div className="grid grid-cols-2 p-1 bg-[#101819] border border-[#253538] rounded-2xl max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => {
              setRole('citizen');
              setErrorMessage('');
            }}
            className={`py-2 text-xs font-mono font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              role === 'citizen'
                ? 'bg-[#315C60] text-[#A3DCE3] shadow-md border border-[#A3DCE3]'
                : 'text-[#758588] hover:text-[#F0F4F4]'
            }`}
          >
            <User size={14} />
            <span>Citizen</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('admin');
              setErrorMessage('');
            }}
            className={`py-2 text-xs font-mono font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              role === 'admin'
                ? 'bg-[#315C60] text-[#A3DCE3] shadow-md border border-[#A3DCE3]'
                : 'text-[#758588] hover:text-[#F0F4F4]'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Ward Officer</span>
          </button>
        </div>
      </div>

      {/* Main Mobile Form Card */}
      <div className="w-full bg-[#101819] border border-[#253538] rounded-3xl p-5 sm:p-6 shadow-2xl relative z-10 my-4 space-y-4">
        {/* Error Notification Alert */}
        {errorMessage && (
          <div className="bg-[#321616] border border-[#5C2424] text-[#EF6666] p-3 rounded-2xl flex items-center gap-2.5 text-xs font-mono animate-in fade-in duration-200">
            <AlertTriangle size={16} className="shrink-0" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Role: Citizen Form */}
        {role === 'citizen' ? (
          <form onSubmit={handleCitizenSubmit} className="space-y-3.5">
            {/* Citizen Mode Switcher: Sign In vs Register */}
            <div className="flex border-b border-[#253538] pb-2 justify-around text-xs font-mono">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setErrorMessage('');
                }}
                className={`pb-1 font-semibold transition ${
                  !isRegistering
                    ? 'text-[#A3DCE3] border-b-2 border-[#A3DCE3]'
                    : 'text-[#758588] hover:text-[#F0F4F4]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  setErrorMessage('');
                }}
                className={`pb-1 font-semibold transition ${
                  isRegistering
                    ? 'text-[#A3DCE3] border-b-2 border-[#A3DCE3]'
                    : 'text-[#758588] hover:text-[#F0F4F4]'
                }`}
              >
                New Citizen Register
              </button>
            </div>

            {/* Name input (when registering) */}
            {isRegistering && (
              <div>
                <label className="text-[11px] font-mono text-[#A5B1B3] uppercase block mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#758588]" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full bg-[#192223] border border-[#354144] focus:border-[#A3DCE3] text-[#F0F4F4] text-sm pl-10 pr-3 py-3 rounded-2xl outline-none font-medium transition"
                  />
                </div>
              </div>
            )}

            {/* Phone Number Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono text-[#A5B1B3] uppercase">
                  Mobile Number
                </label>
                {phone && (
                  <span
                    className={`text-[10px] font-mono ${
                      isPhoneValid ? 'text-[#43C88A]' : 'text-[#EF6666]'
                    }`}
                  >
                    {isPhoneValid ? '✓ 10-Digit Valid' : `${phoneDigits.length}/10 digits`}
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[#758588] font-mono text-xs border-r border-[#354144] pr-2">
                  <Phone size={14} />
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 10-digit number"
                  className="w-full bg-[#192223] border border-[#354144] focus:border-[#A3DCE3] text-[#F0F4F4] text-sm pl-20 pr-3 py-3 rounded-2xl outline-none font-mono transition"
                />
              </div>
            </div>

            {/* Email input (when registering) */}
            {isRegistering && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono text-[#A5B1B3] uppercase">
                    Email Address
                  </label>
                  {email && (
                    <span className={`text-[10px] font-mono ${isEmailValid ? 'text-[#43C88A]' : 'text-[#EF6666]'}`}>
                      {isEmailValid ? '✓ Valid Format' : 'Invalid Email'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#758588]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-[#192223] border border-[#354144] focus:border-[#A3DCE3] text-[#F0F4F4] text-sm pl-10 pr-3 py-3 rounded-2xl outline-none font-medium transition"
                  />
                </div>
              </div>
            )}

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono text-[#A5B1B3] uppercase">
                  Password (8+ chars)
                </label>
                {password && (
                  <span
                    className={`text-[10px] font-mono ${
                      passwordChecks.hasLength ? 'text-[#43C88A]' : 'text-[#EF6666]'
                    }`}
                  >
                    {password.length}/8 min
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#758588]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secure password"
                  className="w-full bg-[#192223] border border-[#354144] focus:border-[#A3DCE3] text-[#F0F4F4] text-sm pl-10 pr-10 py-3 rounded-2xl outline-none font-mono transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#758588] hover:text-[#F0F4F4]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength visual meter */}
              {password && (
                <div className="grid grid-cols-4 gap-1 mt-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full transition-all ${
                        i <= passwordScore
                          ? passwordScore >= 3
                            ? 'bg-[#43C88A]'
                            : 'bg-[#F2A65A]'
                          : 'bg-[#253538]'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#A3DCE3] to-[#43C88A] hover:opacity-95 text-[#080F0F] font-bold py-3.5 px-4 rounded-2xl font-mono text-sm flex items-center justify-center gap-2 transition active:scale-98 shadow-lg shadow-[#A3DCE3]/15 mt-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="animate-pulse">Authenticating with SMS...</span>
              ) : (
                <>
                  <span>{isRegistering ? 'Register Mobile Profile' : 'Sign In with Mobile'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Role: Municipal Admin Form */
          <form onSubmit={handleAdminSubmit} className="space-y-3.5">
            <div className="p-3 rounded-2xl bg-[#132B2F]/60 border border-[#28616A] text-xs font-mono text-[#A3DCE3]">
              🏛️ Municipal Officer Portal: Manage ward work orders, verify defects, and dispatch carrier SMS status updates.
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#A5B1B3] uppercase block mb-1">
                Official Identifier / Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#758588]" />
                <input
                  type="text"
                  value={adminIdentifier}
                  onChange={(e) => setAdminIdentifier(e.target.value)}
                  placeholder="Enter official email or ID"
                  className="w-full bg-[#192223] border border-[#354144] focus:border-[#A3DCE3] text-[#F0F4F4] text-sm pl-10 pr-3 py-3 rounded-2xl outline-none font-medium transition"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#A5B1B3] uppercase block mb-1">
                Municipal Security Passcode
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#758588]" />
                <input
                  type="password"
                  value={adminPasscode}
                  onChange={(e) => setAdminPasscode(e.target.value)}
                  placeholder="Enter municipal passcode"
                  className="w-full bg-[#192223] border border-[#354144] focus:border-[#A3DCE3] text-[#F0F4F4] text-sm pl-10 pr-3 py-3 rounded-2xl outline-none font-mono transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#28616A] to-[#A3DCE3] hover:opacity-95 text-[#080F0F] font-bold py-3.5 px-4 rounded-2xl font-mono text-sm flex items-center justify-center gap-2 transition active:scale-98 shadow-lg shadow-[#A3DCE3]/15 mt-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="animate-pulse">Authorizing Ward Officer...</span>
              ) : (
                <>
                  <span>Enter Municipal Admin Console</span>
                  <ShieldCheck size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#253538]" />
          </div>
          <div className="relative flex justify-center text-[10px] font-mono uppercase text-[#758588]">
            <span className="bg-[#101819] px-2">or quick access</span>
          </div>
        </div>

        {/* Instant Guest Exploration Button */}
        <button
          type="button"
          onClick={guestExplore}
          className="w-full py-3 px-4 rounded-2xl bg-[#192223] hover:bg-[#202B2D] border border-[#28616A] text-[#A3DCE3] font-mono text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-98 shadow-sm"
        >
          <Compass size={16} className="text-[#43C88A]" />
          <span>Instant Guest Access (Explore App & Map)</span>
        </button>
      </div>

      {/* Mobile Footer */}
      <div className="text-center pb-2 relative z-10">
        <p className="text-[10px] font-mono text-[#758588]">
          Lokify Pure Mobile Platform • GPS & Dual-Engine GIS Active
        </p>
      </div>
    </div>
  );
}
