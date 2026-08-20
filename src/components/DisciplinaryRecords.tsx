import React, { useState, useEffect } from 'react';
import { UserProfile, DisciplinaryRecord } from '../types';
import { db } from '../db/localDb';
import { useLanguage } from '../lib/LanguageContext';
import { ShieldAlert, AlertTriangle, Plus, Trash2, CheckCircle2, User, FileText, Calendar, Filter, X, Printer, Download, Eye, Maximize2, Minimize2 } from 'lucide-react';
import { fillAndDownloadDocxTemplate } from '../lib/docxFiller';

interface DisciplinaryRecordsProps {
  currentUser: UserProfile;
  selectedRecordId?: string;
}

export const DisciplinaryRecords: React.FC<DisciplinaryRecordsProps> = ({ currentUser, selectedRecordId }) => {
  const { language, isRtl, translateCommittee } = useLanguage();
  const isAr = language === 'ar';
  const canManage = ['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator', 'Leader'].includes(currentUser.role);

  const [records, setRecords] = useState<DisciplinaryRecord[]>(() => db.getDisciplinaryRecords(currentUser));
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<DisciplinaryRecord | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Form states
  const [targetMemberId, setTargetMemberId] = useState('');
  const [severity, setSeverity] = useState<'Notice' | 'First Warning' | 'Second Warning' | 'Final Warning'>('Notice');
  const [reason, setReason] = useState('');
  const [regulationCode, setRegulationCode] = useState('L-102');
  const [penaltyPoints, setPenaltyPoints] = useState(5);

  const users = db.getUsers().filter(u => u.status === 'Active' && u.id !== currentUser.id);

  const loadData = () => {
    const all = db.getDisciplinaryRecords(currentUser);
    setRecords(all);
  };

  useEffect(() => {
    loadData();
    const unsub = db.onChange(loadData);
    return () => unsub();
  }, [currentUser]);

  // Deep-link auto open notification target record
  useEffect(() => {
    if (selectedRecordId) {
      const all = db.getDisciplinaryRecords(currentUser);
      const matched = all.find(r => r.id === selectedRecordId || r.id === selectedRecordId.replace('disc-', ''));
      if (matched) {
        setViewingRecord(matched);
      }
    }
  }, [selectedRecordId]);

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
    if (window.confirm(isAr ? 'هل أنت متأكد من إلغاء هذا الإنذار الرسمي؟' : 'Remove this warning record?')) {
      db.deleteDisciplinaryRecord(id);
      loadData();
    }
  };

  const handlePrintDoc = (rec: DisciplinaryRecord) => {
    const isNotice = rec.type === 'lft_nazar' || rec.severity === 'Notice';
    const titleHeading = isNotice ? 'لفت نظر' : 'إنذار';
    const noticeNo = rec.noticeNumber || '01';
    const meetingDay = rec.meetingDay || 'الاجتماع الدوري';
    const meetingDate = rec.meetingDate || new Date(rec.issuedAt).toLocaleDateString('ar-EG');
    const hrManager = rec.issuedByName || 'مسئول الموارد البشرية';
    const coordinator = rec.coordinator || 'منسق عام المحافظة';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert(isAr ? 'يرجى السماح بالنوافذ المنبثقة لطباعة المستند الرسمي' : 'Please allow popups to print');
      return;
    }

    const alertHtml = `<div style="margin-top: 30px; margin-bottom: 25px; text-align: center; color: #dc2626; border: 1.5px dashed #dc2626; padding: 12px 18px; border-radius: 12px; background-color: #fff5f5;">
      <div style="font-weight: 900; font-size: 16px; margin-bottom: 6px; display: flex; align-items: center; justify-content: center; gap: 6px;">
        <span style="font-size: 18px;">🛑</span> تنبية
      </div>
      <div style="font-size: 13.5px; font-weight: 700; line-height: 1.6;">
        ${isNotice 
          ? 'يرجى العلم أن تلقي عدد 2 لفت نظر يُعتبر معادلاً للحصول على إنذار واحد , نرجو الالتزام بالإرشادات المحددة لتجنب أي إجراءات قد تؤثر على استمرار مشاركتكم.' 
          : 'نود إعلامكم أنه سيتم إنهاء المشاركة بالكيان بشكل رسمي في حال تلقي ثلاثة إنذارات , نرجو الالتزام بالتوجيهات لضمان استمرار مشاركتكم الفعالة.'}
      </div>
    </div>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>مستند رسمي - ${titleHeading} - ${rec.memberName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Cairo', sans-serif; margin: 0; padding: 25px; background: #ffffff; color: #1e293b; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .container { border: 2px solid #0f172a; border-radius: 18px; padding: 30px; min-height: 88vh; display: flex; flex-direction: column; justify-content: space-between; position: relative; }
        </style>
      </head>
      <body>
        <div class="container">
          <div>
            <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 15px; font-weight: bold; font-size: 13px;">
              <div>
                <div style="font-size: 15px; font-weight: 900; color: #1e3a8a;">جمهورية مصر العربية</div>
                <div>وزارة الشباب والرياضة</div>
                <div style="color: #047857;">الإدارة المركزية لتنمية الشباب</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 17px; font-weight: 900; color: #1e3a8a;">كيان EYE الشبابي</div>
                <div>محافظة ${rec.governorate || 'الغربية'}</div>
              </div>
              <div style="text-align: left;">
                <div>مستند إداري معتمد</div>
                <div style="font-family: monospace;">كود: ${rec.regulationCode || (isNotice ? 'LN-01' : 'WR-01')}</div>
              </div>
            </div>

            <div style="text-align: center; margin-top: 25px; margin-bottom: 25px;">
              <h1 style="font-size: 32px; font-weight: 900; color: #dc2626; text-decoration: underline; text-underline-offset: 8px; margin: 0;">
                ${titleHeading}
              </h1>
            </div>

            <div style="font-size: 16px; font-weight: 700; line-height: 2.1; color: #000; text-align: justify; margin-top: 35px;">
              <p style="margin-bottom: 15px;">
                بعد الاطلاع على اللائحة التنفيذية والقوانين المنظمة للكيان الخاصة بحقوق وواجبات الأعضاء , قررنا نحن مسئولو لجنة الموارد البشرية بمحافظة : <span style="font-weight: 900; text-decoration: underline;">${rec.governorate || 'الغربية'}</span>
              </p>
              
              <p style="margin-bottom: 20px;">
                توجيه ${titleHeading} رقم ( <span style="font-weight: 900;">${noticeNo}</span> ) .
              </p>

              <div style="margin-top: 25px; margin-bottom: 25px; font-size: 17px;">
                <span style="font-weight: 900;">للعضو :</span> <span style="border-bottom: 1px dotted #000; padding: 0 15px; font-weight: 900;">${rec.memberName || '......'}</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                <span style="font-weight: 900;">لجنة :</span> <span style="border-bottom: 1px dotted #000; padding: 0 15px; font-weight: 900;">${rec.committee || '....'}</span>
              </div>

              <p style="margin-bottom: 15px;">
                ${rec.reason && !rec.reason.includes('اجتماع') ? rec.reason : `وذلك لعدم حضور اجتماع يوم ( ${meetingDay} ) , الموافق ( ${meetingDate} ) دون التبليغ بعذر عدم الحضور لمن يهمه الأمر .`}
              </p>
            </div>

            ${alertHtml}
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; padding: 0 20px; font-size: 14px; font-weight: 800; color: #000; border-top: 1.5px solid #cbd5e1; padding-top: 25px;">
              <div style="text-align: center;">
                <div>مسؤول لجنة الموارد البشرية</div>
                <div style="margin-top: 30px; font-size: 16px;">أ. ${hrManager}</div>
              </div>
              <div style="text-align: center;">
                <div>منسق عام المحافظة</div>
                <div style="margin-top: 30px; font-size: 16px;">أ. ${coordinator}</div>
              </div>
            </div>
            <div style="text-align: center; font-size: 12px; font-weight: 900; color: #0284c7; margin-top: 20px;">
              #معا_نحو_مستقبل_افضل
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
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
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-slate-900 dark:text-white text-sm">{record.memberName}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                      record.type === 'lft_nazar' || record.severity === 'Notice'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300'
                        : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200'
                    }`}>
                      {record.type === 'lft_nazar' || record.severity === 'Notice' ? 'لفت نظر رسمي' : record.severity || 'إنذار رسمي'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">{record.regulationCode || 'LN-01'}</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    {record.reason}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {isAr ? 'صادر بواسطة' : 'By'}: {record.issuedByName} • {new Date(record.issuedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => setViewingRecord(record)}
                  className="px-3.5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isAr ? 'معاينة الوثيقة A4' : 'Preview Doc'}</span>
                </button>

                {canManage && (
                  <button
                    onClick={() => handleDeleteRecord(record.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all cursor-pointer"
                    title={isAr ? 'إلغاء الإنذار' : 'Remove record'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* VIEW OFFICIAL A4 DOCUMENT MODAL - TRUE ZERO-SCROLL FULLSCREEN FIT */}
      {viewingRecord && (
        <div className="fixed inset-0 z-[999999] bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-between p-2 sm:p-3 w-screen h-screen overflow-hidden animate-fade-in" style={{ zIndex: 999999 }} dir="rtl">
          {/* Floating Action Controls Bar (Compact) */}
          <div className="shrink-0 z-30 mb-2 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl px-4 py-1.5 flex items-center justify-between gap-3 max-w-4xl w-full text-slate-900 dark:text-white backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="font-black text-xs sm:text-sm">
                {viewingRecord.type === 'lft_nazar' || viewingRecord.severity === 'Notice' ? 'معاينة لفت نظر رسمي 📜' : 'معاينة إنذار رسمي معتمد 🔴'}
              </span>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-bold">
                {viewingRecord.noticeNumber || '01'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const isNotice = viewingRecord.type === 'lft_nazar' || viewingRecord.severity === 'Notice';
                  fillAndDownloadDocxTemplate(isNotice ? 'lft_nazar' : 'inzar', {
                    memberName: viewingRecord.memberName,
                    committeeName: viewingRecord.committee || 'عام',
                    governorate: viewingRecord.governorate || 'الغربية',
                    noticeNumber: viewingRecord.noticeNumber || '01',
                    meetingDay: viewingRecord.meetingDay || 'الاجتماع الدوري',
                    meetingDate: viewingRecord.meetingDate || new Date(viewingRecord.issuedAt).toLocaleDateString('ar-EG'),
                    hrManager: viewingRecord.issuedByName || 'أحمد إبراهيم',
                    coordinator: viewingRecord.coordinator || 'محمود ربيع',
                  });
                }}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">تحميل Word (.docx)</span>
                <span className="sm:hidden">Word</span>
              </button>
              <button
                type="button"
                onClick={() => handlePrintDoc(viewingRecord)}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">طباعة (PDF)</span>
                <span className="sm:hidden">طباعة</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-500 text-slate-700 dark:text-slate-300 hover:text-white transition-all cursor-pointer"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Authentic Document Paper View - FITS 100% OF SCREEN HEIGHT WITHOUT SCROLLING */}
          <div className="flex-1 w-full max-w-4xl max-h-[calc(100vh-60px)] bg-white text-black p-5 sm:p-8 md:p-10 rounded-2xl border-4 border-slate-900 shadow-2xl relative overflow-hidden font-sans select-none flex flex-col justify-between my-auto" dir="rtl" style={{ color: '#000000', backgroundColor: '#ffffff' }}>
            {/* Background Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
              <img src="/eye-logo.png" alt="watermark" className="w-64 h-64 object-contain" />
            </div>

            {/* Document Header - Exact Ministerial Header with Logos */}
            <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2.5 text-xs font-bold relative z-10 text-black shrink-0">
              <div className="flex items-center gap-2 text-right">
                <img src="/ministry-logo.png" alt="وزارة الشباب والرياضة" className="h-10 sm:h-12 object-contain" onError={(e: any) => e.target.style.display = 'none'} />
                <div className="space-y-0.5">
                  <div className="font-black text-black text-xs sm:text-sm leading-tight">جمهورية مصر العربية</div>
                  <div className="text-black font-bold text-[10px] sm:text-[11px] leading-tight">وزارة الشباب والرياضة</div>
                  <div className="text-slate-700 text-[9px] font-bold leading-tight">Ministry of Youth and Sports</div>
                </div>
              </div>

              <div className="text-center space-y-0.5">
                <div className="font-black text-[#0284c7] text-sm sm:text-base md:text-lg">
                  المصريون الشباب – وزارة الشباب والرياضة
                </div>
                <div className="text-slate-700 font-bold text-[11px] sm:text-xs">محافظة {viewingRecord.governorate || 'الغربية'}</div>
              </div>

              <div className="flex items-center justify-end gap-2 text-left">
                <img src="/eye-logo.png" alt="EYE" className="h-10 sm:h-12 object-contain" />
              </div>
            </div>

            {/* Body Content - Scaled to fit perfectly without overflow */}
            <div className="relative z-10 space-y-3 sm:space-y-4 text-right text-black my-auto py-2 sm:py-3 font-sans overflow-hidden">
              <h2 className="text-center font-black text-2xl sm:text-3xl md:text-4xl text-[#dc2626] underline underline-offset-4 sm:underline-offset-8">
                {viewingRecord.type === 'lft_nazar' || viewingRecord.severity === 'Notice' ? 'لفت نظر' : 'إنذار'}
              </h2>

              <p className="font-bold text-xs sm:text-sm md:text-base leading-relaxed text-black pt-1">
                بعد الاطلاع على اللائحة التنفيذية والقوانين المنظمة للكيان الخاصة بحقوق وواجبات الأعضاء , قررنا نحن مسئولو لجنة الموارد البشرية بمحافظة : ( <span className="font-black underline">{viewingRecord.governorate || 'الغربية'}</span> )
              </p>

              <p className="font-black text-xs sm:text-sm md:text-base text-black">
                توجيه {viewingRecord.type === 'lft_nazar' || viewingRecord.severity === 'Notice' ? 'لفت نظر' : 'الإنذار'} رقم ( <span className="font-black text-[#dc2626] font-mono text-base sm:text-xl">{viewingRecord.noticeNumber || '01'}</span> ) .
              </p>

              <div className="flex flex-wrap justify-between font-black text-xs sm:text-sm md:text-base my-2 p-2.5 sm:p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-black">
                <div>للعضو : <span className="text-[#dc2626] font-black px-1.5">{viewingRecord.memberName}</span></div>
                <div>لجنة : <span className="text-[#dc2626] font-black px-1.5">{viewingRecord.committee || 'عام'}</span></div>
              </div>

              <p className="font-bold text-xs sm:text-sm md:text-base leading-relaxed text-black">
                {viewingRecord.reason && !viewingRecord.reason.includes('اجتماع')
                  ? viewingRecord.reason
                  : `وذلك لعدم حضور اجتماع يوم ( ${viewingRecord.meetingDay || 'الاجتماع الدوري'} ) , الموافق ( ${viewingRecord.meetingDate || new Date(viewingRecord.issuedAt).toLocaleDateString('ar-EG')} ) دون التبليغ بعذر عدم الحضور لمن يهمه الأمر .`}
              </p>

              {/* Regulatory Alert Box (Matching Exact TemplatesHub Style) */}
              <div className="border-2 border-dashed border-[#dc2626] bg-[#fff5f5] p-2.5 sm:p-4 rounded-xl text-center text-[#dc2626] space-y-1 sm:space-y-1.5 my-2">
                <div className="font-black flex items-center justify-center gap-1.5 text-xs sm:text-sm">
                  <span className="text-base">🛑</span>
                  <span>تنبيه</span>
                </div>
                <p className="font-bold text-[10px] sm:text-xs md:text-sm leading-relaxed text-[#991b1b]">
                  {viewingRecord.type === 'lft_nazar' || viewingRecord.severity === 'Notice'
                    ? 'يرجى العلم أن تلقي عدد 2 لفت نظر يُعتبر معادلاً للحصول على إنذار واحد , نرجو الالتزام بالإرشادات المحددة لتجنب أي إجراءات قد تؤثر على استمرار مشاركتكم.'
                    : 'نود إعلامكم أنه سيتم إنهاء المشاركة بالكيان بشكل رسمي في حال تلقي ثلاثة إنذارات , نرجو الالتزام بالتوجيهات لضمان استمرار مشاركتكم الفعالة.'}
                </p>
              </div>
            </div>

            {/* Signatures & Footer */}
            <div className="relative z-10 pt-2.5 sm:pt-4 border-t-2 border-slate-300 text-black shrink-0">
              <div className="flex justify-between text-center font-bold text-[11px] sm:text-xs md:text-sm">
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="font-black text-slate-800">مسؤول لجنة الموارد البشرية</div>
                  <div className="font-black text-xs sm:text-sm md:text-base text-slate-900 border-b border-dashed border-slate-400 pb-0.5">
                    أ. {viewingRecord.issuedByName || 'أحمد إبراهيم'}
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <div className="font-black text-slate-800">منسق عام المحافظة</div>
                  <div className="font-black text-xs sm:text-sm md:text-base text-slate-900 border-b border-dashed border-slate-400 pb-0.5">
                    أ. {viewingRecord.coordinator || 'محمود ربيع'}
                  </div>
                </div>
              </div>

              {/* Official Cyan Footer Hashtag */}
              <div className="text-center font-black text-[#0284c7] text-xs sm:text-sm mt-2 sm:mt-3 pt-1.5 border-t border-slate-200">
                #معا_نحو_مستقبل_افضل
              </div>
            </div>
          </div>
        </div>
      )}

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
