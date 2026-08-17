import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { queryOzzyAI, ChatMessage, getOzyConfig, generateOzyCoachReport, cleanTextFormat, getSmartContextSuggestion } from '../lib/ozzyAi';
import { 
  Send, 
  Sparkles, 
  X, 
  RotateCcw,
  Bot,
  User,
  ShieldCheck,
  Minimize2,
  Maximize2,
  GripVertical,
  ArrowLeftRight
} from 'lucide-react';

interface OzyAIAssistantProps {
  currentUser: UserProfile;
  mode?: 'floating' | 'page';
  currentView?: string;
}

export const OzyAIAssistant: React.FC<OzyAIAssistantProps> = () => {
  return null;
};
const _UnusedOzyAIAssistant: React.FC<OzyAIAssistantProps> = ({ currentUser, mode = 'floating', currentView = 'dashboard' }) => {
  const { isRtl, language } = useLanguage();
  const isAr = language === 'ar';

  const [isOpen, setIsOpen] = useState(mode === 'page');
  const [ozyConfigState, setOzyConfigState] = useState(getOzyConfig());
  const [dockSide, setDockSide] = useState<'right' | 'left'>('right');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(() => ({
    y: typeof window !== 'undefined' && window.innerWidth < 1024 ? 96 : 24
  })); // Bottom offset

  const chatEndRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; initialY: number }>({ startY: 0, initialY: 24 });

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'ozy-welcome',
          sender: 'ozy',
          text: isAr
            ? `أهلاً بك يا **${currentUser.fullName}**! 🌟\n\n` +
              `أنا **Ozy (أوزي)** 🤖 المساعد الذكي الخارق لكيان **EYE Workflow Hub**.\n\n` +
              `أنا على علم تام بدورك كـ **${currentUser.role}** في لجنة **${currentUser.committee || 'العامة'}**${currentUser.role !== 'Member' && currentUser.membershipCode ? ` (كود \`${currentUser.membershipCode}\`)` : ''}.\n\n` +
              `اسألني عن المهام، التقييمات، بيانات الفريق، أو استخراج التقارير وسأساعدك فوراً!`
            : `Hello **${currentUser.fullName}**! 🌟\n\nI am **Ozy** 🤖, your AI Assistant for **${currentUser.committee || 'General'}**. Ask me anything about tasks, team performance, or reports!`,
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          mascotImage: '/mascot-profile.png',
        }
      ]);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  // Handle Send Question
  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    setInput('');

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const response = await queryOzzyAI(userText, currentUser, messages, isAr);
      setOzyConfigState(getOzyConfig());
      const ozyMsg: ChatMessage = {
        id: 'ozy-' + Date.now(),
        sender: 'ozy',
        text: response.text,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        mascotImage: response.mascotImage,
      };
      setMessages(prev => [...prev, ozyMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          sender: 'ozy',
          text: isAr ? 'حدث خطأ أثناء معالجة الطلب، يرجى المحاولة مرة أخرى.' : 'Error processing request, please try again.',
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Clear Chat Memory
  const handleClearHistory = () => {
    setMessages([
      {
        id: 'ozy-reset',
        sender: 'ozy',
        text: isAr ? 'تم بدء محادثة جديدة! كيف يمكنني مساعدتك؟' : 'New conversation started! How can I help you?',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        mascotImage: '/mascot-profile.png',
      }
    ]);
  };

  // Dragging Handlers
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragRef.current = { startY: clientY, initialY: position.y };
    setIsDragging(true);
  };

  const handleTouchMove = (e: TouchEvent | MouseEvent) => {
    if (!isDragging) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = dragRef.current.startY - clientY;
    const newY = Math.max(16, Math.min(window.innerHeight - 100, dragRef.current.initialY + deltaY));
    setPosition({ y: newY });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleTouchMove);
      window.addEventListener('mouseup', handleTouchEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    } else {
      window.removeEventListener('mousemove', handleTouchMove);
      window.removeEventListener('mouseup', handleTouchEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleTouchMove);
      window.removeEventListener('mouseup', handleTouchEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  const sideStyle = dockSide === 'right' ? { right: '24px' } : { left: '24px' };

  return (
    <>
      {/* FLOATING CIRCULAR ASSISTANT BUTTON */}
      <div 
        style={{ bottom: `${position.y}px`, ...sideStyle }}
        className="fixed z-50 flex items-center gap-2 group transition-all duration-300 select-none"
      >
        {/* Toggle Dock Side Button (Appears on Hover) */}
        <button
          onClick={() => setDockSide(prev => prev === 'right' ? 'left' : 'right')}
          className="hidden group-hover:flex p-2 rounded-full bg-slate-800/90 text-white border border-slate-700 shadow-lg hover:scale-110 transition-all text-xs items-center gap-1 backdrop-blur-md"
          title={isAr ? 'تغيير الجانب (يمين/يسار)' : 'Switch Side'}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
        </button>

        {/* Circular Floating Badge & Drag Handle */}
        <div
          onMouseDown={handleTouchStart}
          onTouchStart={handleTouchStart}
          onClick={() => !isDragging && setIsOpen(!isOpen)}
          className={`relative cursor-pointer flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl hover:scale-115 transition-all duration-300 ring-4 ring-blue-500/30 ${isOpen ? 'rotate-90 scale-95 ring-purple-500/50' : 'animate-bounce-subtle'}`}
        >
          <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping" />
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/40 shadow-inner z-10 flex items-center justify-center bg-white/20">
            <img src={ozyConfigState.avatarUrl} alt={ozyConfigState.name} className="w-full h-full object-cover" />
          </div>
          
          {/* Active Badge */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4 z-20">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
          </span>
        </div>
      </div>

      {/* FLOATING CHAT MODAL / DRAWER */}
      {isOpen && (
        <div 
          style={{ bottom: `${Math.min(position.y + 64, window.innerHeight - 560)}px`, ...sideStyle }}
          className="fixed z-50 w-[92vw] sm:w-[420px] h-[520px] max-h-[85vh] bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Drawer Header */}
          <div className="p-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 overflow-hidden flex items-center justify-center shrink-0">
                <img src={ozyConfigState.avatarUrl} alt={ozyConfigState.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <span>{ozyConfigState.name}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/30 text-emerald-200 border border-emerald-400/40">
                    AI Online
                  </span>
                </div>
                <p className="text-[11px] text-blue-100 opacity-90">
                  {currentUser.role} • {currentUser.committee || 'General'} Scope
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-white/80">
              <button
                onClick={handleClearHistory}
                className="p-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-all"
                title={isAr ? 'إعادة بدء المحادثة' : 'Clear Chat'}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50 dark:bg-slate-900/30 text-sm">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'ozy' && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-md">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] p-3 rounded-2xl leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                      : 'bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200/80 dark:border-slate-800 shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{cleanTextFormat(m.text)}</p>
                  <span className={`text-[10px] block mt-1 ${m.sender === 'user' ? 'text-blue-200 text-left' : 'text-slate-400 text-right'}`}>
                    {m.timestamp}
                  </span>
                </div>

                {m.sender === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-slate-400 text-xs p-2">
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center animate-pulse">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <span>جاري معالجة الرد الذكي...</span>
              </div>
            )}

            {/* Ozy Coach Action Pill & Quick Context Prompt Chips */}
            <div className="pt-2 flex flex-col items-center gap-2">
              <button
                onClick={() => {
                  setIsTyping(true);
                  setTimeout(() => {
                    const suggestion = getSmartContextSuggestion(currentView, input, currentUser);
                    setMessages(prev => [
                      ...prev,
                      {
                        id: 'ctx-' + Date.now(),
                        sender: 'ozy',
                        text: suggestion,
                        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                        mascotImage: '/mascot-thinking.png',
                      }
                    ]);
                    setIsTyping(false);
                  }, 600);
                }}
                className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-[11px] shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {currentView === 'tasks' ? 'اقتراح تفاصيل مهمة تنفيذية' :
                   currentView === 'meetings' || currentView === 'calendar' ? 'اقتراح أجندة اجتماع رسمي' :
                   currentView === 'ideabank' || currentView === 'ideas' ? 'تطوير وتحليل مبادرة مقترحة' :
                   currentView === 'announcements' ? 'صياغة تعميم إداري رسمي' :
                   currentView === 'workplans' ? 'صياغة أهداف OKRs' :
                   'طلب اقتراح ذكي لسياق الصفحة'}
                </span>
              </button>

              <button
                onClick={() => {
                  setIsTyping(true);
                  setTimeout(() => {
                    const report = generateOzyCoachReport(currentUser, isAr);
                    setMessages(prev => [
                      ...prev,
                      {
                        id: 'coach-' + Date.now(),
                        sender: 'ozy',
                        text: report.text,
                        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                        mascotImage: report.mascotImage,
                      }
                    ]);
                    setIsTyping(false);
                  }, 800);
                }}
                className="px-3.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer"
              >
                <Bot className="w-3 h-3 text-blue-500" />
                <span>{isAr ? 'تقرير Ozy Coach للأداء 📊' : 'Ozy Coach Report 📊'}</span>
              </button>

              {/* Quick Prompt Chips */}
              <div className="flex flex-wrap justify-center gap-1.5 max-w-xs">
                {[
                  { textAr: 'المهام المتاحة الآن', textEn: 'Active Tasks' },
                  { textAr: 'تقييم اللجان ورادار الأداء', textEn: 'Performance Radar' },
                  { textAr: 'من هم قيادات الكيان؟', textEn: 'Leadership' },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(isAr ? chip.textAr : chip.textEn);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-750 text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    {isAr ? chip.textAr : chip.textEn}
                  </button>
                ))}
              </div>
            </div>
            <div ref={chatEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isAr ? 'اسأل Ozy عن المهام، التقييمات، الأعضاء...' : 'Ask Ozy about tasks, evaluations...'}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-all shadow-md shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
