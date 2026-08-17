import React, { useState, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import { db } from '../db/localDb';
import { UserProfile, CertificateType, IssuedCertificate, getUserRoleTitle } from '../types';
import { Award, Download, User, Star, CheckCircle, Eye, Mail, X, Search } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { downloadCertificate, printCertificate, getCommitteeSignatories, formatArabicConjunctions } from '../lib/certificateGenerator';
import QRCode from 'qrcode';

interface CertificateGeneratorProps { currentUser: UserProfile; }

const CERT_TYPES: { id: CertificateType; labelAr: string; label: string; color: string; icon: string }[] = [
  { id: 'appreciation', labelAr: 'شهادة تقدير وعرفان', label: 'Certificate of Appreciation', color: 'from-amber-400 to-orange-500', icon: '🌟' },
  { id: 'excellence', labelAr: 'شهادة تميز وإتقان', label: 'Certificate of Excellence', color: 'from-purple-500 to-indigo-600', icon: '🏆' },
  { id: 'training', labelAr: 'شهادة إتمام تدريب', label: 'Certificate of Training Completion', color: 'from-blue-500 to-cyan-500', icon: '📚' },
  { id: 'leadership', labelAr: 'شهادة القيادة المتميزة', label: 'Leadership Excellence Certificate', color: 'from-emerald-500 to-teal-600', icon: '👑' },
  { id: 'custom', labelAr: 'شهادة مخصصة', label: 'Custom Certificate', color: 'from-rose-400 to-pink-500', icon: '✨' },
];

export const CERT_STYLES = [
  { id: 'style1' as const, labelAr: 'القالب الأصلي المعتمد 👑', label: 'Original Approved Template', descAr: 'الإطار الأزرق الملكي المعتمد لجميع شهادات الكيان', icon: '👑', color: 'from-blue-600 to-indigo-700' },
];

const CertPreview: React.FC<{ cert: IssuedCertificate; onPrint: () => void; transparentLogo: string }> = ({ cert, onPrint, transparentLogo }) => {
  const isEn = cert.lang === 'en';
  const date = new Date(cert.issuedAt).toLocaleDateString(isEn ? 'en-US' : 'ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  const certDef = CERT_TYPES.find(c => c.id === cert.certType);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const certId = cert.id;

  useEffect(() => {
    if (certId === 'preview-0000') return; // Skip QR for draft previews
    const verifyUrl = `${window.location.origin}?verify=${certId}`;
    QRCode.toDataURL(verifyUrl, {
      width: 80,
      margin: 1,
      color: { dark: '#1b4cd3', light: '#f0f5ff' },
      errorCorrectionLevel: 'M',
    }).then(setQrDataUrl).catch(() => { });
  }, [certId]);

  // جلب توقيعات المحافظة ديناميكياً من قاعدة البيانات
  const certGovernorate = cert.governorate ||
    (() => { try { return localStorage.getItem('eye_current_governorate') || 'الغربية'; } catch { return 'الغربية'; } })();
  const govSigs = db.getGovernorateSignatories(certGovernorate, isEn ? 'en' : 'ar');

  // 1. رئيس الكيان / Entity President
  // 2. رئيس المحافظة / Governorate Head
  const headDisplayName = isEn ? 'Mahmoud Rabie' : (govSigs.headName || 'محمود ربيع');
  const headDisplayTitle = isEn ? 'GOVERNORATE HEAD' : 'رئيس الغربية';
  // 3. مسئول لجنة الموارد البشرية / HR Committee Head
  const viceDisplayName = isEn ? 'Ahmed Ibrahim' : 'أحمد إبراهيم';
  const viceDisplayTitle = isEn ? 'HR COMMITTEE HEAD' : 'مسئول لجنة الموارد البشرية';

  const sigs = getCommitteeSignatories('HR', isEn ? 'en' : 'ar');
  const roleDisplay = isEn
    ? (cert.recipientRole === 'Super Admin' ? 'HR Committee Manager'
      : cert.recipientRole === 'Vice' ? 'Vice President'
      : cert.recipientRole === 'Head' ? 'Governorate Head'
      : cert.recipientRole === 'Coordinator' ? 'Governorate Coordinator'
      : cert.recipientRole === 'Deputy Coordinator' ? 'Deputy Coordinator'
      : cert.recipientRole === 'Central' ? 'Central Official'
      : cert.recipientRole === 'Leader' ? 'Team Leader'
      : cert.recipientRole === 'HRM' ? 'HR Manager'
      : 'Distinguished Member')
    : cert.recipientRole;
  const commDisplay = isEn ? (cert.committee?.includes('OR') ? 'Organization & Relations Committee' : cert.committee?.includes('SM') ? 'Social Media Committee' : 'Human Resources Committee') : cert.committee;

  // ════════════════════════════════════════════════════════════════
  // ORIGINAL APPROVED CERTIFICATE LAYOUT (STYLE 1 ONLY)
  // ════════════════════════════════════════════════════════════════
  const theme1 = {
    background: 'linear-gradient(135deg, #f0f5ff 0%, #e8f0fe 50%, #dce8ff 100%)',
    border: '4px double #1b4cd3',
    innerBorder: '1px solid rgba(43, 102, 255, 0.2)',
    textColor: '#0f172a',
    titleColor: '#1b4cd3',
    accentColor: '#2b66ff',
    badgeBg: 'rgba(43, 102, 255, 0.08)',
    badgeBorder: 'rgba(43, 102, 255, 0.3)',
    nameColor: '#0c1e4d',
    bodyColor: '#334155',
    cornerColor: '#1b4cd3',
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-2xl border border-blue-300 dark:border-blue-800 shadow-2xl max-w-3xl mx-auto">
      <div
        className="cert-print-area text-center relative overflow-hidden p-5 sm:p-8 rounded-lg"
        style={{
          fontFamily: isEn ? 'Georgia, serif' : 'Georgia, serif',
          direction: isEn ? 'ltr' : 'rtl',
          background: theme1.background,
          border: theme1.border,
          boxShadow: '0 10px 30px -5px rgba(27, 76, 211, 0.2)',
          color: theme1.textColor,
        }}
      >

        {/* Inner Decorative Accent Frame Line */}
        <div className="absolute inset-3 border rounded-md pointer-events-none" style={{ border: theme1.innerBorder }} />

        {/* L-shaped Corner Brackets */}
        <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 pointer-events-none" style={{ borderColor: theme1.cornerColor }} />
        <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 pointer-events-none" style={{ borderColor: theme1.cornerColor }} />
        <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 pointer-events-none" style={{ borderColor: theme1.cornerColor }} />
        <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 pointer-events-none" style={{ borderColor: theme1.cornerColor }} />

        {/* Blue ink seal stamp — logo cropped to circular badge only */}
        <div className={`absolute bottom-6 ${isEn ? 'right-6' : 'right-6'} w-24 h-24 rounded-full border-2 border-double flex items-center justify-center -rotate-12 select-none pointer-events-none overflow-hidden`}
          style={{ borderColor: theme1.accentColor, background: 'transparent' }}>
          <img
            src={transparentLogo}
            className="w-14 h-14"
            style={{
              objectFit: 'cover',
              objectPosition: 'center top',
              filter: 'brightness(0.9) sepia(1) saturate(6) hue-rotate(195deg)',
            }}
            alt="seal"
          />
        </div>

        {/* QR Code — scan to verify certificate authenticity */}
        {qrDataUrl && (
          <div className={`absolute bottom-5 ${isEn ? 'left-5' : 'left-5'} flex flex-col items-center select-none pointer-events-none`} style={{ zIndex: 10 }}>
            <div className="p-1 rounded-lg bg-white shadow-xs">
              <img src={qrDataUrl} alt="verify" className="w-12 h-12 rounded-xs" />
            </div>
            <p className="text-[7px] font-bold mt-0.5" style={{ color: theme1.accentColor, letterSpacing: '0.05em' }}>{isEn ? 'VERIFY' : 'تحقق'}</p>
          </div>
        )}

        {/* Top-Left Hanging Royal Blue Ribbon with EYE Rosette Seal Medal Badge */}
        <div className="absolute top-0 left-5 sm:left-8 z-30 flex flex-col items-center pointer-events-none select-none">
          {/* Hanging Ribbon Tail */}
          <div className="w-11 sm:w-15 h-26 sm:h-34 bg-gradient-to-b from-blue-950 via-blue-800 to-blue-900 shadow-2xl relative flex flex-col items-center justify-end pb-3 rounded-b-sm border-x border-blue-400/40">
            <div className="w-0.5 h-full bg-blue-300/30" />
            {/* Ribbon V-notch at bottom */}
            <div className="absolute -bottom-3.5 left-0 right-0 h-4 bg-gradient-to-b from-blue-900 to-blue-950" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
          </div>
          {/* Circular EYE Rosette Seal Medal with Bright White Container & Transparent Cutout Logo */}
          <div className="absolute top-8 sm:top-12 w-16 h-16 sm:w-22 sm:h-22 rounded-full bg-gradient-to-br from-blue-500 via-blue-700 to-blue-950 p-1 sm:p-1.5 shadow-2xl flex items-center justify-center border-2 border-amber-300">
            <div className="w-full h-full rounded-full border-2 border-amber-400 bg-white flex items-center justify-center p-1 shadow-md">
              <img
                src={transparentLogo}
                className="w-13 h-13 sm:w-19 sm:h-19 object-contain filter brightness-105 contrast-125 drop-shadow-xs"
                alt="EYE Rosette Seal"
              />
            </div>
          </div>
        </div>

        {/* Large, elegant official EYE LOGO background watermark image */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0" aria-hidden>
          <img
            src={transparentLogo}
            alt="EYE Background Watermark Logo"
            className="w-[340px] h-[340px] sm:w-[440px] sm:h-[440px] object-contain opacity-[0.08] filter brightness-110 contrast-125"
          />
        </div>

        {/* TOP HEADER METADATA — Pinned explicitly to Top-Right to prevent any ribbon collision in both Arabic & English */}
        <div className="absolute top-4 right-5 sm:right-8 z-20 text-end space-y-0.5 pointer-events-none" dir="ltr">
          <p className="text-[10.5px] font-black" style={{ color: theme1.titleColor }}>
            {isEn ? '• Official Certified Document •' : '• وثيقة رسمية معتمدة •'}
          </p>
          <p className="text-[9.5px] font-bold text-slate-700 dark:text-slate-200">Egyptian Youth Entity — EYE</p>
          <div className="flex items-center justify-end gap-2.5 text-[9px] font-bold text-slate-500 pt-0.5">
            <span>{isEn ? `Date: ${date}` : `تاريخ الإصدار: ${date}`}</span>
            <span>•</span>
            <span className="font-mono">ID: EYE-CERT-{cert.id.slice(-8, -4).toUpperCase()}{cert.id.slice(-4).toUpperCase()}</span>
          </div>
        </div>

        {/* Title & Top Section Container with Safe Top Clearance below Ribbon */}
        <div className="pt-14 sm:pt-18 relative z-10">
          {/* Top divider with center diamond */}
          <div className="relative my-3">
            <div className="h-px" style={{ background: `linear-gradient(to right, transparent 0%, ${theme1.accentColor} 50%, transparent 100%)` }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45" style={{ background: theme1.accentColor }} />
          </div>

          {/* Title */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black mb-1" style={{ color: theme1.titleColor }}>{cert.title}</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3 opacity-80">{certDef?.label}</p>
          </div>
        </div>

        {/* MIDDLE: كيان المصريون الشباب EYE */}
        <div className="relative z-10 my-4">
          <p className="text-[10px] font-bold mb-1" style={{ color: theme1.accentColor }}>{isEn ? '— ISSUED BY —' : '— يصدرها —'}</p>

          {/* Circular logo & name */}
          <div className={`flex items-center justify-center gap-3 ${isEn ? 'dir-ltr' : 'dir-rtl'}`}>
            <img
              src={transparentLogo}
              className="w-10 h-10 object-contain shrink-0"
              alt="EYE Logo"
            />
            <p className="text-2xl font-black flex items-center gap-2" style={{ color: theme1.textColor }}>
              <span>{isEn ? 'Egyptian Youth Entity' : 'كيان المصريون الشباب'}</span>
              <span style={{ color: theme1.accentColor }}>EYE</span>
            </p>
          </div>

          <p className="text-[10px] italic mt-0.5 text-center font-semibold opacity-75">Egyptian Youth Entity — EYE</p>

          {/* Underline with diamond */}
          <div className="relative w-64 h-px mx-auto mt-2" style={{ background: `linear-gradient(to right, transparent 0%, ${theme1.accentColor} 50%, transparent 100%)` }}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rotate-45" style={{ background: theme1.accentColor }} />
          </div>
        </div>

        {/* RECIPIENT */}
        <div className="relative z-10 my-3">
          <p className="text-xs sm:text-sm font-black mb-1" style={{ color: theme1.titleColor }}>
            {isEn ? 'The Egyptian Youth Entity EYE is honored to present this certificate to' : 'يتشرف كيان المصريون الشباب EYE بتكريم العضو المتميز'}
          </p>

          {/* Name with Ornate Wing Flourishes */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 my-2 dir-ltr">
            <div className="flex items-center gap-1 shrink-0" style={{ color: theme1.accentColor }}>
              <span className="text-xs">✦</span>
              <div className="w-8 sm:w-16 h-0.5 rounded-full" style={{ background: `linear-gradient(to left, ${theme1.accentColor}, transparent)` }} />
              <span className="text-xs">❖</span>
            </div>

            {/* Recipient Member Name */}
            <p className="text-2xl sm:text-3.5xl font-black tracking-tight px-1.5 drop-shadow-xs" style={{ color: theme1.nameColor }}>
              {cert.recipientName}
            </p>

            <div className="flex items-center gap-1 shrink-0" style={{ color: theme1.accentColor }}>
              <span className="text-xs">❖</span>
              <div className="w-8 sm:w-16 h-0.5 rounded-full" style={{ background: `linear-gradient(to right, ${theme1.accentColor}, transparent)` }} />
              <span className="text-xs">✦</span>
            </div>
          </div>

          {/* Position & Committee Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full font-black text-xs sm:text-sm shadow-2xs mt-0.5"
            style={{ background: theme1.badgeBg, border: `1px solid ${theme1.badgeBorder}`, color: theme1.titleColor }}>
            <span style={{ color: theme1.textColor }}>{roleDisplay}</span>
            <span style={{ color: theme1.accentColor }} className="font-serif">✦</span>
            <span style={{ color: theme1.titleColor }}>{commDisplay}</span>
          </div>
        </div>

        {/* Body */}
        <div className="relative z-10 my-3">
          <p className="text-[12px] leading-6 px-4 font-semibold" style={{ color: theme1.bodyColor }}>{isEn ? cert.body : formatArabicConjunctions(cert.body)}</p>
        </div>

        {/* Grade Rating Stars */}
        {cert.grade !== undefined && cert.grade !== null && (
          <div className="relative z-10 my-4">
            <div className="flex items-center justify-between px-8">
              <div className="text-sm font-black tracking-widest" style={{ color: theme1.accentColor }}>★ ★ ★ ★</div>
              <div className="flex flex-col items-center justify-center">
                <div className="flex gap-0.5 mb-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className="w-3 h-3"
                      style={{
                        fill: cert.grade! >= s * 20 ? theme1.accentColor : 'none',
                        color: theme1.accentColor,
                      }}
                    />
                  ))}
                </div>
                <div className="w-12 h-12 rounded-full border-2 border-double flex items-center justify-center bg-white shadow-xs"
                  style={{ borderColor: theme1.accentColor }}>
                  <span className="text-sm font-black" style={{ color: theme1.titleColor }}>
                    {cert.grade}
                  </span>
                </div>
                <p className="text-[9px] font-bold mt-0.5 opacity-75">{isEn ? 'Performance Rating' : 'تقييم الأداء'}</p>
              </div>
              <div className="text-sm font-black tracking-widest" style={{ color: theme1.accentColor }}>★ ★ ★ ★</div>
            </div>
          </div>
        )}

        {/* Date and Clean Official 3 Signatures Grid Container */}
        <div className="relative z-10 pt-3 mt-3" style={{ borderTop: `1px solid ${theme1.badgeBorder}` }}>
          <div className="flex justify-between items-center mb-2 px-2">
            <div className="flex items-center gap-1.5 text-[9px] font-bold" style={{ color: theme1.titleColor }}>
              <span>{isEn ? 'Accreditation Date:' : 'تاريخ الاعتماد:'}</span>
              <span className="font-mono text-[10px] font-black">{date}</span>
            </div>
            <div className="text-[8px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full"
              style={{ color: theme1.titleColor, background: theme1.badgeBg, border: `1px solid ${theme1.badgeBorder}` }}>
              {isEn ? '• Official Accreditation & Signatures •' : '• الاعتماد والتوقيعات الرسمية •'}
            </div>
          </div>

          {/* 3 Official Signatories Grid Container */}
          <div className="w-full overflow-x-auto pb-1 scrollbar-none">
            <div className="grid grid-cols-3 gap-2 sm:gap-6 items-end text-center px-1 min-w-[340px]">
              {isEn ? (
                <>
                  {/* 1. Entity President */}
                  <div className="flex flex-col items-center justify-end relative text-center">
                    <div className="min-h-[20px] flex items-center justify-center mb-0.5">
                      <span className="px-1.5 py-0.5 rounded-md text-[7px] sm:text-[9px] font-black uppercase tracking-tight shadow-2xs whitespace-nowrap"
                        style={{ background: theme1.badgeBg, color: theme1.titleColor, border: `1px solid ${theme1.badgeBorder}` }}>
                        Entity President
                      </span>
                    </div>
                    <div className="min-h-[28px] flex flex-col items-center justify-center my-0.5 leading-none text-center">
                      <span className="text-[14px] sm:text-[16px] select-none font-bold block" style={{ fontFamily: "'Great Vibes', 'Dancing Script', 'Segoe Script', cursive" }}>Mohamed Metwally</span>
                    </div>
                    <div className="w-10 sm:w-16 h-px my-1" style={{ background: theme1.accentColor }} />
                    <div className="text-[8px] sm:text-[10px] font-black leading-tight text-center">
                      <span className="block">Mr. Mohamed Metwally</span>
                    </div>
                  </div>

                  {/* 2. Governorate Head */}
                  <div className="flex flex-col items-center justify-end relative text-center">
                    <div className="min-h-[20px] flex items-center justify-center mb-0.5">
                      <span className="px-1.5 py-0.5 rounded-md text-[7px] sm:text-[9px] font-black uppercase tracking-tight shadow-2xs whitespace-nowrap"
                        style={{ background: theme1.badgeBg, color: theme1.titleColor, border: `1px solid ${theme1.badgeBorder}` }}>
                        GOVERNORATE HEAD
                      </span>
                    </div>
                    <div className="min-h-[28px] flex flex-col items-center justify-center my-0.5 leading-none text-center">
                      <span className="text-[14px] sm:text-[16px] select-none font-bold block" style={{ fontFamily: "'Great Vibes', 'Dancing Script', 'Segoe Script', cursive" }}>Mahmoud Rabie</span>
                    </div>
                    <div className="w-10 sm:w-16 h-px my-1" style={{ background: theme1.accentColor }} />
                    <div className="text-[8px] sm:text-[10px] font-black leading-tight text-center">
                      <span className="block">Mr. Mahmoud Rabie</span>
                    </div>
                  </div>

                  {/* 3. HR Committee Head */}
                  <div className="flex flex-col items-center justify-end relative text-center">
                    <div className="min-h-[20px] flex items-center justify-center mb-0.5">
                      <span className="px-1.5 py-0.5 rounded-md text-[7px] sm:text-[9px] font-black uppercase tracking-tight shadow-2xs whitespace-nowrap"
                        style={{ background: theme1.badgeBg, color: theme1.titleColor, border: `1px solid ${theme1.badgeBorder}` }}>
                        HR COMMITTEE HEAD
                      </span>
                    </div>
                    <div className="min-h-[28px] flex flex-col items-center justify-center my-0.5 leading-none text-center">
                      <span className="text-[14px] sm:text-[16px] select-none font-bold block" style={{ fontFamily: "'Great Vibes', 'Dancing Script', 'Segoe Script', cursive" }}>Ahmed Ibrahim</span>
                    </div>
                    <div className="w-10 sm:w-16 h-px my-1" style={{ background: theme1.accentColor }} />
                    <div className="text-[8px] sm:text-[10px] font-black leading-tight text-center">
                      <span className="block">Mr. Ahmed Ibrahim</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* 1. رئيس الكيان — توقيع ثابت دائماً */}
                  <div className="flex flex-col items-center justify-end relative text-center">
                    <div className="min-h-[20px] flex items-center justify-center mb-0.5">
                      <span className="px-1.5 py-0.5 rounded-md text-[8px] sm:text-[10px] font-black shadow-2xs whitespace-nowrap"
                        style={{ background: theme1.badgeBg, color: theme1.titleColor, border: `1px solid ${theme1.badgeBorder}` }}>
                        رئيس الكيان
                      </span>
                    </div>
                    <div className="min-h-[28px] flex flex-col items-center justify-center my-0.5 leading-none text-center">
                      <span className="text-[13px] sm:text-[15px] select-none font-black block" style={{ fontFamily: "'Aldhabi', 'Aref Ruqaa', 'Amiri', serif" }}>محمد متولي</span>
                    </div>
                    <div className="w-10 sm:w-16 h-px my-1" style={{ background: theme1.accentColor }} />
                    <div className="text-[8px] sm:text-[10px] font-black leading-tight text-center">
                      <span className="block">أ. محمد متولي</span>
                    </div>
                  </div>

                  {/* 2. رئيس الغربية */}
                  <div className="flex flex-col items-center justify-end relative text-center">
                    <div className="min-h-[20px] flex items-center justify-center mb-0.5">
                      <span className="px-1.5 py-0.5 rounded-md text-[8px] sm:text-[10px] font-black shadow-2xs whitespace-nowrap"
                        style={{ background: theme1.badgeBg, color: theme1.titleColor, border: `1px solid ${theme1.badgeBorder}` }}>
                        رئيس الغربية
                      </span>
                    </div>
                    <div className="min-h-[28px] flex flex-col items-center justify-center my-0.5 leading-none text-center">
                      <span className="text-[13px] sm:text-[15px] select-none font-black block" style={{ fontFamily: "'Aldhabi', 'Aref Ruqaa', 'Amiri', serif" }}>محمود ربيع</span>
                    </div>
                    <div className="w-10 sm:w-16 h-px my-1" style={{ background: theme1.accentColor }} />
                    <div className="text-[8px] sm:text-[10px] font-black leading-tight text-center">
                      <span className="block">أ. محمود ربيع</span>
                    </div>
                  </div>

                  {/* 3. مسؤول لجنة الموارد البشرية */}
                  <div className="flex flex-col items-center justify-end relative text-center">
                    <div className="min-h-[20px] flex items-center justify-center mb-0.5">
                      <span className="px-1.5 py-0.5 rounded-md text-[8px] sm:text-[10px] font-black shadow-2xs whitespace-nowrap"
                        style={{ background: theme1.badgeBg, color: theme1.titleColor, border: `1px solid ${theme1.badgeBorder}` }}>
                        مسؤول لجنة الموارد البشرية
                      </span>
                    </div>
                    <div className="min-h-[28px] flex flex-col items-center justify-center my-0.5 leading-none text-center">
                      <span className="text-[13px] sm:text-[15px] select-none font-black block" style={{ fontFamily: "'Aldhabi', 'Aref Ruqaa', 'Amiri', serif" }}>أحمد إبراهيم</span>
                    </div>
                    <div className="w-10 sm:w-16 h-px my-1" style={{ background: theme1.accentColor }} />
                    <div className="text-[8px] sm:text-[10px] font-black leading-tight text-center">
                      <span className="block">أ. أحمد إبراهيم</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onPrint}
          className="mt-5 flex items-center gap-1.5 text-xs font-bold rounded-xl px-4 py-2 mx-auto transition-all cursor-pointer"
          style={{
            color: '#ffffff',
            background: 'linear-gradient(135deg, #2b66ff 0%, #1b4cd3 100%)',
            border: '1px solid #1b4cd3',
          }}
          id="cert-download-btn"
        >
          <Download className="w-3.5 h-3.5" />
          {isEn ? 'Download / Print Certificate' : 'تحميل / طباعة الشهادة'}
        </button>
      </div>
    </div>
  );
};

export const CertificateGenerator: React.FC<CertificateGeneratorProps> = ({ currentUser }) => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const canIssue = ['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator', 'Leader', 'HRM'].includes(currentUser.role);
  const canApprove = ['Super Admin', 'Vice', 'HRM'].includes(currentUser.role);
  const [tab, setTab] = useState<'issue' | 'my' | 'all' | 'pending'>(canIssue ? 'issue' : 'my');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [certType, setCertType] = useState<CertificateType>('appreciation');
  const [selectedStyle, setSelectedStyle] = useState<'style1' | 'style2' | 'style3' | 'style4' | 'style5'>('style1');
  const [certLang, setCertLang] = useState<'ar' | 'en'>('ar');
  const [customTitle, setCustomTitle] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [certGrade, setCertGrade] = useState<string>('');
  const [issueSuccess, setIssueSuccess] = useState<IssuedCertificate | null>(null);
  const [previewCert, setPreviewCert] = useState<IssuedCertificate | null>(null);
  const [livePreview, setLivePreview] = useState<IssuedCertificate | null>(null);
  const [fullScreenModalCert, setFullScreenModalCert] = useState<IssuedCertificate | null>(null);
  const [issuedSearchQuery, setIssuedSearchQuery] = useState('');
  const [error, setError] = useState('');

  const toCertGeneratorData = (cert: IssuedCertificate) => ({
    memberName: cert.recipientName,
    recipientRole: cert.recipientRole,
    certTitle: cert.title,
    certType: cert.certType,
    body: cert.body || '',
    grade: cert.grade ?? undefined,
    reviewerName: cert.issuedByName,
    issuedByTitle: cert.issuedByTitle,
    committee: cert.committee || '',
    date: new Date(cert.issuedAt).toLocaleDateString(cert.lang === 'en' ? 'en-US' : 'ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
    lang: cert.lang || 'ar',
  });

  const downloadLiveElement = async (certId: string, recipientName: string, title: string) => {
    const el = document.getElementById(`certificate-preview-card-${certId}`);
    if (!el) return false;
    try {
      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `EYE_Certificate_${(recipientName || 'Member').replace(/\s+/g, '_')}_${(title || 'Certificate').replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
      return true;
    } catch (err) {
      console.warn('[Download Live Element Error]', err);
      return false;
    }
  };

  const printLiveElement = async (certId: string) => {
    const el = document.getElementById(`certificate-preview-card-${certId}`);
    if (!el) return false;
    try {
      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const printWindow = window.open('', '_blank');
      if (!printWindow) return false;
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>EYE Certificate Print</title>
            <style>
              @page { size: landscape; margin: 0; }
              body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; background: #fff; height: 100vh; }
              img { max-width: 98vw; max-height: 98vh; object-fit: contain; }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            <img src="${dataUrl}" />
          </body>
        </html>
      `);
      printWindow.document.close();
      return true;
    } catch (err) {
      console.warn('[Print Live Element Error]', err);
      return false;
    }
  };

  const handlePrint = async (cert: IssuedCertificate) => {
    if (cert.status === 'pending' && !canApprove) {
      alert(ar ? '⚠️ هذه الشهادة بانتظار موافقة واقتران الإدارة (مسئول لجنة الموارد البشرية) أولاً. لا يمكن طباعتها قبل الاعتماد الرسمي.' : 'Pending admin approval.');
      return;
    }
    const ok = await printLiveElement(cert.id);
    if (!ok) printCertificate(toCertGeneratorData(cert));
  };

  const handleDownload = async (cert: IssuedCertificate) => {
    if (cert.status === 'pending' && !canApprove) {
      alert(ar ? '⚠️ هذه الشهادة بانتظار موافقة واقتران الإدارة (مسئول لجنة الموارد البشرية) أولاً. لا يمكن تحميلها قبل الاعتماد الرسمي.' : 'Pending admin approval.');
      return;
    }
    const ok = await downloadLiveElement(cert.id, cert.recipientName, cert.title);
    if (!ok) downloadCertificate(toCertGeneratorData(cert));
  };
  const [emailToast, setEmailToast] = useState(false);
  const [transparentLogo, setTransparentLogo] = useState<string>('/eye-logo.png');

  useEffect(() => {
    const img = new Image();
    img.src = '/eye-logo.png';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const minColor = Math.min(r, g, b);
        if (r > 190 && g > 190 && b > 190) {
          data[i + 3] = 0; // 100% pure transparent cutout!
        }
      }
      ctx.putImageData(imgData, 0, 0);
      setTransparentLogo(canvas.toDataURL('image/png'));
    };
  }, []);

  const users = db.getUsers(currentUser).filter(u => u.id !== currentUser.id);
  const myCerts = db.getMyCertificates(currentUser.id);
  const selectedDef = CERT_TYPES.find(c => c.id === certType)!;
  const [memberSearch, setMemberSearch] = useState('');

  const buildDefaultBody = (recipientId: string, type: CertificateType, lang: 'ar' | 'en' = 'ar') => {
    const r = users.find(u => u.id === recipientId);
    const name = r?.fullName || '';
    if (lang === 'en') {
      if (type === 'appreciation') return `The Egyptian Youth Entity (EYE) presents this certificate in recognition and appreciation of member ${name} for outstanding efforts and sincere dedication in serving the team and achieving the entity's goals.`;
      if (type === 'excellence') return `The Egyptian Youth Entity (EYE) certifies that ${name} has demonstrated exceptional performance and high level of excellence, reflecting true competence and high volunteer spirit deserving of appreciation.`;
      if (type === 'training') return `This is to certify that ${name} has successfully completed the specified training program within the EYE entity and passed all required standards with efficiency.`;
      if (type === 'leadership') return `The Egyptian Youth Entity (EYE) honors ${name} for distinguished leadership, management, and inspiring team members, contributing to elevated performance and honorable results.`;
      return '';
    }
    if (type === 'appreciation') return `يشهد كيان المصريون الشباب EYE بأن العضو ${name} قد بذل جهوداً متميزة وعطاءً صادقاً في خدمة فريق العمل وتحقيق أهداف الكيان، وتكريماً لجهوده وتفانيه يُمنح هذه الشهادة.`;
    if (type === 'excellence') return `يشهد كيان المصريون الشباب EYE بأن العضو ${name} قد أثبت تميزاً استثنائياً وأداءً رفيعاً يعبّر عن كفاءة عالية وروح تطوعية متميزة تستحق التقدير والإشادة.`;
    if (type === 'training') return `يشهد كيان المصريون الشباب EYE بأن العضو ${name} قد أتمّ بنجاح متطلبات البرنامج التدريبي واجتاز كافة معاييره المطلوبة بكفاءة واقتدار.`;
    if (type === 'leadership') return `يشهد كيان المصريون الشباب EYE ويُكرّم العضو ${name} تقديراً لقيادته المتميزة وحسن إدارته وإلهامه لأعضاء فريقه، مما أسهم في رفع مستوى الأداء وتحقيق نتائج مشرّفة.`;
    return `يشهد كيان المصريون الشباب EYE بتميز واستحقاق العضو ${name}.`;
  };

  // Build live preview cert object whenever form fields change
  useEffect(() => {
    if (!selectedRecipient) { setLivePreview(null); return; }
    const recipient = users.find(u => u.id === selectedRecipient);
    if (!recipient) return;
    const isEnCert = certLang === 'en';
    const title = certType === 'custom' ? (customTitle || (isEnCert ? 'Custom Certificate' : 'شهادة مخصصة')) : (isEnCert ? selectedDef.label : selectedDef.labelAr);
    const body = customBody || buildDefaultBody(selectedRecipient, certType, certLang);
    const preview: IssuedCertificate = {
      id: 'preview-0000',
      recipientId: recipient.id,
      recipientName: recipient.fullName,
      recipientRole: recipient.role,
      certType,
      designStyle: selectedStyle,
      title,
      body,
      committee: recipient.committee,
      issuedBy: currentUser.id,
      issuedByName: currentUser.fullName,
      issuedByTitle: getUserRoleTitle(currentUser, certLang),
      issuedAt: new Date().toISOString(),
      grade: certGrade ? parseInt(certGrade) : undefined,
      lang: certLang,
    };
    setLivePreview(preview);
  }, [selectedRecipient, certType, selectedStyle, certLang, customTitle, customBody, certGrade]);

  // Bulk issue state
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [bulkCountSuccess, setBulkCountSuccess] = useState<number | null>(null);

  const handleToggleSelectMember = (id: string) => {
    setSelectedRecipients(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = (filteredMembers: UserProfile[]) => {
    const allIds = filteredMembers.map(u => u.id);
    const isAllSelected = allIds.every(id => selectedRecipients.includes(id));
    if (isAllSelected) {
      setSelectedRecipients(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      const combined = Array.from(new Set([...selectedRecipients, ...allIds]));
      setSelectedRecipients(combined);
    }
  };

  const handleIssue = async () => {
    setError('');
    setIssueSuccess(null);

    // Bulk Mode Issue
    if (isBulkMode) {
      if (selectedRecipients.length === 0) {
        setError(ar ? 'يرجى تحديد عضو واحد على الأقل لإصدار الشهادات.' : 'Please select at least one recipient.');
        return;
      }
      const isEnCert = certLang === 'en';
      const title = certType === 'custom' ? customTitle : (isEnCert ? selectedDef.label : selectedDef.labelAr);
      if (certType === 'custom' && !customTitle) {
        setError(ar ? 'يرجى كتابة عنوان الشهادة.' : 'Please enter a certificate title.');
        return;
      }

      try {
        let count = 0;
        for (const recipientId of selectedRecipients) {
          const recipient = users.find(u => u.id === recipientId);
          if (!recipient) continue;
          const body = customBody || buildDefaultBody(recipientId, certType, certLang);
          await db.issueCertificate(
            recipient.id,
            recipient.fullName,
            recipient.role,
            certType,
            title,
            body,
            currentUser,
            recipient.committee,
            certGrade ? parseInt(certGrade) : undefined,
            certLang
          );
          count++;
        }
        setBulkCountSuccess(count);
        setSelectedRecipients([]);
        setCustomBody('');
        setCustomTitle('');
        setCertGrade('');
        setTimeout(() => setBulkCountSuccess(null), 5000);
      } catch (err: any) {
        console.error(err);
        setError(ar ? `فشل الإصدار الجماعي: ${err.message}` : `Bulk issue failed: ${err.message}`);
      }
      return;
    }

    // Single Recipient Issue
    if (!selectedRecipient) { setError(ar ? 'يرجى اختيار العضو.' : 'Please select a recipient.'); return; }
    const isEnCert = certLang === 'en';
    const title = certType === 'custom' ? customTitle : (isEnCert ? selectedDef.label : selectedDef.labelAr);
    const body = customBody || buildDefaultBody(selectedRecipient, certType, certLang);
    if (certType === 'custom' && !customTitle) { setError(ar ? 'يرجى كتابة عنوان الشهادة.' : 'Please enter a certificate title.'); return; }
    const recipient = users.find(u => u.id === selectedRecipient)!;
    try {
      const cert = await db.issueCertificate(recipient.id, recipient.fullName, recipient.role, certType, title, body, currentUser, recipient.committee, certGrade ? parseInt(certGrade) : undefined, certLang);
      setIssueSuccess(cert);
      setPreviewCert(cert);
      setLivePreview(null);
      setSelectedRecipient('');
      setCustomBody('');
      setCustomTitle('');
      setCertGrade('');
      if (recipient.email) {
        setEmailToast(true);
        setTimeout(() => setEmailToast(false), 4000);
      }
    } catch (err: any) {
      console.error(err);
      setError(ar ? `فشل إصدار الشهادة وحفظها في قاعدة البيانات: ${err.message}` : `Failed to issue certificate and save to database: ${err.message}`);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 relative" dir={ar ? 'rtl' : 'ltr'}>

      {/* Email Toast */}
      {emailToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl animate-bounce"
          style={{ background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', minWidth: 260 }}>
          <Mail className="w-4 h-4 shrink-0" />
          {ar ? '📧 تم إرسال الشهادة بالبريد الإلكتروني للعضو!' : '📧 Certificate emailed to the member!'}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl shadow-lg" style={{ background: 'linear-gradient(135deg, #2b66ff, #1b4cd3)', boxShadow: '0 8px 20px rgba(43,102,255,0.3)' }}>
          <Award className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white">{ar ? 'منشئ الشهادات' : 'Certificate Generator'}</h1>
          <p className="text-xs text-slate-500">{ar ? 'إصدار شهادات التقدير للأعضاء المتميزين' : 'Issue appreciation certificates to outstanding members'}</p>
        </div>
      </div>

      {/* Tabs — Horizontally Scrollable Slider on Mobile */}
      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl overflow-x-auto max-w-full whitespace-nowrap scrollbar-none touch-pan-x">
        {canIssue && (
          <button
            onClick={() => setTab('issue')}
            className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all shrink-0 cursor-pointer ${
              tab === 'issue' ? 'bg-white dark:bg-slate-900 text-eye-brand shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {ar ? '+ طلب / إصدار شهادة' : '+ Request Certificate'}
          </button>
        )}
        {canApprove && (
          <button
            onClick={() => setTab('pending')}
            className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              tab === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-500/10'
            }`}
          >
            <span>{ar ? 'طلبات بانتظار الموافقة' : 'Pending Approvals'}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-black">
              {db.getCertificates().filter(c => c.status === 'pending').length}
            </span>
          </button>
        )}
        {canIssue && (
          <button
            onClick={() => setTab('all')}
            className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all shrink-0 cursor-pointer ${
              tab === 'all' ? 'bg-white dark:bg-slate-900 text-eye-brand shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {ar ? `إدارة جميع الشهادات (${db.getCertificates().length})` : `All Certificates (${db.getCertificates().length})`}
          </button>
        )}
        <button
          onClick={() => setTab('my')}
          className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all shrink-0 cursor-pointer ${
            tab === 'my' ? 'bg-white dark:bg-slate-900 text-eye-brand shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {ar ? `شهاداتي (${myCerts.length})` : `My Certificates (${myCerts.length})`}
        </button>
      </div>

      {/* Issue Form */}
      {tab === 'issue' && canIssue && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-800 dark:text-white">{ar ? 'بيانات الشهادة' : 'Certificate Details'}</h3>

            {error && <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs font-bold text-red-600">{error}</div>}
            {issueSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {ar ? `تم إصدار الشهادة لـ ${issueSuccess.recipientName} بنجاح!` : `Certificate issued to ${issueSuccess.recipientName}!`}
              </div>
            )}

            {/* Mode Switch: Single vs Bulk */}
            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => { setIsBulkMode(false); setSelectedRecipients([]); }}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${!isBulkMode
                    ? 'bg-white dark:bg-slate-900 text-eye-brand shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                {ar ? '👤 إصدار فردي (عضو واحد)' : '👤 Single Issue'}
              </button>
              <button
                type="button"
                onClick={() => { setIsBulkMode(true); setSelectedRecipient(''); }}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${isBulkMode
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                {ar ? '👥 إصدار جماعي (عدة أعضاء)' : '👥 Bulk Issue'}
              </button>
            </div>

            {bulkCountSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-black text-emerald-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                {ar ? `🎉 تم إصدار وإرسال ${bulkCountSuccess} شهادة معتمدة بنجاح لجميع الأعضاء المحددين!` : `🎉 Successfully issued ${bulkCountSuccess} certificates to selected members!`}
              </div>
            )}

            {/* Certificate Language Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                {ar ? 'لغة الشهادة' : 'Certificate Language'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCertLang('ar')}
                  className={`py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${certLang === 'ar'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                >
                  <span>🇸🇦 العربية (Arabic)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCertLang('en')}
                  className={`py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${certLang === 'en'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                >
                  <span>🇬🇧 English (الإنجليزية)</span>
                </button>
              </div>
            </div>

            {/* Recipient Search & Selector */}
            {(() => {
              const filteredMembers = users.filter(u =>
                u.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
                u.role.toLowerCase().includes(memberSearch.toLowerCase()) ||
                (u.membershipCode && u.membershipCode.toLowerCase().includes(memberSearch.toLowerCase()))
              );

              return (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      {isBulkMode ? (ar ? 'اختر الأعضاء المكرمين (تحديد جماعي)' : 'Select Members (Bulk)') : (ar ? 'العضو المُكرَّم' : 'Recipient')}
                    </label>
                    <span className="text-[9px] text-slate-400 font-mono font-bold">
                      {filteredMembers.length} {ar ? 'عضو متوفر' : 'members'}
                    </span>
                  </div>

                  {/* Quick Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      placeholder={ar ? '🔍 بحث باسم العضو أو كوده أو دوره...' : '🔍 Search by name, code or role...'}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 min-h-[44px] text-xs sm:text-sm text-slate-800 dark:text-slate-100 font-bold leading-normal focus:outline-none focus:border-eye-brand transition-all"
                    />
                  </div>

                  {isBulkMode ? (
                    <div className="space-y-2 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 bg-slate-50/50 dark:bg-slate-800/40">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 pb-2 border-b border-slate-200 dark:border-slate-700">
                        <span>{ar ? `تم تحديد (${selectedRecipients.length}) عضو` : `Selected (${selectedRecipients.length})`}</span>
                        <button
                          type="button"
                          onClick={() => handleSelectAllFiltered(filteredMembers)}
                          className="text-xs font-black text-amber-600 hover:text-amber-700 underline cursor-pointer"
                        >
                          {filteredMembers.every(u => selectedRecipients.includes(u.id))
                            ? (ar ? 'إلغاء تحديد الكل' : 'Deselect All')
                            : (ar ? 'تحديد الكل المفلتر' : 'Select All Filtered')}
                        </button>
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-1.5 pe-1">
                        {filteredMembers.map(u => {
                          const isSelected = selectedRecipients.includes(u.id);
                          return (
                            <div
                              key={u.id}
                              onClick={() => handleToggleSelectMember(u.id)}
                              className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold cursor-pointer transition-all border ${isSelected
                                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-900 dark:text-amber-300'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => { }}
                                  className="rounded text-amber-600 focus:ring-amber-500"
                                />
                                <span>{u.fullName}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium">{u.role} ({u.committee})</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <User className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <select value={selectedRecipient} onChange={e => setSelectedRecipient(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ps-9 pe-3 py-2.5 min-h-[44px] text-xs sm:text-sm text-slate-800 dark:text-slate-100 font-bold leading-normal focus:outline-none focus:border-eye-brand transition-all">
                        <option value="">{ar ? '-- اختر عضواً --' : '-- Select Recipient --'}</option>
                        {filteredMembers.map(u => (
                          <option key={u.id} value={u.id} className="bg-slate-900 text-white py-1">{u.fullName} ({u.role} — {u.committee}) {u.membershipCode ? `[${u.membershipCode}]` : ''}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Cert Type */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{ar ? 'نوع الشهادة' : 'Certificate Type'}</label>
              <div className="grid grid-cols-1 gap-2">
                {CERT_TYPES.map(ct => (
                  <button key={ct.id} onClick={() => setCertType(ct.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-start transition-all text-xs font-bold ${certType === ct.id ? `border-eye-brand bg-blue-50 dark:bg-blue-950/20 text-eye-brand` : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}>
                    <span className="text-xl">{ct.icon}</span>
                    <span>{ar ? ct.labelAr : ct.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {certType === 'custom' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">{ar ? 'عنوان الشهادة' : 'Certificate Title'}</label>
                  <input type="text" value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder={ar ? 'شهادة تقدير خاصة...' : 'Special recognition...'}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-eye-brand font-semibold" />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase">{ar ? 'نص الشهادة (اختياري)' : 'Certificate Body (optional)'}</label>
              <textarea value={customBody} onChange={e => setCustomBody(e.target.value)}
                rows={3} placeholder={ar ? 'اتركه فارغاً للنص الافتراضي...' : 'Leave empty for default text...'}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-eye-brand font-semibold resize-none" />
            </div>

            {/* Certificate Grade */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase">{ar ? 'الدرجة التقييمية للشهادة (0 - 100)' : 'Certificate Performance Grade (0 - 100)'}</label>
              <input type="number" min="0" max="100" value={certGrade} onChange={e => setCertGrade(e.target.value)} placeholder="90"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-eye-brand font-semibold" />
            </div>



            <button onClick={handleIssue}
              className="w-full text-white font-black py-3 rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              style={{
                background: isBulkMode ? 'linear-gradient(135deg, #d97706, #b45309)' : (canApprove ? 'linear-gradient(135deg, #2b66ff, #1b4cd3)' : 'linear-gradient(135deg, #d97706, #b45309)'),
                boxShadow: isBulkMode ? '0 4px 15px rgba(217,119,6,0.35)' : '0 4px 15px rgba(43,102,255,0.35)'
              }}>
              <Award className="w-4 h-4" />
              {isBulkMode
                ? (ar ? (canApprove ? `إصدار وإرسال الشهادات لـ (${selectedRecipients.length}) عضو 👥` : `إرسال طلبات اعتماد الشهادات لـ (${selectedRecipients.length}) عضو 📤`) : `Issue to (${selectedRecipients.length}) Members 👥`)
                : (ar ? (canApprove ? 'إصدار الشهادة 📜' : 'إرسال طلب اعتماد الشهادة للإدارة 📤') : 'Issue Certificate 📜')}
            </button>
          </div>

          {/* Preview — updates live as you fill the form */}
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white mb-3 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-amber-500" />
              {ar ? 'معاينة مباشرة' : 'Live Preview'}
              {livePreview && !previewCert && (
                <span className="text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full ms-1">
                  {ar ? 'مسودة' : 'Draft'}
                </span>
              )}
            </h3>
            {previewCert ? (
              <div className="space-y-3">
                <CertPreview cert={previewCert} onPrint={() => handlePrint(previewCert)} transparentLogo={transparentLogo} />
                {previewCert.status === 'pending' && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center text-amber-800 dark:text-amber-200 text-xs font-bold">
                    ⏳ تم رفع طلب الشهادة بنجاح! الشهادة الآن بانتظار موافقة واقتران الإدارة (Super Admin) قبل تفعيل إمكانية الطباعة والتصدير.
                  </div>
                )}
              </div>
            ) : livePreview ? (
              <div className="relative">
                <div className="absolute inset-0 z-10 rounded-3xl" style={{ background: 'rgba(251,246,232,0.15)', backdropFilter: 'none', pointerEvents: 'none' }} />
                <CertPreview cert={livePreview} onPrint={() => { }} transparentLogo={transparentLogo} />
                
                {!canApprove && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center text-amber-800 dark:text-amber-300 text-xs font-bold mt-2">
                    ⚠️ بصفتك ليدر، عند الضغط على "إرسال طلب اعتماد الشهادة للإدارة"، سيتلقى رئيس الكيان/الإدارة طلباً لمعاينتها واعتتمادها أولاً.
                  </div>
                )}

                <p className="text-center text-[10px] text-slate-400 mt-2 font-bold">
                  {ar ? '👁 معاينة مسودة قبل إرسال الطلب' : '👁 Draft preview'}
                </p>

                {/* Immediate Action Buttons: Preview */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setFullScreenModalCert(livePreview)}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{ar ? '👁️ تكبير ومعاينة قبل الإرسال' : '👁️ Preview Fullscreen'}</span>
                  </button>

                  {canApprove && (
                    <>
                      <button
                        type="button"
                        onClick={() => downloadCertificate(toCertGeneratorData(livePreview))}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Download className="w-4 h-4" />
                        <span>{ar ? '📥 تحميل (PNG)' : '📥 Download'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => printCertificate(toCertGeneratorData(livePreview))}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-950 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <span>{ar ? '🖨️ طباعة' : '🖨️ Print'}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Eye className="w-8 h-8 opacity-30" />
                <p className="text-xs font-bold">{ar ? 'اختر عضواً لرؤية المعاينة' : 'Select a member to preview'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pending Approvals Tab (Admin & HRM View) */}
      {tab === 'pending' && canApprove && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-amber-200 dark:border-amber-900/40 p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{ar ? 'طلبات اعتماد الشهادات بانتظار الموافقة' : 'Pending Certificate Approval Requests'}</span>
                <span className="text-xs text-white font-black bg-amber-500 px-3 py-0.5 rounded-full">
                  {db.getCertificates().filter(c => c.status === 'pending').length}
                </span>
              </h3>
            </div>

            {db.getCertificates().filter(c => c.status === 'pending').length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Award className="w-12 h-12 mx-auto mb-2 opacity-30 text-amber-500" />
                <p className="text-xs font-bold">{ar ? 'لا توجد طلبات شهادات بانتظار الموافقة حالياً 🎉' : 'No pending approval requests'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {db.getCertificates()
                  .filter(c => c.status === 'pending')
                  .map(cert => {
                    const def = CERT_TYPES.find(ct => ct.id === cert.certType);
                    return (
                      <div key={cert.id} className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-br ${def?.color || 'from-amber-400 to-orange-500'} text-white shrink-0 shadow-md`}>
                            {def?.icon || '📜'}
                          </div>
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-black text-slate-900 dark:text-white text-sm truncate">{cert.recipientName}</p>
                              <span className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                                {ar ? '⏳ بانتظار موافقتك' : 'Pending'}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-amber-900 dark:text-amber-200">{cert.title} • {cert.committee || 'عام'}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              {ar ? 'مرفوع بواسطة الليدر' : 'Requested by'}: <strong>{cert.issuedByName}</strong> ({cert.issuedByTitle}) • {new Date(cert.issuedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                            {cert.body && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 italic line-clamp-2 bg-white/60 dark:bg-slate-900/60 p-2 rounded-xl border border-amber-200/50 mt-1">
                                "{cert.body}"
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => setFullScreenModalCert(cert)}
                            className="px-3 py-2 text-xs font-bold text-slate-700 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-500" />
                            <span>{ar ? 'معاينة' : 'Preview'}</span>
                          </button>
                          <button
                            onClick={async () => {
                              await db.approveCertificate(cert.id, currentUser);
                              setEmailToast(true);
                              setTimeout(() => setEmailToast(false), 4000);
                            }}
                            className="px-4 py-2 text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>{ar ? 'اعتماد وموافقة ✅' : 'Approve ✅'}</span>
                          </button>
                          <button
                            onClick={async () => {
                              const reason = window.prompt(ar ? 'يرجى كتابة سبب رفض طلب الشهادة (اختياري):' : 'Enter rejection reason (optional):');
                              if (reason !== null) {
                                await db.rejectCertificate(cert.id, currentUser, reason);
                              }
                            }}
                            className="px-3 py-2 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 rounded-xl transition-all cursor-pointer"
                          >
                            <span>{ar ? 'رفض الطلب ❌' : 'Reject ❌'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manage All Issued Certificates (Admin & Leader Access) */}
      {tab === 'all' && canIssue && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{ar ? 'جميع الشهادات الصادرة بالنظام' : 'All System Issued Certificates'}</span>
                <span className="text-xs text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/30 px-3 py-0.5 rounded-full">
                  {db.getCertificates().length} {ar ? 'شهادة' : 'Certs'}
                </span>
              </h3>

              {/* Quick Search Box for Issued Certificates */}
              <div className="relative min-w-[240px]">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={issuedSearchQuery}
                  onChange={(e) => setIssuedSearchQuery(e.target.value)}
                  placeholder={ar ? '🔍 بحث باسم العضو أو عنوان الشهادة...' : '🔍 Search member or cert title...'}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ps-9 pe-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-eye-brand"
                />
              </div>
            </div>

            {db.getCertificates().filter(c =>
              c.recipientName.toLowerCase().includes(issuedSearchQuery.toLowerCase()) ||
              c.title.toLowerCase().includes(issuedSearchQuery.toLowerCase()) ||
              c.issuedByName.toLowerCase().includes(issuedSearchQuery.toLowerCase()) ||
              (c.committee && c.committee.toLowerCase().includes(issuedSearchQuery.toLowerCase()))
            ).length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Award className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-bold">{ar ? 'لا توجد شهادات مطابقة للبحث' : 'No matching certificates'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {db.getCertificates()
                  .filter(c =>
                    c.recipientName.toLowerCase().includes(issuedSearchQuery.toLowerCase()) ||
                    c.title.toLowerCase().includes(issuedSearchQuery.toLowerCase()) ||
                    c.issuedByName.toLowerCase().includes(issuedSearchQuery.toLowerCase()) ||
                    (c.committee && c.committee.toLowerCase().includes(issuedSearchQuery.toLowerCase()))
                  )
                  .map(cert => {
                    const def = CERT_TYPES.find(c => c.id === cert.certType);
                    const isPending = cert.status === 'pending';
                    const isRejected = cert.status === 'rejected';

                    return (
                      <div key={cert.id} className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 flex items-center justify-between gap-4 border border-slate-200/60 dark:border-slate-700">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br ${def?.color || 'from-amber-400 to-orange-500'} text-white shrink-0`}>
                            {def?.icon || '📜'}
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <p className="font-black text-slate-900 dark:text-white text-xs truncate">{cert.recipientName}</p>
                              {isPending && (
                                <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-300">
                                  ⏳ بانتظار موافقة الإدارة
                                </span>
                              )}
                              {isRejected && (
                                <span className="bg-red-100 text-red-800 text-[9px] font-black px-2 py-0.5 rounded-full border border-red-300">
                                  ❌ مرفوضة
                                </span>
                              )}
                              {!isPending && !isRejected && (
                                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-300">
                                  ✅ معتمدة رسمياً
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">{cert.title} • {cert.committee || 'عام'}</p>
                            <p className="text-[9px] text-slate-400">
                              {ar ? 'صادرة بواسطة' : 'By'}: {cert.issuedByName} ({new Date(cert.issuedAt).toLocaleDateString('ar-EG')})
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleDownload(cert)}
                            disabled={isPending && !canApprove}
                            className={`p-2 text-xs font-bold rounded-xl transition-all ${isPending && !canApprove ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 cursor-pointer'}`}
                            title={isPending && !canApprove ? (ar ? 'الشهادة بانتظار موافقة الإدارة' : 'Pending Approval') : (ar ? 'تحميل' : 'Download')}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm(ar ? `هل أنت تأكد من سحب/إلغاء شهادة ${cert.recipientName}؟` : `Revoke certificate for ${cert.recipientName}?`)) {
                                await db.deleteCertificate(cert.id, currentUser);
                              }
                            }}
                            className="p-2 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 rounded-xl transition-all cursor-pointer"
                            title={ar ? 'سحب / إلغاء الشهادة' : 'Revoke Certificate'}
                          >
                            <span className="text-xs">🗑️</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* My Certificates */}
      {tab === 'my' && (
        <div className="space-y-4">
          {myCerts.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-bold">{ar ? 'لا توجد شهادات بعد' : 'No certificates yet'}</p>
            </div>
          ) : (
            myCerts.map(cert => {
              const def = CERT_TYPES.find(c => c.id === cert.certType);
              const isPending = cert.status === 'pending';

              return (
                <div key={cert.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-amber-200 dark:border-amber-900/40 p-5 flex items-start gap-4 hover:shadow-md hover:shadow-amber-100 transition-all">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-br ${def?.color || 'from-slate-200 to-slate-300'} shrink-0`}>
                    {def?.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-800 dark:text-slate-100 text-sm">{cert.title}</p>
                      {isPending && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-300">
                          ⏳ قيد مراجعة وموافقة الإدارة
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{ar ? 'صادرة من' : 'Issued by'}: {cert.issuedByName}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(cert.issuedAt).toLocaleDateString(ar ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <button
                    onClick={() => handleDownload(cert)}
                    disabled={isPending && !canApprove}
                    className={`flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-xl transition-all shrink-0 ${isPending && !canApprove ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'text-eye-brand hover:text-eye-brand-dark bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 cursor-pointer'}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {isPending && !canApprove ? (ar ? 'قيد المراجعة' : 'Pending') : (ar ? 'تحميل' : 'Download')}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* FULLSCREEN CERTIFICATE PREVIEW MODAL */}
      {fullScreenModalCert && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-4 text-start relative my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{ar ? `معاينة مكبرة للشهادة — ${fullScreenModalCert.recipientName}` : `Fullscreen Certificate Preview — ${fullScreenModalCert.recipientName}`}</span>
                  {fullScreenModalCert.status === 'pending' && (
                    <span className="bg-amber-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
                      ⏳ بانتظار موافقة الإدارة
                    </span>
                  )}
                </h3>
              </div>
              <button
                onClick={() => setFullScreenModalCert(null)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* High-res Cert Preview */}
            <div className="p-2 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <CertPreview cert={fullScreenModalCert} onPrint={() => handlePrint(fullScreenModalCert)} transparentLogo={transparentLogo} />
            </div>

            {fullScreenModalCert.status === 'pending' && !canApprove && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center text-amber-800 dark:text-amber-200 text-xs font-bold">
                ⚠️ هذه الشهادة مرفوعة بطلب من الليدر وهي الآن قيد مراجعة وموافقة الإدارة (Super Admin). لا يمكن طباعتها أو تصديرها حتى تتم الموافقة عليها رسمياً.
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-[10px] text-slate-400 font-mono">EYE Certified Verification Seal</span>
              <div className="flex flex-wrap gap-2">
                {fullScreenModalCert.status === 'pending' && canApprove && (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        await db.approveCertificate(fullScreenModalCert.id, currentUser);
                        setFullScreenModalCert(null);
                        setEmailToast(true);
                        setTimeout(() => setEmailToast(false), 4000);
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{ar ? 'اعتماد وموافقة الشهادة ✅' : 'Approve Certificate ✅'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const reason = window.prompt(ar ? 'سبب الرفض (اختياري):' : 'Rejection reason:');
                        if (reason !== null) {
                          await db.rejectCertificate(fullScreenModalCert.id, currentUser, reason);
                          setFullScreenModalCert(null);
                        }
                      }}
                      className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <span>{ar ? 'رفض الطلب ❌' : 'Reject ❌'}</span>
                    </button>
                  </>
                )}

                {(!fullScreenModalCert.status || fullScreenModalCert.status === 'approved' || canApprove) && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleDownload(fullScreenModalCert)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>{ar ? 'تحميل كصورة (PNG)' : 'Download (PNG)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrint(fullScreenModalCert)}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <span>{ar ? 'طباعة الشهادة الرسمية 🖨️' : 'Print Certificate 🖨️'}</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setFullScreenModalCert(null)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  {ar ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
