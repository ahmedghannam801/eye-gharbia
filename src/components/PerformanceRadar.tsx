import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db/localDb';
import { MonthlyPerformance, UserProfile, MemberEvaluation } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { Star, ShieldAlert, BarChart3, ChevronDown, ChevronUp, Award, Calendar, MessageSquare, Edit3, XCircle, FileSpreadsheet, Eye, EyeOff, Search } from 'lucide-react';
import { GoogleSheetSyncModal } from './GoogleSheetSync';

interface PerformanceRadarProps {
  currentUser: UserProfile;
}

const avg = (nums: number[]) => nums.length ? +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : 0;

export const PerformanceRadar: React.FC<PerformanceRadarProps> = ({ currentUser }) => {
  const { language, isRtl } = useLanguage();
  const isAr = language === 'ar';
  const isLeaderOrAdmin = ['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator', 'Leader', 'HRM'].includes(currentUser.role) || (currentUser.committee === 'HR' || !!currentUser.department?.includes('HR OF ') || !!(currentUser as any).subCommittee?.includes('HR OF '));

  const [members, setMembers] = useState<UserProfile[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(currentUser.role === 'Member' ? currentUser : null);
  const [performances, setPerformances] = useState<MonthlyPerformance[]>([]);
  const [evaluations, setEvaluations] = useState<MemberEvaluation[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  const filteredMembersList = useMemo(() => {
    if (!memberSearchQuery.trim()) return members;
    const q = memberSearchQuery.toLowerCase().trim();
    return members.filter(m =>
      m.fullName.toLowerCase().includes(q) ||
      (m.membershipCode && m.membershipCode.toLowerCase().includes(q)) ||
      (m.committee && m.committee.toLowerCase().includes(q))
    );
  }, [members, memberSearchQuery]);

  // Rating input form (Numerical Points)
  const [bhvScore, setBhvScore] = useState(10);
  const [interactionScore, setInteractionScore] = useState(13);
  const [bonusScore, setBonusScore] = useState(0);
  const [comment, setComment] = useState('');
  const [showRateModal, setShowRateModal] = useState(false);

  // Google Sheet modal
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);

  // History expand
  const [showHistory, setShowHistory] = useState(false);

  const load = () => {
    setMembers(db.getUsers(currentUser).filter(u => u.role === 'Member' && u.status === 'Active'));
    const targetId = selectedMember?.id || currentUser.id;
    setPerformances(db.getPerformance(currentUser, targetId));
    setEvaluations(db.getMemberEvaluations(targetId));
  };

  useEffect(() => {
    load();
    const unsub = db.onChange(load);
    return () => unsub();
  }, [selectedMember, currentUser]);

  // Monthly radar performance
  const activePerformance = performances.find(p => p.month === selectedMonth);

  // 360 evaluations for selected month
  const monthlyEvals = useMemo(() => {
    return evaluations.filter(e => e.createdAt.startsWith(selectedMonth));
  }, [evaluations, selectedMonth]);

  // Compute blended values
  const blendedData = useMemo(() => {
    const hasRadar = !!activePerformance;
    const has360 = monthlyEvals.length > 0;

    if (!hasRadar && !has360) {
      return { values: [0, 0, 0, 0], source: 'none' as const, radarCount: 0, evalCount: 0 };
    }

    const radarVals = hasRadar
      ? [activePerformance!.commitment, activePerformance!.teamwork, activePerformance!.communication, activePerformance!.innovation]
      : null;

    const evalVals = has360
      ? [
          avg(monthlyEvals.map(e => e.commitmentRating)),
          avg(monthlyEvals.map(e => e.teamworkRating)),
          avg(monthlyEvals.map(e => e.qualityRating)),
          avg(monthlyEvals.map(e => e.activityRating)),
        ]
      : null;

    let blended: number[];
    let source: 'radar' | 'eval360' | 'blended' | 'none';

    if (radarVals && evalVals) {
      blended = radarVals.map((v, i) => +((v + evalVals[i]) / 2).toFixed(1));
      source = 'blended';
    } else if (radarVals) {
      blended = radarVals;
      source = 'radar';
    } else {
      blended = evalVals!;
      source = 'eval360';
    }

    return { values: blended, source, radarCount: hasRadar ? 1 : 0, evalCount: monthlyEvals.length };
  }, [activePerformance, monthlyEvals]);

  // All evaluations history (both systems combined)
  const allHistory = useMemo(() => {
    const radarEntries = performances.map(p => ({
      type: 'radar' as const,
      date: p.createdAt,
      month: p.month,
      evaluator: p.ratedByName,
      commitment: p.commitment,
      teamwork: p.teamwork,
      quality: p.communication,
      initiative: p.innovation,
      overall: +((p.commitment + p.teamwork + p.communication + p.innovation) / 4).toFixed(1),
      comment: p.leaderComment,
    }));

    const evalEntries = evaluations.map(e => ({
      type: '360' as const,
      date: e.createdAt,
      month: e.createdAt.slice(0, 7),
      evaluator: e.evaluatorName,
      commitment: e.commitmentRating,
      teamwork: e.teamworkRating,
      quality: e.qualityRating,
      initiative: e.activityRating,
      overall: e.overallRating,
      comment: e.feedbackComment,
    }));

    return [...radarEntries, ...evalEntries].sort((a, b) => b.date.localeCompare(a.date));
  }, [performances, evaluations]);

  const labels = isAr
    ? ['الالتزام', 'العمل الجماعي', 'التواصل / الجودة', 'الابتكار / المبادرة']
    : ['Commitment', 'Teamwork', 'Communication / Quality', 'Innovation / Initiative'];

  // Source color config
  const sourceColors = {
    radar: { fill: 'fill-blue-500/20 dark:fill-blue-500/10', stroke: 'stroke-blue-600 dark:stroke-blue-400', dot: 'fill-blue-600 dark:fill-blue-400', label: isAr ? 'تقييم رادار شهري' : 'Monthly Radar', bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800' },
    eval360: { fill: 'fill-purple-500/20 dark:fill-purple-500/10', stroke: 'stroke-purple-600 dark:stroke-purple-400', dot: 'fill-purple-600 dark:fill-purple-400', label: isAr ? 'تقييم 360\u00b0' : '360\u00b0 Evaluation', bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800' },
    blended: { fill: 'fill-emerald-500/20 dark:fill-emerald-500/10', stroke: 'stroke-emerald-600 dark:stroke-emerald-400', dot: 'fill-emerald-600 dark:fill-emerald-400', label: isAr ? 'تقييم مدمج (رادار + 360\u00b0)' : 'Blended (Radar + 360\u00b0)', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800' },
    none: { fill: '', stroke: '', dot: '', label: '', bg: '' },
  };

  const activeSource = sourceColors[blendedData.source];

  const renderRadarChart = () => {
    const size = 300;
    const maxRadius = 100;
    const gridLevels = [1, 2, 3, 4, 5];

    const vals = blendedData.values;
    const val0 = (vals[0] / 5) * maxRadius;
    const val1 = (vals[1] / 5) * maxRadius;
    const val2 = (vals[2] / 5) * maxRadius;
    const val3 = (vals[3] / 5) * maxRadius;

    const pointsString = `150,${150 - val0} ${150 + val1},150 150,${150 + val2} ${150 - val3},150`;

    return (
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[280px] aspect-square transition-all duration-300">
        {gridLevels.map(level => {
          const r = (level / 5) * maxRadius;
          const points = `150,${150 - r} ${150 + r},150 150,${150 + r} ${150 - r},150`;
          return (
            <g key={level}>
              <polygon
                points={points}
                fill="none"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                strokeWidth="1"
              />
              <text
                x="154"
                y={150 - r + 3}
                className="text-[8px] font-mono fill-slate-400 dark:fill-slate-500 font-semibold select-none"
                textAnchor="start"
              >
                {level}
              </text>
            </g>
          );
        })}

        <line x1="150" y1="150" x2="150" y2={150 - maxRadius} stroke="currentColor" className="text-slate-300 dark:text-slate-700" strokeWidth="1" />
        <line x1="150" y1="150" x2={150 + maxRadius} y2="150" stroke="currentColor" className="text-slate-350 dark:text-slate-700" strokeWidth="1" />
        <line x1="150" y1="150" x2="150" y2={150 + maxRadius} stroke="currentColor" className="text-slate-350 dark:text-slate-700" strokeWidth="1" />
        <line x1="150" y1="150" x2={150 - maxRadius} y2="150" stroke="currentColor" className="text-slate-350 dark:text-slate-700" strokeWidth="1" />

        <text x="150" y="32" className="text-[9px] font-black fill-slate-600 dark:fill-slate-300 select-none" textAnchor="middle">{labels[0]}</text>
        <text x={150 + maxRadius + 10} y="153" className="text-[9px] font-black fill-slate-600 dark:fill-slate-300 select-none" textAnchor="start">{labels[1]}</text>
        <text x="150" y={150 + maxRadius + 14} className="text-[9px] font-black fill-slate-600 dark:fill-slate-300 select-none" textAnchor="middle">{labels[2]}</text>
        <text x={150 - maxRadius - 10} y="153" className="text-[9px] font-black fill-slate-600 dark:fill-slate-300 select-none" textAnchor="end">{labels[3]}</text>

        {blendedData.source !== 'none' && (
          <g>
            <polygon
              points={pointsString}
              className={`${activeSource.fill} ${activeSource.stroke} transition-all duration-300`}
              strokeWidth="2"
            />
            <circle cx="150" cy={150 - val0} r="4" className={`${activeSource.dot} stroke-white dark:stroke-slate-900 transition-all duration-300`} strokeWidth="1.5" />
            <circle cx={150 + val1} cy="150" r="4" className={`${activeSource.dot} stroke-white dark:stroke-slate-900 transition-all duration-300`} strokeWidth="1.5" />
            <circle cx="150" cy={150 + val2} r="4" className={`${activeSource.dot} stroke-white dark:stroke-slate-900 transition-all duration-300`} strokeWidth="1.5" />
            <circle cx={150 - val3} cy="150" r="4" className={`${activeSource.dot} stroke-white dark:stroke-slate-900 transition-all duration-300`} strokeWidth="1.5" />
          </g>
        )}
      </svg>
    );
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    const mappedCommitment = Math.min(5, Math.max(0, Math.round(((bhvScore / 10) * 5) * 10) / 10));
    const mappedTeamwork = Math.min(5, Math.max(0, Math.round(((interactionScore / 13) * 5) * 10) / 10));
    const overall = Math.round(((mappedCommitment + mappedTeamwork) / 2) * 10) / 10;

    db.addMemberEvaluation({
      targetUserId: selectedMember.id,
      targetUserName: selectedMember.fullName,
      targetUserRole: selectedMember.role,
      committee: selectedMember.committee,
      department: selectedMember.department,
      evaluatorId: currentUser.id,
      evaluatorName: currentUser.fullName,
      evaluatorRole: currentUser.role,
      overallRating: overall,
      commitmentRating: mappedCommitment,
      qualityRating: mappedCommitment,
      teamworkRating: mappedTeamwork,
      activityRating: mappedTeamwork,
      feedbackComment: comment.trim(),
    }, currentUser);

    await db.updateUserBonusPoints(selectedMember.id, bonusScore, currentUser);

    setShowRateModal(false);
    setComment('');
    setBhvScore(10);
    setInteractionScore(13);
    setBonusScore(0);
    load();
  };

  return (
    <div className="p-6 space-y-6 animate-page-enter" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-50 to-indigo-50/40 dark:from-slate-900 dark:to-slate-850 p-6 rounded-3xl border border-blue-200/40 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest">
            <BarChart3 className="w-4 h-4" />
            <span>{isAr ? 'تقييم الأداء الشهري المدمج' : 'Unified Performance Radar'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {isAr ? 'مؤشرات الأداء المتكاملة \ud83d\udcca' : 'Integrated Performance Radar \ud83d\udcca'}
          </h1>
          <p className="text-xs text-slate-500 font-semibold">
            {isAr ? 'رسم بياني مدمج من تقييم الأداء الشهري وتقييمات 360\u00b0 \u2014 يعرض الالتزام والتواصل والعمل الجماعي والابتكار' : 'Blended chart from Monthly Radar + 360\u00b0 Evaluations \u2014 Commitment, Teamwork, Communication & Innovation'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isLeaderOrAdmin && (
            <>
              <button
                onClick={() => setIsGoogleSheetsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer border border-emerald-400/30"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {isAr ? '\ud83d\udd17 ربط Google Sheets' : '\ud83d\udd17 Sync Google Sheets'}
              </button>
              <button
                onClick={() => setShowRateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                {isAr ? 'تقييم عضو' : 'Rate a Member'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selection & details */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            {isLeaderOrAdmin && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                    {isAr ? 'اختر العضو' : 'Select Member'}
                  </label>
                  {selectedMember && (
                    <span className="text-[10px] font-mono text-blue-600 font-bold">
                      {selectedMember.fullName} ({selectedMember.committee})
                    </span>
                  )}
                </div>

                {/* Member Search Input */}
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={e => setMemberSearchQuery(e.target.value)}
                    placeholder={isAr ? '🔍 ابحث باسم العضو، الكود، أو اللجنة...' : '🔍 Search member name, code...'}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ps-9 pe-7 py-2 text-xs text-slate-800 dark:text-white font-bold focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  {memberSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setMemberSearchQuery('')}
                      className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold w-4 h-4 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700"
                    >
                      ×
                    </button>
                  )}
                </div>

                <select
                  value={selectedMember?.id || ''}
                  onChange={e => {
                    const found = members.find(m => m.id === e.target.value);
                    setSelectedMember(found || null);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- {isAr ? 'اختر العضو' : 'Choose Member'} ({filteredMembersList.length}) --</option>
                  {filteredMembersList.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.committee}){m.membershipCode ? ` - ${m.membershipCode}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                {isAr ? 'الشهر' : 'Target Month'}
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Source Badge */}
          {blendedData.source !== 'none' ? (
            <div className="space-y-3 mt-4">
              <div className={`px-3 py-2.5 rounded-2xl border text-xs font-bold ${activeSource.bg}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm">{blendedData.source === 'blended' ? '\ud83d\udfe2' : blendedData.source === 'radar' ? '\ud83d\udfe0' : '\ud83d\udfe3'}</span>
                  <span className="font-black text-[11px]">{activeSource.label}</span>
                </div>
                <div className="flex gap-3 text-[10px] opacity-80">
                  {blendedData.radarCount > 0 && (
                    <span>\ud83d\udcca {blendedData.radarCount} {isAr ? 'تقييم رادار' : 'radar'}</span>
                  )}
                  {blendedData.evalCount > 0 && (
                    <span>\u2b50 {blendedData.evalCount} {isAr ? 'تقييم 360\u00b0' : '360\u00b0 evals'}</span>
                  )}
                </div>
              </div>

              {/* Blended Scores Summary */}
              <div className="grid grid-cols-2 gap-2">
                {labels.map((label, i) => (
                  <div key={label} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5 text-center border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] font-bold text-slate-500 mb-0.5">{label}</p>
                    <p className="text-base font-black text-slate-800 dark:text-white">{blendedData.values[i]}<span className="text-[10px] text-slate-400 font-semibold">/5</span></p>
                  </div>
                ))}
              </div>

              {/* Overall Score */}
              <div className={`text-center p-3 rounded-2xl border ${activeSource.bg}`}>
                <p className="text-[10px] font-bold opacity-70 mb-0.5">{isAr ? 'المتوسط العام المدمج' : 'Overall Blended Score'}</p>
                <p className="text-2xl font-black">{avg(blendedData.values)}<span className="text-sm font-semibold opacity-60"> / 5</span></p>
              </div>

              {/* Leader comment from radar if exists */}
              {activePerformance && (
                <div className="bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl p-3 border border-blue-100 dark:border-blue-900/30 space-y-1.5">
                  <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase">
                    {isAr ? 'تعليق القائد (رادار)' : 'Leader Comment (Radar)'}
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                    {activePerformance.leaderComment || (isAr ? 'لا يوجد تعليق مضاف.' : 'No leader comments included.')}
                  </p>
                  <div className="text-[9px] text-slate-400 font-bold pt-0.5">
                    {isAr ? 'بواسطة' : 'By'}: {activePerformance.ratedByName}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 mt-4 flex flex-col items-center gap-1.5">
              <ShieldAlert className="w-6 h-6 text-slate-300" />
              <p>{isAr ? 'لا يوجد أي تقييم (رادار أو 360\u00b0) لهذا الشهر.' : 'No evaluations (radar or 360\u00b0) for this month.'}</p>
            </div>
          )}
        </div>

        {/* Radar Chart Display */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col items-center justify-center shadow-sm relative min-h-[300px]">
          {renderRadarChart()}

          {/* Color Legend */}
          {blendedData.source !== 'none' && (
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {[
                { color: 'bg-blue-500', label: isAr ? 'رادار شهري' : 'Monthly Radar', key: 'radar' },
                { color: 'bg-purple-500', label: isAr ? 'تقييم 360\u00b0' : '360\u00b0 Evaluation', key: 'eval360' },
                { color: 'bg-emerald-500', label: isAr ? 'مدمج' : 'Blended', key: 'blended' },
              ].map(item => (
                <div key={item.key} className={`flex items-center gap-1.5 text-[10px] font-bold text-slate-500 ${blendedData.source === item.key ? 'opacity-100' : 'opacity-30'}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Merged Evaluation History */}
      {allHistory.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {showHistory ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {isAr ? `\ud83d\udccb سجل جميع التقييمات المدمجة (${allHistory.length})` : `\ud83d\udccb All Evaluation History (${allHistory.length})`}
              </span>
            </div>
            {showHistory ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showHistory && (
            <div className="border-t border-slate-100 dark:border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3 text-start">{isAr ? 'المصدر' : 'Source'}</th>
                      <th className="px-4 py-3 text-start">{isAr ? 'المقيّم' : 'Evaluator'}</th>
                      <th className="px-4 py-3 text-center">{isAr ? 'الالتزام' : 'Commit.'}</th>
                      <th className="px-4 py-3 text-center">{isAr ? 'الجماعي' : 'Team'}</th>
                      <th className="px-4 py-3 text-center">{isAr ? 'الجودة' : 'Quality'}</th>
                      <th className="px-4 py-3 text-center">{isAr ? 'المبادرة' : 'Initiative'}</th>
                      <th className="px-4 py-3 text-center">{isAr ? 'الكلي' : 'Overall'}</th>
                      <th className="px-4 py-3 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allHistory.map((entry, idx) => (
                      <tr key={idx} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                            entry.type === 'radar'
                              ? 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800'
                              : 'bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800'
                          }`}>
                            {entry.type === 'radar' ? (isAr ? '\ud83d\udcca رادار' : '\ud83d\udcca Radar') : (isAr ? '\u2b50 360\u00b0' : '\u2b50 360\u00b0')}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">{entry.evaluator}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold">{entry.commitment}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold">{entry.teamwork}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold">{entry.quality}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold">{entry.initiative}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-black ${entry.overall >= 4 ? 'text-emerald-600' : entry.overall >= 3 ? 'text-amber-600' : 'text-red-500'}`}>
                            {entry.overall}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[10px] text-slate-400 font-mono">{new Date(entry.date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Comments Section */}
              {allHistory.filter(e => e.comment).length > 0 && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {isAr ? 'ملاحظات وتعليقات المقيّمين' : 'Evaluator Comments'}
                  </span>
                  {allHistory.filter(e => e.comment).map((entry, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${entry.type === 'radar' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                          {entry.type === 'radar' ? '\ud83d\udcca' : '\u2b50'}
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{entry.evaluator}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{new Date(entry.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed italic">"{entry.comment}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rate Member Modal — Pop-up Right in Front of User's Eyes */}
      {showRateModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-lg flex items-center justify-center p-4 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-500" />
                <span>{isAr ? 'تقييم أداء العضو بالنقاط' : 'Member Performance Rating'}</span>
              </h3>
              <button onClick={() => setShowRateModal(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="w-4.5 h-4.5" /></button>
            </div>
            <form onSubmit={handleSubmitRating} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  {isAr ? 'اختر العضو المراد تقييمه' : 'Select Target Member'}
                </label>
                <select
                  required
                  value={selectedMember?.id || ''}
                  onChange={e => {
                    const found = members.find(m => m.id === e.target.value);
                    setSelectedMember(found || null);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none"
                >
                  <option value="">-- Choose Member --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName} ({m.committee})</option>
                  ))}
                </select>
              </div>

              {/* 3 Numerical Input Fields with Maximum Display */}
              <div className="space-y-3">
                {/* Behavior BHV (10 pts) */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100 block">⭐ {isAr ? 'سلوك (BHV)' : 'Behavior (BHV)'}</span>
                    <span className="text-[10px] text-slate-500 font-bold">{isAr ? 'الالتزام والانضباط (من 0 إلى 10 نقاط)' : 'Behavior (0 to 10 pts)'}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      value={bhvScore}
                      onChange={(e) => setBhvScore(Math.min(10, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="w-16 bg-white dark:bg-slate-900 border-2 border-emerald-500/60 rounded-xl px-2 py-1.5 text-center text-sm font-black text-emerald-600 dark:text-emerald-400 focus:outline-none shadow-sm"
                    />
                    <span className="text-xs font-black text-slate-500">/ 10</span>
                  </div>
                </div>

                {/* Interaction (13 pts) */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100 block">🤝 {isAr ? 'تفاعل (Interaction)' : 'Interaction'}</span>
                    <span className="text-[10px] text-slate-500 font-bold">{isAr ? 'التفاعل والعمل الجماعي (من 0 إلى 13 نقطة)' : 'Interaction (0 to 13 pts)'}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min="0"
                      max="13"
                      step="0.5"
                      value={interactionScore}
                      onChange={(e) => setInteractionScore(Math.min(13, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="w-16 bg-white dark:bg-slate-900 border-2 border-indigo-500/60 rounded-xl px-2 py-1.5 text-center text-sm font-black text-indigo-600 dark:text-indigo-400 focus:outline-none shadow-sm"
                    />
                    <span className="text-xs font-black text-slate-500">/ 13</span>
                  </div>
                </div>

                {/* Bonus (10 pts) */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-black text-amber-800 dark:text-amber-300 block">🎁 {isAr ? 'بونص (Bonus)' : 'Bonus'}</span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">{isAr ? 'إضافة مباشرة فوق الـ AVG (من 0 إلى 10 نقاط)' : 'Bonus Boost (0 to 10 pts)'}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      value={bonusScore}
                      onChange={(e) => setBonusScore(Math.min(10, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="w-16 bg-white dark:bg-slate-900 border-2 border-amber-500/60 rounded-xl px-2 py-1.5 text-center text-sm font-black text-amber-600 dark:text-amber-400 focus:outline-none shadow-sm"
                    />
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400">/ 10</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                  {isAr ? 'ملاحظات وتوجيهات' : 'Feedback / Leader Comment'}
                </label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={2}
                  placeholder={isAr ? 'أضف أي ملاحظات موجهة للعضو...' : 'Add suggestions...'}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowRateModal(false)} className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-500 cursor-pointer">
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl py-2.5 text-xs font-bold shadow-md cursor-pointer">
                  {isAr ? 'اعتماد وحفظ نقاط التقييم ⭐' : 'Commit Rating ⭐'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Sheets Integration Sync Modal */}
      <GoogleSheetSyncModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
        currentUser={currentUser}
        onSuccess={load}
      />
    </div>
  );
};
