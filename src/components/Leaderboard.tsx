import React, { useMemo, useState } from 'react';
import { UserProfile, Submission, Task, MemberEvaluation } from '../types';
import { db } from '../db/localDb';
import { Trophy, Star, Zap, Flame, Award, Medal, Crown, TrendingUp, Users, Shield, Search, Sliders, CheckCircle2, MessageSquare, X, FileSpreadsheet } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { BadgesSystem } from './BadgesSystem';
import { GoogleSheetSyncModal } from './GoogleSheetSync';

interface LeaderboardProps {
  currentUser: UserProfile;
  onNavigateToView?: (view: string, targetId?: string) => void;
}

interface MemberScore {
  user: UserProfile;
  points: number;
  acceptedCount: number;
  totalSubmissions: number;
  acceptanceRate: number;
  badges: string[];
  rank: number;
}

const POINTS = {
  ACCEPTED_ON_TIME: 100,
  ACCEPTED_LATE: 60,
  PENDING: 5,
  REJECTED: 10,
};

const getBadges = (score: Omit<MemberScore, 'badges' | 'rank'>, allScores: Omit<MemberScore, 'badges' | 'rank'>[], submissions: Submission[]): string[] => {
  const badges: string[] = [];
  if (score.acceptanceRate === 100 && score.acceptedCount >= 1) badges.push('💎 المتميز');
  if (score.acceptedCount >= 3) badges.push('🔥 سلسلة الإنجاز');
  if (score.acceptedCount >= 1 && allScores[0]?.user.id === score.user.id) badges.push('🥇 المتصدر');
  const memberSubs = submissions.filter(s => s.memberId === score.user.id && s.status === 'Accepted');
  if (memberSubs.length >= 1) badges.push('⚡ منجز');
  return badges;
};

const calculatePoints = (userSubs: Submission[], tasks: Task[]): number => {
  let pts = 0;
  for (const sub of userSubs) {
    const task = tasks.find(t => t.id === sub.taskId);
    const deadline = task ? new Date(task.deadline) : null;
    const submittedAt = new Date(sub.submittedAt);
    if (sub.status === 'Accepted') {
      pts += deadline && submittedAt <= deadline ? POINTS.ACCEPTED_ON_TIME : POINTS.ACCEPTED_LATE;
      const grade = (sub as any).grade as number | undefined;
      if (grade !== undefined && grade >= 90) pts += 20;
      else if (grade !== undefined && grade >= 75) pts += 10;
    } else if (sub.status === 'Rejected') {
      pts += POINTS.REJECTED;
    } else if (sub.status === 'Pending') {
      pts += POINTS.PENDING;
    }
  }
  return pts;
};

/* ============================================================ */
/* All Members Evaluations View Component                       */
/* ============================================================ */
const AllMembersEvaluationsView: React.FC<{
  currentUser: UserProfile;
  onNavigateToView?: (view: string, targetId?: string) => void;
}> = ({ currentUser, onNavigateToView }) => {
  const { language, isRtl, translateCommittee, translateDepartment } = useLanguage();
  const isAr = language === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [committeeFilter, setCommitteeFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'leaders' | 'members' | 'executive'>('all');
  const [sortOrder, setSortOrder] = useState<'rating_desc' | 'rating_asc' | 'evals_desc' | 'name'>('rating_desc');

  // Rating Modal State (Numerical Points)
  const [evalTargetUser, setEvalTargetUser] = useState<UserProfile | null>(null);
  const [evalBhv, setEvalBhv] = useState(10);
  const [evalInteraction, setEvalInteraction] = useState(13);
  const [evalBonus, setEvalBonus] = useState(0);
  const [evalFeedback, setEvalFeedback] = useState('');
  const [evalSuccessMsg, setEvalSuccessMsg] = useState(false);

  const isEvaluator = ['Super Admin', 'Coordinator', 'Deputy Coordinator', 'Leader', 'Vice'].includes(currentUser.role);
  // Fetch EVERY single user in the entity without permission stripping
  const allUsers = db.getUsers().filter(u => u.status === 'Active');
  const allEvaluations = db.getMemberEvaluations();

  // Compute evaluation stats per member
  const memberEvaluationsData = useMemo(() => {
    return allUsers.map(user => {
      const evals = db.getMemberEvaluations(user.id);
      const evalsCount = evals.length;

      let avgCommitment = 0;
      let avgQuality = 0;
      let avgTeamwork = 0;
      let avgInitiative = 0;
      let overallAvg = 0;

      if (evalsCount > 0) {
        avgCommitment = Number((evals.reduce((acc, e) => acc + (e.commitmentRating || 5), 0) / evalsCount).toFixed(1));
        avgQuality = Number((evals.reduce((acc, e) => acc + (e.qualityRating || 5), 0) / evalsCount).toFixed(1));
        avgTeamwork = Number((evals.reduce((acc, e) => acc + (e.teamworkRating || 5), 0) / evalsCount).toFixed(1));
        avgInitiative = Number((evals.reduce((acc, e) => acc + (e.activityRating || 5), 0) / evalsCount).toFixed(1));
        overallAvg = Number((evals.reduce((acc, e) => acc + (e.overallRating || 5), 0) / evalsCount).toFixed(1));
      }

      const latestEval = evals[0] || null;

      return {
        user,
        evals,
        evalsCount,
        overallAvg,
        avgCommitment,
        avgQuality,
        avgTeamwork,
        avgInitiative,
        latestEval
      };
    });
  }, [allUsers, allEvaluations]);

  // Filter and sort members — Excludes Vice, Coordinators, and Super Admin from evaluation targets
  const filteredMembers = useMemo(() => {
    return memberEvaluationsData.filter(item => {
      // Exclude Executive Officers (Vice, Coordinator, Deputy Coordinator, Super Admin) from being rating targets
      const isTargetable = item.user.role === 'Leader' || item.user.role === 'Member';
      if (!isTargetable) return false;

      const matchesSearch = item.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.user.membershipCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCommittee = committeeFilter === 'all' || item.user.committee === committeeFilter;

      let matchesRole = true;
      if (roleFilter === 'leaders') {
        matchesRole = item.user.role === 'Leader';
      } else if (roleFilter === 'members') {
        matchesRole = item.user.role === 'Member';
      }

      return matchesSearch && matchesCommittee && matchesRole;
    }).sort((a, b) => {
      if (sortOrder === 'rating_desc') return b.overallAvg - a.overallAvg;
      if (sortOrder === 'rating_asc') return a.overallAvg - b.overallAvg;
      if (sortOrder === 'evals_desc') return b.evalsCount - a.evalsCount;
      if (sortOrder === 'name') return a.user.fullName.localeCompare(b.user.fullName, 'ar');
      return 0;
    });
  }, [memberEvaluationsData, searchQuery, committeeFilter, roleFilter, sortOrder]);

  const totalEvalsCount = allEvaluations.length;
  const evaluatedCount = memberEvaluationsData.filter(m => m.evalsCount > 0).length;
  const entityAvgRating = totalEvalsCount > 0
    ? (allEvaluations.reduce((acc, e) => acc + (e.overallRating || 5), 0) / totalEvalsCount).toFixed(1)
    : '5.0';

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalTargetUser) return;

    const mappedCommitment = Math.min(5, Math.max(0, Math.round(((evalBhv / 10) * 5) * 10) / 10));
    const mappedTeamwork = Math.min(5, Math.max(0, Math.round(((evalInteraction / 13) * 5) * 10) / 10));
    const overall = Math.round(((mappedCommitment + mappedTeamwork) / 2) * 10) / 10;

    db.addMemberEvaluation({
      targetUserId: evalTargetUser.id,
      targetUserName: evalTargetUser.fullName,
      targetUserRole: evalTargetUser.role,
      committee: evalTargetUser.committee,
      department: evalTargetUser.department,
      evaluatorId: currentUser.id,
      evaluatorName: currentUser.fullName,
      evaluatorRole: currentUser.role,
      overallRating: overall,
      commitmentRating: mappedCommitment,
      qualityRating: mappedCommitment,
      teamworkRating: mappedTeamwork,
      activityRating: mappedTeamwork,
      feedbackComment: evalFeedback,
    }, currentUser);

    await db.updateUserBonusPoints(evalTargetUser.id, evalBonus, currentUser);

    setEvalSuccessMsg(true);
    setTimeout(() => {
      setEvalSuccessMsg(false);
      setEvalTargetUser(null);
      setEvalFeedback('');
      setEvalBhv(10);
      setEvalInteraction(13);
      setEvalBonus(0);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase">{isAr ? 'إجمالي تقييمات الأداء' : 'Total Evaluations'}</p>
            <p className="text-2xl font-black text-amber-500 font-mono mt-1">{totalEvalsCount}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">{isAr ? `${evaluatedCount} عضو مقيم رسمياً` : `${evaluatedCount} members rated`}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-xl font-bold">
            ⭐
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase">{isAr ? 'متوسط تقييم الكيان العام' : 'Overall Entity Rating'}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-emerald-600 font-mono">{entityAvgRating}</span>
              <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">{isAr ? 'بناءً على التقييمات المعاييرية' : 'Based on 4 rating criteria'}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xl font-bold">
            📊
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase">{isAr ? 'إجمالي الأعضاء النشطين' : 'Total Active Members'}</p>
            <p className="text-2xl font-black text-blue-600 font-mono mt-1">{allUsers.length}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">{isAr ? 'في جميع لجان الكيان' : 'Across all committees'}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-xl font-bold">
            👥
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between max-w-full overflow-hidden">
        <div className="relative w-full md:w-80 min-w-0">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'ابحث باسم العضو أو الكود...' : 'Search by name or code...'}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl ps-10 pe-4 py-2.5 text-xs text-slate-800 dark:text-white font-bold focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 md:flex md:flex-wrap gap-2 w-full md:w-auto min-w-0">
          <select
            value={committeeFilter}
            onChange={(e) => setCommitteeFilter(e.target.value)}
            className="w-full sm:w-auto max-w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2.5 text-xs text-slate-800 dark:text-white font-bold truncate min-w-0 focus:outline-none focus:border-amber-500"
          >
            <option value="all">{isAr ? 'جميع اللجان' : 'All Committees'}</option>
            <option value="HR">لجنة HR</option>
            <option value="PR">لجنة PR</option>
            <option value="SM">لجنة SM</option>
            <option value="OR">لجنة OR</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="w-full sm:w-auto max-w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2.5 text-xs text-slate-800 dark:text-white font-bold truncate min-w-0 focus:outline-none focus:border-amber-500"
          >
            <option value="all">{isAr ? 'جميع الأعضاء والقادة (أعضاء + ليدرز)' : 'All Members & Leaders'}</option>
            <option value="leaders">{isAr ? '🎖️ القادة فقط (Leaders)' : 'Leaders Only'}</option>
            <option value="members">{isAr ? '👤 الأعضاء فقط (Members)' : 'Members Only'}</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="w-full sm:w-auto max-w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2.5 text-xs text-slate-800 dark:text-white font-bold truncate min-w-0 focus:outline-none focus:border-amber-500"
          >
            <option value="rating_desc">{isAr ? 'الأعلى تقييماً ⭐' : 'Highest Rated ⭐'}</option>
            <option value="rating_asc">{isAr ? 'الأقل تقييماً' : 'Lowest Rated'}</option>
            <option value="evals_desc">{isAr ? 'الأكثر تقييمات' : 'Most Evaluated'}</option>
            <option value="name">{isAr ? 'أبجدياً بالاسم' : 'Sort by Name'}</option>
          </select>
        </div>
      </div>

      {/* Members Evaluations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMembers.map(item => {
          const u = item.user;
          const hasEvals = item.evalsCount > 0;

          return (
            <div key={u.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 hover:border-amber-500/40 transition-all">
              {/* Member Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div 
                  onClick={() => onNavigateToView?.('profile', u.id)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <img
                    src={u.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.fullName)}`}
                    alt=""
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform"
                  />
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors flex items-center gap-1.5">
                      <span>{u.fullName}</span>
                      {u.role === 'Leader' && <span className="text-amber-500 text-xs" title="Leader">🎖️</span>}
                    </h3>
                    {currentUser.role !== 'Member' && <p className="text-[10px] font-mono text-amber-600 font-bold">{u.membershipCode}</p>}
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                      {translateCommittee(u.committee)} {u.department && u.department !== 'None' ? `• ${translateDepartment(u.department)}` : ''}
                    </p>
                  </div>
                </div>

                {/* Overall Rating Badge */}
                <div className="text-end shrink-0">
                  {hasEvals ? (
                    <div className="flex flex-col items-end">
                      <div className="px-3 py-1 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black text-sm flex items-center gap-1">
                        <span>⭐</span>
                        <span>{item.overallAvg}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">/ 5.0</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold block mt-1">
                        ({item.evalsCount} {isAr ? 'تقييم معتمد' : 'evaluations'})
                      </span>
                    </div>
                  ) : (
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-bold">
                      {isAr ? 'لم يُقيم بعد' : 'Not Rated'}
                    </span>
                  )}
                </div>
              </div>

              {/* Criteria Star Breakdown */}
              {hasEvals ? (
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold">🎯 {isAr ? 'الالتزام:' : 'Commitment:'}</span>
                    <span className="font-mono font-black text-amber-500">{item.avgCommitment} ★</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold">💎 {isAr ? 'الجودة:' : 'Quality:'}</span>
                    <span className="font-mono font-black text-amber-500">{item.avgQuality} ★</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold">🤝 {isAr ? 'العمل الجماعي:' : 'Teamwork:'}</span>
                    <span className="font-mono font-black text-amber-500">{item.avgTeamwork} ★</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold">💡 {isAr ? 'المبادرة:' : 'Initiative:'}</span>
                    <span className="font-mono font-black text-amber-500">{item.avgInitiative} ★</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-2">
                  {isAr ? 'لا توجد تقييمات مسجلة لهذا العضو بعد.' : 'No performance ratings logged yet.'}
                </p>
              )}

              {/* Latest Feedback */}
              {item.latestEval && item.latestEval.feedbackComment && (
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-[11px] text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-amber-600 block mb-1">💬 {isAr ? 'أحدث ملاحظة مدونة:' : 'Latest Feedback:'}</span>
                  <p className="italic">"{item.latestEval.feedbackComment}"</p>
                  <p className="text-[9px] text-slate-400 mt-1 font-mono text-end">— {item.latestEval.evaluatorName} ({new Date(item.latestEval.createdAt).toLocaleDateString()})</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => onNavigateToView?.('profile', u.id)}
                  className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-amber-500 transition-colors flex items-center gap-1"
                >
                  <span>👤 {isAr ? 'عرض الملف الكامل' : 'View Profile'}</span>
                </button>

                {(() => {
                  const evaluator = currentUser;
                  const target = u;
                  if (evaluator.id === target.id) return null;

                  const isExecOrVice = ['Super Admin', 'Coordinator', 'Deputy Coordinator', 'Vice'].includes(evaluator.role);
                  const isLeader = evaluator.role === 'Leader';
                  const targetIsLeaderOrAbove = ['Leader', 'Vice', 'Super Admin', 'Coordinator', 'Deputy Coordinator'].includes(target.role);

                  const canRate = isExecOrVice || (isLeader && !targetIsLeaderOrAbove);
                  if (!canRate) return null;

                  return (
                    <button
                      onClick={() => setEvalTargetUser(u)}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1"
                    >
                      <span>⭐ {isAr ? `تقييم ${targetIsLeaderOrAbove ? 'القائد' : 'العضو'} الآن` : 'Rate Person'}</span>
                    </button>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Member Rating Modal — Pop-up Right in Front of User's Eyes */}
      {evalTargetUser && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-lg flex items-center justify-center p-4 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white dark:bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-3.5 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>⭐ {isAr ? `تقييم أداء العضو: ${evalTargetUser.fullName}` : `Rate Member: ${evalTargetUser.fullName}`}</span>
              </h3>
              <button onClick={() => setEvalTargetUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {evalSuccessMsg ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center text-2xl font-bold">
                  ✓
                </div>
                <p className="font-black text-emerald-600 text-sm">{isAr ? 'تم اعتماد التقييم وإعادة حساب الـ AVG بنجاح! ⭐' : 'Evaluation saved successfully!'}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitEvaluation} className="space-y-4">
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
                        value={evalBhv}
                        onChange={(e) => setEvalBhv(Math.min(10, Math.max(0, parseFloat(e.target.value) || 0)))}
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
                        value={evalInteraction}
                        onChange={(e) => setEvalInteraction(Math.min(13, Math.max(0, parseFloat(e.target.value) || 0)))}
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
                        value={evalBonus}
                        onChange={(e) => setEvalBonus(Math.min(10, Math.max(0, parseFloat(e.target.value) || 0)))}
                        className="w-16 bg-white dark:bg-slate-900 border-2 border-amber-500/60 rounded-xl px-2 py-1.5 text-center text-sm font-black text-amber-600 dark:text-amber-400 focus:outline-none shadow-sm"
                      />
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400">/ 10</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">{isAr ? 'ملاحظات وتوجيهات (اختياري)' : 'Detailed Feedback'}</label>
                  <textarea
                    rows={2}
                    value={evalFeedback}
                    onChange={e => setEvalFeedback(e.target.value)}
                    placeholder={isAr ? 'أدخل ملاحظاتك التوجيهية أو الإيجابية للعضو...' : 'Enter feedback details...'}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-800 dark:text-white resize-none focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-2xl transition-all shadow-md cursor-pointer"
                  >
                    {isAr ? 'اعتماد وحفظ نقاط التقييم ⭐' : 'Submit Rating'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvalTargetUser(null)}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-2xl cursor-pointer"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================ */
/* Main Leaderboard Component                                   */
/* ============================================================ */
export const Leaderboard: React.FC<LeaderboardProps> = ({ currentUser, onNavigateToView }) => {
  const { language, isRtl, translateCommittee } = useLanguage();
  const [activeTab, setActiveTab] = useState<'ranks' | 'evaluations' | 'badges'>('ranks');
  const [roleCategoryFilter, setRoleCategoryFilter] = useState<'members' | 'leaders'>('members');
  const [seasonFilter, setSeasonFilter] = useState<'all' | 'current_month' | 'last_month' | 'last_3_months' | 'last_4_months' | 'last_6_months' | 'current_year'>('all');
  const [comparePeerId, setComparePeerId] = useState<string>('');
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);

  const users = db.getUsers(currentUser).filter(u => {
    if (u.status !== 'Active') return false;
    if (roleCategoryFilter === 'leaders') {
      return ['Leader', 'Vice', 'Coordinator', 'Deputy Coordinator', 'Super Admin', 'HRM'].includes(u.role);
    }
    return u.role === 'Member';
  });
  const submissions = db.getSubmissions();
  const tasks = db.getTasks();

  const scores: MemberScore[] = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthYear = lastMonthDate.getFullYear();
    const lastMonthMonth = lastMonthDate.getMonth();
    const nowTime = now.getTime();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    const raw = users.map(user => {
      const userSubs = submissions.filter(s => s.memberId === user.id);
      
      const filteredSubs = userSubs.filter(sub => {
        const subDate = new Date(sub.submittedAt);
        const subTime = subDate.getTime();

        if (seasonFilter === 'current_month') {
          return subDate.getFullYear() === currentYear && subDate.getMonth() === currentMonth;
        }
        if (seasonFilter === 'last_month') {
          return subDate.getFullYear() === lastMonthYear && subDate.getMonth() === lastMonthMonth;
        }
        if (seasonFilter === 'last_3_months') {
          return subTime >= nowTime - (90 * MS_PER_DAY);
        }
        if (seasonFilter === 'last_4_months') {
          return subTime >= nowTime - (120 * MS_PER_DAY);
        }
        if (seasonFilter === 'last_6_months') {
          return subTime >= nowTime - (180 * MS_PER_DAY);
        }
        if (seasonFilter === 'current_year') {
          return subDate.getFullYear() === currentYear;
        }
        return true;
      });

      const accepted = filteredSubs.filter(s => s.status === 'Accepted').length;
      const pts = calculatePoints(filteredSubs, tasks);
      const rate = filteredSubs.length > 0 ? Math.round((accepted / filteredSubs.length) * 100) : 0;
      return { user, points: pts, acceptedCount: accepted, totalSubmissions: filteredSubs.length, acceptanceRate: rate, badges: [] as string[], rank: 0 };
    }).sort((a, b) => b.points - a.points);

    return raw.map((s, idx) => ({
      ...s,
      rank: idx + 1,
      badges: getBadges(s, raw, submissions),
    }));
  }, [users, submissions, tasks, seasonFilter]);

  const myScore = scores.find(s => s.user.id === currentUser.id);
  const top3 = scores.slice(0, 3);
  const rest = scores.slice(3);
  const comparedPeer = scores.find(s => s.user.id === comparePeerId);

  const getMemberTier = (pts: number) => {
    if (pts >= 1000) return { label: language === 'ar' ? 'ماسّي 💎' : 'Platinum 💎', bg: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' };
    if (pts >= 500) return { label: language === 'ar' ? 'ذهبي 🥇' : 'Gold 🥇', bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
    if (pts >= 200) return { label: language === 'ar' ? 'فضي 🥈' : 'Silver 🥈', bg: 'bg-slate-400/10 text-slate-500 border-slate-300/20' };
    return { label: language === 'ar' ? 'برونزي 🥉' : 'Bronze 🥉', bg: 'bg-amber-700/10 text-amber-700 border-amber-700/20' };
  };

  const rankMedal = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="text-xs font-black text-slate-500 font-mono w-5 text-center">#{rank}</span>;
  };

  const rankBg = (rank: number) => {
    if (rank === 1) return 'from-yellow-500/20 to-amber-400/10 border-yellow-400/30';
    if (rank === 2) return 'from-slate-400/20 to-slate-300/10 border-slate-300/30';
    if (rank === 3) return 'from-amber-700/20 to-amber-600/10 border-amber-600/30';
    return 'from-slate-50 to-white border-slate-200 dark:from-slate-900 dark:to-slate-850 dark:border-slate-800';
  };

  const getGradeColor = (pts: number) => {
    if (pts >= 300) return 'text-yellow-500';
    if (pts >= 150) return 'text-blue-500';
    if (pts >= 60) return 'text-emerald-500';
    return 'text-slate-500';
  };

  return (
    <div className="space-y-8 p-6 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'} id="leaderboard-viewport">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-yellow-50 to-amber-50/40 dark:from-slate-900/60 dark:to-slate-850/40 p-6 rounded-3xl border border-yellow-200/40 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {language === 'ar' ? 'لوحة التنافسية وسجل التقييمات 🏆' : 'Points & Performance Board 🏆'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            {language === 'ar' ? 'متابعة أداء وتقييمات أعضاء الكيان وتصنيف المتصدرين' : 'Track overall member performance ratings and leaderboard ranks'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
          {['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator', 'Leader'].includes(currentUser.role) && (
            <button
              onClick={() => setIsGoogleSheetsModalOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-2 border border-emerald-400/30"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{language === 'ar' ? '🔗 ربط Google Sheets' : '🔗 Sync Google Sheets'}</span>
            </button>
          )}

          <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
            <p className="text-amber-500 font-black text-lg font-mono">{myScore?.points ?? 0}</p>
            <p className="text-slate-500">{language === 'ar' ? 'نقاطي' : 'My Points'}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
            <p className="text-blue-500 font-black text-lg font-mono">#{myScore?.rank ?? '-'}</p>
            <p className="text-slate-500">{language === 'ar' ? 'ترتيبي' : 'My Rank'}</p>
          </div>
        </div>
      </div>

      {/* Main View Tab Switcher */}
      <div className="flex flex-wrap gap-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 p-1.5 w-fit border border-slate-200/50 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('ranks')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
            activeTab === 'ranks' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'لوحة الصدارة والترتيب' : 'Ranks & Leaderboard'}</span>
        </button>
        <button
          onClick={() => setActiveTab('evaluations')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
            activeTab === 'evaluations' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? '⭐ سجل تقييمات كل الأعضاء' : '⭐ All Members Evaluations'}</span>
        </button>
        <button
          onClick={() => setActiveTab('badges')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
            activeTab === 'badges' ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'الشارات والإنجازات' : 'Badges & Streaks'}</span>
        </button>
      </div>

      {activeTab === 'badges' ? (
        <BadgesSystem currentUser={currentUser} />
      ) : activeTab === 'evaluations' ? (
        <AllMembersEvaluationsView currentUser={currentUser} onNavigateToView={onNavigateToView} />
      ) : (
      <>

      {/* Category Toggle: Members vs Leaders & Season Filter Selector */}
      <div className="space-y-3">
        {/* Category Role Switcher (Members vs Leaders) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-slate-900 dark:to-slate-850 p-4 rounded-2xl border border-blue-200/50 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              {language === 'ar' ? 'تصنيف لوحة التنافسية الصدارة (البيست):' : 'Leaderboard Category:'}
            </h3>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-extrabold">
            <button
              onClick={() => setRoleCategoryFilter('members')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 border ${
                roleCategoryFilter === 'members'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 shadow-md scale-105'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>🏅</span>
              <span>{language === 'ar' ? 'أفضل الأعضاء (Members)' : 'Top Members'}</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] bg-white/20 text-current font-mono">
                {roleCategoryFilter === 'members' ? users.length : ''}
              </span>
            </button>

            <button
              onClick={() => setRoleCategoryFilter('leaders')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 border ${
                roleCategoryFilter === 'leaders'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 shadow-md scale-105'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>👑</span>
              <span>{language === 'ar' ? 'أفضل القادة والمسؤولين (Leaders)' : 'Top Leaders'}</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] bg-white/20 text-current font-mono">
                {roleCategoryFilter === 'leaders' ? users.length : ''}
              </span>
            </button>
          </div>
        </div>

        {/* Season Filter Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <span>⏳</span>
            <span>{language === 'ar' ? 'الفترة الزمنية:' : 'Timeframe Period:'}</span>
          </span>
          <div className="flex flex-wrap gap-1.5 text-xs font-bold font-sans">
            {[
              { id: 'all', labelAr: '🌐 كل الأوقات', labelEn: 'All Time' },
              { id: 'current_month', labelAr: '📅 الشهر الحالي', labelEn: 'Current Month' },
              { id: 'last_month', labelAr: '⏮️ الشهر الماضي', labelEn: 'Last Month' },
              { id: 'last_3_months', labelAr: '📊 آخر 3 أشهر', labelEn: 'Last 3 Months' },
              { id: 'last_4_months', labelAr: '🥉 آخر 4 أشهر', labelEn: 'Last 4 Months' },
              { id: 'last_6_months', labelAr: '🥈 آخر 6 أشهر', labelEn: 'Last 6 Months' },
              { id: 'current_year', labelAr: '🗓️ هذه السنة', labelEn: 'This Year' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setSeasonFilter(opt.id as any)}
                className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer text-xs font-black ${
                  seasonFilter === opt.id
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 shadow-sm scale-105'
                    : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                }`}
              >
                {language === 'ar' ? opt.labelAr : opt.labelEn}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Points System Explainer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: '✅', label: language === 'ar' ? 'مقبول في الوقت' : 'Accepted On-Time', pts: '+100' },
          { icon: '⏰', label: language === 'ar' ? 'مقبول متأخراً' : 'Accepted Late', pts: '+60' },
          { icon: '❌', label: language === 'ar' ? 'مرفوض' : 'Rejected', pts: '+10' },
          { icon: '⭐', label: language === 'ar' ? 'درجة 90+' : 'Grade 90+', pts: '+20 bonus' },
        ].map(item => (
          <div key={item.label} className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
            <div className="text-xl mb-1">{item.icon}</div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{item.label}</p>
            <p className="text-sm font-black text-emerald-600 font-mono">{item.pts}</p>
          </div>
        ))}
      </div>

      {scores.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-16 text-center">
          <Trophy className="w-12 h-12 text-amber-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">{language === 'ar' ? 'لا يوجد أعضاء مسجلون بعد.' : 'No active members yet.'}</p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {top3.map(s => (
                <div 
                  key={s.user.id} 
                  onClick={() => onNavigateToView && onNavigateToView('profile', s.user.id)}
                  className={`bg-gradient-to-br ${rankBg(s.rank)} border rounded-3xl p-5 flex flex-col items-center gap-3 text-center shadow-sm relative overflow-hidden transition-all hover:scale-[1.03] cursor-pointer group`}
                  title={language === 'ar' ? 'عرض الملف الشخصي' : 'View Profile'}
                >
                  <div className="flex flex-col items-center gap-1">
                    {rankMedal(s.rank)}
                  </div>
                  <div className="relative">
                    {s.rank === 1 && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 transform drop-shadow-md z-10">
                        <Crown className="w-7 h-7 text-amber-400 fill-amber-300 animate-bounce" />
                      </div>
                    )}
                    <img
                      src={s.user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.user.fullName)}`}
                      alt=""
                      className={`w-16 h-16 rounded-2xl object-cover border-2 shadow ${
                        s.rank === 1 
                          ? 'border-amber-400 ring-4 ring-amber-400/20' 
                          : s.rank === 2 
                          ? 'border-slate-300' 
                          : 'border-amber-600'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex flex-col items-center gap-1 mb-0.5">
                      <p className="font-black text-slate-900 dark:text-white text-sm">{s.user.fullName}</p>
                      <span className={`text-[8px] px-1.5 py-0.2 rounded border font-extrabold shrink-0 ${getMemberTier(s.points).bg}`}>
                        {getMemberTier(s.points).label}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold">{translateCommittee(s.user.committee)}</p>
                  </div>
                  <div className={`text-2xl font-black font-mono ${getGradeColor(s.points)}`}>
                    {s.points} <span className="text-xs font-bold text-slate-400">{language === 'ar' ? 'نقطة' : 'pts'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {s.badges.map(b => (
                      <span key={b} className="text-[9px] bg-white/60 dark:bg-slate-900/60 px-2 py-0.5 rounded-full font-bold text-slate-700 dark:text-slate-300 border border-white/40">{b}</span>
                    ))}
                  </div>
                  <div className="flex gap-3 text-[10px] font-bold text-slate-500">
                    <span>✅ {s.acceptedCount}</span>
                    <span>📊 {s.acceptanceRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Full ranking table */}
          {rest.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-eye-brand" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  {language === 'ar' ? 'بقية ترتيب الأعضاء' : 'Rest of Rankings'}
                </h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {rest.map(s => (
                  <div 
                    key={s.user.id} 
                    onClick={() => onNavigateToView && onNavigateToView('profile', s.user.id)}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-400 w-6">{s.rank}.</span>
                      <img
                        src={s.user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.user.fullName)}`}
                        alt=""
                        className="w-9 h-9 rounded-xl object-cover"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{s.user.fullName}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{translateCommittee(s.user.committee)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className={`text-[8px] px-2 py-0.5 rounded border font-extrabold hidden sm:inline-block ${getMemberTier(s.points).bg}`}>
                        {getMemberTier(s.points).label}
                      </span>
                      <div className="text-end">
                        <span className={`font-mono font-black text-sm ${getGradeColor(s.points)}`}>{s.points}</span>
                        <span className="text-[10px] text-slate-400 block">{s.acceptedCount} {language === 'ar' ? 'تسليم' : 'subs'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Peer Comparison Selector */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" />
              <span>{language === 'ar' ? 'مقارنة الأداء المباشرة بينك وبين عضو آخر ⚔️' : 'Compare Your Performance ⚔️'}</span>
            </h3>

            <div className="flex gap-2 w-full max-w-full overflow-hidden">
              <select
                value={comparePeerId}
                onChange={e => setComparePeerId(e.target.value)}
                className="w-full max-w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-amber-500 truncate"
              >
                <option value="">{language === 'ar' ? '-- اختر عضواً لمقارنة الأداء والنقاط --' : '-- Select a peer to compare --'}</option>
                {scores.filter(s => s.user.id !== currentUser.id).map(s => (
                  <option key={s.user.id} value={s.user.id} className="bg-slate-900 text-white">
                    {s.user.fullName} ({s.points} {language === 'ar' ? 'نقطة' : 'pts'})
                  </option>
                ))}
              </select>
            </div>

            {comparedPeer && myScore && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 animate-fade-in">
                {/* My Profile */}
                <div className="bg-gradient-to-br from-blue-50/50 to-blue-50/10 dark:from-blue-950/20 dark:to-blue-900/5 p-4 rounded-2xl border border-blue-100/50 dark:border-blue-900/30 text-center space-y-2">
                  <img
                    src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.fullName)}`}
                    alt=""
                    className="w-12 h-12 rounded-xl mx-auto object-cover border border-blue-200 dark:border-blue-800"
                  />
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100">{currentUser.fullName}</p>
                  <p className="text-[10px] text-slate-400 font-bold">{translateCommittee(currentUser.committee)}</p>
                  <span className={`inline-block text-[8px] px-2 py-0.5 rounded-md border font-extrabold ${getMemberTier(myScore.points).bg}`}>
                    {getMemberTier(myScore.points).label}
                  </span>
                </div>

                {/* Comparison Specs */}
                <div className="space-y-3 flex flex-col justify-center">
                  <div className="space-y-1 text-center">
                    <span className="text-[10px] font-bold text-slate-400">{language === 'ar' ? 'فارق النقاط' : 'Points Diff'}</span>
                    <p className="text-base font-black font-mono text-emerald-500">
                      {myScore.points - comparedPeer.points > 0 ? `+${myScore.points - comparedPeer.points}` : myScore.points - comparedPeer.points}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>{myScore.acceptanceRate}%</span>
                      <span>{language === 'ar' ? 'معدل القبول' : 'Acceptance Rate'}</span>
                      <span>{comparedPeer.acceptanceRate}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${(myScore.acceptanceRate / Math.max(myScore.acceptanceRate + comparedPeer.acceptanceRate, 1)) * 100}%` }}
                      ></div>
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${(comparedPeer.acceptanceRate / Math.max(myScore.acceptanceRate + comparedPeer.acceptanceRate, 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Peer Profile */}
                <div className="bg-gradient-to-br from-amber-50/50 to-amber-50/10 dark:from-amber-950/20 dark:to-amber-900/5 p-4 rounded-2xl border border-amber-100/50 dark:border-amber-900/30 text-center space-y-2">
                  <img
                    src={comparedPeer.user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(comparedPeer.user.fullName)}`}
                    alt=""
                    className="w-12 h-12 rounded-xl mx-auto object-cover border border-amber-200 dark:border-amber-800"
                  />
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100">{comparedPeer.user.fullName}</p>
                  <p className="text-[10px] text-slate-400 font-bold">{translateCommittee(comparedPeer.user.committee)}</p>
                  <span className={`inline-block text-[8px] px-2 py-0.5 rounded-md border font-extrabold ${getMemberTier(comparedPeer.points).bg}`}>
                    {getMemberTier(comparedPeer.points).label}
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      </>
      )}

      {/* Google Sheets Integration Sync Modal */}
      <GoogleSheetSyncModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
};
