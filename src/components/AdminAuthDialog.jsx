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
    <div className="fixed inset-0 z-50 bg-[#0D1117]/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="bg-[#161B22] border border-[#30363D] rounded-2xl w-full max-w-sm p-6 shadow-2xl relative select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-[#8B949E] hover:text-[#F0F6FC] transition"
        >
          <X size={16} />
        </button>

        <div className="w-12 h-12 rounded-xl bg-[#1F6FEB]/15 text-[#58A6FF] flex items-center justify-center mx-auto mb-3">
          <ShieldCheck size={24} />
        </div>

        <h3 className="text-base font-bold text-center text-[#F0F6FC] mb-1">
          Ward Officer Verification
        </h3>
        <p className="text-xs text-[#8B949E] text-center mb-4 leading-relaxed">
          Enter passcode to manage report statuses and dispatch SMS notifications.
        </p>

        {error && (
          <div className="mb-3.5 p-2.5 bg-[#321616] border border-[#5C2424] text-[#F85149] text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B949E]" />
            <input
              type="password"
              placeholder="Passcode (admin123)"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full bg-[#0D1117] border border-[#30363D] focus:border-[#58A6FF] text-xs text-[#F0F6FC] placeholder-[#8B949E] pl-9 pr-4 py-2.5 rounded-xl focus:outline-none"
              autoFocus
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 bg-[#1F6FEB] hover:bg-[#388BFD] text-white font-semibold text-xs py-2.5 rounded-xl transition active:scale-95"
            >
              Unlock Controls
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] text-xs py-2.5 rounded-xl transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
