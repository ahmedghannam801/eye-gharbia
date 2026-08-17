import React, { useState } from 'react';
import { EyeLogo, AnubisVector } from './EyeLogo';
import { useLanguage } from '../lib/LanguageContext';
import { useTheme } from '../lib/ThemeContext';
import { 
  ArrowRight, ArrowLeft, Shield, Award, FolderKanban, CheckCircle2, 
  ChevronDown, Mail, Phone, MapPin, Globe, Sparkles, Calendar, BookOpen, 
  Users, Users2, Trophy, Clock, HelpCircle, Send, Sun, Moon 
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { language, setLanguage, t, isRtl, translateCommittee } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [contactSent, setContactSent] = useState(false);

  // Stats
  const statsList = [
    { label: language === 'ar' ? 'الأعضاء النشطون' : 'Active Members', count: '٢٥٠+', enCount: '250+' },
    { label: language === 'ar' ? 'اللجان الأساسية' : 'Committees', count: '٤', enCount: '4' },
    { label: language === 'ar' ? 'الأقسام والوحدات' : 'Departments', count: '١٣', enCount: '13' },
    { label: language === 'ar' ? 'المهام المنجزة' : 'Tasks Completed', count: '١,٢٠٠+', enCount: '1,200+' },
  ];

  // Committees
  const committeesList = [
    {
      code: 'HR',
      name: language === 'ar' ? 'لجنة الموارد البشرية (HR)' : 'Human Resources Committee (HR)',
      departments: language === 'ar' 
        ? ['إدارة الموارد البشرية (HRM)', 'الهيكل والمتابعة (HRS)', 'نظم المعلومات (HRIS)', 'التطوير والتدريب (HRD)']
        : ['HRM (Management)', 'HRS (Structure)', 'HRIS (Information)', 'HRD (Development)'],
      description: language === 'ar'
        ? 'العمود الفقري لبناء الكوادر، تنظيم العلاقات، تتبع مستويات الأداء الإداري والتقييم الدوري الشامل للأعضاء.'
        : 'The backbone of organization architecture, talent acquisition, and member appraisal systems.',
    },
    {
      code: 'PR',
      name: language === 'ar' ? 'لجنة العلاقات العامة (PR)' : 'Public Relations Committee (PR)',
      departments: language === 'ar'
        ? ['العلاقات الخارجية (EPR)', 'العلاقات الداخلية والبروتوكول (IPR)']
        : ['External Relations (EPR)', 'Internal Relations (IPR)'],
      description: language === 'ar'
        ? 'بناء الشراكات الاستراتيجية والتشبيك المؤسسي، وتأمين الرعاية الرسمية وصياغة الحضور الإعلامي المميز.'
        : 'Building strategic relationships, sponsorships, and managing organization outreach.',
    },
    {
      code: 'SM',
      name: language === 'ar' ? 'لجنة صناعة المحتوى والسوشيال ميديا (SM)' : 'Social Media & Content (SM)',
      departments: language === 'ar'
        ? ['صناعة وكتابة المحتوى', 'التصميم الجرافيكي', 'التصوير والتوثيق البصري', 'المونتاج وصناعة الفيديو']
        : ['Content Writing', 'Graphic Design', 'Photography & Coverage', 'Video Editing'],
      description: language === 'ar'
        ? 'نشر صوت ورسالة EYE للعالم، تصميم الهوية البصرية الجذابة وإنتاج الأصول والوسائط الرقمية الفائقة.'
        : 'Voicing the mission of EYE, designing brand identity, and editing high-quality digital assets.',
    },
    {
      code: 'OR',
      name: language === 'ar' ? 'لجنة العلاقات التنظيمية والدعم اللوجستي (OR)' : 'Organizational Committee (OR)',
      departments: language === 'ar'
        ? ['إدارة كبار الشخصيات VIP', 'التخطيط الاستراتيجي للفعاليات', 'التنسيق العام', 'الدعم والعمليات اللوجستية']
        : ['VIP Management', 'Strategic Planning', 'Coordination', 'Logistics Operations'],
      description: language === 'ar'
        ? 'التنفيذ الميداني وتطبيق البروتوكول الرسمي، ضبط الميزانيات وتوفير الدعم التنظيمي واللوجستي المتكامل للفعاليات.'
        : 'Ground execution, protocol enforcement, budgeting, and flawless event logistics.',
    },
  ];

  // FAQ
  const faqsList = [
    {
      q: language === 'ar' ? 'ما هو كيان EYE؟' : 'What is the Egyptian Youth Entity (EYE)?',
      a: language === 'ar'
        ? 'كيان EYE هو كيان شبابي رسمي مسجل ومعتمد تحت مظلة وزارة الشباب والرياضة المصرية. نهدف إلى تمكين الكفاءات الشبابية، صقل المهارات القيادية والتقنية، وإطلاق مبادرات تنموية وطنية في مختلف المحافظات ومنها فرع الغربية الريادي.'
        : 'EYE is an official student organization registered under the Egyptian Ministry of Youth and Sports. We aim to empower youths, build leadership qualities, and host national-level youth initiatives across Egyptian governorates, with Gharbia as one of our premier active hubs.'
    },
    {
      q: language === 'ar' ? 'كيف تعمل منصة EYE الرقمية الموحدة؟' : 'How does the EYE Workflow Hub work?',
      a: language === 'ar'
        ? 'المنصة الرقمية الموحدة هي بيئة العمل السحابية الحصرية لكيان EYE. تتيح للأعضاء تسلم المهام الإدارية المنوطة بهم، ورفع تسليماتهم بملفات متعددة الأشكال، ومتابعة مراجعة القادة وتقييماتهم، وتصفح الإعلانات وتوثيق الحضور إلكترونياً.'
        : 'The Workflow Hub is our official workspace platform. Members receive structured tasks published by leaders, upload submissions (PDF, ZIP, Word, images), check evaluation status, and view announcements. Leaders review files and Super Admins manage the overall structure.'
    },
    {
      q: language === 'ar' ? 'كيف يمكنني الانضمام والتسجيل كعضو في الكيان؟' : 'How can I register as a member?',
      a: language === 'ar'
        ? 'ببساطة اضغط على زر "إنشاء حساب جديد"، واملأ البيانات الشخصية المطلوبة مع تحديد لجنتك المفضلة وقسمك المعتمد. بعد حفظ طلبك، سيدخل حسابك مرحلة "انتظار الاعتماد" لمراجعته وتفعيله مباشرة من قبل المشرف العام للمنصة.'
        : 'Click "Register Now", fill in your details (name, email, phone, preferred committee, and department). Once registered, your account will enter "Pending Approval" state until reviewed and activated by a Super Admin.'
    },
    {
      q: language === 'ar' ? 'ما هي قيود رفع الملفات المعتمدة في الكيان؟' : 'What are the system file upload constraints?',
      a: language === 'ar'
        ? 'يدعم الكيان تشكيلة واسعة من الامتدادات كملفات PDF و ZIP و RAR ومستندات Word و Excel والعروض التقديمية والوسائط البصرية، بحجم رفع أقصى مرن يحدده القائد لكل مهمة إدارية.'
        : 'The platform supports a robust array of file formats including PDF, ZIP, RAR, Word, Excel, PowerPoint, and videos up to 100 MB. Files are automatically filed in Supabase Storage structured by Committee, Department, and Task.'
    }
  ];

  // News and Achievements
  const achievementsList = [
    {
      title: language === 'ar' ? 'مبادرة تمكين الشباب بالغربية' : 'Gharbia Youth Empowerment Initiative',
      desc: language === 'ar' ? 'إطلاق حزمة ورش عمل تدريبية متخصصة استفاد منها أكثر من ٥٠٠ طالب جامعي في مجالات التقنية والإدارة.' : 'Launching professional workshop packages benefiting over 500 college students in technology and administration.',
      date: language === 'ar' ? 'يونيو ٢٠٢٦' : 'June 2026',
      icon: Award
    },
    {
      title: language === 'ar' ? 'الملتقى التوظيفي السنوي الأول' : 'The First Annual Employment Forum',
      desc: language === 'ar' ? 'بالتنسيق مع وزارة الشباب والرياضة والشركات الكبرى لتوفير فرص تدريب مهني فريدة للأعضاء المتميزين.' : 'In collaboration with the Ministry of Youth and Sports to secure internships for distinguished members.',
      date: language === 'ar' ? 'مايو ٢٠٢٦' : 'May 2026',
      icon: Trophy
    },
    {
      title: language === 'ar' ? 'تطوير الهيكل التنظيمي والكيان الذكي' : 'Smart Workflow Transformation',
      desc: language === 'ar' ? 'رقمنة الأعمال بنسبة ١٠٠٪ وربط كافة اللجان بنظام تتبع أداء وذكاء أعمال ذكي.' : 'Digitizing 100% of operations and connecting all committees to a smart business intelligence tracking system.',
      date: language === 'ar' ? 'أبريل ٢٠٢٦' : 'April 2026',
      icon: Sparkles
    }
  ];

  // Upcoming Events
  const eventsList = [
    {
      title: language === 'ar' ? 'المعسكر القيادي لـ EYE' : 'EYE Leadership Boot Camp 2026',
      date: language === 'ar' ? '١٥ يوليو ٢٠٢٦' : 'July 15, 2026',
      location: language === 'ar' ? 'المعسكر الشبابي برأس البر' : 'Youth Camp, Ras El-Bar',
      time: language === 'ar' ? '١٠:٠٠ ص' : '10:00 AM'
    },
    {
      title: language === 'ar' ? 'ملتقى الابتكار وريادة الأعمال' : 'Innovation & Entrepreneurship Summit',
      date: language === 'ar' ? '٢٢ يوليو ٢٠٢٦' : 'July 22, 2026',
      location: language === 'ar' ? 'قاعة المؤتمرات الكبرى بطنطا' : 'Grand Conference Hall, Tanta',
      time: language === 'ar' ? '١٢:٠٠ م' : '12:00 PM'
    }
  ];

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSent(true);
    setTimeout(() => setContactSent(false), 5000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-eye-brand selection:text-white" id="eye-landing-page">
      
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <EyeLogo size={42} showText={true} theme={theme === 'dark' ? 'dark' : 'light'} />
          
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-xs xl:text-sm font-bold text-slate-600 dark:text-slate-300">
            <a href="#about" className="hover:text-eye-brand transition-colors">{language === 'ar' ? 'من نحن' : 'About Us'}</a>
            <a href="#vision" className="hover:text-eye-brand transition-colors">{language === 'ar' ? 'رؤيتنا ورسالتنا' : 'Vision & Mission'}</a>
            <a href="#committees" className="hover:text-eye-brand transition-colors">{language === 'ar' ? 'اللجان الهيكلية' : 'Committees'}</a>
            <a href="#achievements" className="hover:text-eye-brand transition-colors">{language === 'ar' ? 'الإنجازات' : 'Achievements'}</a>
            <a href="#events" className="hover:text-eye-brand transition-colors">{language === 'ar' ? 'الفعاليات' : 'Events'}</a>
            <a href="#faq" className="hover:text-eye-brand transition-colors">{language === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}</a>
            <a href="#contact" className="hover:text-eye-brand transition-colors">{language === 'ar' ? 'تواصل معنا' : 'Contact'}</a>
          </nav>

          <div className="flex items-center gap-3">
            {/* Theme Switcher Button */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center p-2 rounded-xl bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all"
              title={language === 'ar' ? 'تغيير المظهر' : 'Toggle Theme'}
              id="landing-theme-toggler-btn"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
            </button>

            {/* Language Switcher Globe Button */}
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
              title={t('switchLanguage')}
            >
              <Globe className="w-3.5 h-3.5 text-eye-brand" />
              <span>{language === 'ar' ? 'English' : 'العربية'}</span>
            </button>

            <button
              onClick={() => onNavigate('login')}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              id="landing-login-btn"
            >
              {t('login')}
            </button>
            <button
              onClick={() => onNavigate('register')}
              className="bg-eye-brand hover:bg-eye-brand-dark text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"
              id="landing-register-btn"
            >
              {language === 'ar' ? 'إنشاء حساب' : 'Register Now'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-24 px-6 bg-white border-b border-slate-150">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          <div className="lg:col-span-7 flex flex-col space-y-6 text-center lg:text-start">
            <div className={`inline-flex self-center ${isRtl ? 'lg:self-start' : 'lg:self-start'} items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200/50 text-xs font-semibold text-amber-800 shadow-sm`}>
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>{language === 'ar' ? 'كيان معتمد تحت إشراف وزارة الشباب والرياضة' : 'Under Ministry of Youth and Sports Support'}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black tracking-tight text-slate-900 leading-[1.25] lg:leading-[1.15]">
              {language === 'ar' ? (
                <>
                  أدِر، تتبّع وطوّر أعمال <span className="text-amber-500">كيان EYE</span> بكل احترافية
                </>
              ) : (
                <>
                  Organize, Track, and Scale Your <span className="text-amber-500">EYE Operations</span>
                </>
              )}
            </h1>

            <p className="text-slate-500 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto lg:mx-0 font-semibold leading-relaxed">
              {t('landingSubtitle')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
              <button
                onClick={() => onNavigate('register')}
                className="w-full sm:w-auto bg-eye-brand hover:bg-eye-brand-dark text-white font-bold px-8 py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2.5 transition-all text-sm"
                id="hero-get-started-btn"
              >
                <span>{language === 'ar' ? 'انضم لكيان EYE الآن' : 'Join EYE Now'}</span>
                {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
              <button
                onClick={() => onNavigate('login')}
                className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-8 py-3.5 rounded-xl border border-slate-200 transition-all text-sm"
                id="hero-workspace-btn"
              >
                <span>{language === 'ar' ? 'منصة العمل الموحدة' : 'Enter Workspace'}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center relative">
            <div className="absolute inset-0 bg-blue-500/5 rounded-full blur-2xl" />
            <div className="relative bg-slate-50 p-8 sm:p-12 rounded-3xl border border-slate-200/80 shadow-xl flex flex-col items-center max-w-sm w-full">
              <AnubisVector size={110} className="mb-4 text-amber-500/80" />
              <EyeLogo size={150} showText={false} theme="light" />
              <div className="mt-6 text-center">
                <span className="text-xs font-bold tracking-widest uppercase text-amber-600 block">
                  {language === 'ar' ? 'كيان المصريون الشباب' : 'Egyptian Young Entity (EYE)'}
                </span>
                <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase tracking-wider font-bold">
                  {language === 'ar' ? 'الأمانة الفنية بمحافظة الغربية' : 'EYE Gharbia Secretariat'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="border-b border-slate-200 bg-slate-50/50 py-12 px-6" id="stats">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
          {statsList.map((stat, i) => (
            <div key={i} className="text-center space-y-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-mono">
                {language === 'ar' ? stat.count : stat.enCount}
              </span>
              <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-6 max-w-7xl mx-auto scroll-mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-5 relative">
            <div className="aspect-square rounded-3xl bg-white border border-slate-200 p-8 flex flex-col justify-between shadow-lg">
              <div className="flex justify-between items-start">
                <div className="p-3.5 rounded-2xl bg-blue-50 text-eye-brand border border-blue-100">
                  <Award className="w-8 h-8" />
                </div>
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest font-bold">EST. 2024</span>
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900">{language === 'ar' ? 'تطوير الكوادر الشبابية' : 'Empowering Youth'}</h3>
                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed font-semibold">
                  {language === 'ar' 
                    ? 'نحن نوفر بيئة حقيقية لطلاب الجامعات تماثل الشركات والمؤسسات الاحترافية لتأهيلهم لسوق العمل وصناعة قيادات الغد.' 
                    : 'We provide an authentic environment mimicking top corporates to empower college students for the labor market.'}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-eye-brand block">
              {language === 'ar' ? 'حول الكيان الوطني' : 'About the Entity'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {language === 'ar' ? 'كيان شبابي رائد بهيكل مؤسسي متكامل' : 'An Elite Organization Structured for Regional Impact'}
            </h2>
            <p className="text-slate-500 leading-relaxed font-semibold text-sm sm:text-base">
              {t('aboutText')}
            </p>
            <p className="text-slate-500 leading-relaxed font-semibold text-sm sm:text-base">
              {language === 'ar' 
                ? 'نعمل من خلال أربع لجان أساسية تضم تخصصات مختلفة كالموارد البشرية، العلاقات العامة، صناعة المحتوى البصري والتنظيم اللوجستي الميداني. نوفر مساحة عمل آمنة، احترافية، تسهم في تعزيز المهارات القيادية والشخصية للأعضاء.'
                : 'We operate across optimized committees to deliver real corporate competencies, bridging the gap between education and modern workflow technology.'}
            </p>
          </div>
        </div>
      </section>

      {/* Vision & Mission Section */}
      <section id="vision" className="py-20 bg-slate-50 border-t border-b border-slate-200 px-6 scroll-mt-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-md flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-eye-brand">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">{t('ourVision')}</h3>
              <p className="text-slate-500 text-sm sm:text-base leading-relaxed font-semibold">
                {t('visionText')}
              </p>
            </div>
          </div>

          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-md flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">{t('ourMission')}</h3>
              <p className="text-slate-500 text-sm sm:text-base leading-relaxed font-semibold">
                {t('missionText')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Committees Section */}
      <section id="committees" className="py-20 px-6 bg-white scroll-mt-6">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-eye-brand block">{language === 'ar' ? 'الهيكل الإداري واللجان' : 'Organigram'}</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {language === 'ar' ? 'لجان وأقسام الكيان المعتمدة' : 'Our Professional Organization Structure'}
            </h2>
            <p className="text-slate-500 font-semibold">
              {language === 'ar' 
                ? 'ينقسم كيان EYE بمحافظة الغربية إلى أربع لجان أساسية، تتفرع كل منها لأقسام تخصصية لإدارة العمليات اليومية بمرونة فائقة.'
                : 'EYE Gharbia is divided into four main committees, each hosting specialized sub-departments.'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {committeesList.map((comm, idx) => (
              <div
                key={idx}
                className="bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-200/80 flex flex-col justify-between space-y-6 hover:border-slate-300 transition-colors shadow-sm"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900">{comm.name}</h3>
                    <span className="w-2.5 h-2.5 rounded-full bg-eye-brand shadow-sm" />
                  </div>
                  <p className="text-slate-500 text-xs sm:text-sm leading-relaxed font-semibold">{comm.description}</p>
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">
                    {language === 'ar' ? 'الأقسام والوحدات التابعة' : 'Departments'}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {comm.departments.map((dept, dIdx) => (
                      <span
                        key={dIdx}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-white text-slate-600 border border-slate-200/60 shadow-sm"
                      >
                        {dept}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Achievements Section */}
      <section id="achievements" className="py-20 bg-slate-50 border-t border-slate-200 px-6 scroll-mt-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-eye-brand block">{language === 'ar' ? 'سجل الفخر والتميز' : 'Milestones'}</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {language === 'ar' ? 'أبرز الإنجازات المحققة' : 'Major Milestones & Achievements'}
            </h2>
            <p className="text-slate-500 font-semibold text-sm sm:text-base">
              {language === 'ar' ? 'جهود شبابية مخلصة ترجمت لمبادرات مثمرة على أرض الواقع بمحافظة الغربية.' : 'Dedicated youth efforts translated into fruitful initiatives in Gharbia.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {achievementsList.map((ach, idx) => {
              const Icon = ach.icon;
              return (
                <div key={idx} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-500 flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-slate-400 font-mono text-xs font-bold">{ach.date}</div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">{ach.title}</h3>
                  <p className="text-slate-500 text-xs sm:text-sm leading-relaxed font-semibold">{ach.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section id="events" className="py-20 bg-white border-t border-slate-200 px-6 scroll-mt-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-eye-brand block">{language === 'ar' ? 'الأجندة والفعاليات' : 'Calendar'}</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {language === 'ar' ? 'الفعاليات والأنشطة القادمة' : 'Upcoming Events & Forums'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {eventsList.map((evt, idx) => (
              <div key={idx} className="p-6 sm:p-8 rounded-3xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-600">
                    <Calendar className="w-4 h-4" />
                    <span>{evt.date}</span>
                    <span>•</span>
                    <Clock className="w-4 h-4" />
                    <span>{evt.time}</span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900">{evt.title}</h3>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{evt.location}</span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('register')}
                  className="bg-white hover:bg-slate-100 text-slate-800 font-bold px-4 py-2.5 rounded-xl border border-slate-200 text-xs self-start transition-all"
                >
                  {language === 'ar' ? 'حجز مقعد وحضور' : 'Register for Event'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-slate-50 border-t border-slate-200 px-6 scroll-mt-6">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-eye-brand block">{t('faq')}</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {language === 'ar' ? 'الأسئلة الشائعة والاستفسارات' : 'Frequently Asked Questions'}
            </h2>
          </div>

          <div className="space-y-4">
            {faqsList.map((faq, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className={`w-full px-6 py-4 sm:py-5 flex items-center justify-between font-bold text-slate-800 hover:bg-slate-50 transition-colors ${
                    isRtl ? 'text-right' : 'text-left'
                  }`}
                >
                  <span className="text-sm sm:text-base">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${activeFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {activeFaq === i && (
                  <div className="px-6 pb-5 text-xs sm:text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-4 bg-slate-50/50 font-semibold">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-6 max-w-7xl mx-auto scroll-mt-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 lg:p-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center shadow-md">
          <div className="lg:col-span-5 space-y-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{language === 'ar' ? 'هل لديك أي استفسار؟' : 'Need Assistance?'}</h2>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed font-semibold">
              {language === 'ar' 
                ? 'فريق إدارة الكيان بالأمانة العامة بمحافظة الغربية جاهز للرد على استفساراتكم وحل المشكلات الفنية على مدار الساعة.'
                : 'Reach out to our administrative office. We will get back to you within 24 working hours.'}
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-600 font-semibold">
                <Mail className="w-4 h-4 text-eye-brand shrink-0" />
                <span>support@eye-gharbia.org</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-600 font-semibold">
                <Phone className="w-4 h-4 text-eye-brand shrink-0" />
                <span>+20 10 1111 2222</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-600 font-semibold">
                <MapPin className="w-4 h-4 text-eye-brand shrink-0" />
                <span>{language === 'ar' ? 'الأمانة الفنية، طنطا، جمهورية مصر العربية' : 'Gharbia Secretariat, Tanta, Egypt'}</span>
              </div>
            </div>
          </div>

          <form className="lg:col-span-7 space-y-4" onSubmit={handleContactSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{language === 'ar' ? 'الاسم بالكامل' : 'Full Name'}</label>
                <input
                  type="text"
                  required
                  placeholder={language === 'ar' ? 'أحمد الغنام' : 'Ahmed Ghannam'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-eye-brand font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-eye-brand font-semibold"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{language === 'ar' ? 'تفاصيل الرسالة' : 'Message Details'}</label>
              <textarea
                required
                rows={4}
                placeholder={language === 'ar' ? 'اكتب استفسارك بالتفصيل هنا...' : 'Describe your inquiry...'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-eye-brand resize-none font-semibold"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-eye-brand hover:bg-eye-brand-dark text-white font-bold py-3.5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{language === 'ar' ? 'إرسال الرسالة الآن' : 'Send Message'}</span>
            </button>
            {contactSent && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl text-center border border-emerald-200 animate-fade-in">
                {language === 'ar' ? 'تم إرسال رسالتك بنجاح! وسنتواصل معك قريباً.' : 'Your message has been sent successfully!'}
              </div>
            )}
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <EyeLogo size={36} showText={true} theme="light" />
          <p className="text-xs text-slate-400 font-bold text-center md:text-start leading-relaxed">
            &copy; {new Date().getFullYear()} {language === 'ar' ? 'كيان EYE الغربية. جميع الحقوق محفوظة. الأمانة الفنية المعتمدة تحت إشراف وزارة الشباب والرياضة.' : 'Egyptian Youth Entity (EYE) Gharbia. All rights reserved. Ministry of Youth & Sports.'}
          </p>
        </div>
      </footer>
    </div>
  );
};
