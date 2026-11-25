import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  PlusCircle,
  RotateCcw,
  ShieldCheck,
  Clock,
  Car,
  Lightbulb,
  Trash2,
  HelpCircle,
} from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  { text: 'How do pothole complaints get resolved?', icon: Car },
  { text: 'Report a broken streetlight in my area', icon: Lightbulb },
  { text: 'How is garbage clearance prioritized?', icon: Trash2 },
  { text: 'Municipal resolution timelines (SLA)', icon: Clock },
  { text: 'How do I track my submitted issues?', icon: ShieldCheck },
  { text: 'ಕನ್ನಡದಲ್ಲಿ ಮಾಹಿತಿ ನೀಡಿ (Help in Kannada)', icon: HelpCircle },
];

export default function LokAiScreen({ onOpenReport }) {
  const [messages, setMessages] = useState([
    {
      sender: 'lok',
      text: 'Hey, I am Lok! 👋 Welcome to your municipal assistant in Lokify. Ask me anything about filing complaints, resolution timelines, or tracking your civic issues.',
      timestamp: 'Just now',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const generateLokReply = (userQuery) => {
    const q = userQuery.toLowerCase();

    if (q.includes('pothole') || q.includes('road') || q.includes('ಗುಂಡಿ') || q.includes('ರಸ್ತೆ')) {
      return {
        text: 'Road and pothole hazards are marked as high priority in Lokify. The ward engineering team aims for on-site inspection within **24 hours** and cold-mix patch filling within **48 hours**.\n\n💡 Tip: Include a photo with clear road landmarks when reporting to accelerate dispatch!',
        showReportBtn: true,
      };
    }

    if (q.includes('light') || q.includes('streetlight') || q.includes('ದೀಪ')) {
      return {
        text: 'Streetlight faults are routed to the ward electrical division. Standard turnaround is **48–72 hours**.\n\nWhen reporting, note the nearest pole number or landmark to help the repair team locate the fixture quickly.',
        showReportBtn: true,
      };
    }

    if (q.includes('garbage') || q.includes('waste') || q.includes('trash') || q.includes('ಕಸ')) {
      return {
        text: 'Garbage accumulation complaints are dispatched directly to the solid waste management (SWM) supervisor. Routine pickups occur within **24–48 hours**.',
        showReportBtn: true,
      };
    }

    if (q.includes('water') || q.includes('drain') || q.includes('sewage') || q.includes('ಚರಂಡಿ') || q.includes('ನೀರು')) {
      return {
        text: 'Water supply leaks and underground drainage blocks are forwarded immediately to the municipal water supply and sewerage board. Burst pipes receive emergency same-day dispatch.',
        showReportBtn: true,
      };
    }

    if (q.includes('track') || q.includes('status') || q.includes('my issues') || q.includes('ಸ್ಥಿತಿ')) {
      return {
        text: "You can track the live progress of all your submitted complaints under the **'My Reports'** tab.\n\nEvery issue moves transparently through stages:\n1. **Reported**\n2. **Acknowledged** (Verified by Ward Officer)\n3. **In Progress** (Ground Work Active)\n4. **Resolved** (Completed & Verified)",
        showReportBtn: false,
      };
    }

    if (q.includes('kannada') || q.includes('ಕನ್ನಡ')) {
      return {
        text: 'ನಮಸ್ಕಾರ! ನಾನು "ಲೋಕ್" (Lok). ಲೋಕಿಫೈ (Lokify) ಆ್ಯಪ್‌ನಲ್ಲಿ ನಿಮ್ಮ ವಾರ್ಡ್‌ನ ಎಲ್ಲಾ ರೀತಿಯ ಸಮಸ್ಯೆಗಳನ್ನು (ರಸ್ತೆ ಗುಂಡಿ, ಬೀದಿ ದೀಪ, ಕಸ, ಒಳಚರಂಡಿ) ಸುಲಭವಾಗಿ ವರದಿ ಮಾಡಬಹುದು.\n\nಹೊಸ ಸಮಸ್ಯೆಯನ್ನು ದಾಖಲಿಸಲು ಕೆಳಗಿನ "+" ಬಟನ್ ಒತ್ತಿ, ಫೋಟೋ ಮತ್ತು ಲೊಕೇಶನ್ ಸೇರಿಸಿ ಕಳುಹಿಸಿ!',
        showReportBtn: true,
      };
    }

    if (q.includes('timeline') || q.includes('sla') || q.includes('time') || q.includes('ಸಮಯ')) {
      return {
        text: 'Standard municipal resolution benchmarks:\n• **Potholes & Road Hazards:** 24–48 Hours\n• **Solid Waste & Garbage:** 24–48 Hours\n• **Non-functional Streetlights:** 48–72 Hours\n• **Drainage Clearance:** 48–96 Hours\n\nYou will receive SMS updates whenever your report status changes!',
        showReportBtn: false,
      };
    }

    return {
      text: "Hey! I am Lok, and I'm here to help with your municipal queries. You can ask me how to report issues, check resolution timelines, or tap below to post a report right away!",
      showReportBtn: true,
    };
  };

  const handleSend = (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg = {
      sender: 'user',
      text: query,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const reply = generateLokReply(query);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'lok',
          text: reply.text,
          showReportBtn: reply.showReportBtn,
          timestamp: 'Just now',
        },
      ]);
    }, 500);
  };

  const handleClearChat = () => {
    setMessages([
      {
        sender: 'lok',
        text: 'Hey, I am Lok! 👋 Conversation reset. How can I help you today?',
        timestamp: 'Just now',
      },
    ]);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0D1117] text-[#F0F6FC] overflow-hidden select-none">
      {/* Top Header */}
      <div className="shrink-0 bg-[#0D1117]/95 backdrop-blur-md border-b border-[#21262D] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-7 h-7 rounded-xl bg-[#1F6FEB] text-white flex items-center justify-center shadow-sm">
              <Bot size={15} />
            </div>
            <span className="w-2 h-2 rounded-full bg-[#3FB950] ring-1.5 ring-[#0D1117] absolute -bottom-0.5 -right-0.5" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-xs font-bold tracking-tight text-[#F0F6FC]">
                Lok Assistant
              </span>
              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-[#161B22] text-[#58A6FF] border border-[#30363D]">
                AI
              </span>
            </div>
            <span className="text-[10px] text-[#8B949E] block mt-0.5">
              Online · Civic Guide
            </span>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#161B22] hover:bg-[#21262D] text-[#8B949E] hover:text-[#F0F6FC] border border-[#30363D] transition active:scale-95 text-[10px]"
          title="Reset conversation"
        >
          <RotateCcw size={11} />
          <span>Reset</span>
        </button>
      </div>

      {/* Suggested Questions Horizontal Scroller */}
      <div className="shrink-0 bg-[#0D1117] border-b border-[#21262D] px-3.5 py-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 w-max">
          <span className="text-[10px] font-medium text-[#8B949E] shrink-0 flex items-center gap-1 mr-1">
            <Sparkles size={11} className="text-[#58A6FF]" /> Quick queries:
          </span>
          {SUGGESTED_QUESTIONS.map((s, idx) => {
            const Icon = s.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSend(s.text)}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] text-[11px] text-[#8B949E] hover:text-[#F0F6FC] transition active:scale-95 shadow-sm"
              >
                <Icon size={12} className="text-[#58A6FF]" />
                <span>{s.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar">
        {messages.map((m, idx) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={idx}
              className={`flex items-start gap-2.5 max-w-[88%] ${
                isUser ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs shadow-sm mt-0.5 ${
                  isUser
                    ? 'bg-[#1F6FEB] text-white'
                    : 'bg-[#161B22] border border-[#30363D] text-[#58A6FF]'
                }`}
              >
                {isUser ? <User size={12} /> : <Bot size={13} />}
              </div>

              <div className="flex flex-col gap-1 max-w-full">
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isUser
                      ? 'bg-[#1F6FEB] text-white font-medium rounded-tr-none'
                      : 'bg-[#161B22] border border-[#30363D] text-[#F0F6FC] rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>

                  {m.showReportBtn && onOpenReport && (
                    <button
                      onClick={onOpenReport}
                      className="mt-2.5 w-full bg-[#238636] hover:bg-[#2ea043] text-white font-semibold text-[11px] py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
                    >
                      <PlusCircle size={13} />
                      <span>Report an Issue</span>
                    </button>
                  )}
                </div>
                <span
                  className={`text-[9px] text-[#8B949E] px-1 ${
                    isUser ? 'text-right' : ''
                  }`}
                >
                  {m.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 max-w-[85%] text-xs text-[#8B949E] bg-[#161B22] border border-[#30363D] rounded-xl px-3 py-2 w-fit animate-pulse">
            <Bot size={12} className="text-[#58A6FF]" />
            <span className="text-[11px]">Lok is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Docked Input Bar */}
      <footer className="shrink-0 bg-[#0D1117] border-t border-[#21262D] px-3.5 py-2 select-none">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 max-w-md mx-auto"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question or request assistance..."
            className="flex-1 bg-[#161B22] border border-[#30363D] focus:border-[#58A6FF] rounded-xl px-3.5 py-2 text-xs text-[#F0F6FC] placeholder-[#8B949E] outline-none transition"
          />

          <button
            type="submit"
            disabled={!input.trim()}
            className="w-8 h-8 rounded-xl bg-[#1F6FEB] disabled:opacity-40 hover:bg-[#388BFD] text-white flex items-center justify-center transition active:scale-95 shadow-sm shrink-0"
            title="Send"
          >
            <Send size={13} />
          </button>
        </form>
      </footer>
    </div>
  );
}
