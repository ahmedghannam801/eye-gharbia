import React, { useState } from 'react';
import { UserProfile, getActiveGovernorate, formatGovernorateWelcomeAr } from '../types';
import { db } from '../db/localDb';
import { Cake, Calendar, Check, X, Sparkles } from 'lucide-react';

interface DobPromptBannerProps {
  currentUser: UserProfile;
  onDobSaved?: (dateOfBirth: string) => void;
}

export const DobPromptBanner: React.FC<DobPromptBannerProps> = ({ currentUser, onDobSaved }) => {
  const [dob, setDob] = useState('');
  const [isDismissed, setIsDismissed] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // If user already has a DOB or user manually dismissed, hide
  if (currentUser.dateOfBirth || isDismissed) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dob) return;

    db.updateUserDateOfBirth(currentUser.id, dob);
    setIsSaved(true);
    if (onDobSaved) onDobSaved(dob);
    setTimeout(() => {
      setIsDismissed(true);
    }, 1800);
  };

  return (
    <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 text-white p-4 rounded-2xl shadow-lg border border-amber-300/30 mb-6 transition-all animate-fade-in relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/30 text-2xl shadow-sm">
            🎂
          </div>
          <div>
            <h3 className="font-extrabold text-sm flex items-center gap-1.5 text-white">
              شاركتنا تاريخ ميلادك للحصول على المعايدات الخاصة! 🎉
              <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
            </h3>
            <p className="text-xs text-amber-100 mt-0.5">
              نودّ الاحتفال معك في يوم ميلادك وتكريمك بين أسرة EYE {formatGovernorateWelcomeAr(getActiveGovernorate(currentUser))}. الرجاء إدخال تاريخ ميلادك.
            </p>
          </div>
        </div>

        {isSaved ? (
          <div className="flex items-center gap-2 bg-emerald-600/90 text-white px-4 py-2 rounded-xl text-xs font-bold shadow">
            <Check className="w-4 h-4" />
            تم حفظ تاريخ ميلادك بنجاح! شكرًا لك 💖
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex items-center gap-2 shrink-0 w-full md:w-auto">
            <div className="relative flex-1 md:w-44">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
                max={new Date().toISOString().split('T')[0]}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white text-slate-800 font-medium border border-white/40 focus:ring-2 focus:ring-amber-300 focus:outline-none shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="bg-white text-amber-700 hover:bg-amber-50 font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 shrink-0 flex items-center gap-1.5"
            >
              <Cake className="w-3.5 h-3.5" />
              حفظ التاريخ
            </button>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-all"
              title="تخطي حالياً"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
