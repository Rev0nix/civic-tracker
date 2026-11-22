import { useState, useEffect } from 'react';
import { MessageSquare, Phone, X, CheckCircle2 } from 'lucide-react';

export default function SmsBanner() {
  const [activeSms, setActiveSms] = useState(null);

  useEffect(() => {
    const handleSmsEvent = (e) => {
      if (e && e.detail) {
        setActiveSms(e.detail);

        // Auto dismiss after 6 seconds
        const timer = setTimeout(() => {
          setActiveSms(null);
        }, 6000);

        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('lokify:sms_received', handleSmsEvent);
    return () => window.removeEventListener('lokify:sms_received', handleSmsEvent);
  }, []);

  if (!activeSms) return null;

  return (
    <aside
      aria-label="SMS Dispatch Notification"
      className="fixed top-3 left-4 right-4 sm:left-auto sm:right-6 sm:w-[420px] z-50 bg-[#101819]/95 backdrop-blur-xl border border-[#28616A] rounded-2xl p-4 shadow-2xl text-[#F0F4F4] animate-in fade-in slide-in-from-top-4 duration-300 select-none ring-1 ring-[#A3DCE3]/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#132B2F] border border-[#28616A] text-[#A3DCE3] flex items-center justify-center shrink-0">
            <MessageSquare size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#A3DCE3]">
                INCOMING SMS ALERT
              </span>
              <span className="text-[10px] font-mono text-[#43C88A] bg-[#112C20] border border-[#1D5C3F] px-1.5 py-0.2 rounded">
                Live
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-[#A5B1B3] flex items-center gap-1 mt-0.5">
              <Phone size={11} className="text-[#A3DCE3]" />
              <span>To: {activeSms.toPhone}</span>
            </span>
          </div>
        </div>

        <button
          onClick={() => setActiveSms(null)}
          className="p-1 rounded-lg text-[#758588] hover:text-[#F0F4F4] hover:bg-[#202B2D] transition"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-2.5 pt-2 border-t border-[#354144]/60 text-xs font-sans text-[#F0F4F4] leading-relaxed bg-[#080F0F]/60 p-2.5 rounded-xl border border-[#354144]/40 font-mono">
        {activeSms.message}
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-[#758588]">
        <span>Via {activeSms.carrier || 'GovNet SMS Gateway'}</span>
        <span className="flex items-center gap-1 text-[#43C88A]">
          <CheckCircle2 size={11} />
          <span>Delivered</span>
        </span>
      </div>
    </aside>
  );
}
