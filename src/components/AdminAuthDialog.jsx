import { useState } from 'react';
import { ShieldCheck, X, AlertTriangle, Lock } from 'lucide-react';

export default function AdminAuthDialog({
  isOpen,
  onClose,
  onAuthenticate,
}) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (passcode.trim() === 'admin123') {
      onAuthenticate(true);
      setPasscode('');
      setError('');
      onClose();
    } else {
      setError('Invalid passcode. Default passcode is admin123');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#080F0F]/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="bg-[#101819] border border-[#354144] rounded-3xl w-full max-w-sm p-6 shadow-2xl relative select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-[#192223] text-[#758588] hover:text-[#F0F4F4] transition"
        >
          <X size={16} />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-[#132B2F] border border-[#28616A] text-[#A3DCE3] flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={24} />
        </div>

        <h3 className="text-base font-bold text-center text-[#F0F4F4] mb-1 font-mono">
          Municipal Officer Verification
        </h3>
        <p className="text-xs text-[#758588] text-center mb-5 font-mono leading-relaxed">
          Enter passcode to control report cards, change statuses, and dispatch SMS.
        </p>

        {error && (
          <div className="mb-4 p-2.5 bg-[#321616] border border-[#5C2424] text-[#EF6666] text-xs font-mono rounded-xl flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#758588]" />
            <input
              type="password"
              placeholder="Enter Passcode (admin123)"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full bg-[#192223] border border-[#354144] focus:border-[#A3DCE3] text-xs text-[#F0F4F4] placeholder-[#758588] pl-9 pr-4 py-3 rounded-xl focus:outline-none font-mono"
              autoFocus
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 bg-[#A3DCE3] hover:bg-[#85CBD3] text-[#080F0F] font-bold text-xs py-3 rounded-xl transition active:scale-95 font-mono"
            >
              Unlock Admin
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 bg-[#192223] hover:bg-[#202B2D] text-[#A5B1B3] text-xs font-mono py-3 rounded-xl transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
