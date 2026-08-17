import React, { useState, useEffect, useRef } from 'react';
import { IssuedCertificate } from '../types';
import {
  formatArabicConjunctions,
  getCommitteeSignatories,
  translateRoleEn,
  translateCommitteeEn,
  translateRoleAr,
  translateCommitteeAr,
} from '../lib/certificateGenerator';

const FONT_AR = "'Cairo', 'IBM Plex Sans Arabic', 'Aref Ruqaa', Georgia, serif";
const FONT_EN = "Georgia, 'Times New Roman', serif";
const BASE_W = 1122;
const BASE_H = 794;

let measurer: CanvasRenderingContext2D | null = null;
const getMeasurer = (): CanvasRenderingContext2D | null => {
  if (typeof document === 'undefined') return null;
  if (!measurer) measurer = document.createElement('canvas').getContext('2d');
  return measurer;
};

const wrapBody = (text?: string, isEn?: boolean, size?: number, maxW = 880): string[] => {
  if (!text) return [];
  const m = getMeasurer();
  const fontSize = size || 14.5;
  const font = `600 ${fontSize}px ${isEn ? 'Georgia' : 'Cairo'}`;
  if (m) m.font = font;
  const words = String(text).split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (m && m.measureText(test).width > maxW) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4);
};

const computeCertId = (cert?: IssuedCertificate): string => {
  if (!cert) return 'EYE-CERT-0000';
  if (cert.id) {
    return 'EYE-CERT-' + String(cert.id).replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  }
  const name = cert.recipientName || 'EYE';
  return 'EYE-CERT-' + ([...name].reduce((a, ch) => (a * 31 + (ch.codePointAt(0) || 0)) % 100000, 7)).toString().padStart(4, '0');
};

interface TXTProps {
  x: number;
  y: number;
  size: number;
  color: string;
  w?: number | string;
  f?: string;
  weight?: number | string;
  ls?: string;
  dir?: 'ltr' | 'rtl' | 'auto';
  z?: number;
  children: React.ReactNode;
}

const TXT: React.FC<TXTProps> = ({ x, y, size, color, w, f, weight = 700, ls, dir = 'auto', z, children }) => (
  <div
    dir={dir}
    style={{
      position: 'absolute',
      left: x,
      top: y - size,
      width: w || 'max-content',
      transform: 'translateX(-50%)',
      textAlign: 'center',
      fontSize: size,
      lineHeight: `${size * 1.3}px`,
      fontWeight: weight,
      fontFamily: f || FONT_AR,
      color,
      letterSpacing: ls,
      zIndex: z,
    }}
  >
    {children}
  </div>
);

const Diamond: React.FC<{ x: number; y: number; s: number; c: string }> = ({ x, y, s, c }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: s, height: s, background: c, transform: 'translate(-50%, -50%) rotate(45deg)', zIndex: 2 }} />
);

const Bracket: React.FC<{ x: number; y: number; dx: number; dy: number; color: string }> = ({ x, y, dx, dy, color }) => (
  <svg width="40" height="40" style={{ position: 'absolute', left: dx > 0 ? x : x - 40, top: dy > 0 ? y : y - 40, zIndex: 3, pointerEvents: 'none' }}>
    <path
      d={`M ${dx > 0 ? 0 : 40} ${dy > 0 ? 40 : 0} L ${dx > 0 ? 0 : 40} ${dy > 0 ? 0 : 40} L ${dx > 0 ? 40 : 0} ${dy > 0 ? 40 : 0}`}
      fill="none"
      stroke={color}
      strokeWidth="3.5"
    />
  </svg>
);

// Ornate Corner SVG Filigree for Royal Blue Style
const CornerFiligree: React.FC<{ x: number; y: number; rotate: number; color: string }> = ({ x, y, rotate, color }) => (
  <svg
    width="50"
    height="50"
    viewBox="0 0 50 50"
    style={{
      position: 'absolute',
      left: x,
      top: y,
      transform: `rotate(${rotate}deg)`,
      zIndex: 4,
      pointerEvents: 'none',
    }}
  >
    <path
      d="M 6 6 L 44 6 C 30 6, 20 16, 20 30 C 20 38, 14 44, 6 44 L 6 6 Z"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
    />
    <circle cx="12" cy="12" r="3" fill={color} />
    <path d="M 6 24 C 14 24, 24 14, 24 6" fill="none" stroke={color} strokeWidth="1.5" />
  </svg>
);

interface PremiumCertificateProps {
  cert: IssuedCertificate;
  logo?: string;
  width?: number;
  zoom?: number;
  rotation?: number;
  className?: string;
}

const PremiumCertificate: React.FC<PremiumCertificateProps> = ({ cert, logo = '/eye-logo-premium.jpg', width = 680, zoom = 1, rotation = 0, className }) => {
  if (!cert) return null;
  const isEn = cert.lang === 'en';

  const PRIMARY = '#1D4ED8';
  const DARK = '#1E3A8A';
  const LIGHT = '#DBEAFE';
  const TEXT_MAIN = '#0f172a';
  const BG_STYLE = 'linear-gradient(135deg, #ffffff 0%, #f0f5ff 50%, #e8f0fe 100%)';

  const date = cert.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString(isEn ? 'en-US' : 'ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString(isEn ? 'en-US' : 'ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  const ref = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(width);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setBoxW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = boxW / BASE_W;

  const certType = cert.certType;
  let title = cert.title;
  if (!title || (isEn && title.includes('شهادة'))) {
    if (certType === 'excellence') title = isEn ? 'Certificate of Excellence' : 'شهادة تميز وإتقان';
    else if (certType === 'training') title = isEn ? 'Certificate of Training Completion' : 'شهادة إتمام تدريب';
    else if (certType === 'leadership') title = isEn ? 'Leadership Excellence Certificate' : 'شهادة القيادة المتميزة';
    else title = isEn ? 'Certificate of Appreciation' : 'شهادة تقدير وعرفان';
  }
  const enSub = certType === 'excellence' ? 'CERTIFICATE OF EXCELLENCE'
    : certType === 'training' ? 'CERTIFICATE OF TRAINING COMPLETION'
      : certType === 'leadership' ? 'LEADERSHIP EXCELLENCE CERTIFICATE'
        : 'CERTIFICATE OF APPRECIATION';
  const arSub = certType === 'excellence' ? 'شهادة تميز وإتقان'
    : certType === 'training' ? 'شهادة إتمام تدريب'
      : certType === 'leadership' ? 'شهادة القيادة المتميزة'
        : 'شهادة تقدير وعرفان';

  const intro = isEn
    ? 'The Egyptian Youth Entity EYE is honored to present this certificate to'
    : 'يتشرف كيان المصريون الشباب EYE بتكريم العضو المتميز';

  const roleDisplay = isEn ? translateRoleEn(cert.recipientRole) : translateRoleAr(cert.recipientRole);
  const commDisplay = isEn ? translateCommitteeEn(cert.committee) : translateCommitteeAr(cert.committee);
  const certId = computeCertId(cert);

  const sigs = getCommitteeSignatories(cert.committee || 'HR', isEn ? 'en' : 'ar');
  const signatories = isEn
    ? [
      { title: 'Entity President', sig: 'Mohamed Metwally', name: 'Mr. Mohamed Metwally', x: 220 },
      { title: 'Governorate Coordinator', sig: 'Mahmoud Rabie', name: 'Mr. Mahmoud Rabie', x: 561 },
      { title: 'HR Committee Head', sig: 'Ahmed Ibrahim', name: 'Mr. Ahmed Ibrahim', x: 902 },
    ]
    : [
      { title: 'رئيس الكيان', sig: 'محمد متولي', name: 'أ. محمد متولي', x: 902 },
      { title: 'رئيس الغربية', sig: 'محمود ربيع', name: 'أ. محمود ربيع', x: 561 },
      { title: 'مسؤول لجنة الموارد البشرية', sig: 'أحمد إبراهيم', name: 'أ. أحمد إبراهيم', x: 220 },
    ];

  const bodyText = cert.body || '';
  const lines = wrapBody(bodyText, isEn, 14.5, isEn ? 940 : 880);

  const hasGrade = cert.grade !== undefined && cert.grade !== null && !isNaN(cert.grade);
  const panelY = hasGrade ? 568 : 504;
  const panelX = 112;
  const panelW = BASE_W - panelX * 2;
  const panelH = 28 + lines.length * 20;

  const wingLine = 78;

  const ornamentDivider = (y: number, x1 = 280, x2 = 842) => (
    <React.Fragment>
      <div style={{ position: 'absolute', left: x1, top: y - 0.75, width: x2 - x1, height: 1.5, background: LIGHT }} />
      <Diamond x={BASE_W / 2} y={y} s={8} c={PRIMARY} />
      <div style={{ position: 'absolute', left: BASE_W / 2 - 20, top: y, width: 4, height: 4, background: LIGHT, borderRadius: '50%', transform: 'translate(-50%, -50%)', zIndex: 2 }} />
      <div style={{ position: 'absolute', left: BASE_W / 2 + 20, top: y, width: 4, height: 4, background: LIGHT, borderRadius: '50%', transform: 'translate(-50%, -50%)', zIndex: 2 }} />
    </React.Fragment>
  );

  return (
    <div ref={ref} className={className} style={{ width: '100%', position: 'relative', margin: '0 auto' }}>
      <div style={{ position: 'relative', width: '100%', paddingBottom: `${(BASE_H / BASE_W) * 100}%`, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: BASE_W,
            height: BASE_H,
            transformOrigin: 'top left',
            transform: `scale(${scale * zoom}) rotate(${rotation}deg)`,
            background: BG_STYLE,
            boxShadow: '0 15px 35px -10px rgba(0,0,0,0.2)',
            overflow: 'hidden',
          }}
        >
          {/* Faint Background Hairline Pattern */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `repeating-linear-gradient(135deg, ${LIGHT} 0px, ${LIGHT} 1px, transparent 1px, transparent 35px)`,
              opacity: 0.25,
            }}
          />

          {/* Faint Center EYE Watermark */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 280,
              fontWeight: 900,
              color: 'rgba(29, 78, 216, 0.05)',
              fontFamily: isEn ? FONT_EN : FONT_AR,
              userSelect: 'none',
              pointerEvents: 'none',
              letterSpacing: 15,
            }}
          >
            EYE
          </div>

          {/* Double Framing & Corner Ornaments */}
          <div style={{ position: 'absolute', left: 22, top: 22, width: BASE_W - 44, height: BASE_H - 44, border: `2.5px solid ${PRIMARY}`, boxSizing: 'border-box' }} />
          <div style={{ position: 'absolute', left: 30, top: 30, width: BASE_W - 60, height: BASE_H - 60, border: '1px solid rgba(29, 78, 216, 0.3)', boxSizing: 'border-box' }} />

          <Bracket x={42} y={42} dx={1} dy={1} color={PRIMARY} />
          <Bracket x={BASE_W - 42} y={42} dx={-1} dy={1} color={PRIMARY} />
          <Bracket x={42} y={BASE_H - 42} dx={1} dy={-1} color={PRIMARY} />
          <Bracket x={BASE_W - 42} y={BASE_H - 42} dx={-1} dy={-1} color={PRIMARY} />

          {/* Header Metadata */}
          {isEn ? (
            <>
              <div style={{ position: 'absolute', left: 75, top: 52, textAlign: 'left', zIndex: 3 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: PRIMARY }}>• Official Certified Document •</p>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: '#475569' }}>Egyptian Youth Entity Accreditation</p>
                <p style={{ margin: 0, fontSize: 9.5, fontWeight: 600, color: '#64748b', fontFamily: 'monospace' }}>ID: {certId}</p>
              </div>
              <div style={{ position: 'absolute', right: 75, top: 52, textAlign: 'right', zIndex: 3 }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: '#64748b' }}>Issue Date</p>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: TEXT_MAIN }}>{date}</p>
                <p style={{ margin: 0, fontSize: 9, fontWeight: 500, color: '#94a3b8' }}>Official Date</p>
              </div>
            </>
          ) : (
            <>
              <div style={{ position: 'absolute', right: 75, top: 52, textAlign: 'right', zIndex: 3 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: PRIMARY, fontFamily: FONT_AR }}>• وثيقة رسمية معتمدة •</p>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: '#475569', fontFamily: FONT_AR }}>Egyptian Youth Entity — EYE</p>
                <p style={{ margin: 0, fontSize: 9.5, fontWeight: 600, color: '#64748b', fontFamily: 'monospace' }}>ID: {certId}</p>
              </div>
              <div style={{ position: 'absolute', left: 75, top: 52, textAlign: 'left', zIndex: 3 }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: '#64748b', fontFamily: FONT_AR }}>تاريخ الإصدار</p>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: TEXT_MAIN, fontFamily: FONT_AR }}>{date}</p>
                <p style={{ margin: 0, fontSize: 9, fontWeight: 500, color: '#94a3b8', fontFamily: FONT_EN }}>Issue Date</p>
              </div>
            </>
          )}

          {/* Top Center Blue Emblem */}
          <div style={{ position: 'absolute', left: BASE_W / 2, top: 104, transform: 'translate(-50%, -50%)', width: 88, height: 88, borderRadius: '50%', border: `3px solid ${PRIMARY}`, boxSizing: 'border-box', zIndex: 3, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 4 }}>
            <img src={logo} alt="EYE" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'contain' }} draggable={false} />
          </div>

          {/* Org Title */}
          <TXT x={BASE_W / 2} y={192} size={30} color={TEXT_MAIN} weight={900} f={isEn ? FONT_EN : FONT_AR} w={960} dir={isEn ? 'ltr' : 'rtl'}>
            {isEn ? 'Egyptian Youth Entity' : 'كيان المصريون الشباب'}
          </TXT>
          <TXT x={BASE_W / 2} y={214} size={12} color={PRIMARY} weight={700} f={FONT_EN} ls="4px" w={700} dir="ltr">
            EYE &nbsp;•&nbsp; EGYPTIAN YOUTH ENTITY
          </TXT>

          {/* Top Divider */}
          {ornamentDivider(236, 280, 842)}

          {/* Certificate Title */}
          <TXT x={BASE_W / 2} y={286} size={44} color={PRIMARY} weight={900} f={isEn ? FONT_EN : FONT_AR} w={920} dir={isEn ? 'ltr' : 'rtl'}>
            {title}
          </TXT>
          <TXT x={BASE_W / 2} y={314} size={12.5} color={DARK} weight={800} f={FONT_EN} ls="3px" w={700} dir="ltr">
            {isEn ? enSub : arSub}
          </TXT>

          {ornamentDivider(334, 280, 842)}

          {/* Intro line */}
          <TXT x={BASE_W / 2} y={368} size={15} color={TEXT_MAIN} weight={800} f={isEn ? FONT_EN : FONT_AR} w={980} dir={isEn ? 'ltr' : 'rtl'}>
            {intro}
          </TXT>

          {/* Recipient Name with Wings / Flourishes */}
          <div style={{ position: 'absolute', left: BASE_W / 2, top: 430, transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', gap: 18, zIndex: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Diamond x={0} y={0} s={6} c={PRIMARY} />
              <div style={{ position: 'relative', width: wingLine, height: 2, background: LIGHT, marginLeft: -3 }} />
              <div style={{ position: 'relative', width: 5, height: 5, borderRadius: '50%', background: LIGHT, marginLeft: -3 }} />
            </div>
            <span style={{ fontSize: 42, fontWeight: 900, color: '#000000', fontFamily: isEn ? FONT_EN : FONT_AR, whiteSpace: 'nowrap', lineHeight: 1 }}>
              {cert.recipientName}
            </span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 5, height: 5, borderRadius: '50%', background: LIGHT, marginRight: -3 }} />
              <div style={{ position: 'relative', width: wingLine, height: 2, background: LIGHT, marginRight: -3 }} />
              <Diamond x={0} y={0} s={6} c={PRIMARY} />
            </div>
          </div>

          {/* Role & Committee Pill Badge */}
          <div style={{ position: 'absolute', left: '50%', top: 464, transform: 'translateX(-50%)', zIndex: 4 }}>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 22px',
                borderRadius: 20,
                background: '#dbeafe',
                border: '1px solid #bfdbfe',
                fontSize: 13.5,
                fontWeight: 800,
                color: '#1e40af',
                fontFamily: isEn ? FONT_EN : FONT_AR,
              }}
            >
              {commDisplay} &nbsp;✦&nbsp; {roleDisplay}
            </span>
          </div>

          {/* Grade Score Badge (If specified) */}
          {hasGrade && (
            <div style={{ position: 'absolute', left: BASE_W / 2, top: 504, transform: 'translateX(-50%)', textAlign: 'center', zIndex: 5 }}>
              <div
                style={{
                  width: 50,
                  height: 50,
                  margin: '0 auto',
                  borderRadius: '50%',
                  border: '3px solid #059669',
                  background: '#ecfdf5',
                  color: '#047857',
                  fontSize: 22,
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(5,150,105,0.25)',
                }}
              >
                {cert.grade}
              </div>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: '#047857', fontFamily: FONT_AR, marginTop: 1, display: 'block' }}>
                {isEn ? 'Performance Grade' : 'تقييم الأداء'}
              </span>
            </div>
          )}

          {/* Body Box Panel */}
          {(() => {
            const bodyY = hasGrade ? 568 : 504;
            return (
              <>
                <div
                  style={{
                    position: 'absolute',
                    left: panelX,
                    top: bodyY - 12,
                    width: panelW,
                    height: panelH,
                    background: 'rgba(239, 246, 255, 0.7)',
                    border: '1px solid rgba(191, 219, 254, 0.8)',
                    borderRadius: 12,
                    zIndex: 3,
                  }}
                />
                {lines.map((line, i) => (
                  <TXT key={i} x={BASE_W / 2} y={bodyY + 12 + i * 20} size={14} color={TEXT_MAIN} weight={600} f={isEn ? FONT_EN : FONT_AR} w={isEn ? 940 : 880} dir={isEn ? 'ltr' : 'rtl'}>
                    {line}
                  </TXT>
                ))}
              </>
            );
          })()}

          {/* Footer ornament divider */}
          {ornamentDivider(662, 175, 947)}

          {/* Three Signatories */}
          {signatories.map(s => (
            <div key={s.x} style={{ position: 'absolute', left: s.x, top: 672, transform: 'translateX(-50%)', textAlign: 'center', zIndex: 4 }}>
              <div
                style={{
                  display: 'inline-block',
                  padding: '3px 14px',
                  borderRadius: 12,
                  background: '#dbeafe',
                  border: '1px solid #bfdbfe',
                  color: PRIMARY,
                  fontSize: 11,
                  fontWeight: 800,
                  fontFamily: isEn ? FONT_EN : FONT_AR,
                  marginBottom: 4,
                }}
              >
                {s.title}
              </div>
              {isEn ? (
                <div style={{ fontSize: 22, fontWeight: 700, color: '#000000', fontFamily: "'Great Vibes', 'Dancing Script', 'Segoe Script', cursive", margin: '4px 0' }}>
                  {s.sig}
                </div>
              ) : (
                <div style={{ fontSize: 24, fontWeight: 700, color: '#000000', fontFamily: "'Aldhabi', 'Aref Ruqaa', 'Amiri', 'Traditional Arabic', serif", margin: '2px 0' }}>
                  {s.sig}
                </div>
              )}
              <div style={{ width: 124, height: 1.5, background: PRIMARY, margin: '2px auto 4px' }} />
              <div style={{ fontSize: 12.5, fontWeight: 800, color: TEXT_MAIN, fontFamily: isEn ? FONT_EN : FONT_AR }}>
                {s.name}
              </div>
            </div>
          ))}

          {/* Bottom Left Slogan Pill Badge */}
          <div
            style={{
              position: 'absolute',
              left: 70,
              bottom: 45,
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 16,
              padding: '5px 16px',
              color: '#1d4ed8',
              fontSize: 11,
              fontWeight: 800,
              fontFamily: FONT_AR,
              zIndex: 5,
            }}
          >
            • الالتزام • التطوير • خدمة المجتمع •
          </div>

          {/* Official Blue Circular EYE Seal Stamp */}
          <svg width="96" height="96" viewBox="0 0 96 96" style={{ position: 'absolute', right: 70, bottom: 35, transform: 'rotate(-12deg)', zIndex: 5 }}>
            <defs>
              <path id="blue-seal-top" d="M 4 48 A 44 44 0 0 1 92 48" />
              <path id="blue-seal-bottom" d="M 4 48 A 44 44 0 0 0 92 48" />
              <clipPath id="blue-seal-clip">
                <circle cx="48" cy="48" r="28" />
              </clipPath>
            </defs>
            <circle cx="48" cy="48" r="40" fill="none" stroke="#1D4ED8" strokeWidth="3" />
            <circle cx="48" cy="48" r="33" fill="none" stroke="#1E3A8A" strokeWidth="1" />
            <image href={logo} x="20" y="20" width="56" height="56" clipPath="url(#blue-seal-clip)" preserveAspectRatio="xMidYMid slice" />
            <text fontSize="7.5" fontWeight="700" fill="#1D4ED8" fontFamily="Georgia, serif" letterSpacing="0.5">
              <textPath href="#blue-seal-top" startOffset="50%" textAnchor="middle">EYE VERIFIED • OFFICIAL CERTIFIED DOCUMENT</textPath>
            </text>
            <text fontSize="7.5" fontWeight="700" fill="#1D4ED8" fontFamily="Georgia, serif" letterSpacing="0.5">
              <textPath href="#blue-seal-bottom" startOffset="50%" textAnchor="middle">EGYPTIAN YOUTH ENTITY</textPath>
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default PremiumCertificate;
