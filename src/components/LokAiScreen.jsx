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
      text: 'Hey, I am Lok! 👋 Welcome to my dedicated civic assistant page in Lokify. Ask me anything about filing complaints, understanding ward SLAs, tracking your reports, or resolving municipal issues.',
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
        text: 'Road and pothole hazards are automatically assigned **Priority 1 (Urgent)** in Lokify. The municipal engineering team aims for on-site inspection within **24 hours** and cold-mix patch filling within **48 hours**.\n\n💡 Tip: Include a photo with clear road landmarks when reporting to accelerate dispatch!',
        showReportBtn: true,
      };
    }

    if (q.includes('light') || q.includes('streetlight') || q.includes('ದೀಪ')) {
      return {
        text: 'Streetlight faults are routed to the ward electrical maintenance division. Standard turnaround is **48–72 hours**.\n\nWhen reporting, note the pole number or nearest building number to help the repair van locate the exact fixture quickly.',
        showReportBtn: true,
      };
    }

    if (q.includes('garbage') || q.includes('waste') || q.includes('trash') || q.includes('ಕಸ')) {
      return {
        text: 'Garbage accumulation and sanitation complaints are dispatched directly to the solid waste management (SWM) supervisor. Routine pickups occur within **24–48 hours**.',
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
        text: "You can track the live progress of all your submitted complaints under the **'My Issues'** tab.\n\nEvery issue moves transparently through 5 milestones:\n1. **Open** (Submitted)\n2. **Acknowledged** (Inspected by Ward Officer)\n3. **Assigned** (Contractor Allocated)\n4. **In Progress** (Ground Work Active)\n5. **Resolved** (Completed with Proof)",
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
        text: 'Lokify municipal service-level benchmarks:\n• **Potholes & Road Hazards:** 24–48 Hours\n• **Solid Waste & Garbage:** 24–48 Hours\n• **Non-functional Streetlights:** 48–72 Hours\n• **Drainage Clearance:** 48–96 Hours\n\nCitizens receive live SMS updates whenever a status changes!',
        showReportBtn: false,
      };
    }

    return {
      text: "Hey! I am Lok, and I'm here to ensure your municipal grievances receive swift attention. You can ask me how to file complaints, understand priority ratings, or tap below to submit a live issue right away!",
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
    }, 600);
  };

  const handleClearChat = () => {
    setMessages([
      {
        sender: 'lok',
        text: 'Hey, I am Lok! 👋 Chat history cleared. What can I help you resolve today?',
        timestamp: 'Just now',
      },
    ]);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#080F0F] text-[#F0F4F4] overflow-hidden select-none">
      {/* Top Banner / Hero */}
      <header className="shrink-0 bg-[#101819] border-b border-[#253538] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#28616A] via-[#A3DCE3] to-[#43C88A] text-[#080F0F] flex items-center justify-center font-black shadow-md shadow-[#A3DCE3]/20">
              <Bot size={22} />
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-[#43C88A] ring-2 ring-[#101819] absolute -bottom-0.5 -right-0.5 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-black tracking-tight text-[#F0F4F4]">
                Hey, I am Lok
              </h1>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-[#132B2F] text-[#A3DCE3] border border-[#28616A]">
                AI
              </span>
            </div>
            <p className="text-[11px] text-[#A5B1B3] font-mono">
              Municipal Grievance Intelligence
            </p>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="p-2 rounded-xl bg-[#192223] hover:bg-[#202B2D] text-[#758588] hover:text-[#A5B1B3] border border-[#354144] transition active:scale-95"
          title="Reset conversation"
        >
          <RotateCcw size={14} />
        </button>
      </header>

      {/* Scrollable Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar">
        {/* Intro Greeting Card */}
        <div className="bg-[#192223]/70 border border-[#354144] rounded-3xl p-4 shadow-lg text-center max-w-sm mx-auto my-2">
          <div className="w-12 h-12 rounded-2xl bg-[#132B2F] border border-[#28616A] text-[#A3DCE3] flex items-center justify-center mx-auto mb-2.5 shadow-sm">
            <Sparkles size={20} />
          </div>
          <h2 className="text-sm font-bold text-[#F0F4F4]">
            Hey, I am Lok – Your Civic Partner
          </h2>
          <p className="text-xs text-[#A5B1B3] mt-1 leading-relaxed font-sans">
            Need help filing a pothole or streetlight complaint? Curious about ward timelines or statuses? Tap a topic below or type your question.
          </p>
        </div>

        {/* Suggestion Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {SUGGESTED_QUESTIONS.map((s, idx) => {
            const Icon = s.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSend(s.text)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#192223] hover:bg-[#202B2D] border border-[#354144] hover:border-[#A3DCE3] text-[11px] text-[#A5B1B3] hover:text-[#F0F4F4] transition active:scale-95 shadow-sm"
              >
                <Icon size={12} className="text-[#A3DCE3]" />
                <span>{s.text}</span>
              </button>
            );
          })}
        </div>

        {/* Message Thread */}
        <div className="space-y-3 pt-2">
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
                  className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 text-xs font-mono shadow-sm ${
                    isUser
                      ? 'bg-[#315C60] text-[#A3DCE3]'
                      : 'bg-[#132B2F] border border-[#28616A] text-[#A3DCE3]'
                  }`}
                >
                  {isUser ? <User size={15} /> : <Bot size={16} />}
                </div>

                <div className="flex flex-col gap-1.5">
                  <div
                    className={`p-3.5 rounded-3xl text-xs leading-relaxed font-sans shadow-md ${
                      isUser
                        ? 'bg-[#A3DCE3] text-[#080F0F] font-medium rounded-tr-sm'
                        : 'bg-[#192223] border border-[#354144] text-[#F0F4F4] rounded-tl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.text}</p>

                    {m.showReportBtn && onOpenReport && (
                      <button
                        onClick={onOpenReport}
                        className="mt-3 w-full bg-[#A3DCE3] hover:bg-[#85CBD3] text-[#080F0F] font-bold text-[11px] py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
                      >
                        <PlusCircle size={13} />
                        <span>Submit a Civic Report Now</span>
                      </button>
                    )}
                  </div>
                  <span
                    className={`text-[9px] font-mono text-[#758588] px-1 ${
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
            <div className="flex items-center gap-2 max-w-[85%] text-xs text-[#A5B1B3] bg-[#192223] border border-[#354144] rounded-2xl px-3.5 py-2.5 w-fit animate-pulse">
              <Bot size={14} className="text-[#A3DCE3]" />
              <span>Lok is thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Bar */}
      <footer className="shrink-0 bg-[#101819] border-t border-[#253538] p-3 pb-24 select-none">
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
            placeholder="Ask Lok anything... (e.g. status, pothole, timeline)"
            className="flex-1 bg-[#192223] border border-[#354144] focus:border-[#A3DCE3] rounded-2xl px-4 py-3 text-xs text-[#F0F4F4] placeholder-[#758588] outline-none transition font-sans"
          />

          <button
            type="submit"
            disabled={!input.trim()}
            className="w-11 h-11 rounded-2xl bg-[#A3DCE3] disabled:opacity-40 hover:bg-[#85CBD3] text-[#080F0F] flex items-center justify-center transition active:scale-95 shadow-md shadow-[#A3DCE3]/20 shrink-0"
            title="Send message to Lok"
          >
            <Send size={16} />
          </button>
        </form>
      </footer>
    </div>
  );
}
