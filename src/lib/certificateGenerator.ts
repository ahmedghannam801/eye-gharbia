/**
 * EYE Workflow Hub — Certificate Generator
 * Generates a professional appreciation certificate as a PNG/PDF
 * using the browser's built-in Canvas API (no external libs needed).
 *
 * Matches exact reference design layout with authentic transparent signatures,
 * gold framing, official seals, and Arabic typography.
 */

export interface CertificateData {
  memberName: string;
  recipientRole?: string;
  certTitle?: string;   // certificate title (e.g. شهادة تقدير وعرفان)
  certType?: string;    // e.g. appreciation | excellence | training | leadership | custom
  body?: string;        // certificate body text
  taskName?: string;
  department?: string;
  grade?: number;
  reviewerName?: string;
  issuedByTitle?: string;
  issuedByName?: string;
  committee?: string;
  date: string;
  lang?: 'ar' | 'en';
  designStyle?: string;
  orientation?: 'landscape' | 'portrait';
  id?: string;          // certificate ID used by the premium template
}

export const formatArabicConjunctions = (text?: string): string => {
  if (!text) return '';
  return text.trim();
};

export interface CommitteeSignatories {
  headTitle: string;
  headName: string;
  viceTitle: string;
  viceName: string;
}

export const getCommitteeSignatories = (committee?: string, lang: 'ar' | 'en' = 'ar'): CommitteeSignatories => {
  const comm = (committee || '').toUpperCase().trim();
  const isEn = lang === 'en';

  // OR Committee (العلاقات والتنظيم)
  if (comm.includes('OR') || comm.includes('علاقات') || comm.includes('تنظيم')) {
    return {
      headTitle: isEn ? 'OR Committee Head' : 'رئيس لجنة الـ OR',
      headName: isEn ? 'Yara Yassin' : 'يارا يس',
      viceTitle: isEn ? 'OR Committee Vice Head' : 'نائب رئيس لجنة الـ OR',
      viceName: isEn ? 'Mohamed Abdelrabo' : 'محمد عبدربه',
    };
  }

  // SM Committee (السوشيال ميديا)
  if (comm.includes('SM') || comm.includes('سوشيال') || comm.includes('ميديا')) {
    return {
      headTitle: isEn ? 'SM Committee Head' : 'رئيس لجنة الـ SM',
      headName: isEn ? 'Mostafa Tarek' : 'مصطفى طارق',
      viceTitle: isEn ? 'SM Committee Vice Head' : 'نائب رئيس لجنة الـ SM',
      viceName: isEn ? 'Farah Attia' : 'فرح عطية',
    };
  }

  // Default HR (الموارد البشرية) or General
  return {
    headTitle: isEn ? 'HR Officer' : 'مسؤول لجنة الموارد البشرية',
    headName: isEn ? 'Ahmed Ibrahim' : 'أحمد إبراهيم',
    viceTitle: isEn ? 'HR Officer' : 'مسؤول لجنة الموارد البشرية',
    viceName: isEn ? 'Ahmed Ibrahim' : 'أحمد إبراهيم',
  };
};

export const translateRoleAr = (role?: string): string => {
  if (!role) return 'عضو متميز';
  if (role === 'Super Admin') return 'مسئول لجنة الموارد البشرية';
  if (role === 'Vice') return 'نائب رئيس اللجنة';
  if (role === 'Coordinator') return 'منسق المحافظة';
  if (role === 'Deputy Coordinator') return 'نائب منسق المحافظة';
  if (role === 'Leader') return 'قائد الفريق';
  if (role === 'HRM') return 'مسؤول الموارد البشرية';
  if (role === 'Member') return 'عضو متميز';
  return role;
};

export const translateCommitteeAr = (comm?: string): string => {
  if (!comm) return 'لجنة الموارد البشرية';
  const c = comm.toUpperCase().trim();
  if (c.includes('HR') || c.includes('موارد')) return 'لجنة الموارد البشرية';
  if (c.includes('PR') || c.includes('عامة')) return 'لجنة العلاقات العامة';
  if (c.includes('SM') || c.includes('سوشيال')) return 'لجنة السوشيال ميديا';
  if (c.includes('OR') || c.includes('تنظيم')) return 'لجنة العلاقات والتنظيم';
  return comm;
};

export const translateRoleEn = (role?: string): string => {
  if (!role) return 'Distinguished Member';
  if (role === 'Super Admin') return 'HR Committee Manager';
  if (role === 'Vice') return 'Committee Vice Head';
  if (role === 'Coordinator') return 'Governorate Coordinator';
  if (role === 'Deputy Coordinator') return 'Deputy Coordinator';
  if (role === 'Leader') return 'Team Leader';
  if (role === 'HRM') return 'HR Manager';
  return role === 'Member' ? 'Distinguished Member' : role;
};

export const translateCommitteeEn = (comm?: string): string => {
  if (!comm) return 'Human Resources Committee';
  const c = comm.toUpperCase().trim();
  if (c.includes('HR') || c.includes('موارد')) return 'Human Resources Committee';
  if (c.includes('PR') || c.includes('علاقات عامة')) return 'Public Relations Committee';
  if (c.includes('SM') || c.includes('سوشيال')) return 'Social Media Committee';
  if (c.includes('OR') || c.includes('تنظيم')) return 'Organization & Relations Committee';
  return comm;
};

export interface CertificateAssets {
  logoImg?: HTMLImageElement | null;
  sealImg?: HTMLImageElement | null;
  eagleImg?: HTMLImageElement | null;
  ahmedSig?: HTMLImageElement | null;
  mahmoudSig?: HTMLImageElement | null;
}

export const generateCertificate = (data: CertificateData, assetsInput?: CertificateAssets | HTMLImageElement | null): HTMLCanvasElement => {
  const isPortrait = data.orientation === 'portrait';
  const W = isPortrait ? 794 : 1122; // A4 @ 96dpi
  const H = isPortrait ? 1122 : 794;
  const SCALE = 3; // 3x = ~288dpi for crisp print & high-res PNG output
  const isEn = data.lang === 'en';

  const assets: CertificateAssets = assetsInput && 'logoImg' in assetsInput
    ? assetsInput
    : { logoImg: assetsInput as HTMLImageElement | null };

  const logoImg = assets.logoImg;
  const sealImg = assets.sealImg;

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  (ctx as any).imageSmoothingQuality = 'high';
  (ctx as any).textRendering = 'geometricPrecision';
  ctx.scale(SCALE, SCALE);

  // ════════════════════════════════════════════════════════════════
  // 1. BACKGROUND — Classical Approved Royal Blue Frame
  // ════════════════════════════════════════════════════════════════
  const primaryColor = '#1b4cd3';
  const secondaryColor = '#2b66ff';

  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#f0f5ff');
  bgGrad.addColorStop(0.5, '#e8f0fe');
  bgGrad.addColorStop(1, '#dce8ff');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ════════════════════════════════════════════════════════════════
  // 2. SUBTLE WATERMARK (OFFICIAL EYE LOGO IMAGE)
  // ════════════════════════════════════════════════════════════════
  if (logoImg) {
    ctx.save();
    ctx.globalAlpha = 0.08;
    const logoW = 440;
    const logoH = 440;
    ctx.drawImage(logoImg, (W - logoW) / 2, (H - logoH) / 2 + 10, logoW, logoH);
    ctx.restore();
  }

  // ════════════════════════════════════════════════════════════════
  // 3. BORDERS & CORNER BRACKETS
  // ════════════════════════════════════════════════════════════════
  const borderGrad = ctx.createLinearGradient(28, 28, W - 28, H - 28);
  borderGrad.addColorStop(0, primaryColor);
  borderGrad.addColorStop(0.5, secondaryColor);
  borderGrad.addColorStop(1, primaryColor);

  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 5;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  // Inner thin navy border
  ctx.strokeStyle = 'rgba(43, 102, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(42, 42, W - 84, H - 84);

  // L-shaped Corner Brackets
  const drawBracket = (x: number, y: number, dx: number, dy: number) => {
    ctx.save();
    ctx.strokeStyle = '#2b66ff';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(x, y + 36 * dy);
    ctx.lineTo(x, y);
    ctx.lineTo(x + 36 * dx, y);
    ctx.stroke();
    ctx.restore();
  };
  drawBracket(56, 56, 1, 1);
  drawBracket(W - 56, 56, -1, 1);
  drawBracket(56, H - 56, 1, -1);
  drawBracket(W - 56, H - 56, -1, -1);

  // Top-Left Hanging Royal Blue Ribbon & EYE Rosette Seal Medal (ENLARGED FOR PRINT & DOWNLOAD OUTPUT ONLY)
  const ribX = 75;
  const ribW = 80;
  const ribH = 175;

  ctx.save();
  const ribGrad = ctx.createLinearGradient(ribX, 0, ribX, ribH);
  ribGrad.addColorStop(0, '#0c1e4d');
  ribGrad.addColorStop(0.5, '#1D4ED8');
  ribGrad.addColorStop(1, '#1e3a8a');

  ctx.fillStyle = ribGrad;
  ctx.beginPath();
  ctx.moveTo(ribX, 0);
  ctx.lineTo(ribX + ribW, 0);
  ctx.lineTo(ribX + ribW, ribH);
  ctx.lineTo(ribX + ribW / 2, ribH - 22);
  ctx.lineTo(ribX, ribH);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(219, 234, 254, 0.7)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Rosette Medal Circle with Large Bright White Fill (ENLARGED FOR PRINT OUTPUT ONLY)
  const medalX = ribX + ribW / 2;
  const medalY = 92;
  const medalR = 45;

  ctx.beginPath();
  ctx.arc(medalX, medalY, medalR + 5, 0, Math.PI * 2);
  ctx.fillStyle = '#2563eb';
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(medalX, medalY, medalR, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (logoImg) {
    // Fill up the entire white circle container (84px logo inside 90px circle)
    ctx.drawImage(logoImg, medalX - 42, medalY - 42, 84, 84);
  }
  ctx.restore();

  // ════════════════════════════════════════════════════════════════
  // 4. TOP HEADER (All aligned to the right side W - 90 so ribbon area is 100% text-free)
  // ════════════════════════════════════════════════════════════════
  ctx.textAlign = 'right';
  ctx.fillStyle = '#1b4cd3';
  ctx.font = isEn ? 'bold 11px Arial' : 'bold 12px "Cairo", Arial';
  ctx.fillText(isEn ? '• Official Certified Document •' : '• وثيقة رسمية معتمدة •', W - 90, 78);

  ctx.fillStyle = '#334155';
  ctx.font = isEn ? '600 10px Arial' : '600 11px "Cairo", Arial';
  ctx.fillText('Egyptian Youth Entity — EYE', W - 90, 96);

  ctx.fillStyle = '#64748b';
  ctx.font = isEn ? '500 10px Arial' : '500 10px "Cairo", Arial';
  ctx.fillText(`${isEn ? 'Date' : 'تاريخ الإصدار'}: ${data.date}   •   ID: EYE-CERT-VR5C2PNM`, W - 90, 114);

  // Divider Line with Blue Center Diamond
  ctx.strokeStyle = 'rgba(43, 102, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, 182);
  ctx.lineTo(W - 80, 182);
  ctx.stroke();

  ctx.fillStyle = '#2b66ff';
  ctx.beginPath();
  ctx.moveTo(W / 2, 176);
  ctx.lineTo(W / 2 + 7, 182);
  ctx.lineTo(W / 2, 188);
  ctx.lineTo(W / 2 - 7, 182);
  ctx.fill();

  // ════════════════════════════════════════════════════════════════
  // 5. CERTIFICATE TITLE
  // ════════════════════════════════════════════════════════════════
  let titleText = data.certTitle;
  if (!titleText || (isEn && titleText.includes('شهادة'))) {
    if (data.certType === 'excellence') titleText = isEn ? 'Certificate of Excellence' : 'شهادة تميز وإتقان';
    else if (data.certType === 'training') titleText = isEn ? 'Certificate of Training Completion' : 'شهادة إتمام تدريب';
    else if (data.certType === 'leadership') titleText = isEn ? 'Leadership Excellence Certificate' : 'شهادة القيادة المتميزة';
    else titleText = isEn ? 'Certificate of Appreciation' : 'شهادة تقدير وعرفان';
  }

  ctx.fillStyle = '#1b4cd3';
  ctx.font = isEn ? 'bold 38px Georgia, Arial' : 'bold 40px "Cairo", Georgia, Arial';
  ctx.textAlign = 'center';
  ctx.fillText(isEn ? titleText : formatArabicConjunctions(titleText), W / 2, 230);

  let enSubTitle = 'CERTIFICATE OF APPRECIATION';
  if (data.certType === 'excellence' || titleText.toLowerCase().includes('excellence') || titleText.includes('تميز')) enSubTitle = 'CERTIFICATE OF EXCELLENCE';
  else if (data.certType === 'training' || titleText.toLowerCase().includes('training') || titleText.includes('تدريب')) enSubTitle = 'CERTIFICATE OF TRAINING COMPLETION';
  else if (data.certType === 'leadership' || titleText.toLowerCase().includes('leadership') || titleText.includes('قيادة')) enSubTitle = 'LEADERSHIP EXCELLENCE CERTIFICATE';

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 11px Arial';
  ctx.fillText(enSubTitle, W / 2, 254);

  // ════════════════════════════════════════════════════════════════
  // 6. ISSUING ENTITY (Egyptian Youth Entity EYE)
  // ════════════════════════════════════════════════════════════════
  ctx.fillStyle = '#2b66ff';
  ctx.font = isEn ? 'bold 12px Arial' : 'bold 12px "Cairo", Arial';
  ctx.fillText(isEn ? '— ISSUED BY —' : '— يصدرها —', W / 2, 266);

  // Issuing line: [Logo] + [Egyptian Youth Entity / كيان المصريون الشباب] + [EYE]
  const entityY = 308;
  const entityTextStr = isEn ? 'Egyptian Youth Entity' : 'كيان المصريون الشباب';
  const eyeText = 'EYE';

  ctx.font = isEn ? 'bold 30px Georgia, Arial' : 'bold 32px "Cairo", Arial';
  const mainEntityW = ctx.measureText(entityTextStr).width;
  ctx.font = 'bold 32px Arial';
  const eyeW = ctx.measureText(eyeText).width;

  const logoW = logoImg ? 48 : 0;
  const totalW = mainEntityW + 12 + eyeW + (logoW ? logoW + 16 : 0);
  const startX = (W - totalW) / 2;

  if (isEn) {
    // English LTR: Logo on the left or center
    if (logoImg) {
      ctx.drawImage(logoImg, startX, entityY - 38, logoW, logoW);
    }
    const textStartX = logoImg ? startX + logoW + 16 : startX;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 30px Georgia, Arial';
    ctx.fillText(entityTextStr, textStartX, entityY);

    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(eyeText, textStartX + mainEntityW + 12, entityY);
  } else {
    // Arabic RTL: Logo on the right
    if (logoImg) {
      ctx.drawImage(logoImg, startX + totalW - logoW, entityY - 38, logoW, logoW);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 32px "Cairo", Arial';
    const arTextX = logoImg ? (startX + totalW - logoW - 16) : (startX + totalW);
    ctx.fillText(entityTextStr, arTextX, entityY);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(eyeText, startX, entityY);
  }

  // Subtitle
  ctx.textAlign = 'center';
  ctx.fillStyle = '#475569';
  ctx.font = 'italic 13px Georgia, Arial';
  ctx.fillText('Egyptian Youth Entity — EYE', W / 2, entityY + 28);

  // Underline ornament with center diamond
  ctx.strokeStyle = 'rgba(43, 102, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 140, entityY + 44);
  ctx.lineTo(W / 2 + 140, entityY + 44);
  ctx.stroke();

  ctx.fillStyle = '#2b66ff';
  ctx.beginPath();
  ctx.moveTo(W / 2, entityY + 40);
  ctx.lineTo(W / 2 + 4, entityY + 44);
  ctx.lineTo(W / 2, entityY + 48);
  ctx.lineTo(W / 2 - 4, entityY + 44);
  ctx.fill();

  // ════════════════════════════════════════════════════════════════
  // 7. RECIPIENT NAME & ROLE (WITH GOLD FLOURISH WINGS)
  // ════════════════════════════════════════════════════════════════
  ctx.fillStyle = '#1b4cd3';
  ctx.font = isEn ? 'bold 14px Arial' : 'bold 15px "Cairo", Arial';
  ctx.fillText(
    isEn ? 'The Egyptian Youth Entity EYE is honored to present this certificate to' : 'يتشرف كيان المصريون الشباب EYE بمنح هذه الشهادة إلى',
    W / 2,
    412
  );

  // Recipient Name
  ctx.fillStyle = '#0c1e4d';
  ctx.font = isEn ? 'bold 36px Georgia, Arial' : 'bold 38px "Cairo", Georgia, Arial';
  ctx.fillText(data.memberName, W / 2, 460);

  // Gold Flourish Wings (Right & Left of Recipient Name)
  const nameW = ctx.measureText(data.memberName).width;
  const wingGap = 25;
  const wingLen = 70;
  const lineY = 448;

  // Right Wing
  const rightStartX = (W / 2) + (nameW / 2) + wingGap;
  const rightEndX = rightStartX + wingLen;

  const gradRight = ctx.createLinearGradient(rightStartX, lineY, rightEndX, lineY);
  gradRight.addColorStop(0, '#2b66ff');
  gradRight.addColorStop(1, 'rgba(43, 102, 255, 0)');
  ctx.strokeStyle = gradRight;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rightStartX, lineY);
  ctx.lineTo(rightEndX, lineY);
  ctx.stroke();

  // Right Blue Diamond
  ctx.fillStyle = '#2b66ff';
  ctx.beginPath();
  ctx.moveTo(rightStartX - 6, lineY);
  ctx.lineTo(rightStartX - 2, lineY - 4);
  ctx.lineTo(rightStartX + 2, lineY);
  ctx.lineTo(rightStartX - 2, lineY + 4);
  ctx.fill();

  // Left Wing
  const leftStartX = (W / 2) - (nameW / 2) - wingGap;
  const leftEndX = leftStartX - wingLen;

  const gradLeft = ctx.createLinearGradient(leftStartX, lineY, leftEndX, lineY);
  gradLeft.addColorStop(0, '#2b66ff');
  gradLeft.addColorStop(1, 'rgba(43, 102, 255, 0)');
  ctx.strokeStyle = gradLeft;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(leftStartX, lineY);
  ctx.lineTo(leftEndX, lineY);
  ctx.stroke();

  // Left Blue Diamond
  ctx.fillStyle = '#2b66ff';
  ctx.beginPath();
  ctx.moveTo(leftStartX + 6, lineY);
  ctx.lineTo(leftStartX + 2, lineY - 4);
  ctx.lineTo(leftStartX - 2, lineY);
  ctx.lineTo(leftStartX + 2, lineY + 4);
  ctx.fill();

  // Position & Committee Text
  const roleDisplay = isEn ? translateRoleEn(data.recipientRole) : (data.recipientRole || 'عضو الكيان');
  const commDisplay = isEn ? translateCommitteeEn(data.committee) : (data.committee || 'لجنة الموارد البشرية');
  const roleText = `${roleDisplay}   ✦   ${commDisplay}`;
  ctx.fillStyle = '#1b4cd3';
  ctx.font = isEn ? 'bold 14px Georgia, Arial' : 'bold 15px "Cairo", Arial';
  ctx.fillText(roleText, W / 2, 494);

  // ════════════════════════════════════════════════════════════════
  // 8. CERTIFICATE BODY
  // ════════════════════════════════════════════════════════════════
  let defaultBody = `يشهد كيان المصريون الشباب EYE أن العضو ${data.memberName} قد بذل جهوداً متميزة وعطاءً صادقاً في خدمة فريق العمل وتحقيق أهداف الكيان، وتكريماً لجهوده يُمنح هذه الشهادة.`;
  if (!isEn) {
    if (data.certType === 'excellence') {
      defaultBody = `يشهد كيان المصريون الشباب EYE بأن العضو ${data.memberName} قد أثبت تميزاً استثنائياً وأداءً رفيعاً يُعبّر عن كفاءة حقيقية وروح تطوعية عالية تستحق التقدير والإشادة.`;
    } else if (data.certType === 'training') {
      defaultBody = `يشهد كيان المصريون الشباب EYE بأن العضو ${data.memberName} قد أتمّ بنجاح متطلبات التدريب المحددة وأجاز جميع معاييرها المطلوبة بكفاءة واقتدار.`;
    } else if (data.certType === 'leadership') {
      defaultBody = `يشهد كيان المصريون الشباب EYE ويُكرّم العضو ${data.memberName} على قيادته المتميزة وحسن إدارته وإلهامه لأعضاء فريقه، مما أسهم في رفع مستوى الأداء وتحقيق نتائج مشرّفة.`;
    }
  } else {
    if (data.certType === 'excellence') {
      defaultBody = `The Egyptian Youth Entity (EYE) certifies that ${data.memberName} has demonstrated exceptional performance and high level of excellence, reflecting true competence and high volunteer spirit deserving of appreciation.`;
    } else if (data.certType === 'training') {
      defaultBody = `This is to certify that ${data.memberName} has successfully completed the specified training requirements within the EYE entity and passed all required standards with efficiency.`;
    } else if (data.certType === 'leadership') {
      defaultBody = `The Egyptian Youth Entity (EYE) honors ${data.memberName} for distinguished leadership, management, and inspiring team members, contributing to elevated performance and honorable results.`;
    } else {
      defaultBody = `The Egyptian Youth Entity (EYE) presents this certificate in recognition and appreciation of member ${data.memberName} for outstanding efforts and sincere dedication in serving the team and achieving the entity's goals.`;
    }
  }

  const rawBodyText = (data.body && !data.body.includes('تُقدّم منظومة EYE') && !data.body.includes('يُقدّم كيان EYE') && !data.body.includes('يشهد كيان EYE') && !data.body.includes('تشهد منظومة EYE') && !data.body.includes('يُشهد بأن'))
    ? data.body
    : defaultBody;

  const bodyText = isEn ? rawBodyText : formatArabicConjunctions(rawBodyText);

  ctx.fillStyle = '#334155';
  ctx.font = isEn ? '600 13px Georgia, Arial' : '600 13px "Cairo", Arial';

  // Wrap text cleanly across lines
  const words = bodyText.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > 780) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);

  let bodyY = 524;
  lines.forEach(line => {
    ctx.fillText(line, W / 2, bodyY);
    bodyY += 24;
  });

  // ════════════════════════════════════════════════════════════════
  // 9. FOOTER DIVIDER & SIGNATURES GRID
  // ════════════════════════════════════════════════════════════════
  ctx.strokeStyle = 'rgba(43, 102, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, H - 145);
  ctx.lineTo(W - 80, H - 145);
  ctx.stroke();

  // ════════════════════════════════════════════════════════════════
  // 9. 3 OFFICIAL SIGNATORIES GRID (President, Coordinator, HR Committee Head)
  // ════════════════════════════════════════════════════════════════
  // HR Committee Head is always the fixed third signatory regardless of recipient's committee
  const hrSigs = getCommitteeSignatories('HR', isEn ? 'en' : 'ar');

  if (isEn) {
    // English 3 Signatories in LTR spacing across 3 columns
    const cols = [
      {
        title: 'Entity President',
        sig: 'Mohamed Metwally',
        name: 'Mr. Mohamed Metwally',
        x: 220,
      },
      {
        title: 'Governorate Coordinator',
        sig: 'Mahmoud Rabie',
        name: 'Mr. Mahmoud Rabie',
        x: 561,
      },
      {
        title: 'HR Committee Head',
        sig: 'Ahmed Ibrahim',
        name: 'Mr. Ahmed Ibrahim',
        x: 902,
      },
    ];

    cols.forEach(c => {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#1b4cd3';
      ctx.font = 'bold 12px Arial, sans-serif';
      ctx.fillText(c.title, c.x, H - 132);

      // Render calligraphic font signature
      const sigParts = c.sig.split(' ');
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px "Great Vibes", "Dancing Script", "Segoe Script", "Brush Script MT", "Aldhabi", cursive';
      if (sigParts.length >= 2) {
        ctx.fillText(sigParts[0], c.x, H - 112);
        ctx.fillText(sigParts.slice(1).join(' '), c.x, H - 94);
      } else {
        ctx.fillText(c.sig, c.x, H - 102);
      }

      ctx.strokeStyle = '#2b66ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(c.x - 60, H - 88);
      ctx.lineTo(c.x + 60, H - 88);
      ctx.stroke();

      const nameParts = c.name.split(' ');
      ctx.fillStyle = '#0c1e4d';
      ctx.font = 'bold 11px Arial, sans-serif';
      if (nameParts.length >= 3) {
        ctx.fillText(`${nameParts[0]} ${nameParts[1]}`, c.x, H - 72);
        ctx.fillText(nameParts.slice(2).join(' '), c.x, H - 58);
      } else if (nameParts.length === 2) {
        ctx.fillText(nameParts[0], c.x, H - 72);
        ctx.fillText(nameParts[1], c.x, H - 58);
      } else {
        ctx.fillText(c.name, c.x, H - 66);
      }
    });
  } else {
    // Arabic 3 Signatories — Col 3 always HR Committee Head
    const arabicCols = [
      {
        title: 'رئيس الكيان',
        sigName: 'محمد متولي',
        formalName: 'أ. محمد متولي',
        x: 902,
      },
      {
        title: 'منسق الغربية',
        sigName: 'محمود ربيع',
        formalName: 'أ. محمود ربيع',
        x: 561,
      },
      {
        title: 'مسؤول لجنة الموارد البشرية',
        sigName: 'أحمد إبراهيم',
        formalName: 'أ. أحمد إبراهيم',
        x: 220,
      },
    ];

    arabicCols.forEach(c => {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#1b4cd3';
      ctx.font = 'bold 13px "Cairo", Arial';
      ctx.fillText(c.title, c.x, H - 132);

      // Render standard calligraphic font signature (Aldhabi / Amiri)
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px "Aldhabi", "Aref Ruqaa", "Amiri", "Traditional Arabic", serif';
      ctx.fillText(c.sigName, c.x, H - 100);

      ctx.strokeStyle = '#2b66ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(c.x - 65, H - 92);
      ctx.lineTo(c.x + 65, H - 92);
      ctx.stroke();

      ctx.fillStyle = '#0c1e4d';
      ctx.font = 'bold 12px "Cairo", Arial';
      ctx.fillText(c.formalName, c.x, H - 72);
    });
  }

  // ════════════════════════════════════════════════════════════════
  // 10. BLUE INK STAMP (Bottom-Right corner over signature area)
  // ════════════════════════════════════════════════════════════════
  if (logoImg) {
    ctx.save();
    const stampX = W - 140;
    const stampY = H - 88;
    ctx.translate(stampX, stampY);
    ctx.rotate(-15 * Math.PI / 180);

    // Double blue stamp circle
    ctx.strokeStyle = 'rgba(43, 102, 255, 0.85)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(43, 102, 255, 0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.stroke();

    // Official EYE logo (original colors) inside stamp
    const stampSize = 56;
    const srcCropH = Math.floor(logoImg.height * 0.75);
    ctx.globalAlpha = 0.95;
    ctx.drawImage(logoImg, 0, 0, logoImg.width, srcCropH, -stampSize / 2, -stampSize / 2, stampSize, stampSize);
    ctx.restore();
  }

  return canvas;
};




const loadImage = (src: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });
};

const loadLogo = (): Promise<HTMLImageElement | null> => {
  return loadImage('/eye-logo-transparent.png');
};

const loadAllAssets = async (): Promise<CertificateAssets> => {
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready.catch(() => { });
  }
  const [logoImg, sealImg, eagleImg, ahmedSig, mahmoudSig] = await Promise.all([
    loadImage('/eye-logo-transparent.png'),
    loadImage('/certificate-seal.png'),
    loadImage('/eagle-emblem.svg'),
    loadImage('/signatures/signature-ahmed.png'),
    loadImage('/signatures/signature-mahmoud.png'),
  ]);
  return { logoImg, sealImg, eagleImg, ahmedSig, mahmoudSig };
};

export const downloadCertificate = (data: CertificateData) => {
  loadAllAssets().then(assets => {
    const canvas = generateCertificate(data, assets);
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png', 1.0);
    const safeName = data.memberName.trim();
    link.download = `شهادة تقدير - ${safeName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
};

export const printCertificate = (data: CertificateData) => {
  loadAllAssets().then(assets => {
    const canvas = generateCertificate(data, assets);
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>EYE Official Certificate — ${data.memberName}</title>
          <style>
            @page {
              size: ${data.orientation === 'portrait' ? 'A4 portrait' : 'A4 landscape'};
              margin: 0mm;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 100vw !important;
              height: 100vh !important;
              background: #ffffff !important;
              display: flex !important;
              justify-content: center !important;
              align-items: center !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              text-rendering: geometricPrecision !important;
              -webkit-font-smoothing: antialiased !important;
            }
            img {
              width: 100% !important;
              height: 100% !important;
              object-fit: contain !important;
              display: block !important;
              image-rendering: -webkit-optimize-contrast !important;
              image-rendering: crisp-edges !important;
            }
            @media print {
              html, body {
                width: 100% !important;
                height: 100% !important;
              }
              img {
                width: 100% !important;
                height: 100% !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                image-rendering: -webkit-optimize-contrast !important;
                image-rendering: crisp-edges !important;
              }
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" alt="EYE Official Certificate" />
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  });
};