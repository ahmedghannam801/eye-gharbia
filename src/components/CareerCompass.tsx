import React, { useState, useEffect } from 'react';
import { db } from '../db/localDb';
import { PersonalObjective, UserProfile } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { Target, Plus, CheckCircle, CheckCircle2, Clock, XCircle, ChevronRight } from 'lucide-react';

interface CareerCompassProps {
  currentUser: UserProfile;
}

export const CareerCompass: React.FC<CareerCompassProps> = ({ currentUser }) => {
  const { language, isRtl } = useLanguage();
  const isAr = language === 'ar';

  const [objectives, setObjectives] = useState<PersonalObjective[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [goalNotes, setGoalNotes] = useState('');

  const load = () => {
    setObjectives(db.getPersonalObjectives(currentUser.id));
  };

  useEffect(() => {
    load();
    const unsub = db.onChange(load);
    return () => unsub();
  }, []);

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    db.addPersonalObjective(currentUser.id, goalTitle, goalTargetDate, goalNotes);
    setShowCreate(false);
    setGoalTitle('');
    setGoalNotes('');
    load();
  };

  const handleToggleGoal = (id: string) => {
    db.toggleObjectiveStatus(id);
    load();
  };

  const achieved = objectives.filter(o => o.status === 'Achieved');
  const active = objectives.filter(o => o.status === 'In Progress');
  const percent = objectives.length > 0 ? Math.round((achieved.length / objectives.length) * 100) : 0;

  return (
    <div className="p-6 space-y-6 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-teal-50 to-emerald-50/40 dark:from-slate-900 dark:to-slate-850 p-6 rounded-3xl border border-teal-200/40 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-xs uppercase tracking-widest">
            <Target className="w-4 h-4" />
            <span>{isAr ? 'الأهداف والنمو الشخصي' : 'Career Compass & Personal OKRs'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {isAr ? 'بوصلة أهدافي وتطويري الذاتي 🧭' : 'My Personal OKRs & Career Compass 🧭'}
          </h1>
          <p className="text-xs text-slate-500 font-semibold">
            {isAr ? 'سجّل أهدافك الشخصية وتوقعاتك من التطوع وراقب نموك وتطور مهاراتك' : 'Set personal goals, target completion dates, and track your individual development path'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-sm font-mono">
            <p className="text-teal-600 font-black text-lg">{percent}%</p>
            <p className="text-[9px] text-slate-400 font-sans font-bold">{isAr ? 'نسبة الإنجاز' : 'Completed'}</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {isAr ? 'أضف هدفاً' : 'Add Goal'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Objectives */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
            {isAr ? `أهداف قيد التنفيذ (${active.length})` : `In Progress Goals (${active.length})`}
          </h3>
          <div className="space-y-3">
            {active.map(o => (
              <div key={o.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-black text-slate-800 dark:text-white leading-snug">{o.title}</h4>
                    {o.notes && <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-1">{o.notes}</p>}
                  </div>
                  <button
                    onClick={() => handleToggleGoal(o.id)}
                    className="p-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-600 shrink-0"
                    title={isAr ? 'تحديد كمكتمل' : 'Mark Completed'}
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{isAr ? 'المستهدف بحلول' : 'Target'}: {new Date(o.targetDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))}

            {active.length === 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 text-xs shadow-sm">
                {isAr ? 'لا توجد أهداف نشطة حالياً. خطط لمستقبلك وأضف هدفك الأول!' : 'No active personal goals. Add one to kickstart your journey!'}
              </div>
            )}
          </div>
        </div>

        {/* Completed Objectives */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
            {isAr ? `أهداف محققة (${achieved.length})` : `Achieved Goals (${achieved.length})`}
          </h3>
          <div className="space-y-3">
            {achieved.map(o => (
              <div key={o.id} className="bg-emerald-50/40 dark:bg-emerald-950/10 rounded-3xl border border-emerald-150 dark:border-emerald-900/30 p-5 shadow-sm space-y-2 relative overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-black text-emerald-800 dark:text-emerald-400 leading-snug line-through">{o.title}</h4>
                    {o.notes && <p className="text-xs text-emerald-600 dark:text-emerald-500/80 font-medium leading-relaxed mt-1">{o.notes}</p>}
                  </div>
                  <button
                    onClick={() => handleToggleGoal(o.id)}
                    className="p-1 rounded-lg bg-emerald-100 text-emerald-700 shrink-0"
                    title={isAr ? 'إرجاع لقيد التنفيذ' : 'Mark In Progress'}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="text-[10px] text-emerald-600/70 font-bold flex items-center gap-1">
                  ✓ {isAr ? 'تم تحقيقه بنجاح!' : 'Successfully achieved!'}
                </div>
              </div>
            ))}

            {achieved.length === 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 text-xs shadow-sm">
                {isAr ? 'الهمة تصنع المعجزات! أنجز هدفك الأول ليظهر هنا.' : 'No completed goals yet. Step up and achieve your first objective!'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Goal Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-teal-500" />
                <span>{isAr ? 'إضافة هدف تطوير شخصي' : 'Add Development Goal'}</span>
              </h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="w-4.5 h-4.5" /></button>
            </div>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <input
                required
                value={goalTitle}
                onChange={e => setGoalTitle(e.target.value)}
                placeholder={isAr ? 'ما هو هدفك؟ (مثال: إتقان Figma)' : 'Goal title (e.g. Master Figma Layouts)'}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-teal-500"
              />
              <textarea
                value={goalNotes}
                onChange={e => setGoalNotes(e.target.value)}
                rows={3}
                placeholder={isAr ? 'ملاحظات/خطوات التنفيذ...' : 'Notes / steps to achieve this...'}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-teal-500 resize-none"
              />
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">{isAr ? 'الموعد النهائي المستهدف' : 'Target Deadline'}</label>
                <input
                  required
                  type="date"
                  value={goalTargetDate}
                  onChange={e => setGoalTargetDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 border border-slate-250 dark:border-slate-700 rounded-xl py-2.5 text-xs font-bold text-slate-500">
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl py-2.5 text-xs font-bold shadow-sm">
                  {isAr ? 'تأكيد وحفظ الهدف' : 'Commit Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
