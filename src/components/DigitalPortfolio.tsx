import React, { useState } from 'react';
import { UserProfile, IssuedCertificate, MemberEvaluation, getUserRoleTitle } from '../types';
import { db } from '../db/localDb';
import { useLanguage } from '../lib/LanguageContext';
import { 
  Award, 
  CheckCircle2, 
  Share2, 
  Download, 
  Printer, 
  Star, 
  Calendar, 
  User, 
  Briefcase, 
  ShieldCheck, 
  ExternalLink,
  Flame,
  Clock,
  Sparkles,
  QrCode
} from 'lucide-react';
import { downloadCertificate } from '../lib/certificateGenerator';
import { printDedicatedOfficialDocument } from '../lib/dedicatedPrint';

interface DigitalPortfolioProps {
  currentUser: UserProfile;
  targetUserId?: string;
}

export const DigitalPortfolio: React.FC<DigitalPortfolioProps> = ({ currentUser, targetUserId }) => {
  const { language, isRtl, translateCommittee, translateDepartment } = useLanguage();
  const isAr = language === 'ar';

  const user = targetUserId ? (db.getUsers().find(u => u.id === targetUserId) || currentUser) : currentUser;
  const certificates = db.getCertificates().filter(c => c.recipientId === user.id);
  const evaluations = db.getMemberEvaluations().filter(e => e.targetUserId === user.id);
  const submissions = db.getSubmissions().filter(s => s.memberId === user.id && s.status === 'Accepted');

  const [copiedLink, setCopiedLink] = useState(false);
  const [cvTheme, setCvTheme] = useState<'blue' | 'gold' | 'emerald' | 'dark'>('blue');

  const avgScore = evaluations.length
    ? +(evaluations.reduce((acc, curr) => acc + curr.overallRating, 0) / evaluations.length).toFixed(1)
    : (user.rating || 4.8);

  const totalVolunteeringHours = (submissions.length * 5) + (certificates.length * 10) + 20;

  const handleSharePortfolio = () => {
    const portfolioUrl = `${window.location.origin}?cv=${user.membershipCode || user.id}`;
    navigator.clipboard.writeText(portfolioUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const getThemeCardStyle = () => {
    switch (cvTheme) {
      case 'gold':
        return 'border-amber-400/80 bg-slate-950 text-white ring-2 ring-amber-500/30';
      case 'emerald':
        return 'border-emerald-500/80 bg-emerald-950/20 text-white ring-2 ring-emerald-500/30';
      case 'dark':
        return 'border-slate-800 bg-slate-950 text-white ring-1 ring-slate-800';
      default:
        return 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm no-print">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
          <Briefcase className="w-4 h-4 text-eye-brand" />
          <span>{isAr ? 'السيرة الذاتية التفاعلية والتطوعية المعتمدة (Digital Portfolio)' : 'Certified Digital Volunteer Portfolio'}</span>
        </div>

        {/* Theme Switcher Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
          <button
            onClick={() => setCvTheme('blue')}
            className={`px-3 py-1 rounded-xl text-[10px] font-black transition-all ${cvTheme === 'blue' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500'}`}
          >
            🔵 أزرق
          </button>
          <button
            onClick={() => setCvTheme('gold')}
            className={`px-3 py-1 rounded-xl text-[10px] font-black transition-all ${cvTheme === 'gold' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-500'}`}
          >
            🟡 ذهبي
          </button>
          <button
            onClick={() => setCvTheme('emerald')}
            className={`px-3 py-1 rounded-xl text-[10px] font-black transition-all ${cvTheme === 'emerald' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500'}`}
          >
            🟢 زمردي
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSharePortfolio}
            className="px-4 py-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-600 dark:text-blue-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copiedLink ? (isAr ? 'تم النسخ! 📋' : 'Copied!') : (isAr ? 'مشاركة 🔗' : 'Share 🔗')}</span>
          </button>
          <button
            onClick={() => {
              const certsListHtml = certificates.map(c => `
                <tr>
                  <td>${c.title}</td>
                  <td>${c.certType}</td>
                  <td>${c.issuedByName}</td>
                  <td>${new Date(c.issuedAt).toLocaleDateString('ar-EG')}</td>
                </tr>
              `).join('');

              const bodyHtml = `
                <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:16px; border-radius:12px; margin-bottom:20px;">
                  <h2 style="margin:0 0 10px 0; font-size:18px; color:#1b4cd3;">${user.fullName}</h2>
                  <p style="margin:4px 0; font-size:11px; font-weight:700; color:#334155;">
                    <strong>الكود التنظيمي:</strong> ${user.membershipCode || 'EYE-MEMBER'} | 
                    <strong>الدور:</strong> ${user.role} | 
                    <strong>اللجنة:</strong> ${user.committee} (${user.department})
                  </p>
                  <p style="margin:4px 0; font-size:11px; color:#475569;">
                    <strong>تاريخ الانضمام:</strong> ${user.joinedDate || '2024-01-01'} | 
                    <strong>رقم الهاتف:</strong> ${user.phoneNumber || 'غير مدخل'} | 
                    <strong>البريد:</strong> ${user.email}
                  </p>
                  <p style="margin:10px 0 0 0; font-size:11px; line-height:1.6; color:#0f172a;">
                    ${user.bio || 'متطوع متميز بكيان المصريون الشباب بمحافظة الغربية.'}
                  </p>
                </div>

                <div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:20px;">
                  <div style="flex:1; background:#eff6ff; border:1px solid #bfdbfe; padding:12px; border-radius:10px; text-align:center;">
                    <div style="font-size:20px; font-weight:900; color:#1d4ed8;">${totalVolunteeringHours} ساعة</div>
                    <div style="font-size:10px; font-weight:800; color:#1e40af;">ساعات التطوع المعتمدة</div>
                  </div>
                  <div style="flex:1; background:#f0fdf4; border:1px solid #bbf7d0; padding:12px; border-radius:10px; text-align:center;">
                    <div style="font-size:20px; font-weight:900; color:#15803d;">${certificates.length} شهادة</div>
                    <div style="font-size:10px; font-weight:800; color:#166534;">الشهادات الصادرة</div>
                  </div>
                  <div style="flex:1; background:#fffbeb; border:1px solid #fde68a; padding:12px; border-radius:10px; text-align:center;">
                    <div style="font-size:20px; font-weight:900; color:#b45309;">${avgScore} / 5</div>
                    <div style="font-size:10px; font-weight:800; color:#92400e;">التقييم التراكمي الشامل</div>
                  </div>
                </div>

                <h3 style="font-size:14px; font-weight:900; color:#1b4cd3; margin:20px 0 10px 0;">📜 الشهادات والاعتمادات الرسمية المحصلة:</h3>
                <table>
                  <thead>
                    <tr>
                      <th>مسمى الشهادة</th>
                      <th>النوع</th>
                      <th>جهة الاصدار</th>
                      <th>تاريخ الاعتماد</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${certsListHtml || '<tr><td colspan="4" style="text-align:center;">لا توجد شهادات مسجلة بعد.</td></tr>'}
                  </tbody>
                </table>
              `;

              printDedicatedOfficialDocument({
                title: `السيرة الذاتية التفاعلية والتطوعية المعتمدة — ${user.fullName}`,
                docNumber: user.membershipCode || 'EYE-CV-001',
                bodyHtml,
              });
            }}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-xs font-black shadow-md hover:from-amber-600 hover:to-orange-600 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isAr ? 'طباعة المستند الرسمي (PDF)' : 'Print Official Document'}</span>
          </button>
        </div>
      </div>

      {/* Main Official Portfolio Card */}
      <div className={`rounded-3xl p-6 sm:p-8 shadow-xl space-y-8 relative overflow-hidden transition-all duration-300 ${getThemeCardStyle()}`}>
        {/* Top Header Badge */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <img
              src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.fullName)}`}
              alt={user.fullName}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-eye-brand shadow-md"
            />
            <div className="space-y-1 text-start">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{user.fullName}</h1>
                <span title="Verified Member"><ShieldCheck className="w-5 h-5 text-blue-500" /></span>
              </div>
              <p className="text-xs font-bold text-eye-brand">{getUserRoleTitle(user, language)}</p>
              {currentUser.role !== 'Member' && <p className="text-[10px] font-mono text-slate-400 font-bold">Member ID Code: {user.membershipCode || 'EYE-MEMBER-001'}</p>}
            </div>
          </div>

          <div className="flex flex-col items-end text-end space-y-1">
            <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full text-[10px] font-black uppercase">
              • Official EYE Accreditation •
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Verified: {new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700 text-center space-y-1">
            <Clock className="w-5 h-5 text-indigo-500 mx-auto" />
            <span className="text-xl font-black text-slate-900 dark:text-white font-mono">{totalVolunteeringHours}h</span>
            <span className="text-[10px] font-bold text-slate-500 block">{isAr ? 'ساعات التطوع المعتمدة' : 'Volunteering Hours'}</span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700 text-center space-y-1">
            <Award className="w-5 h-5 text-amber-500 mx-auto" />
            <span className="text-xl font-black text-slate-900 dark:text-white font-mono">{certificates.length}</span>
            <span className="text-[10px] font-bold text-slate-500 block">{isAr ? 'الشهادات والأوسمة' : 'Certificates Earned'}</span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700 text-center space-y-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
            <span className="text-xl font-black text-slate-900 dark:text-white font-mono">{submissions.length}</span>
            <span className="text-[10px] font-bold text-slate-500 block">{isAr ? 'التكليفات المنجزة' : 'Tasks Completed'}</span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700 text-center space-y-1">
            <Star className="w-5 h-5 text-amber-400 mx-auto fill-amber-400" />
            <span className="text-xl font-black text-slate-900 dark:text-white font-mono">{avgScore} / 5</span>
            <span className="text-[10px] font-bold text-slate-500 block">{isAr ? 'معدل التقييم القيادي' : 'Performance Rating'}</span>
          </div>
        </div>

        {/* Bio / Summary */}
        <div className="space-y-2 text-start">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">{isAr ? 'نبذة عن العضو والتفوق التنظيمي' : 'Member Bio & Contributions'}</h3>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 font-semibold">
            {user.bio || (isAr ? 'عضو فعال بكيان المصريون الشباب EYE، متميز بالالتزام العالي والدقة في إنجاز المهام والتواصل الإيجابي مع أعضاء الفريق.' : 'Active member in the Egyptian Youth Entity (EYE) with high dedication and leadership spirit.')}
          </p>
        </div>

        {/* Certified Certificates Grid */}
        <div className="space-y-3 text-start">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>{isAr ? 'الشهادات والأوسمة الصادرة والمسجلة' : 'Earned Certificates & Awards'}</span>
            <span className="text-[10px] text-amber-600 font-bold">{certificates.length} {isAr ? 'شهادة معتمدة' : 'Certificates'}</span>
          </h3>

          {certificates.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">{isAr ? 'لا توجد شهادات صادرة بعد.' : 'No certificates issued yet.'}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {certificates.map(cert => {
                const isPending = cert.status === 'pending';
                return (
                  <div key={cert.id} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Award className="w-8 h-8 text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{cert.title}</p>
                          {isPending && (
                            <span className="text-[9px] font-black text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-full border border-amber-200">
                              ⏳ قيد المراجعة
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-slate-400 font-mono">{new Date(cert.issuedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</p>
                      </div>
                    </div>
                    <button
                      disabled={isPending}
                      onClick={() => {
                        if (isPending) {
                          alert(isAr ? '⚠️ هذه الشهادة قيد مراجعة وموافقة الإدارة ولا يمكن تحميلها الآن.' : 'Pending approval.');
                          return;
                        }
                        downloadCertificate({
                          memberName: cert.recipientName,
                          certTitle: cert.title,
                          certType: cert.certType,
                          body: cert.body,
                          issuedByName: cert.issuedByName,
                          committee: cert.committee,
                          date: new Date(cert.issuedAt).toLocaleDateString('ar-EG'),
                        });
                      }}
                      className={`p-2 rounded-xl text-xs font-bold shrink-0 transition-all ${isPending ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-600 dark:text-blue-400 cursor-pointer'}`}
                      title={isPending ? (isAr ? 'قيد موافقة الإدارة' : 'Pending Approval') : (isAr ? 'تحميل الشهادة' : 'Download')}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
