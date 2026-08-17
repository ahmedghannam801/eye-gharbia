import React, { useState, useEffect } from 'react';
import { db } from '../db/localDb';
import { UserProfile, WeeklyChallenge, UserStreak } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { 
  Flame, 
  Trophy, 
  Award, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Target,
  Zap,
  Gift,
  Plus,
  Trash2,
  X
} from 'lucide-react';

interface WeeklyChallengesProps {
  currentUser: UserProfile;
}

export const WeeklyChallenges: React.FC<WeeklyChallengesProps> = ({ currentUser }) => {
  const { isRtl, language } = useLanguage();
  const isAr = language === 'ar';
  const isAdminOrLeader = ['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator', 'Leader'].includes(currentUser.role);

  const [challenges, setChallenges] = useState<WeeklyChallenge[]>([]);
  const [streak, setStreak] = useState<UserStreak | null>(null);

  // Admin Create Challenge state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [targetCount, setTargetCount] = useState(1);
  const [pointsReward, setPointsReward] = useState(50);

  const loadData = () => {
    setChallenges(db.getWeeklyChallenges());
    setStreak(db.getUserStreakData(currentUser.id));
  };

  useEffect(() => {
    loadData();
    const unsub = db.onChange(loadData);
    return () => unsub();
  }, [currentUser]);

  const handleClaim = (challengeId: string) => {
    const ok = db.claimChallengeReward(challengeId, currentUser);
    if (ok) {
      alert(isAr ? 'تهانينا! تم تحصيل نقاط المكافأة وإضافتها لرصيدك 🎉' : 'Reward claimed successfully! 🎉');
    } else {
      alert(isAr ? 'لقد قمت بتحصيل مكافأة هذا التحدي بالفعل' : 'Already claimed');
    }
  };

  const handleCreateChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    db.createWeeklyChallenge(title, desc, targetCount, pointsReward, undefined, currentUser);
    setShowCreateModal(false);
    setTitle('');
    setDesc('');
    alert(isAr ? 'تمت إضافة التحدي الأسبوعي بنجاح 🎉' : 'Weekly challenge created 🎉');
  };

  const handleDeleteChallenge = (id: string) => {
    if (confirm(isAr ? 'هل أنت متأكد من مسح هذا التحدي؟' : 'Delete this challenge?')) {
      db.deleteWeeklyChallenge(id, currentUser);
      loadData();
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-950 via-orange-900 to-slate-950 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-widest">
            <Flame className="w-4 h-4 text-orange-500 animate-bounce" />
            <span>{isAr ? 'نظام التحفيز وسلسلة النشاط' : 'Weekly Challenges & Active Streaks'}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black">
            {isAr ? 'التحديات الأسبوعية وسلسلة النشاط 🏆' : 'Weekly Challenges & Streaks 🏆'}
          </h1>
          <p className="text-xs md:text-sm text-slate-300 font-medium max-w-2xl">
            {isAr ? 'حافظ على سلسلة تفاعلك اليومي واكتمل التحديات الأسبوعية لتحصيل نقاط الشرف والارتقاء في لوحة الصدارة.' : 'Maintain your daily active streak and complete weekly challenges to earn bonus points.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10 w-full md:w-auto justify-start md:justify-end">
          {/* Streak Flame Counter Card */}
          {streak && (
            <div className="bg-slate-900/90 border border-amber-500/40 p-4 rounded-2xl flex items-center gap-3 shrink-0 shadow-lg flex-1 sm:flex-none">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/40 shrink-0">
                <Flame className="w-6 h-6 fill-current animate-pulse" />
              </div>
              <div>
                <div className="text-xl font-black text-amber-400">
                  {streak.currentStreakDays} {isAr ? 'أيام 🔥' : 'Days 🔥'}
                </div>
                <div className="text-[10px] text-slate-400 font-bold">
                  {isAr ? 'سلسلة النشاط' : 'Active Streak'}
                </div>
              </div>
            </div>
          )}

          {isAdminOrLeader && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-orange-500/20 shrink-0 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>{isAr ? 'إضافة تحدي أسبوعي' : 'New Challenge'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Challenges List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {challenges.map(chall => {
          const isClaimed = chall.claimedUserIds.includes(currentUser.id);

          return (
            <div
              key={chall.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {isAr ? 'تحدي أسبوعي' : 'Weekly Goal'}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Award className="w-4 h-4" />
                      +{chall.pointsReward} {isAr ? 'نقطة' : 'pts'}
                    </span>

                    {isAdminOrLeader && (
                      <button
                        onClick={() => handleDeleteChallenge(chall.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title={isAr ? 'حذف التحدي' : 'Delete Challenge'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                  {chall.title}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  {chall.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleClaim(chall.id)}
                  disabled={isClaimed}
                  className={`w-full py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                    isClaimed
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                      : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-orange-500/20'
                  }`}
                >
                  <Gift className="w-4 h-4" />
                  <span>{isClaimed ? (isAr ? 'تم تحصيل المكافأة ✅' : 'Claimed ✅') : (isAr ? 'تحصيل النقاط الآن 🎉' : 'Claim Reward 🎉')}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE CHALLENGE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-500" />
                <span>{isAr ? 'إضافة تحدي أسبوعي جديد' : 'New Challenge'}</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateChallenge} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'عنوان التحدي *' : 'Title *'}</label>
                <input
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={isAr ? 'مثال: 🔥 بطل الإنجاز الأسبوعي' : 'e.g. Weekly Achievement'}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'وصف وشروط التحدي' : 'Description'}</label>
                <textarea
                  rows={2}
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder={isAr ? 'وصف مختصر لما يلزم إنجازه...' : 'Brief requirements...'}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'نقاط المكافأة المكتسبة' : 'Points Reward'}</label>
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={pointsReward}
                  onChange={e => setPointsReward(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 border rounded-xl text-xs font-bold text-slate-500">{isAr ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20">{isAr ? 'نشر التحدي الأسبوعي' : 'Publish Challenge'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
