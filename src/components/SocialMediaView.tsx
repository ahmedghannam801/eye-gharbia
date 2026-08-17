import React, { useState, useEffect } from 'react';
import { Facebook, ExternalLink, Sparkles, Image as ImageIcon, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

export const SocialMediaView: React.FC = () => {
  const { language } = useLanguage();
  const isRtl = language === 'ar';

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const handleOpenLightbox = (index: number) => {
    setImageLoading(true);
    setLightboxIndex(index);
  };

  const handleNextPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (lightboxIndex === null) return;
    setImageLoading(true);
    setLightboxIndex((lightboxIndex + 1) % teamPhotos.length);
  };

  const handlePrevPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (lightboxIndex === null) return;
    setImageLoading(true);
    setLightboxIndex((lightboxIndex - 1 + teamPhotos.length) % teamPhotos.length);
  };

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowRight') {
        if (isRtl) {
          handlePrevPhoto();
        } else {
          handleNextPhoto();
        }
      } else if (e.key === 'ArrowLeft') {
        if (isRtl) {
          handleNextPhoto();
        } else {
          handlePrevPhoto();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, isRtl]);

  const fbLink = "https://www.facebook.com/profile.php?id=61575331741408";

  const teamPhotos = [
    {
      src: "/team-1.jpg",
      captionAr: "قادة وأعضاء كيان EYE بمحافظة الغربية - روح العمل الجماعي والتميز المؤسسي",
      captionEn: "EYE Gharbia Leaders & Members - Teamwork Spirit and Institutional Excellence"
    },
    {
      src: "/team-2.jpg",
      captionAr: "أعضاء كيان EYE يستعدون للملتقى - شغف مستمر وتنظيم متميز للفعاليات",
      captionEn: "EYE Members Preparing for the Summit - Continuous Passion and Outstanding Event Organization"
    },
    {
      src: "/team-3.jpg",
      captionAr: "لقاء الأمانة الفنية والأعضاء - طموح متجدد لبناء مستقبل أفضل ومستدام",
      captionEn: "Technical Secretariat & Members Gathering - Renewed Ambition for a Sustainable Future"
    },
    {
      src: "/team-4.jpg",
      captionAr: "عائلة EYE الغربية - شركاء النجاح في صناعة القادة وتطوير المهارات الشبابية",
      captionEn: "EYE Gharbia Family - Partners in Leadership and Youth Skill Development"
    },
    {
      src: "/team-5.jpg",
      captionAr: "الأعضاء والوفود الشبابية في ملتقى التميز - تفاعل وحيوية لبناء الغد",
      captionEn: "Members & Youth Delegates at the Excellence Summit - Interaction and Vitality"
    },
    {
      src: "/team-6.jpg",
      captionAr: "مؤتمر الكيان وورش العمل التدريبية - صقل الكفاءات الشبابية والقيادية",
      captionEn: "Entity Convention & Training Workshops - Refining Youth & Leadership Competences"
    },
    {
      src: "/team-7.jpg",
      captionAr: "صورة جماعية لوفد الكيان مع المسؤولين في ملتقى التطوير والتنمية",
      captionEn: "Group Photo of the Entity Delegation with Officials in the Development Forum"
    },
    {
      src: "/team-8.jpg",
      captionAr: "لقاء تدريبي وتوجيهي لأعضاء الكيان - مشاركة المعرفة وتبادل الخبرات",
      captionEn: "Training & Orientation Meeting for Members - Knowledge Sharing and Experience Exchange"
    },
    {
      src: "/team-9.jpg",
      captionAr: "الصورة الجماعية لكيان EYE الغربية - انطلاقة قوية نحو التنمية والتمكين الشبابي",
      captionEn: "EYE Gharbia Group Photo - A Strong Launch Towards Development and Youth Empowerment"
    }
  ];

  return (
    <div className="space-y-8 p-6 text-slate-800 animate-fade-in" id="social-media-viewport" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-50 to-blue-100/40 dark:from-slate-900/60 dark:to-slate-850/40 p-6 rounded-3xl border border-blue-150/40 dark:border-slate-800 shadow-sm overflow-hidden relative">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2 text-eye-brand dark:text-eye-brand-light font-bold text-xs uppercase tracking-widest">
            <Sparkles className="w-4 h-4" />
            <span>{isRtl ? 'وسائل التواصل الاجتماعي' : 'Social Platforms'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {isRtl ? 'حسابات كيان EYE الغربية' : 'EYE Gharbia Social Accounts'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold">
            {isRtl 
              ? 'تابع أنشطتنا وفعالياتنا وتواصل معنا عبر منصات التواصل الاجتماعي الرسمية.' 
              : 'Follow our activities, events, and keep in touch through our official social media channels.'}
          </p>
        </div>

        {/* Ozy Selfie Mascot */}
        <div className="hidden md:block h-20 w-24 relative shrink-0">
          <img src="/mascot-social.png" alt="Ozy Selfie" className="h-24 object-contain absolute -bottom-5 right-0" />
        </div>
      </div>

      {/* Main Grid: Left side for Facebook Card, Right side or bottom for gallery */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Facebook Page Widget Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full min-h-[350px]">
            <div className="space-y-5">
              {/* Header Icon */}
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Facebook className="w-6 h-6 fill-current" />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 px-2.5 py-1 rounded-xl">
                  {isRtl ? 'رسمي' : 'Official'}
                </span>
              </div>

              {/* Title & Info */}
              <div className="space-y-2 text-start">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {isRtl ? 'الصفحة الرسمية على فيسبوك' : 'Official Facebook Page'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                  {isRtl 
                    ? 'تابع صفحتنا الرسمية على فيسبوك لتصفح الفعاليات، وورش العمل التدريبية، والملتقيات القيادية والمؤتمرات الكبرى بمحافظة الغربية.'
                    : 'Subscribe to our official Facebook page to receive updates about workshops, leadership bootcamps, and major youth conventions in Gharbia.'}
                </p>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 font-mono text-[10px] text-slate-400 dark:text-slate-500 break-all select-all">
                  {fbLink}
                </div>
              </div>
            </div>

            {/* Visit button */}
            <a
              href={fbLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-500/10 cursor-pointer"
            >
              <span>{isRtl ? 'زيارة صفحة الفيسبوك' : 'Visit Facebook Page'}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Gallery / Framed Images Section */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-amber-500" />
              <span>{isRtl ? 'معرض صور فعاليات الكيان' : 'EYE Event Photo Gallery'}</span>
            </h3>

            {/* Framed Photos List */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {teamPhotos.map((photo, index) => (
                <div 
                  key={index}
                  onClick={() => handleOpenLightbox(index)}
                  className="bg-slate-50 dark:bg-slate-800/20 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col space-y-3 group hover:scale-[1.02] transition-all duration-300 shadow-sm cursor-pointer"
                >
                  {/* Photo Frame Container */}
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 shadow-inner">
                    <img
                      src={photo.src}
                      alt={photo.captionAr}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                      <span className="text-[9px] text-white font-black drop-shadow-sm">EYE GHARBIA</span>
                    </div>
                  </div>

                  {/* Photo Caption (Polaroid Style description) */}
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold text-center leading-normal min-h-[40px] px-1">
                    {isRtl ? photo.captionAr : photo.captionEn}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/30 hover:scale-105 transition-all cursor-pointer z-50 shadow-md"
            title={isRtl ? 'إغلاق' : 'Close'}
          >
            <X className="w-6 h-6" />
          </button>

          {/* Left Navigation Arrow */}
          <button
            onClick={handlePrevPhoto}
            className="absolute left-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/30 hover:scale-105 transition-all cursor-pointer z-50 shadow-md"
            title={isRtl ? 'السابق' : 'Previous'}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Right Navigation Arrow */}
          <button
            onClick={handleNextPhoto}
            className="absolute right-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/30 hover:scale-105 transition-all cursor-pointer z-50 shadow-md"
            title={isRtl ? 'التالي' : 'Next'}
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Main Lightbox Content */}
          <div className="flex flex-col items-center max-w-5xl w-full text-center space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-slate-950/80 flex items-center justify-center min-h-[300px] w-full max-h-[80vh]">
              
              {/* Loader Spinner */}
              {imageLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-3 z-10">
                  <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                  <span className="text-xs text-slate-300 font-semibold tracking-wider animate-pulse">
                    {isRtl ? 'جاري تحميل الصورة...' : 'Loading image...'}
                  </span>
                </div>
              )}

              <img
                src={teamPhotos[lightboxIndex].src}
                alt={isRtl ? teamPhotos[lightboxIndex].captionAr : teamPhotos[lightboxIndex].captionEn}
                onLoad={() => setImageLoading(false)}
                className={`w-full max-w-4xl h-auto max-h-[78vh] object-contain block mx-auto rounded-xl transition-all duration-500 ease-out ${
                  imageLoading ? 'opacity-20 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'
                }`}
              />
            </div>
            
            {/* Caption description overlay */}
            <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl max-w-2xl mx-auto border border-white/5 space-y-1 shadow-lg">
              <p className="text-white text-xs sm:text-sm font-bold leading-relaxed">
                {isRtl ? teamPhotos[lightboxIndex].captionAr : teamPhotos[lightboxIndex].captionEn}
              </p>
              <div className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest mt-1">
                {isRtl 
                  ? `فعاليات كيان EYE الغربية (${lightboxIndex + 1} / ${teamPhotos.length})` 
                  : `EYE Gharbia Activities (${lightboxIndex + 1} / ${teamPhotos.length})`}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
