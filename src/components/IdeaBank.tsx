import React, { useState, useEffect } from 'react';
import { db } from '../db/localDb';
import { VolunteerIdea, UserProfile } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { Lightbulb, ThumbsUp, MessageSquare, Plus, CheckCircle2, ArrowRightLeft, XCircle, Clock, Sparkles, Inbox } from 'lucide-react';
import { SuggestionBox } from './SuggestionBox';

interface IdeaBankProps {
  currentUser: UserProfile;
  onNavigateToView?: (view: string, targetId?: string) => void;
}

export const IdeaBank: React.FC<IdeaBankProps> = ({ currentUser, onNavigateToView }) => {
  const { language, isRtl } = useLanguage();
  const isAr = language === 'ar';
  const isAdminOrLeader = ['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator', 'Leader'].includes(currentUser.role);
  const [viewTab, setViewTab] = useState<'ideas' | 'suggestions'>('ideas');

  const [ideas, setIdeas] = useState<VolunteerIdea[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDesc, setIdeaDesc] = useState('');
  const [ideaCommittee, setIdeaCommittee] = useState(currentUser.committee === 'None' ? 'HR' : currentUser.committee);

  const handleAIPolishIdea = () => {
    if (!ideaTitle.trim()) {
      alert(isAr ? 'يرجى كتابة عنوان مبدئي للفكرة أولاً' : 'Please enter an initial idea title');
      return;
    }
    const polishedTitle = isAr ? `مبادرة 🌟: ${ideaTitle.replace(/^مبادرة 🌟:\s*/, '')}` : `Initiative 🌟: ${ideaTitle}`;
    const polishedDesc = isAr
      ? `📌 **تفاصيل المبادرة:**\n${ideaDesc || ideaTitle}\n\n` +
        `🎯 **الأهداف المرجوة:** رفع كفاءة العمل بالكيان وتسهيل التنسيق بين المتطوعين.\n\n` +
        `📈 **مراحل التنفيذ المقترحة:**\n` +
        `1. إعداد الخطة والجدول الزمني بالتنسيق مع القادة.\n` +
        `2. العرض على لجنة ${ideaCommittee} للاعتماد والتنفيذ.\n` +
        `3. قياس الأثر والتقييم الميداني.`
      : `📌 **Initiative Details:**\n${ideaDesc || ideaTitle}\n\n` +
        `🎯 **Objectives:** Enhance workflow efficiency and volunteer coordination.\n\n` +
        `📈 **Implementation Steps:**\n1. Draft schedule.\n2. Present to ${ideaCommittee} committee.\n3. Execute and review impact.`;

    setIdeaTitle(polishedTitle);
    setIdeaDesc(polishedDesc);
  };

  // Conversion state
  const [convertingIdeaId, setConvertingIdeaId] = useState<string | null>(null);
  const [taskPriority, setTaskPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [taskDeadline, setTaskDeadline] = useState('');

  // Comment state
  const [activeCommentsIdeaId, setActiveCommentsIdeaId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');

  const load = () => {
    setIdeas(db.getIdeas());
  };

  useEffect(() => {
    load();
    const unsub = db.onChange(load);
    return () => unsub();
  }, []);

  const handleCreateIdea = (e: React.FormEvent) => {
    e.preventDefault();
    db.createIdea(ideaTitle, ideaDesc, ideaCommittee, currentUser);
    setShowCreate(false);
    setIdeaTitle('');
    setIdeaDesc('');
  };

  const handleConvertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingIdeaId) return;
    db.convertIdeaToTask(convertingIdeaId, taskPriority, taskDeadline, currentUser);
    setConvertingIdeaId(null);
    load();
  };

  const handleCommentSubmit = (ideaId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    db.addCommentToIdea(ideaId, currentUser.fullName, newCommentText);
    setNewCommentText('');
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-50 to-orange-50/40 dark:from-slate-900 dark:to-slate-850 p-6 rounded-3xl border border-amber-200/40 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-widest">
            <Lightbulb className="w-4 h-4" />
            <span>{isAr ? 'بنك الأفكار والمقترحات' : 'Ideas & Suggestions Hub'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {isAr ? 'شارك فكرتك الإبداعية 💡' : 'Pitch Your Creative Ideas 💡'}
          </h1>
          <p className="text-xs text-slate-500 font-semibold">
            {isAr ? 'اطرح أفكارك ومقترحاتك لتطوير الكيان أو قدم اقتراحات مجهولة للإدارة' : 'Pitch ideas, vote on proposals, or submit anonymous suggestions'}
          </p>
        </div>
        {viewTab === 'ideas' && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {isAr ? 'اطرح فكرة' : 'Pitch an Idea'}
          </button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1.5 w-fit border border-slate-200/50 dark:border-slate-700">
        <button
          onClick={() => setViewTab('ideas')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${viewTab === 'ideas' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>{isAr ? 'بنك الأفكار' : 'Idea Bank'}</span>
        </button>
        <button
          onClick={() => setViewTab('suggestions')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${viewTab === 'suggestions' ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>{isAr ? 'صندوق الاقتراحات' : 'Suggestions Box'}</span>
        </button>
      </div>

      {viewTab === 'suggestions' ? (
        <SuggestionBox currentUser={currentUser} />
      ) : (
      <>

      {/* Ideas Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ideas.map(idea => {
          const upvoted = idea.upvotes.includes(currentUser.id);
          const commentsOpen = activeCommentsIdeaId === idea.id;

          return (
            <div key={idea.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase">
                    {idea.committee} Committee
                  </span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                    idea.status === 'Converted' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {idea.status}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">{idea.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{idea.description}</p>
                
                {/* Status Timeline Progress */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-1.5 mt-2">
                  <span className="text-[10px] font-bold text-slate-400 block text-start">{isAr ? 'مراحل اعتماد وتطبيق الفكرة:' : 'Idea Status Timeline:'}</span>
                  <div className="flex items-center justify-between gap-1 text-[9px] font-black">
                    <span className={`px-2 py-0.5 rounded-full ${idea.status === 'Pitching' || !idea.status ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'}`}>1. طُرحت 💡</span>
                    <span className={`px-2 py-0.5 rounded-full ${(idea.status as string) === 'Under Review' ? 'bg-blue-500 text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'}`}>2. قيد الدراسة 🔍</span>
                    <span className={`px-2 py-0.5 rounded-full ${idea.status === 'Approved' || idea.status === 'Converted' ? 'bg-emerald-500 text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'}`}>3. معتمدة 🚀</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                  <span 
                    className="cursor-pointer hover:text-amber-600 hover:underline font-bold"
                    onClick={() => idea.createdBy && onNavigateToView?.('profile', idea.createdBy)}
                  >
                    {isAr ? 'بواسطة' : 'By'}: {idea.createdByName}
                  </span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(idea.createdAt).toLocaleDateString()}</span>
                </div>

                {/* Engagement actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => db.toggleUpvoteIdea(idea.id, currentUser.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                      upvoted
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <ThumbsUp className="w-4.5 h-4.5" />
                    <span>{idea.upvotes.length}</span>
                  </button>

                  <button
                    onClick={() => setActiveCommentsIdeaId(commentsOpen ? null : idea.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition-all"
                  >
                    <MessageSquare className="w-4.5 h-4.5" />
                    <span>{idea.comments.length}</span>
                  </button>

                  {isAdminOrLeader && idea.status !== 'Converted' && (
                    <button
                      onClick={() => setConvertingIdeaId(idea.id)}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      {isAr ? 'تحويل لمهمة' : 'Convert'}
                    </button>
                  )}
                </div>

                {/* Comments section */}
                {commentsOpen && (
                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {idea.comments.map(c => (
                        <div key={c.id} className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-750">
                          <p className="text-[9px] font-black text-slate-800 dark:text-slate-200">{c.userName}</p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">{c.comment}</p>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={(e) => handleCommentSubmit(idea.id, e)} className="flex gap-2">
                      <input
                        value={newCommentText}
                        onChange={e => setNewCommentText(e.target.value)}
                        placeholder={isAr ? 'أضف تعليقاً...' : 'Add a comment...'}
                        className="flex-1 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                      />
                      <button type="submit" className="px-3 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold">
                        {isAr ? 'نشر' : 'Send'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pitch Idea Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>{isAr ? 'طرح فكرة جديدة' : 'Pitch New Idea'}</span>
              </h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="w-4.5 h-4.5" /></button>
            </div>
            <form onSubmit={handleCreateIdea} className="space-y-4">
              <input
                required
                value={ideaTitle}
                onChange={e => setIdeaTitle(e.target.value)}
                placeholder={isAr ? 'عنوان الفكرة' : 'Idea Title'}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500"
              />
              <textarea
                required
                value={ideaDesc}
                onChange={e => setIdeaDesc(e.target.value)}
                rows={4}
                placeholder={isAr ? 'وصف الفكرة بالتفصيل وكيف تفيد الكيان...' : 'Describe your idea and its benefits...'}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500 resize-none"
              />
              <select
                value={ideaCommittee}
                onChange={e => setIdeaCommittee(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none"
              >
                {['HR','PR','SM','OR'].map(c => (
                  <option key={c} value={c}>{c} Committee</option>
                ))}
              </select>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleAIPolishIdea}
                  className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 rounded-xl text-[11px] font-bold border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{isAr ? 'صياغة وتطوير الفكرة بالذكاء الاصطناعي 🤖' : 'Refine with AI 🤖'}</span>
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 border border-slate-250 dark:border-slate-700 rounded-xl py-2.5 text-xs font-bold text-slate-500">
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2.5 text-xs font-bold shadow-sm">
                  {isAr ? 'نشر الفكرة' : 'Pitch Idea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert Idea to Task Modal */}
      {convertingIdeaId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                <span>{isAr ? 'تحويل الفكرة المقترحة لمهمة رسمية' : 'Convert Idea to Task'}</span>
              </h3>
              <button onClick={() => setConvertingIdeaId(null)} className="text-slate-400 hover:text-slate-600"><XCircle className="w-4.5 h-4.5" /></button>
            </div>
            <form onSubmit={handleConvertSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{isAr ? 'الأولوية' : 'Priority'}</label>
                <select
                  value={taskPriority}
                  onChange={e => setTaskPriority(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{isAr ? 'الموعد النهائي للتسليم' : 'Deadline'}</label>
                <input
                  required
                  type="datetime-local"
                  value={taskDeadline}
                  onChange={e => setTaskDeadline(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConvertingIdeaId(null)} className="flex-1 border border-slate-250 dark:border-slate-700 rounded-xl py-2.5 text-xs font-bold text-slate-500">
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-xs font-bold shadow-sm">
                  {isAr ? 'تأكيد وتحويل لمهمة' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
      )}
    </div>
  );
};
