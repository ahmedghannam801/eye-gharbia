import React, { useState } from 'react';
import { db } from '../db/localDb';
import { UserProfile, Poll, PollOption } from '../types';
import { BarChart2, Plus, Trash2, CheckCircle, Lock, Users, Clock, X } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

interface PollsManagerProps { currentUser: UserProfile; }

const PollCard: React.FC<{
  poll: Poll;
  currentUser: UserProfile;
  ar: boolean;
  canManage: boolean;
  onClose: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ poll, currentUser, ar, canManage, onClose, onDelete }) => {
  const myVote = db.hasVoted(poll.id, currentUser.id);
  const results = db.getPollResults(poll.id);
  const totalVotes = Object.values(results).reduce((a, b) => a + b, 0);
  const [voted, setVoted] = useState<string | null>(myVote);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleVote = (optionId: string) => {
    if (voted || poll.status === 'Closed') return;
    const res = db.votePoll(poll.id, optionId, currentUser.id);
    if (res === 'voted') setVoted(optionId);
  };

  const isClosed = poll.status === 'Closed';
  const showResults = !!voted || isClosed || canManage;

  const maxVotes = Math.max(...Object.values(results), 1);

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-3xl border-2 ${isClosed ? 'border-slate-200 dark:border-slate-700 opacity-80' : 'border-eye-brand/20 dark:border-blue-800/30'} p-5 space-y-4 hover:shadow-md transition-all`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg ${isClosed ? 'bg-slate-100 text-slate-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'}`}>
              {isClosed ? (ar ? '🔒 مغلق' : '🔒 Closed') : (ar ? '🟢 نشط' : '🟢 Active')}
            </span>
            {poll.closesAt && !isClosed && (
              <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {new Date(poll.closesAt).toLocaleDateString(ar ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 leading-snug">
            {ar && poll.questionAr ? poll.questionAr : poll.question}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {ar ? 'بواسطة' : 'By'}: {poll.createdByName} • {new Date(poll.createdAt).toLocaleDateString(ar ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}
            {poll.audience !== 'All' && ` • ${poll.audience}`}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-1">
            {!isClosed && (
              <button onClick={() => onClose(poll.id)}
                className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/40 text-amber-500 transition-colors" title={ar ? 'إغلاق الاستطلاع' : 'Close poll'}>
                <Lock className="w-3.5 h-3.5" />
              </button>
            )}
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button onClick={() => onDelete(poll.id)} className="text-[10px] font-black text-red-600 hover:underline">{ar ? 'نعم' : 'Yes'}</button>
                <button onClick={() => setConfirmDelete(false)} className="text-[10px] font-black text-slate-400">{ar ? 'لا' : 'No'}</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/40 text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Options */}
      <div className="space-y-2">
        {poll.options.map(opt => {
          const optVotes = results[opt.id] || 0;
          const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
          const isMyVote = voted === opt.id;
          const isWinner = showResults && optVotes === maxVotes && optVotes > 0;

          return (
            <button
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              disabled={!!voted || isClosed}
              className={`w-full text-start rounded-2xl border-2 transition-all duration-300 overflow-hidden relative
                ${isMyVote ? 'border-eye-brand' : showResults && isWinner ? 'border-emerald-400' : 'border-slate-200 dark:border-slate-700'}
                ${!voted && !isClosed ? 'hover:border-eye-brand/50 hover:shadow-sm cursor-pointer' : 'cursor-default'}
              `}
            >
              {/* Progress bar background */}
              {showResults && (
                <div
                  className={`absolute inset-0 transition-all duration-700 ${isMyVote ? 'bg-blue-50 dark:bg-blue-950/30' : isWinner ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-slate-50 dark:bg-slate-800/50'}`}
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  {isMyVote && <CheckCircle className="w-4 h-4 text-eye-brand shrink-0" />}
                  {isWinner && !isMyVote && showResults && <span className="text-emerald-500 text-xs">✓</span>}
                  <span className={`text-xs font-bold ${isMyVote ? 'text-eye-brand' : 'text-slate-700 dark:text-slate-300'}`}>
                    {ar && opt.textAr ? opt.textAr : opt.text}
                  </span>
                </div>
                {showResults && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-400 font-bold">{optVotes} {ar ? 'صوت' : 'votes'}</span>
                    <span className={`text-xs font-black ${isMyVote ? 'text-eye-brand' : isWinner ? 'text-emerald-600' : 'text-slate-500'}`}>{pct}%</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {totalVotes} {ar ? 'صوت إجمالي' : 'total votes'}</span>
        {voted && !isClosed && <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" />{ar ? 'تم تسجيل تصويتك' : 'Your vote is recorded'}</span>}
      </div>
    </div>
  );
};

export const PollsManager: React.FC<PollsManagerProps> = ({ currentUser }) => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const canCreate = ['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator', 'Leader'].includes(currentUser.role);
  const canManage = ['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator'].includes(currentUser.role);

  const [tab, setTab] = useState<'polls' | 'create'>('polls');
  const [question, setQuestion] = useState('');
  const [questionAr, setQuestionAr] = useState('');
  const [options, setOptions] = useState([{ text: '', textAr: '' }, { text: '', textAr: '' }]);
  const [audience, setAudience] = useState('All');
  const [closesAt, setClosesAt] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'Active' | 'Closed'>('all');
  const [error, setError] = useState('');

  const polls = db.getPolls();
  const filtered = filterStatus === 'all' ? polls : polls.filter(p => p.status === filterStatus);

  const addOption = () => setOptions([...options, { text: '', textAr: '' }]);
  const removeOption = (i: number) => { if (options.length <= 2) return; setOptions(options.filter((_, idx) => idx !== i)); };
  const updateOption = (i: number, field: 'text' | 'textAr', val: string) => {
    setOptions(options.map((o, idx) => idx === i ? { ...o, [field]: val } : o));
  };

  const handleCreate = () => {
    setError('');
    if (!question.trim()) { setError(ar ? 'يرجى كتابة السؤال.' : 'Please enter a question.'); return; }
    if (options.some(o => !o.text.trim())) { setError(ar ? 'يرجى ملء جميع الخيارات.' : 'Please fill all options.'); return; }
    if (options.length < 2) { setError(ar ? 'يجب أن يكون هناك خيارين على الأقل.' : 'At least 2 options required.'); return; }

    db.createPoll(question.trim(), questionAr.trim(), options.map(o => ({ text: o.text.trim(), textAr: o.textAr.trim() || undefined })), audience, currentUser, closesAt || undefined);
    setQuestion(''); setQuestionAr(''); setOptions([{ text: '', textAr: '' }, { text: '', textAr: '' }]); setClosesAt('');
    setCreateSuccess(true);
    setTimeout(() => { setCreateSuccess(false); setTab('polls'); }, 2000);
  };

  const handleClose = (id: string) => { db.closePoll(id); };
  const handleDelete = (id: string) => { db.deletePoll(id); };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6" dir={ar ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200">
          <BarChart2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white">{ar ? 'الاستطلاعات والتصويتات' : 'Polls & Surveys'}</h1>
          <p className="text-xs text-slate-500">{ar ? 'صوّت واعرف رأي فريقك في لحظات' : 'Vote and discover your team\'s opinion instantly'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 w-fit gap-1">
        <button onClick={() => setTab('polls')}
          className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${tab === 'polls' ? 'bg-white dark:bg-slate-900 text-eye-brand shadow-sm' : 'text-slate-500'}`}>
          {ar ? `📊 الاستطلاعات (${polls.filter(p => p.status === 'Active').length})` : `📊 Polls (${polls.filter(p => p.status === 'Active').length} active)`}
        </button>
        {canCreate && (
          <button onClick={() => setTab('create')}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${tab === 'create' ? 'bg-white dark:bg-slate-900 text-eye-brand shadow-sm' : 'text-slate-500'}`}>
            {ar ? '+ إنشاء استطلاع' : '+ Create Poll'}
          </button>
        )}
      </div>

      {/* Polls List */}
      {tab === 'polls' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-2">
            {(['all', 'Active', 'Closed'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${filterStatus === s ? 'bg-eye-brand text-white border-eye-brand' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                {s === 'all' ? (ar ? 'الكل' : 'All') : s === 'Active' ? (ar ? 'نشطة' : 'Active') : (ar ? 'مغلقة' : 'Closed')} ({s === 'all' ? polls.length : polls.filter(p => p.status === s).length})
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-bold">{ar ? 'لا توجد استطلاعات بعد' : 'No polls yet'}</p>
              {canCreate && <p className="text-xs mt-1">{ar ? 'اضغط "إنشاء استطلاع" لتبدأ' : 'Click "Create Poll" to get started'}</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map(poll => (
                <PollCard key={poll.id} poll={poll} currentUser={currentUser} ar={ar} canManage={canManage} onClose={handleClose} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Poll */}
      {tab === 'create' && canCreate && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
          <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2"><Plus className="w-4 h-4 text-eye-brand" /> {ar ? 'إنشاء استطلاع جديد' : 'Create New Poll'}</h3>

          {error && <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs font-bold text-red-600">{error}</div>}
          {createSuccess && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{ar ? 'تم إنشاء الاستطلاع بنجاح!' : 'Poll created successfully!'}</div>}

          {/* Question */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase">{ar ? 'السؤال (عربي)' : 'Question (Arabic)'}</label>
              <input type="text" value={questionAr} onChange={e => setQuestionAr(e.target.value)}
                placeholder="ما هو موعد الاجتماع المناسب؟"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-eye-brand font-semibold" dir="rtl" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase">{ar ? 'السؤال (English)' : 'Question (English) *'}</label>
              <input type="text" value={question} onChange={e => setQuestion(e.target.value)}
                placeholder="What is the best meeting time?"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-eye-brand font-semibold" />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase">{ar ? 'خيارات الإجابة' : 'Answer Options'}</label>
            {options.map((opt, i) => (
              <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                    {ar ? `الخيار رقم ${i + 1}` : `Option #${i + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    disabled={options.length <= 2}
                    className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/40 text-red-500 disabled:opacity-30 transition-all text-xs flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span className="text-[10px]">{ar ? 'حذف' : 'Remove'}</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={opt.textAr}
                    onChange={e => updateOption(i, 'textAr', e.target.value)}
                    placeholder={ar ? `الخيار ${i + 1} بالعربي` : `Option ${i + 1} in Arabic`}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-eye-brand font-semibold"
                    dir="rtl"
                  />
                  <input
                    type="text"
                    value={opt.text}
                    onChange={e => updateOption(i, 'text', e.target.value)}
                    placeholder={`Option ${i + 1} (English)`}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-eye-brand font-semibold"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> {ar ? 'إضافة خيار جديد' : 'Add New Option'}
            </button>
          </div>

          {/* Audience + Close Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase">{ar ? 'الجمهور المستهدف' : 'Target Audience'}</label>
              <select value={audience} onChange={e => setAudience(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-eye-brand font-bold">
                <option value="All">{ar ? 'الجميع' : 'Everyone'}</option>
                <option value="HR">HR</option>
                <option value="PR">PR</option>
                <option value="SM">SM</option>
                <option value="OR">OR</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase">{ar ? 'تاريخ الإغلاق (اختياري)' : 'Close Date (optional)'}</label>
              <input type="date" value={closesAt} onChange={e => setClosesAt(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-eye-brand font-bold min-h-[44px]" />
            </div>
          </div>

          <button onClick={handleCreate}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-black py-3.5 rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            {ar ? 'نشر الاستطلاع' : 'Publish Poll'}
          </button>
        </div>
      )}
    </div>
  );
};
