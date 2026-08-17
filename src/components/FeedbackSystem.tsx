import React, { useState, useEffect, useMemo } from 'react';
import { db, calculateMemberAVG } from '../db/localDb';
import { UserProfile, LeaderFeedback, MemberEvaluation } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { Star, MessageSquare, CheckCircle2, ShieldAlert, BarChart3, ChevronDown, ChevronUp, Eye, EyeOff, Sparkles, Search, Sliders, X, Users, Award, FileSpreadsheet, Trophy, Printer, Download, FileText, ArrowRight } from 'lucide-react';
import { GoogleSheetSyncModal } from './GoogleSheetSync';
import { Leaderboard } from './Leaderboard';
import { fillAndDownloadDocxTemplate } from '../lib/docxFiller';
import { printDedicatedOfficialDocument } from '../lib/dedicatedPrint';
import { export365EvaluationToExcel } from '../lib/excelExport';

interface FeedbackSystemProps {
  currentUser: UserProfile;
  initialTab?: 'leaderboard' | 'evaluations';
  onNavigateToView?: (view: string, targetId?: string) => void;
}

const StarRating: React.FC<{ value: number; onChange?: (v: number) => void; size?: string }> = ({ value, onChange, size = 'w-5 h-5' }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(n => (
      <Star
        key={n}
        className={`${size} transition-colors ${onChange ? 'cursor-pointer hover:scale-110' : ''} ${n <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
        onClick={() => onChange?.(n)}
      />
    ))}
  </div>
);

const avg = (nums: number[]) => nums.length ? +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : 0;

export const FeedbackSystem: React.FC<FeedbackSystemProps> = ({ currentUser, initialTab = 'evaluations', onNavigateToView }) => {
  const { language, isRtl, translateCommittee, translateDepartment } = useLanguage();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'leaderboard' | 'evaluations'>(initialTab);
  const [allUsersList, setAllUsersList] = useState<UserProfile[]>([]);
  const [evaluationsMap, setEvaluationsMap] = useState<Record<string, MemberEvaluation[]>>({});
  const [feedbackMap, setFeedbackMap] = useState<Record<string, LeaderFeedback[]>>({});
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [committeeFilter, setCommitteeFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'leaders' | 'members' | 'executive'>('all');

  // Rating Modal State
  const [targetPerson, setTargetPerson] = useState<UserProfile | null>(null);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<'ok' | null>(null);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);

  // Numerical points ratings (BHV, Interaction, Bonus)
  const [bhvScore, setBhvScore] = useState(10);
  const [interactionScore, setInteractionScore] = useState(13);
  const [bonusScore, setBonusScore] = useState(0);
  const [comment, setComment] = useState('');

  const loadData = () => {
    // Fetch ALL active users in the entity (Members + Leaders + Admins)
    const users = db.getUsers().filter(u => u.status === 'Active');
    setAllUsersList(users);

    const evMap: Record<string, MemberEvaluation[]> = {};
    const fbMap: Record<string, LeaderFeedback[]> = {};

    users.forEach(u => {
      evMap[u.id] = db.getMemberEvaluations(u.id);
      fbMap[u.id] = db.getLeaderFeedback(u.id);
    });

    setEvaluationsMap(evMap);
    setFeedbackMap(fbMap);
  };

  useEffect(() => {
    loadData();
    const unsub = db.onChange(loadData);
    return () => unsub();
  }, []);

  // Filter members list — Excludes Vice, Coordinators, and Super Admin from evaluation targets
  const filteredUsers = useMemo(() => {
    return allUsersList.filter(u => {
      // Exclude Executive Officers (Vice, Coordinator, Deputy Coordinator, Super Admin) from being rating targets
      const isTargetable = u.role === 'Leader' || u.role === 'Member';
      if (!isTargetable) return false;

      const matchesSearch = u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            u.membershipCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCommittee = committeeFilter === 'all' || u.committee === committeeFilter;
      
      let matchesRole = true;
      if (roleFilter === 'leaders') {
        matchesRole = u.role === 'Leader';
      } else if (roleFilter === 'members') {
        matchesRole = u.role === 'Member';
      }

      return matchesSearch && matchesCommittee && matchesRole;
    });
  }, [allUsersList, searchQuery, committeeFilter, roleFilter]);

  // Permission logic: SuperAdmin/Vice can rate Leaders & Members; Leaders can rate Members
  const canUserRateTarget = (evaluator: UserProfile, target: UserProfile): boolean => {
    if (evaluator.id === target.id) return false;

    const isExecOrVice = ['Super Admin', 'Coordinator', 'Deputy Coordinator', 'Vice'].includes(evaluator.role);
    const isLeader = evaluator.role === 'Leader';
    const targetIsLeader = target.role === 'Leader';
    const targetIsMember = target.role === 'Member';

    if (isExecOrVice && (targetIsLeader || targetIsMember)) return true; // Super Admin & Vice can rate Leaders and Members
    if (isLeader && targetIsMember) return true; // Leaders can rate regular Members
    return false;
  };

  const handleGenerateAiFeedbackDraft = () => {
    const feedbackDraft = isAr
      ? `• **نقاط القوة:** التزام مميز بمواعيد التسليم، وتواصل فعّال وإيجابي مع زملائه في الفريق.\n` +
        `• **مجال التطوير:** مواصلة المبادرة بطرح أفكار إبداعية في الفعاليات القادمة.`
      : `• **Strengths:** Excellent communication and proactive support for team members.\n` +
        `• **Growth Area:** Early coordination prior to task deadlines.`;

    setComment(feedbackDraft);
    setBhvScore(10);
    setInteractionScore(13);
    setBonusScore(0);
  };

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPerson) return;

    const mappedCommitment = Math.min(5, Math.max(0, Math.round(((bhvScore / 10) * 5) * 10) / 10));
    const mappedTeamwork = Math.min(5, Math.max(0, Math.round(((interactionScore / 13) * 5) * 10) / 10));
    const overall = Math.round(((mappedCommitment + mappedTeamwork) / 2) * 10) / 10;

    // 1. Add to member evaluations system
    db.addMemberEvaluation({
      targetUserId: targetPerson.id,
      targetUserName: targetPerson.fullName,
      targetUserRole: targetPerson.role,
      committee: targetPerson.committee,
      department: targetPerson.department,
      evaluatorId: currentUser.id,
      evaluatorName: currentUser.fullName,
      evaluatorRole: currentUser.role,
      overallRating: overall,
      commitmentRating: mappedCommitment,
      qualityRating: mappedCommitment,
      teamworkRating: mappedTeamwork,
      activityRating: mappedTeamwork,
      feedbackComment: comment.trim(),
    }, currentUser);

    // 2. Update bonus points
    await db.updateUserBonusPoints(targetPerson.id, bonusScore, currentUser);

    // 3. Also submit to leader feedback system if target is a Leader
    if (['Leader', 'Vice'].includes(targetPerson.role)) {
      db.submitLeaderFeedback({
        leaderId: targetPerson.id,
        leaderName: targetPerson.fullName,
        committee: targetPerson.committee,
        reviewerId: currentUser.id,
        isAnonymous: false,
        rating: overall,
        communication: mappedTeamwork,
        support: mappedCommitment,
        fairness: mappedCommitment,
        comment: comment.trim(),
      });
    }

    setSubmitResult('ok');
    loadData();
    setTimeout(() => {
      setSubmitResult(null);
      setTargetPerson(null);
      setComment('');
      setBhvScore(10);
      setInteractionScore(13);
      setBonusScore(0);
    }, 1500);
  };

  const handleExportDocx = () => {
    const isLeaderboard = activeTab === 'leaderboard';
    const selectedCommText = committeeFilter === 'all' ? 'جميع اللجان' : `لجنة ${committeeFilter}`;

    const targetMembers = allUsersList.filter(u => {
      const isTargetable = u.role === 'Member' || u.role === 'Leader';
      if (!isTargetable) return false;
      if (committeeFilter !== 'all' && u.committee !== committeeFilter) return false;
      return true;
    });

    const rankedMembers = targetMembers.map(u => {
      const evs = evaluationsMap[u.id] || [];
      const avgCommitment = evs.length ? avg(evs.map(e => e.commitmentRating || 5)) : 4.5;
      const avgQuality = evs.length ? avg(evs.map(e => e.qualityRating || 5)) : 4.5;
      const avgTeamwork = evs.length ? avg(evs.map(e => e.teamworkRating || 5)) : 4.5;
      const avgInitiative = evs.length ? avg(evs.map(e => e.activityRating || 5)) : 4.5;
      const overallScore = evs.length ? avg(evs.map(e => e.overallRating || 5)) : +((avgCommitment + avgQuality + avgTeamwork + avgInitiative) / 4).toFixed(1);
      const userPoints = (u as any).points || 0;
      const points = Math.round(overallScore * 200 + userPoints);
      return {
        id: u.id,
        fullName: u.fullName,
        committee: u.committee || 'العامة',
        department: u.department || 'عام',
        role: u.role,
        points,
        overallScore,
        avgCommitment,
        avgQuality,
        avgTeamwork,
        avgInitiative,
      };
    }).sort((a, b) => b.points - a.points);

    let fullBodyText = `نطاق وموضوع التقرير: التقرير التنفيذي الرسمي - ${isLeaderboard ? 'جدول وشرف لوحة الصدارة والتميز' : 'سجل تقييمات ومحاور كفاءة الأعضاء 360°'} (${selectedCommText})\n`;
    fullBodyText += `الفترة الزمنية: الأسبوع الحالي والتقييم الشهري  |  نطاق اللجنة: ${selectedCommText}\n\n`;

    fullBodyText += `المؤشرات الكلية لتقييمات وأداء الأعضاء:\n`;
    const kpis = {
      members: rankedMembers.length,
      tasks: rankedMembers.length * 3,
      completionRate: 92,
      avgGrade: Math.round(rankedMembers.reduce((acc, curr) => acc + curr.overallScore * 20, 0) / Math.max(rankedMembers.length, 1)),
      attendanceRate: 88,
      videoRate: 95
    };
    fullBodyText += `[KPI_CARDS_JSON]${JSON.stringify(kpis)}\n\n`;

    if (isLeaderboard) {
      fullBodyText += `جدول ترتيب وشرف صدارة المتميزين والأعضاء - ${selectedCommText}:\n`;
      const lbHeaders = ['الترتيب', 'اسم العضو / القائد', 'اللجنة', 'القسم', 'نقاط الصدارة', 'درجة التقييم 360°', 'وسام التميز'];
      const lbRows = rankedMembers.slice(0, 20).map((m, idx) => [
        `المركز ${idx + 1}`,
        m.fullName,
        `لجنة ${m.committee}`,
        m.department,
        `${m.points} نقطة`,
        `${m.overallScore} / 5`,
        idx === 0 ? 'وسام الصدارة الذهبي' : idx < 3 ? 'وسام التميز الفضي' : 'وسام الاجتهاد'
      ]);
      fullBodyText += `[TABLE_JSON]${JSON.stringify({ headers: lbHeaders, rows: lbRows, headerBg: '1B4CD3' })}\n\n`;
    } else {
      fullBodyText += `جدول نتائج التقييمات النوعية ومحاور الكفاءة 360° - ${selectedCommText}:\n`;
      const evHeaders = ['اسم العضو', 'اللجنة', 'الالتزام', 'جودة العمل', 'العمل الجماعي', 'الابتكار', 'التقييم الكلي'];
      const evRows = rankedMembers.slice(0, 20).map(m => [
        m.fullName,
        m.committee,
        `${m.avgCommitment} / 5`,
        `${m.avgQuality} / 5`,
        `${m.avgTeamwork} / 5`,
        `${m.avgInitiative} / 5`,
        `${m.overallScore} / 5`
      ]);
      fullBodyText += `[TABLE_JSON]${JSON.stringify({ headers: evHeaders, rows: evRows, headerBg: '7C3AED' })}\n\n`;
    }

    fullBodyText += `توجيهات واعتمادات الموارد البشرية:\n`;
    fullBodyText += `توجيه وتكريم كافة الأعضاء المتفوقين، وحث كافة اللجان على استمرار العطاء والتميز في الفعاليات والتكليفات القادمة.\n\n`;

    fullBodyText += `═════════════════════════════════════════════════════\n`;
    fullBodyText += `              • الاعتماد والتوقيعات الرسمية •\n`;
    fullBodyText += `═════════════════════════════════════════════════════\n\n`;
    fullBodyText += `مسؤول لجنة الموارد البشرية\n`;
    fullBodyText += `   أ. أحمد إبراهيم\n`;

    const reportTitle = isLeaderboard 
      ? `تقرير لوحة الصدارة والتميز - ${selectedCommText}` 
      : `تقرير تقييمات الأعضاء 360° - ${selectedCommText}`;

    fillAndDownloadDocxTemplate('bg_report', {
      reportTitle,
      reportBody: fullBodyText,
      hrManager: 'أحمد إبراهيم'
    });
  };

  const handlePrintPdf = () => {
    const isLeaderboard = activeTab === 'leaderboard';
    const selectedCommText = committeeFilter === 'all' ? 'جميع اللجان' : `لجنة ${committeeFilter}`;

    const targetMembers = allUsersList.filter(u => {
      const isTargetable = u.role === 'Member' || u.role === 'Leader';
      if (!isTargetable) return false;
      if (committeeFilter !== 'all' && u.committee !== committeeFilter) return false;
      return true;
    });

    const rankedMembers = targetMembers.map(u => {
      const evs = evaluationsMap[u.id] || [];
      const avgCommitment = evs.length ? avg(evs.map(e => e.commitmentRating || 5)) : 4.5;
      const avgQuality = evs.length ? avg(evs.map(e => e.qualityRating || 5)) : 4.5;
      const avgTeamwork = evs.length ? avg(evs.map(e => e.teamworkRating || 5)) : 4.5;
      const avgInitiative = evs.length ? avg(evs.map(e => e.activityRating || 5)) : 4.5;
      const overallScore = evs.length ? avg(evs.map(e => e.overallRating || 5)) : +((avgCommitment + avgQuality + avgTeamwork + avgInitiative) / 4).toFixed(1);
      const userPoints = (u as any).points || 0;
      const points = Math.round(overallScore * 200 + userPoints);
      return {
        fullName: u.fullName,
        committee: u.committee || 'العامة',
        department: u.department || 'عام',
        points,
        overallScore,
        avgCommitment,
        avgQuality,
        avgTeamwork,
        avgInitiative,
      };
    }).sort((a, b) => b.points - a.points);

    const titleStr = isLeaderboard 
      ? `تقرير شرف صدارة المتميزين — ${selectedCommText}` 
      : `تقرير نتائج تقييمات الأعضاء ومحاور الكفاءة 360° — ${selectedCommText}`;

    const reportHtml = `
      <div style="font-family: 'Cairo', sans-serif;">
        <h2 style="font-size: 16px; font-weight: 800; color: #1b4cd3; margin-bottom: 12px; border-bottom: 2px solid #1b4cd3; padding-bottom: 6px;">
          ${titleStr}
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px;">
          <thead>
            <tr style="background: ${isLeaderboard ? '#1b4cd3' : '#7c3aed'}; color: white;">
              ${isLeaderboard ? `
                <th style="padding: 6px; border: 1px solid #cbd5e1;">الترتيب</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">اسم العضو / القائد</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">اللجنة</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">القسم</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">مجموع النقاط</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">التقييم 360°</th>
              ` : `
                <th style="padding: 6px; border: 1px solid #cbd5e1;">اسم العضو</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">اللجنة</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">الالتزام</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">الجودة</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">العمل الجماعي</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">الابتكار</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">التقييم النهائي</th>
              `}
            </tr>
          </thead>
          <tbody>
            ${rankedMembers.slice(0, 20).map((m, idx) => `
              <tr>
                ${isLeaderboard ? `
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">المركز ${idx + 1}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1;"><strong>${m.fullName}</strong></td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${m.committee}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${m.department}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; color: #1b4cd3; font-weight: bold;">${m.points} نقطة</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; color: #059669; font-weight: bold;">${m.overallScore} / 5</td>
                ` : `
                  <td style="padding: 6px; border: 1px solid #cbd5e1;"><strong>${m.fullName}</strong></td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${m.committee}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${m.avgCommitment} / 5</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${m.avgQuality} / 5</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${m.avgTeamwork} / 5</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${m.avgInitiative} / 5</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; color: #7c3aed; font-weight: bold;">${m.overallScore} / 5</td>
                `}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    printDedicatedOfficialDocument({
      title: titleStr,
      docNumber: `EYE-EVAL-${Date.now().toString().slice(-6)}`,
      bodyHtml: reportHtml,
      signatures: [
        { title: 'مسؤول لجنة الموارد البشرية', name: 'أحمد إبراهيم' }
      ]
    });
  };

  // 365-Day Evaluation Handlers (PDF & Excel Exports)
  const handleExport365Pdf = () => {
    const isLeadersFilter = roleFilter === 'leaders';
    const roleTitle = isLeadersFilter ? 'القادة والرؤساء' : roleFilter === 'members' ? 'الأعضاء' : 'الأعضاء والقادة';
    const selectedCommText = committeeFilter === 'all' ? 'جميع اللجان' : `لجنة ${committeeFilter}`;

    const targetMembers = allUsersList.filter(u => {
      const isTargetable = u.role === 'Member' || u.role === 'Leader';
      if (!isTargetable) return false;
      if (roleFilter === 'leaders' && u.role !== 'Leader') return false;
      if (roleFilter === 'members' && u.role !== 'Member') return false;
      if (committeeFilter !== 'all' && u.committee !== committeeFilter) return false;
      return true;
    });

    const meetings = db.getMeetings();
    const attendance = db.getAllAttendance();
    const tasks = db.getTasks();
    const submissions = db.getSubmissions();
    const excuses = db.getExcuseRequests();
    const evaluations = db.getMemberEvaluations();

    const rowsHtml = targetMembers.map((u, i) => {
      const bd = calculateMemberAVG(
        u.id,
        meetings,
        attendance,
        tasks,
        submissions,
        excuses,
        evaluations,
        u.bonusPoints || 0
      );

      let grade = bd.hasActualEvents ? 'يحتاج إلى تطوير' : 'لا توجد بيانات';
      let gradeColor = bd.hasActualEvents ? '#dc2626' : '#64748b';
      if (bd.hasActualEvents) {
        if (bd.avgScore >= 90) { grade = 'ممتاز مرتفع جداً'; gradeColor = '#059669'; }
        else if (bd.avgScore >= 80) { grade = 'ممتاز'; gradeColor = '#10b981'; }
        else if (bd.avgScore >= 70) { grade = 'جيد جداً'; gradeColor = '#2563eb'; }
        else if (bd.avgScore >= 60) { grade = 'جيد'; gradeColor = '#d97706'; }
        else if (bd.avgScore >= 50) { grade = 'مقبول'; gradeColor = '#475569'; }
      }

      return `
        <tr>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${i + 1}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1;"><strong>${u.fullName}</strong></td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${u.governorate || 'الغربية'}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${u.role} (لجنة ${u.committee || 'العامة'})</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${bd.hasActualEvents ? `${bd.onlineMeetingsCount} أونلاين (${bd.onlineMeetingsEarned}ن) / ${bd.offlineMeetingsCount} أوفلاين (${bd.offlineMeetingsEarned}ن)` : '—'}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${bd.hasActualEvents ? `${bd.completedTasksCount} مهمة (${bd.tasksEarned}ن)` : '—'}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${bd.excusedMeetingsCount + bd.excusedTasksCount} أعذار مقبولة</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${bd.hasActualEvents ? `${bd.earnedPoints} / ${bd.maxPoints}` : '—'}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #d97706;">+${bd.bonusPoints}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-size: 14px; font-weight: 900; color: #1b4cd3;">${bd.displayText}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: ${gradeColor};">${grade}</td>
        </tr>
      `;
    }).join('');

    const reportHtml = `
      <div style="font-family: 'Cairo', sans-serif;">
        <h2 style="font-size: 16px; font-weight: 800; color: #1b4cd3; margin-bottom: 12px; border-bottom: 2px solid #1b4cd3; padding-bottom: 6px;">
          تقرير التقييم الشامل 365 يوماً — ${roleTitle} (${selectedCommText})
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <thead>
            <tr style="background: #1b4cd3; color: white;">
              <th style="padding: 6px; border: 1px solid #cbd5e1;">#</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1;">اسم العضو</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1;">المحافظة</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1;">المنصب واللجنة</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1;">الميتينجات والنقاط</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1;">التاسكات والنقاط</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1;">الأعذار المقبولة</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1;">إجمالي النقاط</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1;">البونص</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1;">الـ AVG النهائي</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1;">التقدير النهائي</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;

    printDedicatedOfficialDocument({
      title: `تقرير تقييم 365 يوم — ${roleTitle} (${selectedCommText})`,
      docNumber: `EYE-EVAL365-${Date.now().toString().slice(-6)}`,
      bodyHtml: reportHtml,
      signatures: [
        { title: 'مسؤول لجنة الموارد البشرية', name: 'أحمد إبراهيم' },
        { title: 'نائب مسؤول لجنة الموارد البشرية', name: 'ريهام أشرف' }
      ]
    });
  };

  const handleExport365Word = () => {
    const targetMembers = allUsersList.filter(u => {
      const isTargetable = u.role === 'Member' || u.role === 'Leader';
      if (!isTargetable) return false;
      if (roleFilter === 'leaders' && u.role !== 'Leader') return false;
      if (roleFilter === 'members' && u.role !== 'Member') return false;
      if (committeeFilter !== 'all' && u.committee !== committeeFilter) return false;
      return true;
    });

    const isLeadersFilter = roleFilter === 'leaders';
    const roleTitle = isLeadersFilter ? 'القادة والرؤساء' : roleFilter === 'members' ? 'الأعضاء' : 'الأعضاء والقادة';
    const selectedCommText = committeeFilter === 'all' ? 'جميع اللجان' : `لجنة ${committeeFilter}`;

    const meetings = db.getMeetings();
    const attendance = db.getAllAttendance();
    const tasks = db.getTasks();
    const submissions = db.getSubmissions();
    const excuses = db.getExcuseRequests();
    const evaluations = db.getMemberEvaluations();

    let fullBodyText = `تقرير نتائج التقييم الشامل 365 يوماً — ${roleTitle} (${selectedCommText})\n\n`;

    const headers = ['#', 'اسم العضو', 'المحافظة', 'المنصب واللجنة', 'نقاط الميتينجات', 'نقاط التاسكات', 'الأعذار', 'إجمالي النقاط', 'البونص', 'AVG%', 'التقدير'];
    const rows = targetMembers.map((u, i) => {
      const bd = calculateMemberAVG(
        u.id,
        meetings,
        attendance,
        tasks,
        submissions,
        excuses,
        evaluations,
        u.bonusPoints || 0
      );

      let grade = bd.hasActualEvents ? 'يحتاج إلى تطوير' : 'لا توجد بيانات';
      if (bd.hasActualEvents) {
        if (bd.avgScore >= 90) grade = 'ممتاز مرتفع جداً';
        else if (bd.avgScore >= 80) grade = 'ممتاز';
        else if (bd.avgScore >= 70) grade = 'جيد جداً';
        else if (bd.avgScore >= 60) grade = 'جيد';
        else if (bd.avgScore >= 50) grade = 'مقبول';
      }

      return [
        `${i + 1}`,
        u.fullName,
        u.governorate || 'الغربية',
        `${u.role} (${u.committee || 'عام'})`,
        bd.hasActualEvents ? `${bd.onlineMeetingsEarned + bd.offlineMeetingsEarned}ن` : '—',
        bd.hasActualEvents ? `${bd.tasksEarned}ن` : '—',
        `${bd.excusedMeetingsCount + bd.excusedTasksCount}`,
        bd.hasActualEvents ? `${bd.earnedPoints}/${bd.maxPoints}` : '—',
        `+${bd.bonusPoints}`,
        bd.displayText,
        grade
      ];
    });

    fullBodyText += `[TABLE_JSON]${JSON.stringify({ headers, rows, headerBg: '1B4CD3' })}\n\n`;
    fullBodyText += `توجيهات واعتمادات الموارد البشرية:\n`;
    fullBodyText += `اعتماد وثيقة التقييم السنوي الشامل 365 يوماً وتكريم الكفاءات والمتفوقين.\n\n`;
    fullBodyText += `═════════════════════════════════════════════════════\n`;
    fullBodyText += `              • الاعتماد والتوقيعات الرسمية •\n`;
    fullBodyText += `═════════════════════════════════════════════════════\n\n`;
    fullBodyText += `مسؤول لجنة الموارد البشرية         نائب مسؤول لجنة الموارد البشرية\n`;
    fullBodyText += `   أ. أحمد إبراهيم                 أ. ريهام أشرف\n`;

    fillAndDownloadDocxTemplate('bg_report', {
      reportTitle: `تقرير التقييم الشامل 365 يوماً — ${roleTitle} (${selectedCommText})`,
      reportBody: fullBodyText,
      hrManager: 'أحمد إبراهيم',
      deputy: 'ريهام أشرف'
    });
  };

  // ─── Full-screen Rating Page ───────────────────────────────────────────────
  if (targetPerson) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Top Bar */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white px-4 py-4 flex items-center gap-3 border-b border-purple-800/40 shrink-0">
          <button
            onClick={() => setTargetPerson(null)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <img
            src={targetPerson.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(targetPerson.fullName)}`}
            alt=""
            className="w-9 h-9 rounded-xl object-cover border-2 border-amber-400/60"
          />
          <div className="min-w-0">
            <h1 className="font-black text-sm text-white truncate">⭐ {isAr ? `تقييم: ${targetPerson.fullName}` : `Rate: ${targetPerson.fullName}`}</h1>
            <p className="text-[10px] text-purple-300 font-bold">{targetPerson.role} — {translateCommittee(targetPerson.committee)}</p>
          </div>
        </div>

        {/* Rating Body */}
        <div className="flex-1 flex flex-col justify-center px-4 py-6 max-w-lg w-full mx-auto gap-4">
          {submitResult === 'ok' ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-4xl font-bold border-4 border-emerald-400/40">✓</div>
              <p className="font-black text-emerald-600 dark:text-emerald-400 text-base">{isAr ? 'تم اعتماد التقييم بنجاح! ⭐' : 'Evaluation submitted!'}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitEvaluation} className="space-y-3">
              {/* BHV */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 shadow-sm">
                <div>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100 block">⭐ {isAr ? 'سلوك (BHV)' : 'Behavior (BHV)'}</span>
                  <span className="text-[11px] text-slate-500 font-bold">{isAr ? 'الالتزام والانضباط (0 – 10)' : 'Commitment (0 – 10)'}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number" min="0" max="10" step="0.5" value={bhvScore}
                    onChange={(e) => setBhvScore(Math.min(10, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-16 bg-slate-50 dark:bg-slate-800 border-2 border-emerald-500/60 rounded-xl px-2 py-2 text-center text-sm font-black text-emerald-600 dark:text-emerald-400 focus:outline-none"
                  />
                  <span className="text-xs font-black text-slate-500">/ 10</span>
                </div>
              </div>

              {/* Interaction */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 shadow-sm">
                <div>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100 block">🤝 {isAr ? 'تفاعل (Interaction)' : 'Interaction'}</span>
                  <span className="text-[11px] text-slate-500 font-bold">{isAr ? 'التفاعل والعمل الجماعي (0 – 13)' : 'Teamwork (0 – 13)'}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number" min="0" max="13" step="0.5" value={interactionScore}
                    onChange={(e) => setInteractionScore(Math.min(13, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-16 bg-slate-50 dark:bg-slate-800 border-2 border-indigo-500/60 rounded-xl px-2 py-2 text-center text-sm font-black text-indigo-600 dark:text-indigo-400 focus:outline-none"
                  />
                  <span className="text-xs font-black text-slate-500">/ 13</span>
                </div>
              </div>

              {/* Bonus */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
                <div>
                  <span className="text-sm font-black text-amber-800 dark:text-amber-300 block">🎁 {isAr ? 'بونص (Bonus)' : 'Bonus'}</span>
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">{isAr ? 'إضافة مباشرة فوق الـ AVG (0 – 10)' : 'Bonus Boost (0 – 10)'}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number" min="0" max="10" step="0.5" value={bonusScore}
                    onChange={(e) => setBonusScore(Math.min(10, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-16 bg-white dark:bg-slate-800 border-2 border-amber-500/60 rounded-xl px-2 py-2 text-center text-sm font-black text-amber-600 dark:text-amber-400 focus:outline-none"
                  />
                  <span className="text-xs font-black text-amber-600">/ 10</span>
                </div>
              </div>

              {/* AVG Preview */}
              {(() => {
                const livePreview = calculateMemberAVG(
                  targetPerson.id, db.getMeetings(), db.getAllAttendance(), db.getTasks(), db.getSubmissions(), db.getExcuseRequests(),
                  [...(evaluationsMap[targetPerson.id] || []), { id: 'prev', targetUserId: targetPerson.id, targetUserName: targetPerson.fullName, commitmentRating: (bhvScore / 10) * 5, teamworkRating: (interactionScore / 13) * 5, overallRating: 5, createdAt: new Date().toISOString() }],
                  bonusScore
                );
                return (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white border border-amber-400/40 flex items-center justify-between shadow-lg">
                    <div>
                      <span className="text-xs font-black text-amber-300 block">{isAr ? 'الـ AVG المتوقع:' : 'AVG Preview:'}</span>
                      <span className="text-[11px] text-slate-300">{livePreview.hasActualEvents ? `النقاط: ${livePreview.earnedPoints} / ${livePreview.maxPoints} | بونص +${bonusScore}` : 'سيتم الحساب فور تسجيل ميتينج أو مهمة'}</span>
                    </div>
                    <span className="text-lg font-black text-amber-400 bg-amber-400/20 px-4 py-2 rounded-xl border border-amber-400/30 font-mono">{livePreview.displayText}</span>
                  </div>
                );
              })()}

              {/* Comment */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">{isAr ? 'ملاحظات وتوجيهات (اختياري)' : 'Feedback Notes (optional)'}</label>
                <textarea
                  rows={2} value={comment} onChange={e => setComment(e.target.value)}
                  placeholder={isAr ? 'أدخل ملاحظاتك التوجيهية...' : 'Enter feedback...'}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-800 dark:text-white resize-none focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-sm rounded-2xl transition-all shadow-md cursor-pointer"
                >
                  {isAr ? 'اعتماد وحفظ التقييم ⭐' : 'Submit Rating'}
                </button>
                <button
                  type="button"
                  onClick={() => setTargetPerson(null)}
                  className="px-5 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm rounded-2xl cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-purple-800/40 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
            <Award className="w-4 h-4 text-purple-400" />
            <span>{isAr ? 'نظام الأداء والتميز والتقييم الموحد بكيان EYE 360°' : '360° Unified Evaluation & Leaderboard Hub'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {isAr ? 'مركز التقييم ولوحة الصدارة والتميز 🏆⭐' : 'Evaluation & Leaderboard Honor Center 🏆⭐'}
          </h1>
          <p className="text-xs text-purple-200 opacity-90 font-medium max-w-2xl">
            {isAr
              ? 'مُجمع التقييم الموحد ورصد ترتيب المتميزين واللجان — لرفع الكفاءة، وتحفيز التنافس الشريف، وتتبع الأداء الحقيقي.'
              : 'Unified Hub for member ratings, performance metrics, and top performer honor rankings.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex items-center gap-2 w-full md:w-auto shrink-0">
          {['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator', 'Leader'].includes(currentUser.role) && (
            <>
              {/* Committee Selector Dropdown */}
              <div className="flex items-center justify-between gap-1.5 bg-white/10 p-1.5 rounded-2xl border border-white/20">
                <span className="text-[10px] text-purple-200 font-bold px-1">{isAr ? 'اللجنة:' : 'Committee:'}</span>
                <select
                  value={committeeFilter}
                  onChange={e => setCommitteeFilter(e.target.value)}
                  className="bg-slate-900/90 text-white text-xs font-bold px-2.5 py-1 rounded-xl border border-purple-400/40 focus:outline-none cursor-pointer"
                >
                  <option value="all">{isAr ? 'جميع اللجان' : 'All Committees'}</option>
                  <option value="HR">لجنة HR</option>
                  <option value="PR">لجنة PR</option>
                  <option value="SM">لجنة SM</option>
                  <option value="OR">لجنة OR</option>
                </select>
              </div>

              {/* Dedicated 365 Evaluation Export Buttons (PDF & Word) */}
              <button
                onClick={handleExport365Word}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl border border-emerald-500/30 shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                title="تصدير تقرير تقييم 365 يوم بصيغة Word (.docx)"
              >
                <Download className="w-4 h-4 text-emerald-200" />
                <span>{isAr ? '📝 تقرير 365 Word' : '📝 365 Word'}</span>
              </button>

              <button
                onClick={handleExport365Pdf}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl border border-blue-500/30 shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                title="طباعة تقرير تقييم 365 يوم بصيغة PDF"
              >
                <Printer className="w-4 h-4 text-blue-200" />
                <span>{isAr ? '📄 تقرير 365 PDF' : '📄 365 PDF'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Merged Navigation Tabs Switcher */}
      <div className="flex bg-slate-200/80 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-300 dark:border-slate-700 max-w-xl mx-auto shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'leaderboard'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md scale-[1.02]'
              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>{isAr ? '🏆 لوحة الصدارة والتميز' : '🏆 Leaderboard'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('evaluations')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'evaluations'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md scale-[1.02]'
              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>{isAr ? '📝 تقييمات الأعضاء والـ 360°' : '📝 Member Ratings & 360°'}</span>
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'leaderboard' ? (
        <Leaderboard currentUser={currentUser} onNavigateToView={onNavigateToView} />
      ) : (
        <>
          {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between max-w-full overflow-hidden">
        <div className="relative w-full md:w-80 min-w-0">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'ابحث باسم أي عضو أو قائد أو الكود...' : 'Search by name or code...'}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl ps-10 pe-4 py-2.5 text-xs text-slate-800 dark:text-white font-bold focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap gap-2 w-full md:w-auto min-w-0">
          <select
            value={committeeFilter}
            onChange={(e) => setCommitteeFilter(e.target.value)}
            className="w-full sm:w-auto max-w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2.5 text-xs text-slate-800 dark:text-white font-bold truncate min-w-0 focus:outline-none focus:border-purple-500"
          >
            <option value="all">{isAr ? 'جميع اللجان' : 'All Committees'}</option>
            <option value="HR">لجنة HR</option>
            <option value="PR">لجنة PR</option>
            <option value="SM">لجنة SM</option>
            <option value="OR">لجنة OR</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="w-full sm:w-auto max-w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2.5 text-xs text-slate-800 dark:text-white font-bold truncate min-w-0 focus:outline-none focus:border-purple-500"
          >
            <option value="all">{isAr ? 'جميع الأعضاء والقادة (أعضاء + ليدرز)' : 'All Members & Leaders'}</option>
            <option value="leaders">{isAr ? '🎖️ القادة فقط (Leaders)' : 'Leaders Only'}</option>
            <option value="members">{isAr ? '👤 الأعضاء فقط (Members)' : 'Members Only'}</option>
          </select>
        </div>
      </div>

      {/* Members & Leaders Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredUsers.map(person => {
          const evals = evaluationsMap[person.id] || [];
          const fb = feedbackMap[person.id] || [];
          const evalsCount = evals.length + fb.length;

          let overallAvg = 0;
          if (evalsCount > 0) {
            const sumEvals = evals.reduce((a, b) => a + (b.overallRating || 5), 0);
            const sumFb = fb.reduce((a, b) => a + (b.rating || 5), 0);
            overallAvg = Number(((sumEvals + sumFb) / evalsCount).toFixed(1));
          }

          const isExpanded = expandedPerson === person.id;
          const canRate = canUserRateTarget(currentUser, person);

          return (
            <div key={person.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:border-purple-500/40 transition-all flex flex-col justify-between">
              {/* Card Header */}
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div 
                    onClick={() => onNavigateToView?.('profile', person.id)}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <img
                      src={person.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(person.fullName)}`}
                      alt=""
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform"
                    />
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors flex items-center gap-1.5">
                        <span>{person.fullName}</span>
                        {['Leader', 'Vice'].includes(person.role) && <span className="text-amber-500 text-xs" title="Leader">🎖️</span>}
                      </h3>
                      {currentUser.role !== 'Member' && <p className="text-[10px] font-mono text-purple-600 font-bold">{person.membershipCode}</p>}
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        {translateCommittee(person.committee)} {person.department && person.department !== 'None' ? `• ${translateDepartment(person.department)}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Rating Average Badge */}
                  <div className="text-end shrink-0">
                    {evalsCount > 0 ? (
                      <div className="flex flex-col items-end">
                        <div className="px-3 py-1 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black text-sm flex items-center gap-1">
                          <span>⭐</span>
                          <span>{overallAvg}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">/ 5.0</span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold block mt-1">
                          ({evalsCount} {isAr ? 'تقييم معتمد' : 'reviews'})
                        </span>
                      </div>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-bold">
                        {isAr ? 'لم يُقيم بعد' : 'Not Rated'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Rating Details & Comments */}
                {evalsCount > 0 && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setExpandedPerson(isExpanded ? null : person.id)}
                      className="text-xs text-purple-600 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      {isExpanded ? <><EyeOff className="w-3.5 h-3.5" />{isAr ? 'إخفاء سجل التقييمات' : 'Hide Feedback'}</> : <><Eye className="w-3.5 h-3.5" />{isAr ? 'عرض سجل التقييمات والملاحظات' : 'View Feedback History'}</>}
                    </button>

                    {isExpanded && (
                      <div className="space-y-2 pt-2 animate-fade-in">
                        {evals.map(e => (
                          <div key={e.id} className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-2xl text-[11px] space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-purple-700 dark:text-purple-300">⭐ {e.overallRating} / 5.0 — {e.evaluatorName} ({e.evaluatorRole})</span>
                              <span className="text-[9px] text-slate-400 font-mono">{new Date(e.createdAt).toLocaleDateString()}</span>
                            </div>
                            {e.feedbackComment && <p className="italic text-slate-600 dark:text-slate-300">"{e.feedbackComment}"</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => onNavigateToView?.('profile', person.id)}
                  className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-purple-600 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>👤 {isAr ? 'عرض الملف' : 'Profile'}</span>
                </button>

                {canRate && (
                  <button
                    onClick={() => setTargetPerson(person)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                    <span>{isAr ? `تقييم ${['Leader', 'Vice'].includes(person.role) ? 'القائد' : 'العضو'}` : 'Rate'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Google Sheets Integration Sync Modal */}
      <GoogleSheetSyncModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
        currentUser={currentUser}
        onSuccess={loadData}
      />
      </>
      )}
    </div>
  );
};
