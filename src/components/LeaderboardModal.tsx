import React, { useState } from 'react';
import { db } from '../db/localDb';
import { UserProfile } from '../types';
import { Trophy, Award, Medal, Star, Flame, Sparkles, X, ChevronRight, Filter } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose, currentUser }) => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [selectedCommittee, setSelectedCommittee] = useState<string>('All');

  if (!isOpen) return null;

  const allUsers = db.getUsers(currentUser).filter(u => u.status === 'Active');
  const allSubmissions = db.getSubmissions();
  const allCertificates = db.getCertificates().filter(c => c.status === 'approved');

  // Compute scores for members
  const scoredMembers = allUsers.map(u => {
    const userSubs = allSubmissions.filter(s => s.memberId === u.id || s.memberName === u.fullName);
    const userCerts = allCertificates.filter(c => c.recipientId === u.id || c.recipientName === u.fullName);
    
    // Points formula: 15 per completed task/submission + 25 per certificate
    const points = userSubs.length * 15 + userCerts.length * 25 + (u.role === 'Super Admin' ? 50 : 20);

    return {
      user: u,
      points,
      taskCount: userSubs.length,
      certCount: userCerts.length,
    };
  });

  // Filter by committee if requested
  const filtered = selectedCommittee === 'All'
    ? scoredMembers
    : scoredMembers.filter(m => m.user.committee && m.user.committee.includes(selectedCommittee));

  const sorted = [...filtered].sort((a, b) => b.points - a.points);
  const top3 = sorted.slice(0, 3);
  const others = sorted.slice(3, 10);

  const committees = ['All', 'Human Resources', 'Public Relations', 'Social Media', 'Organization & Relations', 'Media'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-amber-300/50 dark:border-amber-500/30 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6 relative" dir={ar ? 'rtl' : 'ltr'}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 text-white flex items-center justify-center shadow-lg">
              <Trophy className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{ar ? '🏆 لوحة الشرف للأعضاء المتميزين' : '🏆 Monthly Excellence Leaderboard'}</span>
              </h2>
              <p className="text-xs text-slate-500 font-bold">{ar ? 'ترتيب الأعضاء الأكثر تفاعلاً وإنجازاً في كيان EYE' : 'Top active & distinguished EYE members'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {committees.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCommittee(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${selectedCommittee === c ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
            >
              {c === 'All' ? (ar ? 'كل اللجان 🌟' : 'All Committees 🌟') : c}
            </button>
          ))}
        </div>

        {/* Top 3 Podium */}
        {top3.length > 0 && (
          <div className="grid grid-cols-3 gap-3 pt-2 items-end text-center">
            {/* Rank 2 (Silver) */}
            {top3[1] && (
              <div className="bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-300 dark:border-slate-700 shadow-md relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-300 text-slate-900 font-black text-[10px] px-2.5 py-0.5 rounded-full border border-white shadow">
                  🥈 #2
                </div>
                <div className="w-12 h-12 rounded-full mx-auto mb-2 overflow-hidden border-2 border-slate-300">
                  <img src={top3[1].user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'} alt={top3[1].user.fullName} className="w-full h-full object-cover" />
                </div>
                <p className="font-black text-xs text-slate-900 dark:text-white truncate">{top3[1].user.fullName}</p>
                <p className="text-[10px] text-slate-500 font-bold">{top3[1].user.committee || 'عضو'}</p>
                <span className="inline-block mt-2 text-xs font-black text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                  ⚡ {top3[1].points} {ar ? 'نقطة' : 'pts'}
                </span>
              </div>
            )}

            {/* Rank 1 (Gold) */}
            {top3[0] && (
              <div className="bg-gradient-to-b from-amber-500/20 to-orange-500/10 dark:from-amber-500/30 dark:to-amber-950/40 rounded-3xl p-5 border-2 border-amber-400 shadow-xl relative -translate-y-2">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black text-xs px-3 py-1 rounded-full border-2 border-white shadow-lg flex items-center gap-1">
                  👑 #1 {ar ? 'الأول' : 'Top'}
                </div>
                <div className="w-16 h-16 rounded-full mx-auto mb-2 overflow-hidden border-4 border-amber-400 shadow-lg">
                  <img src={top3[0].user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'} alt={top3[0].user.fullName} className="w-full h-full object-cover" />
                </div>
                <p className="font-black text-sm text-slate-900 dark:text-white truncate">{top3[0].user.fullName}</p>
                <p className="text-[10px] text-amber-600 dark:text-amber-300 font-black">{top3[0].user.committee || 'عضو متميز'}</p>
                <span className="inline-block mt-2 text-xs font-black text-amber-900 dark:text-amber-100 bg-amber-400/80 px-3 py-1 rounded-full shadow">
                  🔥 {top3[0].points} {ar ? 'نقطة تميز' : 'pts'}
                </span>
              </div>
            )}

            {/* Rank 3 (Bronze) */}
            {top3[2] && (
              <div className="bg-amber-900/10 dark:bg-amber-950/20 rounded-2xl p-4 border border-amber-700/30 shadow-md relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-700 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full border border-white shadow">
                  🥉 #3
                </div>
                <div className="w-12 h-12 rounded-full mx-auto mb-2 overflow-hidden border-2 border-amber-600">
                  <img src={top3[2].user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'} alt={top3[2].user.fullName} className="w-full h-full object-cover" />
                </div>
                <p className="font-black text-xs text-slate-900 dark:text-white truncate">{top3[2].user.fullName}</p>
                <p className="text-[10px] text-slate-500 font-bold">{top3[2].user.committee || 'عضو'}</p>
                <span className="inline-block mt-2 text-xs font-black text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">
                  ⚡ {top3[2].points} {ar ? 'نقطة' : 'pts'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Other Rankings List */}
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-black text-slate-500 uppercase">{ar ? 'باقي الأعضاء المتميزين' : 'Distinguished Runners-up'}</h4>
          {others.map((item, index) => (
            <div key={item.user.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 flex items-center justify-between border border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="w-6 text-center text-xs font-black text-slate-400">#{index + 4}</span>
                <img src={item.user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'} className="w-8 h-8 rounded-full object-cover" alt="" />
                <div>
                  <p className="text-xs font-black text-slate-900 dark:text-white truncate">{item.user.fullName}</p>
                  <p className="text-[9px] text-slate-400 font-bold">{item.user.committee || 'عضو'} • {item.user.role}</p>
                </div>
              </div>
              <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl">
                {item.points} {ar ? 'نقطة' : 'pts'}
              </span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
