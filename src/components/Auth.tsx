import React, { useState, useEffect } from 'react';
import { db } from '../db/localDb';
import { EyeLogo } from './EyeLogo';
import { COMMITTEE_STRUCTURE, CENTRAL_DEPARTMENTS, HRM_DEPARTMENTS, UserProfile, UserRole } from '../types';
import { Lock, Mail, User, Phone, Briefcase, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft, ArrowRight, Sun, Moon, Copy, MapPin } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { useTheme } from '../lib/ThemeContext';

// قائمة محافظات مصر المعتمدة في المنصة (25 محافظة + مركزية)
const EGYPT_GOVERNORATES = [
  'القاهرة',
  'الإسكندرية',
  'الجيزة',
  'الغربية',
  'القليوبية',
  'الشرقية',
  'الدقهلية',
  'المنوفية',
  'البحيرة',
  'كفر الشيخ',
  'الإسماعيلية',
  'بورسعيد',
  'السويس',
  'دمياط',
  'شمال سيناء',
  'الفيوم',
  'بني سويف',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'البحر الأحمر',
  'المركزية',
] as const;

interface AuthProps {
  onAuthSuccess: (user: UserProfile) => void;
  onNavigateHome: () => void;
  initialMode?: 'login' | 'register' | 'forgot' | 'reset-password';
  showEmailConfirmedMsg?: boolean;
  initialErrorMsg?: string;
}

export const Auth: React.FC<AuthProps> = ({
  onAuthSuccess,
  onNavigateHome,
  initialMode = 'login',
  showEmailConfirmedMsg,
  initialErrorMsg,
}) => {
  const { language, t, isRtl, translateCommittee, translateDepartment } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset-password'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);

  // Synchronize internal mode whenever initialMode prop updates
  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginGovernorate, setLoginGovernorate] = useState('');

  // Password Reset fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regCommittee, setRegCommittee] = useState('HR');
  const [regDepartment, setRegDepartment] = useState('HRM');
  const [regRole, setRegRole] = useState<UserRole>('Member');
  const [regLeaderCode, setRegLeaderCode] = useState('');
  const [regGovernorate, setRegGovernorate] = useState('');

  // After registration: show the generated membership code
  const [newMembershipCode, setNewMembershipCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // Status feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (showEmailConfirmedMsg) {
      setSuccessMsg(
        language === 'ar'
          ? 'تم تأكيد بريدك الإلكتروني بنجاح! يمكنك الآن تسجيل الدخول باستخدام حسابك.'
          : 'Your email has been confirmed successfully! You can now log in.'
      );
    }
  }, [showEmailConfirmedMsg, language]);

  useEffect(() => {
    if (initialErrorMsg) {
      setErrorMsg(getFriendlyErrorMessage(initialErrorMsg));
    }
  }, [initialErrorMsg, language]);

  const getFriendlyErrorMessage = (err: string): string => {
    if (!err) return '';
    const isAr = language === 'ar';
    const cleanErr = err.toLowerCase();
    if (cleanErr.includes('otp_expired') || cleanErr.includes('expired') || cleanErr.includes('invalid or has expired')) {
      return isAr
        ? 'رابط استعادة كلمة المرور غير صالح أو انتهت صلاحيته. يرجى طلب رابط جديد.'
        : 'The password reset link is invalid or has expired. Please request a new link.';
    }
    if (cleanErr.includes('session missing') || cleanErr.includes('auth session missing')) {
      return isAr
        ? 'انتهت صلاحية الجلسة. يرجى طلب رابط استعادة جديد من صفحة تسجيل الدخول.'
        : 'Auth session missing or expired. Please request a new reset link.';
    }
    if (cleanErr.includes('different') || cleanErr.includes('should be different')) {
      return isAr
        ? 'يجب أن تكون كلمة المرور الجديدة مختلفة عن كلمة المرور السابقة.'
        : 'New password should be different from the old password.';
    }
    if (cleanErr.includes('rate limit') || cleanErr.includes('too many requests')) {
      return isAr
        ? 'تم تجاوز الحد الأقصى لإرسال رسائل البريد الإلكتروني. يرجى المحاولة بعد قليل.'
        : 'Email rate limit exceeded. Please try again later.';
    }
    if (cleanErr.includes('security purposes') || cleanErr.includes('once every 5 minutes')) {
      return isAr
        ? 'لدواعي أمنية، يرجى الانتظار ٥ دقائق قبل محاولة التسجيل مرة أخرى.'
        : 'For security purposes, you can only register once every 5 minutes.';
    }
    if (cleanErr.includes('already exists') || cleanErr.includes('already registered')) {
      return isAr
        ? 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.'
        : 'A user with this email address already exists. Please log in.';
    }
    if (cleanErr.includes('invalid login credentials') || cleanErr.includes('invalid credentials')) {
      return isAr
        ? 'فشل تسجيل الدخول. يرجى التحقق من البريد الإلكتروني وكلمة المرور.'
        : 'Invalid email or password. Please check your credentials and try again.';
    }
    if (cleanErr.includes('email not confirmed')) {
      return isAr
        ? 'لم يتم تأكيد البريد الإلكتروني بعد. يرجى التحقق من بريدك الإلكتروني لتأكيد الحساب.'
        : 'Email not confirmed. Please check your inbox to confirm your account.';
    }
    return err;
  };

  const handleCommitteeChange = (comm: string) => {
    setRegCommittee(comm);
    const depts = COMMITTEE_STRUCTURE[comm] || [];
    if (depts.length > 0) {
      setRegDepartment(depts[0]);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = loginEmail.trim();
    const cleanPassword = loginPassword.trim();
    const cleanGovernorate = loginGovernorate.trim();

    if (!cleanGovernorate) {
      setErrorMsg(language === 'ar' ? 'يرجى اختيار المحافظة أولاً قبل تسجيل الدخول.' : 'Please select your governorate before signing in.');
      return;
    }

    if (!cleanEmail || !cleanPassword) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال جميع البيانات المطلوبة.' : 'Please fill in all credentials.');
      return;
    }

    const res = await db.login(cleanEmail, cleanPassword);
    if (res.success && res.user) {
      const userGov = (res.user.governorate || '').trim();
      const normalizeGov = (g: string) => g.replace(/^محافظة\s+/, '').trim();

      const isCentralAuthority =
        res.user.role === 'Super Admin' ||
        res.user.role === 'Vice' ||
        res.user.role === 'Coordinator' ||
        res.user.role === 'Deputy Coordinator' ||
        res.user.role === 'Central' ||
        userGov === 'المركزية';

      if (userGov && normalizeGov(userGov) !== normalizeGov(cleanGovernorate) && !isCentralAuthority) {
        setErrorMsg(
          language === 'ar'
            ? `أنت مسجل في محافظة ${userGov} فقط، يرجى اختيارها للدخول`
            : `You are registered in ${userGov} governorate only. Please select it to sign in.`
        );
        return;
      }

      // حفظ المحافظة في الـ session (localStorage)
      try {
        localStorage.setItem('eye_current_governorate', cleanGovernorate);
        // تحديث بيانات المستخدم بالمحافظة إذا لم تكن محفوظة
        if (!res.user.governorate && res.user.id) {
          db.updateProfile(res.user.id, { governorate: cleanGovernorate }, res.user);
        }
      } catch (err) {
        console.warn('[Login] Could not save governorate to localStorage:', err);
      }
      setSuccessMsg(language === 'ar' ? 'تم تسجيل الدخول بنجاح! جاري تحضير لوحة التحكم...' : 'Authentication successful! Loading your workspace...');
      setIsLoggingIn(true);
      setTimeout(() => { onAuthSuccess(res.user!); }, 1500);
    } else {
      const arFailMsg = 'فشل تسجيل الدخول. يرجى التحقق من البريد الإلكتروني (أو كود العضوية) وكلمة المرور.';
      setErrorMsg(getFriendlyErrorMessage(res.error || (language === 'ar' ? arFailMsg : 'Invalid credentials.')));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanName = regName.trim();
    const cleanEmail = regEmail.trim();
    const cleanPhone = regPhone.trim();
    const cleanPassword = regPassword.trim();
    const cleanConfirm = regConfirmPassword.trim();

    if (!cleanName || !cleanEmail || !cleanPhone || !cleanPassword || !cleanConfirm) {
      setErrorMsg(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة للتسجيل.' : 'Please fill in all registration fields.');
      return;
    }

    const trimmedCode = regLeaderCode.trim().toUpperCase();
    const isSpecialRole = ['Leader', 'Vice', 'Head', 'Coordinator', 'Deputy Coordinator', 'Central', 'HRM'].includes(regRole) || !!trimmedCode;
    let finalRole = regRole;
    let finalCommittee = regCommittee;
    let finalDepartment = regDepartment;
    let finalGovernorate = regGovernorate.trim();

    if (isSpecialRole || trimmedCode) {
      if (!trimmedCode) {
        setErrorMsg(language === 'ar' ? 'يرجى إدخال كود التسجيل المخصص لمنصبك.' : 'Please enter your registration code.');
        return;
      }
      const allCodes = db.getAllSecurityCodes();
      const codeDetails = (allCodes as any)[trimmedCode];
      if (!codeDetails) {
        setErrorMsg(language === 'ar' ? 'الكود غير صحيح' : 'Invalid registration code.');
        return;
      }
      if (codeDetails.role) finalRole = codeDetails.role;
      if (codeDetails.committee) finalCommittee = codeDetails.committee;
      if (codeDetails.department) finalDepartment = codeDetails.department;
      if (codeDetails.governorate) finalGovernorate = codeDetails.governorate;
    }

    if (!finalGovernorate) {
      setErrorMsg(language === 'ar' ? 'يرجى اختيار المحافظة التابع لها أولاً.' : 'Please select your governorate.');
      return;
    }

    if (cleanPassword !== cleanConfirm) {
      setErrorMsg(language === 'ar' ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }

    if (cleanPassword.length < 6) {
      setErrorMsg(language === 'ar' ? 'يجب أن تتكون كلمة المرور من ٦ أحرف على الأقل.' : 'Password must be at least 6 characters.');
      return;
    }

    const res = await db.registerWithPassword(
      cleanName, cleanEmail, cleanPhone, cleanPassword,
      finalCommittee, finalDepartment, finalRole,
      finalGovernorate
    );
    if (res.success && res.user) {
      const isMemberRole = res.user.role === 'Member';
      if (!isMemberRole) {
        setNewMembershipCode(res.user.membershipCode || null);
      }
      // حفظ المحافظة في الـ session بعد التسجيل الناجح
      try { localStorage.setItem('eye_current_governorate', regGovernorate.trim()); } catch {}
      setSuccessMsg(
        language === 'ar'
          ? (isMemberRole
              ? 'تم تقديم طلب التسجيل بنجاح! يرجى الانتظار لحين اعتماد تفعيل حسابك من قِبل إدارة الكيان.'
              : `تم تسجيل حسابك بنجاح! كود عضويتك الخاص: ${res.user.membershipCode}`)
          : (isMemberRole
              ? 'Account created successfully! Please await leadership approval.'
              : `Account created successfully! Your membership code: ${res.user.membershipCode}`)
      );
      setRegName(''); setRegEmail(''); setRegPhone('');
      setRegPassword(''); setRegConfirmPassword(''); setRegGovernorate('');
    } else {
      const fallbackMsg = language === 'ar' ? 'فشل التسجيل. يرجى المحاولة مرة أخرى.' : 'Registration failed.';
      setErrorMsg(getFriendlyErrorMessage(res.error || fallbackMsg));
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!loginEmail) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال البريد الإلكتروني.' : 'Please enter your email address.');
      return;
    }
    const res = await db.resetPassword(loginEmail);
    if (res.success) {
      setSuccessMsg(
        language === 'ar'
          ? `تم إرسال رابط استعادة كلمة المرور بنجاح إلى البريد الإلكتروني: ${loginEmail}. يرجى مراجعة بريدك الإلكتروني.`
          : res.message
      );
    } else {
      setErrorMsg(getFriendlyErrorMessage(res.message));
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newPassword || !confirmNewPassword) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال كلمة المرور الجديدة وتأكيدها.' : 'Please fill in both password fields.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg(language === 'ar' ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg(language === 'ar' ? 'يجب أن تتكون كلمة المرور من ٦ أحرف على الأقل.' : 'Password must be at least 6 characters.');
      return;
    }

    const res = await db.updatePassword(newPassword);
    if (res.success) {
      setSuccessMsg(language === 'ar' ? 'تم تعيين كلمة المرور الجديدة بنجاح! جاري توجيهك لصفحة الدخول...' : 'Password updated successfully! Redirecting to login...');
      setTimeout(async () => {
        try {
          await db.logout();
        } catch {}
        setMode('login');
        setSuccessMsg(language === 'ar' ? 'تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.' : 'Password updated successfully. You can now log in.');
        setNewPassword('');
        setConfirmNewPassword('');
      }, 2000);
    } else {
      setErrorMsg(getFriendlyErrorMessage(res.message));
    }
  };

  const copyCode = () => {
    if (newMembershipCode) {
      navigator.clipboard.writeText(newMembershipCode).then(() => {
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
      });
    }
  };

  if (isLoggingIn) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
        <div className="flex flex-col items-center gap-5">
          <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-eye-brand dark:border-blue-400 animate-spin-slow opacity-65"></div>
            <img src="/eye-logo-transparent.png" alt="EYE Logo" className="w-28 h-28 sm:w-32 sm:h-32 object-cover rounded-full shadow-lg border border-slate-200 dark:border-slate-800 animate-pulse-slow" />
          </div>
          <div className="space-y-1.5 text-center">
            <h3 className="text-sm font-black tracking-wider uppercase">EYE Tasks</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold animate-pulse">
              {language === 'ar' ? 'تم تأكيد الهوية. جاري تحضير لوحة التحكم الخاصة بك...' : 'Identity verified. Preparing your workspace...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-eye-brand relative overflow-hidden" id="eye-auth-page" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Floating Theme Switcher */}
      <div className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} z-20`}>
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm transition-all"
          title={language === 'ar' ? 'تغيير المظهر' : 'Toggle Theme'}
          id="auth-theme-toggler-btn"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>

      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center z-10 flex flex-col items-center">
        <button onClick={onNavigateHome} className="inline-flex items-center justify-center hover:opacity-85 transition-opacity focus:outline-none focus:ring-2 focus:ring-eye-brand focus:ring-offset-2 rounded-full p-1 bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800">
          <EyeLogo size={100} showText={false} theme={theme === 'dark' ? 'dark' : 'light'} />
        </button>
        <h2 className="mt-4 text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {mode === 'login' && (language === 'ar' ? 'تسجيل الدخول إلى كيان EYE' : 'Sign in to EYE Hub')}
          {mode === 'register' && (language === 'ar' ? 'طلب الانضمام لعائلة EYE' : 'Apply to EYE Organization')}
          {mode === 'forgot' && (language === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset your password')}
          {mode === 'reset-password' && (language === 'ar' ? 'تعيين كلمة المرور الجديدة' : 'Set New Password')}
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 font-bold">
          {mode === 'login' && (
            <>
              {language === 'ar' ? 'أو ' : 'Or '}
              <button onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); setNewMembershipCode(null); }} className="font-bold text-eye-brand hover:text-eye-brand-dark underline underline-offset-4">
                {language === 'ar' ? 'تقديم طلب إنشاء حساب عضو جديد' : 'apply for a member account'}
              </button>
            </>
          )}
          {mode === 'register' && (
            <>
              {language === 'ar' ? 'لديك حساب بالفعل؟ ' : 'Already have an account? '}
              <button onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); setNewMembershipCode(null); }} className="font-bold text-eye-brand hover:text-eye-brand-dark underline underline-offset-4">
                {language === 'ar' ? 'تسجيل الدخول مباشرة' : 'Sign in instead'}
              </button>
            </>
          )}
          {(mode === 'forgot' || mode === 'reset-password') && (
            <button onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }} className="font-bold text-eye-brand hover:text-eye-brand-dark underline underline-offset-4">
              {language === 'ar' ? 'العودة لصفحة تسجيل الدخول' : 'Return to sign in'}
            </button>
          )}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl z-10 px-4">
        <div className="grid grid-cols-1 gap-6">

          {/* Main Auth Form Container */}
          <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-8 shadow-xl rounded-3xl border border-slate-200/80 dark:border-slate-800">

            {errorMsg && (
              <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 text-xs font-bold text-red-600 dark:text-red-400 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ── Membership Code Card (shown right after registration) ── */}
            {newMembershipCode && (
              <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border-2 border-blue-200 dark:border-blue-800 animate-fade-in">
                <p className="text-xs font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-2">
                  {language === 'ar' ? '🎉 كود عضويتك الرسمي' : '🎉 Your Official Membership Code'}
                </p>
                <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl px-4 py-3 border border-blue-100 dark:border-blue-900 gap-3">
                  <span className="text-xl font-black tracking-widest text-eye-brand dark:text-blue-400 font-mono">
                    {newMembershipCode}
                  </span>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-eye-brand dark:hover:text-blue-400 transition-colors shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {codeCopied
                      ? (language === 'ar' ? 'تم النسخ ✓' : 'Copied ✓')
                      : (language === 'ar' ? 'نسخ' : 'Copy')}
                  </button>
                </div>
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-2.5 leading-relaxed">
                  {language === 'ar'
                    ? '⚠️ احتفظ بهذا الكود — هو هويتك الرسمية في الكيان. يستخدم للتعريف وليس للدخول.'
                    : '⚠️ Save this code — it is your official identity in the system. Used for identification, not for login.'}
                </p>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setNewMembershipCode(null); setSuccessMsg(''); setLoginEmail(regEmail); }}
                  className="mt-3 w-full bg-eye-brand hover:bg-eye-brand-dark text-white text-xs font-black py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  {language === 'ar' ? 'تسجيل الدخول الآن' : 'Proceed to Login'}
                </button>
              </div>
            )}

            {/* ── LOGIN MODE ── */}
            {mode === 'login' && (
              <form className="space-y-5" onSubmit={handleLogin} id="auth-login-form">

                {/* Governorate Dropdown — مطلوب قبل تسجيل الدخول */}
                <div className="space-y-1.5">
                  <label htmlFor="login-governorate" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {language === 'ar' ? 'المحافظة' : 'Governorate'}
                    <span className="text-red-500 ms-1">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      id="login-governorate"
                      required
                      value={loginGovernorate}
                      onChange={(e) => setLoginGovernorate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ps-10 pe-4 py-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-eye-brand focus:ring-1 focus:ring-eye-brand font-semibold appearance-none"
                    >
                      <option value="">{language === 'ar' ? '— اختر محافظتك —' : '— Select your governorate —'}</option>
                      {EGYPT_GOVERNORATES.map((gov) => (
                        <option key={gov} value={gov}>{gov}</option>
                      ))}
                    </select>
                  </div>
                  {!loginGovernorate && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                      {language === 'ar' ? '⚠️ يجب اختيار المحافظة أولاً لتسجيل الدخول' : '⚠️ You must select a governorate to continue'}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {language === 'ar' ? 'البريد الإلكتروني أو رقم الهاتف' : 'Email Address or Phone Number'}
                  </label>
                  <div className="relative">
                    <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="email"
                      type="text"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder={language === 'ar' ? 'البريد الإلكتروني أو رقم الهاتف أو كود العضوية...' : 'Email, Phone, or Membership Code...'}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ps-10 pe-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-eye-brand focus:ring-1 focus:ring-eye-brand font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {language === 'ar' ? 'كلمة المرور' : 'Password'}
                    </label>
                    <button type="button" onClick={() => setMode('forgot')} className="text-xs font-bold text-eye-brand hover:text-eye-brand-dark">
                      {language === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot?'}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value.replace(/\s+/g, ''))}
                      onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ps-10 pe-10 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-eye-brand focus:ring-1 focus:ring-eye-brand font-semibold"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute end-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!loginGovernorate}
                  className="w-full bg-eye-brand hover:bg-eye-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2"
                  id="login-submit-btn"
                >
                  <span>{language === 'ar' ? 'تسجيل الدخول للكيان' : 'Sign In to Hub'}</span>
                  {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            )}

            {/* ── REGISTER MODE ── */}
            {mode === 'register' && !newMembershipCode && (
              <form className="space-y-4" onSubmit={handleRegister} id="auth-register-form">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {language === 'ar' ? 'الاسم بالكامل' : 'Full Name'}
                    </label>
                    <div className="relative">
                      <User className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text" required value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder={language === 'ar' ? 'أحمد الغنام' : 'Ahmed Ghannam'}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ps-10 pe-4 py-3 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-eye-brand focus:ring-1 focus:ring-eye-brand font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {language === 'ar' ? 'رقم الهاتف (الواتساب)' : 'Phone Number'}
                    </label>
                    <div className="relative">
                      <Phone className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel" required value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+20 1011 223 344"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ps-10 pe-4 py-3 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-eye-brand focus:ring-1 focus:ring-eye-brand font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email" required value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ps-10 pe-4 py-3 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-eye-brand focus:ring-1 focus:ring-eye-brand font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {language === 'ar' ? 'الدور / المنصب المطلوب' : 'Requested Position'}
                  </label>
                  <div className="relative">
                    <User className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={regRole}
                      onChange={(e) => {
                        const newRole = e.target.value as UserRole;
                        setRegRole(newRole);
                        if (!['Leader', 'Vice', 'Head', 'Coordinator', 'Deputy Coordinator'].includes(newRole)) {
                          setRegLeaderCode('');
                        }
                        if (newRole === 'Central') {
                          setRegGovernorate('المركزية');
                          setRegCommittee(CENTRAL_DEPARTMENTS[0].committee);
                          setRegDepartment(CENTRAL_DEPARTMENTS[0].department);
                        }
                        if (newRole === 'HRM') {
                          setRegCommittee('HR');
                          setRegDepartment(HRM_DEPARTMENTS[0].department);
                        }
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ps-10 pe-4 py-3 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-eye-brand focus:ring-1 focus:ring-eye-brand font-bold"
                    >
                      <option value="Member">{language === 'ar' ? 'عضو باللجنة (Member)' : 'Member'}</option>
                      <option value="Leader">{language === 'ar' ? 'قائد لجنة / قسم (Leader)' : 'Committee Leader'}</option>
                      <option value="Head">{language === 'ar' ? 'رئيس اللجنة (Head)' : 'Committee Head'}</option>
                      <option value="Vice">{language === 'ar' ? 'نائب رئيس (Vice)' : 'Vice'}</option>
                      <option value="HRM">{language === 'ar' ? 'مسؤول الموارد البشرية (HRM)' : 'HR Manager (HRM)'}</option>
                      <option value="Coordinator">{language === 'ar' ? 'منسق (Coordinator)' : 'Coordinator'}</option>
                      <option value="Deputy Coordinator">{language === 'ar' ? 'نائب منسق (Deputy Coordinator)' : 'Deputy Coordinator'}</option>
                      <option value="Central">{language === 'ar' ? 'مسؤول بالمركزية (Central)' : 'Central Official'}</option>
                    </select>
                  </div>
                </div>

                {/* Registration Code Input (Shown ONLY for Leaders & Officials, HIDDEN for Members) */}
                {regRole !== 'Member' && (
                  <div className="space-y-1.5 p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 animate-fade-in">
                    <label className="block text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      {language === 'ar' ? 'كود التسجيل للمسؤولين والقيادات *' : 'Registration Code (Required for Leaders & Officials) *'}
                    </label>
                    <div className="relative mt-1">
                      <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                      <input
                        type="text"
                        value={regLeaderCode}
                        onChange={(e) => setRegLeaderCode(e.target.value)}
                        placeholder={language === 'ar' ? 'مثال: EYE-CTRL-HR أو EYE-HRM-PR أو EYE-CAI-LDR-101' : 'e.g. EYE-CTRL-HR, EYE-HRM-PR, EYE-CAI-LDR-101'}
                        className="w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl ps-10 pe-4 py-3 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-black tracking-widest text-center"
                      />
                    </div>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold leading-relaxed mt-1.5">
                      {language === 'ar'
                        ? 'ملاحظة: كود التسجيل يربط حسابك تلقائياً بالمنصب والمحافظة المعتمدة بالكيان. إذا كنت مسؤول مركزية أو HRM أو قائد فرعي استخدم الكود الخاص بك.'
                        : 'Note: Registration code links your account automatically to your assigned role, branch, and governorate.'}
                    </p>
                  </div>
                )}

                {/* Central Department Selection (Shown ONLY when Central role is selected) */}
                {regRole === 'Central' && (
                  <div className="space-y-1.5 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 animate-fade-in">
                    <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                      {language === 'ar' ? 'تحديد منصب / قسم المركزية *' : 'Central Department / Position *'}
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                      <select
                        value={regDepartment}
                        onChange={(e) => {
                          const selectedDept = e.target.value;
                          const found = CENTRAL_DEPARTMENTS.find(d => d.department === selectedDept);
                          if (found) {
                            setRegCommittee(found.committee);
                            setRegDepartment(found.department);
                          }
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl ps-10 pe-4 py-3 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-bold"
                      >
                        {CENTRAL_DEPARTMENTS.map((dept) => (
                          <option key={dept.department} value={dept.department}>
                            {dept.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium leading-relaxed mt-1">
                      {language === 'ar'
                        ? 'تنويه: مسؤولو المركزية يمتلكون صلاحية متابعة وتقييم رؤساء اللجان والنواب عبر جميع المحافظات.'
                        : 'Notice: Central officials have authority to evaluate & monitor Heads and Vices across all governorates.'}
                    </p>
                  </div>
                )}

                {/* HRM Sub-Department Selection (Shown ONLY when HRM role is selected) */}
                {regRole === 'HRM' && (
                  <div className="space-y-1.5 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 animate-fade-in">
                    <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      {language === 'ar' ? 'تحديد قسم / فرع الموارد البشرية (HRM) *' : 'HRM Sub-Department / Branch *'}
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                      <select
                        value={regDepartment}
                        onChange={(e) => {
                          const selectedDept = e.target.value;
                          setRegCommittee('HR');
                          setRegDepartment(selectedDept);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl ps-10 pe-4 py-3 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-bold"
                      >
                        {HRM_DEPARTMENTS.map((dept) => (
                          <option key={dept.department} value={dept.department}>
                            {dept.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium leading-relaxed mt-1">
                      {language === 'ar'
                        ? 'تنويه: مسؤولو الموارد البشرية يمتلكون صلاحية التقييم والإدارة لجميع الأعضاء واللجان (لكل الناس).'
                        : 'Notice: HR managers have authority to manage & evaluate members across all committees.'}
                    </p>
                  </div>
                )}

                {/* Dynamic Committee & Department Selection Based on Role */}
                {!['Coordinator', 'Deputy Coordinator', 'Central', 'HRM'].includes(regRole) && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Primary Committee Selection (Shown for Leader, Vice, Head, and Member) */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {language === 'ar' ? 'اختيار اللجنة الرئيسية' : 'Primary Committee'}
                        </label>
                        <div className="relative">
                          <Briefcase className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <select
                            value={regCommittee}
                            onChange={(e) => handleCommitteeChange(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ps-10 pe-4 py-3 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-eye-brand focus:ring-1 focus:ring-eye-brand font-bold"
                          >
                            {Object.keys(COMMITTEE_STRUCTURE).map(comm => (
                              <option key={comm} value={comm}>{translateCommittee(comm)}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Sub-Department Selection (Shown for Leader, Member, Head, and Vice) */}
                      {['Member', 'Leader', 'Head', 'Vice'].includes(regRole) && (
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {language === 'ar' ? 'اختيار القسم / الفرع' : 'Department / Branch'}
                          </label>
                          <div className="relative">
                            <Briefcase className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select
                              value={regDepartment.startsWith('HRM') ? 'HRM' : regDepartment}
                              onChange={(e) => {
                                const selected = e.target.value;
                                if (selected === 'HRM') {
                                  setRegDepartment('HRM - HR OF PR');
                                } else {
                                  setRegDepartment(selected);
                                }
                              }}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ps-10 pe-4 py-3 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-eye-brand focus:ring-1 focus:ring-eye-brand font-bold"
                            >
                              {(COMMITTEE_STRUCTURE[regCommittee] || []).map(dept => (
                                <option key={dept} value={dept}>{translateDepartment(dept)}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Secondary HRM Sub-Branch Dropdown (Shown when HR committee and HRM department are selected) */}
                    {regCommittee === 'HR' && (regDepartment === 'HRM' || regDepartment.startsWith('HRM')) && (
                      <div className="space-y-1.5 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 animate-fade-in">
                        <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                          {language === 'ar' ? 'تحديد تخصص فرع الموارد البشرية (قسم فرعي لـ HRM) *' : 'HRM Sub-Branch *'}
                        </label>
                        <div className="relative">
                          <Briefcase className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                          <select
                            value={regDepartment}
                            onChange={(e) => setRegDepartment(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl ps-10 pe-4 py-3 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-bold"
                          >
                            {HRM_DEPARTMENTS.map((dept) => (
                              <option key={dept.department} value={dept.department}>
                                {dept.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Governorate Selection — مطلوب لجميع المتسجلين */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-governorate" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {language === 'ar' ? 'المحافظة' : 'Governorate'}
                    <span className="text-red-500 ms-1">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      id="reg-governorate"
                      required
                      value={regGovernorate}
                      onChange={(e) => setRegGovernorate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ps-10 pe-4 py-3 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-eye-brand focus:ring-1 focus:ring-eye-brand font-semibold appearance-none"
                    >
                      <option value="">{language === 'ar' ? '— اختر محافظتك —' : '— Select your governorate —'}</option>
                      {EGYPT_GOVERNORATES.map((gov) => (
                        <option key={gov} value={gov}>{gov}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {language === 'ar' ? 'كلمة المرور' : 'Password'}
                    </label>
                    <div className="relative">
                      <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="password" required value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value.replace(/\s+/g, ''))}
                        onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ps-10 pe-4 py-3 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-eye-brand focus:ring-1 focus:ring-eye-brand font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                    </label>
                    <div className="relative">
                      <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="password" required value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value.replace(/\s+/g, ''))}
                        onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ps-10 pe-4 py-3 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-eye-brand focus:ring-1 focus:ring-eye-brand font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-eye-brand hover:bg-eye-brand-dark text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all text-xs sm:text-sm flex items-center justify-center gap-2"
                  id="register-submit-btn"
                >
                  <span>{language === 'ar' ? 'طلب الانضمام لعائلة EYE' : 'Apply as Member'}</span>
                  {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            )}

            {/* ── FORGOT MODE ── */}
            {mode === 'forgot' && (
              <form className="space-y-5" onSubmit={handleForgotPassword} id="auth-forgot-form">
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  {language === 'ar'
                    ? 'أدخل بريدك الإلكتروني المسجل وسنقوم بإصدار رابط محاكاة فوري لإعادة تعيين كلمة مرورك بأمان.'
                    : 'Enter your registered email address and we will generate a simulated reset link.'}
                </p>
                <div className="space-y-1.5">
                  <label htmlFor="forgot-email" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="forgot-email" type="email" required value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="amr@example.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl ps-10 pe-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-eye-brand focus:ring-1 focus:ring-eye-brand font-semibold"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-eye-brand hover:bg-eye-brand-dark text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow-md transition-all"
                  id="forgot-submit-btn"
                >
                  {language === 'ar' ? 'إرسال رابط استعادة كلمة المرور' : 'Send Recovery Link'}
                </button>
              </form>
            )}

            {/* ── RESET PASSWORD MODE ── */}
            {mode === 'reset-password' && (
              <form className="space-y-5" onSubmit={handleResetPassword} id="auth-reset-form">
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  {language === 'ar'
                    ? 'أدخل كلمة المرور الجديدة لحسابك وقم بتأكيدها للتمكن من تسجيل الدخول.'
                    : 'Enter your new password below to update your credentials.'}
                </p>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value.replace(/\s+/g, ''))}
                      onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ps-10 pe-4 py-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-eye-brand focus:ring-1 focus:ring-eye-brand font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {language === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value.replace(/\s+/g, ''))}
                      onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ps-10 pe-4 py-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-eye-brand focus:ring-1 focus:ring-eye-brand font-semibold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-eye-brand hover:bg-eye-brand-dark text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2"
                  id="reset-password-submit-btn"
                >
                  <span>{language === 'ar' ? 'حفظ كلمة المرور الجديدة' : 'Save New Password'}</span>
                  {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
