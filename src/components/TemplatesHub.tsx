import React, { useState, useEffect, useCallback } from 'react';
import { db, saveProfileOverride } from '../db/localDb';
import { UserProfile, DisciplinaryRecord } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { fillAndDownloadDocxTemplate } from '../lib/docxFiller';
import { 
  FolderDown, 
  Download, 
  FileText, 
  Presentation, 
  Image, 
  Search, 
  Sparkles, 
  CheckCircle2,
  FileCheck,
  Plus,
  Trash2,
  X,
  Printer,
  Eye,
  AlertTriangle,
  ShieldAlert,
  Building,
  UserCheck,
  Calendar,
  Layers,
  HelpCircle,
  FileEdit,
  FileSpreadsheet,
  Send
} from 'lucide-react';

interface TemplatesHubProps {
  currentUser: UserProfile;
}

interface TemplateItem {
  id: string;
  title: string;
  titleEn: string;
  category: 'reports' | 'presentations' | 'branding' | 'letters' | string;
  fileSize: string;
  format: string;
  description: string;
  isOfficialForm?: boolean;
  type?: 'inzar' | 'lft_nazar' | 'bg_report';
}

export const TemplatesHub: React.FC<TemplatesHubProps> = ({ currentUser }) => {
  const { isRtl, language } = useLanguage();
  const isAr = language === 'ar';
  const isAdminOrLeader = ['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator', 'Leader'].includes(currentUser.role);

  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Admin Create Template modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [category, setCategory] = useState('reports');
  const [format, setFormat] = useState('DOCX / PDF');
  const [fileSize, setFileSize] = useState('1.5 MB');
  const [description, setDescription] = useState('');

  // Interactive Official Form Modal state
  const [selectedOfficialTemplate, setSelectedOfficialTemplate] = useState<TemplateItem | null>(null);

  // ─── Form field states (for interactive form editor) ─────────────────────
  const [formGovernorate, setFormGovernorate] = useState('الغربية');
  const [formNoticeNumber, setFormNoticeNumber] = useState('1');
  const [formMemberName, setFormMemberName] = useState('');
  const [formCommitteeName, setFormCommitteeName] = useState('الموارد البشرية (HR)');
  const [formMeetingDay, setFormMeetingDay] = useState('الأحد');
  const [formMeetingDate, setFormMeetingDate] = useState('');
  const [formHrManager, setFormHrManager] = useState('أحمد إبراهيم');
  const [formCoordinator, setFormCoordinator] = useState('محمود ربيع');
  const [formReportTitle, setFormReportTitle] = useState('');
  const [formReportBody, setFormReportBody] = useState('');

  // Disciplinary records
  const [disciplinaryRecords, setDisciplinaryRecords] = useState<DisciplinaryRecord[]>([]);

  // Escalation auto-trigger dialog
  const [escalationMember, setEscalationMember] = useState<{ name: string; userId: string } | null>(null);

  // ─── Data loading ────────────────────────────────────────────────────────
  const loadData = useCallback(() => {
    setTemplates(db.getTemplates());
    setAllUsers(db.getUsers());
    setDisciplinaryRecords(db.getDisciplinaryRecords?.() || []);
  }, []);

  useEffect(() => {
    loadData();
    const unsub = db.onChange(loadData);
    return () => unsub();
  }, [loadData]);

  // ─── Filtered templates ──────────────────────────────────────────────────
  const filtered = templates.filter(t => {
    const matchCat = activeCategory === 'all' || t.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || t.title.toLowerCase().includes(q) || t.titleEn.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  // ─── Date helper ─────────────────────────────────────────────────────────
  const formatDateForDoc = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const handleOpenOfficialModal = (tmpl: TemplateItem) => {
    setSelectedOfficialTemplate(tmpl);
    if (!formHrManager) setFormHrManager('أحمد إبراهيم');
    if (!formCoordinator) setFormCoordinator('محمود ربيع');
    // Always ensure a member is selected (pick first if none)
    setFormMemberName(prev => prev || (allUsers.length > 0 ? allUsers[0].fullName : ''));
  };

  // Direct download of official downloaded Google Drive files (.docx) - EXACT 100% UNMODIFIED FILE
  const handleDownloadDirectDriveDoc = (type: string) => {
    let fileUrl = '/templates/report_template.docx';
    let fileName = 'تمبليت_التقرير_الرسمي_EYE.docx';

    if (type === 'inzar' || type === 'tmpl-inzar') {
      fileUrl = '/templates/inzar.docx';
      fileName = 'إنذار.docx';
    } else if (type === 'lft_nazar' || type === 'tmpl-lft-nazar') {
      fileUrl = '/templates/lft_nazar.docx';
      fileName = 'لفت نظر.docx';
    }

    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadOrOpen = (tmpl: TemplateItem) => {
    const type = tmpl.type || (tmpl.id === 'tmpl-inzar' ? 'inzar' : tmpl.id === 'tmpl-lft-nazar' ? 'lft_nazar' : 'bg_report');
    handleDownloadDirectDriveDoc(type);
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    db.createTemplate(title, titleEn || title, category, fileSize, format, description, currentUser);
    setShowCreateModal(false);
    setTitle('');
    setTitleEn('');
    setDescription('');
    alert(isAr ? 'تمت إضافة القالب الجاهز بنجاح 🎉' : 'Template added successfully 🎉');
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm(isAr ? 'هل أنت تأكد من مسح هذا القالب؟' : 'Delete this template?')) {
      db.deleteTemplate(id, currentUser);
    }
  };

  // Fill and download exact binary .docx template with dynamic data
  const handleDownloadWordDoc = (type: 'inzar' | 'lft_nazar' | 'bg_report' | string, customTitle?: string) => {
    // Format date from YYYY-MM-DD → DD/MM/YYYY for Arabic document compatibility
    const formattedDate = formatDateForDoc(formMeetingDate);

    fillAndDownloadDocxTemplate(type, {
      governorate: formGovernorate,
      noticeNumber: formNoticeNumber,
      memberName: formMemberName,
      committeeName: formCommitteeName,
      meetingDay: formMeetingDay,
      meetingDate: formattedDate,
      hrManager: formHrManager,
      coordinator: formCoordinator,
      reportTitle: formReportTitle,
      reportBody: formReportBody,
    });

    // ─── Save disciplinary record (lft_nazar or inzar only) ──────────────────
    const isLft = type === 'lft_nazar' || type === 'tmpl-lft-nazar';
    const isInzar = type === 'inzar' || type === 'tmpl-inzar';

    if ((isLft || isInzar) && formMemberName) {
      const targetUser = allUsers.find(u => u.fullName === formMemberName);
      db.addDisciplinaryRecord({
        type: isLft ? 'lft_nazar' : 'inzar',
        memberName: formMemberName,
        memberId: targetUser?.id,
        committee: formCommitteeName,
        governorate: formGovernorate,
        noticeNumber: formNoticeNumber,
        meetingDay: formMeetingDay,
        meetingDate: formattedDate,
        issuedBy: formHrManager,
        coordinator: formCoordinator,
      });
    }

    // ─── Escalation tracking ───────────────────────────────────────────────
    const targetUser = allUsers.find(u => u.fullName === formMemberName);
    if (targetUser && currentUser) {
      if (isLft) {
        const currentCount = targetUser.lftNazarCount ?? 0;
        const newCount = currentCount + 1;
        db.updateUserFullDetails(targetUser.id, { lftNazarCount: newCount }, currentUser);
        loadData();
        if (newCount >= 2) {
          setTimeout(() => setEscalationMember({ name: formMemberName, userId: targetUser.id }), 600);
        }
      } else if (isInzar) {
        const newInzarCount = (targetUser.inzarCount ?? 0) + 1;
        db.updateUserFullDetails(targetUser.id, { inzarCount: newInzarCount, lftNazarCount: 0 }, currentUser);
        loadData();
      }
    }
  };

  // Print official document with 100% exact design matching PDF uploads
  const handlePrintDocument = (type: 'inzar' | 'lft_nazar' | 'bg_report') => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert(isAr ? 'يرجى السماح بالنوافذ المنبثقة لطباعة المستند الرسمي' : 'Please allow popups to print the official document');
      return;
    }

    const titleHeading = type === 'inzar' ? 'إنذار' : type === 'lft_nazar' ? 'لفت نظر' : formReportTitle;
    const isNotice = type === 'inzar' || type === 'lft_nazar';

    const alertHtml = type === 'inzar' 
      ? `<div style="margin-top: 30px; margin-bottom: 25px; text-align: center; color: #dc2626; border: 1.5px dashed #dc2626; padding: 12px 18px; border-radius: 12px; background-color: #fff5f5;">
          <div style="font-weight: 900; font-size: 16px; margin-bottom: 6px; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span style="font-size: 18px;">🛑</span> تنبية
          </div>
          <div style="font-size: 13.5px; font-weight: 700; line-height: 1.6;">
            نود إعلامكم أنه سيتم إنهاء المشاركة بالكيان بشكل رسمي في حال تلقي ثلاثة إنذارات , نرجو الالتزام بالتوجيهات لضمان استمرار مشاركتكم الفعالة.
          </div>
        </div>`
      : type === 'lft_nazar'
      ? `<div style="margin-top: 30px; margin-bottom: 25px; text-align: center; color: #dc2626; border: 1.5px dashed #dc2626; padding: 12px 18px; border-radius: 12px; background-color: #fff5f5;">
          <div style="font-weight: 900; font-size: 16px; margin-bottom: 6px; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span style="font-size: 18px;">🛑</span> تنبية
          </div>
          <div style="font-size: 13.5px; font-weight: 700; line-height: 1.6;">
            يرجى العلم أن تلقي عدد 2 لفت نظر يُعتبر معادلاً للحصول على إنذار واحد , نرجو الالتزام بالإرشادات المحددة لتجنب أي إجراءات قد تؤثر على استمرار مشاركتكم.
          </div>
        </div>`
      : '';

    const bodyHtml = isNotice ? `
      <div style="text-align: center; margin-top: 20px; margin-bottom: 25px;">
        <h1 style="font-size: 32px; font-weight: 900; color: #dc2626; text-decoration: underline; text-underline-offset: 8px; margin: 0;">
          ${titleHeading}
        </h1>
      </div>

      <div style="font-size: 16px; font-weight: 700; line-height: 2.1; color: #000; text-align: justify; margin-top: 35px;">
        <p style="margin-bottom: 15px;">
          بعد الاطلاع على اللائحة التنفيذية والقوانين المنظمة للكيان الخاصة بحقوق ووجبات الأعضاء , قررنا نحن مسئولى لجنة الموارد البشرية بمحافظة : <span style="font-weight: 900; text-decoration: underline;">${formGovernorate}</span>
        </p>
        
        <p style="margin-bottom: 20px;">
          توجية ${type === 'inzar' ? 'الإنذار' : 'لفت نظر'} رقم ( <span style="font-weight: 900;">${formNoticeNumber}</span> ) .
        </p>

        <div style="margin-top: 25px; margin-bottom: 25px; font-size: 17px;">
          <span style="font-weight: 900;">للعضو :</span> <span style="border-bottom: 1px dotted #000; padding: 0 15px;">${formMemberName || '......'}</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          <span style="font-weight: 900;">لجنة :</span> <span style="border-bottom: 1px dotted #000; padding: 0 15px;">${formCommitteeName || '....'}</span>
        </div>

        <p style="margin-bottom: 15px;">
          وذلك لعدم حضور اجتماع يوم ( <span style="font-weight: 900;">${formMeetingDay}</span> ) , الموافق ( <span style="font-weight: 900;">${formMeetingDate}</span> ) دون التبليغ بعذر عدم الحضور لمن يهمه الامر .
        </p>
      </div>

      ${alertHtml}

      <div style="margin-top: 65px; display: flex; justify-content: space-between; padding: 0 15px; font-size: 13px; font-weight: 800; color: #000;">
        <div style="text-align: center;">
          <div>مسؤول لجنة الموارد البشرية</div>
          <div style="margin-top: 30px; font-size: 15px;">أ. ${formHrManager || 'أحمد إبراهيم'}</div>
        </div>
        <div style="text-align: center;">
          <div>منسق المحافظة</div>
          <div style="margin-top: 30px; font-size: 15px;">أ. ${formCoordinator || 'محمود ربيع'}</div>
        </div>
      </div>
    ` : `
      <div style="text-align: center; margin-top: 20px; margin-bottom: 25px;">
        <h1 style="font-size: 24px; font-weight: 900; color: #0f172a; margin: 0; border-bottom: 2px solid #0f172a; display: inline-block; padding-bottom: 6px;">
          ${formReportTitle}
        </h1>
      </div>

      <div style="font-size: 15px; font-weight: 600; line-height: 2; color: #1e293b; text-align: justify; margin-top: 30px; white-space: pre-wrap;">
        ${formReportBody}
      </div>

      <div style="margin-top: 80px; display: flex; justify-content: space-between; padding: 0 15px; font-size: 13px; font-weight: 800; color: #000;">
        <div style="text-align: center;">
          <div>مسؤول لجنة الموارد البشرية</div>
          <div style="margin-top: 30px; font-size: 15px;">أ. ${formHrManager || 'أحمد إبراهيم'}</div>
        </div>
        <div style="text-align: center;">
          <div>منسق المحافظة</div>
          <div style="margin-top: 30px; font-size: 15px;">أ. ${formCoordinator || 'محمود ربيع'}</div>
        </div>
      </div>
    `;

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>${titleHeading} - كيان المصريون الشباب</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
          
          @page {
            size: A4 portrait;
            margin: 0;
          }
          
          body {
            font-family: 'Cairo', sans-serif;
            margin: 0;
            padding: 0;
            background-color: #fff;
            color: #000;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .page-container {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm 20mm;
            box-sizing: border-box;
            position: relative;
            margin: 0 auto;
            border: 2px solid #000;
            background-color: #fff;
          }

          /* Header Styling matching exact uploaded PDFs */
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #000;
            padding-bottom: 12px;
            margin-bottom: 30px;
          }

          .header-right {
            text-align: right;
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .header-right img {
            height: 55px;
            object-contain: contain;
          }

          .header-right-text {
            font-size: 11px;
            font-weight: 800;
            line-height: 1.3;
            color: #000;
          }

          .header-center {
            text-align: center;
            font-size: 20px;
            font-weight: 900;
            color: #0284c7;
          }

          .header-left {
            text-align: left;
            display: flex;
            align-items: center;
            justify-content: flex-end;
          }

          .header-left img {
            height: 55px;
            object-contain: contain;
          }

          /* Central Background Watermark */
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 380px;
            height: 380px;
            opacity: 0.12;
            pointer-events: none;
            z-index: 0;
          }

          .content-wrapper {
            position: relative;
            z-index: 10;
          }

          /* Footer Hashtag */
          .footer-hashtag {
            position: absolute;
            bottom: 15mm;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 16px;
            font-weight: 900;
            color: #0284c7;
            letter-spacing: 0.5px;
          }

          @media print {
            body { background: white; }
            .page-container { border: 2px solid #000 !important; box-shadow: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="page-container">
          <!-- Top Header -->
          <div class="header">
            <div class="header-right">
              <img src="/ministry-logo.png" alt="وزارة الشباب والرياضة" onerror="this.style.display='none'">
              <div class="header-right-text">
                <div>جمهورية مصر العربية</div>
                <div>وزارة الشباب والرياضة</div>
                <div style="font-size: 9px; font-weight: 700;">Ministry of Youth and Sports</div>
              </div>
            </div>

            <div class="header-center">
              المصريون الشباب – وزارة الشباب والرياضة
            </div>

            <div class="header-left">
              <img src="/eye-logo-transparent.png" alt="EYE Emblem" onerror="this.style.display='none'">
            </div>
          </div>

          <!-- Background Watermark -->
          <img src="/eye-logo-transparent.png" class="watermark" alt="EYE Watermark" onerror="this.style.display='none'">

          <!-- Content -->
          <div class="content-wrapper">
            ${bodyHtml}
          </div>

          <!-- Bottom Footer Hashtag -->
          <div class="footer-hashtag">
            ${isNotice ? '#معا_نحو_مستقبل_افضل' : '# معا – لأجل – مستقبل - أفضل'}
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-widest">
            <FolderDown className="w-4 h-4 text-teal-400" />
            <span>{isAr ? 'مكتبة النماذج والأصول الرسمية' : 'Official Templates & Brand Assets'}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black">
            {isAr ? 'مكتبة القوالب والنماذج الجاهزة 🌐' : 'Templates & Resources Hub 🌐'}
          </h1>
          <p className="text-xs md:text-sm text-slate-300 font-medium max-w-2xl">
            {isAr ? 'تنزيل ملفات Word (.docx) الأصلية المرفوعة من قوقل درايف بدون أي تعديلات، أو التعبئة التفاعلية المباشرة.' : 'Download original unmodified Word (.docx) templates from Google Drive or use the interactive builder.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          {/* Search */}
          <div className="relative w-full md:w-60">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'ابحث في القوالب...' : 'Search templates...'}
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-400 font-bold focus:outline-none focus:border-teal-500"
            />
            <Search className="absolute end-3.5 top-3 w-4 h-4 text-slate-400" />
          </div>

          {isAdminOrLeader && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-teal-500/20 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'إضافة قالب جديد' : 'New Template'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Featured Banner for Official Forms */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-black text-slate-900 dark:text-white">
              {isAr ? 'النماذج والتنبيهات الإدارية الرسمية المعتمَدة (ملفات قوقل درايف) 📜' : 'Official Approved HR Forms & Governance Documents 📜'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
              {isAr ? 'تنزيل ملفات Word (.docx) الأصلية المرفوعة من قوقل درايف بدون أي تعديلات أو تغيرات نهائياً.' : 'Download original Google Drive (.docx) template files with zero modifications.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => handleDownloadDirectDriveDoc('inzar')}
            className="flex-1 md:flex-none px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-rose-500/20 flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>{isAr ? 'تنزيل إنذار Word الأصلي' : 'Download Original Warning'}</span>
          </button>

          <button
            onClick={() => handleDownloadDirectDriveDoc('lft_nazar')}
            className="flex-1 md:flex-none px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>{isAr ? 'تنزيل لفت نظر Word الأصلي' : 'Download Original Caution'}</span>
          </button>
        </div>
      </div>

      {/* ─── Disciplinary Records Panel ─── */}
      {isAdminOrLeader && disciplinaryRecords.length > 0 && (() => {
        const totalLft = disciplinaryRecords.filter(r => r.type === 'lft_nazar').length;
        const totalInzar = disciplinaryRecords.filter(r => r.type === 'inzar').length;
        return (
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-3xl p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/50 rounded-2xl flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-rose-700 dark:text-rose-300">سجل التأديب والإجراءات الرسمية</h3>
                  <p className="text-xs text-rose-500 dark:text-rose-400 font-medium">
                    {disciplinaryRecords.length} إجراء مسجَّل — محدَّث تلقائياً عند كل إصدار
                  </p>
                </div>
              </div>
              {/* Totals */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-black border border-amber-200 dark:border-amber-800">
                  ⚠️ {totalLft} لفت نظر
                </span>
                <span className="px-3 py-1.5 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-black border border-rose-200 dark:border-rose-800">
                  🚨 {totalInzar} إنذار
                </span>
              </div>
            </div>

            {/* Records Table */}
            <div className="overflow-x-auto rounded-2xl border border-rose-200 dark:border-rose-800/50">
              <table className="w-full text-xs" dir="rtl">
                <thead>
                  <tr className="bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                    <th className="px-3 py-2.5 text-right font-black">#</th>
                    <th className="px-3 py-2.5 text-right font-black">النوع</th>
                    <th className="px-3 py-2.5 text-right font-black">اسم العضو</th>
                    <th className="px-3 py-2.5 text-right font-black">اللجنة</th>
                    <th className="px-3 py-2.5 text-right font-black">يوم الاجتماع</th>
                    <th className="px-3 py-2.5 text-right font-black">تاريخ الاجتماع</th>
                    <th className="px-3 py-2.5 text-right font-black">رقم المعاملة</th>
                    <th className="px-3 py-2.5 text-right font-black">تاريخ الإصدار</th>
                    <th className="px-3 py-2.5 text-right font-black">المُصدِر</th>
                    <th className="px-3 py-2.5 text-center font-black">حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {disciplinaryRecords.map((rec, idx) => {
                    const issuedDate = new Date(rec.issuedAt);
                    const dateStr = `${issuedDate.getDate().toString().padStart(2,'0')}/${(issuedDate.getMonth()+1).toString().padStart(2,'0')}/${issuedDate.getFullYear()}`;
                    const timeStr = `${issuedDate.getHours().toString().padStart(2,'0')}:${issuedDate.getMinutes().toString().padStart(2,'0')}`;
                    return (
                      <tr
                        key={rec.id}
                        className={`border-t border-rose-100 dark:border-rose-900/30 ${
                          rec.type === 'inzar'
                            ? 'bg-rose-50/60 dark:bg-rose-950/20'
                            : 'bg-white dark:bg-slate-900/50'
                        } hover:bg-rose-100/40 dark:hover:bg-rose-900/20 transition-colors`}
                      >
                        <td className="px-3 py-2.5 text-slate-400 font-bold">{disciplinaryRecords.length - idx}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-lg font-black ${
                            rec.type === 'inzar'
                              ? 'bg-rose-500 text-white'
                              : 'bg-amber-400 text-white'
                          }`}>
                            {rec.type === 'inzar' ? '🚨 إنذار' : '⚠️ لفت نظر'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-black text-slate-800 dark:text-white whitespace-nowrap">{rec.memberName}</td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{rec.committee}</td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{rec.meetingDay}</td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap font-mono">{rec.meetingDate}</td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 text-center font-bold">{rec.noticeNumber}</td>
                        <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-[10px]">
                          <div>{dateStr}</div>
                          <div className="text-[9px] opacity-70">{timeStr}</div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap text-[10px]">{rec.issuedBy}</td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => {
                              if (confirm('هل تريد حذف هذا السجل؟')) {
                                db.deleteDisciplinaryRecord(rec.id);
                              }
                            }}
                            className="w-6 h-6 bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-slate-400 hover:text-rose-500 rounded-lg flex items-center justify-center transition-colors mx-auto"
                            title="حذف السجل"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'all', label: isAr ? 'جميع القوالب' : 'All Templates' },
          { id: 'reports', label: isAr ? 'تقارير' : 'Reports' },
          { id: 'letters', label: isAr ? 'خطابات ونماذج HR' : 'HR Forms & Letters' },
          { id: 'presentations', label: isAr ? 'عروض تقديمية' : 'Presentations' },
          { id: 'branding', label: isAr ? 'هوية وبصريات' : 'Branding Assets' },
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
              activeCategory === cat.id
                ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(tmpl => {
          const isOfficial = tmpl.isOfficialForm || ['tmpl-bg', 'tmpl-inzar', 'tmpl-lft-nazar'].includes(tmpl.id);
          const type = tmpl.type || (tmpl.id === 'tmpl-inzar' ? 'inzar' : tmpl.id === 'tmpl-lft-nazar' ? 'lft_nazar' : 'bg_report');

          return (
            <div
              key={tmpl.id}
              className={`bg-white dark:bg-slate-900 rounded-3xl border ${
                isOfficial ? 'border-amber-400/40 dark:border-amber-500/40 ring-1 ring-amber-500/20' : 'border-slate-200 dark:border-slate-800'
              } p-6 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden`}
            >
              {isOfficial && (
                <div className="absolute -end-12 top-4 bg-amber-500 text-slate-950 font-black text-[9px] uppercase px-12 py-0.5 rotate-45 shadow-sm">
                  {isAr ? 'رسمي معتمد' : 'Official'}
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                    isOfficial 
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400' 
                      : 'bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400'
                  }`}>
                    {tmpl.format}
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">{tmpl.fileSize}</span>
                    {isAdminOrLeader && !isOfficial && (
                      <button
                        onClick={() => handleDeleteTemplate(tmpl.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title={isAr ? 'حذف القالب' : 'Delete Template'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug group-hover:text-teal-600 transition-colors">
                  {isAr ? tmpl.title : tmpl.titleEn}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  {tmpl.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                {/* Delivery count badge */}
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                  <span>{isAr ? 'إجمالي الإرسال والتحميل:' : 'Dispatched / Downloaded:'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 font-mono font-black">
                    {db.getTemplateDeliveries().filter(d => d.templateId === tmpl.id).length} {isAr ? 'مرة' : 'times'}
                  </span>
                </div>

                {/* DIRECT DRIVE DOCX DOWNLOAD BUTTON - PRIMARY */}
                <button
                  onClick={() => handleDownloadDirectDriveDoc(type)}
                  className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-teal-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span>{isAr ? 'تنزيل ملف قوقل درايف الأصلي (.docx) 💾' : 'Download Original Google Drive File (.docx)'}</span>
                </button>

                {/* DISPATCH DIRECTLY TO MEMBER BUTTON */}
                {isOfficial && (
                  <button
                    onClick={() => handleOpenOfficialModal(tmpl)}
                    className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تعبئة وتحديث مخصص 📜' : 'Interactive Fill & PDF'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* INTERACTIVE OFFICIAL TEMPLATE MODAL */}
      {selectedOfficialTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] flex flex-col my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-500">
                  <FileEdit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {selectedOfficialTemplate.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {isAr ? 'منصة التعديل والتعبئة التفاعلية وتنزيل ملفات Word (.docx) أو استخراج PDF' : 'Interactive builder for Word (.docx) downloads & PDF printing'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedOfficialTemplate(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Content Grid: Form Controls Left, Live Document Preview Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto pr-1">
              {/* Form Controls Column (5 cols) */}
              <div className="lg:col-span-5 space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2 text-xs border-b border-slate-200 dark:border-slate-700 pb-2">
                  <Layers className="w-4 h-4 text-teal-500" />
                  <span>{isAr ? 'بيانات وحقول النموذج' : 'Form Fields & Context'}</span>
                </h4>

                {/* Notice specific fields */}
                {(selectedOfficialTemplate.type === 'inzar' || selectedOfficialTemplate.type === 'lft_nazar' || selectedOfficialTemplate.id === 'tmpl-inzar' || selectedOfficialTemplate.id === 'tmpl-lft-nazar') && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'المحافظة' : 'Governorate'}</label>
                        <input
                          value={formGovernorate}
                          onChange={e => setFormGovernorate(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-bold"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'رقم المعاملة' : 'Serial No.'}</label>
                        <input
                          value={formNoticeNumber}
                          onChange={e => setFormNoticeNumber(e.target.value)}
                          placeholder="1"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'اسم العضو المخاطَب *' : 'Member Name *'}</label>
                      <div className="space-y-2">
                        <select
                          onChange={e => setFormMemberName(e.target.value)}
                          value={formMemberName}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-bold text-xs"
                        >
                          <option value="">-- {isAr ? 'اختر عضواً من الكيان' : 'Select Member'} --</option>
                          {allUsers.map(u => (
                            <option key={u.id} value={u.fullName}>
                              {u.fullName} ({u.department || u.role})
                            </option>
                          ))}
                        </select>
                        <input
                          value={formMemberName}
                          onChange={e => setFormMemberName(e.target.value)}
                          placeholder={isAr ? 'أو اكتب الاسم يدويًا...' : 'Or type manually...'}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'اللجنة التابع لها' : 'Committee'}</label>
                        <select
                          value={formCommitteeName}
                          onChange={e => setFormCommitteeName(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-bold"
                        >
                          <option value="الموارد البشرية (HR)">الموارد البشرية (HR)</option>
                          <option value="العلاقات العامة (PR)">العلاقات العامة (PR)</option>
                          <option value="السوشيال ميديا (SM)">السوشيال ميديا (SM)</option>
                          <option value="التنظيم (OR)">التنظيم (OR)</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'يوم الاجتماع' : 'Meeting Day'}</label>
                        <select
                          value={formMeetingDay}
                          onChange={e => setFormMeetingDay(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-bold"
                        >
                          <option value="الأحد">الأحد</option>
                          <option value="الاثنين">الاثنين</option>
                          <option value="الثلاثاء">الثلاثاء</option>
                          <option value="الأربعاء">الأربعاء</option>
                          <option value="الخميس">الخميس</option>
                          <option value="الجمعة">الجمعة</option>
                          <option value="السبت">السبت</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'تاريخ الاجتماع' : 'Meeting Date'}</label>
                      <input
                        type="date"
                        value={formMeetingDate}
                        onChange={e => setFormMeetingDate(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-bold"
                      />
                    </div>
                  </>
                )}

                {/* Background Report specific fields */}
                {(selectedOfficialTemplate.type === 'bg_report' || selectedOfficialTemplate.id === 'tmpl-bg') && (
                  <>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'عنوان التقرير / الموضوع' : 'Report Title'}</label>
                      <input
                        value={formReportTitle}
                        onChange={e => setFormReportTitle(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-bold"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'محتوى التقرير' : 'Report Body'}</label>
                      <textarea
                        rows={6}
                        value={formReportBody}
                        onChange={e => setFormReportBody(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-medium text-xs leading-relaxed"
                      />
                    </div>
                  </>
                )}

                {/* Common Officer Signatures */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="font-bold text-slate-900 dark:text-white">{isAr ? 'توقيعات الاعتماد والمسئولية:' : 'Signatures:'}</div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'مسئول لجنة الموارد البشرية / المُعد' : 'HR Officer Name'}</label>
                    <input
                      value={formHrManager}
                      onChange={e => setFormHrManager(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'منسق المحافظة' : 'Governorate Coordinator'}</label>
                    <input
                      value={formCoordinator}
                      onChange={e => setFormCoordinator(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-bold"
                    />
                  </div>
                </div>

                <div className="pt-3 space-y-2">
                  {/* SEND TO MEMBER BUTTON (INSIDE EDITOR FORM) */}
                  {(selectedOfficialTemplate.type === 'inzar' || selectedOfficialTemplate.id === 'tmpl-inzar' || selectedOfficialTemplate.type === 'lft_nazar' || selectedOfficialTemplate.id === 'tmpl-lft-nazar') && (
                    <button
                      onClick={() => {
                        if (!formMemberName || !formMeetingDate || !formNoticeNumber) {
                          alert(isAr ? 'يرجى إكمال كافة بيانات المستند (اسم العضو، تاريخ الاجتماع، ورقم المستند) قبل الإرسال' : 'Please complete all document fields before sending.');
                          return;
                        }
                        const targetUser = allUsers.find(u => 
                          u.fullName.trim().toLowerCase() === formMemberName.trim().toLowerCase() ||
                          u.id === formMemberName
                        );
                        const isNotice = selectedOfficialTemplate.type === 'lft_nazar' || selectedOfficialTemplate.id === 'tmpl-lft-nazar';
                        const docTitle = isNotice ? 'لفت نظر رسمي ⚠️' : 'إنذار رسمي 🔴';
                        const [y, m, d] = (formMeetingDate || '').split('-');
                        const formattedDate = (y && m && d) ? `${d}/${m}/${y}` : formMeetingDate;

                        if (targetUser) {
                          if (isNotice) {
                            const newLft = (targetUser.lftNazarCount || 0) + 1;
                            db.updateUserFullDetails(targetUser.id, { lftNazarCount: newLft }, currentUser);
                            if (newLft >= 2) {
                              setTimeout(() => setEscalationMember({ name: formMemberName, userId: targetUser.id }), 600);
                            }
                          } else {
                            const newInzar = (targetUser.inzarCount || 0) + 1;
                            db.updateUserFullDetails(targetUser.id, { inzarCount: newInzar, lftNazarCount: 0 }, currentUser);
                          }
                        }

                        db.addDisciplinaryRecord({
                          type: isNotice ? 'lft_nazar' : 'inzar',
                          memberName: targetUser?.fullName || formMemberName,
                          memberId: targetUser?.id,
                          committee: formCommitteeName || targetUser?.committee || 'General',
                          governorate: formGovernorate || targetUser?.governorate || 'الغربية',
                          noticeNumber: formNoticeNumber,
                          meetingDay: formMeetingDay,
                          meetingDate: formattedDate,
                          issuedBy: currentUser.id,
                          issuedByName: formHrManager || currentUser.fullName,
                          coordinator: formCoordinator,
                          reason: `بخصوص اجتماع يوم ${formMeetingDay} الموافق ${formattedDate}`,
                          severity: isNotice ? 'Notice' : 'First Warning',
                          regulationCode: isNotice ? 'LN-01' : 'WR-01',
                          penaltyPoints: isNotice ? 5 : 10,
                        });

                        loadData();
                        alert(isAr ? `تم إرسال ${docTitle} وتسجيله بحق العضو ${formMemberName} وإرسال إشعار فوري له بنجاح! 📩` : `Document sent to member ${formMemberName}!`);
                      }}
                      className="w-full py-3 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white rounded-2xl font-black text-xs shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isAr ? 'إرسال النموذج للعضو وحفظه في حسابه 📩' : 'Send Document to Member'}</span>
                    </button>
                  )}

                  {/* DIRECT DRIVE DOCX DOWNLOAD BUTTON */}
                  <button
                    onClick={() => {
                      const type = selectedOfficialTemplate.type || (selectedOfficialTemplate.id === 'tmpl-inzar' ? 'inzar' : selectedOfficialTemplate.id === 'tmpl-lft-nazar' ? 'lft_nazar' : 'bg_report');
                      handleDownloadDirectDriveDoc(type);
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isAr ? 'تنزيل ملف وورد الأصلي بدون أي تعديلات (.docx)' : 'Download Original Drive File (.docx)'}</span>
                  </button>

                  {/* CUSTOMIZED WORD DOWNLOAD BUTTON */}
                  <button
                    onClick={() => {
                      const type = selectedOfficialTemplate.type || (selectedOfficialTemplate.id === 'tmpl-inzar' ? 'inzar' : selectedOfficialTemplate.id === 'tmpl-lft-nazar' ? 'lft_nazar' : 'bg_report');
                      handleDownloadWordDoc(type, selectedOfficialTemplate.title);
                    }}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <FileEdit className="w-4 h-4" />
                    <span>{isAr ? 'تنزيل ملف وورد مخصص بالبيانات (.docx)' : 'Download Custom Data Word (.docx)'}</span>
                  </button>

                  {/* PRINT PDF BUTTON */}
                  <button
                    onClick={() => {
                      const type = selectedOfficialTemplate.type || (selectedOfficialTemplate.id === 'tmpl-inzar' ? 'inzar' : selectedOfficialTemplate.id === 'tmpl-lft-nazar' ? 'lft_nazar' : 'bg_report');
                      handlePrintDocument(type as any);
                    }}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{isAr ? 'طباعة / تصدير مستند PDF رسمي' : 'Print / Export Approved PDF'}</span>
                  </button>
                </div>
              </div>

              {/* Live Preview Paper Column (7 cols) */}
              <div className="lg:col-span-7 bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 rounded-2xl flex flex-col space-y-4 overflow-x-auto">
                {/* Single View Header */}
                <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                  <span className="font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <span>🌐 مستند قوقل درايف الأصلي والمعاينة الحية المباشرة</span>
                  </span>

                  <a
                    href={
                      (selectedOfficialTemplate.type === 'inzar' || selectedOfficialTemplate.id === 'tmpl-inzar')
                        ? 'https://docs.google.com/document/d/1ooYBvuQaTNn7DxB__RPWycw5O7-JRH4S/edit?usp=drive_link'
                        : (selectedOfficialTemplate.type === 'lft_nazar' || selectedOfficialTemplate.id === 'tmpl-lft-nazar')
                        ? 'https://docs.google.com/document/d/1VtFrpXHGAxElWQKomDa6ysoi0VTTs_K2/edit?usp=drive_link'
                        : 'https://docs.google.com/document/d/1tgxJkk8xZewNJgtTrbxiFM8R1ihN3UP5/edit?usp=drive_link'
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl font-bold transition-all flex items-center gap-1.5"
                  >
                    <span>{isAr ? 'فتح في Google Docs 🔗' : 'Open in Drive'}</span>
                  </a>
                </div>

                {/* Official Google Drive Paper Sheet Representation with Live Real-time Text Binding */}
                <div className="w-full max-w-[520px] min-h-[640px] !bg-white !text-black p-8 rounded-lg shadow-2xl relative flex flex-col justify-between border-2 border-slate-900 font-sans text-xs select-none overflow-hidden mx-auto">
                    {/* Watermark in center background with blend mode */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-15">
                      <img src="/eye-logo-transparent.png" alt="Watermark" className="w-72 h-72 object-contain mix-blend-multiply" onError={(e: any) => e.currentTarget.style.display = 'none'} />
                    </div>

                    {/* Header */}
                    <div className="relative z-10 border-b-2 border-slate-900 pb-3 flex items-center justify-between text-right !bg-white !text-black">
                      <div className="flex items-center gap-2">
                        <img src="/ministry-logo.png" alt="Ministry" className="h-10 object-contain mix-blend-multiply" onError={(e: any) => e.currentTarget.style.display = 'none'} />
                        <div className="text-[9px] font-black leading-tight !text-black">
                          <div>جمهورية مصر العربية</div>
                          <div>وزارة الشباب والرياضة</div>
                          <div className="text-[7px]">Ministry of Youth and Sports</div>
                        </div>
                      </div>

                      <div className="text-sm font-black text-sky-600 text-center">
                        المصريون الشباب – وزارة الشباب والرياضة
                      </div>

                      <div>
                        <img src="/eye-logo-transparent.png" alt="EYE" className="h-10 object-contain mix-blend-multiply" onError={(e: any) => e.currentTarget.style.display = 'none'} />
                      </div>
                    </div>

                  {/* Body Content */}
                  <div className="relative z-10 my-auto space-y-4 text-right !bg-transparent !text-black">
                    {selectedOfficialTemplate.type === 'inzar' || selectedOfficialTemplate.id === 'tmpl-inzar' ? (
                      <>
                        <h2 className="text-center font-black text-2xl text-rose-600 underline text-underline-offset-4 mb-4">
                          إنذار
                        </h2>

                        <p className="font-bold text-sm leading-relaxed !text-black">
                          بعد الاطلاع على اللائحة التنفيذية والقوانين المنظمة للكيان الخاصة بحقوق ووجبات الأعضاء , قررنا نحن مسئولي لجنة الموارد البشرية بمحافظة : <span className="underline font-black">{formGovernorate}</span>
                        </p>

                        <p className="font-black text-sm !text-black">
                          توجية الإنذار رقم ( <span className="font-black text-rose-600">{formNoticeNumber}</span> ) .
                        </p>

                        <div className="flex justify-between font-black text-sm my-3 px-1 !text-black">
                          <div>للعضو : <span className="text-rose-700 underline font-black">{formMemberName || '......'}</span></div>
                          <div>لجنة : <span className="text-rose-700 underline font-black">{formCommitteeName || '....'}</span></div>
                        </div>

                        <p className="font-bold text-sm leading-relaxed !text-black">
                          وذلك لعدم حضور اجتماع يوم ( <span className="font-black underline">{formMeetingDay}</span> ) , الموافق ( <span className="font-black underline">{formMeetingDate}</span> ) دون التبليغ بعذر عدم الحضور لمن يهمه الأمر .
                        </p>

                        <div className="border-2 border-dashed border-rose-500 !bg-rose-50/90 p-3 rounded-xl text-center text-rose-700 space-y-1 my-3">
                          <div className="font-black flex items-center justify-center gap-1 text-xs text-rose-600">
                            🔴 تنبية
                          </div>
                          <p className="font-bold text-xs leading-snug text-rose-700">
                            نود إعلامكم أنه سيتم إنهاء المشاركة بالكيان بشكل رسمي في حال تلقي ثلاثة إنذارات , نرجو الالتزام بالتوجيهات لضمان استمرار مشاركتكم الفعالة.
                          </p>
                        </div>
                      </>
                    ) : selectedOfficialTemplate.type === 'lft_nazar' || selectedOfficialTemplate.id === 'tmpl-lft-nazar' ? (
                      <>
                        <h2 className="text-center font-black text-2xl text-rose-600 underline text-underline-offset-4 mb-4">
                          لفت نظر
                        </h2>

                        <p className="font-bold text-sm leading-relaxed !text-black">
                          بعد الاطلاع على اللائحة التنفيذية والقوانين المنظمة للكيان الخاصة بحقوق ووجبات الأعضاء , قررنا نحن مسئولي لجنة الموارد البشرية بمحافظة : <span className="underline font-black">{formGovernorate}</span>
                        </p>

                        <p className="font-black text-sm !text-black">
                          توجية لفت نظر رقم ( <span className="font-black text-rose-600">{formNoticeNumber}</span> ) .
                        </p>

                        <div className="flex justify-between font-black text-sm my-3 px-1 !text-black">
                          <div>للعضو : <span className="text-rose-700 underline font-black">{formMemberName || '......'}</span></div>
                          <div>لجنة : <span className="text-rose-700 underline font-black">{formCommitteeName || '....'}</span></div>
                        </div>

                        <p className="font-bold text-sm leading-relaxed !text-black">
                          وذلك لعدم حضور اجتماع يوم ( <span className="font-black underline">{formMeetingDay}</span> ) , الموافق ( <span className="font-black underline">{formMeetingDate}</span> ) دون التبليغ بعذر عدم الحضور لمن يهمه الأمر .
                        </p>

                        <div className="border-2 border-dashed border-rose-500 !bg-rose-50/90 p-3 rounded-xl text-center text-rose-700 space-y-1 my-3">
                          <div className="font-black flex items-center justify-center gap-1 text-xs text-rose-600">
                            🔴 تنبية
                          </div>
                          <p className="font-bold text-xs leading-snug text-rose-700">
                            يرجى العلم أن تلقي عدد 2 لفت نظر يُعتبر معادلاً للحصول على إنذار واحد , نرجو الالتزام بالإرشادات المحددة لتجنب أي إجراءات قد تؤثر على استمرار مشاركتكم.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <h2 className="text-center font-black text-lg text-slate-900 border-b pb-1 mb-3">
                          {formReportTitle}
                        </h2>
                        <div className="font-medium text-xs leading-relaxed text-slate-800 whitespace-pre-wrap">
                          {formReportBody}
                        </div>
                      </>
                    )}

                    {/* Signatures */}
                    <div className="pt-6 flex justify-between text-center font-bold text-xs mt-6 border-t border-slate-300 !text-black">
                      <div>
                        <div>مسؤول لجنة الموارد البشرية</div>
                        <div className="mt-4 font-black">أ. {formHrManager || 'أحمد إبراهيم'}</div>
                      </div>
                      <div>
                        <div>منسق المحافظة</div>
                        <div className="mt-4 font-black">أ. {formCoordinator || 'محمود ربيع'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Hashtag */}
                  <div className="relative z-10 text-center font-black text-sky-600 text-xs border-t border-slate-200 pt-2">
                    {selectedOfficialTemplate.type === 'bg_report' ? '# معا – لأجل – مستقبل - أفضل' : '#معا_نحو_مستقبل_افضل'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TEMPLATE MODAL FOR ADMINS */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-500" />
                <span>{isAr ? 'إضافة قالب/نموذج جديد' : 'New Template'}</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'اسم النموذج/القالب *' : 'Template Title *'}</label>
                <input
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={isAr ? 'مثال: قالب تقرير التسليمات الشهرية' : 'e.g. Monthly Report Template'}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'الفئة' : 'Category'}</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    <option value="reports">{isAr ? 'تقارير' : 'Reports'}</option>
                    <option value="letters">{isAr ? 'خطابات ونماذج HR' : 'HR Forms & Letters'}</option>
                    <option value="presentations">{isAr ? 'عروض تقديمية' : 'Presentations'}</option>
                    <option value="branding">{isAr ? 'هوية وبصريات' : 'Branding'}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'الصيغة (Format)' : 'Format'}</label>
                  <input
                    value={format}
                    onChange={e => setFormat(e.target.value)}
                    placeholder="DOCX / PDF / PPTX"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'الوصف والاستخدام' : 'Description'}</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={isAr ? 'توضيح كيفية استخدام النموذج...' : 'Usage description...'}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 border rounded-xl text-xs font-bold text-slate-500">{isAr ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-500/20">{isAr ? 'حفظ ونشر القالب' : 'Save Template'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ─── Escalation Dialog: auto-triggered when member reaches 2 لفت نظر ─── */}
      {escalationMember && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-red-500 max-w-sm w-full p-6 text-center space-y-4 animate-bounce-in" dir="rtl">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-950 rounded-full flex items-center justify-center">
                <ShieldAlert className="w-9 h-9 text-red-600" />
              </div>
            </div>

            {/* Title */}
            <div>
              <h2 className="text-lg font-black text-red-600">⚠️ تنبيه تصعيد تلقائي</h2>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">
                وصل العضو <span className="text-red-600">{escalationMember.name}</span> إلى <span className="font-black text-red-700">لفتَي نظر</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                وفقاً للائحة الداخلية، يجب تحويله تلقائياً إلى <strong>إنذار رسمي</strong>.<br />
                هل تريد فتح نموذج الإنذار الآن؟
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEscalationMember(null);
                  // Open إنذار template pre-filled with same member
                  const inzarTmpl = templates.find(t => t.id === 'tmpl-inzar' || t.type === 'inzar');
                  if (inzarTmpl) {
                    handleOpenOfficialModal(inzarTmpl);
                  }
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-red-500/30 transition-all"
              >
                🚨 فتح نموذج الإنذار
              </button>
              <button
                onClick={() => setEscalationMember(null)}
                className="flex-1 py-2.5 border-2 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-2xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                لاحقاً
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
