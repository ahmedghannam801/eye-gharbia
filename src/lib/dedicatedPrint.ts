/**
 * EYE Workflow Hub — Universal Dedicated Document Print Engine
 * Opens a clean, dedicated A4 document window with official EYE letterhead,
 * seals, and signatures, completely isolated from the web page UI.
 */

interface OfficialLetterheadOptions {
  title: string;
  docNumber?: string;
  date?: string;
  bodyHtml: string;
  signatures?: Array<{ title: string; name: string }>;
  watermark?: boolean;
}

export const printDedicatedOfficialDocument = (options: OfficialLetterheadOptions) => {
  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    alert('يرجى السماح بالنوافذ المنبثقة للطباعة الرسمية المباشرة (Allow Popups).');
    return;
  }

  const todayStr = options.date || new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const docNo = options.docNumber || `EYE-DOC-${Date.now().toString().slice(-6)}`;

  const signaturesHtml = (options.signatures || [
    { title: 'مسؤول لجنة الموارد البشرية', name: 'أحمد إبراهيم' },
  ]).map(s => `
    <div class="sig-tile" style="text-align: center; background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px 8px; border-radius: 10px;">
      <div style="font-size: 10px; font-weight: 800; color: #1b4cd3; margin-bottom: 4px;">${s.title}</div>
      <div style="font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 10px; font-family: 'Aldhabi', 'Aref Ruqaa', 'Amiri', 'Traditional Arabic', serif;">أ. ${s.name}</div>
      <div style="font-size: 8px; color: #64748b; margin-top: 2px;">(توقيع واعتماد رسمي)</div>
    </div>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <title>${options.title} — كيان المصريون الشباب EYE</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        
        @page {
          size: A4 portrait;
          margin: 12mm 15mm;
        }

        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body {
          font-family: 'Cairo', sans-serif;
          background: #ffffff;
          color: #0f172a;
          margin: 0;
          padding: 0;
          font-size: 12px;
          line-height: 1.6;
        }

        .document-container {
          width: 100%;
          min-height: 275mm;
          padding: 28px;
          border: 3px double #1b4cd3;
          position: relative;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .header-grid {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #1b4cd3;
          padding-bottom: 14px;
          margin-bottom: 20px;
        }

        .header-right {
          font-size: 11px;
          font-weight: 800;
          color: #1b4cd3;
          line-height: 1.4;
        }

        .header-center {
          text-align: center;
        }

        .header-center h1 {
          margin: 0;
          font-size: 17px;
          font-weight: 900;
          color: #0f172a;
        }

        .header-center p {
          margin: 2px 0 0 0;
          font-size: 10px;
          font-weight: 700;
          color: #475569;
        }

        .header-left {
          text-align: left;
          font-size: 10px;
          font-weight: 700;
          color: #475569;
        }

        .doc-meta-bar {
          display: flex;
          justify-content: space-between;
          background: #f0f4ff;
          border: 1px solid #cbd5e1;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 800;
          color: #1b4cd3;
          margin-bottom: 24px;
        }

        .main-title {
          text-align: center;
          font-size: 22px;
          font-weight: 900;
          color: #1b4cd3;
          margin: 12px 0 22px 0;
          padding: 10px 20px;
          background: #f1f5f9;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          letter-spacing: -0.3px;
        }

        .content-body {
          flex: 1;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
        }

        th, td {
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
          text-align: right;
          font-size: 11px;
        }

        th {
          background: #1b4cd3;
          color: #ffffff;
          font-weight: 800;
        }

        tr:nth-child(even) {
          background: #f8fafc;
        }

        .signatures-container {
          margin-top: auto;
          padding-top: 24px;
        }

        .signatures-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          padding-top: 16px;
          border-top: 2px solid #1b4cd3;
          text-align: center;
        }

        .sig-tile {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          padding: 10px 8px;
          border-radius: 10px;
        }

        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 320px;
          opacity: 0.05;
          pointer-events: none;
        }

        .footer-bar {
          text-align: center;
          font-size: 9px;
          font-weight: 800;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
          margin-top: 12px;
        }
          margin-top: 24px;
        }
      </style>
    </head>
    <body>
      <div class="document-container">
        <div>
          <!-- Header matching exact Google Drive Document Template -->
          <div class="header-grid" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 10px; text-align: right;">
              <img src="/ministry-logo.png" style="height: 50px; object-fit: contain;" alt="وزارة الشباب والرياضة" onerror="this.style.display='none'">
              <div style="font-size: 10px; font-weight: 800; color: #000; line-height: 1.3;">
                <div>جمهورية مصر العربية</div>
                <div>وزارة الشباب والرياضة</div>
                <div style="font-size: 8px; font-weight: 700;">Ministry of Youth and Sports</div>
              </div>
            </div>

            <div style="text-align: center;">
              <h1 style="margin: 0; font-size: 17px; font-weight: 900; color: #0284c7;">المصريون الشباب – وزارة الشباب والرياضة</h1>
              <p style="margin: 2px 0 0 0; font-size: 10px; font-weight: 700; color: #334155;">مستند رسمي معتمد — الإدارة التنفيذية</p>
            </div>

            <div style="display: flex; align-items: center; justify-content: flex-end;">
              <img src="/eye-logo.png" style="height: 50px; object-fit: contain;" alt="EYE Emblem" onerror="this.style.display='none'">
            </div>
          </div>

          <!-- Central Background Watermark -->
          <img src="/eye-logo.png" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 320px; height: 320px; opacity: 0.08; pointer-events: none;" alt="Watermark" onerror="this.style.display='none'">

          <!-- Document Meta Bar -->
          <div class="doc-meta-bar" style="display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 8px; font-size: 10px; font-weight: 800; color: #0284c7; margin-bottom: 20px;">
            <span>نوع الوثيقة: ${options.title}</span>
            <span>رقم التوثيق: ${docNo}</span>
            <span>التاريخ: ${todayStr}</span>
          </div>

          <!-- Main Title -->
          <div class="main-title">${options.title}</div>

          <!-- Content Body -->
          <div class="content-body">
            ${options.bodyHtml}
          </div>
        </div>

        <!-- Bottom Signatures & Footer -->
        <div>
          <div class="signatures-grid">
            ${signaturesHtml}
          </div>

          <div class="footer-bar">
            #معا_نحو_مستقبل_افضل — كيان المصريون الشباب EYE (وزارة الشباب والرياضة) — جميع الحقوق محفوظة
          </div>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
