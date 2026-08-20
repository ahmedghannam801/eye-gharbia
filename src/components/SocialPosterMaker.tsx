import React, { useState, useEffect } from 'react';
import { UserProfile, IssuedPosterRecord } from '../types';
import { db } from '../db/localDb';
import { useLanguage } from '../lib/LanguageContext';
import {
  Palette,
  Download,
  Sparkles,
  User,
  CheckSquare,
  Square,
  Users,
  Send,
  Check,
  Loader2,
  Award,
  HeartHandshake,
  Trash2,
  Megaphone,
  Share2,
  ShieldCheck,
  Eye
} from 'lucide-react';

interface SocialPosterMakerProps {
  currentUser: UserProfile;
}

export const SocialPosterMaker: React.FC<SocialPosterMakerProps> = ({ currentUser }) => {
  const { language, isRtl, translateCommittee } = useLanguage();
  const isAr = language === 'ar';

  // Authority check: Super Admin, Vice, Coordinator, Deputy Coordinator, Leader, HRM, Central, Head
  const canDispatch = [
    'Super Admin',
    'Vice',
    'Coordinator',
    'Deputy Coordinator',
    'Leader',
    'HRM',
    'Central',
    'Head',
  ].includes(currentUser?.role);

  const allUsers = db.getUsers().filter(u => u.status === 'Active');

  // Selection Mode: 'single' | 'multiple' | 'all'
  const [selectionMode, setSelectionMode] = useState<'single' | 'multiple' | 'all'>('single');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(allUsers[0]?.id || currentUser.id);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([allUsers[0]?.id || currentUser.id]);
  const [previewMemberId, setPreviewMemberId] = useState<string>(allUsers[0]?.id || currentUser.id);

  // Filters for multi-select list
  const [committeeFilter, setCommitteeFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'leaders' | 'members'>('all');

  // Poster Customization State
  type ThemeColor = 'blue' | 'gold' | 'emerald' | 'purple';
  const [posterTitle, setPosterTitle] = useState('أهلاً بك في كيان المصريون الشباب EYE 🌟');
  const [customMsg, setCustomMsg] = useState('نعتز بانضمامك لفريق عمل الكيان وتمنياتنا بدوام التوفيق والتميز.');
  const [themeColor, setThemeColor] = useState<ThemeColor>('blue');

  // Multi-Channel Broadcast Channels State
  const [postAnnouncement, setPostAnnouncement] = useState(true);
  const [createOccasionBanner, setCreateOccasionBanner] = useState(true);
  const [shareToMemoryWall, setShareToMemoryWall] = useState(false);

  // Progress State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Persistent Issued Posters state from localDb + realtime subscription
  const [issuedPosters, setIssuedPosters] = useState<IssuedPosterRecord[]>([]);

  useEffect(() => {
    setIssuedPosters(db.getIssuedPosters());
    const unsub = db.onChange(() => {
      setIssuedPosters(db.getIssuedPosters());
    });
    return () => unsub();
  }, []);

  const saveIssuedPosters = (updated: IssuedPosterRecord[]) => {
    setIssuedPosters(updated);
    db.saveIssuedPosters(updated);
  };

  // Filtered users for multi-select list
  const filteredUsers = allUsers.filter(u => {
    if (committeeFilter !== 'all' && u.committee !== committeeFilter) return false;
    if (roleFilter === 'leaders' && !['Leader', 'Vice', 'Super Admin', 'Coordinator'].includes(u.role)) return false;
    if (roleFilter === 'members' && u.role !== 'Member') return false;
    return true;
  });

  const toggleSelectMember = (id: string) => {
    if (selectedMemberIds.includes(id)) {
      const updated = selectedMemberIds.filter(mId => mId !== id);
      setSelectedMemberIds(updated);
      if (previewMemberId === id && updated.length > 0) {
        setPreviewMemberId(updated[0]);
      }
    } else {
      const updated = [...selectedMemberIds, id];
      setSelectedMemberIds(updated);
      setPreviewMemberId(id);
    }
  };

  const handleSelectAllFiltered = () => {
    const ids = filteredUsers.map(u => u.id);
    const combined = Array.from(new Set([...selectedMemberIds, ...ids]));
    setSelectedMemberIds(combined);
    if (ids.length > 0) setPreviewMemberId(ids[0]);
  };

  const handleDeselectAllFiltered = () => {
    const idsToKeep = selectedMemberIds.filter(id => !filteredUsers.some(u => u.id === id));
    setSelectedMemberIds(idsToKeep);
    if (idsToKeep.length > 0) setPreviewMemberId(idsToKeep[0]);
  };

  const activePreviewUser =
    selectionMode === 'all'
      ? allUsers.find(u => u.id === previewMemberId) || currentUser
      : selectionMode === 'single'
      ? allUsers.find(u => u.id === selectedMemberId) || currentUser
      : allUsers.find(u => u.id === previewMemberId) || currentUser;

  // Render poster for a single member on canvas and trigger PNG download
  const generatePosterForMember = (
    member: UserProfile,
    customTheme: ThemeColor = themeColor,
    titleText: string = posterTitle,
    msgText: string = customMsg
  ): Promise<void> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve();

      // Background Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
      if (customTheme === 'gold') {
        bgGrad.addColorStop(0, '#111827');
        bgGrad.addColorStop(0.5, '#1e1b4b');
        bgGrad.addColorStop(1, '#030712');
      } else if (customTheme === 'emerald') {
        bgGrad.addColorStop(0, '#064e3b');
        bgGrad.addColorStop(0.5, '#022c22');
        bgGrad.addColorStop(1, '#030712');
      } else if (customTheme === 'purple') {
        bgGrad.addColorStop(0, '#3b0764');
        bgGrad.addColorStop(0.5, '#1e1b4b');
        bgGrad.addColorStop(1, '#030712');
      } else {
        bgGrad.addColorStop(0, '#0a1226');
        bgGrad.addColorStop(0.5, '#1e1b4b');
        bgGrad.addColorStop(1, '#05112e');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1080);

      // Outer Gold/Blue/Emerald/Purple double border
      const strokeColor =
        customTheme === 'gold' ? '#f59e0b' :
        customTheme === 'emerald' ? '#10b981' :
        customTheme === 'purple' ? '#a855f7' : '#2b66ff';

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 12;
      ctx.strokeRect(30, 30, 1020, 1020);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(48, 48, 984, 984);

      // Header Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 38px "Cairo", Georgia, Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Egyptian Youth Entity — EYE', 540, 120);

      // Poster Main Badge Title
      const badgeTitleColor =
        customTheme === 'gold' ? '#f59e0b' :
        customTheme === 'emerald' ? '#34d399' :
        customTheme === 'purple' ? '#c084fc' : '#60a5fa';

      ctx.fillStyle = badgeTitleColor;
      ctx.font = 'bold 44px "Cairo", Arial';
      ctx.fillText(titleText, 540, 210);

      // Member Photo Circle
      const avatarImg = new Image();
      avatarImg.crossOrigin = 'anonymous';
      avatarImg.src = member.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.fullName)}`;

      const drawRemaining = () => {
        // Border around photo
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(540, 470, 180, 0, Math.PI * 2);
        ctx.stroke();

        // Member Name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 54px "Cairo", Georgia, Arial';
        ctx.textAlign = 'center';
        ctx.fillText(member.fullName, 540, 720);

        // Role & Committee Pill
        const roleColor =
          customTheme === 'gold' ? '#f59e0b' :
          customTheme === 'emerald' ? '#10b981' :
          customTheme === 'purple' ? '#a855f7' : '#3b82f6';

        ctx.fillStyle = roleColor;
        ctx.font = 'bold 34px "Cairo", Arial';
        ctx.fillText(`${member.role}  ✦  ${translateCommittee(member.committee)}`, 540, 785);

        // Custom message text
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 28px "Cairo", Arial';
        ctx.fillText(msgText, 540, 860);

        // Footer Official Accreditation
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px "Cairo", Arial';
        ctx.fillText('• المكتب التنفيذي والمركز الإعلامي لكيان المصريون الشباب •', 540, 970);

        // Download trigger
        const link = document.createElement('a');
        link.download = `بوستر إعلامي - ${member.fullName.trim()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        resolve();
      };

      avatarImg.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(540, 470, 180, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImg, 360, 290, 360, 360);
        ctx.restore();
        drawRemaining();
      };

      avatarImg.onerror = () => {
        drawRemaining();
      };
    });
  };

  // Bulk download handler
  const handleBulkDownloadPosters = async () => {
    const targetUsers =
      selectionMode === 'all'
        ? allUsers
        : selectionMode === 'single'
        ? [allUsers.find(u => u.id === selectedMemberId) || currentUser]
        : allUsers.filter(u => selectedMemberIds.includes(u.id));

    if (targetUsers.length === 0) return;

    setIsGenerating(true);
    let count = 0;

    for (const member of targetUsers) {
      count++;
      setGenerateProgress(
        isAr
          ? `جاري توليد وتحميل البوستر (${count} من ${targetUsers.length}): ${member.fullName}...`
          : `Generating poster (${count}/${targetUsers.length}): ${member.fullName}...`
      );
      await generatePosterForMember(member, themeColor, posterTitle, customMsg);
      await new Promise(r => setTimeout(r, 600));
    }

    setIsGenerating(false);
    setGenerateProgress('');
    setSuccessToast(
      isAr
        ? `تم توليد وتحميل (${targetUsers.length}) بوستر بنجاح! 🎨`
        : `Successfully generated (${targetUsers.length}) posters!`
    );
    setTimeout(() => setSuccessToast(''), 4000);
  };

  // Full Multi-Channel Broadcast Handler (Omnichannel Dispatch)
  const handleSendBulkNotifications = async () => {
    const targetUsers =
      selectionMode === 'all'
        ? allUsers
        : selectionMode === 'single'
        ? [allUsers.find(u => u.id === selectedMemberId) || currentUser]
        : allUsers.filter(u => selectedMemberIds.includes(u.id));

    if (targetUsers.length === 0) return;

    const channelsSummary: string[] = [];
    channelsSummary.push(isAr ? `• إرسال إشعارات فورية وحفظ البوستر لـ (${targetUsers.length}) عضو 📲` : `• In-app notifications to ${targetUsers.length} members`);
    if (postAnnouncement) {
      channelsSummary.push(isAr ? '• نشر إعلان وتعميم رسمي على لوحة إعلانات المنصة للجميع 📢' : '• Official announcement for all members');
    }
    if (createOccasionBanner) {
      channelsSummary.push(isAr ? '• تفعيل شريط التهنئة البارز بأعلى المنصة للجميع 🎊' : '• Top occasion banner on dashboard');
    }
    if (shareToMemoryWall) {
      channelsSummary.push(isAr ? '• مشاركة على حائط الذكريات للتفاعل والمباركة 🖼️' : '• Share to Memory Wall');
    }

    const confirmMsg = isAr
      ? `هل أنت متأكد من اعتماد وإرسال وتعميم هذه التهنئة والبوستر الرسمي؟\n\nالقنوات التي سيتم البث عبرها:\n${channelsSummary.join('\n')}`
      : `Dispatch official posters to (${targetUsers.length}) members across selected channels?`;

    if (!confirm(confirmMsg)) return;

    setIsGenerating(true);
    setGenerateProgress(isAr ? 'جاري التعميم والإرسال لكافة الأعضاء عبر القنوات المحددة...' : 'Broadcasting across channels...');

    const now = new Date().toISOString();
    const newRecords: IssuedPosterRecord[] = targetUsers.map(u => ({
      id: `poster-${Date.now()}-${u.id.slice(0, 6)}`,
      memberId: u.id,
      memberName: u.fullName,
      memberRole: u.role,
      memberCommittee: u.committee,
      memberAvatarUrl: u.avatarUrl,
      title: posterTitle,
      customMsg: customMsg,
      themeColor: themeColor,
      sentBy: currentUser.id,
      sentByName: currentUser.fullName,
      createdAt: now,
    }));

    await db.dispatchSocialPosters(
      newRecords,
      posterTitle,
      customMsg,
      {
        postAnnouncement,
        createOccasionBanner,
        shareToMemoryWall,
      },
      currentUser
    );

    setIssuedPosters(db.getIssuedPosters());
    setIsGenerating(false);
    setGenerateProgress('');

    setSuccessToast(
      isAr
        ? `🎉 تم إرسال وتعميم التهنئة والبوسترات بنجاح لـ (${targetUsers.length}) عضو ووصلت لجميع القنوات المحددة!`
        : `Dispatched posters to (${targetUsers.length}) members successfully!`
    );
    setTimeout(() => setSuccessToast(''), 5000);
  };

  const handleDeleteIssuedPoster = (id: string) => {
    if (confirm(isAr ? 'هل أنت متأكد من إلغاء وحذف هذا البوستر الصادر؟' : 'Delete this issued poster?')) {
      const updated = issuedPosters.filter(p => p.id !== id);
      saveIssuedPosters(updated);
    }
  };

  // Helper theme styling for live preview card
  const getThemePreviewStyles = (theme: ThemeColor) => {
    switch (theme) {
      case 'gold':
        return {
          cardBg: 'bg-gradient-to-br from-slate-950 via-amber-950/40 to-slate-950',
          borderColor: 'border-amber-500',
          brandText: 'text-amber-400',
          titleText: 'text-amber-400',
          imgBorder: 'border-amber-500',
          roleText: 'text-amber-300',
        };
      case 'emerald':
        return {
          cardBg: 'bg-gradient-to-br from-slate-950 via-emerald-950/50 to-slate-950',
          borderColor: 'border-emerald-500',
          brandText: 'text-emerald-400',
          titleText: 'text-emerald-400',
          imgBorder: 'border-emerald-500',
          roleText: 'text-emerald-300',
        };
      case 'purple':
        return {
          cardBg: 'bg-gradient-to-br from-slate-950 via-purple-950/60 to-slate-950',
          borderColor: 'border-purple-500',
          brandText: 'text-purple-400',
          titleText: 'text-purple-400',
          imgBorder: 'border-purple-500',
          roleText: 'text-purple-300',
        };
      case 'blue':
      default:
        return {
          cardBg: 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950',
          borderColor: 'border-blue-500',
          brandText: 'text-blue-400',
          titleText: 'text-amber-400',
          imgBorder: 'border-blue-500',
          roleText: 'text-blue-300',
        };
    }
  };

  const previewStyles = getThemePreviewStyles(themeColor);

  // ══════════════════════════════════════════════════════════════
  // VIEW FOR REGULAR MEMBERS
  // ══════════════════════════════════════════════════════════════
  if (!canDispatch) {
    const myPosters = issuedPosters.filter(p => p.memberId === currentUser.id);

    return (
      <div className="space-y-6 p-4 sm:p-6 max-w-4xl mx-auto animate-fade-in text-start" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Member Header */}
        <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl border border-blue-800/40 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
              <Sparkles className="w-4 h-4" />
              <span>{isAr ? 'معرض الكروت والبوسترات الرسمية' : 'Official Posters & Cards'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black">
              <span>{isAr ? 'بوستراتك الإعلامية المعتمدة 🎨✨' : 'Your Official Posters & Graphics'}</span>
            </h1>
            <p className="text-xs text-blue-200/80 font-medium leading-relaxed">
              {isAr
                ? 'هنا تجد البوسترات الرسمية وكروت التهنئة والتكريم المعتمدة الخاصة بك الصادرة من إدارة الكيان.'
                : 'View and download official high-res posters and congratulatory cards issued to you by leadership.'}
            </p>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>{isAr ? 'خاص بحسابك' : 'Your Account Only'}</span>
          </div>
        </div>

        {/* If the member has received one or more posters */}
        {myPosters.length > 0 ? (
          <div className="space-y-6">
            {myPosters.map((poster) => {
              const pStyles = getThemePreviewStyles(poster.themeColor);
              return (
                <div key={poster.id} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          {isAr ? '🌟 بوستر معتمد رسمياً' : 'Official Verified'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(poster.createdAt).toLocaleDateString('ar-EG', { dateStyle: 'full' })}
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{poster.title}</h3>
                      <p className="text-xs text-slate-500">{poster.customMsg}</p>
                    </div>

                    <button
                      onClick={() => generatePosterForMember(currentUser, poster.themeColor, poster.title, poster.customMsg)}
                      className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      <span>{isAr ? 'تحميل البوستر بدقة عالية (PNG) 📥' : 'Download High-Res PNG 📥'}</span>
                    </button>
                  </div>

                  {/* High-res Live Card Preview */}
                  <div className="bg-slate-950 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                    <div className={`w-full aspect-square max-w-sm rounded-2xl border-4 border-double ${pStyles.borderColor} ${pStyles.cardBg} p-6 flex flex-col items-center justify-between shadow-2xl relative transition-all duration-300`}>
                      <span className={`text-[10px] font-bold ${pStyles.brandText}`}>Egyptian Youth Entity — EYE</span>
                      
                      <div className="space-y-3 my-auto w-full">
                        <h3 className={`text-sm font-black ${pStyles.titleText} truncate`}>{poster.title}</h3>
                        <img
                          src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.fullName)}`}
                          alt=""
                          className={`w-24 h-24 rounded-full border-4 ${pStyles.imgBorder} object-cover mx-auto bg-slate-900 shadow-md`}
                        />
                        <p className="text-base font-black text-white truncate">{currentUser.fullName}</p>
                        <p className={`text-[10px] font-bold ${pStyles.roleText} truncate`}>{currentUser.role} • {translateCommittee(currentUser.committee)}</p>
                        <p className="text-[9px] text-slate-400 px-4 line-clamp-2 leading-relaxed">{poster.customMsg}</p>
                      </div>

                      <span className="text-[8px] text-slate-400 font-mono">• Official EYE Social Media Graphic •</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State + Custom Member Badge Generator */
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
                <Palette className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {isAr ? 'بطاقة عضويتك الرسمية في الكيان ✨' : 'Your Official EYE Member Badge'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {isAr
                    ? 'يمكنك معاينة وتحميل بطاقة وبوستر عضويتك المعتمد في كيان EYE بالدقة الكاملة لنشره على وسائل التواصل الاجتماعي.'
                    : 'Download your high-resolution official membership poster.'}
                </p>
              </div>

              <button
                onClick={() => generatePosterForMember(currentUser, 'blue', 'عضو معتمد في كيان المصريون الشباب 🌟', 'فخور بانضمامي لأسرة كيان EYE متمنياً دوام التميز والنجاح.')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>{isAr ? 'تحميل بوستر عضويتي الآن (PNG) 📥' : 'Download My Member Poster 📥'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // VIEW FOR LEADERSHIP & ADMINS (Full Suite)
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-5xl mx-auto animate-fade-in text-start" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl border border-blue-800/40 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
            <Palette className="w-4 h-4" />
            <span>{isAr ? 'صانع البوسترات والتهاني الرسمية للكيان' : 'EYE Social Poster & Greetings Builder'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <span>{isAr ? 'مولد كروت وبوسترات التواصل الاجتماعي والتهاني 🎨✨' : 'Social Media Poster & Greetings Maker 🎨✨'}</span>
          </h1>
          <p className="text-xs text-blue-200/80 font-medium leading-relaxed">
            {isAr
              ? 'توليد بوسترات ترحيب وتكريم وتهنئة، مع إمكانية تعميمها وإرسالها فوراً لجميع الأعضاء (إشعارات + لوحة الإعلانات + شريط التهاني العلوي).'
              : 'Generate and broadcast high-res greeting & recognition posters across all platform channels.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-row items-center gap-3 w-full flex-wrap justify-center sm:w-auto">
          <button
            onClick={handleSendBulkNotifications}
            disabled={isGenerating}
            className="px-5 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-slate-950 font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2.5 border border-amber-300/40 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
            <span>{isAr ? 'إرسال وتعميم للأعضاء 📲' : 'Dispatch to Members 📲'}</span>
          </button>

          <button
            onClick={handleBulkDownloadPosters}
            disabled={isGenerating}
            className="px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-black text-sm rounded-xl shadow-xl transition-all flex items-center justify-center gap-2.5 border border-blue-400/30 disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            <span>
              {selectionMode === 'all'
                ? (isAr ? `تحميل لكل الأعضاء (${allUsers.length}) 📥` : `Download All (${allUsers.length}) 📥`)
                : selectionMode === 'single'
                ? (isAr ? 'تحميل البوستر (PNG) 📥' : 'Download PNG 📥')
                : (isAr ? `تحميل البوسترات (${selectedMemberIds.length}) 📥` : `Download Posters (${selectedMemberIds.length}) 📥`)}
            </span>
          </button>
        </div>
      </div>

      {/* Toast alert message */}
      {successToast && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black rounded-2xl flex items-center gap-2 animate-fade-in shadow-md">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Progress banner during bulk generation */}
      {isGenerating && (
        <div className="p-4 bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs font-bold rounded-2xl flex items-center gap-3 animate-pulse">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
          <span>{generateProgress}</span>
        </div>
      )}

      {/* Control Panel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: Controls & Selection Form */}
        <div className="md:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-3xl space-y-5 shadow-sm">
          {/* 1. Mode Switcher: Single vs Multiple vs All */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{isAr ? '1. نطاق الإرسال والمستهدفين' : '1. Target Scope'}</label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSelectionMode('single')}
                className={`py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  selectionMode === 'single'
                    ? 'bg-blue-600 text-white shadow-md font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>{isAr ? 'عضو فردي' : 'Single'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectionMode('multiple')}
                className={`py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  selectionMode === 'multiple'
                    ? 'bg-purple-600 text-white shadow-md font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{isAr ? 'مجموعة 👥' : 'Group'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectionMode('all')}
                className={`py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  selectionMode === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAr ? 'الكل 📢' : 'Everyone'}</span>
              </button>
            </div>
          </div>

          {/* 2. MEMBER SELECTION PANEL */}
          {selectionMode === 'all' ? (
            <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent rounded-2xl border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold space-y-1">
              <div className="flex items-center gap-2 font-black text-amber-800 dark:text-amber-200">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>{isAr ? `إصدار وتعميم لجميع أعضاء الكيان بالكامل (${allUsers.length} عضو) 🌟` : `Broadcasting to all (${allUsers.length}) members!`}</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {isAr
                  ? 'سيتم توليد وحفظ بوستر مخصص باسم كل عضو، وإرسال إشعار فوري بحسابه ونشر التهنئة في لوحة الإعلانات والشريط العلوي.'
                  : 'A personalized poster will be issued for each member and notifications dispatched across the platform.'}
              </p>
            </div>
          ) : selectionMode === 'single' ? (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">{isAr ? '2. العضو المعني بالبوستر' : '2. Select Member'}</label>
              <select
                value={selectedMemberId}
                onChange={e => {
                  setSelectedMemberId(e.target.value);
                  setPreviewMemberId(e.target.value);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.fullName} — {u.role} ({u.committee})</option>
                ))}
              </select>
            </div>
          ) : (
            /* MULTI-MEMBER SELECTION PANEL */
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-500" />
                  <span>{isAr ? '2. قائمة تحديد الأعضاء:' : '2. Select Multiple Members:'}</span>
                </span>
                <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                  {isAr ? `محدد (${selectedMemberIds.length})` : `Selected (${selectedMemberIds.length})`}
                </span>
              </div>

              {/* Filters for Multi Select */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'تصفية باللجنة:' : 'Filter Committee:'}</label>
                  <select
                    value={committeeFilter}
                    onChange={e => setCommitteeFilter(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="all">{isAr ? 'جميع اللجان' : 'All Committees'}</option>
                    <option value="HR">لجنة HR</option>
                    <option value="PR">لجنة PR</option>
                    <option value="SM">لجنة SM</option>
                    <option value="OR">لجنة OR</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'تصفية بالدور:' : 'Filter Role:'}</label>
                  <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="all">{isAr ? 'الكل (أعضاء + قادة)' : 'All Roles'}</option>
                    <option value="leaders">{isAr ? 'القادة فقط' : 'Leaders Only'}</option>
                    <option value="members">{isAr ? 'الأعضاء فقط' : 'Members Only'}</option>
                  </select>
                </div>
              </div>

              {/* Quick Select All / Deselect Buttons */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer flex items-center gap-1 text-[11px]"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تحديد الكل في القائمة' : 'Select All'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllFiltered}
                  className="text-slate-500 hover:text-red-500 font-semibold cursor-pointer text-[11px]"
                >
                  {isAr ? 'إلغاء تحديد القائمة' : 'Deselect All'}
                </button>
              </div>

              {/* Scrollable Members Checkboxes List */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pe-1 pt-1 scrollbar-thin border-t border-slate-200 dark:border-slate-700">
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">{isAr ? 'لا يوجد أعضاء ينطبق عليهم التصفية' : 'No members found'}</p>
                ) : (
                  filteredUsers.map(u => {
                    const isChecked = selectedMemberIds.includes(u.id);
                    const isPreviewing = previewMemberId === u.id;
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleSelectMember(u.id)}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-slate-900 dark:text-white'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <img
                            src={u.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.fullName)}`}
                            alt=""
                            className="w-7 h-7 rounded-lg object-cover bg-slate-800 shrink-0"
                          />
                          <div className="min-w-0">
                            <h5 className="text-xs font-black truncate">{u.fullName}</h5>
                            <span className="text-[9px] text-slate-400 font-medium block">
                              {u.role} • {translateCommittee(u.committee)}
                            </span>
                          </div>
                        </div>

                        {isChecked && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewMemberId(u.id);
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-all shrink-0 ${
                              isPreviewing
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-purple-600 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {isPreviewing ? (isAr ? 'معاينة 👁️' : 'Previewing') : (isAr ? 'معاينة' : 'Preview')}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 3. Theme Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{isAr ? '3. نمط الألوان الرسمي' : '3. Theme Color'}</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setThemeColor('blue')}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold border-2 cursor-pointer transition-all flex items-center justify-center gap-1 ${
                  themeColor === 'blue'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 font-black shadow-md scale-105'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300'
                }`}
              >
                <span>🔵</span>
                <span>{isAr ? 'أزرق EYE' : 'Blue EYE'}</span>
              </button>

              <button
                type="button"
                onClick={() => setThemeColor('gold')}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold border-2 cursor-pointer transition-all flex items-center justify-center gap-1 ${
                  themeColor === 'gold'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-300 font-black shadow-md scale-105'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300'
                }`}
              >
                <span>🟡</span>
                <span>{isAr ? 'ذهبي ملكي' : 'Royal Gold'}</span>
              </button>

              <button
                type="button"
                onClick={() => setThemeColor('emerald')}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold border-2 cursor-pointer transition-all flex items-center justify-center gap-1 ${
                  themeColor === 'emerald'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300 font-black shadow-md scale-105'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-300'
                }`}
              >
                <span>🟢</span>
                <span>{isAr ? 'زمردي' : 'Emerald'}</span>
              </button>

              <button
                type="button"
                onClick={() => setThemeColor('purple')}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold border-2 cursor-pointer transition-all flex items-center justify-center gap-1 ${
                  themeColor === 'purple'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300 font-black shadow-md scale-105'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-purple-300'
                }`}
              >
                <span>🟣</span>
                <span>{isAr ? 'بنفسجي أوركيد' : 'Royal Purple'}</span>
              </button>
            </div>
          </div>

          {/* 4. POSTER TITLE BADGE INPUT */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{isAr ? '4. عنوان البوستر / المناسبة' : '4. Poster Title Badge'}</label>
            <input
              type="text"
              value={posterTitle}
              onChange={e => setPosterTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* 5. MESSAGE SUBTITLE TEXTAREA */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{isAr ? '5. نص التهنئة / الإشادة' : '5. Message Subtitle'}</label>
            <textarea
              value={customMsg}
              onChange={e => setCustomMsg(e.target.value)}
              rows={3}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-semibold text-slate-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* 6. BROADCAST CHANNELS MULTI-SELECT */}
          <div className="space-y-2.5 p-4 bg-amber-500/10 dark:bg-amber-950/30 rounded-2xl border border-amber-500/30">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase flex items-center gap-1.5">
                <Send className="w-4 h-4 text-amber-500" />
                <span>{isAr ? '6. قنوات التعميم والإرسال الفوري للجميع' : '6. Broadcast Channels'}</span>
              </label>
              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-black bg-amber-200/50 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">
                {isAr ? 'وصول شامل 📡' : 'Omnichannel'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <label className="flex items-start gap-2.5 text-slate-800 dark:text-slate-200 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={postAnnouncement}
                  onChange={e => setPostAnnouncement(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 mt-0.5"
                />
                <span className="text-[11px] leading-relaxed">
                  <strong className="text-amber-600 dark:text-amber-400">📢 {isAr ? 'نشر إعلان وتعميم رسمي:' : 'Official Announcement:'} </strong>
                  {isAr ? 'يظهر الإعلان للجميع في صفحة التعاميم واللوحة الرئيسية مع إشعار باللون الأحمر.' : 'Appears on announcements feed for all members.'}
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-slate-800 dark:text-slate-200 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={createOccasionBanner}
                  onChange={e => setCreateOccasionBanner(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 mt-0.5"
                />
                <span className="text-[11px] leading-relaxed">
                  <strong className="text-amber-600 dark:text-amber-400">🎊 {isAr ? 'تفعيل شريط التهنئة البارز بأعلى المنصة:' : 'Occasion Top Banner:'} </strong>
                  {isAr ? 'يضيء شريط التهنئة والاحتفال المتحرك في قمة المنصة لجميع الأعضاء لمدة 7 أيام.' : 'Displays festive banner on top of dashboard for 7 days.'}
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-slate-800 dark:text-slate-200 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareToMemoryWall}
                  onChange={e => setShareToMemoryWall(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 mt-0.5"
                />
                <span className="text-[11px] leading-relaxed">
                  <strong className="text-amber-600 dark:text-amber-400">🖼️ {isAr ? 'مشاركة على حائط الذكريات:' : 'Memory Wall Post:'} </strong>
                  {isAr ? 'نشر التهنئة على حائط الذكريات ليتفاعل الأعضاء بالتعليقات والمباركات والإعجابات.' : 'Post to memory wall for community likes and comments.'}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Right: Live Preview Box with Dynamic Theme Color */}
        <div className="md:col-span-6 bg-slate-950 rounded-3xl p-5 sm:p-6 border border-slate-800 flex flex-col items-center justify-center space-y-4 text-center text-white relative">
          <div className="w-full flex justify-between items-center text-xs font-bold text-slate-400 border-b border-slate-800 pb-3">
            <span className="flex items-center gap-1.5 text-blue-400">
              <Sparkles className="w-4 h-4" />
              <span>{isAr ? 'معاينة البوستر الحية' : 'Live Poster Preview'}</span>
            </span>
            <span className="text-[10px] bg-slate-800 px-2.5 py-1 rounded-full text-slate-300">
              {activePreviewUser.fullName}
            </span>
          </div>

          <div className={`w-full aspect-square max-w-sm rounded-2xl border-4 border-double ${previewStyles.borderColor} ${previewStyles.cardBg} p-6 flex flex-col items-center justify-between shadow-2xl relative transition-all duration-300`}>
            <span className={`text-[10px] font-bold ${previewStyles.brandText}`}>Egyptian Youth Entity — EYE</span>
            
            <div className="space-y-3 my-auto w-full">
              <h3 className={`text-sm font-black ${previewStyles.titleText} truncate`}>{posterTitle}</h3>
              <img
                src={activePreviewUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(activePreviewUser.fullName)}`}
                alt=""
                className={`w-24 h-24 rounded-full border-4 ${previewStyles.imgBorder} object-cover mx-auto bg-slate-900 transition-all shadow-md`}
              />
              <p className="text-base font-black text-white truncate">{activePreviewUser.fullName}</p>
              <p className={`text-[10px] font-bold ${previewStyles.roleText} truncate`}>{activePreviewUser.role} • {translateCommittee(activePreviewUser.committee)}</p>
              <p className="text-[9px] text-slate-400 px-4 line-clamp-2 leading-relaxed">{customMsg}</p>
            </div>

            <span className="text-[8px] text-slate-400 font-mono">• Official EYE Social Media Graphic •</span>
          </div>
        </div>
      </div>

      {/* Admin Section: History of Issued Posters */}
      {issuedPosters.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>{isAr ? `سجل البوسترات والتهاني الصادرة المعتمدة (${issuedPosters.length})` : `Issued Posters Registry (${issuedPosters.length})`}</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {issuedPosters.map(poster => (
              <div key={poster.id} className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{poster.memberName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{poster.title}</p>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {new Date(poster.createdAt).toLocaleDateString('ar-EG')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      const target = allUsers.find(u => u.id === poster.memberId) || {
                        id: poster.memberId,
                        fullName: poster.memberName,
                        role: poster.memberRole || 'Member',
                        committee: poster.memberCommittee || 'All',
                        avatarUrl: poster.memberAvatarUrl,
                      } as UserProfile;
                      generatePosterForMember(target, poster.themeColor, poster.title, poster.customMsg);
                    }}
                    className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-colors cursor-pointer"
                    title="تحميل البوستر"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteIssuedPoster(poster.id)}
                    className="p-1.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                    title="حذف البوستر الصادر"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
