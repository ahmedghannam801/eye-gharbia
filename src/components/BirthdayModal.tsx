import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { Sparkles, Heart, Gift, Award, X, Cake } from 'lucide-react';
import { triggerPushFromSystemNotif } from '../lib/pushNotifications';

interface BirthdayModalProps {
  currentUser: UserProfile;
}

export const BirthdayModal: React.FC<BirthdayModalProps> = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!currentUser.dateOfBirth) return;

    const today = new Date();
    const currentMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const userDobParts = currentUser.dateOfBirth.split('-');
    const userMonthDay = `${userDobParts[1]}-${userDobParts[2]}`;

    if (currentMonthDay === userMonthDay) {
      // Check if already shown today
      const storageKey = `eye_bday_shown_${currentUser.id}_${today.getFullYear()}`;
      if (!localStorage.getItem(storageKey)) {
        setIsOpen(true);
        localStorage.setItem(storageKey, 'true');

        // Trigger mobile push notification
        triggerPushFromSystemNotif(
          `🎂 عيد ميلاد سعيد يا ${currentUser.fullName}! 🎉`,
          'أسرة EYE الغربية تهنئك بعيد ميلادك المبارك وتتمنى لك عاماً حافلاً بالتفوق والتميز!',
          'success'
        );
      }
    }
  }, [currentUser]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
      <div className="bg-gradient-to-b from-slate-900 via-amber-950 to-slate-900 border border-amber-500/30 text-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative overflow-hidden text-center animate-scale-up">
        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Floating Festive Elements */}
        <div className="absolute top-4 left-6 text-3xl animate-bounce">🎈</div>
        <div className="absolute top-10 right-10 text-3xl animate-pulse">✨</div>
        <div className="absolute bottom-6 left-8 text-3xl animate-pulse">🎁</div>

        {/* Mascot / Icon Badge */}
        <div className="mx-auto w-24 h-24 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-3xl p-1 shadow-xl shadow-amber-500/20 mb-6 flex items-center justify-center rotate-3 transform hover:rotate-0 transition-all">
          <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center text-5xl">
            🎂
          </div>
        </div>

        {/* Greeting Title */}
        <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-extrabold px-3 py-1 rounded-full mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          تهنئة خاصة من قيادة وأسرة EYE الغربية
        </div>

        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">
          عيد ميلاد سعيد يا <span className="text-amber-400">{currentUser.fullName}</span>! 🎉
        </h2>

        <p className="text-slate-300 text-sm leading-relaxed mb-6 max-w-md mx-auto">
          نتمنى لك عاماً سعيداً مليئاً بالصحة والنجاحات والتميز. شكراً لك على عطائك وتواجدك المميّز بيننا في{' '}
          <strong className="text-amber-300">{currentUser.committee === 'None' ? 'كيان EYE' : `لجنة ${currentUser.committee}`}</strong>! 🌟
        </p>

        {/* Features / Wish Box */}
        <div className="grid grid-cols-3 gap-3 bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 text-center">
          <div className="flex flex-col items-center">
            <Gift className="w-5 h-5 text-amber-400 mb-1" />
            <span className="text-[11px] font-bold text-slate-200">عام سعيد</span>
          </div>
          <div className="flex flex-col items-center border-x border-white/10">
            <Award className="w-5 h-5 text-orange-400 mb-1" />
            <span className="text-[11px] font-bold text-slate-200">مزيد من الإنجاز</span>
          </div>
          <div className="flex flex-col items-center">
            <Heart className="w-5 h-5 text-pink-400 mb-1" />
            <span className="text-[11px] font-bold text-slate-200">تقدير الأسرة</span>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(false)}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black py-3 px-6 rounded-2xl transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
        >
          <Cake className="w-5 h-5" />
          شكراً لكم! استكمال العمل 🚀
        </button>
      </div>
    </div>
  );
};
