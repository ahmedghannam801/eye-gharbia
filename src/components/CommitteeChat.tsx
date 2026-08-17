import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db/localDb';
import { UserProfile, CommitteeChatMessage } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { 
  MessageSquare, 
  Send, 
  Users, 
  Sparkles, 
  ShieldCheck, 
  Crown, 
  Smile, 
  Hash, 
  Paperclip,
  Image as ImageIcon,
  X,
  Maximize2,
  CheckCheck,
  Mic,
  Square,
  Volume2
} from 'lucide-react';

interface CommitteeChatProps {
  currentUser: UserProfile;
  onNavigateToView?: (view: string, targetId?: string) => void;
}

export const CommitteeChat: React.FC<CommitteeChatProps> = ({ currentUser, onNavigateToView }) => {
  const { isRtl, language } = useLanguage();
  const isAr = language === 'ar';

  const [activeRoom, setActiveRoom] = useState<string>(currentUser.committee !== 'None' ? currentUser.committee : 'General');
  const [messages, setMessages] = useState<CommitteeChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rooms = [
    { id: 'General', name: isAr ? 'القاعة العامة' : 'General Lounge', icon: '💬' },
    { id: 'HR', name: 'HR Committee', icon: '👥' },
    { id: 'PR', name: 'PR Committee', icon: '📢' },
    { id: 'SM', name: 'SM Committee', icon: '🎨' },
    { id: 'OR', name: 'OR Committee', icon: '⚡' },
  ];

  const loadMessages = () => {
    const list = db.getCommitteeChatMessages(activeRoom);
    setMessages(list);
  };

  useEffect(() => {
    loadMessages();
    const unsub = db.onChange(loadMessages);
    return () => unsub();
  }, [activeRoom]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedImage]);

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert(isAr ? 'يرجى اختيار ملف صورة فقط.' : 'Please select an image file.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert(isAr ? 'حجم الصورة أسرع من 8 ميجابايت.' : 'Image size must be less than 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setSelectedImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          processImageFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const [replyTarget, setReplyTarget] = useState<{ id: string; name: string; text: string } | null>(null);

  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          db.sendCommitteeChatMessage(
            activeRoom,
            isAr ? '🎙️ بصمة صوتية' : '🎙️ Voice Note',
            currentUser,
            base64Audio
          );
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch {
      alert(isAr ? 'يرجى السماح بالوصول للمايكروفون لتسجيل الرسالة الصوتية.' : 'Microphone access denied.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() && !selectedImage) return;

    let finalMsg = inputMessage.trim();
    if (replyTarget) {
      finalMsg = `> 💬 **${replyTarget.name}:** ${replyTarget.text}\n\n` + finalMsg;
    }

    db.sendCommitteeChatMessage(
      activeRoom, 
      finalMsg || (isAr ? '📷 صورة مرفقة' : '📷 Attached Image'), 
      currentUser,
      selectedImage || undefined
    );
    
    setInputMessage('');
    setSelectedImage(null);
    setSelectedImageName(null);
    setReplyTarget(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'Super Admin':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300';
      case 'Leader':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Lightbox Modal for enlarged image */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 p-2 text-white bg-slate-800/80 hover:bg-slate-700 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={lightboxImage} 
              alt="Enlarged" 
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border border-slate-700" 
            />
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-950 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-widest">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? 'شبكة المحادثات التفاعلية المباشرة' : 'EYE Inter-Committee Real-time Chat'}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black">
            {isAr ? 'شات ودردشة اللجان المباشرة 💬' : 'Inter-Committee Real-time Chat 💬'}
          </h1>
          <p className="text-xs md:text-sm text-slate-300 font-medium max-w-2xl">
            {isAr ? 'تواصل وتنسيق مباشر وتفاعلي بين أعضاء وقادة اللجان مع إمكانية إرفاق الصور والمستندات.' : 'Connect, coordinate, and share photos directly with your committee team and leaders.'}
          </p>
        </div>

        {/* Room selector buttons */}
        <div className="flex flex-wrap gap-2 relative z-10">
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => setActiveRoom(room.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black transition-all ${
                activeRoom === room.id
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>{room.icon}</span>
              <span>{room.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Box Container */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`bg-white dark:bg-slate-900 rounded-3xl border transition-all p-6 flex flex-col justify-between h-[620px] shadow-sm relative ${
          isDragging ? 'border-2 border-dashed border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        {isDragging && (
          <div className="absolute inset-0 z-30 bg-emerald-900/60 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center text-white gap-3 animate-fade-in pointer-events-none">
            <ImageIcon className="w-12 h-12 text-emerald-400 animate-bounce" />
            <p className="font-extrabold text-base">{isAr ? 'أفلت الصورة هنا لإرسالها في الشات 📷' : 'Drop image here to attach 📷'}</p>
          </div>
        )}

        {/* Active Room Title */}
        <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              {rooms.find(r => r.id === activeRoom)?.name}
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{isAr ? 'نشط الآن' : 'Active Now'}</span>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 px-2">
          {messages.map(msg => {
            const isMe = msg.userId === currentUser.id;
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-xl ${isMe ? 'ms-auto flex-row-reverse' : ''}`}
              >
                <img
                  src={msg.userAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${msg.userName}`}
                  alt=""
                  className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 shrink-0 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => onNavigateToView?.('profile', msg.userId)}
                  title={isAr ? `عرض ملف ${msg.userName}` : `View ${msg.userName}'s Profile`}
                />

                <div className={`space-y-1 ${isMe ? 'items-end text-end' : ''}`}>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span 
                      className="font-extrabold text-slate-900 dark:text-white cursor-pointer hover:underline"
                      onClick={() => onNavigateToView?.('profile', msg.userId)}
                    >
                      {msg.userName}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${getRoleBadgeStyle(msg.userRole)}`}>
                      {msg.userRole}
                    </span>
                    <span className="text-slate-400">{new Date(msg.sentAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    <button
                      onClick={() => setReplyTarget({ id: msg.id, name: msg.userName, text: msg.message })}
                      className="text-[9px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold ms-1"
                    >
                      {isAr ? 'رد ↩️' : 'Reply ↩️'}
                    </button>
                  </div>

                  <div className={`p-3.5 rounded-2xl text-xs font-medium leading-relaxed max-w-md shadow-sm space-y-2 ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-te-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-ts-none border border-slate-200/50 dark:border-slate-700/50'
                  }`}>
                    {/* Render Image or Audio Voice Note attached to message */}
                    {msg.imageUrl && (
                      msg.imageUrl.startsWith('data:audio') ? (
                        <div className="p-2 bg-slate-900/40 rounded-xl space-y-1">
                          <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>{isAr ? 'رسالة صوتية 🎙️' : 'Voice Note 🎙️'}</span>
                          </span>
                          <audio controls src={msg.imageUrl} className="w-full h-8" />
                        </div>
                      ) : (
                        <div className="relative group cursor-pointer overflow-hidden rounded-xl border border-black/10 dark:border-white/10" onClick={() => setLightboxImage(msg.imageUrl || null)}>
                          <img 
                            src={msg.imageUrl} 
                            alt="Attachment" 
                            className="max-h-60 w-full object-cover rounded-xl transition-transform group-hover:scale-105" 
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1 text-[11px] font-bold">
                            <Maximize2 className="w-4 h-4" />
                            <span>{isAr ? 'تكبير الصورة' : 'Enlarge'}</span>
                          </div>
                        </div>
                      )
                    )}

                    {/* Text content */}
                    {msg.message && (
                      <p>{msg.message}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Selected Image Preview before sending */}
        {selectedImage && (
          <div className="mb-2 p-2 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <img src={selectedImage} alt="Preview" className="w-12 h-12 object-cover rounded-xl border border-slate-300 dark:border-slate-600" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                  {selectedImageName || (isAr ? 'صورة مرفقة' : 'Attached Image')}
                </p>
                <p className="text-[10px] text-emerald-600 font-bold">{isAr ? 'جاهزة للإرسال ✨' : 'Ready to send ✨'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setSelectedImage(null); setSelectedImageName(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Reply Target Preview */}
        {replyTarget && (
          <div className="mb-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-r-4 border-emerald-500 rounded-xl flex items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 block text-[10px]">
                {isAr ? `جاري الرد على ${replyTarget.name}:` : `Replying to ${replyTarget.name}:`}
              </span>
              <p className="text-slate-600 dark:text-slate-300 font-semibold truncate max-w-sm">{replyTarget.text}</p>
            </div>
            <button
              type="button"
              onClick={() => setReplyTarget(null)}
              className="p-1 text-slate-400 hover:text-red-500 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-1.5 sm:gap-2 items-center w-full max-w-full overflow-hidden">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />

          {/* Image & Voice Recording buttons */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title={isAr ? 'إرفاق صورة' : 'Attach image'}
            className="p-2.5 sm:p-3 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-colors shrink-0 cursor-pointer"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          {isRecording ? (
            <button
              type="button"
              onClick={stopVoiceRecording}
              className="p-2.5 sm:p-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl transition-colors shrink-0 flex items-center gap-1.5 animate-pulse cursor-pointer"
              title={isAr ? 'إيقاف وإرسال التسجيل الصوتي' : 'Stop & Send Recording'}
            >
              <Square className="w-4 h-4 fill-white" />
              <span className="text-[10px] font-mono font-bold">{recordingSeconds}s</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startVoiceRecording}
              title={isAr ? 'تسجيل بصمة صوتية 🎙️' : 'Record Voice Note 🎙️'}
              className="p-2.5 sm:p-3 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-colors shrink-0 cursor-pointer"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}

          <input
            type="text"
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            onPaste={handlePaste}
            placeholder={isAr ? 'اكتب رسالتك...' : 'Type message...'}
            className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-medium focus:outline-none focus:border-emerald-500 shadow-inner text-slate-900 dark:text-white"
          />

          <button
            type="submit"
            disabled={!inputMessage.trim() && !selectedImage}
            className={`p-2.5 sm:p-3 text-white rounded-2xl shadow-md transition-transform transform active:scale-95 shrink-0 ${
              inputMessage.trim() || selectedImage
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-50'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

