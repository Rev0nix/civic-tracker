import { useState } from 'react';
import { X, Send, Bot, User } from 'lucide-react';

export default function AiAssistantModal({ isOpen, onClose }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Namaste! I am your Lokify Civic Assistant. Ask me about issue statuses, municipal guidelines, or reporting timelines in English or Kannada.',
    },
  ]);

  if (!isOpen) return null;

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInput('');

    setTimeout(() => {
      let botReply =
        "I can help you track issues or understand municipal guidelines. Try asking about 'potholes', 'status', or 'timeline'.";
      const q = userText.toLowerCase();

      if (q.includes('status') || q.includes('track') || q.includes('ಸ್ಥಿತಿ')) {
        botReply =
          "You can view your submitted issues under the 'My Issues' tab. The status flows through Open ➔ Acknowledged ➔ Assigned ➔ In Progress ➔ Resolved.";
      } else if (q.includes('pothole') || q.includes('road') || q.includes('ಗುಂಡಿ')) {
        botReply =
          'Road and pothole hazards are categorized under Priority 1. Severe hazards receive accelerated municipal review within 24–48 hours.';
      } else if (q.includes('kannada') || q.includes('ಕನ್ನಡ')) {
        botReply =
          'ನಮಸ್ಕಾರ! Lokify ಪೋರ್ಟಲ್ ಮುಖಾಂತರ ನಿಮ್ಮ ಹತ್ತಿರದ ಸಮಸ್ಯೆಗಳನ್ನು (ರಸ್ತೆ ಗುಂಡಿ, ಬೀದಿ ದೀಪ, ಕಸ, ಚರಂಡಿ) ಸುಲಭವಾಗಿ ವರದಿ ಮಾಡಬಹುದು ಮತ್ತು ಪರಿಹಾರವನ್ನು ವೀಕ್ಷಿಸಬಹುದು.';
      } else if (q.includes('drain') || q.includes('water') || q.includes('ಚರಂಡಿ')) {
        botReply =
          'Drainage and sewage issues are forwarded to the local water supply & sanitation board. Reports with clear photos are dispatched faster.';
      }

      setMessages((prev) => [...prev, { sender: 'bot', text: botReply }]);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#080F0F]/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="bg-[#101819] border border-[#354144] rounded-t-3xl sm:rounded-3xl w-full max-w-lg h-[520px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative animate-in fade-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#192223] px-5 py-4 border-b border-[#354144] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#132B2F] border border-[#28616A] text-[#A3DCE3] flex items-center justify-center">
              <Bot size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F0F4F4]">Lokify Civic AI</h3>
              <span className="text-[11px] font-mono text-[#A3DCE3] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#43C88A] inline-block animate-pulse" />
                Multilingual Support (EN / KN)
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#202B2D] text-[#A5B1B3] hover:text-[#F0F4F4] transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#080F0F]">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2.5 max-w-[85%] ${
                m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-mono ${
                  m.sender === 'user'
                    ? 'bg-[#315C60] text-[#A3DCE3]'
                    : 'bg-[#192223] border border-[#354144] text-[#A3DCE3]'
                }`}
              >
                {m.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div
                className={`p-3 rounded-2xl text-xs leading-relaxed font-sans ${
                  m.sender === 'user'
                    ? 'bg-[#A3DCE3] text-[#080F0F] font-semibold'
                    : 'bg-[#192223] border border-[#354144] text-[#F0F4F4]'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-[#101819] border-t border-[#354144] flex gap-2">
          <input
            type="text"
            placeholder="Ask about guidelines, potholes, status..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-[#192223] border border-[#354144] text-xs text-[#F0F4F4] placeholder-[#758588] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#A3DCE3]"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-[#A3DCE3] disabled:opacity-40 text-[#080F0F] px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center transition active:scale-95"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
