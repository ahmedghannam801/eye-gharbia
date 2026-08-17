import React from 'react';
import { LayoutDashboard, FolderKanban, Trophy, Bell, User, Menu } from 'lucide-react';
import { UserProfile } from '../types';
import { useLanguage } from '../lib/LanguageContext';

interface MobileBottomNavProps {
  currentView: string;
  onViewChange: (view: string) => void;
  currentUser: UserProfile;
  onOpenMobileSidebar: () => void;
  unreadAnnouncementsCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onViewChange,
  currentUser,
  onOpenMobileSidebar,
  unreadAnnouncementsCount = 0,
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const navItems = [
    {
      id: 'dashboard',
      label: isAr ? 'الرئيسية' : 'Home',
      icon: LayoutDashboard,
    },
    {
      id: 'tasks',
      label: isAr ? 'المهام' : 'Tasks',
      icon: FolderKanban,
    },
    {
      id: 'leaderboard',
      label: isAr ? 'الصدارة' : 'Ranks',
      icon: Trophy,
    },
    {
      id: 'announcements',
      label: isAr ? 'الإشعارات' : 'Notifs',
      icon: Bell,
      badge: unreadAnnouncementsCount,
    },
    {
      id: 'profile',
      label: isAr ? 'حسابي' : 'Profile',
      icon: User,
    },
  ];

  return (
    <div className="fixed bottom-0 start-0 end-0 z-40 block lg:hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800/80 px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-all">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex flex-col items-center justify-center min-w-[54px] py-1 px-1 rounded-xl transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'text-eye-brand dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -end-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-white dark:ring-slate-900 animate-pulse">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 truncate max-w-[60px] ${isActive ? 'font-black' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Menu Toggler for extra options */}
        <button
          onClick={onOpenMobileSidebar}
          className="flex flex-col items-center justify-center min-w-[54px] py-1 px-1 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 active:scale-95 transition-all"
        >
          <div className="relative">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 font-medium truncate">
            {isAr ? 'المزيد' : 'More'}
          </span>
        </button>
      </div>
    </div>
  );
};
