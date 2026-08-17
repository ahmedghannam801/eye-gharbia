import React, { useState } from 'react';
import { db } from '../db/localDb';
import { UserProfile, CommitteeReport } from '../types';
import { BarChart2, RefreshCw, TrendingUp, Users, CheckSquare, Star, Calendar, Download } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

import { fillAndDownloadDocxTemplate } from '../lib/docxFiller';
import { printDedicatedOfficialDocument } from '../lib/dedicatedPrint';
import { Printer } from 'lucide-react';

interface PerformanceReportsProps { currentUser: UserProfile; }

const COMMITTEES = ['HR', 'PR', 'SM', 'OR'];

const BarChart: React.FC<{ value: number; max: number; color: string; label: string }> = ({ value, max, color, label }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const ReportCard: React.FC<{ report: CommitteeReport; ar: boolean }> = ({ report, ar }) => {
  const completionRate = report.totalMembers > 0 ? Math.round((report.completedTasks / Math.max(report.activeTasks, 1)) * 100) : 0;

  const handleExportDocx = () => {
    let fullBodyText = `نطاق وموضوع التقرير: التقييم والأداء الشهري الرسمي للجنة ${report.committee} عن شهر ${report.month}\n\n`;

    fullBodyText += `المؤشرات الكلية والأرقام القياسية للجنة:\n`;
    const kpis = {
      members: report.totalMembers,
      tasks: report.activeTasks,
      completionRate: completionRate,
      avgGrade: report.avgGrade,
      attendanceRate: report.attendanceRate,
      videoRate: 90
    };
    fullBodyText += `[KPI_CARDS_JSON]${JSON.stringify(kpis)}\n\n`;

    fullBodyText += `حصر وتقييم أداء أعضاء لجنة ${report.committee}:\n`;
    const headers = ['اسم اللجنة', 'الفترة', 'عدد الأعضاء', 'المهام المنجزة', 'متوسط الدرجات', 'نسبة الحضور', 'نسبة الإنجاز'];
    const rows = [[
      `لجنة ${report.committee}`,
      report.month,
      `${report.totalMembers} عضو`,
      `${report.completedTasks} / ${report.activeTasks}`,
      `${report.avgGrade}%`,
      `${report.attendanceRate}%`,
      `${completionRate}%`
    ]];
    fullBodyText += `[TABLE_JSON]${JSON.stringify({ headers, rows, headerBg: '1B4CD3' })}\n\n`;

    // OKR Work Plans Linked Section
    if (report.linkedWorkPlans && report.linkedWorkPlans.length > 0) {
      fullBodyText += `ربط التقرير بجدول خطط العمل والأهداف التشغيلية (OKRs):\n`;
      const okrHeaders = ['عنوان الخطة / التكليف الاستراتيجي', 'الهدف المرتبط', 'الحالة التشغيلية', 'نسبة التقدم %'];
      const okrRows = report.linkedWorkPlans.map(wp => [
        wp.title,
        wp.objective || '—',
        wp.status === 'Completed' ? 'مكتملة ✅' : wp.status === 'At Risk' ? 'معرضة للمخاطر ⚠️' : wp.status === 'Behind' ? 'متأخرة 🔴' : 'قيد التنفيذ 🎯',
        `${wp.progress}%`
      ]);
      fullBodyText += `[TABLE_JSON]${JSON.stringify({ headers: okrHeaders, rows: okrRows, headerBg: '7C3AED' })}\n\n`;
    }

    if (report.topMemberName && report.topMemberName !== '—') {
      fullBodyText += `تكريم وتحديد العضو المتميز باللجنة:\n`;
      const topHeaders = ['اللقب والتكريم', 'اسم العضو المتميز', 'عدد المهام المنجزة'];
      const topRows = [['المتفوق الأبرز باللجنة', report.topMemberName, `${report.topMemberScore} مهمة منجزة`]];
      fullBodyText += `[TABLE_JSON]${JSON.stringify({ headers: topHeaders, rows: topRows, headerBg: '059669' })}\n\n`;
    }

    fullBodyText += `توجيهات واعتمادات الموارد البشرية:\n`;
    fullBodyText += `تنبيه وتوجيه لكافة أعضاء اللجنة للاستمرار في رفع الكفاءة والالتزام بالتسليمات في المواعيد المقررة ومتابعة الأهداف التشغيلية OKRs.\n\n`;

    fullBodyText += `═════════════════════════════════════════════════════\n`;
    fullBodyText += `              • الاعتماد والتوقيعات الرسمية •\n`;
    fullBodyText += `═════════════════════════════════════════════════════\n\n`;
    fullBodyText += `مسؤول لجنة الموارد البشرية\n`;
    fullBodyText += `   أ. أحمد إبراهيم\n`;

    fillAndDownloadDocxTemplate('bg_report', {
      reportTitle: `تقرير الأداء الشهري وخطط العمل - لجنة ${report.committee}`,
      reportBody: fullBodyText,
      hrManager: 'أحمد إبراهيم'
    });
  };

  const handlePrintPdf = () => {
    const reportHtml = `
      <div style="font-family: 'Cairo', sans-serif;">
        <h2 style="font-size: 16px; font-weight: 800; color: #1b4cd3; margin-bottom: 12px; border-bottom: 2px solid #1b4cd3; padding-bottom: 6px;">
          تقرير الأداء والتقييم الشهري الرسمي وخطط OKRs — لجنة ${report.committee} (${report.month})
        </h2>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;">
          <div style="background: #eff6ff; padding: 10px; border-radius: 8px; text-align: center;">
            <div style="font-size: 10px; color: #475569;">عدد الأعضاء</div>
            <div style="font-size: 16px; font-weight: 800; color: #1b4cd3;">${report.totalMembers} عضو</div>
          </div>
          <div style="background: #f5f3ff; padding: 10px; border-radius: 8px; text-align: center;">
            <div style="font-size: 10px; color: #475569;">المهام المنجزة</div>
            <div style="font-size: 16px; font-weight: 800; color: #7c3aed;">${report.completedTasks} / ${report.activeTasks}</div>
          </div>
          <div style="background: #ecfdf5; padding: 10px; border-radius: 8px; text-align: center;">
            <div style="font-size: 10px; color: #475569;">متوسط الدرجات</div>
            <div style="font-size: 16px; font-weight: 800; color: #059669;">${report.avgGrade}%</div>
          </div>
          <div style="background: #fffbeb; padding: 10px; border-radius: 8px; text-align: center;">
            <div style="font-size: 10px; color: #475569;">نسبة الحضور</div>
            <div style="font-size: 16px; font-weight: 800; color: #d97706;">${report.attendanceRate}%</div>
          </div>
        </div>

        ${report.linkedWorkPlans && report.linkedWorkPlans.length > 0 ? `
          <div style="margin-bottom: 16px;">
            <h3 style="font-size: 12px; font-weight: 800; color: #7c3aed; margin-bottom: 6px;">🎯 الأهداف الاستراتيجية وخطط العمل التشغيلية (OKRs):</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              <thead>
                <tr style="background: #7c3aed; color: white;">
                  <th style="padding: 5px; border: 1px solid #cbd5e1;">عنوان الخطة</th>
                  <th style="padding: 5px; border: 1px solid #cbd5e1;">الهدف</th>
                  <th style="padding: 5px; border: 1px solid #cbd5e1;">الحالة</th>
                  <th style="padding: 5px; border: 1px solid #cbd5e1;">التقدم</th>
                </tr>
              </thead>
              <tbody>
                ${report.linkedWorkPlans.map(wp => `
                  <tr>
                    <td style="padding: 5px; border: 1px solid #cbd5e1;"><strong>${wp.title}</strong></td>
                    <td style="padding: 5px; border: 1px solid #cbd5e1;">${wp.objective || '—'}</td>
                    <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: center;">${wp.status}</td>
                    <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #7c3aed;">${wp.progress}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${report.topMemberName && report.topMemberName !== '—' ? `
          <div style="background: #fffbeb; border-right: 4px solid #d97706; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
            <strong style="color: #d97706; font-size: 12px;">[العضو المتميز] : ${report.topMemberName}</strong>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #475569;">أنجز ${report.topMemberScore} مهمة بنجاح وبأعلى تقييم باللجنة.</p>
          </div>
        ` : ''}
      </div>
    `;

    printDedicatedOfficialDocument({
      title: `تقرير أداء لجنة ${report.committee} وخطط OKRs - ${report.month}`,
      docNumber: `EYE-PERF-${Date.now().toString().slice(-6)}`,
      bodyHtml: reportHtml,
      signatures: [
        { title: 'مسؤول لجنة الموارد البشرية', name: 'أحمد إبراهيم' }
      ]
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-5 hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-eye-brand">{report.committee}</span>
            <span className="text-xs font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">{report.month}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">{ar ? 'صدر بواسطة' : 'Generated by'}: {report.generatedBy}</p>
        </div>
        <div className={`text-center px-4 py-2 rounded-2xl ${completionRate >= 75 ? 'bg-emerald-50 dark:bg-emerald-950/30' : completionRate >= 40 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
          <p className={`text-2xl font-black ${completionRate >= 75 ? 'text-emerald-600' : completionRate >= 40 ? 'text-amber-600' : 'text-red-500'}`}>{completionRate}%</p>
          <p className={`text-[9px] font-bold ${completionRate >= 75 ? 'text-emerald-500' : completionRate >= 40 ? 'text-amber-500' : 'text-red-400'}`}>{ar ? 'معدل الإنجاز' : 'Completion'}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: ar ? 'الأعضاء' : 'Members', value: report.totalMembers, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', icon: <Users className="w-4 h-4" /> },
          { label: ar ? 'المهام المنجزة' : 'Completed', value: report.completedTasks, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: <CheckSquare className="w-4 h-4" /> },
          { label: ar ? 'متوسط الدرجات' : 'Avg Grade', value: `${report.avgGrade}%`, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30', icon: <Star className="w-4 h-4" /> },
          { label: ar ? 'نسبة الحضور' : 'Attendance', value: `${report.attendanceRate}%`, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', icon: <Calendar className="w-4 h-4" /> },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} rounded-2xl p-3 text-center`}>
            <div className={`flex justify-center mb-1 ${stat.color}`}>{stat.icon}</div>
            <p className={`text-lg font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-[9px] text-slate-500 font-bold">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Linked OKR Plans Section */}
      {report.linkedWorkPlans && report.linkedWorkPlans.length > 0 && (
        <div className="bg-purple-50/60 dark:bg-purple-950/20 rounded-2xl p-3.5 border border-purple-100 dark:border-purple-900/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
              <span>🎯</span>
              <span>{ar ? 'خطط العمل المرتبطة (OKRs)' : 'Linked Work Plans (OKRs)'}</span>
            </span>
            <span className="text-[10px] font-bold text-purple-600 bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded-full">
              {report.okrAvgProgress || 0}% {ar ? 'متوسط الإنجاز' : 'Avg Progress'}
            </span>
          </div>
          <div className="space-y-1.5">
            {report.linkedWorkPlans.map((wp, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 p-2 rounded-xl border border-purple-100 dark:border-slate-700">
                <span className="font-bold text-slate-800 dark:text-slate-200">{wp.title}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500">{wp.status}</span>
                  <span className="text-[11px] font-black text-purple-600 font-mono">{wp.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Bars */}
      <div className="space-y-2.5">
        <BarChart value={report.completedTasks} max={report.activeTasks} color="bg-emerald-500" label={ar ? `مهام منجزة / ${report.activeTasks} إجمالي` : `${report.completedTasks} / ${report.activeTasks} tasks`} />
        <BarChart value={report.avgGrade} max={100} color="bg-purple-500" label={ar ? 'متوسط الدرجات' : 'Average Grade'} />
        <BarChart value={report.attendanceRate} max={100} color="bg-amber-500" label={ar ? 'نسبة الحضور' : 'Attendance Rate'} />
      </div>

      {/* Top Performer */}
      {report.topMemberName && report.topMemberName !== '—' && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-2xl p-3 border border-amber-100 dark:border-amber-900/30">
          <div className="text-2xl">🏆</div>
          <div>
            <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">{ar ? 'العضو المتميز' : 'Top Member'}</p>
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">{report.topMemberName}</p>
            <p className="text-[10px] text-slate-500">{report.topMemberScore} {ar ? 'مهمة منجزة' : 'completed tasks'}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
        <button
          onClick={handleExportDocx}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition-all shadow-sm cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{ar ? 'تصدير Word (.docx) الأصلي' : 'Export Word (.docx)'}</span>
        </button>
        <button
          onClick={handlePrintPdf}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold transition-all shadow-sm cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>{ar ? 'طباعة PDF الرسمي' : 'Print PDF'}</span>
        </button>
      </div>
    </div>
  );
};

export const PerformanceReports: React.FC<PerformanceReportsProps> = ({ currentUser }) => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const canGenerate = ['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator'].includes(currentUser.role);
  const [selectedCommittee, setSelectedCommittee] = useState('HR');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState('');
  const [filterCommittee, setFilterCommittee] = useState('all');

  const reports = db.getReports();
  const filteredReports = filterCommittee === 'all' ? reports : reports.filter(r => r.committee === filterCommittee);

  const handleGenerate = async () => {
    setGenerating(true);
    setSuccess('');
    await new Promise(r => setTimeout(r, 800)); // visual feedback delay
    db.generateCommitteeReport(selectedCommittee, selectedMonth, currentUser);
    setGenerating(false);
    setSuccess(ar ? `تم توليد تقرير ${selectedCommittee} للشهر ${selectedMonth} بنجاح!` : `Report for ${selectedCommittee} (${selectedMonth}) generated!`);
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6" dir={ar ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-200">
          <BarChart2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white">{ar ? 'تقارير الأداء الشهرية' : 'Monthly Performance Reports'}</h1>
          <p className="text-xs text-slate-500">{ar ? 'تتبع أداء كل لجنة وعرض الإحصائيات التفصيلية' : 'Track committee performance with detailed stats'}</p>
        </div>
      </div>

      {/* Generate Panel */}
      {canGenerate && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
          <h3 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            {ar ? 'توليد تقرير جديد' : 'Generate New Report'}
          </h3>
          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-700 animate-fade-in">{success}</div>
          )}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase">{ar ? 'اللجنة' : 'Committee'}</label>
              <select value={selectedCommittee} onChange={e => setSelectedCommittee(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-bold">
                {COMMITTEES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase">{ar ? 'الشهر' : 'Month'}</label>
              <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-bold" />
            </div>
            <button onClick={handleGenerate} disabled={generating}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black px-5 py-2 rounded-xl text-xs shadow-md transition-all disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              {generating ? (ar ? 'جاري التوليد...' : 'Generating...') : (ar ? 'توليد التقرير' : 'Generate Report')}
            </button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilterCommittee('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${filterCommittee === 'all' ? 'bg-eye-brand text-white border-eye-brand' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
          {ar ? 'الكل' : 'All'} ({reports.length})
        </button>
        {COMMITTEES.map(c => (
          <button key={c} onClick={() => setFilterCommittee(c)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${filterCommittee === c ? 'bg-eye-brand text-white border-eye-brand' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
            {c} ({reports.filter(r => r.committee === c).length})
          </button>
        ))}
      </div>

      {/* Reports Grid */}
      {filteredReports.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-bold">{ar ? 'لا توجد تقارير بعد' : 'No reports generated yet'}</p>
          {canGenerate && <p className="text-xs mt-1">{ar ? 'اضغط "توليد التقرير" لبدء المتابعة' : 'Click "Generate Report" to start tracking'}</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredReports.map(r => <ReportCard key={r.id} report={r} ar={ar} />)}
        </div>
      )}
    </div>
  );
};
