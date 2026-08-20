import React, { useState } from 'react';
import { UserProfile, DisciplinaryRecord } from '../types';
import { db } from '../db/localDb';
import { useLanguage } from '../lib/LanguageContext';
import { ShieldAlert, AlertTriangle, Plus, Trash2, CheckCircle2, User, FileText, Calendar, Filter, X } from 'lucide-react';

interface DisciplinaryRecordsProps {
  currentUser: UserProfile;
}

export const DisciplinaryRecords: React.FC<DisciplinaryRecordsProps> = ({ currentUser }) => {
  const { language, isRtl, translateCommittee } = useLanguage();
  const isAr = language === 'ar';
  const canManage = ['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator', 'Leader'].includes(currentUser.role);

  const [records, setRecords] = useState<DisciplinaryRecord[]>(() => db.getDisciplinaryRecords());
  const [showIssueModal, setShowIssueModal] = useState(false);

  // Form states
  const [targetMemberId, setTargetMemberId] = useState('');
  const [severity, setSeverity] = useState<'Notice' | 'First Warning' | 'Second Warning' | 'Final Warning'>('Notice');
  const [reason, setReason] = useState('');
  const [regulationCode, setRegulationCode] = useState('L-102');
  const [penaltyPoints, setPenaltyPoints] = useState(5);

  const users = db.getUsers().filter(u => u.status === 'Active' && u.id !== currentUser.id);

  const loadData = () => {
    setRecords(db.getDisciplinaryRecords());
  };

  const handleIssueWarning = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMemberId || !reason.trim()) return;

    const targetUser = users.find(u => u.id === targetMemberId);
    if (!targetUser) return;

    const isLft = severity === 'Notice';

    // 1. Update user profile disciplinary count
    if (isLft) {
      const newLft = (targetUser.lftNazarCount || 0) + 1;
      db.updateUserFullDetails(targetUser.id, { lftNazarCount: newLft }, currentUser);
    } else {
      const currentInzar = targetUser.inzarCount || 0;
      const targetLevel = severity === 'First Warning' ? 1 : severity === 'Second Warning' ? 2 : 3;
      db.updateUserFullDetails(targetUser.id, { inzarCount: Math.max(currentInzar + 1, targetLevel) }, currentUser);
    }

    // 2. Save complete official disciplinary record & trigger push + in-app notification
    db.addDisciplinaryRecord({
      type: isLft ? 'lft_nazar' : 'inzar',
      memberId: targetUser.id,
      memberName: targetUser.fullName,
      committee: targetUser.committee,
      governorate: targetUser.governorate || currentUser.governorate || 'الغربية',
      severity,
      reason,
      regulationCode,
      penaltyPoints,
      issuedBy: currentUser.id,
      issuedByName: currentUser.fullName,
      coordinator: currentUser.role === 'Coordinator' ? currentUser.fullName : 'منسق عام المحافظة',
      noticeNumber: 'DISC-' + String(Math.floor(100 + Math.random() * 900)),
      meetingDay: 'الاجتماع الدوري',
      meetingDate: new Date().toLocaleDateString('ar-EG'),
    });

    loadData();
    setShowIssueModal(false);
    setTargetMemberId('');
    setReason('');
    alert(isAr ? `تم إصدار ${isLft ? 'لفت النظر الرسمي' : 'الإنذار الرسمي'} وإرسال إشعار فوري للعضو ${targetUser.fullName} بنجاح! 📩` : `Warning issued and sent to ${targetUser.fullName}!`);
  };

  const handleDeleteRecord = (id: string) => {
    if (window.confirm(isAr ? 'هل أنت تأكد من إلغاء هذا الإنذار الرسمي؟' : 'Remove this warning record?')) {
      db.deleteDisciplinaryRecord(id);
      loadData();
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-5xl mx-auto animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-950 text-white p-6 sm:p-8 rounded-3xl border border-red-800/40 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1 text-start">
          <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
            <ShieldAlert className="w-4 h-4" />
            <span>{isAr ? 'السجل التأديبي ومتابعة الالتزام التنظيمي' : 'Disciplinary & Safety Registry'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black">{isAr ? 'سجل الإنذارات ولفت النظر الرسمي 📜⚠️' : 'Official Warning & Safety Vault 📜⚠️'}</h1>
          <p className="text-xs text-red-200/80 font-medium">{isAr ? 'حصر وتوثيق العقوبات والإنذارات الرسمية الصادرة وفق اللائحة الداخلية لكيان EYE.' : 'Official warnings and disciplinary records registered per EYE regulations.'}</p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowIssueModal(true)}
            className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-2xl shadow-lg transition-all cursor-pointer flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'إصدار إنذار رسمي جديد ⚠️' : 'Issue New Warning ⚠️'}</span>
          </button>
        )}
      </div>

      {/* Records List Grid */}
      <div className="space-y-3">
        {records.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-2 text-slate-400">
            <ShieldAlert className="w-12 h-12 mx-auto opacity-30 text-emerald-500" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{isAr ? 'السجل التأديبي نظيف 100%! لا توجد أي إنذارات رسمية مسجلة.' : 'No disciplinary records registered. Perfect compliance!'}</p>
          </div>
        ) : (
          records.map(record => (
            <div key={record.id} className="bg-white dark:bg-slate-900 border border-red-200/60 dark:border-red-900/40 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all text-start">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 dark:text-white text-sm">{record.memberName}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200">
                      {record.severity}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 font-bold">{record.regulationCode}</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    {record.reason}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {isAr ? 'صادر بواسطة' : 'By'}: {record.issuedByName} • {new Date(record.issuedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                  </p>
                </div>
              </div>

              {canManage && (
                <button
                  onClick={() => handleDeleteRecord(record.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all self-end sm:self-center"
                  title={isAr ? 'إلغاء الإنذار' : 'Remove record'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* ISSUE WARNING MODAL */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-start">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  {isAr ? 'إصدار إنذار رسمي للعضو' : 'Issue Official Disciplinary Warning'}
                </h3>
              </div>
              <button onClick={() => setShowIssueModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIssueWarning} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">{isAr ? 'اختيار العضو' : 'Select Member'}</label>
                <select
                  value={targetMemberId}
                  onChange={e => setTargetMemberId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
                  required
                >
                  <option value="">{isAr ? '-- اختر العضو المخالف --' : '-- Select member --'}</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">{isAr ? 'درجة العقوبة / الإنذار' : 'Warning Severity'}</label>
                <select
                  value={severity}
                  onChange={e => setSeverity(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="Notice">{isAr ? 'لفت نظر شفوي' : 'Oral Notice'}</option>
                  <option value="First Warning">{isAr ? 'إنذار أول' : 'First Warning'}</option>
                  <option value="Second Warning">{isAr ? 'إنذار ثانٍ' : 'Second Warning'}</option>
                  <option value="Final Warning">{isAr ? 'إنذار نهائي' : 'Final Warning'}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">{isAr ? 'سبب وملاحظة المخالفة وفق اللائحة' : 'Reason & Violation Note'}</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  placeholder={isAr ? 'اكتب أسباب لفت النظر بالتفصيل...' : 'Detailed violation reason...'}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:border-red-500 text-slate-900 dark:text-white resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer"
              >
                {isAr ? 'تأكيد وإصدار الإنذار الرسمي' : 'Confirm & Issue Warning'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
