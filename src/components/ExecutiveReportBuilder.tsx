import React, { useState, useEffect } from 'react';
import { db } from '../db/localDb';
import { UserProfile, ExecutiveAnalyticsData, Task, Submission } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { downloadCertificate, printCertificate } from '../lib/certificateGenerator';
import { printDedicatedOfficialDocument } from '../lib/dedicatedPrint';
import { fillAndDownloadDocxTemplate } from '../lib/docxFiller';
import { PerformanceReports } from './PerformanceReports';
import { 
  BarChart3, 
  Printer, 
  Download, 
  CheckCircle2, 
  TrendingUp, 
  Users, 
  Award, 
  FileText, 
  Sparkles, 
  ShieldCheck,
  Calendar,
  Building2,
  AlertCircle,
  Table,
  CheckCircle,
  Plus,
  Trash2
} from 'lucide-react';

export const formatArabicFullDateTime = (dateStr: string) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const weekday = d.toLocaleDateString('ar-EG', { weekday: 'long' });
    const fullDate = d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    return `${weekday}، ${fullDate} (${timeStr})`;
  } catch {
    return dateStr;
  }
};

export const formatLocationForDisplay = (loc?: string) => {
  if (!loc || !loc.trim()) return 'Google Meet';
  const clean = loc.trim();
  if (/https?:\/\//i.test(clean) || clean.toLowerCase().includes('meet.google.com') || clean.toLowerCase().includes('zoom')) {
    return 'Google Meet';
  }
  return clean;
};

interface ExecutiveReportBuilderProps {
  currentUser: UserProfile;
}

export const ExecutiveReportBuilder: React.FC<ExecutiveReportBuilderProps> = ({ currentUser }) => {
  const { isRtl, language } = useLanguage();
  const isAr = language === 'ar';

  const [analytics, setAnalytics] = useState<ExecutiveAnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState<'smart' | 'admin' | 'perf'>('smart');

  // Admin Reports States (merged from ReportGenerator)
  const [adminReportType, setAdminReportType] = useState<'members' | 'committees' | 'departments' | 'submissions' | 'late' | 'certificates' | 'meetings' | 'workplans'>('members');
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [adminTasks, setAdminTasks] = useState<Task[]>([]);
  const [adminSubmissions, setAdminSubmissions] = useState<Submission[]>([]);

  // Custom Weekly Report Controls State
  const [reportPeriod, setReportPeriod] = useState<'current_week' | 'last_week' | 'monthly'>('current_week');
  const [selectedCommittee, setSelectedCommittee] = useState<'All' | 'HR' | 'PR' | 'SM' | 'OR'>('All');
  const [customTitle, setCustomTitle] = useState(isAr ? 'التقرير الشامل لأداء الكيان واللجان' : 'Comprehensive Organization Performance Report');
  const [customTopic, setCustomTopic] = useState(isAr ? 'متابعة تقييم الانضباط والتسليمات الأسبوعية والورش الحية' : 'Weekly Submissions, Live Workshops & Committee Tracking');
  const [activePreset, setActivePreset] = useState<string>('comprehensive');
  const [leaderNotes, setLeaderNotes] = useState(
    isAr 
      ? 'توصية قيادية: التأكيد على كافة اللجان برفع تقارير المتابعة الدورية، والالتزام بتسليم المهام الإلزامية في مواعيدها المحددة لضمان أقصى كفاءة للكيان.' 
      : 'Executive Directive: Maintain strict deadline adherence and ensure mandatory task submissions are completed promptly.'
  );
  // Custom Items / Dynamic Highlights State
  const [customReportItems, setCustomReportItems] = useState<{ id: string; title: string; content: string; type: 'highlight' | 'decision' | 'note' | 'warning' }[]>([
    {
      id: 'item-1',
      title: isAr ? 'إنجاز استثنائي للجنة الموارد البشرية' : 'HR Committee Special Achievement',
      content: isAr ? 'تم استكمال تنظيم وتوثيق السجلات لأكثر من 95% من أعضاء الكيان بنجاح.' : 'Completed documentation for 95% of active members.',
      type: 'highlight',
    }
  ]);

  const [itemTitleInput, setItemTitleInput] = useState('');
  const [itemContentInput, setItemContentInput] = useState('');
  const [itemTypeInput, setItemTypeInput] = useState<'highlight' | 'decision' | 'note' | 'warning'>('highlight');

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitleInput.trim()) return;
    const newItem = {
      id: 'custom-' + Date.now(),
      title: itemTitleInput.trim(),
      content: itemContentInput.trim(),
      type: itemTypeInput,
    };
    setCustomReportItems(prev => [...prev, newItem]);
    setItemTitleInput('');
    setItemContentInput('');
  };

  const handleDeleteCustomItem = (id: string) => {
    setCustomReportItems(prev => prev.filter(item => item.id !== id));
  };

  const handleApplyPreset = (type: string) => {
    setActivePreset(type);
    switch (type) {
      case 'tasks_submissions':
        setCustomTitle(isAr ? 'تقرير متابعة إنجاز المهام والتسليمات الأسبوعية' : 'Weekly Tasks & Submissions Performance Report');
        setCustomTopic(isAr ? 'حصر تسليمات اللجان، معدلات الالتزام بالمواعيد، والمهام المكتملة' : 'Tracking submission deadlines, completed tasks, and grade distributions');
        setLeaderNotes(isAr ? 'توجيه قيادي: يرجى متابعة الأعضاء المتعثرين وتأكيد مراجعة التسليمات المعلقة قبل نهاية الأسبوع.' : 'Executive Directive: Review pending submissions and support members with upcoming deadlines.');
        break;
      case 'attendance_discipline':
        setCustomTitle(isAr ? 'تقرير انضباط وحضور الورش واللقاءات الرسمية' : 'Attendance & Discipline Official Report');
        setCustomTopic(isAr ? 'قياس نسبة حضور الأعضاء بالورش الحية واللقاءات الرسمية لجميع اللجان' : 'Evaluating live workshop attendance and meeting commitment');
        setLeaderNotes(isAr ? 'توجيه قيادي: توجيه الشكر للجان الأكثر التزاماً بالحضور وتكريم الأعضاء المواظبين على الورش المباشرة.' : 'Executive Directive: Acknowledge high-attendance committees and active workshop participants.');
        break;
      case 'training_academy':
        setCustomTitle(isAr ? 'تقرير إنجاز المواد التدريبية والفيديوهات الإلزامية' : 'Mandatory Training & Video Summaries Report');
        setCustomTopic(isAr ? 'حصر نسبة مشاهدة وتلخيص الكورسات الأكاديمية والفيديوهات الإلزامية' : 'Monitoring completion rates of required training video summaries');
        setLeaderNotes(isAr ? 'توجيه قيادي: التأكيد على كافة المتطوعين بإتمام مشاهدة الفيديوهات المتبقية واستصدار شهادات الأكاديمية.' : 'Executive Directive: Encourage volunteers to complete remaining training modules for certification.');
        break;
      case 'ideas_innovation':
        setCustomTitle(isAr ? 'تقرير الابتكار وبنك الأفكار والمبادرات' : 'Innovation & Idea Bank Submissions Report');
        setCustomTopic(isAr ? 'حصر الأفكار والمقترحات التطويرية المقدمة من الأعضاء واللجان' : 'Synthesizing submitted ideas and structural improvement proposals');
        setLeaderNotes(isAr ? 'توجيه قيادي: اعتماد المقترحات المتميزة وتعيين فرق عمل لتطبيق الأفكار الفائزة ميدانياً.' : 'Executive Directive: Approve top proposals and form implementation teams.');
        break;
      case 'top_performers':
        setCustomTitle(isAr ? 'تقرير المتميزين والتكريمات وسلسلة النشاط' : 'Top Performers & Outstanding Honors Report');
        setCustomTopic(isAr ? 'تكريم الأعضاء واللجان الأكثر نشاطاً وإبراز متصدري لوحة الصدارة' : 'Honoring top-ranking members, streak champions, and committee leads');
        setLeaderNotes(isAr ? 'توجيه قيادي: منح شارات التميز للأبطال وصرف نقاط المكافآت لمتصدري الكيان.' : 'Executive Directive: Award excellence badges and bonus points to leaderboard champions.');
        break;
      case 'okrs_workplans':
        setCustomTitle(isAr ? 'تقرير متابعة الخطط الاستراتيجية وأهداف OKRs' : 'Strategic Work Plans & OKRs Progress Report');
        setCustomTopic(isAr ? 'تقييم مدى تحقيق الأهداف المرحلية والخطط التشغيلية لكل لجنة' : 'Tracking quarterly OKRs and tactical committee work plans');
        setLeaderNotes(isAr ? 'توجيه قيادي: تعديل مؤشرات أداء الخطط وتكثيف المتابعة للأنشطة المتبقية.' : 'Executive Directive: Review strategy key results and adjust operational timelines.');
        break;
      case 'meetings_attendance':
        setCustomTitle(isAr ? 'تقرير انضباط الاجتماعات وحضور اللقاءات الرسمية' : 'Official Meetings & Attendance Report');
        setCustomTopic(isAr ? 'حصر تفصيلي لكافة اللقاءات، عناوينها، وأعداد الحضور والغياب ونسب التواجد' : 'Meeting descriptions, attendee counts, and attendance rates');
        setLeaderNotes(isAr ? 'توجيه قيادي: توجيه الشكر للجان والأعضاء الأكثر التزاماً بحضور الاجتماعات، ومتابعة المتغيبين بدون أعذار رسمية.' : 'Executive Directive: Follow up with absent members and acknowledge high attendance committees.');
        break;
      case 'admin_workplans':
        setCustomTitle(isAr ? 'تقرير متابعة المهام الإدارية والخطط الاستراتيجية OKRs' : 'Administrative Tasks & Strategic Work Plans Report');
        setCustomTopic(isAr ? 'متابعة إنجاز الأهداف التشغيلية والخطط المرحلية للمسؤولين والقادة' : 'Tracking operational work plans, key results, and leadership deliverables');
        setLeaderNotes(isAr ? 'توجيه قيادي: الإسراع في استكمال الأهداف المرحلية غير المكتملة وتعديل المؤشرات حسب المتطلبات.' : 'Executive Directive: Accelerate key result completion for current operational targets.');
        break;
      case 'comprehensive':
      default:
        setCustomTitle(isAr ? 'التقرير الشامل لأداء الكيان واللجان' : 'Comprehensive Organization Performance Report');
        setCustomTopic(isAr ? 'متابعة تقييم الانضباط والتسليمات الأسبوعية والورش الحية واللقاءات الرسمية' : 'Weekly Submissions, Live Workshops & Meetings Tracking');
        setLeaderNotes(isAr ? 'توصية قيادية: التأكيد على كافة اللجان برفع تقارير المتابعة الدورية، والالتزام بتسليم المهام الإلزامية وحضور الاجتماعات.' : 'Executive Directive: Maintain strict deadline adherence and ensure mandatory task submissions & meeting attendance.');
        break;
    }
  };

  const loadReport = () => {
    const data = db.getExecutiveAnalyticsData(currentUser);
    setAnalytics(data);
  };

  const loadAdminData = () => {
    setAdminUsers(db.getUsers(currentUser));
    setAdminTasks(db.getTasks());
    setAdminSubmissions(db.getSubmissions());
  };

  useEffect(() => {
    loadReport();
    loadAdminData();
  }, [currentUser]);

  // Admin Reports compiled data (merged from ReportGenerator)
  const getAdminCompiledData = () => {
    switch (adminReportType) {
      case 'members':
        return adminUsers.map(u => ({
          [isAr ? 'الاسم' : 'Full Name']: u.fullName,
          [isAr ? 'رقم التواصل (الرقم المسجل)' : 'Contact Phone']: u.phoneNumber || 'غير مدخل',
          [isAr ? 'البريد الإلكتروني' : 'Email']: u.email,
          [isAr ? 'الدور' : 'Role']: u.role,
          [isAr ? 'الحالة' : 'Status']: u.status,
          [isAr ? 'اللجنة' : 'Committee']: u.committee,
          [isAr ? 'القسم' : 'Department']: u.department,
          [isAr ? 'كود العضوية' : 'Membership Code']: u.membershipCode,
          [isAr ? 'تاريخ الانضمام' : 'Joined Date']: u.joinedDate
        }));
      case 'committees': {
        const comms = ['HR', 'PR', 'SM', 'OR'];
        return comms.map(c => {
          const membersCount = adminUsers.filter(u => u.committee === c && u.role === 'Member').length;
          const leadersCount = adminUsers.filter(u => u.committee === c && u.role === 'Leader').length;
          const totalTasks = adminTasks.filter(t => t.committee === c).length;
          const totalSubs = adminSubmissions.filter(s => s.committee === c).length;
          return {
            [isAr ? 'اللجنة' : 'Committee']: c,
            [isAr ? 'عدد القادة' : 'Leaders Count']: leadersCount,
            [isAr ? 'عدد الأعضاء' : 'Members Count']: membersCount,
            [isAr ? 'المهام النشطة' : 'Total Active Tasks']: totalTasks,
            [isAr ? 'إجمالي التسليمات' : 'Total Submissions']: totalSubs
          };
        });
      }
      case 'departments': {
        const depts = ['HRM', 'HRS', 'HRIS', 'HRD', 'EPR', 'IPR', 'Content', 'Graphic Design', 'Photography', 'Video Editing', 'VIP', 'Planning', 'Coordination', 'Logistics'];
        return depts.map(d => {
          const members = adminUsers.filter(u => u.department === d && u.role === 'Member').length;
          const totalTasks = adminTasks.filter(t => t.department === d).length;
          const totalSubs = adminSubmissions.filter(s => s.department === d).length;
          return {
            [isAr ? 'القسم' : 'Department']: d,
            [isAr ? 'الأعضاء النشطين' : 'Active Members']: members,
            [isAr ? 'المهام' : 'Task Objectives']: totalTasks,
            [isAr ? 'الحلول المقدمة' : 'Submitted Solutions']: totalSubs
          };
        });
      }
      case 'submissions':
        return adminSubmissions.map(s => ({
          [isAr ? 'كود التسليم' : 'Submission ID']: s.submissionIdCode,
          [isAr ? 'اسم المهمة' : 'Task Name']: s.taskName,
          [isAr ? 'اسم العضو' : 'Member Name']: s.memberName,
          [isAr ? 'البريد الإلكتروني' : 'Member Email']: s.memberEmail,
          [isAr ? 'القسم' : 'Department']: s.department,
          [isAr ? 'الحالة' : 'Status']: s.status,
          [isAr ? 'تاريخ التسليم' : 'Submitted At']: new Date(s.submittedAt).toLocaleDateString(),
          [isAr ? 'حجم الملف' : 'File Size']: s.fileSize
        }));
      case 'late': {
        const lateTasks = adminTasks.filter(t => new Date(t.deadline).getTime() < new Date().getTime());
        const lateRows: any[] = [];
        lateTasks.forEach(task => {
          const deptMembers = adminUsers.filter(u => u.department === task.department && u.role === 'Member');
          deptMembers.forEach(m => {
            const hasSubmitted = adminSubmissions.some(s => s.taskId === task.id && s.memberId === m.id);
            if (!hasSubmitted) {
              lateRows.push({
                [isAr ? 'اسم المهمة' : 'Task Name']: task.name,
                [isAr ? 'اسم العضو' : 'Member Name']: m.fullName,
                [isAr ? 'رقم التواصل (الرقم المسجل)' : 'Contact Phone']: m.phoneNumber || 'غير مدخل',
                [isAr ? 'البريد الإلكتروني' : 'Email']: m.email,
                [isAr ? 'القسم' : 'Department']: task.department,
                [isAr ? 'الموعد النهائي' : 'Deadline']: new Date(task.deadline).toLocaleString()
              });
            }
          });
        });
        return lateRows;
      }
      case 'meetings': {
        const meetingsList = analytics?.meetingsSummary || [];
        return meetingsList.map(m => ({
          [isAr ? 'عنوان الاجتماع' : 'Meeting Title']: m.title,
          [isAr ? 'الوصف والهدف' : 'Description']: m.description,
          [isAr ? 'نوع اللقاء' : 'Type']: m.type,
          [isAr ? 'اللجنة' : 'Committee']: m.committee,
          [isAr ? 'القسم' : 'Department']: m.department,
          [isAr ? 'التاريخ والوقت واليوم' : 'Date, Day & Time']: formatArabicFullDateTime(m.date),
          [isAr ? 'المكان / الرابط' : 'Location']: formatLocationForDisplay(m.location),
          [isAr ? 'الحالة' : 'Status']: m.status,
          [isAr ? 'كود الحضور' : 'Passcode']: m.attendanceCode,
          [isAr ? 'المنظم' : 'Organizer']: m.createdByName,
          [isAr ? 'عدد الحضور' : 'Present Count']: m.presentCount,
          [isAr ? 'عدد الغياب' : 'Absent Count']: m.absentCount,
          [isAr ? 'نسبة الحضور' : 'Attendance Rate']: `${m.attendanceRate}%`
        }));
      }
      case 'workplans': {
        const workPlansList = analytics?.workPlansSummary || [];
        return workPlansList.map(w => ({
          [isAr ? 'عنوان الهدف / المهمة' : 'Work Plan Title']: w.title,
          [isAr ? 'الهدف الاستراتيجي' : 'Objective']: w.objective,
          [isAr ? 'اللجنة المكلفة' : 'Committee']: w.committee,
          [isAr ? 'القسم' : 'Department']: w.department,
          [isAr ? 'الشهر / الفترة' : 'Period']: w.month,
          [isAr ? 'الحالة والمؤشر' : 'Status']: w.status,
          [isAr ? 'عدد الأهداف الرقمية' : 'Key Results Count']: w.keyResultsCount,
          [isAr ? 'المسؤول الإداري' : 'Leader']: w.createdByName
        }));
      }
      default:
        return [];
    }
  };

  const adminCompiledData = getAdminCompiledData();

  const exportCSV = () => {
    if (adminCompiledData.length === 0) return;
    const headers = Object.keys(adminCompiledData[0]);
    const csvRows = [
      headers.join(','),
      ...adminCompiledData.map(row => 
        headers.map(header => {
          const val = (row as any)[header];
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `EYE_Hub_${adminReportType}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExcel = () => {
    if (adminCompiledData.length === 0) return;
    const headers = Object.keys(adminCompiledData[0]);
    const tabRows = [
      headers.join('\t'),
      ...adminCompiledData.map(row => 
        headers.map(header => (row as any)[header]).join('\t')
      )
    ];
    const blob = new Blob([tabRows.join('\n')], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `EYE_Hub_${adminReportType}_report.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    const reportHtml = `
      <div style="font-size: 13px; line-height: 1.8; color: #0f172a;">
        <h2 style="font-size: 18px; font-weight: 900; color: #1b4cd3; margin-bottom: 8px; text-align: center;">${customTitle}</h2>
        <p style="font-size: 12px; color: #475569; margin-bottom: 20px; text-align: center;"><strong>الموضوع / نطاق التقرير:</strong> ${customTopic}</p>
        
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; text-align: center;">
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 10px;">
            <div style="font-size: 10px; color: #64748b; font-weight: 700;">إجمالي الأعضاء</div>
            <div style="font-size: 18px; font-weight: 900; color: #1b4cd3;">${analytics.totalMembers}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 10px;">
            <div style="font-size: 10px; color: #64748b; font-weight: 700;">المهام النشطة</div>
            <div style="font-size: 18px; font-weight: 900; color: #059669;">${analytics.activeTasks}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 10px;">
            <div style="font-size: 10px; color: #64748b; font-weight: 700;">نسبة الإنجاز العامة</div>
            <div style="font-size: 18px; font-weight: 900; color: #d97706;">${analytics.overallCompletionRate}%</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 10px;">
            <div style="font-size: 10px; color: #64748b; font-weight: 700;">متوسط التقييم العام</div>
            <div style="font-size: 18px; font-weight: 900; color: #7c3aed;">${analytics.avgGrade} / 100</div>
          </div>
        </div>

        <h3 style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 20px; border-bottom: 2px solid #1b4cd3; padding-bottom: 4px;">تفاصيل أداء اللجان الرسمية:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background: #1b4cd3; color: white;">
              <th style="padding: 8px; border: 1px solid #cbd5e1;">اللجنة</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">الأعضاء</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">المهام النشطة</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">التسليمات المكتملة</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">متوسط الدرجة</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">نسبة الحضور</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">المتفوق الأبرز</th>
            </tr>
          </thead>
          <tbody>
            ${filteredBreakdown.map(c => `
              <tr>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;"><strong>${c.committee}</strong></td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${c.totalMembers}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${c.activeTasksCount}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${c.completedSubmissionsCount}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;"><strong>${c.avgSubmissionGrade}%</strong></td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${c.attendanceRatePercentage}%</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${c.topPerformerName || '—'} (${c.topPerformerPoints} ن)</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Official Meetings & Attendance Report Section -->
        ${(analytics.meetingsSummary && analytics.meetingsSummary.length > 0) ? `
          <h3 style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 24px; border-bottom: 2px solid #2563eb; padding-bottom: 4px;">
            تقرير اللقاءات والاجتماعات الرسمية وحضور الأعضاء:
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px;">
            <thead>
              <tr style="background: #2563eb; color: white;">
                <th style="padding: 6px; border: 1px solid #cbd5e1;">عنوان الاجتماع</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">الوصف والهدف</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">اللجنة</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">التاريخ والوقت</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">المكان</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">عدد الحضور</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">نسبة الحضور</th>
              </tr>
            </thead>
            <tbody>
              ${analytics.meetingsSummary.slice(0, 10).map(m => `
                <tr>
                  <td style="padding: 6px; border: 1px solid #cbd5e1;"><strong>${m.title}</strong></td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1;">${m.description}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${m.committee}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${formatArabicFullDateTime(m.date)}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${formatLocationForDisplay(m.location)}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;"><strong>${m.presentCount} عضو</strong></td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; color: #059669; font-weight: bold;">${m.attendanceRate}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <!-- Administrative Tasks & OKRs Table Section -->
        ${(analytics.workPlansSummary && analytics.workPlansSummary.length > 0) ? `
          <h3 style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 24px; border-bottom: 2px solid #7c3aed; padding-bottom: 4px;">
            تقرير المهام الإدارية والخطط التشغيلية OKRs:
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px;">
            <thead>
              <tr style="background: #7c3aed; color: white;">
                <th style="padding: 6px; border: 1px solid #cbd5e1;">عنوان الهدف الإداري</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">الهدف الاستراتيجي</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">اللجنة</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">الشهر</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">الحالة ومعدل التقدم</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">المسؤول</th>
              </tr>
            </thead>
            <tbody>
              ${analytics.workPlansSummary.slice(0, 10).map(w => `
                <tr>
                  <td style="padding: 6px; border: 1px solid #cbd5e1;"><strong>${w.title}</strong></td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1;">${w.objective}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${w.committee}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${w.month}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;"><strong>${w.status}</strong></td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${w.createdByName}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <!-- Custom Dynamic Items & Highlights Section -->
        ${(customReportItems && customReportItems.length > 0) ? `
          <h3 style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 24px; border-bottom: 2px solid #d97706; padding-bottom: 4px;">
            بنود وإنجازات وملاحظات خاصة بالتقرير:
          </h3>
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
            ${customReportItems.map(item => `
              <div style="background: ${item.type === 'highlight' ? '#fffbeb' : item.type === 'decision' ? '#eff6ff' : item.type === 'warning' ? '#fef2f2' : '#f8fafc'}; border-right: 4px solid ${item.type === 'highlight' ? '#d97706' : item.type === 'decision' ? '#2563eb' : item.type === 'warning' ? '#dc2626' : '#64748b'}; padding: 10px 14px; border-radius: 8px;">
                <div style="font-size: 12px; font-weight: 800; color: #0f172a;">
                  <span style="display: inline-block; font-size: 10px; font-weight: 900; background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px; margin-left: 6px;">[${item.type === 'highlight' ? 'إنجاز' : item.type === 'decision' ? 'قرار إداري' : item.type === 'warning' ? 'تنبيه' : 'ملاحظة'}]</span> ${item.title}
                </div>
                ${item.content ? `<p style="margin: 3px 0 0 0; font-size: 11px; color: #334155; line-height: 1.5;">${item.content}</p>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${leaderNotes ? `
          <div style="background: #eff6ff; border-right: 4px solid #1b4cd3; padding: 14px; margin-top: 20px; border-radius: 8px;">
            <strong style="color: #1b4cd3; font-size: 12px;">التوجيه والتعليمات القيادية:</strong>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #1e293b;">${leaderNotes}</p>
          </div>
        ` : ''}
      </div>
    `;

    printDedicatedOfficialDocument({
      title: customTitle,
      docNumber: `EYE-EXEC-${Date.now().toString().slice(-6)}`,
      bodyHtml: reportHtml,
      signatures: [
        { title: 'مسؤول لجنة الموارد البشرية', name: 'أحمد إبراهيم' }
      ]
    });
  };

  if (!analytics) return null;

  // Filter breakdown if specific committee selected
  const filteredBreakdown = selectedCommittee === 'All' 
    ? analytics.committeeBreakdown 
    : analytics.committeeBreakdown.filter(c => c.committee === selectedCommittee);

  const reportPresetButtons = [
    { id: 'comprehensive', label: isAr ? 'التقرير الشامل العام' : 'Comprehensive Report' },
    { id: 'tasks_submissions', label: isAr ? 'تقرير التسليمات والمهام' : 'Tasks & Submissions' },
    { id: 'meetings_attendance', label: isAr ? 'تقرير الاجتماعات والحضور' : 'Meetings & Attendance' },
    { id: 'attendance_discipline', label: isAr ? 'تقرير الانضباط والورش' : 'Attendance & Workshops' },
    { id: 'training_academy', label: isAr ? 'تقرير التدريب الإجباري' : 'Mandatory Training' },
    { id: 'ideas_innovation', label: isAr ? 'تقرير الأفكار والمبادرات' : 'Ideas & Innovation' },
    { id: 'top_performers', label: isAr ? 'تقرير المتميزين والتكريمات' : 'Top Performers' },
    { id: 'okrs_workplans', label: isAr ? 'تقرير أهداف الخطط OKRs' : 'Work Plans & OKRs' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in print:p-0 print:bg-white" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Banner & Print Controls (Hidden on Print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl border border-slate-800 print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <span>{isAr ? 'نظام التقارير والتحليلات الموحد بكيان EYE' : 'Unified Reports & Analytics Hub'}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black">
            {isAr ? 'مركز التقارير الذكي الموحد 📊' : 'Unified Smart Reports Center 📊'}
          </h1>
          <p className="text-xs md:text-sm text-slate-300 font-medium">
            {isAr ? 'التقارير التنفيذية الذكية + التقارير الإدارية التفصيلية في مكان واحد.' : 'Executive smart reports + detailed admin data reports in one place.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => { loadReport(); loadAdminData(); }}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700"
          >
            {isAr ? 'تحديث البيانات التلقائي' : 'Refresh Data'}
          </button>

          <button
            onClick={() => {
              let fullBodyText = `نطاق وموضوع التقرير: ${customTopic}\n`;
              fullBodyText += `الفترة الزمنية: ${reportPeriod === 'current_week' ? 'الأسبوع الحالي' : reportPeriod === 'last_week' ? 'الأسبوع الماضي' : 'التقييم الشهري الشامل'}  |  نطاق اللجنة: ${selectedCommittee === 'All' ? 'جميع اللجان' : `لجنة ${selectedCommittee}`}\n\n`;

              fullBodyText += `المؤشرات الكلية والأرقام القياسية للكيان:\n`;
              const kpis = {
                members: analytics.totalMembers,
                tasks: analytics.activeTasks,
                completionRate: analytics.overallCompletionRate,
                avgGrade: analytics.avgGrade,
                attendanceRate: analytics.overallAttendanceRate,
                videoRate: analytics.mandatoryVideosCompletionRate
              };
              fullBodyText += `[KPI_CARDS_JSON]${JSON.stringify(kpis)}\n\n`;

              fullBodyText += `حصر وتقييم أداء اللجان الرسمية:\n`;
              const committeeHeaders = ['اللجنة', 'عدد الأعضاء', 'المهام النشطة', 'التسليمات المكتملة', 'متوسط الدرجات', 'نسبة الحضور', 'المتفوق الأبرز'];
              const committeeRows = filteredBreakdown.map((c) => [
                `لجنة ${c.committee}`,
                `${c.totalMembers} عضو`,
                `${c.activeTasksCount}`,
                `${c.completedSubmissionsCount}`,
                `${c.avgSubmissionGrade}%`,
                `${c.attendanceRatePercentage}%`,
                c.topPerformerName ? `${c.topPerformerName} (${c.topPerformerPoints} ن)` : '—'
              ]);
              fullBodyText += `[TABLE_JSON]${JSON.stringify({ headers: committeeHeaders, rows: committeeRows, headerBg: '1B4CD3' })}\n\n`;

              if (analytics.meetingsSummary && analytics.meetingsSummary.length > 0) {
                fullBodyText += `تقرير اللقاءات والاجتماعات الرسمية وحضور الأعضاء:\n`;
                const mtgHeaders = ['عنوان الاجتماع', 'الوصف والهدف', 'اللجنة / النوع', 'التاريخ والوقت واليوم', 'المكان', 'عدد الحضور', 'نسبة الحضور'];
                const mtgRows = analytics.meetingsSummary.map(m => [
                  m.title,
                  m.description,
                  `${m.committee} / ${m.type}`,
                  formatArabicFullDateTime(m.date),
                  formatLocationForDisplay(m.location),
                  `${m.presentCount} عضو (من 119)`,
                  `${m.attendanceRate}%`
                ]);
                fullBodyText += `[TABLE_JSON]${JSON.stringify({ headers: mtgHeaders, rows: mtgRows, headerBg: '2563EB' })}\n\n`;
              }

              if (analytics.workPlansSummary && analytics.workPlansSummary.length > 0) {
                fullBodyText += `تقرير المهام الإدارية والخطط التشغيلية OKRs:\n`;
                const wpHeaders = ['عنوان الهدف الإداري', 'الهدف الاستراتيجي', 'اللجنة المكلفة', 'الفترة', 'الحالة والمؤشر', 'المسؤول الإداري'];
                const wpRows = analytics.workPlansSummary.map(w => [
                  w.title,
                  w.objective,
                  w.committee,
                  w.month,
                  w.status,
                  w.createdByName
                ]);
                fullBodyText += `[TABLE_JSON]${JSON.stringify({ headers: wpHeaders, rows: wpRows, headerBg: '7C3AED' })}\n\n`;
              }

              if (customReportItems && customReportItems.length > 0) {
                fullBodyText += `بنود وإنجازات وملاحظات خاصة بالتقرير:\n`;
                const customHeaders = ['تصنيف البند', 'عنوان البند / التنبيه', 'التفاصيل والبيان'];
                const customRows = customReportItems.map(item => {
                  const typeTag = item.type === 'highlight' ? 'إنجاز متميز' : item.type === 'decision' ? 'قرار إداري' : item.type === 'warning' ? 'تنبيه' : 'ملاحظة';
                  return [typeTag, item.title, item.content || '—'];
                });
                fullBodyText += `[TABLE_JSON]${JSON.stringify({ headers: customHeaders, rows: customRows, headerBg: '059669' })}\n\n`;
              }

              if (leaderNotes) {
                fullBodyText += `التوجيهات والتعليمات القيادية المعتمدة:\n`;
                fullBodyText += `${leaderNotes}\n\n`;
              }

              if (analytics.executiveNotes) {
                fullBodyText += `الخلاصة والتوصيات التنفيذية الاستراتيجية:\n`;
                fullBodyText += `${analytics.executiveNotes}\n\n`;
              }

              fullBodyText += `═════════════════════════════════════════════════════\n`;
              fullBodyText += `              • الاعتماد والتوقيعات الرسمية •\n`;
              fullBodyText += `═════════════════════════════════════════════════════\n\n`;
              fullBodyText += `مسؤول لجنة الموارد البشرية         نائب لجنة الموارد البشرية\n`;
              fullBodyText += `   أ. أحمد إبراهيم                 أ. ريهام أشرف\n`;

              fillAndDownloadDocxTemplate('bg_report', {
                reportTitle: customTitle,
                reportBody: fullBodyText,
                hrManager: 'أحمد إبراهيم'
              });
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/25 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isAr ? 'تصدير Word (.docx) الأصلي' : 'Export Original Docx'}</span>
          </button>

          <button
            onClick={handlePrintReport}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/25 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? 'طباعة / تصدير PDF التقرير' : 'Print / Export PDF'}</span>
          </button>
        </div>
      </div>

      {/* Main Tab Switcher (Hidden on Print) */}
      <div className="flex flex-wrap rounded-2xl bg-slate-100 dark:bg-slate-800 p-1.5 w-fit border border-slate-200/50 dark:border-slate-700 print:hidden gap-1">
        <button
          onClick={() => setActiveTab('smart')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${activeTab === 'smart' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isAr ? 'التقارير التنفيذية الذكية' : 'Smart Executive Reports'}</span>
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${activeTab === 'admin' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
        >
          <Table className="w-3.5 h-3.5" />
          <span>{isAr ? 'التقارير الإدارية التفصيلية' : 'Admin Data Reports'}</span>
        </button>
        <button
          onClick={() => setActiveTab('perf')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${activeTab === 'perf' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>{isAr ? 'تقارير الأداء الشهرية' : 'Monthly Performance'}</span>
        </button>
      </div>

      {/* ========== SMART EXECUTIVE REPORT TAB ========== */}
      {activeTab === 'smart' && (
      <>
      {/* WEEKLY REPORT CUSTOMIZER CONTROL PANEL (Hidden on Print) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5 shadow-sm print:hidden">
        
        {/* 1-Click Instant Report Type Generator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>{isAr ? 'اختيار نوع التقرير المطلوب (توليد فوري بضغطة زر) 📑:' : 'Instant Report Preset Generator 📑:'}</span>
            </h3>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {reportPresetButtons.map(btn => (
              <button
                key={btn.id}
                onClick={() => handleApplyPreset(btn.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  activePreset === btn.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-[1.02]'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Period Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isAr ? '📅 الفترة الزمنية للتقرير:' : 'Report Timeframe Period:'}
            </label>
            <select
              value={reportPeriod}
              onChange={(e: any) => setReportPeriod(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500"
            >
              <option value="current_week">{isAr ? 'الأسبوع الحالي (Current Week)' : 'Current Week'}</option>
              <option value="last_week">{isAr ? 'الأسبوع الماضي (Last Week)' : 'Last Week'}</option>
              <option value="monthly">{isAr ? 'التقييم الشهري الشامل (Monthly)' : 'Full Monthly Report'}</option>
            </select>
          </div>

          {/* Committee Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isAr ? '🏛️ نطاق اللجنة المستهدفة:' : 'Target Committee Focus:'}
            </label>
            <select
              value={selectedCommittee}
              onChange={(e: any) => setSelectedCommittee(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500"
            >
              <option value="All">{isAr ? 'جميع اللجان (All Committees)' : 'All Committees'}</option>
              <option value="HR">{isAr ? 'لجنة الموارد البشرية (HR)' : 'HR Committee'}</option>
              <option value="PR">{isAr ? 'لجنة العلاقات العامة (PR)' : 'PR Committee'}</option>
              <option value="SM">{isAr ? 'لجنة السوشيال ميديا (SM)' : 'SM Committee'}</option>
              <option value="OR">{isAr ? 'لجنة التنظيم واللوجستيات (OR)' : 'OR Committee'}</option>
            </select>
          </div>

          {/* Main Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isAr ? '📌 عنوان التقرير الأسبوعي الرئيسي:' : 'Main Report Title:'}
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={isAr ? 'مثال: تقرير الأداء الأسبوعي المعتمَد' : 'Main Title...'}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Sub Topic Input & Executive Directives */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isAr ? '🎯 موضوع وهدف هذا التقرير الأسبوعي:' : 'Weekly Focus Topic / Objective:'}
            </label>
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder={isAr ? 'مثال: متابعة تسليمات المعرض الأسبوعي والتسليكات' : 'Focus Topic...'}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isAr ? '✍️ التوجيهات والملاحظات القيادية المخصصة (تظهر بالتقرير الرسمى):' : 'Leader Directives & Executive Notes:'}
            </label>
            <textarea
              rows={2}
              value={leaderNotes}
              onChange={(e) => setLeaderNotes(e.target.value)}
              placeholder={isAr ? 'اكتب ملاحظاتك وتوجيهاتك الخاصة لهذا التقرير...' : 'Write custom leader notes...'}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* CUSTOM ITEMS & HIGHLIGHTS BUILDER */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
          <h4 className="text-xs font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'إضافة بنود وإنجازات وملاحظات مخصصة للتقرير (Custom Items Builder):' : 'Add Custom Items & Highlights to Report:'}</span>
          </h4>

          <form onSubmit={handleAddCustomItem} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">{isAr ? 'نوع البند' : 'Item Type'}</label>
              <select
                value={itemTypeInput}
                onChange={(e: any) => setItemTypeInput(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100"
              >
                <option value="highlight">{isAr ? '🌟 إنجاز متميز (Highlight)' : '🌟 Highlight'}</option>
                <option value="decision">{isAr ? '📌 قرار إداري (Decision)' : '📌 Decision'}</option>
                <option value="note">{isAr ? '💬 ملاحظة (Note)' : '💬 Note'}</option>
                <option value="warning">{isAr ? '⚠️ تنبيه / متابعة (Warning)' : '⚠️ Warning'}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">{isAr ? 'عنوان البند' : 'Title'}</label>
              <input
                type="text"
                value={itemTitleInput}
                onChange={(e) => setItemTitleInput(e.target.value)}
                placeholder={isAr ? 'مثال: إنجاز الورشة الإقليمية...' : 'Item title...'}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">{isAr ? 'التفاصيل / المبررات' : 'Details'}</label>
              <input
                type="text"
                value={itemContentInput}
                onChange={(e) => setItemContentInput(e.target.value)}
                placeholder={isAr ? 'اكتب تفاصيل الإنجاز أو القرار...' : 'Item details...'}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? 'إضافة للتقرير' : 'Add Item'}</span>
              </button>
            </div>
          </form>

          {/* List of Added Custom Items */}
          {customReportItems.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {customReportItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                    item.type === 'highlight'
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 text-amber-800 dark:text-amber-300'
                      : item.type === 'decision'
                      ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 text-blue-800 dark:text-blue-300'
                      : item.type === 'warning'
                      ? 'bg-red-50 dark:bg-red-950/30 border-red-200 text-red-800 dark:text-red-300'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{item.type === 'highlight' ? '🌟' : item.type === 'decision' ? '📌' : item.type === 'warning' ? '⚠️' : '💬'}</span>
                  <span>{item.title}</span>
                  <button
                    onClick={() => handleDeleteCustomItem(item.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors ms-1 cursor-pointer"
                    title={isAr ? 'حذف البند' : 'Delete'}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* OFFICIAL EXECUTIVE REPORT DOCUMENT (PRINTABLE CONTAINER) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-10 space-y-8 shadow-sm print:border-none print:shadow-none print:p-0 print:text-black">
        
        {/* Document Official Header */}
        <div className="flex items-center justify-between border-b-2 border-indigo-600 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-600 font-black text-sm uppercase">
              <Building2 className="w-5 h-5" />
              <span>EYE WORKFLOW HUB - EXECUTIVE REPORT</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white print:text-black">
              {customTitle}
            </h2>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold print:text-black">
              {isAr ? 'موضوع التقرير: ' : 'Focus Topic: '} {customTopic}
            </p>
            <p className="text-[11px] text-slate-400 font-bold">
              {isAr ? `الفترة المحدد: ${reportPeriod === 'current_week' ? 'الأسبوع الحالي' : reportPeriod === 'last_week' ? 'الأسبوع الماضي' : 'التقييم الشهري الشامل'} | نطاق اللجنة: ${selectedCommittee === 'All' ? 'جميع اللجان' : `لجنة ${selectedCommittee}`}` : `Period: ${reportPeriod} | Scope: ${selectedCommittee}`}
            </p>
          </div>

          <div className="text-end space-y-1 text-xs text-slate-500 font-bold print:text-black">
            <div>{isAr ? 'تاريخ التوليد:' : 'Generated Date:'} {new Date(analytics.generatedAt).toLocaleDateString('ar-EG')}</div>
            <div>{isAr ? 'مُعَد التقرير:' : 'Prepared By:'} {analytics.generatedByName}</div>
            <div className="text-[10px] text-emerald-600 font-extrabold">{isAr ? 'حالة التقرير: مُعتمد وتنفيذي ✅' : 'Status: Approved Executive ✅'}</div>
          </div>
        </div>

        {/* Top 4 KPI Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 print:border-gray-300 print:bg-gray-50">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase">{isAr ? 'معدل إنجاز المهام' : 'Task Completion'}</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white print:text-black">{analytics.overallCompletionRate}%</div>
            <p className="text-[10px] text-slate-500 font-medium">{isAr ? 'نسبة تسليمات المهام المكتملة' : 'On-time submission rate'}</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 print:border-gray-300 print:bg-gray-50">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase">{isAr ? 'متوسط درجات التقييم' : 'Avg Evaluation Grade'}</span>
              <Award className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white print:text-black">{analytics.avgGrade}/100</div>
            <p className="text-[10px] text-slate-500 font-medium">{isAr ? 'متوسط تقييم القادة للتسليمات' : 'Average submission score'}</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 print:border-gray-300 print:bg-gray-50">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase">{isAr ? 'نسبة حضور الاجتماعات' : 'Attendance Rate'}</span>
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white print:text-black">{analytics.overallAttendanceRate}%</div>
            <p className="text-[10px] text-slate-500 font-medium">{isAr ? 'معدل التزام الأعضاء بالاجتماعات' : 'Meeting presence rate'}</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 print:border-gray-300 print:bg-gray-50">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase">{isAr ? 'إنجاز الفيديوهات الإلزامية' : 'Mandatory Videos'}</span>
              <CheckCircle2 className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white print:text-black">{analytics.mandatoryVideosCompletionRate}%</div>
            <p className="text-[10px] text-slate-500 font-medium">{isAr ? 'نسبة تلخيص المواد التدريبية' : 'Video summaries completed'}</p>
          </div>
        </div>

        {/* Automated Executive Summary Synthesis Box */}
        <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 p-6 rounded-2xl space-y-4 print:border-gray-300 print:bg-gray-50">
          <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-black text-sm print:text-black">
            <Sparkles className="w-4.5 h-4.5 text-indigo-600" />
            <span>{isAr ? 'الخلاصة والتوصيات التنفيذية الإستراتيجية:' : 'Automated Executive Synthesis & Recommendations:'}</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold leading-relaxed whitespace-pre-line print:text-black">
            {analytics.executiveNotes}
          </p>

          {/* Custom Leader Directives Box */}
          {leaderNotes && (
            <div className="pt-3 border-t border-indigo-200/60 dark:border-indigo-900/40 space-y-1">
              <span className="text-[11px] font-black text-indigo-900 dark:text-indigo-200 print:text-black uppercase">
                {isAr ? 'توجيهات وأولويات القيادة العليا لهذا التقرير:' : 'Executive Directives & Leader Priority Notes:'}
              </span>
              <p className="text-xs text-slate-800 dark:text-slate-200 font-bold leading-relaxed whitespace-pre-line print:text-black">
                {leaderNotes}
              </p>
            </div>
          )}
        </div>

        {/* Render Custom Report Items & Highlights on Screen */}
        {customReportItems.length > 0 && (
          <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-5 rounded-2xl space-y-3 print:border-gray-300">
            <h4 className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{isAr ? 'بنود وإنجازات وملاحظات خاصة بالتقرير:' : 'Custom Report Items & Highlights:'}</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {customReportItems.map(item => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border text-xs ${
                    item.type === 'highlight'
                      ? 'bg-amber-100/60 dark:bg-amber-900/30 border-amber-200/80 text-amber-900 dark:text-amber-200'
                      : item.type === 'decision'
                      ? 'bg-blue-100/60 dark:bg-blue-900/30 border-blue-200/80 text-blue-900 dark:text-blue-200'
                      : item.type === 'warning'
                      ? 'bg-red-100/60 dark:bg-red-900/30 border-red-200/80 text-red-900 dark:text-red-200'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <p className="font-extrabold flex items-center gap-1.5">
                    <span className="text-[10px] font-black opacity-80 px-1.5 py-0.5 bg-black/5 rounded">[{item.type === 'highlight' ? 'إنجاز' : item.type === 'decision' ? 'قرار إداري' : item.type === 'warning' ? 'تنبيه' : 'ملاحظة'}]</span>
                    <span>{item.title}</span>
                  </p>
                  {item.content && <p className="text-[11px] font-medium mt-1 leading-relaxed opacity-90">{item.content}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Committee-by-Committee Detailed Breakdown Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-black text-slate-900 dark:text-white print:text-black flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>{isAr ? 'تفاصيل ومؤشرات أداء اللجان المختصة (Committee Breakdown)' : 'Committee Breakdown & Analytics'}</span>
          </h3>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl print:border-gray-300">
            <table className="w-full min-w-[650px] text-start text-xs font-semibold">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 uppercase text-[10px] tracking-wider print:bg-gray-100 print:text-black">
                  <th className="py-3 px-4 text-start">{isAr ? 'اللجنة' : 'Committee'}</th>
                  <th className="py-3 px-4 text-start">{isAr ? 'عدد الأعضاء' : 'Members'}</th>
                  <th className="py-3 px-4 text-start">{isAr ? 'المهام والتسليمات' : 'Tasks & Submissions'}</th>
                  <th className="py-3 px-4 text-start">{isAr ? 'متوسط الدرجات' : 'Avg Grade'}</th>
                  <th className="py-3 px-4 text-start">{isAr ? 'نسبة الحضور' : 'Attendance %'}</th>
                  <th className="py-3 px-4 text-start">{isAr ? 'المتميز الأول باللجنة' : 'Top Performer'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 print:divide-gray-300 print:text-black">
                {filteredBreakdown.map(c => (
                  <tr key={c.committee} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                    <td className="py-3.5 px-4 font-black text-indigo-600 dark:text-indigo-400 print:text-black">{c.committee} Committee</td>
                    <td className="py-3.5 px-4 font-bold">{c.totalMembers} {isAr ? 'عضو' : 'members'}</td>
                    <td className="py-3.5 px-4">{c.completedSubmissionsCount} / {c.activeTasksCount} {isAr ? 'تسليم' : 'subs'}</td>
                    <td className="py-3.5 px-4 font-bold text-amber-600 dark:text-amber-400 print:text-black">{c.avgSubmissionGrade}/100</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400 print:text-black">{c.attendanceRatePercentage}%</td>
                    <td className="py-3.5 px-4 font-bold">{c.topPerformerName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signature & Seal Footer — 2 HR Signatures */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-700 dark:text-slate-200 font-bold print:border-gray-300 print:text-black">
          <div className="flex items-center gap-3">
            <div className="relative w-20 h-20 rounded-full border-2 border-blue-600 bg-blue-50/20 flex items-center justify-center p-1 -rotate-12 shrink-0 shadow-sm" style={{ borderColor: '#1b4cd3' }}>
              <div className="w-14 h-14 rounded-full border-2 border-double border-blue-600 flex flex-col items-center justify-center p-1 text-center bg-white dark:bg-slate-900">
                <span className="text-[4px] font-black text-blue-700 leading-none">★ EYE GHARBIA ★</span>
                <img src="/eye-logo-transparent.png" alt="seal logo" className="w-5 h-5 object-contain my-0.5" />
                <span className="text-[4px] font-bold text-blue-800 font-mono leading-none">OFFICIAL REPORT</span>
              </div>
            </div>
            <div className="space-y-0.5 text-start">
              <div className="text-xs font-black text-blue-900 dark:text-blue-200">{isAr ? '• التقرير التنفيذي المعتمد لكيان EYE •' : '• EYE Certified Executive Report •'}</div>
              <div className="text-[10px] text-slate-500 font-bold">{isAr ? 'محافظة الغربية — كيان المصريون الشباب' : 'Gharbia Governorate — EYE Entity'}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-center w-full sm:w-auto">
            {/* Signature 1: مسؤول لجنة الموارد البشرية */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 mb-1">
                {isAr ? 'مسؤول لجنة الموارد البشرية' : 'HR Committee Head'}
              </span>
              <span className="text-base font-black text-slate-900 dark:text-white" style={{ fontFamily: "'Aldhabi', 'Aref Ruqaa', 'Amiri', 'Traditional Arabic', serif", fontSize: '16px' }}>أحمد إبراهيم</span>
              <div className="w-28 h-px bg-blue-500 my-1" />
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">أ. أحمد إبراهيم</span>
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {/* ========== ADMIN DATA REPORTS TAB ========== */}
      {activeTab === 'admin' && (
        <div className="space-y-6">
          {/* Header Panel */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
            <div className="space-y-1">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Table className="w-5 h-5 text-amber-500" />
                {isAr ? 'مركز البيانات والتقارير الإدارية التفصيلية' : 'EYE Statistical Compiler Hub'}
              </h2>
              <p className="text-[10px] text-slate-500">{isAr ? 'استعراض بيانات الأعضاء واللجان والتسليمات وتصديرها فورياً.' : 'Formulate detailed matrices, delay registers and organizational audits instantly.'}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={exportCSV}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-500" />
                {isAr ? 'تصدير CSV' : 'CSV Export'}
              </button>
              <button
                onClick={exportExcel}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-500" />
                {isAr ? 'تصدير Excel' : 'Excel Export'}
              </button>
              <button
                onClick={handlePrintReport}
                className="px-3 py-1.5 bg-eye-brand hover:bg-eye-brand-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                {isAr ? 'طباعة التقرير' : 'Print Report'}
              </button>
            </div>
          </div>

          {/* Tabs list selector */}
          <div className="flex gap-2 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto print:hidden">
            {[
              { key: 'members' as const, label: isAr ? 'تقرير الأعضاء' : 'Members Report' },
              { key: 'committees' as const, label: isAr ? 'تقرير اللجان' : 'Committee Report' },
              { key: 'departments' as const, label: isAr ? 'تقرير الأقسام' : 'Department Report' },
              { key: 'submissions' as const, label: isAr ? 'تقرير التسليمات' : 'Submissions Report' },
              { key: 'meetings' as const, label: isAr ? 'تقرير الاجتماعات 🗓️' : 'Meetings Report 🗓️' },
              { key: 'workplans' as const, label: isAr ? 'المهام الإدارية 🎯' : 'Admin Tasks 🎯' },
              { key: 'late' as const, label: isAr ? 'تقرير المتأخرين' : 'Late Submissions Report' },
              { key: 'certificates' as const, label: isAr ? 'الشهادات' : 'Certificates' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setAdminReportType(tab.key)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  adminReportType === tab.key ? 'bg-eye-brand text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.key === 'certificates' && <Award className="w-3 h-3" />}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Certificates Tab */}
          {adminReportType === 'certificates' ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  {isAr ? 'شهادات التقدير والإتمام' : 'Certificates of Achievement'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">{adminSubmissions.filter(s => s.status === 'Accepted').length} {isAr ? 'تسليم مقبول' : 'accepted submissions'}</span>
              </div>
              {adminSubmissions.filter(s => s.status === 'Accepted').length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center gap-2">
                  <Award className="w-8 h-8 text-amber-300" />
                  <p>{isAr ? 'لا توجد تسليمات مقبولة بعد. قم بقبول التسليمات لإصدار الشهادات.' : 'No accepted submissions yet. Accept submissions to issue certificates.'}</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {adminSubmissions.filter(s => s.status === 'Accepted').map(sub => {
                    const grade = (sub as any).grade as number | undefined;
                    const reviewer = (sub as any).reviewedBy as string | undefined;
                    return (
                      <div key={sub.id} className="flex items-center gap-3 p-3.5 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/40 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                          <Award className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{sub.memberName}</p>
                          <p className="text-[10px] text-slate-500 truncate">{sub.taskName} • {sub.department}</p>
                          {grade !== undefined && <p className="text-[10px] font-mono text-emerald-600 font-bold">{isAr ? 'الدرجة' : 'Grade'}: {grade}/100</p>}
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => downloadCertificate({
                              memberName: sub.memberName,
                              taskName: sub.taskName,
                              grade: grade ?? 80,
                              reviewerName: reviewer ?? 'EYE Leadership',
                              committee: sub.committee,
                              department: sub.department,
                              date: new Date().toLocaleDateString('ar-EG'),
                            })}
                            className="px-2.5 py-1.5 bg-eye-brand text-white rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-eye-brand-dark transition-colors cursor-pointer"
                          >
                            <Download className="w-3 h-3" /> PNG
                          </button>
                          <button
                            onClick={() => printCertificate({
                              memberName: sub.memberName,
                              taskName: sub.taskName,
                              grade: grade ?? 80,
                              reviewerName: reviewer ?? 'EYE Leadership',
                              committee: sub.committee,
                              department: sub.department,
                              date: new Date().toLocaleDateString('ar-EG'),
                            })}
                            className="px-2.5 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                          >
                            <Printer className="w-3 h-3" /> PDF
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Preview compiled admin data list */
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{isAr ? 'معاينة التقرير المباشرة' : 'Live Computed Report Preview'}</span>
                <span className="text-[10px] font-mono text-slate-400 font-bold">{isAr ? 'الصفوف' : 'Rows'}: {adminCompiledData.length}</span>
              </div>

              {adminCompiledData.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center gap-2">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                  <p>{isAr ? 'لا توجد بيانات مطابقة لهذا التصنيف حالياً.' : 'No late delays or records to match inside this category index.'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-slate-150 dark:border-slate-700 rounded-xl">
                  <table className="w-full text-start text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-800">
                        {Object.keys(adminCompiledData[0]).map((h, i) => (
                          <th key={i} className="p-3.5 whitespace-nowrap text-start">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {adminCompiledData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/20 dark:hover:bg-amber-950/10 transition-colors">
                          {Object.values(row).map((val, vIdx) => (
                            <td key={vIdx} className="p-3.5 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">{String(val)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========== MONTHLY PERFORMANCE REPORTS TAB ========== */}
      {activeTab === 'perf' && (
        <PerformanceReports currentUser={currentUser} />
      )}
    </div>
  );
};
