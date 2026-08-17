import React, { useState, useEffect } from 'react';
import { db } from '../db/localDb';
import { WorkPlan, KeyResult, OKRStatus, UserProfile, COMMITTEE_STRUCTURE } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { Target, Plus, Trash2, TrendingUp, CheckCircle2, AlertTriangle, Clock, XCircle, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';

interface WorkPlansProps {
  currentUser: UserProfile;
}

const statusColors: Record<OKRStatus, string> = {
  'On Track':  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  'At Risk':   'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  'Behind':    'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400',
  'Completed': 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
};

const statusIcons: Record<OKRStatus, React.ReactNode> = {
  'On Track':  <CheckCircle2 className="w-3 h-3" />,
  'At Risk':   <AlertTriangle className="w-3 h-3" />,
  'Behind':    <XCircle className="w-3 h-3" />,
  'Completed': <CheckCircle2 className="w-3 h-3" />,
};

const statusLabelsAr: Record<OKRStatus, string> = {
  'On Track': 'على المسار',
  'At Risk': 'في خطر',
  'Behind': 'متأخر',
  'Completed': 'مكتمل',
};

const progressColor = (pct: number) =>
  pct >= 100 ? '#3b82f6' : pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';

export const WorkPlansOKR: React.FC<WorkPlansProps> = ({ currentUser }) => {
  const { language, isRtl } = useLanguage();
  const isAr = language === 'ar';
  const canCreate = ['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator', 'Leader'].includes(currentUser.role);

  const [plans, setPlans] = useState<WorkPlan[]>([]);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingKR, setEditingKR] = useState<{ planId: string; krId: string } | null>(null);

  // Create Plan Form
  const [formTitle, setFormTitle] = useState('');
  const [formObjective, setFormObjective] = useState('');
  const [formCommittee, setFormCommittee] = useState(currentUser.committee === 'None' ? 'All' : currentUser.committee);
  const [formDept, setFormDept] = useState(currentUser.department === 'None' ? 'All' : currentUser.department);
  const [formMonth, setFormMonth] = useState(new Date().toISOString().slice(0, 7));
  const [formKRs, setFormKRs] = useState<Omit<KeyResult, 'id'>[]>([
    { description: '', targetValue: 10, currentValue: 0, unit: 'tasks', status: 'On Track' }
  ]);

  // KR update state
  const [krCurrentVal, setKrCurrentVal] = useState<number>(0);
  const [krStatus, setKrStatus] = useState<OKRStatus>('On Track');

  const load = () => {
    const all = currentUser.role === 'Member'
      ? db.getWorkPlans(currentUser.committee)
      : db.getWorkPlans();
    setPlans(all);
  };

  useEffect(() => {
    load();
    const unsub = db.onChange(load);
    return () => unsub();
  }, []);

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    db.createWorkPlan({
      title: formTitle,
      objective: formObjective,
      committee: formCommittee,
      department: formDept,
      month: formMonth,
      keyResults: formKRs.map(kr => ({ ...kr, id: 'kr-' + Math.random().toString(36).slice(2) })),
      createdBy: currentUser.id,
      createdByName: currentUser.fullName,
      status: 'On Track',
    }, currentUser);
    setShowCreate(false);
    setFormTitle(''); setFormObjective('');
    setFormKRs([{ description: '', targetValue: 10, currentValue: 0, unit: 'tasks', status: 'On Track' }]);
  };

  const handleUpdateKR = (planId: string, krId: string) => {
    db.updateKeyResult(planId, krId, krCurrentVal, krStatus);
    setEditingKR(null);
  };

  const overallProgress = (plan: WorkPlan) => {
    if (plan.keyResults.length === 0) return 0;
    const total = plan.keyResults.reduce((acc, kr) => {
      return acc + Math.min(100, Math.round((kr.currentValue / (kr.targetValue || 1)) * 100));
    }, 0);
    return Math.round(total / plan.keyResults.length);
  };

  // Summary stats
  const total = plans.length;
  const completed = plans.filter(p => p.status === 'Completed').length;
  const onTrack = plans.filter(p => p.status === 'On Track').length;
  const behind = plans.filter(p => p.status === 'Behind').length;

  return (
    <div className="p-6 space-y-6 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'} id="work-plans-view">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-teal-50 to-cyan-50/40 dark:from-slate-900 dark:to-slate-850 p-6 rounded-3xl border border-teal-200/40 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-xs uppercase tracking-widest">
            <Target className="w-4 h-4" />
            <span>{isAr ? 'خطط العمل الدورية' : 'OKR Work Plans'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {isAr ? 'الأهداف ومؤشرات الإنجاز 🎯' : 'Objectives & Key Results 🎯'}
          </h1>
          <p className="text-xs text-slate-500 font-semibold">
            {isAr ? 'حدد أهداف لجنتك الشهرية وتابع نسب الإنجاز تلقائياً' : 'Set monthly committee objectives and auto-track completion rates'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-start md:justify-end">
          {[
            { label: isAr ? 'إجمالي' : 'Total', value: total, color: 'text-slate-700 dark:text-slate-200' },
            { label: isAr ? 'على المسار' : 'On Track', value: onTrack, color: 'text-emerald-600' },
            { label: isAr ? 'مكتمل' : 'Done', value: completed, color: 'text-blue-600' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center flex-1 sm:flex-none min-w-[65px]">
              <p className={`text-base sm:text-lg font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-slate-500 font-bold">{s.label}</p>
            </div>
          ))}
          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
              id="create-plan-btn"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'خطة جديدة' : 'New Plan'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Plans list */}
      {plans.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-16 text-center">
          <Target className="w-12 h-12 text-teal-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-400">{isAr ? 'لا توجد خطط عمل بعد.' : 'No work plans yet.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map(plan => {
            const pct = overallProgress(plan);
            const isExpanded = expandedPlan === plan.id;
            const color = progressColor(pct);

            return (
              <div key={plan.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                {/* Plan header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-5 cursor-pointer" onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}>
                  <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                    {/* Circular progress */}
                    <div className="relative w-14 h-14 shrink-0">
                      <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                        <circle cx="18" cy="18" r="14" fill="none" stroke={color} strokeWidth="3"
                          strokeDasharray={`${(pct / 100) * 88} 88`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-slate-700 dark:text-slate-200">{pct}%</span>
                    </div>

                    {/* Mobile top-right action buttons */}
                    <div className="flex sm:hidden items-center gap-2">
                      {canCreate && (
                        <button
                          onClick={e => { e.stopPropagation(); db.deleteWorkPlan(plan.id, currentUser); }}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">{plan.title}</p>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${statusColors[plan.status]}`}>
                        {statusIcons[plan.status]}
                        {isAr ? statusLabelsAr[plan.status] : plan.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed">{plan.objective}</p>
                    <div className="flex items-center gap-3 flex-wrap mt-1 text-[9px] sm:text-[10px] text-slate-400 font-bold">
                      <span>{plan.committee} — {plan.department}</span>
                      <span><Clock className="inline w-2.5 h-2.5 me-0.5" />{plan.month}</span>
                      <span>{plan.keyResults.length} {isAr ? 'مؤشرات إنجاز' : 'KRs'}</span>
                    </div>
                  </div>

                  {/* Desktop action buttons */}
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    {canCreate && (
                      <button
                        onClick={e => { e.stopPropagation(); db.deleteWorkPlan(plan.id, currentUser); }}
                        className="p-1.5 text-slate-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Key Results expanded */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-5 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{isAr ? 'مؤشرات الإنجاز الرئيسية' : 'Key Results'}</p>
                    {plan.keyResults.map(kr => {
                      const krPct = Math.min(100, Math.round((kr.currentValue / (kr.targetValue || 1)) * 100));
                      const isEditingThis = editingKR?.planId === plan.id && editingKR?.krId === kr.id;
                      return (
                        <div key={kr.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex-1">{kr.description}</p>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0 ${statusColors[kr.status]}`}>
                              {statusIcons[kr.status]}{isAr ? statusLabelsAr[kr.status] : kr.status}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                              <div
                                className="h-2 rounded-full transition-all duration-500"
                                style={{ width: `${krPct}%`, backgroundColor: progressColor(krPct) }}
                              />
                            </div>
                            <span className="text-[10px] font-black font-mono text-slate-600 dark:text-slate-300 w-20 text-end">
                              {kr.currentValue}/{kr.targetValue} {kr.unit}
                            </span>
                          </div>

                          {/* Edit KR (leaders/admin) */}
                          {canCreate && !isEditingThis && (
                            <button
                              onClick={() => { setEditingKR({ planId: plan.id, krId: kr.id }); setKrCurrentVal(kr.currentValue); setKrStatus(kr.status); }}
                              className="text-[9px] text-teal-600 font-bold flex items-center gap-0.5 hover:underline"
                            >
                              <Edit3 className="w-2.5 h-2.5" />{isAr ? 'تحديث التقدم' : 'Update Progress'}
                            </button>
                          )}

                          {canCreate && isEditingThis && (
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <input
                                type="number" min={0} max={kr.targetValue * 2} value={krCurrentVal}
                                onChange={e => setKrCurrentVal(Number(e.target.value))}
                                className="w-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:border-teal-500"
                              />
                              <select value={krStatus} onChange={e => setKrStatus(e.target.value as OKRStatus)}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:border-teal-500">
                                {(['On Track','At Risk','Behind','Completed'] as OKRStatus[]).map(s => (
                                  <option key={s} value={s}>{isAr ? statusLabelsAr[s] : s}</option>
                                ))}
                              </select>
                              <button onClick={() => handleUpdateKR(plan.id, kr.id)}
                                className="px-3 py-1 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition-all">
                                {isAr ? 'حفظ' : 'Save'}
                              </button>
                              <button onClick={() => setEditingKR(null)}
                                className="text-slate-400 hover:text-slate-600 text-xs font-bold">
                                {isAr ? 'إلغاء' : 'Cancel'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center px-4 py-8 overflow-y-auto" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 my-4 modal-panel-animate">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-teal-500" />{isAr ? 'إنشاء خطة عمل جديدة' : 'Create New Work Plan'}
              </h3>
              <button onClick={() => setShowCreate(false)}><XCircle className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <input required value={formTitle} onChange={e => setFormTitle(e.target.value)}
                placeholder={isAr ? 'عنوان الخطة' : 'Plan title'}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-teal-500" />
              <textarea required value={formObjective} onChange={e => setFormObjective(e.target.value)} rows={2}
                placeholder={isAr ? 'الهدف الرئيسي للخطة' : 'Main objective'}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-teal-500 resize-none" />
              <div className="grid grid-cols-3 gap-2">
                <select value={formCommittee} onChange={e => setFormCommittee(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs font-bold focus:outline-none focus:border-teal-500">
                  <option value="All">All</option>
                  {['HR','PR','SM','OR'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={formDept} onChange={e => setFormDept(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs font-bold focus:outline-none focus:border-teal-500">
                  <option value="All">All Depts</option>
                  {(COMMITTEE_STRUCTURE[formCommittee] || []).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <input type="month" value={formMonth} onChange={e => setFormMonth(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500" />
              </div>

              {/* Key Results builder */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isAr ? 'مؤشرات الإنجاز (KRs)' : 'Key Results'}</p>
                {formKRs.map((kr, i) => (
                  <div key={i} className="flex gap-2 items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <input value={kr.description} onChange={e => {
                      const updated = [...formKRs]; updated[i] = { ...updated[i], description: e.target.value }; setFormKRs(updated);
                    }} placeholder={isAr ? `المؤشر ${i + 1}` : `KR ${i + 1}`}
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold focus:outline-none" />
                    <input type="number" value={kr.targetValue} min={1} onChange={e => {
                      const updated = [...formKRs]; updated[i] = { ...updated[i], targetValue: Number(e.target.value) }; setFormKRs(updated);
                    }} className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-center focus:outline-none" />
                    <input value={kr.unit} onChange={e => {
                      const updated = [...formKRs]; updated[i] = { ...updated[i], unit: e.target.value }; setFormKRs(updated);
                    }} placeholder="unit" className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
                    {formKRs.length > 1 && (
                      <button type="button" onClick={() => setFormKRs(formKRs.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button"
                  onClick={() => setFormKRs([...formKRs, { description: '', targetValue: 5, currentValue: 0, unit: 'tasks', status: 'On Track' }])}
                  className="flex items-center gap-1.5 text-xs text-teal-600 font-bold hover:underline">
                  <Plus className="w-3.5 h-3.5" />{isAr ? 'إضافة مؤشر' : 'Add Key Result'}
                </button>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 text-xs font-bold text-slate-500">
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit"
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl py-2.5 text-xs font-bold transition-all shadow-sm">
                  {isAr ? 'إنشاء الخطة' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
