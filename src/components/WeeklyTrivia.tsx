import React, { useState, useEffect } from 'react';
import { db } from '../db/localDb';
import { WeeklyQuiz, QuizSubmission, UserProfile } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { Award, CheckCircle2, XCircle, ShieldAlert, Plus, HelpCircle, Users, Clock, Trash2 } from 'lucide-react';

interface WeeklyTriviaProps {
  currentUser: UserProfile;
}

export const WeeklyTrivia: React.FC<WeeklyTriviaProps> = ({ currentUser }) => {
  const { language, isRtl } = useLanguage();
  const isAr = language === 'ar';
  const isAdmin = ['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator', 'Leader'].includes(currentUser.role);

  const [quizzes, setQuizzes] = useState<WeeklyQuiz[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [resultMsg, setResultMsg] = useState<'correct' | 'wrong' | 'already' | null>(null);

  // Create form state
  const [quizQuestion, setQuizQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [pointsReward, setPointsReward] = useState(30);

  const load = () => {
    const list = db.getQuizzes();
    setQuizzes(list);
    if (list.length > 0) {
      setSubmissions(db.getQuizSubmissions(list[0].id));
    }
  };

  useEffect(() => {
    load();
    const unsub = db.onChange(load);
    return () => unsub();
  }, []);

  const handleAnswerSubmit = (quizId: string) => {
    if (selectedAnswer === null) return;
    const res = db.submitQuizAnswer(quizId, selectedAnswer, currentUser);
    setResultMsg(res);
    setSelectedAnswer(null);
    load();
  };

  const handleCreateQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    db.createQuiz(quizQuestion, options, correctIndex, pointsReward, currentUser);
    setShowCreate(false);
    setQuizQuestion('');
    setOptions(['', '', '', '']);
  };

  const handleDeleteQuiz = (quizId: string) => {
    if (confirm(isAr ? 'هل أنت متأكد من حذف هذه المسابقة بالكامل؟' : 'Are you sure you want to delete this quiz?')) {
      db.deleteQuiz(quizId, currentUser);
      load();
    }
  };

  const activeQuiz = quizzes[0]; // Active quiz is the newest
  const userSub = activeQuiz
    ? db.getQuizSubmissions(activeQuiz.id).find(s => s.userId === currentUser.id)
    : null;

  return (
    <div className="p-6 space-y-6 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-violet-50 to-purple-50/40 dark:from-slate-900 dark:to-slate-850 p-6 rounded-3xl border border-purple-200/40 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs uppercase tracking-widest">
            <HelpCircle className="w-4 h-4" />
            <span>{isAr ? 'المسابقات الأسبوعية' : 'Weekly Trivia / Quizzes'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {isAr ? 'تحدي المعرفة والذكاء 🧠' : 'Weekly Trivia Quiz 🧠'}
          </h1>
          <p className="text-xs text-slate-500 font-semibold">
            {isAr ? 'أجب عن التحدي الأسبوعي بسرعة واكسب نقاطاً إضافية في لوحة الصدارة' : 'Test your knowledge about EYE and volunteer structures, earn points'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {isAr ? 'مسابقة جديدة' : 'Create Quiz'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Quiz Card */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-sm">
          {activeQuiz ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center gap-2">
                <span className="text-[10px] font-black bg-purple-100 dark:bg-purple-950/45 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full uppercase">
                  {isAr ? 'التحدي النشط' : 'Active Quiz'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-amber-500 font-bold flex items-center gap-1">
                    🪙 {activeQuiz.pointsReward} pts
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteQuiz(activeQuiz.id)}
                      className="px-2.5 py-1 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all flex items-center gap-1 text-[10px] font-bold border border-red-200 dark:border-red-800"
                      title={isAr ? 'حذف المسابقة' : 'Delete Quiz'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isAr ? 'حذف المسابقة' : 'Delete'}</span>
                    </button>
                  )}
                </div>
              </div>

              <h2 className="text-base font-black text-slate-900 dark:text-white leading-snug">{activeQuiz.question}</h2>

              {!userSub ? (
                <div className="space-y-2 pt-2">
                  {activeQuiz.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedAnswer(idx)}
                      className={`w-full text-start p-3.5 rounded-2xl text-xs font-bold transition-all border ${
                        selectedAnswer === idx
                          ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-400 text-purple-700 dark:text-purple-400'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-250 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                  <button
                    disabled={selectedAnswer === null}
                    onClick={() => handleAnswerSubmit(activeQuiz.id)}
                    className={`w-full py-3.5 rounded-2xl text-xs font-bold transition-all text-white ${
                      selectedAnswer !== null ? 'bg-purple-600 hover:bg-purple-700 shadow-sm' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isAr ? 'تأكيد الإجابة' : 'Submit Answer'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
                  <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                    userSub.isCorrect
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-700'
                      : 'bg-red-50 dark:bg-red-950/20 border-red-200 text-red-600'
                  }`}>
                    {userSub.isCorrect ? (
                      <><CheckCircle2 className="w-4.5 h-4.5" />{isAr ? 'إجابتك صحيحة! أحسنت عملًا 🎉' : 'Correct answer! Great job! 🎉'}</>
                    ) : (
                      <><XCircle className="w-4.5 h-4.5" />{isAr ? 'إجابتك خاطئة، حظاً أوفر في التحدي القادم.' : 'Wrong answer, better luck next time.'}</>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {isAr ? 'إجابتك المسجلة كانت' : 'Your answered'}: {activeQuiz.options[userSub.answerIndex]}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center gap-2">
              <HelpCircle className="w-10 h-10 text-purple-200" />
              <p>{isAr ? 'لا يوجد تحدي نشط حالياً.' : 'No active quiz challenge.'}</p>
            </div>
          )}
        </div>

        {/* Stats & Previous submissions */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-purple-500" />
            {isAr ? 'المشاركون في التحدي' : 'Quiz Submissions'}
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {submissions.map(sub => (
              <div key={sub.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-700">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 truncate">{sub.userName}</p>
                  <p className="text-[9px] text-slate-400">{new Date(sub.submittedAt).toLocaleTimeString()}</p>
                </div>
                {sub.isCorrect ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
              </div>
            ))}

            {submissions.length === 0 && (
              <p className="text-xs text-slate-400 font-semibold text-center py-4">{isAr ? 'لا مشاركين حتى الآن.' : 'No submissions yet.'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Create Quiz Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center px-4 py-6 overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 my-4 modal-panel-animate">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-4.5 h-4.5 text-purple-500" />
                <span>{isAr ? 'إنشاء مسابقة أسبوعية جديدة' : 'Create Weekly Quiz'}</span>
              </h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="w-4.5 h-4.5" /></button>
            </div>
            <form onSubmit={handleCreateQuiz} className="space-y-4">
              <input
                required
                value={quizQuestion}
                onChange={e => setQuizQuestion(e.target.value)}
                placeholder={isAr ? 'السؤال' : 'Question'}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-purple-500"
              />
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{isAr ? 'الخيارات الأربعة' : 'Four Options'}</label>
                {options.map((opt, idx) => (
                  <input
                    key={idx}
                    required
                    value={opt}
                    onChange={e => {
                      const updated = [...options];
                      updated[idx] = e.target.value;
                      setOptions(updated);
                    }}
                    placeholder={`${isAr ? 'الخيار' : 'Option'} ${idx + 1}`}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">{isAr ? 'الخيار الصحيح' : 'Correct Option'}</label>
                  <select
                    value={correctIndex}
                    onChange={e => setCorrectIndex(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold"
                  >
                    <option value={0}>Option 1</option>
                    <option value={1}>Option 2</option>
                    <option value={2}>Option 3</option>
                    <option value={3}>Option 4</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">{isAr ? 'النقاط المستحقة' : 'Points Reward'}</label>
                  <input
                    required
                    type="number"
                    value={pointsReward}
                    onChange={e => setPointsReward(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-center focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 border border-slate-250 dark:border-slate-700 rounded-xl py-2.5 text-xs font-bold text-slate-500">
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-2.5 text-xs font-bold shadow-sm">
                  {isAr ? 'إنشاء المسابقة' : 'Create Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedbacks alerts */}
      {resultMsg === 'correct' && (
        <div className="fixed bottom-6 inset-x-0 flex justify-center z-50">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {isAr ? 'تهانينا! الإجابة صحيحة وكسبت نقاطاً إضافية!' : 'Correct! Points added to your profile!'}
          </div>
        </div>
      )}
      {resultMsg === 'wrong' && (
        <div className="fixed bottom-6 inset-x-0 flex justify-center z-50">
          <div className="bg-red-500 text-white px-6 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            {isAr ? 'للأسف إجابتك غير صحيحة، حاول مجدداً الأسبوع المقبل.' : 'Wrong answer! Try again next week.'}
          </div>
        </div>
      )}
    </div>
  );
};
