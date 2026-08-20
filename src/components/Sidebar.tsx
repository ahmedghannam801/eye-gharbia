import React, { useState } from 'react';
import { EyeLogo, MinistryLogo } from './EyeLogo';

import { UserProfile, getUserRoleTitle } from '../types';
import { db, saveProfileOverride } from '../db/localDb';
import { PanelRightClose, PanelRightOpen, LayoutDashboard, FolderKanban, Megaphone, BarChart3, User, Settings, LogOut, X, Phone, Share2, Trophy, Bell, CalendarDays, Star, Target, Lightbulb, BookOpen, Gift, HelpCircle, Crown, Video, Radio, FileCheck, Calendar, MessageSquare, Flame, FolderDown, Bot, Camera, Clock, Award, Palette } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { useTheme } from '../lib/ThemeContext';

interface SidebarProps {
  currentUser: UserProfile;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  currentView,
  onViewChange,
  onLogout,
  isOpen,
  setIsOpen,
  isCollapsed = false,
  setIsCollapsed,
}) => {
  const { t, isRtl, language, translateCommittee, translateDepartment } = useLanguage();
  const [showAvatarLightbox, setShowAvatarLightbox] = useState(false);
  const { theme } = useTheme();

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Super Admin':
        return 'bg-red-50 text-red-700 border-red-200/50 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50';
      case 'Leader':
        return 'bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50';
    }
  };

  const unreadCount = db.getNotifications(currentUser.id).filter(n => !n.isRead).length;
  const hasLiveBroadcast = db.getLiveWorkshops(currentUser.committee).some(w => w.status === 'Live');

  const ALL_ROLES = ['Member', 'Leader', 'Super Admin', 'HRM', 'Vice', 'Coordinator', 'Deputy Coordinator'];
  const ADMIN_PLUS = ['Leader', 'Super Admin', 'HRM', 'Vice', 'Coordinator', 'Deputy Coordinator'];
  const TOP_ROLES = ['Super Admin', 'HRM', 'Vice', 'Coordinator', 'Deputy Coordinator'];

  // ── NAV grouped into sections ──
  const navGroups: {
    groupLabel: string;
    items: { id: string; label: string; icon: any; roles: string[]; badge?: number }[];
  }[] = [
    {
      groupLabel: language === 'ar' ? 'الرئيسية' : 'Core',
      items: [
        { id: 'dashboard',     label: language === 'ar' ? 'القائمة الرئيسية' : t('dashboard'),     icon: LayoutDashboard, roles: ALL_ROLES },
        { id: 'profile',       label: t('profile'),       icon: User,          roles: ALL_ROLES },
        { id: 'tasks',         label: language === 'ar' ? 'المهام الإدارية' : t('tasks'),         icon: FolderKanban,  roles: ALL_ROLES },
        { id: 'announcements', label: language === 'ar' ? 'الإعلانات والتعاميم' : t('announcements'), icon: Megaphone,     roles: ALL_ROLES, badge: unreadCount },
        { id: 'meetings',      label: language === 'ar' ? 'الاجتماعات' : 'Meetings',      icon: CalendarDays, roles: ALL_ROLES },
        { id: 'excuses-freeze', label: language === 'ar' ? 'الأعذار وطلب الفريز' : 'Excuses & Freeze', icon: Clock, roles: ALL_ROLES },
      ],
    },
    {
      groupLabel: language === 'ar' ? 'التنافسية والتميز' : 'Excellence & Ranking',
      items: [
        { id: 'leaderboard',   label: language === 'ar' ? 'لوحة الصدارة والترتيب' : 'Leaderboard & Ranks', icon: Trophy, roles: ALL_ROLES },
        { id: 'challenges',    label: language === 'ar' ? 'التحديات والسلسلة' : 'Challenges & Streaks', icon: Flame, roles: ALL_ROLES },
        { id: 'academy',       label: language === 'ar' ? 'الأكاديمية' : 'Academy',           icon: BookOpen,   roles: ALL_ROLES },
        { id: 'certificates',  label: language === 'ar' ? 'الشهادات' : 'Certificates',               icon: Star,      roles: ALL_ROLES },
        { id: 'rewards',       label: language === 'ar' ? 'متجر المكافآت' : 'Rewards Shop',   icon: Gift,       roles: ALL_ROLES },
      ],
    },
    {
      groupLabel: language === 'ar' ? 'تقييم الأداء والتقارير' : 'Performance & Reports',
      items: [
        { id: 'feedback',     label: language === 'ar' ? 'تقييم الأعضاء والقادة 360°' : '360° Evaluation Hub', icon: Star, roles: ['Leader', ...TOP_ROLES] },
        { id: 'radar',        label: language === 'ar' ? 'رادار الأداء' : 'Performance Radar',      icon: BarChart3, roles: ALL_ROLES },
        { id: 'exec-report',  label: language === 'ar' ? 'مركز التقارير الموحد' : 'Reports Hub', icon: FileCheck, roles: [...TOP_ROLES, 'Leader'] },
        { id: 'disciplinary', label: language === 'ar' ? 'السجل الانضباطي والإنذارات 📜' : 'Disciplinary Vault 📜', icon: ShieldAlert, roles: ALL_ROLES },
      ],
    },
    {
      groupLabel: language === 'ar' ? 'التفاعل والأنشطة' : 'Activities & Workflows',
      items: [
        { id: 'memory-wall',   label: language === 'ar' ? 'معرض الذكريات 📸' : 'Memory Wall 📸', icon: Camera, roles: ALL_ROLES },
        { id: 'workplans',     label: language === 'ar' ? 'خطط العمل' : 'Work Plans',         icon: Target,     roles: ALL_ROLES },
        { id: 'ideabank',      label: language === 'ar' ? 'بنك الأفكار والمقترحات' : 'Ideas & Pitch Bank', icon: Lightbulb, roles: ALL_ROLES },
        { id: 'polls',         label: language === 'ar' ? 'الاستطلاعات' : 'Polls',            icon: BarChart3,  roles: ALL_ROLES },
        { id: 'trivia',        label: language === 'ar' ? 'المسابقات الأسبوعية' : 'Weekly Trivia', icon: HelpCircle, roles: ALL_ROLES },
        { id: 'templates-hub', label: language === 'ar' ? 'مكتبة القوالب والنماذج' : 'Templates Hub', icon: FolderDown, roles: [...TOP_ROLES, 'Leader'] },
        { id: 'poster-maker',  label: language === 'ar' ? 'صانع البوسترات والتهاني 🎨' : 'Poster Maker 🎨', icon: Palette, roles: ALL_ROLES },
      ],
    },
    {
      groupLabel: language === 'ar' ? 'الإدارة والإعدادات' : 'Admin & System',
      items: [
        { id: 'rules',   label: language === 'ar' ? 'اللوائح والقوانين والإرشادات' : 'Rules & Bylaws', icon: BookOpen,  roles: ALL_ROLES },
        { id: 'social',  label: language === 'ar' ? 'السوشيال ميديا' : 'Social Media',                         icon: Share2,    roles: ALL_ROLES },
        { id: 'settings', label: t('settings'),                                                                 icon: Settings,  roles: ['Super Admin'] },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 z-50 flex flex-col bg-white dark:bg-slate-900 py-6 transition-all duration-300 lg:static lg:translate-x-0 start-0 border-e border-slate-150 dark:border-slate-800 ${
          isCollapsed ? 'w-20 px-3' : 'w-72 px-4'
        } ${
          isOpen ? 'translate-x-0' : (isRtl ? 'max-lg:translate-x-full' : 'max-lg:-translate-x-full')
        }`}
        id="app-sidebar"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-5 px-1">
          <EyeLogo size={38} showText={!isCollapsed} theme={theme} />
          
          <div className="flex items-center gap-1">
            {/* Desktop Collapse Toggle */}
            {setIsCollapsed && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                title={isCollapsed ? (language === 'ar' ? 'توسيع القائمة' : 'Expand Sidebar') : (language === 'ar' ? 'طي القائمة' : 'Collapse Sidebar')}
              >
                {isCollapsed ? <PanelRightOpen className="w-5 h-5" /> : <PanelRightClose className="w-5 h-5" />}
              </button>
            )}

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User Card — Custom Executive VIP styling matching exact user screenshot */}
        {!isCollapsed ? (
          <div className="mb-5 rounded-2xl p-4 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 border border-amber-500/60 text-white shadow-lg shadow-amber-500/10 relative overflow-hidden transition-all">
            {/* Ambient Gold Glow */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-500/15 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-start justify-between gap-2 relative z-10">
              <div className="min-w-0 flex-1 space-y-0.5">
                <h4 className="text-xs font-black truncate text-white leading-tight">
                  {currentUser.fullName}
                </h4>
                <p className="text-[10px] truncate text-slate-300 font-medium dir-ltr text-start">
                  {currentUser.email}
                </p>
                {currentUser.phoneNumber && (
                  <p className="text-[10px] text-amber-400 font-mono font-semibold flex items-center gap-1 mt-0.5 dir-ltr">
                    <Phone className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                    <span>+{currentUser.phoneNumber.replace(/^\+/, '')}</span>
                  </p>
                )}
              </div>

              {/* Avatar with Gold Crown Frame */}
              <div className="relative shrink-0">
                <div className="rounded-xl p-0.5 bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.4)]">
                  <img
                    src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.fullName)}`}
                    alt={currentUser.fullName}
                    referrerPolicy="no-referrer"
                    onClick={() => setShowAvatarLightbox(true)}
                    className="w-11 h-11 rounded-lg object-cover cursor-pointer hover:scale-105 transition-transform bg-slate-800"
                  />
                </div>
                <div className="absolute -bottom-1 -start-1 p-0.5 rounded-md bg-amber-500 text-slate-950 shadow-sm pointer-events-none border border-slate-900">
                  {['Super Admin', 'Vice', 'Coordinator'].includes(currentUser.role) ? <Crown className="w-2.5 h-2.5" /> :
                   currentUser.role === 'Leader' ? <Award className="w-2.5 h-2.5" /> :
                   <User className="w-2.5 h-2.5" />}
                </div>
              </div>
            </div>

            {/* Position + Committee metadata details */}
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">{language === 'ar' ? 'المسمى الوظيفي' : 'Position'}</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[9px] shadow-sm border border-emerald-300/30">
                  {getUserRoleTitle(currentUser, language)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">{language === 'ar' ? 'اللجنة' : 'Committee'}</span>
                <span className="font-extrabold text-white">{translateCommittee(currentUser.committee)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">{language === 'ar' ? 'القسم' : 'Department'}</span>
                <span className="font-extrabold text-amber-400">{translateDepartment(currentUser.department)}</span>
              </div>
              {currentUser.role !== 'Member' && (
                <div className="flex items-center justify-between pt-1 border-t border-dotted border-white/10">
                  <span className="text-slate-400 font-medium">{language === 'ar' ? 'كود العضوية' : 'Code'}</span>
                  <span className="font-mono font-black text-amber-300 tracking-wider">
                    {currentUser.membershipCode || 'EYE-MEMBER'}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-5 flex justify-center">
            <div className="rounded-xl p-0.5 bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-600">
              <img
                src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.fullName)}`}
                alt={currentUser.fullName}
                referrerPolicy="no-referrer"
                onClick={() => setShowAvatarLightbox(true)}
                className="w-10 h-10 rounded-lg object-cover cursor-pointer hover:scale-105 transition-transform bg-slate-800"
              />
            </div>
          </div>
        )}

        {/* Navigation — Grouped into Categories */}
        <nav className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden pe-1 scrollbar-thin">
          {navGroups.map(group => {
            const role = currentUser?.role || 'Member';
            const visibleItems = group.items.filter(item => 
              item.roles.includes(role) || 
              role === 'Super Admin' ||
              (role === 'HRM' && item.roles.includes('Leader'))
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.groupLabel}>
                {/* Section Header */}
                {!isCollapsed && (
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 mb-1.5 truncate">
                    {group.groupLabel}
                  </p>
                )}
                <div className="space-y-0.5">
                  {visibleItems.map(item => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    const badge = item.badge;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onViewChange(item.id);
                          setIsOpen(false);
                        }}
                        title={isCollapsed ? item.label : undefined}
                        className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-150 ${
                          isActive
                            ? 'bg-eye-brand text-white shadow-md shadow-eye-brand/20 font-black'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                        } ${isCollapsed ? 'justify-center px-0' : ''}`}
                      >
                        <div className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : ''}`}>
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </div>
                        {!isCollapsed && badge !== undefined && badge > 0 && (
                          <span className={`min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[9px] font-black ${
                            isActive ? 'bg-white/25 text-white' : 'bg-red-500 text-white'
                          }`}>{badge > 9 ? '9+' : badge}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Logout Section */}
        <div className="mt-auto border-t border-slate-100 dark:border-slate-800 pt-4">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-all duration-150"
            id="sidebar-logout-btn"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Profile Avatar Lightbox */}
      {showAvatarLightbox && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fade-in"
          onClick={() => setShowAvatarLightbox(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setShowAvatarLightbox(false)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Main Lightbox Content */}
          <div className="flex flex-col items-center max-w-md w-full text-center space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="relative rounded-full overflow-hidden border-4 border-white/25 shadow-2xl bg-slate-900 w-64 h-64 sm:w-80 sm:h-80 mx-auto">
              <img
                src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.fullName)}`}
                alt="Enlarged profile view"
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl max-w-xs mx-auto border border-white/5 text-white space-y-2">
              <div>
                <p className="text-sm font-black">{currentUser.fullName}</p>
                <p className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider">{currentUser.role} • {currentUser.committee}</p>
              </div>
              <button
                onClick={() => {
                  setShowAvatarLightbox(false);
                  onViewChange('profile');
                }}
                className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>{language === 'ar' ? 'تغيير الصورة الشخصية' : 'Change Profile Picture'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
