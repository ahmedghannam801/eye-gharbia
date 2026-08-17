import React, { useState, useEffect } from 'react';
import { db } from '../db/localDb';
import { UserProfile, AnonymousSuggestion, SuggestionCategory, SuggestionStatus } from '../types';
import { MessageSquare, Send, ThumbsUp, ChevronDown, CheckCircle, Clock, XCircle, AlertCircle, Reply } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

interface SuggestionBoxProps { currentUser: UserProfile; }

const CATEGORIES: { id: SuggestionCategory; labelAr: string; label: string; emoji: string }[] = [
  { id: 'General', labelAr: 'عام', label: 'General', emoji: '💬' },
  { id: 'Tasks', labelAr: 'المهام', label: 'Tasks', emoji: '📋' },
  { id: 'Meetings', labelAr: 'الاجتماعات', label: 'Meetings', emoji: '📅' },
  { id: 'Leadership', labelAr: 'القيادة', label: 'Leadership', emoji: '👑' },
  { id: 'Events', labelAr: 'الفعاليات', label: 'Events', emoji: '🎉' },
  { id: 'Other', labelAr: 'أخرى', label: 'Other', emoji: '🔖' },
];

const STATUS_CONFIG: Record<SuggestionStatus, { labelAr: string; label: string; color: string; icon: React.ReactNode }> = {
  'New': { labelAr: 'جديد', label: 'New', color: 'bg-blue-100 text-blue-700', icon: <Clock className="w-3 h-3" /> },
  'Under Review': { labelAr: 'قيد المراجعة', label: 'Under Review', color: 'bg-amber-100 text-amber-700', icon: <AlertCircle className="w-3 h-3" /> },
  'Addressed': { labelAr: 'تمت المعالجة', label: 'Addressed', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3 h-3" /> },
  'Dismissed': { labelAr: 'تم الإغلاق', label: 'Dismissed', color: 'bg-slate-100 text-slate-500', icon: <XCircle className="w-3 h-3" /> },
};

export const SuggestionBox: React.FC<SuggestionBoxProps> = ({ currentUser }) => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const isAdmin = ['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator'].includes(currentUser.role);
  const [tab, setTab] = useState<'submit' | 'admin'>('submit');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<SuggestionCategory>('General');
  const [committee, setCommittee] = useState('All');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [upvoted, setUpvoted] = useState<Set<string>>(new Set());

  const suggestions = db.getSuggestions();
  const filtered = filterStatus === 'all' ? suggestions : suggestions.filter(s => s.status === filterStatus);

  const handleSubmit = () => {
    setError('');
    if (!content.trim()) { setError(ar ? 'يرجى كتابة الاقتراح.' : 'Please write your suggestion.'); return; }
    if (content.trim().length < 10) { setError(ar ? 'الاقتراح قصير جداً، يرجى التفصيل أكثر.' : 'Suggestion is too short, please elaborate.'); return; }
    db.submitSuggestion(content.trim(), category, committee);
    setContent('');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  const handleReply = (id: string) => {
    if (!replyText.trim()) return;
    db.replyToSuggestion(id, replyText.trim(), currentUser);
    setReplyingTo(null);
    setReplyText('');
  };

  const handleUpvote = (id: string) => {
    if (upvoted.has(id)) return;
    db.upvoteSuggestion(id);
    setUpvoted(prev => new Set([...prev, id]));
  };

  const newCount = suggestions.filter(s => s.status === 'New').length;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6" dir={ar ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-200">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white">{ar ? 'صندوق الاقتراحات المجهول' : 'Anonymous Suggestion Box'}</h1>
          <p className="text-xs text-slate-500">{ar ? 'اكتب اقتراحك بكل حرية — هويتك محمية تماماً' : 'Share your thoughts freely — your identity is fully protected'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 w-fit gap-1">
        <button onClick={() => setTab('submit')}
          className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${tab === 'submit' ? 'bg-white dark:bg-slate-900 text-eye-brand shadow-sm' : 'text-slate-500'}`}>
          {ar ? '✏️ اكتب اقتراحاً' : '✏️ Submit Suggestion'}
        </button>
        {isAdmin && (
          <button onClick={() => setTab('admin')}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all relative ${tab === 'admin' ? 'bg-white dark:bg-slate-900 text-eye-brand shadow-sm' : 'text-slate-500'}`}>
            {ar ? `📥 الاقتراحات الواردة` : `📥 Inbox`}
            {newCount > 0 && (
              <span className="absolute -top-1 -end-1 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">{newCount}</span>
            )}
          </button>
        )}
      </div>

      {/* Submit Form */}
      {tab === 'submit' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-5 shadow-sm">
          {/* Privacy banner */}
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40">
            <span className="text-xl">🔒</span>
            <p className="text-xs font-bold text-violet-700 dark:text-violet-400">
              {ar
                ? 'هذا الاقتراح مجهول الهوية تماماً — لا يتم حفظ اسمك أو أي معلومات تعريفية. فقط المشرفون يرون الاقتراحات.'
                : 'This suggestion is completely anonymous — no name or identifying info is stored. Only admins can see submissions.'}
            </p>
          </div>

          {submitted && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-700 animate-fade-in">
              <CheckCircle className="w-4 h-4" />
              {ar ? 'تم إرسال اقتراحك بنجاح! شكراً على مشاركتك.' : 'Your suggestion was submitted successfully! Thank you.'}
            </div>
          )}
          {error && <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs font-bold text-red-600">{error}</div>}

          {/* Category */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{ar ? 'فئة الاقتراح' : 'Category'}</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${category === cat.id ? 'bg-violet-600 text-white border-violet-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-violet-300'}`}>
                  <span>{cat.emoji}</span>
                  <span>{ar ? cat.labelAr : cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Committee */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{ar ? 'اللجنة المعنية' : 'Concerning Committee'}</label>
            <select value={committee} onChange={e => setCommittee(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-violet-500 font-bold">
              <option value="All">{ar ? 'عام (للجميع)' : 'General (All)'}</option>
              <option value="HR">HR</option>
              <option value="PR">PR</option>
              <option value="SM">SM</option>
              <option value="OR">OR</option>
            </select>
          </div>

          {/* Content */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{ar ? 'اكتب اقتراحك / ملاحظتك' : 'Write your suggestion'}</label>
            <textarea
              value={content} onChange={e => setContent(e.target.value)}
              rows={5}
              placeholder={ar ? 'مثال: أقترح تخصيص وقت في الاجتماع لمناقشة المشاريع الجديدة والأفكار المطروحة من الأعضاء...' : 'e.g. I suggest dedicating time in meetings to discuss new projects and member ideas...'}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 font-semibold resize-none"
            />
            <p className="text-[10px] text-slate-400 text-end">{content.length}/500</p>
          </div>

          <button onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-black py-3.5 rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2">
            <Send className="w-4 h-4" />
            {ar ? 'إرسال الاقتراح بشكل مجهول' : 'Submit Anonymously'}
          </button>
        </div>
      )}

      {/* Admin View */}
      {tab === 'admin' && isAdmin && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex flex-wrap gap-2">
            {['all', 'New', 'Under Review', 'Addressed', 'Dismissed'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${filterStatus === s ? 'bg-eye-brand text-white border-eye-brand' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-eye-brand'}`}>
                {s === 'all' ? (ar ? 'الكل' : 'All') + ` (${suggestions.length})` : (ar ? STATUS_CONFIG[s as SuggestionStatus]?.labelAr : s) + ` (${suggestions.filter(sg => sg.status === s).length})`}
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-bold">{ar ? 'لا توجد اقتراحات' : 'No suggestions'}</p>
            </div>
          )}

          {filtered.map(sg => {
            const sc = STATUS_CONFIG[sg.status];
            const cat = CATEGORIES.find(c => c.id === sg.category);
            return (
              <div key={sg.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 space-y-3 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cat?.emoji || '💬'}</span>
                    <div>
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300">{ar ? cat?.labelAr : cat?.label}</span>
                      {sg.committee !== 'All' && <span className="ms-2 text-[10px] text-slate-400">• {sg.committee}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black ${sc.color}`}>
                      {sc.icon} {ar ? sc.labelAr : sc.label}
                    </span>
                    <select value={sg.status} onChange={e => db.updateSuggestionStatus(sg.id, e.target.value as SuggestionStatus)}
                      className="text-[10px] font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 focus:outline-none">
                      <option value="New">{ar ? 'جديد' : 'New'}</option>
                      <option value="Under Review">{ar ? 'قيد المراجعة' : 'Under Review'}</option>
                      <option value="Addressed">{ar ? 'تمت المعالجة' : 'Addressed'}</option>
                      <option value="Dismissed">{ar ? 'إغلاق' : 'Dismissed'}</option>
                    </select>
                  </div>
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{sg.content}</p>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{new Date(sg.submittedAt).toLocaleString(ar ? 'ar-EG' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  <button onClick={() => handleUpvote(sg.id)}
                    className={`flex items-center gap-1 font-bold transition-colors ${upvoted.has(sg.id) ? 'text-violet-600' : 'hover:text-violet-600'}`}>
                    <ThumbsUp className="w-3 h-3" /> {sg.upvotes}
                  </button>
                </div>

                {sg.adminReply && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3">
                    <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 mb-1">↩ {ar ? 'رد المشرف' : 'Admin Reply'} — {sg.adminReplyBy}</p>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300">{sg.adminReply}</p>
                  </div>
                )}

                {replyingTo === sg.id ? (
                  <div className="flex gap-2">
                    <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={2}
                      placeholder={ar ? 'اكتب ردك هنا...' : 'Write your reply...'}
                      className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 resize-none font-semibold text-slate-800 dark:text-slate-100" />
                    <div className="flex flex-col gap-1">
                      <button onClick={() => handleReply(sg.id)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black px-3 py-1.5 rounded-xl transition-all">{ar ? 'إرسال' : 'Send'}</button>
                      <button onClick={() => setReplyingTo(null)}
                        className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black px-3 py-1.5 rounded-xl transition-all">{ar ? 'إلغاء' : 'Cancel'}</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setReplyingTo(sg.id); setReplyText(''); }}
                    className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-eye-brand transition-colors">
                    <Reply className="w-3 h-3" /> {ar ? 'رد على الاقتراح' : 'Reply to suggestion'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
