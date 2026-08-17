import React, { useState, useEffect } from 'react';
import { UserProfile, getActiveGovernorate, formatGovernorateWelcomeAr } from '../types';
import { db } from '../db/localDb';
import { supabase } from '../lib/supabaseClient';
import { User, Phone, Briefcase, Building2, CheckCircle2, X, AlertTriangle, Loader2 } from 'lucide-react';

interface Props {
  currentUser: UserProfile | null;
  onComplete: (updated: UserProfile) => void;
}

const COMMITTEES = ['HR', 'PR', 'OR', 'SM'];
const DEPARTMENTS: Record<string, string[]> = {
  HR: ['HRM', 'Training', 'Recruitment'],
  PR: ['Media', 'Design', 'Content'],
  OR: ['Events', 'Logistics', 'Partnerships'],
  SM: ['Social Media', 'Marketing', 'Outreach'],
};

const STORAGE_KEY = 'eye_profile_completed_v1';

/** Returns true if the profile is missing critical fields */
function isProfileIncomplete(user: UserProfile): boolean {
  const nameBad = !user.fullName || !user.fullName.trim().includes(' ') || /\d/.test(user.fullName);
  const committeeBad = !user.committee || user.committee === 'None';
  const phoneBad = !user.phoneNumber || user.phoneNumber === '+201000000000' || user.phoneNumber.trim() === '';
  return nameBad || committeeBad || phoneBad;
}

export const ProfileCompletionModal: React.FC<Props> = ({ currentUser, onComplete }) => {
  const [visible, setVisible] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [committee, setCommittee] = useState('HR');
  const [department, setDepartment] = useState('HRM');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    // Only show once per user per device
    const key = `${STORAGE_KEY}_${currentUser.id}`;
    const alreadyDone = localStorage.getItem(key);
    if (alreadyDone) return;
    if (isProfileIncomplete(currentUser)) {
      setFullName(currentUser.fullName && currentUser.fullName.includes(' ') ? currentUser.fullName : '');
      setPhone(
        currentUser.phoneNumber && currentUser.phoneNumber !== '+201000000000' ? currentUser.phoneNumber : ''
      );
      setCommittee(currentUser.committee && currentUser.committee !== 'None' ? currentUser.committee : 'HR');
      setDepartment(
        currentUser.department && currentUser.department !== 'None'
          ? currentUser.department
          : DEPARTMENTS['HR'][0]
      );
      setVisible(true);
    }
  }, [currentUser]);

  // Update department options when committee changes
  useEffect(() => {
    const depts = DEPARTMENTS[committee] || [];
    if (!depts.includes(department)) setDepartment(depts[0] || '');
  }, [committee]);

  const handleSave = async () => {
    if (!currentUser) return;
    if (!fullName.trim() || !fullName.trim().includes(' ')) {
      setError('يرجى كتابة الاسم الكامل (الاسم الأول والأخير على الأقل)');
      return;
    }
    if (!phone.trim()) {
      setError('يرجى إدخال رقم هاتفك');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updates = {
        full_name: fullName.trim(),
        phone_number: phone.trim(),
        committee,
        department,
        status: 'Active' as const,
      };
      // Update Supabase directly
      const { error: sbErr } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', currentUser.id);
      if (sbErr) throw sbErr;

      const updatedUser: UserProfile = {
        ...currentUser,
        fullName: fullName.trim(),
        phoneNumber: phone.trim(),
        committee,
        department,
        status: 'Active',
      };

      // Update local db cache
      await db.updateProfile(currentUser.id, {
        fullName: fullName.trim(),
        phoneNumber: phone.trim(),
        committee,
        department,
        status: 'Active',
      }, currentUser);

      // Mark as done in localStorage so it never shows again
      localStorage.setItem(`${STORAGE_KEY}_${currentUser.id}`, '1');
      setDone(true);
      setTimeout(() => {
        setVisible(false);
        onComplete(updatedUser);
      }, 1800);
    } catch (e: any) {
      setError(e?.message || 'حدث خطأ، حاول مرة أخرى');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.65)' }}>
      <div className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0c1a2e 100%)', border: '1px solid rgba(99,179,237,0.15)' }}>
        {/* Decorative top bar */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)' }} />

        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-3" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}>
            <User size={26} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">أكمل بياناتك</h2>
          <p className="text-sm text-slate-400">
            بياناتك ناقصة — يرجى تحديثها مرة واحدة فقط للاستمرار
          </p>
        </div>

        {/* Done state */}
        {done ? (
          <div className="px-6 pb-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 size={52} className="text-emerald-400" />
            <p className="text-lg font-semibold text-white">تم الحفظ بنجاح! 🎉</p>
            <p className="text-slate-400 text-sm">مرحباً بك في منصة EYE {formatGovernorateWelcomeAr(getActiveGovernorate(currentUser))}</p>
          </div>
        ) : (
          <div className="px-6 pb-6 flex flex-col gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide uppercase">الاسم الكامل</label>
              <div className="relative">
                <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="مثال: أحمد محمد علي"
                  dir="rtl"
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide uppercase">رقم الهاتف</label>
              <div className="relative">
                <Phone size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  dir="ltr"
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
            </div>

            {/* Committee */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide uppercase">اللجنة</label>
              <div className="relative">
                <Briefcase size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={committee}
                  onChange={e => setCommittee(e.target.value)}
                  dir="rtl"
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {COMMITTEES.map(c => (
                    <option key={c} value={c} style={{ background: '#1e293b' }}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide uppercase">القسم</label>
              <div className="relative">
                <Building2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  dir="rtl"
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {(DEPARTMENTS[committee] || []).map(d => (
                    <option key={d} value={d} style={{ background: '#1e293b' }}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl text-sm text-red-300" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertTriangle size={15} />
                {error}
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {saving ? 'جاري الحفظ...' : 'حفظ البيانات'}
            </button>

            <p className="text-center text-xs text-slate-500">
              ستظهر هذه النافذة مرة واحدة فقط • بياناتك محمية وآمنة
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
