import React, { useState } from 'react';
import { UserProfile } from '../types';
import { db, calculateMemberAVG } from '../db/localDb';
import { useLanguage } from '../lib/LanguageContext';
import { Trophy, Star, CheckCircle2, Flame, Crown, X } from 'lucide-react';

interface MemberOfTheMonthProps {
  currentUser: UserProfile;
  forceShow?: boolean;
}

export const MemberOfTheMonth: React.FC<MemberOfTheMonthProps> = ({ currentUser, forceShow = false }) => {
  const { language, isRtl, translateCommittee } = useLanguage();
  const isAr = language === 'ar';

  const today = new Date();
  const currentDay = today.getDate();
  const monthKey = `${today.getFullYear()}_${today.getMonth() + 1}`;
  const dismissKey = `eye_motm_dismissed_${monthKey}_${currentUser.id}`;

  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem(dismissKey) === 'true';
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(dismissKey, 'true');
    } catch {}
  };

  // Show Member of the Month ONLY at the beginning of the month (first 5 days of the month)
  const isStartOfMonth = currentDay <= 5;

  if (!forceShow && (!isStartOfMonth || isDismissed)) {
    return null;
  }

  const userGov = currentUser.governorate || 'الغربية';
  const govUsers = db.getUsers().filter(u => u.status === 'Active' && (u.governorate === userGov || !u.governorate));
  const meetings = db.getMeetings();
  const attendance = db.getAllAttendance();
  const tasks = db.getTasks();
  const submissions = db.getSubmissions();
  const excuses = db.getExcuseRequests();
  const evaluations = db.getMemberEvaluations();

  // Calculate highest AVG member in the governorate
  const rankedMembers = govUsers.map(m => {
    const avgBreakdown = calculateMemberAVG(
      m.id,
      meetings,
      attendance,
      tasks,
      submissions,
      excuses,
      evaluations,
      m.bonusPoints || 0
    );
    return {
      member: m,
      avg: avgBreakdown.avgScore,
      bonus: avgBreakdown.bonusPoints,
      completedTasks: avgBreakdown.completedTasksCount,
    };
  }).sort((a, b) => b.avg - a.avg || b.bonus - a.bonus);

  if (rankedMembers.length === 0) return null;
  const topResult = rankedMembers[0];
  const { member, avg, completedTasks } = topResult;

  // Auto-send notification to governorate members once at the start of the month
  const notifKey = `eye_notif_motm_${monthKey}_${member.id}`;
  if (!localStorage.getItem(notifKey)) {
    try {
      localStorage.setItem(notifKey, 'true');
      const targetUserIds = govUsers.map(u => u.id);
      db.addNotificationsBulk(
        targetUserIds,
        '🏆 عضو الشهر المتميز',
        `تهانينا للعضو "${member.fullName}" لحصوله على لقب عضو الشهر المتميز في محافظة ${userGov} بأعلى تقييم (AVG: ${avg}%)!`,
        'success'
      );
    } catch {}
  }

  return (
    <div className="relative overflow-hidden rounded-3xl p-4 sm:p-8 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border border-amber-400/40 text-white shadow-2xl animate-fade-in my-4 group" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Dismiss Button */}
      {!forceShow && (
        <button
          onClick={handleDismiss}
          className="absolute top-3 left-3 sm:top-4 sm:left-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all z-20"
          title={isAr ? 'إغلاق' : 'Dismiss'}
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Background Decorative Gold Lights */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-center justify-between gap-5 relative z-10">
        
        {/* Left/Start: Member Avatar & Gold Crown */}
        <div className="flex items-center gap-4 sm:gap-5 w-full md:w-auto">
          <div className="relative shrink-0">
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-3xl p-1 bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-500 shadow-xl flex items-center justify-center">
              <img
                src={member.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.fullName)}`}
                alt={member.fullName}
                className="w-full h-full rounded-2xl object-cover bg-slate-900"
              />
            </div>
            {/* Gold Crown Badge */}
            <div className="absolute -top-2.5 -left-2.5 sm:-top-3.5 sm:-left-3.5 w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 border-2 border-amber-100 flex items-center justify-center shadow-lg transform -rotate-12">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
            </div>
          </div>

          <div className="space-y-1 text-start min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[9px] sm:text-[10px] font-black tracking-wider uppercase max-w-full truncate">
              <Trophy className="w-3 h-3 shrink-0" />
              <span className="truncate">{isAr ? `عضو الشهر - ${userGov} 🏆` : `Member of the Month - ${userGov}`}</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white truncate">{member.fullName}</h2>
            <p className="text-xs text-amber-200/90 font-bold flex items-center gap-1.5 flex-wrap">
              <span>{member.role}</span>
              <span>•</span>
              <span>{translateCommittee(member.committee)}</span>
            </p>
          </div>
        </div>

        {/* Right/End: Performance Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full md:w-auto bg-white/5 border border-white/10 p-3 sm:p-4 rounded-2xl backdrop-blur-md">
          <div className="text-center px-1 sm:px-3 border-e border-white/10">
            <span className="text-[9px] sm:text-[10px] text-amber-300/80 font-bold block truncate">{isAr ? 'معدل الـ AVG' : 'AVG Score'}</span>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 fill-amber-400 shrink-0" />
              <span className="text-sm sm:text-lg font-black font-mono text-white">{avg}%</span>
            </div>
          </div>

          <div className="text-center px-1 sm:px-3 border-e border-white/10">
            <span className="text-[9px] sm:text-[10px] text-amber-300/80 font-bold block truncate">{isAr ? 'المهام' : 'Tasks'}</span>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
              <span className="text-sm sm:text-lg font-black font-mono text-white">{completedTasks}</span>
            </div>
          </div>

          <div className="text-center px-1 sm:px-3">
            <span className="text-[9px] sm:text-[10px] text-amber-300/80 font-bold block truncate">{isAr ? 'التزام ⚡' : 'Streak'}</span>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-400 fill-orange-400 shrink-0" />
              <span className="text-sm sm:text-lg font-black font-mono text-white">{member.streakCount || 1}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


