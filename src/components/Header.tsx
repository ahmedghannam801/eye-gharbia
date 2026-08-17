import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db/localDb';
import { UserProfile, SystemNotification, EGYPTIAN_GOVERNORATES, getActiveGovernorate } from '../types';
import { Search, Bell, Check, Sparkles, MessageSquare, AlertTriangle, Menu, Calendar, Clock, Globe, X, FolderKanban, User, Phone, Mail, Sun, Moon, Trash2, Radio, ArrowLeft, ArrowRight, Download, Smartphone, Send, Megaphone, MapPin } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { useTheme } from '../lib/ThemeContext';
import { MinistryLogo } from './EyeLogo';
import { sendTestPushNotification } from '../lib/pushNotifications';


interface HeaderProps {
  currentUser: UserProfile;
  currentView?: string;
  onMenuToggle: () => void;
  onNavigateToView: (view: string, targetId?: string) => void;
  onGoBack?: () => void;
}

// Map a notification to the correct view + optional targetId so clicking it
// takes the user straight to the right place (announcement, task, profile,
// certificates, etc.) — not the generic "tasks" page for everything.
const getNotifDestination = (
  notif: SystemNotification,
  role: string
): { view: string; targetId?: string } => {
  const title = notif.title || '';
  const relatedId = notif.relatedId;

  // 1) Certificate notification → take them to their certificates on the profile
  if (title.includes('شهادة') || title.includes('Certificate') || title.startsWith('📜')) {
    return { view: 'profile', targetId: relatedId };
  }

  // 2) Badges → profile page (badges are shown there)
  if (title.includes('شارة') || title.startsWith('🏅')) {
    return { view: 'profile' };
  }

  // 3) Quiz / trivia answers
  if (title.includes('إجابة') || title.startsWith('🎉')) {
    return { view: 'trivia' };
  }

  // 4) Anonymous suggestion box (admins only receive this)
  if (title.includes('اقتراح') || title.startsWith('💬')) {
    return { view: 'suggestions' };
  }

  // 5) Announcements → announcements view, scroll to that one
  if (title.includes('Announcement') || title.includes('إعلان')) {
    return { view: 'announcements', targetId: relatedId };
  }

  // 6) New registration request (admins only)
  if (title.includes('Registration') || title.includes('تسجيل')) {
    if (role === 'Super Admin' || role === 'Vice' || role === 'Coordinator' || role === 'Deputy Coordinator') {
      // No dedicated members-management view — take them to the dashboard
      // where the registration-approval CTA lives.
      return { view: 'dashboard' };
    }
    return { view: 'profile' };
  }

  // 7) Account status / role changes → profile
  if (
    title.includes('Account') ||
    title.includes('حساب') ||
    title.includes('Promoted') ||
    title.includes('منصبك') ||
    title.includes('ترقية')
  ) {
    return { view: 'profile' };
  }

  // 8) Task / submission related (most common case) → tasks with focus
  // Covers: New Task Assigned, New Task Published, Submission Reviewed,
  // Submission Rejected, Resubmission Requested, New Submission Received
  return { view: 'tasks', targetId: relatedId };
};

const translateNotification = (title: string, message: string, lang: 'ar' | 'en') => {
  if (lang !== 'ar') return { title, message };

  let arTitle = title;
  let arMessage = message;

  // Translate Titles
  if (title === 'New Task Assigned') arTitle = 'تم تعيين مهمة جديدة 📝';
  else if (title === 'New Task Published') arTitle = 'تم نشر مهمة جديدة 📢';
  else if (title === 'New Announcement Published') arTitle = 'تم نشر إعلان جديد 📢';
  else if (title === 'Task Submission Accepted!') arTitle = 'تم قبول تسليم المهمة! 🎉';
  else if (title === 'Submission Reviewed') arTitle = 'تمت مراجعة التسليم';
  else if (title === 'Submission Rejected') arTitle = 'تم رفض تسليم المهمة ⚠️';
  else if (title === 'Resubmission Requested') arTitle = 'مطلوب إعادة تسليم المهمة';
  else if (title === 'New Submission Received') arTitle = 'تم استلام تسليم جديد 📥';
  else if (title === 'New Registration Request') arTitle = 'طلب تسجيل جديد 👤';
  else if (title === 'Account Approved!') arTitle = 'تم تفعيل الحساب بنجاح! ✨';
  else if (title === 'Account Status Changed') arTitle = 'تغيرت حالة الحساب';
  else if (title === 'Congratulations! Promoted to Leader') arTitle = 'تهانينا! تمت ترقيتك إلى قائد 👑';

  // Translate Messages
  if (message.startsWith('New task published in your department:')) {
    const taskName = message.match(/"([^"]+)"/)?.[1] || '';
    const deadline = message.split('Deadline:')[1]?.trim() || '';
    arMessage = `مهمة جديدة لـ ${taskName}${deadline ? ' • الموعد النهائي: ' + deadline : ''}`;
  } else if (message.startsWith('A draft task is now active:')) {
    const taskName = message.match(/"([^"]+)"/)?.[1] || '';
    const due = message.split('Due:')[1]?.trim() || '';
    arMessage = `المهمة أصبحت نشطة الآن: "${taskName}"${due ? ' • تاريخ الاستحقاق: ' + due : ''}`;
  } else if (message.includes('has been updated to')) {
    const taskName = message.match(/"([^"]+)"/)?.[1] || '';
    const status = message.split('updated to')[1]?.trim() || '';
    let statusAr = status;
    if (status.startsWith('Accepted')) statusAr = 'مقبول ✅';
    else if (status.startsWith('Rejected')) statusAr = 'مرفوض ❌';
    else if (status.startsWith('Resubmission Requested')) statusAr = 'مطلوب إعادة التسليم ⚠️';
    
    arMessage = `تم تحديث حالة تسليمك لمهمة "${taskName}" إلى [${statusAr}].`;
  } else if (message.includes('has registered and is pending super admin approval.')) {
    const name = message.split('has registered')[0]?.trim() || '';
    arMessage = `قام العضو ${name} بالتسجيل وهو بانتظار موافقة المسؤول.`;
  } else if (message.includes('submitted a file for')) {
    const name = message.split('submitted a file for')[0]?.trim() || '';
    const taskName = message.match(/"([^"]+)"/)?.[1] || '';
    arMessage = `قام العضو ${name} بتقديم تسليم للمهمة: "${taskName}".`;
  } else if (message.includes('Congratulations! Your account has been approved.')) {
    arMessage = 'تهانينا! تم قبول وتفعيل حسابك بنجاح. لديك الآن الصلاحية الكاملة لاستخدام المنصة.';
  } else if (message.startsWith('Your account status has been updated to')) {
    const status = message.replace('Your account status has been updated to', '').trim().replace('.', '');
    arMessage = `تم تحديث حالة حسابك إلى: ${status === 'Active' ? 'نشط' : status}.`;
  } else if (message.includes('You have been promoted to the Leader role')) {
    arMessage = `تهانينا! تمت ترقيتك لمنصب القائد لقسمك بنجاح.`;
  } else if (message.startsWith('Important: "')) {
    const titleVal = message.match(/"([^"]+)"/)?.[1] || '';
    arMessage = `هام: تم نشر إعلان جديد من قبل الإدارة: "${titleVal}"`;
  }

  return { title: arTitle, message: arMessage };
};

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentView,
  onMenuToggle,
  onNavigateToView,
  onGoBack,
}) => {
  const { language, setLanguage, t, isRtl, translateDepartment, translateCommittee } = useLanguage();
  const { theme, toggleTheme, accentTheme, setAccentTheme } = useTheme();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    users: UserProfile[];
    tasks: any[];
    submissions: any[];
  }>({ users: [], tasks: [], submissions: [] });

  const [toasts, setToasts] = useState<SystemNotification[]>([]);
  const [hasLiveBroadcast, setHasLiveBroadcast] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread' | 'tasks' | 'meetings'>('all');
  const seenNotifIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  const notifRef = useRef<HTMLDivElement>(null);

  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'All' | 'HR' | 'PR' | 'SM' | 'OR'>('All');
  const [broadcastSentSuccess, setBroadcastSentSuccess] = useState(false);

  useEffect(() => {
    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  const handleInstallApp = () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setDeferredInstallPrompt(null);
        }
      });
    } else {
      setShowInstallModal(true);
    }
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMsg.trim()) return;

    const allUsers = db.getUsers().filter(u => u.status === 'Active');
    const targetUsers = allUsers.filter(u => broadcastTarget === 'All' || u.committee === broadcastTarget);
    
    const targetUserIds = targetUsers.map(u => u.id);
    db.addNotificationsBulk(
      targetUserIds,
      `📢 ${broadcastTitle.trim()}`,
      broadcastMsg.trim(),
      'info'
    );

    try {
      sendTestPushNotification();
    } catch {}

    db.logActivity(currentUser.id, currentUser.fullName, currentUser.role, 'Broadcast Sent', `Sent broadcast push to ${targetUsers.length} members.`);
    setBroadcastSentSuccess(true);
    setTimeout(() => {
      setBroadcastSentSuccess(false);
      setShowBroadcastModal(false);
      setBroadcastTitle('');
      setBroadcastMsg('');
    }, 1500);
  };

  const checkLiveBroadcast = () => {
    const live = db.getLiveWorkshops(currentUser.committee).some(w => w.status === 'Live');
    setHasLiveBroadcast(live);
  };

  // Fetch Notifications
  const loadNotifications = () => {
    const list = db.getNotifications(currentUser.id);
    setNotifications(list);

    if (isInitialLoadRef.current) {
      const initialSet = new Set<string>();
      list.forEach(n => initialSet.add(n.id));
      seenNotifIdsRef.current = initialSet;
      isInitialLoadRef.current = false;
    } else {
      const newUnread = list.filter(n => !n.isRead && !seenNotifIdsRef.current.has(n.id));
      if (newUnread.length > 0) {
        newUnread.forEach(n => {
          seenNotifIdsRef.current.add(n.id);
          setToasts(prev => {
            if (prev.some(t => t.id === n.id)) return prev;
            return [...prev, n];
          });
          // Auto-remove toast after 7 seconds
          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== n.id));
          }, 7000);
        });
      }
    }
  };

  useEffect(() => {
    loadNotifications();
    checkLiveBroadcast();
    const interval = setInterval(() => {
      loadNotifications();
      checkLiveBroadcast();
    }, 5000);
    const unsub = db.onChange(() => {
      checkLiveBroadcast();
    });
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [currentUser]);

  // Close notification panel when clicking anywhere outside
  useEffect(() => {
    if (!showNotifPanel) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showNotifPanel]);

  // Handle Search Queries dynamically across all objects
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults({ users: [], tasks: [], submissions: [] });
      return;
    }

    const query = searchQuery.toLowerCase();
    
    // Search users
    const allUsers = db.getUsers();
    const matchedUsers = allUsers.filter(u => 
      u.fullName.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.phoneNumber.toLowerCase().includes(query) ||
      u.membershipCode.toLowerCase().includes(query) ||
      u.committee.toLowerCase().includes(query) ||
      u.department.toLowerCase().includes(query)
    );

    // Search tasks
    const allTasks = db.getTasks();
    const matchedTasks = allTasks.filter(t => 
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.committee.toLowerCase().includes(query) ||
      t.department.toLowerCase().includes(query)
    );

    // Search submissions
    const allSubs = db.getSubmissions();
    const matchedSubs = allSubs.filter(s => 
      s.submissionIdCode.toLowerCase().includes(query) ||
      s.taskName.toLowerCase().includes(query) ||
      s.memberName.toLowerCase().includes(query) ||
      s.memberEmail.toLowerCase().includes(query)
    );

    setSearchResults({
      users: matchedUsers,
      tasks: matchedTasks,
      submissions: matchedSubs,
    });
  }, [searchQuery]);

  const handleMarkAllRead = () => {
    db.markAllNotificationsRead(currentUser.id);
    loadNotifications();
  };

  const handleClearAllNotifications = () => {
    notifications.forEach(n => seenNotifIdsRef.current.add(n.id));
    setToasts([]);
    db.clearAllNotifications(currentUser.id);
    loadNotifications();
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <Check className="w-4 h-4 text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default:
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
    }
  };

  const getNotifBg = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/20';
      case 'error':
        return 'bg-red-500/10 border-red-500/20';
      default:
        return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 sm:px-6 shadow-sm">
      
      {/* Left/Start side: Hamburger, Search Bar trigger, and Official Ministry Logo */}
      <div className="flex items-center gap-1.5 sm:gap-4">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-200 lg:hidden"
          aria-label="Toggle Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {currentView && currentView !== 'dashboard' && onGoBack && (
          <button
            onClick={onGoBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs transition-all shadow-xs border border-amber-500/30 cursor-pointer"
            title={language === 'ar' ? 'الرجوع خطوة للخلف' : 'Go Back'}
          >
            {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{language === 'ar' ? 'رجوع' : 'Back'}</span>
          </button>
        )}

        {/* Mobile Search Trigger Button */}
        <button
          onClick={() => setShowSearchModal(true)}
          className="flex lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Global Search Box (Launches full modal search on desktop) */}
        <button
          onClick={() => setShowSearchModal(true)}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-all text-xs font-semibold"
          id="global-search-trigger"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span>{language === 'ar' ? 'بحث في كيان EYE...' : 'Search EYE Hub...'}</span>
          <kbd className="ms-4 px-1.5 py-0.5 text-[9px] bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 text-slate-400 font-mono">⌘K</kbd>
        </button>
      </div>

      {/* Right/End side: Theme, Language, Calendar, Notification bell & Settings profile link */}
      <div className="flex items-center gap-1 sm:gap-3">
        {/* Dynamic Clock / Calendar */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 font-mono bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <Calendar className="w-3.5 h-3.5 text-eye-brand" />
          <span>
            {currentTime.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <span className="text-slate-300 dark:text-slate-655">|</span>
          <Clock className="w-3.5 h-3.5 text-eye-brand" />
          <span>
            {currentTime.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        </div>


        {/* PWA App Download Button */}
        <button
          onClick={handleInstallApp}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
          title={language === 'ar' ? 'تنزيل وتثبيت المنصة كـ تطبيق أندرويد / آيفون / كمبيوتر' : 'Install EYE App'}
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">{language === 'ar' ? 'تثبيت التطبيق 📲' : 'Install App 📲'}</span>
        </button>

        {/* Theme Toggler Button */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all shrink-0"
          title={language === 'ar' ? 'تغيير المظهر' : 'Toggle Theme'}
          id="theme-toggler-btn"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Language Toggler Globe Button */}
        <button
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className="hidden xs:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all shrink-0"
          title={t('switchLanguage')}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'En' : 'عربي'}</span>
        </button>

        {/* Governorate Switcher Badge (Super Admin Only) */}
        {currentUser.role === 'Super Admin' && (
          <div className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/30 dark:border-amber-400/30 text-amber-800 dark:text-amber-300 text-xs font-bold transition-all">
            <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <select
              value={activeGov}
              onChange={(e) => {
                const newGov = e.target.value;
                try { localStorage.setItem('eye_current_governorate', newGov); } catch {}
                db.notify();
                window.dispatchEvent(new CustomEvent('eye_governorate_changed', { detail: newGov }));
              }}
              className="bg-transparent text-xs font-black text-slate-900 dark:text-amber-200 focus:outline-none cursor-pointer"
              title={language === 'ar' ? 'اختيار المحافظة / المركزية' : 'Select Governorate / Central'}
            >
              {EGYPTIAN_GOVERNORATES.map((gov) => (
                <option key={gov} value={gov} className="bg-slate-900 text-white">
                  {gov === 'المركزية' ? 'المركزية' : `محافظة ${gov}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Interactive Notification Bell */}
        <div className="relative shrink-0" ref={notifRef}>
          <button
            onClick={() => setShowNotifPanel(!showNotifPanel)}
            className="relative rounded-xl p-2 sm:p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer"
            id="notification-bell"
            aria-label="Notifications"
          >
            <Bell className="w-4.5 h-4.5 text-slate-700 dark:text-slate-200" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white ring-2 ring-white dark:ring-slate-900 animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Drawer */}
          {showNotifPanel && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifPanel(false)}
                aria-hidden="true"
              />
              <div className="fixed inset-x-2 top-16 sm:absolute sm:inset-auto sm:end-0 sm:mt-3.5 w-auto sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 flex flex-col gap-3 z-50 text-slate-800 dark:text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-eye-brand" />
                  <span>{t('notifications')} ({unreadCount})</span>
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      const ok = await sendTestPushNotification();
                      if (!ok) {
                        alert(language === 'ar' ? 'يرجى السماح بالإشعارات في إعدادات المتصفح/الهاتف لتفعيل الخدمة.' : 'Please allow notifications in browser/phone settings.');
                      }
                    }}
                    className="text-[10px] font-bold text-amber-600 hover:text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 transition-all flex items-center gap-1"
                    title={language === 'ar' ? 'تفعيل واختبار إشعارات الهاتف' : 'Enable & test phone push alerts'}
                  >
                    <span>📱 إشعارات الفون</span>
                  </button>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      {language === 'ar' ? 'مقروء ✅' : 'Mark read'}
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearAllNotifications}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition-colors"
                    >
                      {language === 'ar' ? 'مسح الكل 🗑️' : 'Clear all'}
                    </button>
                  )}
                </div>
              </div>

              {/* Notification Filter Tabs */}
              <div className="flex items-center gap-1 my-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[10px] font-bold">
                {[
                  { id: 'all', labelAr: 'الكل', labelEn: 'All' },
                  { id: 'unread', labelAr: 'غير مقروء', labelEn: 'Unread' },
                  { id: 'tasks', labelAr: 'المهام 📋', labelEn: 'Tasks' },
                  { id: 'meetings', labelAr: 'الاجتماعات 🗓️', labelEn: 'Meetings' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setNotifFilter(tab.id as any)}
                    className={`flex-1 py-1 rounded-lg transition-all cursor-pointer ${
                      notifFilter === tab.id
                        ? 'bg-white dark:bg-slate-900 text-eye-brand shadow-2xs font-black'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {language === 'ar' ? tab.labelAr : tab.labelEn}
                  </button>
                ))}
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2">
                {notifications.filter(n => {
                  if (notifFilter === 'unread') return !n.isRead;
                  if (notifFilter === 'tasks') return n.title.includes('مهمة') || n.title.includes('Task') || n.title.includes('تسليم');
                  if (notifFilter === 'meetings') return n.title.includes('اجتماع') || n.title.includes('Meeting');
                  return true;
                }).length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    {language === 'ar' ? 'لا توجد إشعارات مطابقة' : 'No matching notifications'}
                  </div>
                ) : (
                  notifications.filter(n => {
                    if (notifFilter === 'unread') return !n.isRead;
                    if (notifFilter === 'tasks') return n.title.includes('مهمة') || n.title.includes('Task') || n.title.includes('تسليم');
                    if (notifFilter === 'meetings') return n.title.includes('اجتماع') || n.title.includes('Meeting');
                    return true;
                  }).map((notif) => {
                    const localized = translateNotification(notif.title, notif.message, language);
                    return (
                      <div
                        key={notif.id}
                        className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer hover:bg-slate-50 transition-colors relative group ${getNotifBg(notif.type)} ${!notif.isRead ? 'border-emerald-500/30' : 'border-slate-200 opacity-75'}`}
                        onClick={() => {
                          setShowNotifPanel(false);
                          db.markNotificationRead(notif.id);
                          loadNotifications();
                          const dest = getNotifDestination(notif, currentUser.role);
                          onNavigateToView(dest.view, dest.targetId);
                        }}
                      >
                        <div className="mt-0.5 shrink-0">{getNotifIcon(notif.type)}</div>
                        <div className="flex-1 space-y-0.5">
                          <p className="text-xs font-bold text-slate-800 flex items-center justify-between">
                            <span>{localized.title}</span>
                            {!notif.isRead && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                          </p>
                          <p className="text-[10px] text-slate-600 leading-relaxed">{localized.message}</p>
                          <p className="text-[9px] text-slate-400 font-mono pt-1">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        {/* Individual Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            db.deleteNotification(notif.id);
                            loadNotifications();
                          }}
                          className="text-slate-300 hover:text-rose-600 transition-colors p-1"
                          title={language === 'ar' ? 'مسح الإشعار' : 'Delete notification'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* --- GLOBAL SEARCH MODAL PANEL --- */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-center pt-24 px-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[500px]">
            {/* Search inputs */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
              <Search className="w-5 h-5 text-eye-brand shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Search by name, email, committee, department, task or submission ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-800 focus:outline-none placeholder-slate-400"
              />
              <button
                onClick={() => { setShowSearchModal(false); setSearchQuery(''); }}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results listing */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {searchQuery.trim().length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Search className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs">Search database of EYE Gharbia hub in real-time.</p>
                  <p className="text-[10px] text-slate-400 font-mono">Search matching terms: Member names, EPR, Task IDs, Codes</p>
                </div>
              ) : (searchResults.users.length === 0 && searchResults.tasks.length === 0 && searchResults.submissions.length === 0) ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No matching results found for "{searchQuery}"
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Matching Users */}
                  {searchResults.users.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-eye-brand flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        Members & Leaders ({searchResults.users.length})
                      </span>
                      <div className="space-y-1.5">
                        {searchResults.users.map(user => (
                          <div
                            key={user.id}
                            onClick={() => {
                              setShowSearchModal(false);
                              onNavigateToView('profile', user.id);
                            }}
                            className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl cursor-pointer flex items-center justify-between gap-3 group"
                          >
                            <div className="flex items-center gap-2.5">
                              <img src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.fullName)}`} alt="" className="w-8 h-8 rounded-lg object-cover" />
                              <div>
                                <p className="text-xs font-bold text-slate-800 group-hover:text-eye-brand">{user.fullName}</p>
                                <p className="text-[10px] text-slate-500">{user.email} • {user.phoneNumber}</p>
                              </div>
                            </div>
                            <div className="text-end">
                              <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold bg-slate-200 text-slate-700 rounded border border-slate-300 uppercase">
                                {user.role}
                              </span>
                              {currentUser.role !== 'Member' && <p className="text-[9px] text-slate-400 mt-0.5 font-mono">{user.membershipCode}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Tasks */}
                  {searchResults.tasks.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                        <FolderKanban className="w-3.5 h-3.5" />
                        Tasks & Objectives ({searchResults.tasks.length})
                      </span>
                      <div className="space-y-1.5">
                        {searchResults.tasks.map(task => (
                          <div
                            key={task.id}
                            onClick={() => {
                              setShowSearchModal(false);
                              onNavigateToView('tasks', task.id);
                            }}
                            className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl cursor-pointer flex items-center justify-between gap-3 group"
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-800 group-hover:text-eye-brand">{task.name}</p>
                              <p className="text-[10px] text-slate-500 truncate max-w-md">{task.description}</p>
                            </div>
                            <div className="text-end">
                              <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-600 rounded border border-amber-250 uppercase">
                                {task.priority}
                              </span>
                              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">{task.department}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Submissions */}
                  {searchResults.submissions.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        Submissions & Files ({searchResults.submissions.length})
                      </span>
                      <div className="space-y-1.5">
                        {searchResults.submissions.map(sub => (
                          <div
                            key={sub.id}
                            onClick={() => {
                              setShowSearchModal(false);
                              onNavigateToView('tasks', sub.taskId);
                            }}
                            className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl cursor-pointer flex items-center justify-between gap-3 group"
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-800 group-hover:text-eye-brand">{sub.fileName}</p>
                              <p className="text-[10px] text-slate-500">Task: {sub.taskName} • Owner: {sub.memberName}</p>
                            </div>
                            <div className="text-end">
                              <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 text-emerald-600 rounded border border-emerald-200 uppercase font-mono">
                                {sub.submissionIdCode}
                              </span>
                              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">{sub.status}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification Stack */}
      <div className={`fixed z-[100] max-w-sm w-full flex flex-col gap-3 pointer-events-none top-4 md:top-6 ${isRtl ? 'left-4 md:left-6' : 'right-4 md:right-6'}`} style={{ zIndex: 9999 }}>
        {toasts.map(toast => {
          const localized = translateNotification(toast.title, toast.message, language);
          return (
            <div
              key={toast.id}
              onClick={() => {
                // Mark as read
                db.markNotificationRead(toast.id);
                loadNotifications();
                // Remove toast
                setToasts(prev => prev.filter(t => t.id !== toast.id));
                // Route the user to the page that matches this notification type
                const dest = getNotifDestination(toast, currentUser.role);
                onNavigateToView(dest.view, dest.targetId);
              }}
              className={`pointer-events-auto w-full bg-white dark:bg-slate-900 border border-slate-100 rounded-2xl shadow-2xl p-4 flex gap-3 cursor-pointer hover:shadow-xl transition-all duration-300 transform translate-y-0 ${isRtl ? 'animate-slide-in-left' : 'animate-slide-in-right'} ${getNotifBg(toast.type)}`}
            >
              <div className="mt-0.5 shrink-0 bg-white/80 p-1.5 rounded-lg shadow-sm border border-slate-100 flex items-center justify-center h-8 w-8">{getNotifIcon(toast.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-900 flex items-center justify-between">
                  <span className="truncate">{localized.title}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-eye-brand shrink-0" />
                </p>
                <p className="text-[10px] text-slate-600 leading-relaxed mt-1 font-semibold line-clamp-2">{localized.message}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setToasts(prev => prev.filter(t => t.id !== toast.id));
                }}
                className="text-slate-400 hover:text-slate-600 shrink-0 self-start p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* PWA App Installation Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-fade-in text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-black text-sm text-emerald-600 dark:text-emerald-400">
                <Smartphone className="w-5 h-5" />
                <span>{language === 'ar' ? 'تنزيل وتثبيت منصة EYE كـ تطبيق 📲' : 'Install EYE App 📲'}</span>
              </div>
              <button onClick={() => setShowInstallModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
              <p className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold">
                {language === 'ar'
                  ? 'يمكنك تثبيت المنصة مباشرة كـ تطبيق مخصص على هاتفك المحمول (أندرويد / آيفون) أو جهاز الكمبيوتر ليعمل بسرعة فائقة وبدون إنترنت!'
                  : 'You can install the platform directly as a dedicated app on your phone or PC!'}
              </p>

              {deferredInstallPrompt ? (
                <button
                  onClick={handleInstallApp}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{language === 'ar' ? 'اضغط هنا لتثبيت التطبيق فوراً 🚀' : 'Install App Now 🚀'}</span>
                </button>
              ) : (
                <div className="space-y-2 pt-1">
                  <p className="font-black text-slate-900 dark:text-white text-xs">{language === 'ar' ? 'خطوات التثبيت المباشر حسب جهازك:' : 'Installation Steps:'}</p>
                  
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl space-y-1 text-[11px]">
                    <p className="font-bold text-blue-600 dark:text-blue-400">📱 لأجهزة الآيفون (Safari):</p>
                    <p>1. اضغط على زر المشاركة <span className="font-bold">Share (􀈂)</span> بالأسفل.</p>
                    <p>2. اختر <span className="font-bold">"الإضافة إلى الشاشة الرئيسية (Add to Home Screen)"</span>.</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl space-y-1 text-[11px]">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">🤖 لأجهزة الأندرويد (Chrome):</p>
                    <p>1. اضغط على قائمة القاط الثلاث <span className="font-bold">(⋮)</span> بالأعلى.</p>
                    <p>2. اختر <span className="font-bold">"تثبيت التطبيق (Install App)"</span> أو <span className="font-bold">"إضافة إلى الشاشة الرئيسية"</span>.</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl space-y-1 text-[11px]">
                    <p className="font-bold text-purple-600 dark:text-purple-400">💻 لأجهزة الكمبيوتر (Windows / Mac):</p>
                    <p>اضغط على أيقونة التثبيت <span className="font-bold">(⊕)</span> الموجودة في شريط عنوان المتصفح بالأعلى.</p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowInstallModal(false)}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs"
            >
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}



    </header>
  );
};
