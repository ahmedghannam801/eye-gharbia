import React, { useState, useEffect } from 'react';
import { db } from '../db/localDb';
import { UserProfile, Task, Submission, COMMITTEE_STRUCTURE, EGYPTIAN_GOVERNORATES, getActiveGovernorate, formatGovernorateWelcomeAr, formatGovernorateAr, getGovernorateNameEn } from '../types';
import { 
  Users, FileCheck, CheckSquare, Clock, UserPlus, ShieldAlert, CheckCircle, 
  XCircle, ArrowUpRight, Award, Plus, Trash2, Shield, Calendar, RefreshCcw, 
  ChevronLeft, ChevronRight, FileSpreadsheet, ArrowLeft, ArrowRight, BarChart3, MapPin
} from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { MinistryLogo } from './EyeLogo';
import { MemberOfTheMonth } from './MemberOfTheMonth';


interface DashboardStatsProps {
  currentUser: UserProfile;
  onNavigateToView: (view: string, targetId?: string) => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  currentUser,
  onNavigateToView,
}) => {
  const { language, t, isRtl, translateCommittee, translateDepartment } = useLanguage();

  const [activeGov, setActiveGov] = useState<string>(() => getActiveGovernorate(currentUser));

  useEffect(() => {
    const handleGovChange = () => {
      setActiveGov(getActiveGovernorate(currentUser));
    };
    window.addEventListener('eye_governorate_changed', handleGovChange);
    window.addEventListener('storage', handleGovChange);
    return () => {
      window.removeEventListener('eye_governorate_changed', handleGovChange);
      window.removeEventListener('storage', handleGovChange);
    };
  }, [currentUser]);

  const userGovAr = formatGovernorateAr(activeGov);
  const userGovWelcomeAr = formatGovernorateWelcomeAr(activeGov);
  const userGovEn = getGovernorateNameEn(activeGov);

  const handleGovSelect = (newGov: string) => {
    setActiveGov(newGov);
    try {
      localStorage.setItem('eye_current_governorate', newGov);
    } catch {}
    db.notify();
    window.dispatchEvent(new CustomEvent('eye_governorate_changed', { detail: newGov }));
  };

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  // Create Leader / Coordinator Dialog Fields
  const [showCreateLeaderModal, setShowCreateLeaderModal] = useState(false);
  const [newLeaderName, setNewLeaderName] = useState('');
  const [newLeaderEmail, setNewLeaderEmail] = useState('');
  const [newLeaderPhone, setNewLeaderPhone] = useState('');
  const [newLeaderRole, setNewLeaderRole] = useState<'Leader' | 'Vice' | 'Coordinator' | 'Deputy Coordinator'>('Leader');
  const [newLeaderCommittee, setNewLeaderCommittee] = useState('HR');
  const [newLeaderDepartment, setNewLeaderDepartment] = useState('HRM');
  const [leaderError, setLeaderError] = useState('');
  const [leaderSuccess, setLeaderSuccess] = useState('');

  // Time period filter
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importCount, setImportCount] = useState<number | null>(null);

  const loadData = () => {
    setUsers(db.getUsers(currentUser));
    setTasks(db.getTasks());
    setSubmissions(db.getSubmissions());
    setLogs(db.getLogs().slice(0, 10)); // Top 10 activities
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  const renderActiveMembersWidget = () => {
    return (
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm text-slate-800 dark:text-slate-100">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex justify-between items-center border-b border-slate-150 dark:border-slate-800 pb-2">
          <span>{language === 'ar' ? 'الأعضاء النشطون بالكيان 🟢' : 'Active EYE Members 🟢'}</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-mono text-[9px] font-bold">
            {users.filter(u => u.status === 'Active').length}
          </span>
        </h3>
        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
          {users.filter(u => u.status === 'Active').map(u => (
            <div 
              key={u.id} 
              onClick={() => onNavigateToView('profile', u.id)}
              className="flex items-center justify-between gap-3 p-2 bg-slate-50 dark:bg-slate-850/40 hover:bg-blue-50/80 dark:hover:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-850 transition-all cursor-pointer group"
              title={language === 'ar' ? 'عرض الملف الشخصي' : 'View Profile'}
            >
              <div className="flex items-center gap-2 text-start">
                <div className="relative">
                  <img 
                    src={u.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.fullName)}`} 
                    alt="" 
                    className="w-8 h-8 rounded-xl object-cover shrink-0 group-hover:scale-105 transition-transform" 
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full animate-pulse"></span>
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100 leading-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{u.fullName}</p>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold block mt-1">
                    {translateCommittee(u.committee)} • {translateDepartment(u.department)}
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold text-[8px] uppercase tracking-wider border border-emerald-100 dark:border-emerald-900/35 font-mono">
                {['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator'].includes(u.role) ? (language === 'ar' ? 'أدمن' : 'Admin') : u.role === 'Leader' ? (language === 'ar' ? 'قائد' : 'Leader') : (language === 'ar' ? 'عضو' : 'Member')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleApprove = (userId: string) => {
    db.updateUserStatus(userId, 'Active', currentUser);
    loadData();
  };

  const handleReject = (userId: string) => {
    db.updateUserStatus(userId, 'Disabled', currentUser);
    loadData();
  };

  const handlePromote = (userId: string) => {
    db.promoteToLeader(userId, currentUser);
    loadData();
  };

  const handleDelete = (userId: string) => {
    const confirmationMsg = language === 'ar' 
      ? 'هل أنت متأكد تماماً من رغبتك في حذف حساب هذا العضو نهائياً؟ لا يمكن التراجع عن هذا الإجراء.' 
      : 'Are you absolutely sure you want to permanently delete this user account? This cannot be undone.';
    if (confirm(confirmationMsg)) {
      db.deleteUser(userId, currentUser);
      loadData();
    }
  };

  const handleCreateLeader = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaderError('');
    setLeaderSuccess('');

    if (!newLeaderName || !newLeaderEmail || !newLeaderPhone) {
      setLeaderError(language === 'ar' ? 'جميع بيانات القائد الإلزامية مطلوبة.' : 'All leader credentials are required.');
      return;
    }

    const targetComm = ['Coordinator', 'Deputy Coordinator'].includes(newLeaderRole) ? 'None' : newLeaderCommittee;
    const targetDept = ['Coordinator', 'Deputy Coordinator', 'Leader', 'Vice'].includes(newLeaderRole) ? 'Executive' : newLeaderDepartment;

    const res = await db.createLeader(newLeaderName, newLeaderEmail, newLeaderPhone, targetComm, targetDept, currentUser, newLeaderRole);
    if (res.success) {
      setLeaderSuccess(language === 'ar' ? 'تم إنشاء وتفعيل حساب القائد الجديد بنجاح.' : 'Leader account successfully provisioned & activated.');
      setNewLeaderName('');
      setNewLeaderEmail('');
      setNewLeaderPhone('');
      loadData();
      setTimeout(() => {
        setShowCreateLeaderModal(false);
        setLeaderSuccess('');
      }, 1500);
    } else {
      setLeaderError(res.error || (language === 'ar' ? 'فشل في إنشاء حساب القائد.' : 'Failed to create leader.'));
    }
  };

  const handleBulkImport = async () => {
    if (!csvText.trim()) return;
    
    // Parse simulated CSV/Text rows (Format: Full Name, Email, Phone, Committee, Department)
    const lines = csvText.split('\n');
    const parsedUsers: Partial<UserProfile>[] = [];

    lines.forEach(line => {
      const parts = line.split(',');
      if (parts.length >= 2) {
        parsedUsers.push({
          fullName: parts[0].trim(),
          email: parts[1].trim(),
          phoneNumber: parts[2]?.trim() || '+201000000000',
          committee: parts[3]?.trim() || 'HR',
          department: parts[4]?.trim() || 'HRM',
          role: 'Member',
          status: 'Active',
        });
      }
    });

    const count = await db.importUsers(parsedUsers, currentUser);
    setImportCount(count);
    loadData();
    setTimeout(() => {
      setShowImportModal(false);
      setCsvText('');
      setImportCount(null);
    }, 2000);
  };

  // Filtered stats helper arrays
  const pendingRegistrations = users.filter(u => u.status === 'Pending Approval');
  const activeMembersCount = users.filter(u => u.role === 'Member' && u.status === 'Active').length;
  const activeLeadersCount = users.filter(u => u.role === 'Leader' && u.status === 'Active').length;
  const publishedTasks = tasks.filter(t => t.status === 'Published');
  const pendingSubmissions = submissions.filter(s => s.status === 'Pending');

  // Request-specific metrics: Task submitters, Active engaged, Inactive members
  const memberIdsWithSubmissions = new Set(submissions.map(s => s.memberId));
  const taskSubmittersCount = memberIdsWithSubmissions.size;
  const activeEngagedCount = users.filter(u => u.status === 'Active' && (memberIdsWithSubmissions.has(u.id) || u.role !== 'Member')).length;
  const inactiveMembersCount = users.filter(u => u.status === 'Disabled' || (u.status === 'Active' && u.role === 'Member' && !memberIdsWithSubmissions.has(u.id))).length;

  // Leaders departmental data (adjusted based on user requirements)
  const getLeaderStats = () => {
    if (currentUser.committee === 'HR') {
      return {
        members: users.filter(u => u.committee !== 'HR' && u.role === 'Member'),
        tasks: tasks.filter(t => t.committee !== 'HR'),
        subs: submissions.filter(s => s.committee !== 'HR')
      };
    } else {
      return {
        members: users.filter(u => u.committee === currentUser.committee && u.role === 'Member'),
        tasks: tasks.filter(t => t.committee === currentUser.committee),
        subs: submissions.filter(s => s.committee === currentUser.committee)
      };
    }
  };

  const leaderStats = getLeaderStats();
  const leaderDeptMembers = leaderStats.members;
  const leaderDeptTasks = leaderStats.tasks;
  const leaderDeptSubs = leaderStats.subs;

  // Members data (adjusted based on user requirements)
  const memberTasks = currentUser.committee === 'HR'
    ? tasks.filter(t => t.committee !== 'HR' && t.status === 'Published')
    : tasks.filter(t => t.committee === currentUser.committee && t.department === currentUser.department && t.status === 'Published');
  const memberSubs = submissions.filter(s => s.memberId === currentUser.id);

  return (
    <div className="space-y-6 sm:space-y-8 p-3 sm:p-6" id="dashboard-statistics-viewport" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Member of the Month Spotlight Banner */}
      <MemberOfTheMonth currentUser={currentUser} />

      {/* Official Merged EYE & Ministry Banner Welcome Card */}
      <div 
        className="welcome-banner relative overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-500/40 shadow-xl sm:shadow-2xl p-4 sm:p-8 transition-all duration-300 bg-gradient-to-r from-[#05112e] via-[#0b1d47] to-[#05112e] text-white"
        id="eye-official-welcome-banner"
      >
        {/* Background Decorative Waves & Ambient Glow (Image 1 aesthetic) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          {/* Ambient radial glows */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-blue-500/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 right-10 w-72 h-40 bg-amber-500/10 rounded-full blur-2xl" />

          {/* Gold & Blue Wave Paths */}
          <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 1200 300" fill="none" preserveAspectRatio="none">
            <path d="M-100 150 C 200 50, 400 250, 700 120 C 1000 -10, 1200 200, 1300 100" stroke="#3B82F6" strokeWidth="2.5" />
            <path d="M-100 200 C 150 100, 500 280, 800 180 C 1000 80, 1150 250, 1300 180" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="6 4" />
            <path d="M-50 80 C 300 220, 600 30, 950 210 C 1100 290, 1250 120, 1300 80" stroke="#60A5FA" strokeWidth="1" />
          </svg>

          {/* Decorative Dot Matrix in Corners */}
          <div className="absolute bottom-3 left-4 hidden sm:grid grid-cols-6 gap-1.5 opacity-30">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-amber-400" />
            ))}
          </div>
          <div className="absolute top-3 right-4 hidden sm:grid grid-cols-6 gap-1.5 opacity-30">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-blue-400" />
            ))}
          </div>
        </div>

        {/* TOP BRANDING BAR (Merged from Image 1 with full prominence) */}
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-5 pb-5 sm:pb-6 border-b border-blue-500/20 dark:border-blue-500/30">
          
          {/* Official EYE Circular Emblem Card */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 bg-white dark:bg-slate-900/95 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-blue-500/40 shadow-md dark:shadow-xl backdrop-blur-md shrink-0 w-full sm:w-auto justify-start">
            <div className="relative p-0.5 sm:p-1 rounded-full bg-gradient-to-br from-blue-600 via-blue-500 to-amber-500 shadow-[0_0_18px_rgba(37,99,235,0.35)] shrink-0">
              <img
                src="/eye-logo-transparent.png"
                alt="EYE Official Logo"
                className="w-11 h-11 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-slate-200 dark:border-slate-950"
              />
            </div>
            <div className="flex flex-col text-start min-w-0">
              <span className="text-xs sm:text-base lg:text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none drop-shadow-sm truncate">
                EYE {userGovEn}
              </span>
              <span className="text-[9px] sm:text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-0.5 sm:mt-1 leading-none truncate">
                EGYPTIAN YOUNG ENTITY
              </span>
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-300 leading-none mt-0.5 sm:mt-1 truncate">
                كيان المصريون الشباب — {userGovAr}
              </span>
            </div>
          </div>

          {/* Center Official Title & Badges (Image 1 central layout) */}
          <div className="text-center flex flex-col items-center mx-auto px-1 my-1 md:my-0 w-full">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-1 shadow-inner max-w-full truncate">
              <span>EYE — MINISTRY OF YOUTH AND SPORTS</span>
            </div>

            <h2 className="text-xs sm:text-base lg:text-xl font-black tracking-wider text-slate-900 dark:text-white uppercase drop-shadow-md text-center leading-snug">
              {language === 'ar' ? 'وزارة الشباب والرياضة — كيان المصريون الشباب EYE' : 'EYE — MINISTRY OF YOUTH AND SPORTS'}
            </h2>

            {/* Committee Tag with Blue Dash Lines */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mt-1 sm:mt-1.5 w-full">
              <div className="w-4 sm:w-12 h-[2px] bg-gradient-to-r from-transparent to-blue-500" />
              <span className="text-[11px] sm:text-sm font-black text-blue-800 dark:text-blue-300 uppercase tracking-widest drop-shadow text-center">
                {currentUser.committee 
                  ? (language === 'ar' ? `— لجنة ${translateCommittee(currentUser.committee)} —` : `— ${currentUser.committee.toUpperCase()} COMMITTEE —`)
                  : (language === 'ar' ? '— اللجنة المركزية للموارد البشرية —' : '— CENTRAL HUMAN RESOURCES COMMITTEE —')}
              </span>
              <div className="w-4 sm:w-12 h-[2px] bg-gradient-to-l from-transparent to-blue-500" />
            </div>

            {/* Season Badge */}
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-0.5 sm:py-1 mt-1.5 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white text-[10px] sm:text-xs font-black tracking-widest uppercase shadow-md border border-blue-400/40">
              <span className="text-amber-300 font-serif font-black">\\</span>
              <span className="text-white drop-shadow font-black">{language === 'ar' ? 'الموسم الرابع' : 'SEASON 4'}</span>
              <span className="text-amber-300 font-serif font-black">//</span>
            </div>
          </div>

          {/* Ministry of Youth and Sports Official Logo Card */}
          <div className="shrink-0 w-full sm:w-auto">
            <MinistryLogo size={64} />
          </div>
        </div>

        {/* BLUE/GOLD FLARE SEPARATOR */}
        <div className="relative h-px w-full my-3 sm:my-4 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-70 shadow-[0_0_10px_#2563eb]" />

        {/* MAIN WELCOME BODY */}
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-5 sm:gap-6 pt-1 sm:pt-2">
          {/* Welcome Text & Role Summary */}
          <div className="space-y-2 text-start w-full lg:flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <div className="inline-flex items-center gap-1.5 font-bold text-[10px] sm:text-xs uppercase tracking-widest text-blue-800 dark:text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 max-w-full truncate">
                <Award className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate">{language === 'ar' ? `منصة العمل الموحدة لكيان EYE ${userGovWelcomeAr}` : `EYE ${userGovEn} Secretariat Platform`}</span>
              </div>

              {/* Quick Governorate Switcher for Super Admin Only */}
              {currentUser.role === 'Super Admin' && (
                <div className="inline-flex items-center gap-1.5 bg-amber-500/15 dark:bg-amber-400/10 border border-amber-500/30 dark:border-amber-400/30 px-2.5 py-1 rounded-lg text-amber-800 dark:text-amber-300 text-[11px] font-bold shadow-2xs">
                  <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>{language === 'ar' ? 'التبديل للمحافظة:' : 'Branch:'}</span>
                  <select
                    value={activeGov}
                    onChange={(e) => handleGovSelect(e.target.value)}
                    className="bg-transparent font-black text-blue-900 dark:text-blue-300 focus:outline-none cursor-pointer"
                  >
                    {EGYPTIAN_GOVERNORATES.map((gov) => (
                      <option key={gov} value={gov} className="bg-slate-900 text-white">
                        {gov === 'المركزية' ? 'المركزية' : `محافظة ${gov}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-md">
              {language === 'ar' ? `أهلاً بك في منصة كيان EYE ${userGovWelcomeAr}، ${currentUser.fullName.split(' ')[0]} 👋` : `Ahlan, ${currentUser.fullName.split(' ')[0]} 👋 — Welcome to EYE ${userGovEn}`}
            </h1>

            <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-200 max-w-2xl leading-relaxed">
              {['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator'].includes(currentUser.role) && (language === 'ar' ? 'نظرة عامة على المنصة، مراجعة طلبات الانضمام المعلقة، والتحليلات الأساسية.' : 'Workspace overview, pending admissions audit, and telemetry.')}
              {currentUser.role === 'Leader' && (
                currentUser.committee === 'HR'
                  ? (language === 'ar' ? 'متابعة وتقييم المهام والملفات لجميع اللجان الأخرى.' : 'Monitoring and evaluating tasks and submissions for all other committees.')
                  : (language === 'ar' ? `إدارة أعمال لجنة ${translateCommittee(currentUser.committee)}. متابعة المهام والملفات للأقسام التابعة.` : `Governing the ${translateCommittee(currentUser.committee)} committee. Manage tasks and review files across departments.`)
              )}
              {currentUser.role === 'Member' && (
                currentUser.committee === 'HR'
                  ? (language === 'ar' ? 'استعراض المهام المطلوبة ومتابعة اللجان الأخرى في الكيان.' : 'Reviewing assignments and monitoring other committees in the system.')
                  : (language === 'ar' ? `استعراض المهام المطلوبة منك ونتائج تسليماتك في قسم ${translateDepartment(currentUser.department)}.` : `View assignments and submission evaluations inside the ${translateDepartment(currentUser.department)} department.`)
              )}
            </p>

            {/* Official Slogan Hashtag */}
            <div className="pt-0.5 text-xs sm:text-sm font-black text-blue-700 dark:text-blue-400 tracking-wider">
              {language === 'ar' ? '#معًا_نحو_مستقبل_أفضل' : '#Together_For_A_Better_Future'}
            </div>
          </div>

          {/* Center Pharaonic Mascot */}
          <div className="hidden lg:block relative shrink-0">
            <div className="w-28 h-28 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-xl" />
              <img
                src="/mascot-announcements.png"
                alt="Ozy Mascot"
                className="h-28 object-contain relative z-10 drop-shadow-xl hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>

          {/* Action CTAs (Fluid Mobile Buttons) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0">
            {['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator'].includes(currentUser.role) && (
              <>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="w-full sm:w-auto justify-center bg-white dark:bg-[#0b1d47] hover:bg-slate-50 dark:hover:bg-[#0f285c] text-slate-800 dark:text-white text-xs font-bold px-4 py-3 rounded-xl border border-slate-300 dark:border-amber-400/50 flex items-center gap-2 transition-all shadow-md hover:border-amber-500"
                  id="btn-bulk-import"
                >
                  <FileSpreadsheet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-bold">{language === 'ar' ? 'استيراد أعضاء' : 'Import Members'}</span>
                </button>
                <button
                  onClick={() => setShowCreateLeaderModal(true)}
                  className="w-full sm:w-auto justify-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-xs font-black px-5 py-3 rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all border border-blue-400/40"
                  id="btn-create-leader"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span className="text-white font-black">{language === 'ar' ? 'إضافة قائد جديد' : 'Create Leader'}</span>
                </button>
              </>
            )}

            {currentUser.role === 'Leader' && (
              <button
                onClick={() => onNavigateToView('tasks')}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-xs font-black px-5 py-3 rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all border border-blue-400/40"
              >
                <Plus className="w-4 h-4 text-white" />
                <span className="text-white font-black">{language === 'ar' ? 'نشر مهمة جديدة' : 'Publish Task'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* STREAK & REWARDS MINI BANNER */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-amber-950/30 border border-amber-500/30 p-4 sm:p-5 rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-sm text-start">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-amber-500/30 animate-bounce">
            🔥
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {language === 'ar' ? `سلسلة الإنجاز (Streak): ${currentUser.streakCount || 0} يوم متتالي` : `Current Streak: ${currentUser.streakCount || 0} Days`}
              </h3>
              {(currentUser.streakCount || 0) >= 3 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  ⚡ ON FIRE!
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
              {language === 'ar' 
                ? 'حافظ على شعلتك متوهجة عبر تسليم المهام في موعدها يومياً واكتساب نقاط تميز مضاعفة!' 
                : 'Keep your streak alive by completing assignments daily!'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowWeeklyReport(true)}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <span>{language === 'ar' ? 'تقرير الأسبوع 📊' : 'Weekly Report 📊'}</span>
          </button>
          <button
            onClick={() => onNavigateToView('rewards')}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Award className="w-4 h-4" />
            <span>{language === 'ar' ? 'متجر الجوائز 🎁' : 'Rewards Shop 🎁'}</span>
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 1. SUPER ADMIN METRICS PANEL & ACTION HUB */}
      {/* ========================================== */}
      {['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator'].includes(currentUser.role) && (
        <div className="space-y-6 animate-fade-in">
          {/* Time Period Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5 ms-1">
              <RefreshCcw className="w-3.5 h-3.5 text-eye-brand" />
              <span>{language === 'ar' ? 'نطاق تتبع الإحصائيات:' : 'Metrics Timeframe:'}</span>
            </span>

            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1 text-[11px] font-bold">
              {[
                { id: 'all', labelAr: 'الموسم كامل 🏆', labelEn: 'All Season 🏆' },
                { id: 'month', labelAr: 'هذا الشهر 📅', labelEn: 'This Month 📅' },
                { id: 'week', labelAr: 'هذا الأسبوع ⚡', labelEn: 'This Week ⚡' },
                { id: 'today', labelAr: 'اليوم ☀️', labelEn: 'Today ☀️' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTimeFilter(t.id as any)}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    timeFilter === t.id
                      ? 'bg-eye-brand text-white shadow-2xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {language === 'ar' ? t.labelAr : t.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Key Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all">
              <div className="space-y-1 text-start">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{language === 'ar' ? 'مسلمو التكليفات' : 'Task Submitters'}</span>
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight">{taskSubmittersCount}</p>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">{submissions.length} {language === 'ar' ? 'إجمالي تسليماً معتمداً' : 'Total Submissions'}</span>
              </div>
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-200/60 dark:border-blue-800/60 shadow-xs">
                <FileCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all">
              <div className="space-y-1 text-start">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{language === 'ar' ? 'الأعضاء النشطون 🟢' : 'Active Members 🟢'}</span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">{activeEngagedCount}</p>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">{language === 'ar' ? 'عضو متفاعل بالأنشطة' : 'Engaged Members'}</span>
              </div>
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all">
              <div className="space-y-1 text-start">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{language === 'ar' ? 'غير المتفاعلين 🔴' : 'Inactive Members 🔴'}</span>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">{inactiveMembersCount}</p>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">{language === 'ar' ? 'بحاجة لمتابعة إدارية' : 'Needs Follow-up'}</span>
              </div>
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-200/60 dark:border-rose-800/60 shadow-xs">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div 
              onClick={() => onNavigateToView('excuses-freeze')}
              className="bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 p-5 rounded-2xl border border-blue-500/40 flex items-center justify-between gap-4 shadow-md hover:shadow-lg cursor-pointer hover:scale-[1.01] transition-all text-white"
            >
              <div className="space-y-1 text-start">
                <span className="text-[10px] font-black text-blue-200 uppercase tracking-wider">{language === 'ar' ? 'الأعذار وتجميد العضوية' : 'Excuses & Freeze'}</span>
                <p className="text-base font-black text-white">{language === 'ar' ? 'تقديم ومراجعة ⚡' : 'Submit / Review ⚡'}</p>
                <span className="text-[10px] text-blue-200/80 font-bold block">{language === 'ar' ? 'انقر للفتح السريع' : 'Click to Open'}</span>
              </div>
              <div className="p-3.5 bg-white/10 text-white rounded-2xl border border-white/20 backdrop-blur-md">
                <ShieldAlert className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Pending Approvals Audit Panel */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-amber-500" />
                  <span>{language === 'ar' ? `طلبات الانضمام المعلقة بانتظار التفعيل (${pendingRegistrations.length})` : `Pending Registration Approvals (${pendingRegistrations.length})`}</span>
                </h2>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">{language === 'ar' ? 'مسئول الموارد البشرية' : 'HR Manager Duty'}</span>
              </div>

              {pendingRegistrations.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-850/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs flex flex-col items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">{language === 'ar' ? 'رائع! لا توجد طلبات انضمام معلقة حالياً.' : 'All caught up! No pending registration approvals.'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="pb-3 text-start">{language === 'ar' ? 'الاسم بالكامل' : 'Applicant Name'}</th>
                        <th className="pb-3 text-start">{language === 'ar' ? 'اللجنة والقسم' : 'Committee & Dept'}</th>
                        <th className="pb-3 text-start">{language === 'ar' ? 'معلومات الاتصال' : 'Contact'}</th>
                        <th className="pb-3 text-end">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {pendingRegistrations.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 group transition-colors">
                          <td className="py-3.5 flex items-center gap-2.5">
                            <img src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.fullName)}`} className="w-8 h-8 rounded-lg object-cover" alt="" />
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-100 block group-hover:text-blue-600 dark:group-hover:text-blue-400 text-xs">{user.fullName}</span>
                              {currentUser.role !== 'Member' && <span className="text-[9px] text-slate-400 font-mono font-bold block">{user.membershipCode}</span>}
                            </div>
                          </td>
                          <td className="py-3.5">
                            <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-[9px] uppercase border border-amber-200/40 font-mono">
                              {user.committee}
                            </span>
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold mx-1.5">{translateDepartment(user.department)}</span>
                          </td>
                          <td className="py-3.5 text-slate-500 dark:text-slate-400 text-start">
                            <p className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">{user.phoneNumber}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">{user.email}</p>
                          </td>
                          <td className="py-3.5 text-end space-x-2 space-x-reverse">
                            <button
                              onClick={() => handleApprove(user.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white font-bold transition-all text-[11px] border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                            >
                              {language === 'ar' ? 'قبول وتفعيل' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleReject(user.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-600 text-red-700 dark:text-red-300 hover:text-white font-bold transition-all text-[11px] border border-red-200 dark:border-red-800 cursor-pointer"
                            >
                              {language === 'ar' ? 'تعطيل الحساب' : 'Reject'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Simulated Dynamic Stats Chart & Quick Actions */}
            <div className="lg:col-span-4 space-y-6">
              {/* Dynamic SVG Chart */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm text-slate-800 dark:text-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{language === 'ar' ? 'توزيع الأعضاء على اللجان' : 'Committee Distribution'}</h3>
                <div className="h-44 flex items-end justify-between gap-4 px-2 pt-4">
                  {/* HR Bar */}
                  <div className="flex-1 flex flex-col items-center gap-1.5 group">
                    <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                      {users.filter(u => u.committee === 'HR').length}
                    </span>
                    <div
                      className="w-full bg-amber-500 rounded-t-lg group-hover:bg-amber-600 transition-all shadow-md shadow-amber-500/10"
                      style={{ height: `${Math.max(10, (users.filter(u => u.committee === 'HR').length / Math.max(1, users.length)) * 120)}px` }}
                    />
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">HR</span>
                  </div>
                  {/* PR Bar */}
                  <div className="flex-1 flex flex-col items-center gap-1.5 group">
                    <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">
                      {users.filter(u => u.committee === 'PR').length}
                    </span>
                    <div
                      className="w-full bg-slate-400 rounded-t-lg group-hover:bg-slate-500 transition-all shadow-md shadow-slate-400/10"
                      style={{ height: `${Math.max(10, (users.filter(u => u.committee === 'PR').length / Math.max(1, users.length)) * 120)}px` }}
                    />
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">PR</span>
                  </div>
                  {/* SM Bar */}
                  <div className="flex-1 flex flex-col items-center gap-1.5 group">
                    <span className="text-[10px] font-mono font-bold text-amber-500 dark:text-amber-300">
                      {users.filter(u => u.committee === 'SM').length}
                    </span>
                    <div
                      className="w-full bg-amber-400 rounded-t-lg group-hover:bg-amber-500 transition-all shadow-md shadow-amber-400/10"
                      style={{ height: `${Math.max(10, (users.filter(u => u.committee === 'SM').length / Math.max(1, users.length)) * 120)}px` }}
                    />
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">SM</span>
                  </div>
                  {/* OR Bar */}
                  <div className="flex-1 flex flex-col items-center gap-1.5 group">
                    <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {users.filter(u => u.committee === 'OR').length}
                    </span>
                    <div
                      className="w-full bg-emerald-500 rounded-t-lg group-hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/10"
                      style={{ height: `${Math.max(10, (users.filter(u => u.committee === 'OR').length / Math.max(1, users.length)) * 120)}px` }}
                    />
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">OR</span>
                  </div>
                </div>
              </div>

              {/* User management list shortcut */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm text-slate-800 dark:text-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex justify-between items-center">
                  <span>{language === 'ar' ? 'إدارة الأعضاء النشطين' : 'Manage Active Members'}</span>
                  <RefreshCcw className="w-3.5 h-3.5 cursor-pointer hover:rotate-45 transition-transform text-slate-400 shrink-0" onClick={loadData} />
                </h3>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {users.filter(u => u.status === 'Active' && u.id !== currentUser.id).map(u => (
                    <div key={u.id} className="flex items-center justify-between gap-3 p-2 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2">
                        <img
                          src={u.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.fullName)}`}
                          alt=""
                          className="w-7 h-7 rounded-lg object-cover cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => onNavigateToView?.('profile', u.id)}
                        />
                        <div>
                          <p
                            className="text-xs font-bold text-slate-800 leading-none cursor-pointer hover:text-eye-brand hover:underline"
                            onClick={() => onNavigateToView?.('profile', u.id)}
                          >
                            {u.fullName}
                          </p>
                          <span className="text-[9px] text-slate-500 font-bold block mt-1">{u.role === 'Leader' ? (language === 'ar' ? 'قائد لجنة' : 'Leader') : (language === 'ar' ? 'عضو' : 'Member')} • {translateDepartment(u.department)}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        {u.role === 'Member' && (
                          <button
                            onClick={() => handlePromote(u.id)}
                            className="p-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white text-[9px] font-bold border border-amber-200 cursor-pointer"
                            title="Promote to Leader"
                          >
                            {language === 'ar' ? 'ترقية' : 'Promote'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-1 rounded bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-100 cursor-pointer"
                          title="Delete Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 2. LEADER PORTAL (DEPARTMENTAL OVERVIEW) */}
      {/* ========================================== */}
      {currentUser.role === 'Leader' && (
        <div className="space-y-8 animate-fade-in">
          {/* departmental metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{language === 'ar' ? 'أعضاء القسم' : 'Department Members'}</span>
                <p className="text-2xl font-black text-slate-800 font-mono">{leaderDeptMembers.length}</p>
              </div>
              <div className="p-3 bg-blue-50 text-eye-brand rounded-xl">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{language === 'ar' ? 'إجمالي المهام' : 'Total Tasks'}</span>
                <p className="text-2xl font-black text-slate-800 font-mono">{leaderDeptTasks.length}</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
                <CheckSquare className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{language === 'ar' ? 'تسليمات بانتظار المراجعة' : 'Pending Submissions'}</span>
                <p className="text-2xl font-black text-amber-500 font-mono">
                  {leaderDeptSubs.filter(s => s.status === 'Pending').length}
                </p>
              </div>
              <div className="p-3 bg-red-50 text-red-500 rounded-xl">
                <FileCheck className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Department Members Table */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                <span>{language === 'ar' ? `الأعضاء التابعون لقسمك المباشر (${leaderDeptMembers.length})` : `Department Members under your scope (${leaderDeptMembers.length})`}</span>
              </h2>

              {leaderDeptMembers.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-bold">
                  {language === 'ar' ? 'لا يوجد أعضاء نشطون مسجلون في قسمك حالياً.' : 'No members are registered under your specific department yet.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="pb-3 text-start">{language === 'ar' ? 'الاسم' : 'Name'}</th>
                        <th className="pb-3 text-start">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                        <th className="pb-3 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leaderDeptMembers.map(u => (
                        <tr 
                          key={u.id} 
                          onClick={() => onNavigateToView('profile', u.id)}
                          className="hover:bg-blue-50/60 dark:hover:bg-slate-800/60 cursor-pointer transition-colors group"
                          title={language === 'ar' ? 'عرض الملف الشخصي' : 'View Profile'}
                        >
                          <td className="py-3 font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 group-hover:text-blue-600">
                            <img src={u.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.fullName)}`} className="w-7 h-7 rounded-lg object-cover group-hover:scale-105 transition-transform" alt="" />
                            <span className="group-hover:underline">{u.fullName}</span>
                          </td>
                          <td className="py-3 text-slate-500 font-mono text-[11px] text-start">{u.email}</td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] uppercase border border-emerald-200/50 font-mono">
                              {u.status === 'Active' ? (language === 'ar' ? 'نشط' : 'Active') : u.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Department Pending Reviews Alerts */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <span>{language === 'ar' ? `تسليمات تحتاج لمراجعتك وتقييمك (${leaderDeptSubs.filter(s => s.status === 'Pending').length})` : `Pending Solutions Review (${leaderDeptSubs.filter(s => s.status === 'Pending').length})`}</span>
              </h3>
              <div className="space-y-3">
                {leaderDeptSubs.filter(s => s.status === 'Pending').length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 font-bold">
                    {language === 'ar' ? 'رائع! لا توجد تسليمات معلقة تحتاج للمراجعة حالياً.' : 'All submissions reviewed. Good job!'}
                  </div>
                ) : (
                  leaderDeptSubs.filter(s => s.status === 'Pending').map(sub => (
                    <div
                      key={sub.id}
                      onClick={() => onNavigateToView('tasks', sub.taskId)}
                      className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl hover:border-eye-brand cursor-pointer flex justify-between items-start transition-all hover:bg-slate-100"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">{sub.fileName}</p>
                        <p className="text-[10px] text-slate-500 block mt-1">{language === 'ar' ? 'بواسطة' : 'By'} {sub.memberName} • {sub.taskName}</p>
                      </div>
                      <span className="text-[10px] font-mono text-eye-brand bg-amber-50 px-1.5 py-0.5 rounded uppercase font-bold shrink-0 border border-amber-200/40">
                        {language === 'ar' ? 'مراجعة وتقييم' : 'Review File'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Active Members List Widget */}
            {renderActiveMembersWidget()}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 3. MEMBER PORTAL (INDIVIDUAL PROGRESS CARD) */}
      {/* ========================================== */}
      {currentUser.role === 'Member' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
          {/* Member stats widgets */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center space-y-4 flex flex-col items-center shadow-sm">
              <img src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.fullName)}`} className="w-16 h-16 rounded-2xl border-2 border-amber-400 object-cover" alt="" />
              <div>
                <h3 className="text-base font-extrabold text-slate-800">{currentUser.fullName}</h3>
                <span className="text-[10px] text-eye-brand font-bold uppercase tracking-widest">{translateCommittee(currentUser.committee)} / {translateDepartment(currentUser.department)}</span>
              </div>

              {/* Progress visual indicator */}
              <div className="relative w-28 h-28 flex items-center justify-center pt-2">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="56" cy="56" r="48" stroke="rgba(0,0,0,0.03)" strokeWidth="8" fill="transparent" />
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    stroke="var(--color-eye-brand)"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray="301.6"
                    strokeDashoffset={301.6 - (301.6 * (memberSubs.filter(s => s.status === 'Accepted').length / Math.max(1, memberTasks.length)))}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-slate-800 font-mono">
                    {Math.round((memberSubs.filter(s => s.status === 'Accepted').length / Math.max(1, memberTasks.length)) * 100)}%
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{language === 'ar' ? 'نسبة الإنجاز' : 'Completed'}</span>
                </div>
              </div>

              <div className="w-full grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-start">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{language === 'ar' ? 'المهام المعينة' : 'Assigned'}</span>
                  <p className="text-xs sm:text-sm font-bold text-slate-800">{memberTasks.length} {language === 'ar' ? 'مهام' : 'Tasks'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{language === 'ar' ? 'المقبولة' : 'Accepted'}</span>
                  <p className="text-xs sm:text-sm font-bold text-emerald-600">{memberSubs.filter(s => s.status === 'Accepted').length} {language === 'ar' ? 'ملفات' : 'Files'}</p>
                </div>
              </div>
            </div>
            
            {/* Active Members List Widget */}
            {renderActiveMembersWidget()}
          </div>

          {/* Assigned Tasks panel for Members */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-500" />
                <span>{language === 'ar' ? `الأهداف والمهام المسندة لقسمك حالياً (${memberTasks.length})` : `Department Task Objectives Assigned to You (${memberTasks.length})`}</span>
              </h2>
            </div>

            <div className="space-y-4">
              {memberTasks.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-bold">
                  {language === 'ar' ? 'لا توجد مهام إدارية منشورة لقسمك حالياً.' : 'No tasks assigned to your department at this moment. Stay tuned!'}
                </div>
              ) : (
                memberTasks.map(task => {
                  const hasSubmitted = memberSubs.find(s => s.taskId === task.id);
                  return (
                    <div
                      key={task.id}
                      onClick={() => onNavigateToView('tasks', task.id)}
                      className="p-4 bg-slate-50 border border-slate-200/60 hover:border-eye-brand rounded-2xl cursor-pointer flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all hover:bg-slate-100 text-start"
                    >
                      <div className="space-y-1">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          task.priority === 'High' || task.priority === 'Urgent' ? 'bg-red-50 text-red-600 border border-red-200/50' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {task.priority === 'High' ? (language === 'ar' ? 'أولوية عالية' : 'High Priority') : 
                           task.priority === 'Urgent' ? (language === 'ar' ? 'عاجل جداً' : 'Urgent Priority') : 
                           (language === 'ar' ? 'أولوية عادية' : 'Normal Priority')}
                        </span>
                        <p className="text-xs font-bold text-slate-800">{task.name}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{task.description}</p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-start sm:text-end font-mono text-[10px]">
                          <span className="text-slate-400 block">{language === 'ar' ? 'الموعد النهائي' : 'Deadline'}</span>
                          <span className="text-slate-600 font-bold">{new Date(task.deadline).toLocaleDateString()}</span>
                        </div>

                        {hasSubmitted ? (
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
                            hasSubmitted.status === 'Accepted' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                            hasSubmitted.status === 'Rejected' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {hasSubmitted.status === 'Accepted' ? (language === 'ar' ? 'مقبول' : 'Accepted') :
                             hasSubmitted.status === 'Rejected' ? (language === 'ar' ? 'مرفوض' : 'Rejected') :
                             (language === 'ar' ? 'قيد المراجعة' : 'Pending')}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-eye-brand border border-amber-200/40">
                            {language === 'ar' ? 'رفع ملف الإجابة' : 'Submit File'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: CREATE LEADER FORM (SUPER ADMIN) */}
      {/* ========================================== */}
      {showCreateLeaderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Shield className="w-4.5 h-4.5 text-amber-500" />
                <span>{language === 'ar' ? 'تخصيص وتفعيل حساب قائد جديد' : 'Provision Official Leader Account'}</span>
              </h3>
              <button
                onClick={() => setShowCreateLeaderModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-all cursor-pointer"
              >
                <XCircle className="w-4.5 h-4.5" />
              </button>
            </div>

            {leaderError && <p className="p-3 text-xs font-bold text-red-600 bg-red-50 rounded-xl border border-red-100">{leaderError}</p>}
            {leaderSuccess && <p className="p-3 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl border border-emerald-100">{leaderSuccess}</p>}

            <form onSubmit={handleCreateLeader} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{language === 'ar' ? 'الاسم بالكامل' : 'Full Name'}</label>
                <input
                  type="text"
                  required
                  value={newLeaderName}
                  onChange={(e) => setNewLeaderName(e.target.value)}
                  placeholder={language === 'ar' ? 'أحمد كمال' : 'Aly Hassan'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-eye-brand font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
                  <input
                    type="email"
                    required
                    value={newLeaderEmail}
                    onChange={(e) => setNewLeaderEmail(e.target.value)}
                    placeholder="leader@eye.org"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-eye-brand font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{language === 'ar' ? 'رقم الهاتف' : 'Phone'}</label>
                  <input
                    type="tel"
                    required
                    value={newLeaderPhone}
                    onChange={(e) => setNewLeaderPhone(e.target.value)}
                    placeholder="+201200000000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-eye-brand font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{language === 'ar' ? 'المنصب / الدور القيادي' : 'Leadership Position'}</label>
                <select
                  value={newLeaderRole}
                  onChange={(e) => setNewLeaderRole(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-eye-brand font-bold"
                >
                  <option value="Leader">{language === 'ar' ? 'قائد لجنة (Leader)' : 'Committee Leader'}</option>
                  <option value="Vice">{language === 'ar' ? 'نائب رئيس (Vice)' : 'Vice Leader'}</option>
                  <option value="Coordinator">{language === 'ar' ? 'منسق عام (Coordinator)' : 'General Coordinator'}</option>
                  <option value="Deputy Coordinator">{language === 'ar' ? 'نائب منسق (Deputy Coordinator)' : 'Deputy Coordinator'}</option>
                </select>
              </div>

              {/* Dynamic Committee selection based on position */}
              {!['Coordinator', 'Deputy Coordinator'].includes(newLeaderRole) && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{language === 'ar' ? 'اللجنة الرئيسية' : 'Primary Committee'}</label>
                  <select
                    value={newLeaderCommittee}
                    onChange={(e) => {
                      setNewLeaderCommittee(e.target.value);
                      const depts = COMMITTEE_STRUCTURE[e.target.value] || [];
                      if (depts.length > 0) setNewLeaderDepartment(depts[0]);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-eye-brand font-bold"
                  >
                    {Object.keys(COMMITTEE_STRUCTURE).map(comm => (
                      <option key={comm} value={comm}>{translateCommittee(comm)}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-eye-brand hover:bg-eye-brand-dark text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm mt-2 transition-all shadow-md cursor-pointer"
              >
                {language === 'ar' ? 'تفعيل وتخصيص الحساب الآن' : 'Provision Leader Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: BULK IMPORT MEMBERS FROM TEXT CSV */}
      {/* ========================================== */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-amber-500" />
                <span>{language === 'ar' ? 'استيراد جماعي للأعضاء (من قائمة إكسل)' : 'Bulk Import Members from List'}</span>
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-all cursor-pointer"
              >
                <XCircle className="w-4.5 h-4.5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              {language === 'ar' ? (
                <>
                  يرجى ترتيب الأسطر كالتالي: <code className="text-amber-600 font-mono bg-slate-50 px-1 py-0.5 rounded border border-slate-100">الاسم، الايميل، رقم التليفون، كود اللجنة، كود القسم</code> (عضو واحد لكل سطر). سيتم تفعيل حساباتهم فورياً.
                </>
              ) : (
                <>
                  Format your rows as: <code className="text-amber-600 font-mono bg-slate-50 px-1 py-0.5 rounded border border-slate-100">Full Name, Email, Phone, Committee, Department</code> (one member per line).
                </>
              )}
            </p>

            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={language === 'ar' 
                ? 'عمرو سليمان, amr@eye.org, +201012345678, SM, Graphic Design\nدينا كامل, dina@eye.org, +201123456789, HR, HRM' 
                : 'Amr Soliman, amr@eye.org, +201012345678, SM, Graphic Design\nDina Kamel, dina@eye.org, +201123456789, HR, HRM'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 font-mono focus:outline-none focus:border-eye-brand resize-none font-semibold"
            />

            {importCount !== null && (
              <p className="p-3 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl border border-emerald-100">
                {language === 'ar' ? `تم استيراد وتفعيل ${importCount} حساب بنجاح في قاعدة البيانات الحالية.` : `Successfully imported and active ${importCount} member accounts.`}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleBulkImport}
                className="bg-eye-brand hover:bg-eye-brand-dark text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md cursor-pointer"
              >
                {language === 'ar' ? 'بدء الاستيراد الفوري' : 'Execute Bulk Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WEEKLY REPORT CARD MODAL */}
      {showWeeklyReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-start relative overflow-hidden">
            {/* Header ornament */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  📊
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    {language === 'ar' ? `تقرير الأسبوع الشخصي — ${currentUser.fullName}` : `Weekly Progress Report — ${currentUser.fullName}`}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {language === 'ar' ? `كيان المصريون الشباب EYE • ${userGovAr}` : `EYE ${userGovEn} Entity Official Telemetry`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowWeeklyReport(false)}
                className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-blue-50/50 dark:bg-blue-950/30 p-3.5 rounded-2xl border border-blue-100 dark:border-blue-900/40">
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase block">
                  {language === 'ar' ? 'المهام المسلمة' : 'Submissions'}
                </span>
                <p className="text-xl font-black text-blue-700 dark:text-blue-300 font-mono mt-1">
                  {memberSubs.length}
                </p>
                <span className="text-[9px] text-slate-400">
                  {language === 'ar' ? 'من أصل كافة التكاليف' : 'Total completed'}
                </span>
              </div>

              <div className="bg-amber-50/50 dark:bg-amber-950/30 p-3.5 rounded-2xl border border-amber-100 dark:border-amber-900/40">
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase block">
                  {language === 'ar' ? 'سلسلة الالتزام 🔥' : 'Current Streak 🔥'}
                </span>
                <p className="text-xl font-black text-amber-700 dark:text-amber-300 font-mono mt-1">
                  {currentUser.streakCount || 0} {language === 'ar' ? 'أيام' : 'Days'}
                </p>
                <span className="text-[9px] text-slate-400">
                  {language === 'ar' ? 'أيام متتالية من النشاط' : 'Consecutive activity'}
                </span>
              </div>

              <div className="bg-purple-50/50 dark:bg-purple-950/30 p-3.5 rounded-2xl border border-purple-100 dark:border-purple-900/40">
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase block">
                  {language === 'ar' ? 'اللجنة والفرع' : 'Committee'}
                </span>
                <p className="text-xs font-black text-purple-700 dark:text-purple-300 mt-1 truncate">
                  {translateCommittee(currentUser.committee)}
                </p>
                <span className="text-[9px] text-slate-400 truncate block">
                  {translateDepartment(currentUser.department)}
                </span>
              </div>

              <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase block">
                  {language === 'ar' ? 'الحالة العامة' : 'Overall Status'}
                </span>
                <p className="text-xs font-black text-emerald-700 dark:text-emerald-300 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{currentUser.status}</span>
                </p>
                <span className="text-[9px] text-slate-400">
                  {language === 'ar' ? 'عضوية معتمدة' : 'Active membership'}
                </span>
              </div>
            </div>

            {/* Assessment Note */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs space-y-1">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>{language === 'ar' ? 'تقييم وتوجيه الأسبوع 💡' : 'Weekly Recommendation 💡'}</span>
              </h4>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                {language === 'ar' 
                  ? 'أداؤك يستحق التقدير! يُوصى بزيادة التفاعل في شات اللجان والورش للحفاظ على تتابع نقاط الـ Streak والارتقاء في لوحة الصدارة.'
                  : 'Great effort this week! Keep maintaining your daily streak to earn bonus points on the Leaderboard.'}
              </p>
            </div>

            {/* Print & Action Buttons */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <span>{language === 'ar' ? 'طباعة / حفظ PDF 🖨️' : 'Print / Export PDF 🖨️'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
