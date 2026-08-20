import React, { useState, useEffect, useRef } from 'react';
import { db, calculateMemberAVG } from '../db/localDb';
import { supabase, getPermanentStorageUrl } from '../lib/supabaseClient';
import { UserProfile, ActivityLog, IssuedCertificate, CertificateType, MemberEvaluation, DisciplinaryRecord, getUserRoleTitle } from '../types';
import { Phone, Award, Activity, Calendar, User, Camera, Loader2, ZoomIn, ZoomOut, RotateCw, X, Download, Eye, Star, Crown, Target, Trash2, ShieldCheck, Lock, Sliders, MessageSquare, Sparkles, CheckCircle2, ArrowLeft, Linkedin, Facebook, Cake, Globe, Printer, ShieldAlert, FileText, AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { downloadCertificate, printCertificate, getCommitteeSignatories } from '../lib/certificateGenerator';
import { printDedicatedOfficialDocument } from '../lib/dedicatedPrint';
import PremiumCertificate from './PremiumCertificate';
import { fillAndDownloadDocxTemplate } from '../lib/docxFiller';
import { CareerCompass } from './CareerCompass';

interface MemberProfileProps {
  currentUser: UserProfile;
  selectedCertId?: string;
  targetUserId?: string;
  onNavigateToView?: (view: string, targetId?: string) => void;
  onGoBack?: () => void;
}

const CERT_TYPE_META: Record<CertificateType, { label: string; icon: string; gradient: string }> = {
  appreciation: { label: 'شهادة تقدير وعرفان', icon: '🌟', gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' },
  excellence: { label: 'شهادة تميز وإتقان', icon: '🏆', gradient: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)' },
  training: { label: 'شهادة إتمام تدريب', icon: '📚', gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)' },
  leadership: { label: 'شهادة القيادة المتميزة', icon: '👑', gradient: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' },
  custom: { label: 'شهادة مخصصة', icon: '✨', gradient: 'linear-gradient(135deg, #fb7185 0%, #ec4899 100%)' },
};

const CERT_TYPES: { id: CertificateType; labelAr: string; label: string; color: string; icon: string }[] = [
  { id: 'appreciation', labelAr: 'شهادة تقدير وعرفان', label: 'Certificate of Appreciation', color: 'from-amber-400 to-orange-500', icon: '🌟' },
  { id: 'excellence', labelAr: 'شهادة تميز وإتقان', label: 'Certificate of Excellence', color: 'from-purple-500 to-indigo-600', icon: '🏆' },
  { id: 'training', labelAr: 'شهادة إتمام تدريب', label: 'Certificate of Training Completion', color: 'from-blue-500 to-cyan-500', icon: '📚' },
  { id: 'leadership', labelAr: 'شهادة القيادة المتميزة', label: 'Leadership Excellence Certificate', color: 'from-emerald-500 to-teal-600', icon: '👑' },
  { id: 'custom', labelAr: 'شهادة مخصصة', label: 'Custom Certificate', color: 'from-rose-400 to-pink-500', icon: '✨' },
];

// Convert an IssuedCertificate to the shape the certificateGenerator expects
const toCertGeneratorData = (cert: IssuedCertificate) => ({
  memberName: cert.recipientName,
  recipientRole: cert.recipientRole,
  certTitle: cert.title,
  certType: cert.certType,
  body: cert.body || '',
  grade: cert.grade ?? 90,
  reviewerName: cert.issuedByName,
  issuedByTitle: cert.issuedByTitle,
  committee: cert.committee || 'None',
  date: new Date(cert.issuedAt).toLocaleDateString(cert.lang === 'en' ? 'en-US' : 'ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
  lang: cert.lang || 'ar',
  designStyle: cert.designStyle || 'style1',
  id: cert.id,
});

const downloadIssuedCertificate = (cert: IssuedCertificate) => {
  downloadCertificate(toCertGeneratorData(cert));
};
const printIssuedCertificate = (cert: IssuedCertificate) => {
  printCertificate(toCertGeneratorData(cert));
};

const ModernCertificateView: React.FC<{
  cert: IssuedCertificate;
  transparentLogo: string;
  isEn: boolean;
  date: string;
  zoom: number;
  rotation: number;
}> = ({ cert, transparentLogo, zoom, rotation }) => {
  return (
    <PremiumCertificate cert={cert} logo={transparentLogo} zoom={zoom} rotation={rotation} />
  );
};

const CertificateViewModal: React.FC<{
  cert: IssuedCertificate;
  onClose: () => void;
  onDownload: (c: IssuedCertificate) => void;
  transparentLogo: string;
}> = ({ cert, onClose, onDownload, transparentLogo }) => {
  const isEn = cert.lang === 'en';
  const date = new Date(cert.issuedAt).toLocaleDateString(isEn ? 'en-US' : 'ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  const certDef = CERT_TYPES.find(c => c.id === cert.certType);
  const isStyle2 = cert.designStyle === 'style2';
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handlePrint = () => {
    printIssuedCertificate(cert);
  };

  const gradeVal = cert.grade || 90;
  const gradeColor = gradeVal >= 90 ? '#059669' : gradeVal >= 75 ? '#1d4ed8' : '#b45309';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-950 rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[95vh] overflow-y-auto flex flex-col gap-4 text-slate-800" onClick={(e) => e.stopPropagation()}>
        {/* Controls Header */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setZoom(prev => Math.min(prev + 0.1, 1.8))}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-all flex items-center justify-center cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.6))}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-all flex items-center justify-center cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRotation(prev => (prev + 90) % 360)}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-all flex items-center justify-center cursor-pointer"
              title="Rotate"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-50 hover:bg-red-50 hover:text-red-500 dark:bg-slate-900 dark:hover:bg-red-950/20 text-slate-400 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Certificate Render viewport */}
          <div className="overflow-auto max-h-[55vh] w-full flex items-center justify-center p-6 bg-slate-100 dark:bg-slate-900/60 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
            {isStyle2 ? (
              <ModernCertificateView cert={cert} transparentLogo={transparentLogo} isEn={isEn} date={date} zoom={zoom} rotation={rotation} />
            ) : (
          <div
            className="cert-print-area rounded-2xl p-6 sm:p-10 text-center relative overflow-hidden border-4 transition-transform duration-200 shrink-0"
            style={{
              fontFamily: 'Georgia, serif',
              direction: isEn ? 'ltr' : 'rtl',
              background: 'linear-gradient(135deg, #f0f5ff 0%, #e8f0fe 50%, #dce8ff 100%)',
              borderColor: '#1b4cd3',
              boxShadow: '0 15px 30px -10px rgba(27, 76, 211, 0.15)',
              color: '#0f172a',
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              width: '600px',
            }}
          >
            {/* Corner gold brackets */}
            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 pointer-events-none" style={{ borderColor: '#1b4cd3' }} />
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 pointer-events-none" style={{ borderColor: '#1b4cd3' }} />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 pointer-events-none" style={{ borderColor: '#1b4cd3' }} />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 pointer-events-none" style={{ borderColor: '#1b4cd3' }} />

            {/* Ink stamp (bottom-right) — official EYE logo inside circular stamp frame */}
            <div className="absolute bottom-6 right-6 w-24 h-24 rounded-full border-2 border-double flex items-center justify-center -rotate-12 select-none pointer-events-none overflow-hidden"
              style={{ borderColor: 'rgba(43, 102, 255, 0.85)', background: 'transparent' }}>
              <img src="/eye-logo-seal.png" className="w-14 h-14" style={{ objectFit: 'fill' }} alt="seal" />
            </div>

            {/* Subtle EYE watermark center */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden>
              <span style={{ fontSize: 130, fontWeight: 900, color: 'rgba(43, 102, 255, 0.05)', letterSpacing: '8px' }}>EYE</span>
            </div>

            {/* TOP HEADER — minimal: doc label + cert ID + date */}
            <div className="flex justify-between items-start mb-3 relative z-10">
              <div className="text-start">
                <p className="text-[10px] font-black" style={{ color: '#1b4cd3' }}>
                  {isEn ? '• Official Certified Document •' : '• وثيقة رسمية معتمدة •'}
                </p>
                <p className="text-[9px] font-semibold" style={{ color: '#334155' }}>Official Certified Document</p>
                <p className="text-[9px] font-mono mt-0.5" style={{ color: '#64748b' }}>ID: EYE-CERT-{cert.id.slice(-4).toUpperCase()}</p>
              </div>
              <div className="text-end">
                <p className="text-[9px] font-semibold" style={{ color: '#64748b' }}>{isEn ? 'Issue Date' : 'تاريخ الإصدار'}</p>
                <p className="text-[10px] font-black" style={{ color: '#0f172a' }}>{date}</p>
                <p className="text-[9px]" style={{ color: '#94a3b8' }}>Issue Date</p>
              </div>
            </div>

            {/* Top divider with center diamond */}
            <div className="relative my-4 z-10">
              <div className="h-px" style={{ background: 'linear-gradient(to right, transparent 0%, #2b66ff 50%, transparent 100%)' }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45" style={{ background: '#2b66ff' }} />
            </div>

            {/* Title */}
            <div className="relative z-10">
              <h2 className="text-2xl font-black mb-1" style={{ color: '#1b4cd3' }}>{cert.title}</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: '#475569' }}>{certDef?.label}</p>
            </div>

            {/* MIDDLE: كيان المصريون الشباب EYE */}
            <div className="relative z-10 my-4">
              <p className="text-[10px] font-bold mb-1" style={{ color: '#2b66ff' }}>{isEn ? '— ISSUED BY —' : '— يصدرها —'}</p>

              {/* Decorative logo next to entity name */}
              <div className="flex items-center justify-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden shrink-0"
                  style={{ background: 'rgba(43, 102, 255, 0.12)', border: '1.5px solid #2b66ff' }}>
                  <img src={transparentLogo} className="w-7 h-7 object-contain" alt="" />
                </div>
                <p className="text-2xl font-black" style={{ color: '#0f172a' }}>
                  {isEn ? 'Egyptian Youth Entity EYE' : 'كيان المصريون الشباب EYE'}
                </p>
              </div>

              <p className="text-[10px] italic mt-1" style={{ color: '#475569' }}>Egyptian Youth Entity — EYE</p>

              {/* Blue underline with diamond */}
              <div className="relative w-64 h-px mx-auto mt-2" style={{ background: 'linear-gradient(to right, transparent 0%, #2b66ff 50%, transparent 100%)' }}>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rotate-45" style={{ background: '#2b66ff' }} />
              </div>
            </div>

            {/* RECIPIENT */}
            <div className="relative z-10 my-4">
              <p className="text-[11px] font-semibold mb-1" style={{ color: '#334155' }}>
                {isEn ? 'The Egyptian Youth Entity is honored to present this certificate to' : 'يفخر بأن يتقدم بهذه الشهادة إلى العضو المتميز'}
              </p>
              <p className="text-2xl font-black" style={{ color: '#0f172a' }}>{cert.recipientName}</p>
              <p className="text-[10px] mt-1" style={{ color: '#475569' }}>{cert.recipientRole} • {cert.committee}</p>
            </div>

            {/* Body */}
            <div className="relative z-10 my-4">
              <p className="text-[12px] leading-7 px-4 font-semibold" style={{ color: '#334155' }}>{cert.body}</p>
            </div>

            {/* Grade Badge */}
            <div className="relative z-10 flex flex-col items-center justify-center my-4">
              <div className="w-16 h-16 rounded-full border-2 border-double flex items-center justify-center bg-white shadow-sm"
                style={{ borderColor: gradeColor }}>
                <span className="text-lg font-black" style={{ color: gradeColor }}>
                  {gradeVal}
                </span>
              </div>
              <p className="text-[9px] font-bold text-slate-500 mt-1">{isEn ? 'Performance Rating' : 'تقييم الأداء'}</p>
            </div>

            {/* 5 Official Signatories Grid Container */}
            <div className="w-full overflow-x-auto pb-2 scrollbar-none pt-4 mt-4" style={{ borderTop: '1px solid rgba(43, 102, 255, 0.3)' }}>
              <div className="relative z-10 grid grid-cols-5 gap-3 sm:gap-5 items-end text-center px-1 min-w-[520px]">
                {(() => {
                  const sigs = getCommitteeSignatories(cert.committee, isEn ? 'en' : 'ar');
                  if (isEn) {
                    return (
                      <>
                        <div className="flex flex-col items-center justify-end text-center min-w-[90px]">
                          <div className="min-h-[22px] flex items-center justify-center mb-1">
                            <span className="px-1 py-0.5 rounded-md bg-amber-500/15 text-amber-950 border border-amber-600/40 text-[6.5px] sm:text-[7.5px] font-black uppercase tracking-tight shadow-2xs whitespace-nowrap">
                              Entity President
                            </span>
                          </div>
                          <div className="min-h-[24px] flex flex-col items-center justify-center my-0.5 leading-none text-center">
                            <span className="text-[9px] sm:text-[10px] select-none italic font-black font-serif text-black block">Mohamed</span>
                            <span className="text-[9px] sm:text-[10px] select-none italic font-black font-serif text-black block">Metwally</span>
                          </div>
                          <div className="w-8 sm:w-10 h-px my-0.5 bg-black" />
                          <div className="text-[7px] sm:text-[8px] font-black text-black leading-tight text-center">
                            <span className="block">Mr. Mohamed</span>
                            <span className="block">Metwally</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-end text-center min-w-[90px]">
                          <div className="min-h-[22px] flex items-center justify-center mb-1">
                            <span className="px-1 py-0.5 rounded-md bg-blue-500/15 text-blue-950 border border-blue-600/40 text-[6.5px] sm:text-[7.5px] font-black uppercase tracking-tight shadow-2xs whitespace-nowrap">
                              Governorate Coord.
                            </span>
                          </div>
                          <div className="min-h-[24px] flex flex-col items-center justify-center my-0.5 leading-none text-center">
                            <span className="text-[9px] sm:text-[10px] select-none italic font-black font-serif text-black block">Mahmoud</span>
                            <span className="text-[9px] sm:text-[10px] select-none italic font-black font-serif text-black block">Rabie</span>
                          </div>
                          <div className="w-8 sm:w-10 h-px my-0.5 bg-black" />
                          <div className="text-[7px] sm:text-[8px] font-black text-black leading-tight text-center">
                            <span className="block">Mr. Mahmoud</span>
                            <span className="block">Rabie</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-end text-center min-w-[90px]">
                          <div className="min-h-[22px] flex items-center justify-center mb-1">
                            <span className="px-1 py-0.5 rounded-md bg-emerald-500/15 text-emerald-950 border border-emerald-600/40 text-[6.5px] sm:text-[7.5px] font-black uppercase tracking-tight shadow-2xs whitespace-nowrap">
                              Deputy Coord.
                            </span>
                          </div>
                          <div className="min-h-[24px] flex flex-col items-center justify-center my-0.5 leading-none text-center">
                            <span className="text-[9px] sm:text-[10px] select-none italic font-black font-serif text-black block">Marwa</span>
                            <span className="text-[9px] sm:text-[10px] select-none italic font-black font-serif text-black block">Jaber</span>
                          </div>
                          <div className="w-8 sm:w-10 h-px my-0.5 bg-black" />
                          <div className="text-[7px] sm:text-[8px] font-black text-black leading-tight text-center">
                            <span className="block">Ms. Marwa</span>
                            <span className="block">Jaber</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-end text-center min-w-[90px]">
                          <div className="min-h-[22px] flex items-center justify-center mb-1">
                            <span className="px-1 py-0.5 rounded-md bg-purple-500/15 text-purple-950 border border-purple-600/40 text-[6.5px] sm:text-[7.5px] font-black uppercase tracking-tight shadow-2xs whitespace-nowrap">
                              {sigs.headTitle}
                            </span>
                          </div>
                          <div className="min-h-[24px] flex flex-col items-center justify-center my-0.5 leading-none text-center">
                            {sigs.headName.split(' ').map((p, i) => (
                              <span key={i} className="text-[9px] sm:text-[10px] select-none italic font-black font-serif text-black block">{p}</span>
                            ))}
                          </div>
                          <div className="w-8 sm:w-10 h-px my-0.5 bg-black" />
                          <div className="text-[7px] sm:text-[8px] font-black text-black leading-tight text-center">
                            <span className="block">{sigs.headName.includes('Yara') || sigs.headName.includes('Farah') || sigs.headName.includes('Reeham') ? `Ms. ${sigs.headName.split(' ')[0]}` : `Mr. ${sigs.headName.split(' ')[0]}`}</span>
                            <span className="block">{sigs.headName.split(' ').slice(1).join(' ')}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-end text-center min-w-[90px]">
                          <div className="min-h-[22px] flex items-center justify-center mb-1">
                            <span className="px-1 py-0.5 rounded-md bg-rose-500/15 text-rose-950 border border-rose-600/40 text-[6.5px] sm:text-[7.5px] font-black uppercase tracking-tight shadow-2xs whitespace-nowrap">
                              {sigs.viceTitle}
                            </span>
                          </div>
                          <div className="min-h-[24px] flex flex-col items-center justify-center my-0.5 leading-none text-center">
                            {sigs.viceName.split(' ').map((p, i) => (
                              <span key={i} className="text-[9px] sm:text-[10px] select-none italic font-black font-serif text-black block">{p}</span>
                            ))}
                          </div>
                          <div className="w-8 sm:w-10 h-px my-0.5 bg-black" />
                          <div className="text-[7px] sm:text-[8px] font-black text-black leading-tight text-center">
                            <span className="block">{sigs.viceName.includes('Yara') || sigs.viceName.includes('Farah') || sigs.viceName.includes('Reeham') ? `Ms. ${sigs.viceName.split(' ')[0]}` : `Mr. ${sigs.viceName.split(' ')[0]}`}</span>
                            <span className="block">{sigs.viceName.split(' ').slice(1).join(' ')}</span>
                          </div>
                        </div>
                      </>
                    );
                  }
                  return (
                    <>
                      <div className="flex flex-col items-center justify-end text-center min-w-[90px]">
                        <div className="min-h-[22px] flex items-center justify-center mb-1">
                          <span className="px-1 py-0.5 rounded-md bg-amber-500/15 text-amber-950 border border-amber-600/40 text-[7px] sm:text-[8px] font-black shadow-2xs whitespace-nowrap">
                            رئيس الكيان
                          </span>
                        </div>
                        <div className="min-h-[24px] flex flex-col items-center justify-center my-0.5 leading-none text-center">
                          <span className="text-[10px] sm:text-[11px] select-none font-black text-black block" style={{ fontFamily: "'Aldhabi', 'Aref Ruqaa', 'Amiri', 'Traditional Arabic', serif" }}>محمد</span>
                          <span className="text-[10px] sm:text-[11px] select-none font-black text-black block" style={{ fontFamily: "'Aldhabi', 'Aref Ruqaa', 'Amiri', 'Traditional Arabic', serif" }}>متولي</span>
                        </div>
                        <div className="w-8 sm:w-10 h-px my-0.5 bg-black" />
                        <div className="text-[7px] sm:text-[8px] font-black text-black leading-tight text-center">
                          <span className="block">أ. محمد</span>
                          <span className="block">متولي</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-end text-center min-w-[90px]">
                        <div className="min-h-[22px] flex items-center justify-center mb-1">
                          <span className="px-1 py-0.5 rounded-md bg-blue-500/15 text-blue-950 border border-blue-600/40 text-[7px] sm:text-[8px] font-black shadow-2xs whitespace-nowrap">
                            منسق المحافظة
                          </span>
                        </div>
                        <div className="min-h-[24px] flex flex-col items-center justify-center my-0.5 leading-none text-center">
                          <span className="text-[10px] sm:text-[11px] select-none font-black text-black block" style={{ fontFamily: "'Aldhabi', 'Aref Ruqaa', 'Amiri', 'Traditional Arabic', serif" }}>محمود</span>
                          <span className="text-[10px] sm:text-[11px] select-none font-black text-black block" style={{ fontFamily: "'Aldhabi', 'Aref Ruqaa', 'Amiri', 'Traditional Arabic', serif" }}>ربيع</span>
                        </div>
                        <div className="w-8 sm:w-10 h-px my-0.5 bg-black" />
                        <div className="text-[7px] sm:text-[8px] font-black text-black leading-tight text-center">
                          <span className="block">أ. محمود</span>
                          <span className="block">ربيع</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-end text-center min-w-[90px]">
                        <div className="min-h-[22px] flex items-center justify-center mb-1">
                          <span className="px-1 py-0.5 rounded-md bg-emerald-500/15 text-emerald-950 border border-emerald-600/40 text-[7px] sm:text-[8px] font-black shadow-2xs whitespace-nowrap">
                            نائب منسق المحافظة
                          </span>
                        </div>
                        <div className="min-h-[24px] flex flex-col items-center justify-center my-0.5 leading-none text-center">
                          <span className="text-[10px] sm:text-[11px] select-none font-black text-black block" style={{ fontFamily: "'Aldhabi', 'Aref Ruqaa', 'Amiri', 'Traditional Arabic', serif" }}>مروة</span>
                          <span className="text-[10px] sm:text-[11px] select-none font-black text-black block" style={{ fontFamily: "'Aldhabi', 'Aref Ruqaa', 'Amiri', 'Traditional Arabic', serif" }}>جابر</span>
                        </div>
                        <div className="w-8 sm:w-10 h-px my-0.5 bg-black" />
                        <div className="text-[7px] sm:text-[8px] font-black text-black leading-tight text-center">
                          <span className="block">أ. مروة</span>
                          <span className="block">جابر</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-end text-center min-w-[90px]">
                        <div className="min-h-[22px] flex items-center justify-center mb-1">
                          <span className="px-1 py-0.5 rounded-md bg-purple-500/15 text-purple-950 border border-purple-600/40 text-[7px] sm:text-[8px] font-black shadow-2xs whitespace-nowrap">
                            {sigs.headTitle}
                          </span>
                        </div>
                        <div className="min-h-[24px] flex flex-col items-center justify-center my-0.5 leading-none text-center">
                          {sigs.headName.split(' ').map((p, i) => (
                            <span key={i} className="text-[10px] sm:text-[11px] select-none font-black text-black block" style={{ fontFamily: "'Aldhabi', 'Aref Ruqaa', 'Amiri', 'Traditional Arabic', serif" }}>{p}</span>
                          ))}
                        </div>
                        <div className="w-8 sm:w-10 h-px my-0.5 bg-black" />
                        <div className="text-[7px] sm:text-[8px] font-black text-black leading-tight text-center">
                          <span className="block">أ. {sigs.headName.split(' ')[0]}</span>
                          <span className="block">{sigs.headName.split(' ').slice(1).join(' ')}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-end text-center min-w-[90px]">
                        <div className="min-h-[22px] flex items-center justify-center mb-1">
                          <span className="px-1 py-0.5 rounded-md bg-rose-500/15 text-rose-950 border border-rose-600/40 text-[7px] sm:text-[8px] font-black shadow-2xs whitespace-nowrap">
                            {sigs.viceTitle}
                          </span>
                        </div>
                        <div className="min-h-[24px] flex flex-col items-center justify-center my-0.5 leading-none text-center">
                          {sigs.viceName.split(' ').map((p, i) => (
                            <span key={i} className="text-[10px] sm:text-[11px] select-none font-black text-black block" style={{ fontFamily: "'Aldhabi', 'Aref Ruqaa', 'Amiri', 'Traditional Arabic', serif" }}>{p}</span>
                          ))}
                        </div>
                        <div className="w-8 sm:w-10 h-px my-0.5 bg-black" />
                        <div className="text-[7px] sm:text-[8px] font-black text-black leading-tight text-center">
                          <span className="block">أ. {sigs.viceName.split(' ')[0]}</span>
                          <span className="block">{sigs.viceName.split(' ').slice(1).join(' ')}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            </div>
            )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-center mt-4">
          <button onClick={() => onDownload(cert)}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer">
            <Download className="w-4 h-4" />
            تحميل PNG
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-white border-2 border-amber-500 text-amber-700 hover:bg-amber-50 font-bold rounded-xl text-xs transition-all cursor-pointer">
            <Eye className="w-4 h-4" />
            طباعة الشهادة
          </button>
        </div>
      </div>
    </div>
  );
};

const compressImageToBase64 = (file: File, maxWidth: number = 150, maxHeight: number = 150): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

interface MemberProfileProps {
  currentUser: UserProfile;
  selectedCertId?: string;
  targetUserId?: string;
  onNavigateToView?: (view: string, targetId?: string) => void;
  onGoBack?: () => void;
}

export const MemberProfile: React.FC<MemberProfileProps> = ({
  currentUser,
  selectedCertId,
  targetUserId,
  onNavigateToView,
  onGoBack
}) => {
  const { language, translateCommittee, translateDepartment } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine active profile to show (either targetUserId or currentUser)
  const activeUser = targetUserId 
    ? (db.getUsers().find(u => u.id === targetUserId) || currentUser) 
    : currentUser;

  const isOwnProfile = activeUser.id === currentUser.id;

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(activeUser);
  const [fullName, setFullName] = useState(activeUser.fullName || '');
  const [bio, setBio] = useState(activeUser.bio || '');
  const [phone, setPhone] = useState(activeUser.phoneNumber || '');
  const [avatarUrlInput, setAvatarUrlInput] = useState(activeUser.avatarUrl || '');
  const [isSaved, setIsSaved] = useState(false);
  const [transparentLogo, setTransparentLogo] = useState<string>('/eye-logo-premium.jpg');
  const [newSkillText, setNewSkillText] = useState('');
  const [isDownloadingCard, setIsDownloadingCard] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'goals' | 'disciplinary'>('profile');
  const [isAvatarProtected, setIsAvatarProtected] = useState<boolean>(activeUser.isAvatarProtected || false);
  const [linkedIn, setLinkedIn] = useState(activeUser.linkedInUrl || '');
  const [facebook, setFacebook] = useState(activeUser.facebookUrl || '');
  const [dob, setDob] = useState(activeUser.dateOfBirth || '');
  const [showPhoneToOthers, setShowPhoneToOthers] = useState<boolean>(activeUser.showPhoneToOthers !== false);
  const [showAvatarToOthers, setShowAvatarToOthers] = useState<boolean>(activeUser.showAvatarToOthers !== false);

  // Disciplinary records & Official document viewing
  const [disciplinaryRecords, setDisciplinaryRecords] = useState<DisciplinaryRecord[]>(() => {
    const all = db.getDisciplinaryRecords(currentUser) || [];
    return all.filter(r => r.memberId === activeUser.id || (r.memberName && r.memberName.trim() === activeUser.fullName.trim()));
  });
  const [viewingDisciplinary, setViewingDisciplinary] = useState<DisciplinaryRecord | null>(null);
  const [isDisciplinaryFullScreen, setIsDisciplinaryFullScreen] = useState(false);

  useEffect(() => {
    const loadDisc = () => {
      const all = db.getDisciplinaryRecords(currentUser) || [];
      const userDisc = all.filter(r => r.memberId === activeUser.id || (r.memberName && r.memberName.trim() === activeUser.fullName.trim()));
      setDisciplinaryRecords(userDisc);
    };
    loadDisc();
    const unsub = db.onChange(loadDisc);
    return () => unsub();
  }, [activeUser.id, activeUser.fullName]);

  // Auto-open disciplinary notice modal when arriving from a notification
  useEffect(() => {
    if (selectedCertId) {
      const allDisc = db.getDisciplinaryRecords(currentUser) || [];
      const matched = allDisc.find(r => r.id === selectedCertId || (r.memberId === activeUser.id && r.id === selectedCertId));
      if (matched) {
        setViewingDisciplinary(matched);
        setActiveTab('disciplinary');
      }
    }
  }, [selectedCertId, activeUser.id]);

  // Member Evaluation States
  const [evaluations, setEvaluations] = useState<MemberEvaluation[]>(() =>
    db.getMemberEvaluations(activeUser.id)
  );
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [commitmentRating, setCommitmentRating] = useState<number>(5);
  const [qualityRating, setQualityRating] = useState<number>(5);
  const [teamworkRating, setTeamworkRating] = useState<number>(5);
  const [activityRating, setActivityRating] = useState<number>(5);
  const [behaviorScoreInput, setBehaviorScoreInput] = useState<number>(10);
  const [interactionScoreInput, setInteractionScoreInput] = useState<number>(13);
  const [bonusInput, setBonusInput] = useState<number>(() => activeUser.bonusPoints || 0);
  const [evalComment, setEvalComment] = useState<string>('');
  const [isSubmittingEval, setIsSubmittingEval] = useState(false);
  const [evalSuccessMsg, setEvalSuccessMsg] = useState('');

  useEffect(() => {
    const refreshEvals = () => setEvaluations(db.getMemberEvaluations(activeUser.id));
    refreshEvals();
    const unsub = db.onChange(refreshEvals);
    return () => unsub();
  }, [activeUser.id]);

  const handlePrintDisciplinaryDoc = (rec: DisciplinaryRecord) => {
    const isNotice = rec.type === 'lft_nazar' || rec.severity === 'Notice';
    const titleHeading = isNotice ? 'لفت نظر' : 'إنذار';
    const noticeNo = rec.noticeNumber || '01';
    const meetingDay = rec.meetingDay || 'الاجتماع الدوري';
    const meetingDate = rec.meetingDate || new Date(rec.issuedAt).toLocaleDateString('ar-EG');
    const hrManager = rec.issuedByName || 'مسئول الموارد البشرية';
    const coordinator = rec.coordinator || 'منسق المحافظة';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert(language === 'ar' ? 'يرجى السماح بالنوافذ المنبثقة لطباعة المستند الرسمي' : 'Please allow popups to print');
      return;
    }

    const alertHtml = `<div style="margin-top: 30px; margin-bottom: 25px; text-align: center; color: #dc2626; border: 1.5px dashed #dc2626; padding: 12px 18px; border-radius: 12px; background-color: #fff5f5;">
      <div style="font-weight: 900; font-size: 16px; margin-bottom: 6px; display: flex; align-items: center; justify-content: center; gap: 6px;">
        <span style="font-size: 18px;">🛑</span> تنبية
      </div>
      <div style="font-size: 13.5px; font-weight: 700; line-height: 1.6;">
        نود إعلامكم أنه سيتم إنهاء المشاركة بالكيان بشكل رسمي في حال تلقي ثلاثة إنذارات , نرجو الالتزام بالتوجيهات لضمان استمرار مشاركتكم الفعالة.
      </div>
    </div>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>مستند رسمي - ${titleHeading} - ${rec.memberName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
          @page { size: A4; margin: 15mm; }
          body {
            font-family: 'Cairo', sans-serif;
            margin: 0;
            padding: 25px;
            background: #ffffff;
            color: #1e293b;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .container {
            border: 2px solid #0f172a;
            border-radius: 18px;
            padding: 30px;
            min-height: 90vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
          }
          .header-table { width: 100%; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
          .title-box {
            text-align: center;
            margin: 25px auto;
            background: ${isNotice ? '#fef3c7' : '#fee2e2'};
            border: 2px solid ${isNotice ? '#f59e0b' : '#ef4444'};
            color: ${isNotice ? '#92400e' : '#991b1b'};
            padding: 10px 40px;
            border-radius: 30px;
            font-size: 24px;
            font-weight: 900;
            display: inline-block;
          }
          .data-table { width: 100%; border-collapse: separate; border-spacing: 0 10px; margin-top: 15px; }
          .data-label { width: 30%; font-weight: 800; font-size: 15px; color: #475569; padding: 10px 15px; background: #f8fafc; border-radius: 8px 0 0 8px; border: 1px solid #e2e8f0; border-left: none; }
          .data-val { width: 70%; font-weight: 900; font-size: 16px; color: #0f172a; padding: 10px 15px; background: #ffffff; border-radius: 0 8px 8px 0; border: 1px solid #e2e8f0; border-right: none; }
          .footer-signatures { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; }
          .signature-box { text-align: center; width: 40%; }
          .signature-title { font-size: 14px; font-weight: 700; color: #64748b; margin-bottom: 8px; }
          .signature-name { font-size: 17px; font-weight: 900; color: #0f172a; border-bottom: 1.5px dashed #94a3b8; padding-bottom: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div>
            <table class="header-table">
              <tr>
                <td style="text-align: right; width: 33%;">
                  <div style="font-weight: 900; font-size: 17px; color: #1e3a8a;">جمهورية مصر العربية</div>
                  <div style="font-weight: 800; font-size: 14px; color: #475569;">وزارة الشباب والرياضة</div>
                  <div style="font-weight: 700; font-size: 13px; color: #059669;">الإدارة المركزية لتنمية الشباب</div>
                </td>
                <td style="text-align: center; width: 34%;">
                  <div style="font-weight: 900; font-size: 20px; color: #1e3a8a; letter-spacing: 2px;">كيان EYE الشبابي</div>
                  <div style="font-size: 12px; font-weight: 700; color: #64748b;">محافظة ${rec.governorate || 'الغربية'}</div>
                </td>
                <td style="text-align: left; width: 33%;">
                  <div style="font-weight: 800; font-size: 14px; color: #475569;">نموذج مستند إداري رسمي</div>
                  <div style="font-size: 12px; font-weight: 700; color: #64748b;">كود: ${rec.regulationCode || 'LN-01'}</div>
                </td>
              </tr>
            </table>

            <div style="text-align: center;">
              <div class="title-box">${titleHeading}</div>
            </div>

            ${alertHtml}

            <table class="data-table">
              <tr>
                <td class="data-label">اسم العضو:</td>
                <td class="data-val">${rec.memberName}</td>
              </tr>
              <tr>
                <td class="data-label">اللجنة / القسم:</td>
                <td class="data-val">${rec.committee || 'عام'}</td>
              </tr>
              <tr>
                <td class="data-label">المحافظة:</td>
                <td class="data-val">${rec.governorate || 'الغربية'}</td>
              </tr>
              <tr>
                <td class="data-label">رقم المعاملة:</td>
                <td class="data-val">${noticeNo}</td>
              </tr>
              <tr>
                <td class="data-label">يوم الاجتماع:</td>
                <td class="data-val">${meetingDay}</td>
              </tr>
              <tr>
                <td class="data-label">تاريخ الاجتماع:</td>
                <td class="data-val">${meetingDate}</td>
              </tr>
            </table>
          </div>

          <div class="footer-signatures">
            <div class="signature-box">
              <div class="signature-title">مسئول لجنة الموارد البشرية</div>
              <div class="signature-name">${hrManager}</div>
            </div>
            <div class="signature-box">
              <div class="signature-title">منسق عام المحافظة</div>
              <div class="signature-name">${coordinator}</div>
            </div>
          </div>
        </div>
        <script>
          window.onload = () => { window.print(); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const targetIsLeaderOrAbove = ['Leader', 'Vice', 'Super Admin', 'Coordinator', 'Deputy Coordinator'].includes(activeUser.role);
  const isExecOrVice = ['Super Admin', 'Coordinator', 'Deputy Coordinator', 'Vice'].includes(currentUser.role);
  const canEvaluateTarget = !isOwnProfile && (
    isExecOrVice || (currentUser.role === 'Leader' && !targetIsLeaderOrAbove)
  );

  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEval(true);

    const mappedCommitment = Math.min(5, Math.max(0, Math.round(((behaviorScoreInput / 10) * 5) * 10) / 10));
    const mappedTeamwork = Math.min(5, Math.max(0, Math.round(((interactionScoreInput / 13) * 5) * 10) / 10));
    const overall = Math.round(((mappedCommitment + mappedTeamwork) / 2) * 10) / 10;
    
    db.addMemberEvaluation({
      targetUserId: activeUser.id,
      targetUserName: activeUser.fullName,
      targetUserRole: activeUser.role,
      committee: activeUser.committee,
      department: activeUser.department,
      evaluatorId: currentUser.id,
      evaluatorName: currentUser.fullName,
      evaluatorRole: currentUser.role,
      overallRating: overall,
      commitmentRating: mappedCommitment,
      qualityRating: mappedCommitment,
      teamworkRating: mappedTeamwork,
      activityRating: mappedTeamwork,
      feedbackComment: evalComment.trim(),
    }, currentUser);

    await db.updateUserBonusPoints(activeUser.id, bonusInput, currentUser);

    setEvaluations(db.getMemberEvaluations(activeUser.id));
    setIsSubmittingEval(false);
    setShowEvalModal(false);
    setEvalComment('');
    setEvalSuccessMsg(language === 'ar' ? 'تم حفظ نقاط التقييم الإداري والبونص وتحديث الـ AVG بنجاح! ⭐' : 'Evaluation & AVG points saved successfully!');
    setTimeout(() => setEvalSuccessMsg(''), 4000);
  };

  const handleDownloadCard = async () => {
    try {
      setIsDownloadingCard(true);
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 760;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const isExec = ['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator'].includes(userProfile.role);
      const isLeader = userProfile.role === 'Leader';

      // 1. Background Luxury Metallic Linear Gradient
      const grad = ctx.createLinearGradient(0, 0, 1200, 760);
      if (isExec) {
        grad.addColorStop(0, '#0a1226');
        grad.addColorStop(0.45, '#381e05');
        grad.addColorStop(1, '#120a02');
      } else if (isLeader) {
        grad.addColorStop(0, '#1c0d02');
        grad.addColorStop(0.5, '#4d2506');
        grad.addColorStop(1, '#241103');
      } else {
        grad.addColorStop(0, '#061024');
        grad.addColorStop(0.5, '#102347');
        grad.addColorStop(1, '#040a17');
      }

      // Draw Card Outer Shape
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(30, 30, 1140, 700, 48);
      ctx.fill();

      // Outer Golden Metallic Border
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 6;
      ctx.stroke();

      // Radial Light Glow Effect
      const radial = ctx.createRadialGradient(600, 100, 50, 600, 100, 500);
      radial.addColorStop(0, 'rgba(251, 191, 36, 0.25)');
      radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = radial;
      ctx.beginPath();
      ctx.roundRect(30, 30, 1140, 700, 48);
      ctx.fill();

      // Holographic Side Strip
      const holoGrad = ctx.createLinearGradient(1070, 100, 1070, 660);
      holoGrad.addColorStop(0, 'rgba(253, 224, 71, 0.5)');
      holoGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.15)');
      holoGrad.addColorStop(1, 'rgba(253, 224, 71, 0.5)');
      ctx.fillStyle = holoGrad;
      ctx.beginPath();
      ctx.roundRect(1080, 100, 24, 520, 12);
      ctx.fill();

      // Load EYE Logo Image
      const logoImg = new Image();
      logoImg.crossOrigin = 'Anonymous';
      logoImg.src = '/eye-logo-transparent.png';
      await new Promise((res) => { logoImg.onload = res; logoImg.onerror = res; });

      // Circular EYE Logo Badge with Golden Ring (Top Right)
      ctx.save();
      ctx.beginPath();
      ctx.arc(1040, 120, 48, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(1040, 120, 42, 0, Math.PI * 2);
      ctx.fillStyle = '#071430';
      ctx.fill();
      ctx.clip();
      ctx.drawImage(logoImg, 998, 78, 84, 84);
      ctx.restore();

      // Brand Typography
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px "Cairo", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(language === 'ar' ? 'كيان المصريون الشباب' : 'Egyptian Youth Entity', 970, 115);
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 17px monospace';
      ctx.fillText('EYE ORGANIZATION', 970, 142);

      // Role Badge (Top Left)
      const roleBadgeText = isExec
        ? (language === 'ar' ? 'قيادة الكيان (VIP)' : 'Executive Leadership')
        : isLeader
        ? (language === 'ar' ? 'قائد لجنة معتمد' : 'Certified Leader')
        : (language === 'ar' ? 'عضوية عاملة' : 'Active Member');

      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.roundRect(80, 95, 260, 46, 23);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px "Cairo", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(roleBadgeText, 210, 124);

      // Load Avatar Image
      const avatarImg = new Image();
      avatarImg.crossOrigin = 'Anonymous';
      avatarImg.src = userProfile.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userProfile.fullName)}`;
      await new Promise((res) => { avatarImg.onload = res; avatarImg.onerror = res; });

      // Member Avatar Frame (Golden Rounded Square)
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(80, 240, 175, 175, 30);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(86, 246, 163, 163, 24);
      ctx.clip();
      ctx.drawImage(avatarImg, 86, 246, 163, 163);
      ctx.restore();

      // SIM Microchip Vector
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(80, 450, 75, 55, 12);
      ctx.fillStyle = '#fde047';
      ctx.fill();
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Member Full Name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px "Cairo", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(userProfile.fullName, 1020, 290);

      // ID Code
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 26px monospace';
      ctx.fillText(`ID: ${userProfile.membershipCode || 'EYE-1001'}`, 1020, 340);

      // Committee & Department
      const commText = translateCommittee(userProfile.committee);
      const deptText = userProfile.department && userProfile.department !== 'None' ? translateDepartment(userProfile.department) : '';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 24px "Cairo", sans-serif';
      ctx.fillText(deptText ? `${commText} • ${deptText}` : commText, 1020, 395);

      // ─────────────────────────────────────────────────────────────
      // OFFICIAL ENTITY SEAL STAMP (ختم الكيان الرسمي - أسفل اليسار)
      // ─────────────────────────────────────────────────────────────
      ctx.save();
      ctx.translate(210, 515);
      ctx.rotate(-0.2); // Authentic rubber stamp tilt

      // Outer Thick Red Stamp Circle
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 56, 0, Math.PI * 2);
      ctx.stroke();

      // Inner Fine Red Stamp Circle
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 48, 0, Math.PI * 2);
      ctx.stroke();

      // Tinted Background Wash
      ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
      ctx.beginPath();
      ctx.arc(0, 0, 56, 0, Math.PI * 2);
      ctx.fill();

      // Official Stamp Text Elements
      ctx.fillStyle = '#fca5a5';
      ctx.textAlign = 'center';
      ctx.font = 'bold 9px "Cairo", sans-serif';
      ctx.fillText('★ EGYPTIAN YOUTH ENTITY ★', 0, -32);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 14px "Cairo", sans-serif';
      ctx.fillText('معتمد رسمياً', 0, -10);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('EYE GHARBIA', 0, 8);

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 9px "Cairo", sans-serif';
      ctx.fillText('محافظة الغربية', 0, 24);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('SEAL 2026', 0, 38);

      ctx.restore();

      // Footer Divider Line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(80, 620);
      ctx.lineTo(1020, 620);
      ctx.stroke();

      // Footer Expiry & Official Label
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('EXP: 12/2026', 80, 665);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = 'bold 18px "Cairo", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(language === 'ar' ? 'البطاقة الرقمية الرسمية — كيان المصريون الشباب' : 'Official Digital Membership Card', 1020, 665);

      // Trigger Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `كارت عضوية - ${userProfile.fullName.trim()}.png`;
      link.click();
    } catch (err) {
      console.error('Failed to download ID card', err);
    } finally {
      setIsDownloadingCard(false);
    }
  };

  // Load premium logo inside state on mount
  useEffect(() => {
    const img = new Image();
    img.src = '/eye-logo-premium.jpg';
    img.onload = () => setTransparentLogo(img.src);
    img.onerror = () => setTransparentLogo('/eye-logo-transparent.png');
  }, []);

  // Certificates: read from db cache so any new cert (issued on this device or
  // fetched from Supabase realtime) shows up immediately on the profile.
  const [myCertificates, setMyCertificates] = useState<IssuedCertificate[]>(() =>
    db.getMyCertificates(activeUser.id)
  );
  const [showCert, setShowCert] = useState<IssuedCertificate | null>(null);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [includeAvatarInPrint, setIncludeAvatarInPrint] = useState(true);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  // Image Cropper & Adjuster States
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState<number>(1);
  const [cropX, setCropX] = useState<number>(0);
  const [cropY, setCropY] = useState<number>(0);
  const [cropRotation, setCropRotation] = useState<number>(0);
  const [cropDimension, setCropDimension] = useState<number>(200);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Sync user profile state with active user changes
  useEffect(() => {
    setUserProfile(activeUser);
    setFullName(activeUser.fullName || '');
    setBio(activeUser.bio || '');
    setPhone(activeUser.phoneNumber || '');
    setAvatarUrlInput(activeUser.avatarUrl || '');
    setIsAvatarProtected(activeUser.isAvatarProtected || false);
    setLinkedIn(activeUser.linkedInUrl || '');
    setShowPhoneToOthers(activeUser.showPhoneToOthers !== false);
    setShowAvatarToOthers(activeUser.showAvatarToOthers !== false);
  }, [activeUser, targetUserId, currentUser]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setCropX(prev => prev + dx);
    setCropY(prev => prev + dy);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.x;
    const dy = e.touches[0].clientY - dragStart.y;
    setCropX(prev => prev + dx);
    setCropY(prev => prev + dy);
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    // Fetch logs specific to activeUser
    const allLogs = db.getLogs();
    setLogs(allLogs.filter(l => l.userId === activeUser.id));
  }, [activeUser.id, currentUser]);

  // Keep "My Certificates" in sync with activeUser
  useEffect(() => {
    const refreshCerts = () => setMyCertificates(db.getMyCertificates(activeUser.id));
    refreshCerts();
    const unsubscribe = db.onChange(refreshCerts);
    return () => unsubscribe();
  }, [activeUser.id]);

  // Auto-open certificate modal if selectedCertId is provided from notification click
  useEffect(() => {
    if (selectedCertId) {
      const targetCert = myCertificates.find(c => c.id === selectedCertId);
      if (targetCert) {
        setShowCert(targetCert);
      }
    }
  }, [selectedCertId, myCertificates]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Validate it's an image
    if (!file.type.startsWith('image/')) {
      setAvatarError(language === 'ar' ? 'يرجى اختيار ملف صورة صالح.' : 'Please select a valid image file.');
      return;
    }

    // Validate size (max 8MB for cropping)
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > 8) {
      setAvatarError(language === 'ar' ? 'حجم الصورة يجب ألا يتجاوز ٨ ميجابايت.' : 'Image size must not exceed 8 MB.');
      return;
    }

    setAvatarError('');
    setIsUploadingAvatar(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      setCropImageSrc(event.target?.result as string);
      setCropZoom(1);
      setCropX(0);
      setCropY(0);
      setCropRotation(0);
      setCropDimension(250); // Default to 250x250 (medium quality)
      setIsUploadingAvatar(false);
    };
    reader.onerror = () => {
      setAvatarError(language === 'ar' ? 'فشل قراءة ملف الصورة.' : 'Failed to read image file.');
      setIsUploadingAvatar(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCrop = async () => {
    if (!cropImageSrc) return;

    setIsUploadingAvatar(true);
    setAvatarError('');
    const srcToCrop = cropImageSrc;
    setCropImageSrc(null); // Close modal

    try {
      // 1. Create an Image object
      const img = new Image();
      img.src = srcToCrop;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // 2. Setup Canvas
      const canvas = document.createElement('canvas');
      canvas.width = cropDimension;
      canvas.height = cropDimension;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Clear canvas with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cropDimension, cropDimension);

      // Translate context to center to handle rotation & scaling
      ctx.translate(cropDimension / 2, cropDimension / 2);
      ctx.rotate((cropRotation * Math.PI) / 180);

      // Draw image using the offsets and zoom
      // The preview container is 256px wide. We scale coordinates to match the output canvas.
      const scaleFactor = cropDimension / 256;

      // Compute width and height maintaining image aspect ratio relative to preview box (256px)
      let w = 256;
      let h = 256;
      const aspect = img.width / img.height;
      if (aspect > 1) {
        h = 256 / aspect;
      } else {
        w = 256 * aspect;
      }

      const drawWidth = w * cropZoom * scaleFactor;
      const drawHeight = h * cropZoom * scaleFactor;
      const drawX = cropX * scaleFactor - drawWidth / 2;
      const drawY = cropY * scaleFactor - drawHeight / 2;

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

      // 3. Export to base64 Data URL (JPEG, 80% quality)
      const finalBase64 = canvas.toDataURL('image/jpeg', 0.8);

      // 4. Update database profile
      db.updateProfile(currentUser.id, { avatarUrl: finalBase64 }, currentUser);

      // Update local state
      setUserProfile(prev => ({ ...prev, avatarUrl: finalBase64 }));
    } catch (err: any) {
      console.error('Avatar cropping/upload error:', err);
      setAvatarError(
        language === 'ar'
          ? `فشل حفظ وتعديل الصورة: ${err.message || 'خطأ غير معروف'}`
          : `Failed to crop and save avatar: ${err.message || 'Unknown error'}`
      );
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input value so user can select the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = () => {
    db.updateProfile(currentUser.id, { avatarUrl: '' }, currentUser);
    setUserProfile(prev => ({ ...prev, avatarUrl: '' }));
    setAvatarUrlInput('');
    setAvatarError('');
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const newName = fullName.trim() || userProfile.fullName;

    let formattedLinkedIn = linkedIn.trim();
    if (formattedLinkedIn && !formattedLinkedIn.startsWith('http://') && !formattedLinkedIn.startsWith('https://')) {
      formattedLinkedIn = 'https://' + formattedLinkedIn;
    }
    let formattedFacebook = facebook.trim();
    if (formattedFacebook && !formattedFacebook.startsWith('http://') && !formattedFacebook.startsWith('https://')) {
      formattedFacebook = 'https://' + formattedFacebook;
    }

    const updates: Partial<UserProfile> = {
      fullName: newName,
      bio,
      phoneNumber: phone,
      avatarUrl: getPermanentStorageUrl(avatarUrlInput.trim()),
      isAvatarProtected,
      linkedInUrl: formattedLinkedIn,
      facebookUrl: formattedFacebook,
      dateOfBirth: dob,
      showPhoneToOthers,
      showAvatarToOthers,
    };
    db.updateProfile(currentUser.id, updates, currentUser);
    if (dob) {
      db.updateUserDateOfBirth(currentUser.id, dob);
    }
    const updated = { ...userProfile, ...updates };
    setUserProfile(updated);

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const getLogColor = (action: string) => {
    switch (action) {
      case 'Login':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Task Submission':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Registration':
        return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'Profile Update':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarChange}
        accept="image/*"
        className="hidden"
      />
      <style>{`
        @media print {
          body, html {
            background: white !important;
            color: black !important;
          }
          #profile-management-view, .no-print, header, nav, aside {
            display: none !important;
          }
        }
      `}</style>

      {/* Printable Portfolio Layout (Only visible during printing) */}
      <div className="hidden print:block w-full max-w-4xl mx-auto p-8 bg-white text-slate-900 border-2 border-slate-200 rounded-3xl space-y-6 font-sans" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {/* Header Header */}
        <div className="flex justify-between items-center border-b-2 border-amber-500 pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black">{userProfile.fullName}</h1>
            {currentUser.role !== 'Member' && <p className="text-xs font-mono font-bold text-slate-500">{userProfile.membershipCode}</p>}
          </div>
          <div className="text-end">
            <h2 className="text-base font-bold text-amber-600">{language === 'ar' ? 'كيان المصريون الشباب (EYE)' : 'Egyptian Young Entity (EYE)'}</h2>
            <p className="text-[10px] text-slate-500">Official Membership Portfolio</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs mt-4">
          <div>
            <p><strong>{language === 'ar' ? 'الدور:' : 'Role:'}</strong> {userProfile.role}</p>
            <p><strong>{language === 'ar' ? 'اللجنة:' : 'Committee:'}</strong> {translateCommittee(userProfile.committee)}</p>
            {userProfile.department && userProfile.department !== 'None' && (
              <p><strong>{language === 'ar' ? 'القسم:' : 'Department:'}</strong> {translateDepartment(userProfile.department)}</p>
            )}
          </div>
          <div className="text-end">
            <p><strong>{language === 'ar' ? 'تاريخ الانضمام:' : 'Joined:'}</strong> {new Date(userProfile.joinedDate).toLocaleDateString()}</p>
            <p><strong>{language === 'ar' ? 'البريد الإلكتروني:' : 'Email:'}</strong> {userProfile.email}</p>
          </div>
        </div>

        {/* Bio */}
        {userProfile.bio && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs mt-4">
            <h3 className="font-bold text-slate-800 mb-1">{language === 'ar' ? 'نبذة شخصية' : 'About Me'}</h3>
            <p className="italic">{userProfile.bio}</p>
          </div>
        )}

        {/* Skills */}
        <div className="space-y-2 mt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 border-b border-slate-200 pb-1">
            {language === 'ar' ? 'المهارات والخبرات المعتمَدة' : 'Skills & Endorsements'}
          </h3>
          {userProfile.skills && userProfile.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {userProfile.skills.map(s => {
                const ends = userProfile.endorsements?.[s] || [];
                return (
                  <span key={s} className="text-[10px] bg-slate-100 px-3 py-1 rounded-full font-bold">
                    {s} {ends.length > 0 && `(✓ ${ends.length})`}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">{language === 'ar' ? 'لا توجد مهارات.' : 'No skills listed.'}</p>
          )}
        </div>

        {/* Certificates */}
        <div className="space-y-3 mt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 border-b border-slate-200 pb-1">
            {language === 'ar' ? 'الشهادات والتكريمات الرسمية' : 'Official Certificates'}
          </h3>
          {myCertificates.length > 0 ? (
            <div className="space-y-2">
              {myCertificates.map(c => (
                <div key={c.id} className="text-xs p-3 bg-amber-50/30 border border-amber-100 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="font-extrabold text-slate-800">{c.title}</p>
                    <p className="text-[10px] text-slate-500">Issued by: {c.issuedByName}</p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{new Date(c.issuedAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">{language === 'ar' ? 'لم تصدر أي شهادات بعد.' : 'No certificates awarded yet.'}</p>
          )}
        </div>
        
        {/* Verification seal */}
        <div className="pt-8 border-t border-slate-100 flex justify-between items-end mt-6">
          <div className="text-[10px] text-slate-400">
            <p>EYE Workflow Hub Portfolio System</p>
            <p>Verification Code: {userProfile.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div className="text-center space-y-1">
            <div className="relative w-28 h-28 rounded-full border-2 border-red-500 bg-red-50/20 flex items-center justify-center p-2 -rotate-12 mx-auto shadow-sm" style={{ borderColor: '#ef4444' }}>
              <div className="w-18 h-18 rounded-full border-2 border-double border-red-500 flex flex-col items-center justify-center p-1 text-center bg-white/80 dark:bg-slate-900/80">
                <span className="text-[4.5px] font-black text-red-600 leading-none">★ EGYPTIAN YOUTH ENTITY ★</span>
                <img src="/eye-logo-transparent.png" alt="seal logo" className="w-7 h-7 object-contain my-0.5" />
                <span className="text-[5px] font-bold text-red-600 font-mono leading-none">EYE GHARBIA</span>
              </div>
            </div>
            <p className="text-[9px] font-black text-red-700">{language === 'ar' ? 'ختم اعتماد الكيان الرسمي' : 'Official Entity Stamp'}</p>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 text-slate-800 print:hidden" id="profile-management-view" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {!isOwnProfile && (
          <div className="lg:col-span-12 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 p-3.5 rounded-2xl">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-xs">
              <User className="w-4 h-4 text-amber-500" />
              <span>{language === 'ar' ? `تصفح الملف الشخصي للعضو: ${activeUser.fullName}` : `Browsing Member Profile: ${activeUser.fullName}`}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onGoBack ? onGoBack() : window.history.back()}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'الرجوع للمكان السابق ↩️' : 'Go Back ↩️'}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateToView?.('profile', currentUser.id)}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                {language === 'ar' ? 'ملفي الشخصي' : 'My Profile'}
              </button>
            </div>
          </div>
        )}

        {/* Top action bar */}
        <div className="lg:col-span-12 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-3xl shadow-sm no-print">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === 'profile' ? 'bg-eye-brand text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <User className="w-4 h-4" />
              <span>{language === 'ar' ? 'الملف الشخصي' : 'Profile'}</span>
            </button>
            <button
              onClick={() => setActiveTab('goals')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === 'goals' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>{language === 'ar' ? 'أهدافي الشخصية (Career Compass)' : 'My Goals'}</span>
            </button>
            <button
              onClick={() => setActiveTab('disciplinary')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === 'disciplinary' ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-red-500 group-hover:text-red-400" />
              <span>{language === 'ar' ? 'السجل الانضباطي والإنذارات 📜' : 'Disciplinary & Notices 📜'}</span>
              {disciplinaryRecords.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {disciplinaryRecords.length}
                </span>
              )}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
            <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all select-none border border-slate-200 dark:border-slate-700">
              <input
                type="checkbox"
                checked={includeAvatarInPrint}
                onChange={e => setIncludeAvatarInPrint(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>{language === 'ar' ? '🖼️ إدراج الصورة الشخصية بالوثيقة' : '🖼️ Include Photo'}</span>
            </label>
            <button
              type="button"
              onClick={handleDownloadCard}
              disabled={isDownloadingCard}
              className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black px-4 py-2 rounded-xl text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <Award className="w-4 h-4 text-amber-300" />
              <span>{isDownloadingCard ? (language === 'ar' ? 'جاري تجهيز الكارت...' : 'Generating ID...') : (language === 'ar' ? 'تحميل كارت العضوية الرقمي (Digital ID 🎴)' : 'Download Digital ID 🎴')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const avatarSrc = activeUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(activeUser.fullName)}`;
                const bodyHtml = `
                  <div style="background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%); border: 2px solid #1b4cd3; padding: 18px; border-radius: 16px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(27, 76, 211, 0.08);">
                    <table style="width: 100%; border-collapse: collapse; border: none; margin: 0;">
                      <tr style="background: transparent;">
                        ${includeAvatarInPrint ? `
                          <td style="border: none; padding: 0 16px 0 0; width: 90px; vertical-align: middle;">
                            <img src="${avatarSrc}" style="width: 80px; height: 80px; border-radius: 18px; border: 3px solid #1b4cd3; object-fit: cover; box-shadow: 0 4px 12px rgba(27, 76, 211, 0.2);" alt="${activeUser.fullName}" />
                          </td>
                        ` : ''}
                        <td style="border: none; padding: 0; text-align: right; vertical-align: middle;">
                          <span style="background: #1b4cd3; color: #ffffff; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 800; display: inline-block; margin-bottom: 8px;">سجل العضوية والتقييمات المعتمدة</span>
                          <h2 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 900; color: #0c1e4d;">${activeUser.fullName}</h2>
                          <div style="font-size: 12px; font-weight: 800; color: #1b4cd3; margin-bottom: 6px;">
                            ${activeUser.role} ✦ ${activeUser.committee} (${activeUser.department || 'الإدارة العامة'})
                          </div>
                          <div style="font-size: 11px; font-weight: 700; color: #475569;">
                            <strong>الكود التنظيمي:</strong> <span style="font-family: monospace; font-weight: 900; color: #1b4cd3;">${activeUser.membershipCode || 'EYE-MEMBER'}</span> | 
                            <strong>تاريخ الانضمام:</strong> ${activeUser.joinedDate || '2024-01-01'} | 
                            <strong>الحالة الحالية:</strong> <span style="color: #059669; font-weight: 900;">${String(activeUser.status) === 'نشط' || String(activeUser.status) === 'active' ? 'عضو نشط معتمد 🟢' : String(activeUser.status)}</span>
                          </div>
                        </td>
                        <td style="border: none; padding: 0; width: 120px; text-align: left; vertical-align: middle;">
                          <div style="background: #ffffff; border: 2px solid #2b66ff; padding: 10px 14px; border-radius: 12px; text-align: center;">
                            <div style="font-size: 9px; font-weight: 800; color: #64748b; uppercase">نقاط التميز</div>
                            <div style="font-size: 24px; font-weight: 900; color: #1b4cd3;">${(activeUser as any).points || 150}</div>
                            <div style="font-size: 8px; font-weight: 800; color: #059669;">نقطة معتمدة</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <h3 style="font-size: 14px; font-weight: 900; color: #0c1e4d; border-bottom: 2px solid #1b4cd3; padding-bottom: 6px; margin-bottom: 12px;">📊 سجل البيانات والأداء التنظيمي الموثق:</h3>

                  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                    <tbody>
                      <tr>
                        <th style="width: 25%; background: #1b4cd3; color: white; padding: 10px; font-size: 11px; text-align: right;">البريد الإلكتروني الرسمي</th>
                        <td style="padding: 10px; font-size: 11px; font-weight: 700; font-family: monospace;">${activeUser.email}</td>
                        <th style="width: 25%; background: #1b4cd3; color: white; padding: 10px; font-size: 11px; text-align: right;">رقم الهاتف التواصل</th>
                        <td style="padding: 10px; font-size: 11px; font-weight: 700; font-family: monospace;">${(activeUser as any).phone || '—'}</td>
                      </tr>
                      <tr>
                        <th style="background: #1b4cd3; color: white; padding: 10px; font-size: 11px; text-align: right;">نطاق التواجد / النطاق</th>
                        <td style="padding: 10px; font-size: 11px; font-weight: 700;">محافظة الغربية — كيان EYE</td>
                        <th style="background: #1b4cd3; color: white; padding: 10px; font-size: 11px; text-align: right;">التقييم القيادي العام</th>
                        <td style="padding: 10px; font-size: 11px; font-weight: 900; color: #059669;">${activeUser.rating ? `${activeUser.rating} / 5 ⭐` : 'ممتاز (5 / 5) ⭐'}</td>
                      </tr>
                      <tr>
                        <th style="background: #1b4cd3; color: white; padding: 10px; font-size: 11px; text-align: right;">المهارات والتخصصات</th>
                        <td colSpan="3" style="padding: 10px; font-size: 11px; font-weight: 700; color: #334155;">${activeUser.skills?.join(' • ') || 'مهارات قيادية، تنظيم الفعاليات، إدارة التكليفات، العمل الجماعي'}</td>
                      </tr>
                      <tr>
                        <th style="background: #1b4cd3; color: white; padding: 10px; font-size: 11px; text-align: right;">الملخص والتوجيه القيادي</th>
                        <td colSpan="3" style="padding: 10px; font-size: 11px; font-weight: 600; color: #1e293b; line-height: 1.7;">
                          ${activeUser.bio || 'متطوع متميز بكيان المصريون الشباب بمحافظة الغربية، ملتزم بأخلاقيات ومتطلبات العمل التطوعي المؤسسي ويتمتع بروح فريق عالية.'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                `;

                printDedicatedOfficialDocument({
                  title: `سجل إنجازات وتفاصيل العضو — ${activeUser.fullName}`,
                  docNumber: activeUser.membershipCode || `EYE-PROF-${activeUser.id.slice(-4).toUpperCase()}`,
                  bodyHtml,
                  signatures: [
                    { title: 'مسؤول لجنة الموارد البشرية', name: 'أحمد إبراهيم' }
                  ]
                });
              }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold px-4 py-2 rounded-xl text-xs hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              {language === 'ar' ? 'تصدير المستند الرسمي (PDF)' : 'Export Official PDF'}
            </button>

            <button
              type="button"
              onClick={() => {
                const profileCardJson = JSON.stringify({
                  fullName: activeUser.fullName,
                  role: activeUser.role,
                  committee: activeUser.committee,
                  code: activeUser.membershipCode || 'EYE-MEMBER',
                  joinedDate: activeUser.joinedDate || '2024-01-01',
                  points: (activeUser as any).points || 150,
                  status: 'عضو نشط معتمد'
                });

                let fullProfileBody = `[MEMBER_PROFILE_CARD_JSON]${profileCardJson}\n\n`;
                fullProfileBody += `📌 بيانات وسجل العضوية الرسمي المعتمد:\n`;
                fullProfileBody += `═════════════════════════════════════════════════════\n\n`;

                fullProfileBody += `  • الاسم الكامل للعضو : ${activeUser.fullName}\n`;
                fullProfileBody += `  • الكود التنظيمي المعتمد : ${activeUser.membershipCode || 'EYE-MEMBER'}\n`;
                fullProfileBody += `  • المنصب والدور الإداري : ${activeUser.role}\n`;
                fullProfileBody += `  • اللجنة والقسم التابع : ${activeUser.committee} (${activeUser.department || 'الإدارة العامة'})\n`;
                fullProfileBody += `  • تاريخ الانضمام الرسمي : ${activeUser.joinedDate || '2024-01-01'}\n`;
                fullProfileBody += `  • نطاق التواجد التنظيمي : محافظة الغربية — كيان EYE\n`;
                fullProfileBody += `  • نقاط التميز المعتمدة : ${(activeUser as any).points || 150} نقطة تميز\n\n`;

                fullProfileBody += `📊 سجل الأداء والتقييم القيادي الموثق:\n`;
                fullProfileBody += `─────────────────────────────────────────────────────\n`;
                fullProfileBody += `  ▫️ البريد الإلكتروني الرسمي : ${activeUser.email}\n`;
                fullProfileBody += `  ▫️ رقم الهاتف للتواصل : ${(activeUser as any).phone || '—'}\n`;
                fullProfileBody += `  ▫️ درجة التقييم القيادي العام : ${activeUser.rating ? `${activeUser.rating} / 5 ⭐` : 'ممتاز (5 / 5) ⭐'}\n`;
                fullProfileBody += `  ▫️ الحالة التنظيمية الحالية : عضو نشط معتمد 🟢\n\n`;

                fullProfileBody += `⭐ المهارات والتخصصات التنفيذية:\n`;
                fullProfileBody += `─────────────────────────────────────────────────────\n`;
                fullProfileBody += `  • ${activeUser.skills?.join(' • ') || 'مهارات قيادية • تنظيم الفعاليات • إدارة التكليفات • العمل الجماعي'}\n\n`;

                if (activeUser.bio) {
                  fullProfileBody += `📌 نبذة وتوصية الإدارة القيادية:\n`;
                  fullProfileBody += `─────────────────────────────────────────────────────\n`;
                  fullProfileBody += `${activeUser.bio}\n\n`;
                }

                fullProfileBody += `═════════════════════════════════════════════════════\n`;
                fullProfileBody += `              • الاعتماد والتوقيعات الرسمية •\n`;
                fullProfileBody += `═════════════════════════════════════════════════════\n\n`;

                fillAndDownloadDocxTemplate('bg_report', {
                  memberName: activeUser.fullName,
                  committeeName: activeUser.committee,
                  governorate: 'محافظة الغربية',
                  reportTitle: `سجل بيانات وتقييمات الملف الشخصي — ${activeUser.fullName}`,
                  reportBody: fullProfileBody,
                  hrManager: 'أحمد إبراهيم'
                });
              }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{language === 'ar' ? 'تصدير Word (.docx) الأصلي' : 'Export Original Word (.docx)'}</span>
            </button>
          </div>
        </div>

        {activeTab === 'goals' ? (
          <div className="lg:col-span-12">
            <CareerCompass currentUser={activeUser} />
          </div>
        ) : activeTab === 'disciplinary' ? (
          <div className="lg:col-span-12 space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-950 text-white p-6 sm:p-8 rounded-3xl border border-red-800/40 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1 text-start">
                <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{language === 'ar' ? 'السجل الانضباطي والإنذارات الرسمية' : 'Official Warning & Disciplinary Vault'}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black">
                  {language === 'ar' ? `سجل التنبيهات والإنذارات — ${activeUser.fullName}` : `Disciplinary Records — ${activeUser.fullName}`}
                </h2>
                <p className="text-xs text-red-200/80 font-medium">
                  {language === 'ar' ? 'حصر وتوثيق لفتات النظر والإنذارات الرسمية الصادرة وفق اللائحة التنظيمية المعتمدة لكيان EYE.' : 'Official warnings and disciplinary records issued under approved EYE bylaws.'}
                </p>
              </div>

              {/* Status Indicator */}
              <div className="px-4 py-2.5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${disciplinaryRecords.length === 0 ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs font-black">
                  {disciplinaryRecords.length === 0 
                    ? (language === 'ar' ? 'السجل نظيف 100% ✨' : 'Clean Record ✨')
                    : (language === 'ar' ? `${disciplinaryRecords.length} إجراء مسجل ⚠️` : `${disciplinaryRecords.length} Records ⚠️`)}
                </span>
              </div>
            </div>

            {/* Warnings Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/40 p-5 rounded-2xl shadow-sm text-start space-y-1">
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">{language === 'ar' ? 'لفت النظر الشفوي / الإداري' : 'Oral / Admin Notices'}</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {disciplinaryRecords.filter(r => r.type === 'lft_nazar' || r.severity === 'Notice').length}
                </p>
                <p className="text-[10px] text-slate-400 font-bold">{language === 'ar' ? 'تنبيه إداري أولي للتوجيه والالتزام' : 'First guidance note'}</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-red-200/60 dark:border-red-900/40 p-5 rounded-2xl shadow-sm text-start space-y-1">
                <span className="text-[11px] font-bold text-red-600 dark:text-red-400">{language === 'ar' ? 'الإنذارات الرسمية المعتمدة' : 'Official Warnings'}</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {disciplinaryRecords.filter(r => r.type === 'inzar' || (r.severity && r.severity !== 'Notice')).length}
                </p>
                <p className="text-[10px] text-slate-400 font-bold">{language === 'ar' ? 'محتسب رسمياً ضمن سُلم الجزاءات (الحد: 3)' : 'Official ladder (Limit: 3)'}</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm text-start space-y-1">
                <span className="text-[11px] font-bold text-slate-500">{language === 'ar' ? 'الإنهاء التلقائي للمشاركة' : 'Termination Risk'}</span>
                <div className="flex items-center gap-1.5 pt-1">
                  {[1, 2, 3].map(step => {
                    const inzarCount = disciplinaryRecords.filter(r => r.type === 'inzar' || (r.severity && r.severity !== 'Notice')).length;
                    const filled = inzarCount >= step;
                    return (
                      <div
                        key={step}
                        className={`flex-1 h-3 rounded-full transition-all ${
                          filled ? 'bg-red-600 shadow-sm shadow-red-500/50' : 'bg-slate-200 dark:bg-slate-800'
                        }`}
                        title={`${language === 'ar' ? 'إنذار' : 'Warning'} ${step}`}
                      />
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 font-bold">{language === 'ar' ? '3 إنذارات = إنهاء المشاركة بالكيان' : '3 Warnings = Official Dismissal'}</p>
              </div>
            </div>

            {/* Official Warning Notice Alert Banner */}
            {disciplinaryRecords.length > 0 && (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-start flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-red-800 dark:text-red-300">
                    {language === 'ar' ? '🛑 تنبيه تنظيمي هام وفق اللائحة الداخلية' : '🛑 Important Regulatory Compliance Note'}
                  </h4>
                  <p className="text-xs text-red-700 dark:text-red-300/90 font-bold leading-relaxed">
                    {language === 'ar'
                      ? 'نود إعلامكم أنه سيتم إنهاء المشاركة بالكيان بشكل رسمي في حال تلقي ثلاثة إنذارات، نرجو الالتزام بالتوجيهات لضمان استمرار مشاركتكم الفعالة وخدمة وطننا.'
                      : 'Please note that participation in the entity will be formally terminated upon receiving 3 warnings. Please adhere to guidelines to ensure continued membership.'}
                  </p>
                </div>
              </div>
            )}

            {/* Disciplinary Records List */}
            <div className="space-y-4">
              {disciplinaryRecords.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {language === 'ar' ? 'السجل الانضباطي ناصع 100%! ✨' : 'Perfect Disciplinary Record! ✨'}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 max-w-md mx-auto">
                    {language === 'ar' 
                      ? 'لا توجد أي لفتات نظر أو إنذارات مسجلة بحق العضو. استمر في التميز والالتزام!'
                      : 'No disciplinary notices or warnings registered. Keep up the high standard of commitment!'}
                  </p>
                </div>
              ) : (
                disciplinaryRecords.map((rec, idx) => {
                  const isNotice = rec.type === 'lft_nazar' || rec.severity === 'Notice';
                  return (
                    <div
                      key={rec.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-start"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                          isNotice 
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-600'
                            : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-600'
                        }`}>
                          <ShieldAlert className="w-6 h-6" />
                        </div>

                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                              isNotice
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300'
                                : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300'
                            }`}>
                              {isNotice ? (language === 'ar' ? '⚠️ لفت نظر رسمي' : '⚠️ Official Notice') : (language === 'ar' ? '🔴 إنذار رسمي' : '🔴 Official Warning')}
                            </span>
                            {rec.noticeNumber && (
                              <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-300">
                                #{rec.noticeNumber}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(rec.issuedAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            {rec.reason || (language === 'ar' ? `بخصوص اجتماع يوم ${rec.meetingDay || ''} ${rec.meetingDate || ''}` : 'Administrative violation note')}
                          </p>

                          <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400 font-bold pt-1">
                            <span>{language === 'ar' ? 'صادر بواسطة' : 'Issued by'}: {rec.issuedByName || 'مسئول الموارد البشرية'}</span>
                            {rec.coordinator && <span>• {language === 'ar' ? 'المنسق' : 'Coordinator'}: {rec.coordinator}</span>}
                            {rec.meetingDate && <span>• {language === 'ar' ? 'الاجتماع' : 'Meeting'}: {rec.meetingDay || ''} ({rec.meetingDate})</span>}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => setViewingDisciplinary(rec)}
                          className="px-4 py-2.5 bg-eye-brand hover:bg-eye-brand-dark text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          <span>{language === 'ar' ? 'معاينة المستند الرسمي 📜' : 'View Document 📜'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintDisciplinaryDoc(rec)}
                          className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
                          title={language === 'ar' ? 'طباعة المستند الرسمي' : 'Print document'}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
        <>

      {/* Left side: Profile details & editable cards */}
      <div className="lg:col-span-4 space-y-6">
        {/* Profile Card — Custom Luxury VIP styling for Executive Leadership */}
        {(() => {
          const isExec = ['Super Admin', 'Coordinator', 'Deputy Coordinator', 'Leader', 'Vice'].includes(userProfile.role);
          const isSuperAdmin = userProfile.role === 'Super Admin';
          const isGovernorCoord = userProfile.role === 'Coordinator';
          const isDeputyCoord = userProfile.role === 'Deputy Coordinator';
          const isLeader = userProfile.role === 'Leader';
          const isVice = userProfile.role === 'Vice';

          return (
            <div className={`rounded-3xl p-6 text-center space-y-4 flex flex-col items-center shadow-lg relative overflow-hidden transition-all ${
              isExec 
                ? 'bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 border-2 border-amber-500/60 text-white shadow-amber-500/10' 
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white shadow-sm'
            }`}>
              
              {/* Executive Glowing Ambient Ornaments */}
              {isExec && (
                <>
                  <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 backdrop-blur-md flex items-center gap-1">
                    <span>👑 VIP EXECUTIVE</span>
                  </div>
                </>
              )}

              {/* Avatar Container with Animated Gold Ring & Badge */}
              <div className="relative group cursor-pointer mt-2" onClick={() => isOwnProfile && fileInputRef.current?.click()} title={isOwnProfile ? (language === 'ar' ? 'تغيير الصورة الشخصية' : 'Change Profile Picture') : ''}>
                <div className={`relative rounded-3xl p-1 ${
                  isExec 
                    ? 'bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-600 shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse' 
                    : 'bg-amber-500'
                }`}>
                  <img
                    src={userProfile.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userProfile.fullName)}`}
                    alt={userProfile.fullName}
                    onContextMenu={(e) => userProfile.isAvatarProtected && e.preventDefault()}
                    className={`w-24 h-24 sm:w-28 sm:h-28 rounded-[22px] object-cover shadow-md transition-opacity group-hover:opacity-85 bg-slate-800 ${
                      userProfile.isAvatarProtected && !isOwnProfile ? 'select-none pointer-events-none' : ''
                    }`}
                    referrerPolicy="no-referrer"
                  />
                  {userProfile.isAvatarProtected && !isOwnProfile && (
                    <div className="absolute top-2 start-2 z-20 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-amber-400/60 text-amber-300 text-[9px] font-extrabold flex items-center gap-1 shadow-md">
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>{language === 'ar' ? 'محمية 🔒' : 'Protected 🔒'}</span>
                    </div>
                  )}
                  {isOwnProfile && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-[22px] opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  )}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-[22px]">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>

                {/* VIP Floating Badge Symbol */}
                <div className={`absolute -bottom-2 -end-2 p-2 rounded-xl text-white border-2 border-slate-900 shadow-lg pointer-events-none ${
                  isSuperAdmin ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                  isGovernorCoord ? 'bg-gradient-to-r from-blue-600 to-indigo-600' :
                  isDeputyCoord ? 'bg-gradient-to-r from-amber-600 to-amber-800' :
                  isLeader ? 'bg-gradient-to-r from-emerald-600 to-teal-600' :
                  'bg-gradient-to-r from-purple-600 to-indigo-600'
                }`}>
                  {isSuperAdmin ? <Crown className="w-5 h-5 text-amber-200 animate-bounce" /> :
                   isGovernorCoord ? <span className="text-sm">🏛️</span> :
                   isDeputyCoord ? <span className="text-sm">⭐️</span> :
                   isLeader ? <Award className="w-4 h-4 text-white" /> :
                   <Star className="w-4 h-4 text-white" />}
                </div>
              </div>

              {/* Avatar Action Buttons (Change / Remove Photo) */}
              {isOwnProfile && (
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'تغيير الصورة' : 'Change Photo'}</span>
                  </button>
                  {userProfile.avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title={language === 'ar' ? 'إزالة الصورة الشخصية' : 'Remove Profile Picture'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'حذف' : 'Remove'}</span>
                    </button>
                  )}
                </div>
              )}
              {avatarError && (
                <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-[11px] font-bold max-w-xs text-center">
                  {avatarError}
                </div>
              )}

              {/* Title & Code */}
              <div>
                <h2 className={`text-lg sm:text-xl font-black ${isExec ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                  {userProfile.fullName}
                </h2>
                {currentUser.role !== 'Member' && (
                  <span className={`text-xs font-mono font-bold block mt-1 ${isExec ? 'text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {userProfile.membershipCode}
                  </span>
                )}
              </div>

              {/* Prominent VIP Title Badge & Print Profile Button */}
              <div className="w-full flex flex-col items-center justify-center my-1 gap-2">
                <span className="px-4 py-1.5 rounded-full text-xs font-black shadow-md border bg-amber-500/20 text-amber-300 border-amber-500/40 text-center">
                  {getUserRoleTitle(userProfile, language)}
                </span>

                <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const profileCardJson = JSON.stringify({
                        fullName: userProfile.fullName,
                        role: userProfile.role,
                        committee: userProfile.committee || 'None',
                        code: userProfile.membershipCode || 'EYE-MEM-001',
                        joinedDate: userProfile.joinedDate || '2024-01-01',
                        points: (userProfile as any).points || 150,
                        status: userProfile.status || 'عضو نشط معتمد'
                      });

                      const profileText = `[MEMBER_PROFILE_CARD_JSON]${profileCardJson}
بيانات العضو التفصيلية:
• كود العضوية: ${userProfile.membershipCode || 'EYE-MEM-001'}
• الدور الوظيفي: ${userProfile.role}
• اللجنة: ${userProfile.committee || 'None'}
• القسم: ${userProfile.department || 'None'}
• رقم التواصل (الرقم المسجل): ${userProfile.phoneNumber || '—'}
• البريد الإلكتروني: ${userProfile.email}
• التقييم العام: ${userProfile.rating || 95}%
• النبذة: ${userProfile.bio || 'متطوع متميز بكيان المصريون الشباب.'}`;

                      fillAndDownloadDocxTemplate('bg_report', {
                        reportTitle: `الملف الشخصي الرسمي — ${userProfile.fullName}`,
                        reportBody: profileText,
                        hrManager: 'أحمد إبراهيم'
                      });
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer print:hidden"
                    title="تصدير ملف Word أصلي ببيانات العضو والتوقيعات الرسمية"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? '💾 تصدير Word (.docx)' : 'Export Word (.docx)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const avatarSrc = userProfile.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userProfile.fullName)}`;
                      const bodyHtml = `
                        <div style="background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%); border: 2px solid #1b4cd3; padding: 18px; border-radius: 16px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(27, 76, 211, 0.08);">
                          <table style="width: 100%; border-collapse: collapse; border: none; margin: 0;">
                            <tr style="background: transparent;">
                              ${includeAvatarInPrint ? `
                                <td style="border: none; padding: 0 16px 0 0; width: 90px; vertical-align: middle;">
                                  <img src="${avatarSrc}" style="width: 80px; height: 80px; border-radius: 18px; border: 3px solid #1b4cd3; object-fit: cover; box-shadow: 0 4px 12px rgba(27, 76, 211, 0.2);" alt="${userProfile.fullName}" />
                                </td>
                              ` : ''}
                              <td style="border: none; padding: 0; text-align: right; vertical-align: middle;">
                                <span style="background: #1b4cd3; color: #ffffff; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 800; display: inline-block; margin-bottom: 8px;">سجل العضوية والتقييمات المعتمدة</span>
                                <h2 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 900; color: #0c1e4d;">${userProfile.fullName}</h2>
                                <div style="font-size: 12px; font-weight: 800; color: #1b4cd3; margin-bottom: 6px;">
                                  ${userProfile.role} ✦ ${userProfile.committee} (${userProfile.department || 'الإدارة العامة'})
                                </div>
                                <div style="font-size: 11px; font-weight: 700; color: #475569;">
                                  <strong>الكود التنظيمي:</strong> <span style="font-family: monospace; font-weight: 900; color: #1b4cd3;">${userProfile.membershipCode || 'EYE-MEMBER'}</span> | 
                                  <strong>تاريخ الانضمام:</strong> ${userProfile.joinedDate || '2024-01-01'} | 
                                  <strong>الحالة الحالية:</strong> <span style="color: #059669; font-weight: 900;">${String(userProfile.status) === 'نشط' || String(userProfile.status) === 'active' ? 'عضو نشط معتمد 🟢' : String(userProfile.status)}</span>
                                </div>
                              </td>
                              <td style="border: none; padding: 0; width: 120px; text-align: left; vertical-align: middle;">
                                <div style="background: #ffffff; border: 2px solid #2b66ff; padding: 10px 14px; border-radius: 12px; text-align: center;">
                                  <div style="font-size: 9px; font-weight: 800; color: #64748b; uppercase">نقاط التميز</div>
                                  <div style="font-size: 24px; font-weight: 900; color: #1b4cd3;">${(userProfile as any).points || 150}</div>
                                  <div style="font-size: 8px; font-weight: 800; color: #059669;">نقطة معتمدة</div>
                                </div>
                              </td>
                            </tr>
                          </table>
                        </div>

                        <h3 style="font-size: 14px; font-weight: 900; color: #0c1e4d; border-bottom: 2px solid #1b4cd3; padding-bottom: 6px; margin-bottom: 12px;">📊 سجل البيانات والأداء التنظيمي الموثق:</h3>

                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                          <tbody>
                            <tr>
                              <th style="width: 25%; background: #1b4cd3; color: white; padding: 10px; font-size: 11px; text-align: right;">البريد الإلكتروني الرسمي</th>
                              <td style="padding: 10px; font-size: 11px; font-weight: 700; font-family: monospace;">${userProfile.email}</td>
                              <th style="width: 25%; background: #1b4cd3; color: white; padding: 10px; font-size: 11px; text-align: right;">رقم التواصل (الرقم المسجل)</th>
                              <td style="padding: 10px; font-size: 11px; font-weight: 700; font-family: monospace;">${userProfile.phoneNumber || '—'}</td>
                            </tr>
                            <tr>
                              <th style="background: #1b4cd3; color: white; padding: 10px; font-size: 11px; text-align: right;">نطاق التواجد / النطاق</th>
                              <td style="padding: 10px; font-size: 11px; font-weight: 700;">محافظة الغربية — كيان EYE</td>
                              <th style="background: #1b4cd3; color: white; padding: 10px; font-size: 11px; text-align: right;">التقييم القيادي العام</th>
                              <td style="padding: 10px; font-size: 11px; font-weight: 900; color: #059669;">${userProfile.rating ? `${userProfile.rating} / 5 ⭐` : 'ممتاز (5 / 5) ⭐'}</td>
                            </tr>
                            <tr>
                              <th style="background: #1b4cd3; color: white; padding: 10px; font-size: 11px; text-align: right;">المهارات والتخصصات</th>
                              <td colSpan="3" style="padding: 10px; font-size: 11px; font-weight: 700; color: #334155;">${userProfile.skills?.join(' • ') || 'مهارات قيادية، تنظيم الفعاليات، إدارة التكليفات، العمل الجماعي'}</td>
                            </tr>
                            <tr>
                              <th style="background: #1b4cd3; color: white; padding: 10px; font-size: 11px; text-align: right;">الملخص والتوجيه القيادي</th>
                              <td colSpan="3" style="padding: 10px; font-size: 11px; font-weight: 600; color: #1e293b; line-height: 1.7;">
                                ${userProfile.bio || 'متطوع متميز بكيان المصريون الشباب بمحافظة الغربية، ملتزم بأخلاقيات ومتطلبات العمل التطوعي المؤسسي ويتمتع بروح فريق عالية.'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      `;

                      printDedicatedOfficialDocument({
                        title: `الملف الشخصي الرسمي — ${userProfile.fullName}`,
                        docNumber: userProfile.membershipCode || 'EYE-PROF-001',
                        bodyHtml,
                        signatures: [
                          { title: 'مسؤول لجنة الموارد البشرية', name: 'أحمد إبراهيم' }
                        ]
                      });
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[11px] font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer print:hidden"
                    title="طباعة وتصدير الملف الشخصي بـ 3 توقيعات معتمدة"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? '🖨️ طباعة / تصدير PDF الرسمي' : 'Print Official Profile'}</span>
                  </button>

                  {canEvaluateTarget && (
                    <button
                      type="button"
                      onClick={() => setShowEvalModal(true)}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-[11px] font-black transition-all flex items-center gap-1.5 shadow-md hover:scale-105 cursor-pointer print:hidden shrink-0"
                    >
                      <Star className="w-3.5 h-3.5 fill-white text-white" />
                      <span>{language === 'ar' ? '⭐ تقييم هذا العضو بالنقاط' : '⭐ Rate Member Points'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Official Leadership Verification Seal Card */}
              {isExec && (
                <div className="w-full p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-extrabold flex items-center justify-center gap-2">
                  <span>✨ قيادة معتمدة رسمياً بكيان المصريون الشباب EYE</span>
                </div>
              )}

                {/* Role Details */}
              <div className={`w-full space-y-2 border-t pt-4 text-start text-xs ${isExec ? 'border-slate-800 text-slate-300' : 'border-slate-100 text-slate-500'}`}>
                <div className="flex justify-between py-1 border-b border-white/10">
                  <span className="font-semibold opacity-70">{language === 'ar' ? 'الدور القيادي' : 'Role'}</span>
                  <span className={`font-bold uppercase tracking-wider ${isExec ? 'text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>{userProfile.role}</span>
                </div>
                {userProfile.role !== 'Super Admin' && (
                  <>
                    <div className="flex justify-between py-1 border-b border-white/10">
                      <span className="font-semibold opacity-70">{language === 'ar' ? 'اللجنة' : 'Committee'}</span>
                      <span className={`font-bold ${isExec ? 'text-white' : 'text-amber-600'}`}>{translateCommittee(userProfile.committee)}</span>
                    </div>
                    {userProfile.department && userProfile.department !== 'None' && (
                      <div className="flex justify-between py-1 border-b border-white/10">
                        <span className="font-semibold opacity-70">{language === 'ar' ? 'القسم' : 'Department'}</span>
                        <span className={`font-bold ${isExec ? 'text-white' : 'text-amber-600'}`}>{translateDepartment(userProfile.department)}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between py-1 border-b border-white/10">
                  <span className="font-semibold opacity-70">{language === 'ar' ? 'تاريخ الانضمام' : 'Joined Date'}</span>
                  <span className="font-mono">{new Date(userProfile.joinedDate).toLocaleDateString()}</span>
                </div>

                {/* Phone — WhatsApp clickable, only visible if allowed */}
                {(isOwnProfile || currentUser.role === 'Super Admin' || currentUser.role === 'Coordinator' || userProfile.showPhoneToOthers !== false) && userProfile.phoneNumber && (
                  <div className="flex justify-between items-center py-1 border-b border-white/10">
                    <span className="font-semibold opacity-70">{language === 'ar' ? 'الهاتف' : 'Phone'}</span>
                    <a
                      href={`https://wa.me/${userProfile.phoneNumber.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 font-bold text-emerald-500 hover:text-emerald-400 transition-colors"
                      title={language === 'ar' ? 'فتح WhatsApp' : 'Open WhatsApp'}
                    >
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      <span dir="ltr">{userProfile.phoneNumber}</span>
                    </a>
                  </div>
                )}

                {/* LinkedIn Badge */}
                {userProfile.linkedInUrl && (
                  <div className="flex justify-between items-center py-1 border-b border-white/10">
                    <span className="font-semibold opacity-70">LinkedIn</span>
                    <a
                      href={userProfile.linkedInUrl.startsWith('http') ? userProfile.linkedInUrl : `https://${userProfile.linkedInUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black transition-all hover:scale-105"
                      style={{ background: 'linear-gradient(135deg,#0077b5,#00a0dc)', color: '#fff' }}
                    >
                      <Linkedin className="w-3 h-3" />
                      <span>LinkedIn</span>
                    </a>
                  </div>
                )}

                {/* Facebook Badge */}
                {userProfile.facebookUrl && (
                  <div className="flex justify-between items-center py-1 border-b border-white/10">
                    <span className="font-semibold opacity-70">Facebook</span>
                    <a
                      href={userProfile.facebookUrl.startsWith('http') ? userProfile.facebookUrl : `https://${userProfile.facebookUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black transition-all hover:scale-105"
                      style={{ background: 'linear-gradient(135deg,#1877f2,#0056b3)', color: '#fff' }}
                    >
                      <Facebook className="w-3 h-3" />
                      <span>Facebook</span>
                    </a>
                  </div>
                )}
              </div>

            </div>
          );
        })()}

        {/* Contact info modifier Form — ONLY shown when viewing your own profile */}
        {isOwnProfile && (
          <form onSubmit={handleUpdateProfile} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">{language === 'ar' ? 'تعديل البيانات الشخصية' : 'Edit Profile Information'}</h3>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase">{language === 'ar' ? 'الاسم بالكامل' : 'Full Name'}</label>
              <div className="relative">
                <User className={`absolute ${language === 'ar' ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={language === 'ar' ? 'أدخل اسمك بالكامل...' : 'Enter full name...'}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl ${language === 'ar' ? 'pr-10 pl-4' : 'ps-10 pe-4'} py-2.5 text-xs text-slate-800 focus:outline-none focus:border-eye-brand focus:ring-1 focus:ring-eye-brand font-bold`}
                />
              </div>
            </div>

            {/* Profile Picture Upload & Link */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase">{language === 'ar' ? 'الصورة الشخصية' : 'Profile Picture'}</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Camera className={`absolute ${language === 'ar' ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
                  <input
                    type="text"
                    value={avatarUrlInput}
                    onChange={(e) => setAvatarUrlInput(e.target.value)}
                    placeholder={language === 'ar' ? 'رابط الصورة أو اضغط رفع...' : 'Image URL or click upload...'}
                    className={`w-full bg-slate-50 border border-slate-200 rounded-xl ${language === 'ar' ? 'pr-10 pl-4' : 'ps-10 pe-4'} py-2.5 text-xs text-slate-800 focus:outline-none focus:border-eye-brand focus:ring-1 focus:ring-eye-brand`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>{language === 'ar' ? 'اختيار صورة' : 'Choose File'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase">{language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</label>
              <div className="relative">
                <Phone className={`absolute ${language === 'ar' ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl ${language === 'ar' ? 'pr-10 pl-4' : 'ps-10 pe-4'} py-2.5 text-xs text-slate-800 focus:outline-none focus:border-eye-brand focus:ring-1 focus:ring-eye-brand`}
                  placeholder="+20xxxxxxxxxx"
                />
              </div>
              <p className="text-[10px] text-slate-400">{language === 'ar' ? 'سيُفتح تلقائياً في WhatsApp عند الضغط عليه' : 'Will open WhatsApp when clicked by others'}</p>
            </div>

            {/* Date of Birth Input */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase">{language === 'ar' ? 'تاريخ الميلاد' : 'Date of Birth'}</label>
              <div className="relative">
                <Cake className={`absolute ${language === 'ar' ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500`} />
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl ${language === 'ar' ? 'pr-10 pl-4' : 'ps-10 pe-4'} py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold`}
                />
              </div>
            </div>

            {/* LinkedIn URL */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase">LinkedIn URL</label>
              <div className="relative">
                <Linkedin className={`absolute ${language === 'ar' ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4`} style={{ color: '#0077b5' }} />
                <input
                  type="text"
                  value={linkedIn}
                  onChange={(e) => setLinkedIn(e.target.value)}
                  placeholder="www.linkedin.com/in/yourname"
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl ${language === 'ar' ? 'pr-10 pl-4' : 'ps-10 pe-4'} py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1`}
                />
              </div>
            </div>

            {/* Facebook URL */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase">Facebook URL</label>
              <div className="relative">
                <Facebook className={`absolute ${language === 'ar' ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4`} style={{ color: '#1877f2' }} />
                <input
                  type="text"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  placeholder="www.facebook.com/yourname"
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl ${language === 'ar' ? 'pr-10 pl-4' : 'ps-10 pe-4'} py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1`}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase">{language === 'ar' ? 'نبذة مختصرة' : 'Bio Summary'}</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 resize-none focus:outline-none focus:border-eye-brand focus:ring-1 focus:ring-eye-brand"
              />
            </div>

            {/* Profile Picture Protection Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isAvatarProtected ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {isAvatarProtected ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </div>
                <div className="text-start">
                  <p className="text-xs font-bold text-slate-800">
                    {language === 'ar' ? 'تفعيل حماية الصورة الشخصية 🔒' : 'Protect Profile Picture 🔒'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {language === 'ar' 
                      ? 'منع باقي الأعضاء من تكبير أو معاينة صورتك بدقة عالية' 
                      : 'Prevent other users from expanding your profile picture'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !isAvatarProtected;
                  setIsAvatarProtected(next);
                  db.updateProfile(currentUser.id, { isAvatarProtected: next }, currentUser);
                  setUserProfile(prev => ({ ...prev, isAvatarProtected: next }));
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isAvatarProtected ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isAvatarProtected ? (language === 'ar' ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Privacy: Show phone to others */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${showPhoneToOthers ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  <Phone className="w-4 h-4" />
                </div>
                <div className="text-start">
                  <p className="text-xs font-bold text-slate-800">
                    {language === 'ar' ? 'إظهار رقم الهاتف للأعضاء الآخرين' : 'Show phone number to others'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {language === 'ar'
                      ? 'الإداريون يرونه دائماً بغض النظر'
                      : 'Admins can always see it regardless'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !showPhoneToOthers;
                  setShowPhoneToOthers(next);
                  db.updateProfile(currentUser.id, { showPhoneToOthers: next }, currentUser);
                  setUserProfile(prev => ({ ...prev, showPhoneToOthers: next }));
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showPhoneToOthers ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  showPhoneToOthers ? (language === 'ar' ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Privacy: Show avatar to others */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${showAvatarToOthers ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  <Camera className="w-4 h-4" />
                </div>
                <div className="text-start">
                  <p className="text-xs font-bold text-slate-800">
                    {language === 'ar' ? 'إظهار الصورة الشخصية للأعضاء الآخرين' : 'Show profile photo to others'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {language === 'ar'
                      ? 'لو أخفيتها بترجع الصورة الافتراضية للآخرين'
                      : 'Others will see default avatar if hidden'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !showAvatarToOthers;
                  setShowAvatarToOthers(next);
                  db.updateProfile(currentUser.id, { showAvatarToOthers: next }, currentUser);
                  setUserProfile(prev => ({ ...prev, showAvatarToOthers: next }));
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showAvatarToOthers ? 'bg-blue-500' : 'bg-slate-300'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  showAvatarToOthers ? (language === 'ar' ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                }`} />
              </button>
            </div>

            {isSaved && (
              <p className="text-xs text-emerald-600 font-semibold text-center">{language === 'ar' ? 'تم حفظ التغييرات بنجاح!' : 'Changes saved to local database!'}</p>
            )}

            <button
              type="submit"
              className="w-full bg-eye-brand hover:bg-eye-brand-dark text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-sm cursor-pointer"
            >
              {language === 'ar' ? 'حفظ تعديلات الملف الشخصي' : 'Save Profile Updates'}
            </button>
          </form>
        )}

        {/* Interactive Flippable 3D Membership Card */}
        {(() => {
          const isExecCard = ['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator'].includes(userProfile.role);
          const isLeaderCard = userProfile.role === 'Leader';

          const cardGradientClass = isExecCard
            ? 'from-[#0b1329] via-[#331c03] to-[#120a02] border-amber-400/80 shadow-amber-500/20'
            : isLeaderCard
            ? 'from-[#1c0d02] via-[#4d2506] to-[#241103] border-amber-500/70 shadow-orange-500/15'
            : 'from-[#061024] via-[#102347] to-[#040a17] border-blue-400/60 shadow-blue-500/15';

          const roleBadgeLabel = isExecCard
            ? (language === 'ar' ? 'قيادة الكيان (VIP)' : 'Executive VIP')
            : isLeaderCard
            ? (language === 'ar' ? 'قائد لجنة معتمد' : 'Certified Leader')
            : (language === 'ar' ? 'عضوية عاملة' : 'Active Member');

          return (
            <div className="space-y-3">
              <div 
                onClick={() => setIsCardFlipped(prev => !prev)}
                className="w-full h-56 cursor-pointer relative rounded-3xl select-none group"
                style={{ perspective: '1000px' }}
              >
                <div 
                  className="w-full h-full relative duration-700"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}
                >
                  {/* FRONT SIDE */}
                  <div 
                    className={`absolute inset-0 w-full h-full rounded-3xl bg-gradient-to-br ${cardGradientClass} p-5 flex flex-col justify-between shadow-2xl overflow-hidden border-2 text-white transition-all group-hover:border-amber-300/90`}
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                    }}
                  >
                    {/* Holographic light reflection */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(251,191,36,0.3),transparent_75%)] pointer-events-none" />
                    
                    {/* Official Holographic golden side strip */}
                    <div className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-40 bg-gradient-to-b from-yellow-300 via-amber-200 to-yellow-400 rounded-full opacity-40 mix-blend-overlay pointer-events-none shadow-sm" />

                    {/* Card Header */}
                    <div className="flex justify-between items-center z-10">
                      <div className="flex items-center gap-2.5">
                        {/* Circular Logo Badge with Golden Ring */}
                        <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-yellow-300 via-amber-400 to-yellow-200 shadow-[0_0_12px_rgba(245,158,11,0.45)] shrink-0">
                          <div className="w-8 h-8 rounded-full bg-[#071430] flex items-center justify-center border border-amber-300/80 overflow-hidden p-0.5">
                            <img src="/eye-logo-transparent.png" className="w-full h-full object-contain" alt="EYE Logo" />
                          </div>
                        </div>
                        <div className="text-start">
                          <p className="text-[11px] font-black tracking-wide leading-tight text-white drop-shadow-sm">{language === 'ar' ? 'كيان المصريون الشباب' : 'Egyptian Youth Entity'}</p>
                          <p className="text-[7.5px] font-extrabold font-mono tracking-widest text-amber-300 mt-0.5">EYE ORGANIZATION</p>
                        </div>
                      </div>
                      <div className="text-end">
                        <span className="text-[8px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-400/40 px-2.5 py-1 rounded-full backdrop-blur-md shadow-sm">
                          {roleBadgeLabel}
                        </span>
                      </div>
                    </div>

                    {/* Card Body (Profile Info & Microchip) */}
                    <div className="flex items-center justify-between z-10 text-start px-1">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Member Photo Frame */}
                        <div className="relative p-0.5 rounded-2xl bg-gradient-to-tr from-yellow-300 via-amber-400 to-yellow-200 shadow-md shrink-0">
                          <img
                            src={userProfile.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userProfile.fullName)}`}
                            alt={userProfile.fullName}
                            className="w-13 h-13 rounded-[14px] object-cover border-2 border-slate-950 shadow-inner"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <h4 className="text-xs sm:text-sm font-black text-white leading-tight truncate drop-shadow-md">{userProfile.fullName}</h4>
                          {currentUser.role !== 'Member' && <p className="text-[9px] font-mono text-amber-300 tracking-wider font-extrabold">ID: {userProfile.membershipCode || 'EYE-1001'}</p>}
                          <p className="text-[9px] font-extrabold text-slate-200/90 leading-none truncate">
                            {language === 'ar' 
                              ? (userProfile.department && userProfile.department !== 'None' 
                                  ? `${translateCommittee(userProfile.committee)} • ${translateDepartment(userProfile.department)}`
                                  : translateCommittee(userProfile.committee))
                              : (userProfile.department && userProfile.department !== 'None'
                                  ? `${userProfile.committee} • ${userProfile.department}`
                                  : userProfile.committee)}
                          </p>
                        </div>
                      </div>

                      {/* Golden SIM Chip Icon */}
                      <div className="w-7 h-5 rounded-md bg-gradient-to-tr from-yellow-200 via-amber-400 to-yellow-300 border border-amber-500/90 shadow-sm flex flex-col justify-between p-0.5 opacity-90 shrink-0">
                        <div className="w-full h-0.5 bg-amber-800/40 rounded-full" />
                        <div className="w-full h-0.5 bg-amber-800/40 rounded-full" />
                      </div>
                    </div>

                    {/* Card Footer with Official Entity Seal (أسفل اليسار) */}
                    <div className="flex justify-between items-center text-[8.5px] font-bold text-amber-200/90 z-10 border-t border-white/10 pt-2 relative">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 font-mono tracking-wider">
                          <span className="text-amber-400">EXP:</span>
                          <span>12/2026</span>
                        </span>
                        {/* Official Seal Stamp (ختم الكيان الرسمي الدائري) */}
                        <div className="w-14 h-14 rounded-full border-2 border-double border-blue-500/70 bg-blue-950/50 backdrop-blur-xs flex items-center justify-center text-center -rotate-12 shadow-lg shrink-0 p-0.5" style={{ boxShadow: '0 0 12px rgba(43, 102, 255, 0.5)' }}>
                          <div className="w-full h-full rounded-full border border-blue-500/60 flex items-center justify-center p-0.5 overflow-hidden">
                            <img src="/eye-logo-seal.png" alt="seal logo" className="w-full h-full object-fill" />
                          </div>
                        </div>
                      </div>

                      <span className="flex items-center gap-1 text-amber-300">
                        <span>{language === 'ar' ? 'انقر لقلب البطاقة 🔄' : 'Click to flip 🔄'}</span>
                      </span>
                    </div>
                  </div>

                  {/* BACK SIDE */}
                  <div 
                    className="absolute inset-0 w-full h-full rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 flex flex-col justify-between shadow-2xl overflow-hidden border-2 border-amber-500/40 text-slate-100"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    {/* Black magnetic stripe */}
                    <div className="absolute top-4 left-0 w-full h-8 bg-black opacity-90 border-y border-amber-500/20" />

                    <div className="mt-8 flex justify-between items-center gap-4 z-10">
                      {/* Simulated offline vector QR Code */}
                      <svg viewBox="0 0 100 100" className="w-15 h-15 bg-white p-1 rounded-xl shrink-0 shadow-md">
                        <rect x="0" y="0" width="30" height="30" fill="#0f172a" />
                        <rect x="5" y="5" width="20" height="20" fill="#fff" />
                        <rect x="10" y="10" width="10" height="10" fill="#0f172a" />

                        <rect x="70" y="0" width="30" height="30" fill="#0f172a" />
                        <rect x="75" y="5" width="20" height="20" fill="#fff" />
                        <rect x="80" y="10" width="10" height="10" fill="#0f172a" />

                        <rect x="0" y="70" width="30" height="30" fill="#0f172a" />
                        <rect x="5" y="75" width="20" height="20" fill="#fff" />
                        <rect x="10" y="80" width="10" height="10" fill="#0f172a" />

                        <rect x="40" y="10" width="10" height="20" fill="#0f172a" />
                        <rect x="50" y="0" width="10" height="10" fill="#0f172a" />
                        <rect x="40" y="40" width="20" height="20" fill="#0f172a" />
                        <rect x="10" y="45" width="15" height="10" fill="#0f172a" />
                        <rect x="70" y="40" width="10" height="15" fill="#0f172a" />
                        <rect x="85" y="70" width="15" height="15" fill="#0f172a" />
                        <rect x="45" y="75" width="15" height="10" fill="#0f172a" />
                        <rect x="40" y="90" width="30" height="10" fill="#0f172a" />
                        <rect x="15" y="90" width="10" height="10" fill="#0f172a" />
                        <rect x="85" y="45" width="10" height="20" fill="#0f172a" />
                      </svg>

                      <div className="flex-1 text-start space-y-0.5 font-mono text-[9px] text-slate-300">
                        <p className="font-extrabold text-amber-400">{language === 'ar' ? 'التوثيق الرقمي الرسمي' : 'Digital Verification'}</p>
                        <p className="truncate text-slate-200">CODE: {userProfile.id.toUpperCase()}</p>
                        <p className="text-emerald-400 font-bold">{language === 'ar' ? 'الحالة: معتمد ونشط ✓' : 'Status: Certified & Active ✓'}</p>
                      </div>

                      {/* EYE seal stamp — official logo */}
                      <div className="w-13 h-13 rounded-full border-2 border-double border-blue-500/70 flex items-center justify-center -rotate-12 shrink-0 select-none pointer-events-none bg-blue-950/20">
                        <img src="/eye-logo-seal.png" className="w-8 h-8 object-fill" alt="" />
                      </div>
                    </div>

                    {/* Card Back Footer */}
                    <div className="flex justify-between items-center text-[8px] font-bold text-slate-400 z-10 border-t border-slate-800 pt-2 mt-1">
                      <span>{language === 'ar' ? '• وثيقة هوية رقمية معتمدة' : '• Certified Digital Identity' }</span>
                      <span className="font-sans text-amber-300/90">{language === 'ar' ? 'محمود ربيع (منسق المحافظة)' : 'Governorate Coordinator Mahmoud Rabie'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Download Membership Card Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadCard();
                }}
                disabled={isDownloadingCard}
                className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg hover:shadow-amber-500/20 transition-all border border-yellow-300/50 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
              >
                {isDownloadingCard ? (
                  <Loader2 className="w-4 h-4 text-slate-950 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-slate-950" />
                )}
                <span>
                  {isDownloadingCard
                    ? (language === 'ar' ? 'جاري رسم وتجهيز الصورة...' : 'Generating Image...')
                    : (language === 'ar' ? 'تنزيل بطاقة العضوية (PNG)' : 'Download Membership Card (PNG)')}
                </span>
              </button>
            </div>
          );
        })()}
      </div>

      {/* Right side: Detailed Activity Log and timeline */}
      <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-sm" dir={language === 'ar' ? 'rtl' : 'ltr'}>

        {/* ── MEMBER PERFORMANCE EVALUATION SECTION ── */}
        <div className="border-b border-slate-100 pb-5">
          {(() => {
            const avgBreakdown = calculateMemberAVG(
              activeUser.id,
              db.getMeetings(),
              db.getAllAttendance(),
              db.getTasks(),
              db.getSubmissions(),
              db.getExcuseRequests(),
              evaluations,
              activeUser.bonusPoints || 0
            );

            const handlePrintEvaluationReport = () => {
              const reportHtml = `
                <div style="font-family: 'Cairo', sans-serif; direction: rtl; text-align: right; color: #0f172a; padding: 10px;">
                  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 20px; border-radius: 16px; margin-bottom: 20px; border: 2px solid #d97706; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <h2 style="margin: 0 0 6px 0; font-size: 20px; color: #fbbf24;">${activeUser.fullName}</h2>
                      <div style="font-size: 13px; color: #cbd5e1;">الصفة / الدور: <strong>${getUserRoleTitle(activeUser)}</strong></div>
                      <div style="font-size: 13px; color: #cbd5e1;">اللجنة: <strong>${activeUser.committee || 'عام'}</strong> | كود العضوية: <strong>${activeUser.membershipCode || '—'}</strong></div>
                    </div>
                    <div style="text-align: center; background: rgba(251, 191, 36, 0.15); border: 2px solid #f59e0b; padding: 12px 20px; border-radius: 14px;">
                      <div style="font-size: 11px; color: #fef3c7; font-weight: bold; text-transform: uppercase;">المعدل العام (AVG)</div>
                      <div style="font-size: 28px; font-weight: 900; color: #fbbf24;">${avgBreakdown.avgScore}%</div>
                      <div style="font-size: 10px; color: #fef3c7;">(الأساسي: ${avgBreakdown.baseAvg}% + بونص ${avgBreakdown.bonusPoints}ن)</div>
                    </div>
                  </div>

                  <h3 style="font-size: 14px; font-weight: 800; color: #1e3a8a; margin-bottom: 10px; border-bottom: 2px solid #2563eb; padding-bottom: 4px;">
                    📊 تفاصيل توزيع النقاط ومعادلة التقييم التراكمي
                  </h3>

                  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
                    <thead>
                      <tr style="background: #1e40af; color: white; text-align: right;">
                        <th style="padding: 8px 12px; border: 1px solid #cbd5e1;">بند التقييم</th>
                        <th style="padding: 8px 12px; border: 1px solid #cbd5e1;">الوزن / أعلى نقطة</th>
                        <th style="padding: 8px 12px; border: 1px solid #cbd5e1;">النقاط المحققة</th>
                        <th style="padding: 8px 12px; border: 1px solid #cbd5e1;">تفاصيل الإنجاز والأعذار</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #1d4ed8;">🌐 اجتماعات أونلاين (Online Meetings)</td>
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: center;">5 نقاط للميتينج</td>
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #15803d;">${avgBreakdown.onlineMeetingsEarned} نقطة</td>
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">حضر ${avgBreakdown.onlineMeetingsCount} ميتينج أونلاين (العذر المقبول = 2.5 نقطة)</td>
                      </tr>
                      <tr style="background: #f8fafc;">
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #b45309;">🏛️ اجتماعات أوفلاين (Offline Meetings)</td>
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: center;">10 نقاط للميتينج</td>
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #15803d;">${avgBreakdown.offlineMeetingsEarned} نقطة</td>
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">حضر ${avgBreakdown.offlineMeetingsCount} ميتينج أوفلاين (العذر المقبول = 5 نقاط)</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #6b21a8;">🎯 التسليمات والمهام (Tasks)</td>
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: center;">5 نقاط للمهمة</td>
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #15803d;">${avgBreakdown.tasksEarned} نقطة</td>
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">أنجز ${avgBreakdown.completedTasksCount} مهمة مقبولة (العذر المقبول = 2.5 نقطة)</td>
                      </tr>
                      <tr style="background: #f8fafc;">
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #047857;">⭐ تقييم السلوك والانضباط (BHV)</td>
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: center;">10 نقاط</td>
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #047857;">${avgBreakdown.behaviorScore} / 10</td>
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">محسوب بناءً على التقييمات الإدارية للانضباط والسلوك</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #4338ca;">🤝 تقييم التفاعل والعمل الجماعي</td>
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: center;">13 نقطة</td>
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #4338ca;">${avgBreakdown.interactionScore} / 13</td>
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">محسوب بناءً على التقييمات الإدارية للتفاعل والتعاون</td>
                      </tr>
                      <tr style="background: #fef3c7;">
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #d97706;">🎁 نقاط المكافأة والبونص (Executive Bonus)</td>
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: center;">حتى 10 نقاط</td>
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #d97706;">+${avgBreakdown.bonusPoints} نقطة</td>
                        <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">تضاف مباشرة فوق الـ AVG بواسطة الإدارة العليا</td>
                      </tr>
                    </tbody>
                  </table>

                  <div style="background: #eff6ff; border-right: 4px solid #2563eb; padding: 12px 16px; border-radius: 10px; margin-bottom: 20px; font-size: 11px; color: #1e3a8a;">
                    <strong>📐 معادلة حساب الـ AVG المعتمدة:</strong><br/>
                    <code>AVG = (مجموع النقاط المحققة [${avgBreakdown.earnedPoints}] ÷ أعلى نقطة ممكنة [${avgBreakdown.maxPoints}]) × 100 + البونص [${avgBreakdown.bonusPoints}] = ${avgBreakdown.avgScore}%</code>
                  </div>
                </div>
              `;

              printDedicatedOfficialDocument({
                title: `تقرير تقييم الأداء التراكمي (AVG) — ${activeUser.fullName}`,
                docNumber: `EYE-AVG-${activeUser.membershipCode || Date.now().toString().slice(-5)}`,
                bodyHtml: reportHtml,
                signatures: [
                  { title: 'مسؤول لجنة الموارد البشرية', name: 'أحمد إبراهيم' },
                  { title: 'نائب المنسق العام', name: 'ريهام أشرف' }
                ]
              });
            };

            return (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                      <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{language === 'ar' ? 'نظام التقييم الرسمي (AVG Score)' : 'Official AVG Performance System'}</span>
                        <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300/40 rounded-full px-2.5 py-0.5">
                          {avgBreakdown.avgScore}% AVG
                        </span>
                      </h2>
                      <p className="text-[10px] text-slate-500">
                        {language === 'ar'
                          ? 'معدل الأداء التراكمي محسوب تلقائياً من الميتينجات، المهام، الأعذار، السلوك والتفاعل، والبونص.'
                          : 'Cumulative performance calculated automatically from meetings, tasks, excuses, behavior & bonus.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handlePrintEvaluationReport}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                      <span>{language === 'ar' ? 'طباعة تقرير (AVG) PDF' : 'Print AVG Report PDF'}</span>
                    </button>

                    {canEvaluateTarget && (
                      <button
                        type="button"
                        onClick={() => setShowEvalModal(true)}
                        className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                      >
                        <Star className="w-3.5 h-3.5 fill-white text-white" />
                        <span>{language === 'ar' ? 'تقييم هذا العضو ⭐' : 'Rate Member ⭐'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {evalSuccessMsg && (
                  <div className="mb-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>{evalSuccessMsg}</span>
                  </div>
                )}

                {/* Comprehensive Interactive AVG Card */}
                <div className="mb-4 p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 text-white border border-amber-500/30 shadow-xl space-y-4">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex flex-col items-center justify-center shrink-0 shadow-inner">
                        <span className="text-2xl font-black text-amber-300">{avgBreakdown.avgScore}%</span>
                        <span className="text-[8px] text-amber-200/80 uppercase font-bold">AVG Score</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star key={n} className={`w-4 h-4 ${n <= Math.round((avgBreakdown.avgScore / 100) * 5) ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
                          ))}
                        </div>
                        <p className="text-sm font-extrabold text-amber-200 mt-1">
                          {avgBreakdown.avgScore >= 90 ? (language === 'ar' ? 'أداء استثنائي ممتاز ✨' : 'Exceptional Performance ✨') :
                           avgBreakdown.avgScore >= 75 ? (language === 'ar' ? 'أداء جيد جداً وفعّال 💪' : 'Very Good Performance 💪') :
                           avgBreakdown.avgScore >= 60 ? (language === 'ar' ? 'أداء متوسط مقبول 📈' : 'Average Performance 📈') :
                           (language === 'ar' ? 'يحتاج إلى متابعة وتطوير ⚠️' : 'Needs Improvement ⚠️')}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {language === 'ar'
                            ? `مجموع النقاط: ${avgBreakdown.earnedPoints} من أصل ${avgBreakdown.maxPoints} نقطة ممكنة | البونص: +${avgBreakdown.bonusPoints}ن`
                            : `Earned ${avgBreakdown.earnedPoints} / ${avgBreakdown.maxPoints} pts | Bonus: +${avgBreakdown.bonusPoints} pts`}
                        </p>
                      </div>
                    </div>

                    {/* Formula breakdown badge */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-[11px] text-slate-300 w-full md:w-auto">
                      <div className="font-bold text-amber-300 mb-1">{language === 'ar' ? '📐 معادلة الـ AVG:' : '📐 AVG Formula:'}</div>
                      <code>AVG = ({avgBreakdown.earnedPoints} ÷ {avgBreakdown.maxPoints}) × 100 + {avgBreakdown.bonusPoints} = <span className="text-emerald-400 font-extrabold">{avgBreakdown.avgScore}%</span></code>
                    </div>
                  </div>

                  {/* AVG Breakdown Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[10px]">
                    <div className="bg-white/5 border border-white/10 p-2.5 rounded-2xl">
                      <span className="text-slate-400 block truncate">{language === 'ar' ? '🌐 أونلاين (5ن)' : 'Online (5p)'}</span>
                      <span className="font-extrabold text-blue-300 text-sm">{avgBreakdown.onlineMeetingsEarned}ن</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{avgBreakdown.onlineMeetingsCount} ميتينج</span>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-2.5 rounded-2xl">
                      <span className="text-slate-400 block truncate">{language === 'ar' ? '🏛️ أوفلاين (10ن)' : 'Offline (10p)'}</span>
                      <span className="font-extrabold text-amber-300 text-sm">{avgBreakdown.offlineMeetingsEarned}ن</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{avgBreakdown.offlineMeetingsCount} ميتينج</span>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-2.5 rounded-2xl">
                      <span className="text-slate-400 block truncate">{language === 'ar' ? '🎯 التاسكات (5ن)' : 'Tasks (5p)'}</span>
                      <span className="font-extrabold text-purple-300 text-sm">{avgBreakdown.tasksEarned}ن</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{avgBreakdown.completedTasksCount} مهمة</span>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-2.5 rounded-2xl">
                      <span className="text-slate-400 block truncate">{language === 'ar' ? '⭐ السلوك (BHV)' : 'Behavior'}</span>
                      <span className="font-extrabold text-emerald-300 text-sm">{avgBreakdown.behaviorScore}/10</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{language === 'ar' ? 'الانضباط' : 'Commitment'}</span>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-2.5 rounded-2xl">
                      <span className="text-slate-400 block truncate">{language === 'ar' ? '🤝 التفاعل' : 'Interaction'}</span>
                      <span className="font-extrabold text-indigo-300 text-sm">{avgBreakdown.interactionScore}/13</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{language === 'ar' ? 'العمل الجماعي' : 'Teamwork'}</span>
                    </div>

                    <div className="bg-white/5 border border-amber-500/30 p-2.5 rounded-2xl bg-amber-500/10">
                      <span className="text-amber-300 font-bold block truncate">{language === 'ar' ? '🎁 بونص' : 'Bonus'}</span>
                      <span className="font-black text-amber-300 text-sm">+{avgBreakdown.bonusPoints}ن</span>
                      <span className="text-[9px] text-amber-200/70 block mt-0.5">{language === 'ar' ? 'إضافة مباشرة' : 'Direct add'}</span>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}

          {/* Evaluations List */}
          {evaluations.length === 0 ? (
            <div className="text-center py-6 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <Star className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
              <p className="text-xs text-slate-500 font-semibold">
                {language === 'ar' ? 'لم يتلق هذا العضو أي تقييم إداري بعد.' : 'No evaluations recorded for this member yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {evaluations.map((ev) => (
                <div key={ev.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs">
                        {ev.evaluatorName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{ev.evaluatorName}</p>
                        <p className="text-[9px] text-amber-600 dark:text-amber-400 font-bold uppercase">{ev.evaluatorRole}</p>
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="flex items-center gap-1 justify-end">
                        {[1, 2, 3, 4, 5].map(n => (
                          <Star key={n} className={`w-3 h-3 ${n <= ev.overallRating ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                        ))}
                        <span className="text-xs font-black text-amber-500 ms-1">{ev.overallRating}</span>
                      </div>
                      <span className="text-[9px] text-slate-400">{new Date(ev.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {ev.feedbackComment && (
                    <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
                      "{ev.feedbackComment}"
                    </p>
                  )}

                  <div className="grid grid-cols-4 gap-1 text-[9px] font-bold text-slate-500 pt-1">
                    <div>{language === 'ar' ? 'انضباط:' : 'Commit:'} <span className="text-slate-800 dark:text-slate-200">{ev.commitmentRating}/5</span></div>
                    <div>{language === 'ar' ? 'جودة:' : 'Quality:'} <span className="text-slate-800 dark:text-slate-200">{ev.qualityRating}/5</span></div>
                    <div>{language === 'ar' ? 'تعاون:' : 'Team:'} <span className="text-slate-800 dark:text-slate-200">{ev.teamworkRating}/5</span></div>
                    <div>{language === 'ar' ? 'ابتكار:' : 'Act:'} <span className="text-slate-800 dark:text-slate-200">{ev.activityRating}/5</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Evaluation Modal Dialog — Pop-up Right in Front of User's Eyes */}
        {showEvalModal && (
          <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-lg flex items-center justify-center p-4 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-amber-500/40 max-w-lg w-full p-5 sm:p-6 space-y-3.5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto" dir={language === 'ar' ? 'rtl' : 'ltr'}>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      {language === 'ar' ? `تقييم أداء العضو: ${activeUser.fullName}` : `Rate Member: ${activeUser.fullName}`}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold">{activeUser.role} • {activeUser.committee}</p>
                  </div>
                </div>
                <button onClick={() => setShowEvalModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEvaluation} className="space-y-4">
                {/* Numerical Points Inputs for BHV, Interaction & Bonus */}
                <div className="space-y-3">
                  {/* Behavior BHV (10 pts) */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100 block">⭐ {language === 'ar' ? 'سلوك (BHV)' : 'Behavior (BHV)'}</span>
                      <span className="text-[10px] text-slate-500 font-bold">{language === 'ar' ? 'الالتزام والانضباط (من 0 إلى 10 نقاط)' : 'Commitment & Behavior (0 to 10 pts)'}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={behaviorScoreInput}
                        onChange={(e) => setBehaviorScoreInput(Math.min(10, Math.max(0, parseFloat(e.target.value) || 0)))}
                        className="w-16 bg-white dark:bg-slate-900 border-2 border-emerald-500/60 rounded-xl px-2 py-1.5 text-center text-sm font-black text-emerald-600 dark:text-emerald-400 focus:outline-none shadow-sm"
                      />
                      <span className="text-xs font-black text-slate-500">/ 10</span>
                    </div>
                  </div>

                  {/* Interaction (13 pts) */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100 block">🤝 {language === 'ar' ? 'تفاعل (Interaction)' : 'Interaction'}</span>
                      <span className="text-[10px] text-slate-500 font-bold">{language === 'ar' ? 'التفاعل والعمل الجماعي (من 0 إلى 13 نقطة)' : 'Teamwork & Interaction (0 to 13 pts)'}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="13"
                        step="0.5"
                        value={interactionScoreInput}
                        onChange={(e) => setInteractionScoreInput(Math.min(13, Math.max(0, parseFloat(e.target.value) || 0)))}
                        className="w-16 bg-white dark:bg-slate-900 border-2 border-indigo-500/60 rounded-xl px-2 py-1.5 text-center text-sm font-black text-indigo-600 dark:text-indigo-400 focus:outline-none shadow-sm"
                      />
                      <span className="text-xs font-black text-slate-500">/ 13</span>
                    </div>
                  </div>

                  {/* Bonus (10 pts) */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-black text-amber-800 dark:text-amber-300 block">🎁 {language === 'ar' ? 'بونص (Bonus)' : 'Bonus'}</span>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">{language === 'ar' ? 'إضافة مباشرة فوق الـ AVG (من 0 إلى 10 نقاط)' : 'Direct AVG Boost (0 to 10 pts)'}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={bonusInput}
                        onChange={(e) => setBonusInput(Math.min(10, Math.max(0, parseFloat(e.target.value) || 0)))}
                        className="w-16 bg-white dark:bg-slate-900 border-2 border-amber-500/60 rounded-xl px-2 py-1.5 text-center text-sm font-black text-amber-600 dark:text-amber-400 focus:outline-none shadow-sm"
                      />
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400">/ 10</span>
                    </div>
                  </div>
                </div>

                {/* Overall AVG Score Live Calculation Preview */}
                {(() => {
                  const livePreviewBreakdown = calculateMemberAVG(
                    activeUser.id,
                    db.getMeetings(),
                    db.getAllAttendance(),
                    db.getTasks(),
                    db.getSubmissions(),
                    db.getExcuseRequests(),
                    [
                      ...evaluations,
                      {
                        id: 'preview',
                        targetUserId: activeUser.id,
                        targetUserName: activeUser.fullName,
                        commitmentRating: (behaviorScoreInput / 10) * 5,
                        teamworkRating: (interactionScoreInput / 13) * 5,
                        overallRating: 5,
                        createdAt: new Date().toISOString()
                      }
                    ],
                    bonusInput
                  );
                  return (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white border border-amber-400/40 flex items-center justify-between shadow-lg">
                      <div className="space-y-0.5">
                        <span className="text-xs font-black text-amber-300 block">
                          {language === 'ar' ? 'الـ AVG المحسوب تلقائياً بعد الإدخال:' : 'Calculated AVG Preview:'}
                        </span>
                        <span className="text-[10px] text-slate-300">
                          {livePreviewBreakdown.hasActualEvents
                            ? `النقاط: ${livePreviewBreakdown.earnedPoints} / ${livePreviewBreakdown.maxPoints} | بونص +${bonusInput}ن`
                            : 'سيتم احتساب الدرجة فور تسجيل ميتينج أو مهمة للعضو'}
                        </span>
                      </div>
                      <span className="text-base font-black text-amber-400 bg-amber-400/20 px-3 py-1.5 rounded-xl border border-amber-400/30 font-mono">
                        {livePreviewBreakdown.displayText}
                      </span>
                    </div>
                  );
                })()}

                {/* Feedback Comment */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">{language === 'ar' ? 'ملاحظات القيادة والتوجيهات' : 'Leader Feedback & Recommendations'}</label>
                  <textarea
                    rows={2}
                    value={evalComment}
                    onChange={(e) => setEvalComment(e.target.value)}
                    placeholder={language === 'ar' ? 'أدخل أي ملاحظات تشجيعية أو نقاط تطوير للعضو...' : 'Enter feedback notes or guidance...'}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 resize-none focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingEval}
                    className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingEval ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'اعتماد وحفظ التقييم بالنقاط ⭐' : 'Submit Evaluation Points ⭐')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEvalModal(false)}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MY CERTIFICATES (visible to the user on their own profile) ── */}
        <div className="border-b border-slate-100 pb-5">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-amber-500" />
            <div className="flex-1">
              <h2 className="text-sm font-extrabold text-slate-900">
                {language === 'ar' ? 'شهاداتي' : 'My Certificates'}
                <span className="ms-2 inline-flex items-center justify-center text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
                  {myCertificates.length}
                </span>
              </h2>
              <p className="text-[10px] text-slate-500">
                {language === 'ar'
                  ? 'كل الشهادات اللي اتمنحتلك من الإدارة — تقدر تنزلها أو تطبعها.'
                  : 'All certificates awarded to you by leadership — download or print any of them.'}
              </p>
            </div>
          </div>

          {myCertificates.length === 0 ? (
            <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <Award className="w-7 h-7 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-semibold">
                {language === 'ar' ? 'لم تُمنح أي شهادات بعد. استمر في تميزك!' : 'No certificates yet. Keep up the great work!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {myCertificates.map((cert) => {
                const certDef = CERT_TYPE_META[cert.certType];
                return (
                  <div
                    key={cert.id}
                    className="group relative p-3.5 bg-gradient-to-br from-amber-50/70 to-orange-50/40 border border-amber-200/60 rounded-2xl hover:shadow-md hover:border-amber-300 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                        style={{ background: certDef?.gradient || 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)' }}>
                        {certDef?.icon || '🏆'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-extrabold text-slate-900 truncate" title={cert.title}>{cert.title}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">{cert.issuedByName} • {new Date(cert.issuedAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">ID: {cert.id.slice(-10)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowCert(cert);
                      }}
                      className="mt-2.5 w-full flex items-center justify-center gap-1.5 text-[10px] font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-lg py-1.5 transition-all"
                    >
                      <Download className="w-3 h-3" />
                      {language === 'ar' ? 'عرض / تنزيل' : 'View / Download'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Certificate Modal — preview + download + email-share */}
        {showCert && (
          <CertificateViewModal
            cert={showCert}
            onClose={() => setShowCert(null)}
            onDownload={(c) => downloadIssuedCertificate(c)}
            transparentLogo={transparentLogo}
          />
        )}

        {/* ── SKILLS & ENDORSEMENTS ── */}
        <div className="border-b border-slate-100 pb-5">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-amber-500" />
            <div className="flex-1">
              <h2 className="text-sm font-extrabold text-slate-900">
                {language === 'ar' ? 'المهارات والتزكيات' : 'Skills & Endorsements'}
              </h2>
              <p className="text-[10px] text-slate-500">
                {language === 'ar'
                  ? 'المهارات الشخصية والمهنية وتزكيات قادة الكيان عليها.'
                  : 'Professional skills and endorsements from entity leadership.'}
              </p>
            </div>
          </div>

          {/* Add skill for profile owner */}
          {currentUser.id === userProfile.id && (
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newSkillText}
                onChange={(e) => setNewSkillText(e.target.value)}
                placeholder={language === 'ar' ? 'إضافة مهارة جديدة (مثلاً: تصميم، كتابة محتوى)...' : 'Add new skill...'}
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-eye-brand dark:text-white"
              />
              <button
                type="button"
                onClick={async () => {
                  const trimmed = newSkillText.trim();
                  if (!trimmed) return;
                  const currentSkills = userProfile.skills || [];
                  if (currentSkills.includes(trimmed)) return;
                  const updatedSkills = [...currentSkills, trimmed];
                  await db.updateUserSkills(userProfile.id, updatedSkills);
                  setUserProfile(prev => ({ ...prev, skills: updatedSkills }));
                  setNewSkillText('');
                }}
                className="bg-amber-500 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-amber-600 transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'إضافة' : 'Add'}
              </button>
            </div>
          )}

          {(!userProfile.skills || userProfile.skills.length === 0) ? (
            <p className="text-xs text-slate-400 font-bold italic py-2">
              {language === 'ar' ? 'لا توجد مهارات مضافة بعد.' : 'No skills listed yet.'}
            </p>
          ) : (
            <div className="space-y-3">
              {(userProfile.skills || []).map((skill) => {
                const skillEndorsements = userProfile.endorsements?.[skill] || [];
                const alreadyEndorsed = skillEndorsements.includes(currentUser.fullName);
                const isLeader = currentUser.role === 'Leader' || currentUser.role === 'Super Admin' || currentUser.role === 'Vice' || currentUser.role === 'Coordinator' || currentUser.role === 'Deputy Coordinator' || currentUser.role === 'Head' || currentUser.role === 'Central';

                return (
                  <div key={skill} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-100">{skill}</span>
                        {skillEndorsements.length > 0 && (
                          <span className="text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold px-1.5 py-0.5 rounded-md">
                            {skillEndorsements.length} {language === 'ar' ? 'تزكية' : 'endorsements'}
                          </span>
                        )}
                      </div>
                      {skillEndorsements.length > 0 && (
                        <p className="text-[9px] text-slate-400 font-bold mt-1">
                          {language === 'ar' ? 'تزكية من: ' : 'Endorsed by: '}
                          {skillEndorsements.join('، ')}
                        </p>
                      )}
                    </div>

                    {currentUser.id !== userProfile.id && isLeader && (
                      <button
                        type="button"
                        disabled={alreadyEndorsed}
                        onClick={async () => {
                          await db.endorseSkill(userProfile.id, skill, currentUser.fullName);
                          setUserProfile(prev => {
                            const newEndorsements = { ...(prev.endorsements || {}) };
                            if (!newEndorsements[skill]) newEndorsements[skill] = [];
                            if (!newEndorsements[skill].includes(currentUser.fullName)) {
                              newEndorsements[skill].push(currentUser.fullName);
                            }
                            return { ...prev, endorsements: newEndorsements };
                          });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          alreadyEndorsed
                            ? 'bg-slate-100 dark:bg-slate-850 text-slate-400 cursor-not-allowed border border-slate-200/50 dark:border-slate-800'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm hover:from-amber-600 hover:to-orange-600 cursor-pointer border border-transparent'
                        }`}
                      >
                        {alreadyEndorsed
                          ? (language === 'ar' ? 'تمت التزكية ✓' : 'Endorsed ✓')
                          : (language === 'ar' ? 'تزكية المهارة' : 'Endorse Skill')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Activity className="w-5 h-5 text-amber-500" />
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">{language === 'ar' ? 'سجل الأنشطة والعمليات بالنظام' : 'System Activity Log Timeline'}</h2>
            <p className="text-[10px] text-slate-500">{language === 'ar' ? 'سجل زمني حي لجميع العمليات والأنشطة في مساحة العمل الخاصة بك.' : 'Real-time audit history of your workspace actions.'}</p>
          </div>
        </div>

        <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              {language === 'ar' ? 'لا توجد أنشطة مسجلة بعد.' : 'No activity logs recorded.'}
            </div>
          ) : (
            <div className={`relative border-slate-100 space-y-6 ${language === 'ar' ? 'border-r-2 mr-4 pr-6' : 'border-l-2 ml-4 pl-6'}`}>
              {logs.map((log) => (
                <div key={log.id} className="relative">
                  {/* Dot */}
                  <span className={`absolute top-1.5 w-3 h-3 rounded-full bg-white border-2 border-amber-500 ${language === 'ar' ? '-right-7.5' : '-left-7.5'}`} />

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 hover:border-slate-300 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${getLogColor(log.action)}`}>
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-semibold">{log.details}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{language === 'ar' ? 'المستخدم المسؤول: ' : 'Operator: '}{log.userName} ({log.userRole})</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image Adjuster & Cropper Modal */}
      {cropImageSrc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-xl space-y-6 animate-scale-in text-slate-800 dark:text-slate-100">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {language === 'ar' ? 'تعديل وقص الصورة الشخصية' : 'Adjust & Crop Profile Image'}
              </h3>
              <button
                type="button"
                onClick={() => { setCropImageSrc(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hint */}
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold text-center leading-relaxed">
              {language === 'ar'
                ? 'اسحب الصورة داخل الإطار لضبط الموضع، واستخدم شريط التكبير لضبط الحجم.'
                : 'Drag the image inside the frame to adjust position, and use the zoom slider to resize.'}
            </p>

            {/* Drag & Drop Crop viewport */}
            <div
              className="relative w-64 h-64 mx-auto overflow-hidden rounded-3xl bg-slate-100 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 cursor-move select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={cropImageSrc}
                alt="Crop preview"
                style={{
                  transform: `translate(${cropX}px, ${cropY}px) scale(${cropZoom}) rotate(${cropRotation}deg)`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                }}
                className="absolute max-w-none w-full h-full object-contain pointer-events-none"
              />
              {/* Overlay Circular guideline */}
              <div className="absolute inset-0 border-[6px] border-black/40 pointer-events-none rounded-3xl"></div>
              <div className="absolute inset-[6px] border border-dashed border-white/60 pointer-events-none rounded-full"></div>
            </div>

            {/* Sliders & Adjustment Inputs */}
            <div className="space-y-4 text-xs font-bold">
              {/* Zoom control slider */}
              <div className="space-y-1.5 text-start">
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>{language === 'ar' ? 'درجة التكبير' : 'Zoom Level'}</span>
                  <span>{Math.round(cropZoom * 100)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <ZoomOut className="w-4 h-4 text-slate-400" />
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.05"
                    value={cropZoom}
                    onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-amber-500 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  />
                  <ZoomIn className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Rotation control slider */}
              <div className="space-y-1.5 text-start">
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>{language === 'ar' ? 'درجة الدوران' : 'Rotation Angle'}</span>
                  <span>{cropRotation}°</span>
                </div>
                <div className="flex items-center gap-3">
                  <RotateCw className="w-4 h-4 text-slate-400" />
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="5"
                    value={cropRotation}
                    onChange={(e) => setCropRotation(parseInt(e.target.value))}
                    className="flex-1 accent-amber-500 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Output Quality/Dimension Selector */}
              <div className="space-y-1.5 text-start">
                <label className="text-[10px] text-slate-500 uppercase">{language === 'ar' ? 'أبعاد الصورة وحجمها' : 'Image Resolution'}</label>
                <select
                  value={cropDimension}
                  onChange={(e) => setCropDimension(parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-100 focus:outline-none"
                >
                  <option value={150}>{language === 'ar' ? '150 × 150 (حجم صغير وسريع)' : '150 x 150 (Compact - Recommended)'}</option>
                  <option value={250}>{language === 'ar' ? '250 × 250 (جودة متوسطة)' : '250 x 250 (Medium Quality)'}</option>
                  <option value={400}>{language === 'ar' ? '400 × 400 (دقة فائقة وواضحة)' : '400 x 400 (Ultra Quality)'}</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setCropImageSrc(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveCrop}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-sm shadow-amber-500/10 cursor-pointer"
              >
                {language === 'ar' ? 'قص وحفظ الصورة' : 'Crop & Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Print Profile Template (Visible ONLY during print) */}
      <div className="hidden print:block p-8 bg-white text-black font-sans space-y-6">
        <div className="flex justify-between items-center border-b-2 border-blue-600 pb-4">
          <div>
            <h1 className="text-2xl font-black text-blue-900">الملف الشخصي الرسمي للعضو — EYE</h1>
            <p className="text-xs text-slate-600 font-bold">محافظة الغربية — كيان المصريون الشباب</p>
          </div>
          <img src="/eye-logo-transparent.png" alt="logo" className="w-16 h-16 object-contain" />
        </div>

        <div className="grid grid-cols-2 gap-4 border border-slate-300 p-5 rounded-2xl bg-slate-50">
          <div><strong className="text-blue-900">الاسم بالكامل:</strong> {userProfile.fullName}</div>
          {currentUser.role !== 'Member' && <div><strong className="text-blue-900">كود العضوية:</strong> {userProfile.membershipCode}</div>}
          <div><strong className="text-blue-900">الصفة والمنصب:</strong> {userProfile.role}</div>
          <div><strong className="text-blue-900">اللجنة:</strong> {userProfile.committee}</div>
          <div><strong className="text-blue-900">القسم النوعي:</strong> {userProfile.department || 'عام'}</div>
          <div><strong className="text-blue-900">تاريخ الانضمام:</strong> {userProfile.joinedDate}</div>
          {userProfile.phoneNumber && <div><strong className="text-blue-900">رقم الهاتف:</strong> {userProfile.phoneNumber}</div>}
          {userProfile.linkedInUrl && <div><strong className="text-blue-900">حساب LinkedIn:</strong> {userProfile.linkedInUrl}</div>}
        </div>

        {userProfile.bio && (
          <div className="p-4 border border-slate-300 rounded-xl bg-white">
            <h3 className="text-xs font-black text-blue-900 mb-1">النبذة الشخصية:</h3>
            <p className="text-xs text-slate-800 leading-relaxed">{userProfile.bio}</p>
          </div>
        )}

        {/* 2 Official HR Signatures */}
        <div className="pt-8 border-t-2 border-slate-300 flex items-center justify-between text-xs font-bold mt-12">
          <div className="flex items-center gap-3">
            <img src="/eye-logo-transparent.png" alt="seal" className="w-12 h-12 object-contain" />
            <div>
              <div className="font-black text-blue-900">• وثيقة ملف شخصي معتمدة رسمياً •</div>
              <div className="text-[10px] text-slate-500">منظومة الإدارة والموارد البشرية — EYE</div>
            </div>
          </div>

          <div className="flex items-center gap-8 text-center">
            {/* Signature 1 */}
            <div className="flex flex-col items-center">
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-[10px] font-black">
                مسؤول لجنة الموارد البشرية
              </span>
              <span className="text-base font-black text-slate-900 mt-1" style={{ fontFamily: "'Aldhabi', 'Aref Ruqaa', 'Amiri', 'Traditional Arabic', serif", fontSize: '16px' }}>أحمد إبراهيم</span>
              <div className="w-28 h-px bg-blue-600 my-1" />
              <span className="text-[10px] font-bold text-slate-700">أ. أحمد إبراهيم</span>
            </div>


          </div>
        </div>
      </div>

      {/* Official Disciplinary Document Viewing Modal - TRUE 100% FULLSCREEN VIEWER */}
      {viewingDisciplinary && (
        <div className="fixed inset-0 z-[999999] bg-slate-100 dark:bg-slate-950 flex flex-col w-screen h-screen overflow-hidden animate-fade-in" style={{ zIndex: 999999 }} dir="rtl">
          {/* Top Fullscreen Header Toolbar */}
          <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md shrink-0 text-slate-900 dark:text-white no-print">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black flex items-center gap-2">
                  <span>{viewingDisciplinary.type === 'lft_nazar' || viewingDisciplinary.severity === 'Notice' ? 'المستند الرسمي — لفت نظر 📜' : 'المستند الرسمي — إنذار معتمد 🔴'}</span>
                  <span className="text-xs font-mono font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/60 px-2.5 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                    {viewingDisciplinary.noticeNumber || '01'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">العضو: <span className="text-slate-900 dark:text-slate-200 font-bold">{viewingDisciplinary.memberName}</span> • {viewingDisciplinary.committee || 'عام'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  const isNotice = viewingDisciplinary.type === 'lft_nazar' || viewingDisciplinary.severity === 'Notice';
                  fillAndDownloadDocxTemplate(isNotice ? 'lft_nazar' : 'inzar', {
                    memberName: viewingDisciplinary.memberName,
                    committeeName: viewingDisciplinary.committee || 'عام',
                    governorate: viewingDisciplinary.governorate || 'الغربية',
                    noticeNumber: viewingDisciplinary.noticeNumber || '01',
                    meetingDay: viewingDisciplinary.meetingDay || 'الاجتماع الدوري',
                    meetingDate: viewingDisciplinary.meetingDate || new Date(viewingDisciplinary.issuedAt).toLocaleDateString('ar-EG'),
                    hrManager: viewingDisciplinary.issuedByName || 'أحمد إبراهيم',
                    coordinator: viewingDisciplinary.coordinator || 'محمود ربيع',
                  });
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تحميل Word (.docx)</span>
              </button>
              <button
                type="button"
                onClick={() => handlePrintDisciplinaryDoc(viewingDisciplinary)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة (PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingDisciplinary(null)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-500 text-slate-700 dark:text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-bold border border-slate-200 dark:border-slate-700"
                title="إغلاق الشاشة"
              >
                <X className="w-5 h-5" />
                <span className="hidden sm:inline">إغلاق</span>
              </button>
            </div>
          </div>

          {/* Full Screen Scrollable Canvas */}
          <div className="flex-1 w-full overflow-y-auto p-4 sm:p-10 flex justify-center items-start bg-slate-100 dark:bg-slate-900">
            {/* Official Document Paper View (Exact Vertical A4 Portrait Format) */}
            <div className="bg-white text-slate-950 p-8 sm:p-14 rounded-2xl border-2 border-slate-300 shadow-2xl relative overflow-hidden font-sans select-none w-full max-w-[820px] min-h-[1100px] flex flex-col justify-between my-2" dir="rtl" style={{ color: '#090d16', backgroundColor: '#ffffff' }}>
              {/* Background Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                <img src="/eye-logo.png" alt="watermark" className="w-80 h-80 object-contain" />
              </div>

              {/* Document Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 text-xs font-bold relative z-10 text-black">
                <div className="space-y-1 text-right">
                  <div className="font-black text-blue-900 text-sm sm:text-base">جمهورية مصر العربية</div>
                  <div className="text-slate-800">وزارة الشباب والرياضة</div>
                  <div className="text-emerald-700 font-bold">الإدارة المركزية لتنمية الشباب</div>
                </div>

                <div className="text-center space-y-1 flex flex-col items-center">
                  <img src="/eye-logo.png" alt="EYE" className="w-14 h-14 object-contain mb-1" />
                  <div className="font-black text-blue-900 text-base sm:text-lg">كيان EYE الشبابي</div>
                  <div className="text-slate-700 font-bold text-xs">محافظة {viewingDisciplinary.governorate || 'الغربية'}</div>
                </div>

                <div className="text-left space-y-1">
                  <div className="font-black text-slate-800">مستند إداري معتمد</div>
                  <div className="font-mono text-slate-700 font-bold text-xs">كود: {viewingDisciplinary.regulationCode || (viewingDisciplinary.type === 'inzar' ? 'WR-01' : 'LN-01')}</div>
                  <div className="text-[11px] text-slate-500">{new Date(viewingDisciplinary.issuedAt).toLocaleDateString('ar-EG')}</div>
                </div>
              </div>

              {/* Body Content */}
              <div className="relative z-10 space-y-6 text-right text-black my-auto py-6">
                <h2 className="text-center font-black text-3xl sm:text-4xl text-rose-600 underline underline-offset-8">
                  {viewingDisciplinary.type === 'lft_nazar' || viewingDisciplinary.severity === 'Notice' ? 'لفت نظر' : 'إنذار'}
                </h2>

                <p className="font-bold text-base sm:text-lg leading-relaxed text-black pt-4">
                  بعد الاطلاع على اللائحة التنفيذية والقوانين المنظمة للكيان الخاصة بحقوق وواجبات الأعضاء، قررنا نحن مسئولو لجنة الموارد البشرية بمحافظة: <span className="underline font-black text-slate-900">{viewingDisciplinary.governorate || 'الغربية'}</span>
                </p>

                <p className="font-black text-base sm:text-lg text-black">
                  توجيه {viewingDisciplinary.type === 'lft_nazar' || viewingDisciplinary.severity === 'Notice' ? 'لفت نظر' : 'الإنذار'} رقم ( <span className="font-black text-rose-600 font-mono text-xl">{viewingDisciplinary.noticeNumber || '01'}</span> ) .
                </p>

                <div className="flex flex-wrap justify-between font-black text-base sm:text-lg my-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-black">
                  <div>للعضو: <span className="text-rose-700 font-black px-2">{viewingDisciplinary.memberName}</span></div>
                  <div>لجنة: <span className="text-rose-700 font-black px-2">{viewingDisciplinary.committee || 'عام'}</span></div>
                </div>

                <p className="font-bold text-base sm:text-lg leading-relaxed text-black">
                  {viewingDisciplinary.reason && !viewingDisciplinary.reason.includes('اجتماع')
                    ? viewingDisciplinary.reason
                    : `وذلك لعدم حضور اجتماع يوم ( ${viewingDisciplinary.meetingDay || 'الاجتماع الدوري'} ) ، الموافق ( ${viewingDisciplinary.meetingDate || new Date(viewingDisciplinary.issuedAt).toLocaleDateString('ar-EG')} ) دون التبليغ بعذر عدم الحضور لمن يهمه الأمر.`}
                </p>

                {/* Regulatory Alert Banner */}
                <div className="border-2 border-dashed border-rose-500 bg-rose-50/90 p-5 rounded-2xl text-center text-rose-800 space-y-2 my-6">
                  <div className="font-black flex items-center justify-center gap-2 text-base text-rose-600">
                    <span className="text-lg">🛑</span>
                    <span>تنبيه تنظيمي</span>
                  </div>
                  <p className="font-bold text-xs sm:text-sm leading-relaxed text-rose-900">
                    {viewingDisciplinary.type === 'lft_nazar' || viewingDisciplinary.severity === 'Notice'
                      ? 'يرجى العلم أن تلقي عدد 2 لفت نظر يُعتبر معادلاً للحصول على إنذار واحد، نرجو الالتزام بالإرشادات المحددة لتجنب أي إجراءات قد تؤثر على استمرار مشاركتكم.'
                      : 'نود إعلامكم أنه سيتم إنهاء المشاركة بالكيان بشكل رسمي في حال تلقي ثلاثة إنذارات، نرجو الالتزام بالتوجيهات لضمان استمرار مشاركتكم الفعالة وخدمة وطننا.'}
                  </p>
                </div>
              </div>

              {/* Signatures & Footer */}
              <div className="relative z-10 pt-6 border-t-2 border-slate-300 text-black">
                <div className="flex justify-between text-center font-bold text-xs sm:text-sm">
                  <div className="space-y-4">
                    <div className="font-black text-slate-700">مسؤول لجنة الموارد البشرية</div>
                    <div className="font-black text-base text-slate-900 border-b border-dashed border-slate-400 pb-1">
                      أ. {viewingDisciplinary.issuedByName || 'أحمد إبراهيم'}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="font-black text-slate-700">منسق عام المحافظة</div>
                    <div className="font-black text-base text-slate-900 border-b border-dashed border-slate-400 pb-1">
                      أ. {viewingDisciplinary.coordinator || 'محمود ربيع'}
                    </div>
                  </div>
                </div>

                <div className="text-center font-black text-sky-600 text-xs mt-6 pt-3 border-t border-slate-200">
                  #معا_نحو_مستقبل_افضل
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      </>
      )}
    </div>
  </>
);
};
