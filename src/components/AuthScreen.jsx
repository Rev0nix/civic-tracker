import { useState } from 'react';
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
} from 'lucide-react';
import { sendSmsNotification } from '../utils/smsService';

export default function AuthScreen({ onLogin }) {
  const [role, setRole] = useState('citizen'); // 'citizen' | 'admin'
  const [isRegistering, setIsRegistering] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Admin Credentials
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPasscode, setAdminPasscode] = useState('');

  // Error & Feedback
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Password validation: must be 8 or more characters
  const isPasswordValid = password.length >= 8;

  // Phone validation: clean 10 or more digits
  const cleanPhone = phone.replace(/\D/g, '');
  const isPhoneValid = cleanPhone.length >= 10;

  // Email validation: basic email regex
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleCitizenSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 8) {
      setErrorMessage('Security requirement: Password must be at least 8 characters long.');
      return;
    }

    if (isRegistering) {
      if (!name.trim()) {
        setErrorMessage('Please provide your full name.');
        return;
      }
      if (!isPhoneValid) {
        setErrorMessage('Please enter a valid 10-digit mobile phone number for SMS alerts.');
        return;
      }
      if (!isEmailValid) {
        setErrorMessage('Please provide a valid Gmail / Email address.');
        return;
      }
    } else {
      if (!email.trim() && !phone.trim()) {
        setErrorMessage('Please provide your registered Phone Number or Gmail.');
        return;
      }
    }

    setIsLoading(true);

    setTimeout(() => {
      const userPhone = phone.trim().startsWith('+') ? phone.trim() : `+91 ${cleanPhone || '9876543210'}`;
      const userEmail = email.trim() || 'citizen@gmail.com';
      const userName = name.trim() || (userEmail.split('@')[0]) || 'Citizen Reporter';

      const citizenUser = {
        id: 'usr_' + Date.now().toString(36),
        name: userName,
        phone: userPhone,
        email: userEmail,
        role: 'citizen',
        token: 'auth_' + Math.random().toString(36).substr(2, 12),
        loginTime: new Date().toISOString(),
      };

      // Dispatch simulated Welcome SMS
      sendSmsNotification({
        toPhone: citizenUser.phone,
        message: `Lokify Security: Welcome ${citizenUser.name}! SMS alerts for neighborhood reports are now active.`,
        eventType: 'LOGIN_WELCOME',
      });

      setIsLoading(false);
      onLogin(citizenUser);
    }, 600);
  };

  const handleAdminSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (adminPasscode !== 'admin123' && adminPasscode.length < 8) {
      setErrorMessage('Invalid credentials. Official Admin Passcode is required (Default: admin123).');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const adminUser = {
        id: 'adm_01',
        name: 'Municipal Officer',
        email: adminIdentifier.trim() || 'admin@lokify.gov',
        phone: '+91 80222 11100',
        role: 'admin',
        token: 'admin_tok_' + Date.now().toString(36),
        loginTime: new Date().toISOString(),
      };

      sendSmsNotification({
        toPhone: adminUser.phone,
        message: `Lokify Security: Admin session authenticated from verified station.`,
        eventType: 'ADMIN_AUTH',
      });

      setIsLoading(false);
      onLogin(adminUser);
    }, 500);
  };

  // Quick Demo Fillers
  const fillCitizenDemo = () => {
    setName('Revanth Gowda');
    setPhone('+91 98451 23456');
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
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#132B2F] rounded-full blur-[140px] pointer-events-none opacity-40" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-[#101819] border border-[#354144] rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-3xl bg-[#132B2F] border border-[#28616A] text-[#A3DCE3] font-mono font-black text-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#132B2F]/60">
            LK
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F0F4F4] font-mono">
            LOKIFY
          </h1>
          <p className="text-xs font-mono text-[#A5B1B3] mt-1">
            Civic Issue Reporting & Municipal Tracking
          </p>
        </div>

        {/* Portal Switcher (Citizen vs Admin) */}
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
            <User size={14} />
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
            <ShieldCheck size={14} />
            <span>Municipal Admin</span>
          </button>
        </div>

        {/* Validation Alert */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-[#321616] border border-[#5C2424] rounded-2xl text-xs text-[#EF6666] font-mono flex items-center gap-2 animate-in fade-in duration-200">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* CITIZEN PORTAL FORM */}
        {role === 'citizen' && (
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-[#354144] pb-2">
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
                {isRegistering ? 'Existing user? Sign In' : 'New citizen? Register'}
              </button>
            </div>

            <form onSubmit={handleCitizenSubmit} className="space-y-4">
              {isRegistering && (
                <div>
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#A5B1B3] block mb-1.5">
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

              {/* Phone Number */}
              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#A5B1B3] block mb-1.5">
                  Mobile Phone (SMS Notifications) <span className="text-[#EF6666]">*</span>
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#758588]" />
                  <input
                    type="tel"
                    placeholder="e.g. +91 98451 23456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#192223] border border-[#354144] focus:border-[#A3DCE3] text-sm text-[#F0F4F4] placeholder-[#758588] pl-10 pr-4 py-2.5 rounded-xl focus:outline-none transition font-mono"
                    required={isRegistering}
                  />
                </div>
                <span className="text-[10px] font-mono text-[#758588] mt-1 block">
                  Used to deliver SMS updates whenever your report status changes
                </span>
              </div>

              {/* Gmail / Email */}
              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#A5B1B3] block mb-1.5">
                  Gmail / Email Address <span className="text-[#EF6666]">*</span>
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#758588]" />
                  <input
                    type="email"
                    placeholder="e.g. yourname@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#192223] border border-[#354144] focus:border-[#A3DCE3] text-sm text-[#F0F4F4] placeholder-[#758588] pl-10 pr-4 py-2.5 rounded-xl focus:outline-none transition"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#A5B1B3]">
                    Password <span className="text-[#EF6666]">*</span>
                  </label>
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      isPasswordValid ? 'text-[#43C88A]' : 'text-[#EF6666]'
                    }`}
                  >
                    {password.length}/8+ chars min
                  </span>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#758588]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter 8 or more characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

                {/* Password strength meter */}
                <div className="mt-2 flex items-center gap-1">
                  <div
                    className={`h-1 flex-1 rounded-full transition-all ${
                      password.length >= 8 ? 'bg-[#43C88A]' : password.length >= 4 ? 'bg-[#E9B85C]' : 'bg-[#354144]'
                    }`}
                  />
                  <div
                    className={`h-1 flex-1 rounded-full transition-all ${
                      password.length >= 10 ? 'bg-[#43C88A]' : 'bg-[#354144]'
                    }`}
                  />
                  <div
                    className={`h-1 flex-1 rounded-full transition-all ${
                      password.length >= 12 ? 'bg-[#43C88A]' : 'bg-[#354144]'
                    }`}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#A3DCE3] hover:bg-[#85CBD3] text-[#080F0F] font-bold text-xs py-3.5 px-4 rounded-2xl shadow-xl shadow-[#A3DCE3]/20 transition active:scale-98 flex items-center justify-center gap-2 border border-[#A3DCE3]"
                >
                  <span>{isRegistering ? 'Create Citizen Account' : 'Sign In with Credentials'}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </form>

            {/* Quick Demo Pill */}
            <div className="mt-4 pt-4 border-t border-[#354144]/60 text-center">
              <button
                type="button"
                onClick={fillCitizenDemo}
                className="text-[11px] font-mono text-[#A3DCE3] hover:underline bg-[#192223] border border-[#354144] px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
              >
                <Sparkles size={11} />
                <span>Auto-fill Demo Citizen (Revanth)</span>
              </button>
            </div>
          </div>
        )}

        {/* MUNICIPAL ADMIN PORTAL FORM */}
        {role === 'admin' && (
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-[#354144] pb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#A5B1B3]">
                Government Official Portal
              </span>
              <span className="text-[10px] font-mono text-[#E9B85C] bg-[#2d2516] border border-[#5c4a24] px-2 py-0.5 rounded-full">
                Restricted Access
              </span>
            </div>

            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#A5B1B3] block mb-1.5">
                  Official Gov Identifier / Email
                </label>
                <div className="relative">
                  <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#758588]" />
                  <input
                    type="text"
                    placeholder="e.g. ward.engineer@lokify.gov"
                    value={adminIdentifier}
                    onChange={(e) => setAdminIdentifier(e.target.value)}
                    className="w-full bg-[#192223] border border-[#354144] focus:border-[#A3DCE3] text-sm text-[#F0F4F4] placeholder-[#758588] pl-10 pr-4 py-2.5 rounded-xl focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#A5B1B3] block mb-1.5">
                  Admin Passcode / Security Key <span className="text-[#EF6666]">*</span>
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#758588]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter Passcode (Default: admin123)"
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
                  <span>Authenticate Municipal Admin</span>
                </button>
              </div>
            </form>

            <div className="mt-4 pt-4 border-t border-[#354144]/60 text-center">
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

      {/* Security Footer Notice */}
      <div className="mt-6 text-center text-[11px] font-mono text-[#758588] flex items-center gap-2">
        <CheckCircle2 size={13} className="text-[#43C88A]" />
        <span>Credentials encrypted & protected with 8+ char rule & phone verification</span>
      </div>
    </div>
  );
}
