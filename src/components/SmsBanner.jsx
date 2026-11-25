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
      className="fixed inset-0 z-50 bg-[#0D1117]/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none"
    >
      <div
        className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 max-w-sm w-full shadow-2xl text-[#F0F6FC] animate-in zoom-in-95 duration-200 flex flex-col items-center text-center gap-3 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Centered Icon */}
        <div className="w-12 h-12 rounded-xl bg-[#1F6FEB]/15 text-[#58A6FF] flex items-center justify-center shadow-sm">
          <MessageSquare size={22} />
        </div>

        {/* Title & Badge */}
        <div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-xs font-semibold text-[#F0F6FC]">
              SMS Dispatch Alert
            </span>
            <span className="text-[10px] text-[#3FB950] bg-[#238636]/15 border border-[#238636]/30 px-1.5 py-0.2 rounded-full font-medium">
              Live
            </span>
          </div>
          <span className="text-xs text-[#8B949E] flex items-center justify-center gap-1">
            <Phone size={11} className="text-[#58A6FF]" />
            <span>Recipient: {activeSms.toPhone}</span>
          </span>
        </div>

        {/* SMS Message Body */}
        <div className="w-full bg-[#0D1117] border border-[#30363D] p-3 rounded-xl text-xs text-[#F0F6FC] leading-relaxed text-left">
          {activeSms.message}
        </div>

        {/* Carrier Info */}
        <div className="w-full flex items-center justify-between text-[11px] text-[#8B949E] px-1">
          <span>Via {activeSms.carrier || 'SMS Gateway'}</span>
          <span className="flex items-center gap-1 text-[#3FB950]">
            <CheckCircle2 size={12} />
            <span>Delivered</span>
          </span>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={() => setActiveSms(null)}
          className="w-full mt-2 bg-[#1F6FEB] hover:bg-[#388BFD] text-white font-semibold text-xs py-3 rounded-xl transition active:scale-95 shadow-sm"
        >
          OK
        </button>
      </div>
    </div>
  );
}
