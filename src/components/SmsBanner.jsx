import { useState, useEffect } from 'react';
import { MessageSquare, Phone, CheckCircle2 } from 'lucide-react';

export default function SmsBanner() {
  const [activeSms, setActiveSms] = useState(null);

  useEffect(() => {
    const handleSmsEvent = (e) => {
      if (e && e.detail) {
        setActiveSms(e.detail);
      }
    };

    window.addEventListener('lokify:sms_received', handleSmsEvent);
    return () => window.removeEventListener('lokify:sms_received', handleSmsEvent);
  }, []);

  if (!activeSms) return null;

  return (
    <div
      aria-label="SMS Notification Modal"
      className="fixed inset-0 z-50 bg-[#080F0F]/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none"
    >
      <div
        className="bg-[#101819] border border-[#28616A] rounded-3xl p-6 max-w-sm w-full shadow-2xl text-[#F0F4F4] animate-in zoom-in-95 duration-200 flex flex-col items-center text-center gap-3 relative ring-1 ring-[#A3DCE3]/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Centered Icon */}
        <div className="w-12 h-12 rounded-2xl bg-[#132B2F] border border-[#28616A] text-[#A3DCE3] flex items-center justify-center shadow-lg shadow-[#A3DCE3]/20">
          <MessageSquare size={22} />
        </div>

        {/* Title & Badge */}
        <div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#A3DCE3]">
              INCOMING CARRIER SMS
            </span>
            <span className="text-[9px] font-mono text-[#43C88A] bg-[#112C20] border border-[#1D5C3F] px-1.5 py-0.5 rounded font-bold">
              LIVE
            </span>
          </div>
          <span className="text-xs font-mono text-[#A5B1B3] flex items-center justify-center gap-1">
            <Phone size={11} className="text-[#A3DCE3]" />
            <span>Recipient: {activeSms.toPhone}</span>
          </span>
        </div>

        {/* SMS Message Body */}
        <div className="w-full bg-[#080F0F] border border-[#28616A]/50 p-3.5 rounded-2xl text-xs font-mono text-[#F0F4F4] leading-relaxed text-left">
          {activeSms.message}
        </div>

        {/* Carrier Info */}
        <div className="w-full flex items-center justify-between text-[10px] font-mono text-[#758588] px-1">
          <span>Via {activeSms.carrier || 'GovNet SMS Gateway'}</span>
          <span className="flex items-center gap-1 text-[#43C88A]">
            <CheckCircle2 size={11} />
            <span>Delivered</span>
          </span>
        </div>

        {/* Prominent Dismiss Button */}
        <button
          onClick={() => setActiveSms(null)}
          className="w-full mt-2 bg-[#A3DCE3] hover:bg-[#85CBD3] text-[#080F0F] font-bold text-xs py-3.5 rounded-2xl transition active:scale-95 font-mono shadow-lg shadow-[#A3DCE3]/20"
        >
          OK
        </button>
      </div>
    </div>
  );
}
