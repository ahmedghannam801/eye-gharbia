import ExcelJS from 'exceljs';
import { UserProfile, IssuedCertificate, Task } from '../types';

export const exportUsersToExcel = async (users: UserProfile[], filename = 'EYE_Members_Directory.xlsx') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('الأعضاء');

  // Add headers
  worksheet.addRow([
    '#',
    'الاسم بالكامل / Full Name',
    'كود العضوية / Code',
    'البريد الإلكتروني / Email',
    'رقم الهاتف / Phone',
    'الدور الإداري / Role',
    'اللجنة / Committee',
    'القسم / Department',
    'الحالة / Status',
    'المحافظة / Governorate',
    'تاريخ الانضمام / Joined Date'
  ]);

  // Add data rows
  users.forEach((u, i) => {
    worksheet.addRow([
      i + 1,
      u.fullName || '',
      u.membershipCode || '',
      u.email || '',
      u.phoneNumber || '',
      u.role || '',
      u.committee || '',
      u.department || '',
      u.status || '',
      u.governorate || 'الغربية',
      u.joinedDate ? new Date(u.joinedDate).toLocaleDateString('ar-EG') : ''
    ]);
  });

  // Style headers
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = column.header ? Math.max(15, column.header.length + 5) : 15;
  });

  // Generate buffer and return it (caller can decide how to save)
  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer, filename };
};

export const exportCertificatesToExcel = async (certs: IssuedCertificate[], filename = 'EYE_Issued_Certificates.xlsx') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('الشهادات المعتمدة');

  // Add headers
  worksheet.addRow([
    '#',
    'معرف الشهادة / ID',
    'اسم المستلم / Recipient',
    'عنوان الشهادة / Title',
    'نوع الشهادة / Type',
    'اللجنة / Committee',
    'الدور / Role',
    'صادرة بواسطة / Issued By',
    'الحالة / Status',
    'تاريخ الإصدار / Date'
  ]);

  // Add data rows
  certs.forEach((c, i) => {
    worksheet.addRow([
      i + 1,
      `EYE-CERT-${c.id.slice(-8).toUpperCase()}`,
      c.recipientName || '',
      c.title || '',
      c.certType || '',
      c.committee || 'عام',
      c.recipientRole || '',
      c.issuedByName || '',
      c.status === 'approved' ? 'معتمدة' : c.status === 'pending' ? 'بانتظار الموافقة' : 'مرفوضة',
      new Date(c.issuedAt).toLocaleDateString('ar-EG')
    ]);
  });

  // Style headers
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = column.header ? Math.max(15, column.header.length + 5) : 15;
  });

  // Generate buffer and return it
  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer, filename };
};

export const export365EvaluationToExcel = async (
  users: UserProfile[],
  filename = 'تقييم_الأعضاء_والقادة_365_EYE.xlsx'
) => {
  const { db, calculateMemberAVG } = require('../db/localDb');
  const meetings = db.getMeetings();
  const attendance = db.getAllAttendance();
  const tasks = db.getTasks();
  const submissions = db.getSubmissions();
  const excuses = db.getExcuseRequests();
  const evaluations = db.getMemberEvaluations();

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('تقييم 365 يوم');

  // Add headers
  worksheet.addRow([
    '#',
    'اسم العضو / Leader Name',
    'المحافظة / Governorate',
    'المنصب / Position',
    'اللجنة / Committee',
    'ميتينج أونلاين (5ن)',
    'ميتينج أوفلاين (10ن)',
    'تاسكات منجزة (5ن)',
    'أعذار مقبولة',
    'سلوك (BHV)',
    'تفاعل (Interaction)',
    'إجمالي النقاط الفعلية',
    'أعلى نقطة ممكنة',
    'البونص (Bonus)',
    'الـ AVG النهائي (%)',
    'التقدير النهائي'
  ]);

  // Add data rows
  const data = users.map((u, i) => {
    const breakdown = calculateMemberAVG(
      u.id,
      meetings,
      attendance,
      tasks,
      submissions,
      excuses,
      evaluations,
      u.bonusPoints || 0
    );

    let grade = 'يحتاج إلى تطوير';
    if (breakdown.avgScore >= 90) grade = 'ممتاز مرتفع جداً';
    else if (breakdown.avgScore >= 80) grade = 'ممتاز';
    else if (breakdown.avgScore >= 70) grade = 'جيد جداً';
    else if (breakdown.avgScore >= 60) grade = 'جيد';
    else if (breakdown.avgScore >= 50) grade = 'مقبول';

    return {
      '#': i + 1,
      'اسم العضو / Leader Name': u.fullName || '',
      'المحافظة / Governorate': u.governorate || 'الغربية',
      'المنصب / Position': u.role || '',
      'اللجنة / Committee': u.committee || '',
      'ميتينج أونلاين (5ن)': breakdown.onlineMeetingsEarned,
      'ميتينج أوفلاين (10ن)': breakdown.offlineMeetingsEarned,
      'تاسكات منجزة (5ن)': breakdown.tasksEarned,
      'أعذار مقبولة': breakdown.excusedMeetingsCount + breakdown.excusedTasksCount,
      'سلوك (BHV)': breakdown.behaviorScore,
      'تفاعل (Interaction)': breakdown.interactionScore,
      'إجمالي النقاط الفعلية': breakdown.earnedPoints,
      'أعلى نقطة ممكنة': breakdown.maxPoints,
      'البونص (Bonus)': breakdown.bonusPoints,
      'الـ AVG النهائي (%)': `${breakdown.avgScore}%`,
      'التقدير النهائي': grade
    };
  });

  data.forEach(row => {
    worksheet.addRow([
      row['#'],
      row['اسم العضو / Leader Name'],
      row['المحافظة / Governorate'],
      row['المنصب / Position'],
      row['اللجنة / Committee'],
      row['ميتينج أونلاين (5ن)'],
      row['ميتينج أوفلاين (10ن)'],
      row['تاسكات منجزة (5ن)'],
      row['أعذار مقبولة'],
      row['سلوك (BHV)'],
      row['تفاعل (Interaction)'],
      row['إجمالي النقاط الفعلية'],
      row['أعلى نقطة ممكنة'],
      row['البونص (Bonus)'],
      row['الـ AVG النهائي (%)'],
      row['التقدير النهائي']
    ]);
  });

  // Style headers
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = column.header ? Math.max(15, column.header.length + 5) : 15;
  });

  // Generate buffer and return it
  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer, filename };
};