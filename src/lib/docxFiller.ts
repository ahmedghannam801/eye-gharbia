import JSZip from 'jszip';

export interface DocxFillData {
  governorate?: string;
  noticeNumber?: string;
  memberName?: string;
  committeeName?: string;
  meetingDay?: string;
  meetingDate?: string;
  hrManager?: string;
  deputy?: string;
  coordinator?: string;
  reportTitle?: string;
  reportBody?: string;
}

/**
 * Fills the exact binary .docx template downloaded from Google Drive with dynamic user data
 * keeping 100% of the original Word document styles, headers, footers, watermarks, fonts and formatting intact!
 */
export async function fillAndDownloadDocxTemplate(
  type: 'inzar' | 'lft_nazar' | 'bg_report' | string,
  data: DocxFillData
): Promise<void> {
  let templatePath = '/templates/report_template.docx';
  let defaultFileName = 'تقرير_رسمي.docx';

  if (data.reportTitle) {
    const cleanTitle = data.reportTitle.replace(/[/\\?%*:|"<>]/g, ' ').replace(/\s+/g, ' ').trim();
    defaultFileName = `${cleanTitle}.docx`;
  } else if (type === 'inzar' || type === 'tmpl-inzar') {
    templatePath = '/templates/inzar.docx';
    defaultFileName = `إنذار - ${(data.memberName || 'رسمي').trim()}.docx`;
  } else if (type === 'lft_nazar' || type === 'tmpl-lft-nazar') {
    templatePath = '/templates/lft_nazar.docx';
    defaultFileName = `لفت نظر - ${(data.memberName || 'رسمي').trim()}.docx`;
  } else if (data.memberName) {
    defaultFileName = `وثيقة - ${data.memberName.trim()}.docx`;
  }

  try {
    // 1. Fetch raw binary .docx template
    const response = await fetch(templatePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch template from ${templatePath}`);
    }
    const arrayBuffer = await response.arrayBuffer();

    // 2. Load zip archive
    const zip = await JSZip.loadAsync(arrayBuffer);
    const documentXmlFile = zip.file('word/document.xml');

    if (!documentXmlFile) {
      throw new Error('word/document.xml not found in docx template');
    }

    // Helper: collapse split XML runs inside parentheses so regex can match text like يوم ( ) across tags
    const collapseParens = (xml: string, keyword: string, value: string): string => {
      const pattern = new RegExp(`(${keyword}(?:<[^>]+>|\\s)*)\\((?:<[^>]+>|\\s)*((?:<[^>]+>|\\s)*)\\)`, 'g');
      return xml.replace(pattern, (m, pre) => `${pre}( ${value} )`);
    };

    let documentXml = await documentXmlFile.async('string');

    // 3. Safe replacements - ORDER MATTERS: specific patterns first before generic ones

    if (data.memberName) {
      documentXml = documentXml.replace(/(\.\.\.\.\.\.|\.\.\.\.\.)/g, escapeXml(data.memberName));
    }
    if (data.committeeName) {
      documentXml = documentXml.replace(/(\.\.\.\.|\.\.\.)/g, escapeXml(data.committeeName));
    }
    if (data.governorate) {
      documentXml = documentXml.replace(/بمحافظة\s*:\s*/g, `بمحافظة : ${escapeXml(data.governorate)} `);
    }

    // Run day & date BEFORE noticeNumber so their parentheses don't get overwritten
    if (data.meetingDay) {
      const before = documentXml;
      documentXml = documentXml.replace(/يوم\s*\(\s*\)/g, `يوم ( ${escapeXml(data.meetingDay)} )`);
      if (documentXml === before) {
        documentXml = collapseParens(documentXml, 'يوم', escapeXml(data.meetingDay));
      }
    }
    if (data.meetingDate) {
      const before = documentXml;
      documentXml = documentXml.replace(/الموافق\s*\(\s*\)/g, `الموافق ( ${escapeXml(data.meetingDate)} )`);
      if (documentXml === before) {
        documentXml = collapseParens(documentXml, 'الموافق', escapeXml(data.meetingDate));
      }
    }

    // noticeNumber: only match رقم ( ) specifically, NOT all empty parentheses
    if (data.noticeNumber) {
      const before = documentXml;
      documentXml = documentXml.replace(/رقم\s*\(\s*\)/g, `رقم ( ${escapeXml(data.noticeNumber)} )`);
      // fallback: replace remaining empty parens (if any) with notice number
      if (documentXml === before) {
        documentXml = documentXml.replace(/\(\s*\)/g, `( ${escapeXml(data.noticeNumber)} )`);
      }
    }

    // Replace signature initials "ا." only when it's the sole text inside a <w:t> run
    // (prevents accidentally replacing ا. appearing in normal Arabic body text)
    if (data.hrManager || data.coordinator || data.deputy) {
      let sigCount = 0;
      documentXml = documentXml.replace(/<w:t[^>]*>\s*ا\.\s*<\/w:t>/g, (match) => {
        sigCount++;
        const prefix = match.replace(/ا\.\s*<\/w:t>/, '');
        if (sigCount === 1 && data.hrManager) {
          return `${prefix}أ. ${escapeXml(data.hrManager)}</w:t>`;
        }
        if (sigCount === 2 && (data.deputy || data.coordinator)) {
          return `${prefix}أ. ${escapeXml(data.deputy || data.coordinator)}</w:t>`;
        }
        if (sigCount === 3 && data.coordinator) {
          return `${prefix}أ. ${escapeXml(data.coordinator)}</w:t>`;
        }
        return match;
      });
    }

    // Comprehensive report body replacement for report_template.docx
    if (type === 'bg_report' || type === 'report') {
      if (data.reportTitle) {
        if (documentXml.includes('{{reportTitle}}')) {
          documentXml = documentXml.replace(/\{\{reportTitle\}\}/g, escapeXml(data.reportTitle));
        } else {
          // Replace title placeholder run or leading placeholder
          documentXml = documentXml.replace(/(التقرير الشامل|عنوان التقرير|\.\.\.\.\.\.|\.\.\.\.\.)/, escapeXml(data.reportTitle));
        }
      }

      if (data.reportBody) {
        const richXml = buildRichDocxOpenXml(data.reportBody, data);

        if (documentXml.includes('{{reportBody}}')) {
          documentXml = documentXml.replace(/<w:p[^>]*>(?:(?!<\/w:p>).)*\{\{reportBody\}\}(?:(?!<\/w:p>).)*<\/w:p>/g, richXml);
          documentXml = documentXml.replace(/\{\{reportBody\}\}/g, richXml);
        } else if (documentXml.includes('{{content}}')) {
          documentXml = documentXml.replace(/<w:p[^>]*>(?:(?!<\/w:p>).)*\{\{content\}\}(?:(?!<\/w:p>).)*<\/w:p>/g, richXml);
          documentXml = documentXml.replace(/\{\{content\}\}/g, richXml);
        } else {
          // Fallback: inject inside document body
          documentXml = documentXml.replace(/(<w:body[^>]*>)/, `$1${richXml}`);
        }
      }
    }

    // 4. Update word/document.xml in zip archive
    zip.file('word/document.xml', documentXml);

    // 5. Generate true binary OpenXML .docx blob
    const updatedBlob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE'
    });

    // 6. Trigger download of filled .docx file
    const url = URL.createObjectURL(updatedBlob);
    const link = document.createElement('a');
    link.href = url;
    const finalName = data.reportTitle 
      ? `${data.reportTitle.replace(/[/\\?%*:|"<>]/g, ' ').replace(/\s+/g, ' ').trim()}.docx`
      : defaultFileName;
    link.download = finalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Error filling docx template:', error);
    // Fallback to direct raw download if error
    const link = document.createElement('a');
    link.href = templatePath;
    link.download = defaultFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildDocxTableXml(headers: string[], rows: string[][], headerBg = '1B4CD3'): string {
  const headerTcs = headers.map(h => `
    <w:tc>
      <w:tcPr>
        <w:shd w:val="clear" w:color="auto" w:fill="${headerBg}"/>
        <w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>
      </w:tcPr>
      <w:p>
        <w:pPr><w:jc w:val="center"/></w:pPr>
        <w:r>
          <w:rPr><w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>
          <w:t>${escapeXml(h)}</w:t>
        </w:r>
      </w:p>
    </w:tc>
  `).join('');

  const rowTrs = rows.map((r, rIdx) => {
    const bg = rIdx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';
    const tcs = r.map(c => `
      <w:tc>
        <w:tcPr>
          <w:shd w:val="clear" w:color="auto" w:fill="${bg}"/>
          <w:tcMar><w:top w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>
        </w:tcPr>
        <w:p>
          <w:pPr><w:jc w:val="center"/></w:pPr>
          <w:r>
            <w:rPr><w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/><w:color w:val="0F172A"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>
            <w:t>${escapeXml(c)}</w:t>
          </w:r>
        </w:p>
      </w:tc>
    `).join('');

    return `<w:tr>${tcs}</w:tr>`;
  }).join('');

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:jc w:val="center"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="8" w:space="0" w:color="${headerBg}"/>
          <w:bottom w:val="single" w:sz="8" w:space="0" w:color="${headerBg}"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>${headerTcs}</w:tr>
      ${rowTrs}
    </w:tbl>
    <w:p><w:pPr><w:spacing w:after="140"/></w:pPr></w:p>
  `;
}

function buildDocxKpiCardsXml(data: { members: number; tasks: number; completionRate: number; avgGrade: number; attendanceRate: number; videoRate: number }): string {
  const cards = [
    { title: 'إجمالي أعضاء الكيان', val: `${data.members} عضو`, color: '1B4CD3', bg: 'EFF6FF' },
    { title: 'المهام التكليفية النشطة', val: `${data.tasks} مهمة`, color: '7C3AED', bg: 'F5F3FF' },
    { title: 'نسبة الالتزام العامة', val: `${data.completionRate}%`, color: '059669', bg: 'ECFDF5' },
    { title: 'متوسط الأداء العام', val: `${data.avgGrade} / 100`, color: 'D97706', bg: 'FFFBEB' },
    { title: 'نسبة حضور الاجتماعات', val: `${data.attendanceRate}%`, color: '2563EB', bg: 'EFF6FF' },
    { title: 'نسبة المواد التدريبية', val: `${data.videoRate}%`, color: '0D9488', bg: 'F0FDFA' },
  ];

  const row1 = cards.slice(0, 3);
  const row2 = cards.slice(3, 6);

  const renderRow = (rowCards: typeof cards) => `<w:tr>` + rowCards.map(c => `
    <w:tc>
      <w:tcPr>
        <w:shd w:val="clear" w:color="auto" w:fill="${c.bg}"/>
        <w:tcMar><w:top w:w="140" w:type="dxa"/><w:bottom w:w="140" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>
      </w:tcPr>
      <w:p>
        <w:pPr><w:jc w:val="center"/></w:pPr>
        <w:r>
          <w:rPr><w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/><w:color w:val="475569"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>
          <w:t>${escapeXml(c.title)}</w:t>
        </w:r>
      </w:p>
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:before="60"/></w:pPr>
        <w:r>
          <w:rPr><w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/><w:b/><w:color w:val="${c.color}"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr>
          <w:t>${escapeXml(c.val)}</w:t>
        </w:r>
      </w:p>
    </w:tc>
  `).join('') + `</w:tr>`;

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:jc w:val="center"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="8" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="8" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        </w:tblBorders>
      </w:tblPr>
      ${renderRow(row1)}
      ${renderRow(row2)}
    </w:tbl>
    <w:p><w:pPr><w:spacing w:after="160"/></w:pPr></w:p>
  `;
}

function buildDocxMemberProfileCardXml(info: {
  fullName: string;
  role: string;
  committee: string;
  code: string;
  joinedDate: string;
  points: number;
  status: string;
}): string {
  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:jc w:val="center"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="16" w:space="0" w:color="1B4CD3"/>
          <w:bottom w:val="single" w:sz="16" w:space="0" w:color="1B4CD3"/>
          <w:left w:val="single" w:sz="16" w:space="0" w:color="1B4CD3"/>
          <w:right w:val="single" w:sz="16" w:space="0" w:color="1B4CD3"/>
          <w:insideH w:val="none"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:w w:w="3800" w:type="pct"/>
            <w:shd w:val="clear" w:color="auto" w:fill="EFF6FF"/>
            <w:tcMar><w:top w:w="200" w:type="dxa"/><w:bottom w:w="200" w:type="dxa"/><w:left w:w="200" w:type="dxa"/><w:right w:w="200" w:type="dxa"/></w:tcMar>
          </w:tcPr>
          <w:p>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
                <w:b/>
                <w:color w:val="FFFFFF"/>
                <w:shd w:val="clear" w:color="auto" w:fill="1B4CD3"/>
                <w:sz w:val="18"/>
                <w:szCs w:val="18"/>
              </w:rPr>
              <w:t>  سجل العضوية والتقييمات المعتمدة  </w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:before="120" w:after="60"/></w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
                <w:b/>
                <w:color w:val="0C1E4D"/>
                <w:sz w:val="34"/>
                <w:szCs w:val="34"/>
              </w:rPr>
              <w:t>${escapeXml(info.fullName)}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="100"/></w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
                <w:b/>
                <w:color w:val="1B4CD3"/>
                <w:sz w:val="22"/>
                <w:szCs w:val="22"/>
              </w:rPr>
              <w:t>${escapeXml(info.role)} ✦ ${escapeXml(info.committee)}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
                <w:color w:val="475569"/>
                <w:sz w:val="18"/>
                <w:szCs w:val="18"/>
              </w:rPr>
              <w:t>الكود التنظيمي: ${escapeXml(info.code)}  |  تاريخ الانضمام: ${escapeXml(info.joinedDate)}  |  الحالة: ${escapeXml(info.status)}</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:w w:w="1200" w:type="pct"/>
            <w:shd w:val="clear" w:color="auto" w:fill="EFF6FF"/>
            <w:tcMar><w:top w:w="200" w:type="dxa"/><w:bottom w:w="200" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
                <w:color w:val="64748B"/>
                <w:sz w:val="16"/>
                <w:szCs w:val="16"/>
              </w:rPr>
              <w:t>نقاط التميز</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="40"/></w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
                <w:b/>
                <w:color w:val="1B4CD3"/>
                <w:sz w:val="38"/>
                <w:szCs w:val="38"/>
              </w:rPr>
              <w:t>${info.points || 150}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
                <w:b/>
                <w:color w:val="059669"/>
                <w:sz w:val="16"/>
                <w:szCs w:val="16"/>
              </w:rPr>
              <w:t>نقطة معتمدة</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
    <w:p><w:pPr><w:spacing w:after="240"/></w:pPr></w:p>
  `;
}

function buildRichDocxOpenXml(text: string, data: DocxFillData): string {
  const lines = text.split('\n');
  const xmlParts: string[] = [];
  let inSigSection = false;

  // Render centered bold prominent main document title at top of body
  if (data.reportTitle) {
    const cleanTitle = data.reportTitle.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
    xmlParts.push(`
      <w:p>
        <w:pPr>
          <w:jc w:val="center"/>
          <w:spacing w:before="140" w:after="240"/>
          <w:pBdr>
            <w:bottom w:val="single" w:sz="12" w:space="10" w:color="1B4CD3"/>
          </w:pBdr>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
            <w:b/>
            <w:color w:val="1B4CD3"/>
            <w:sz w:val="36"/>
            <w:szCs w:val="36"/>
          </w:rPr>
          <w:t>${escapeXml(cleanTitle)}</w:t>
        </w:r>
      </w:p>
    `);
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) {
      xmlParts.push('<w:p><w:pPr><w:spacing w:after="100"/></w:pPr></w:p>');
      continue;
    }

    if (rawLine.startsWith('[MEMBER_PROFILE_CARD_JSON]')) {
      try {
        const jsonStr = rawLine.replace('[MEMBER_PROFILE_CARD_JSON]', '').trim();
        const parsed = JSON.parse(jsonStr);
        xmlParts.push(buildDocxMemberProfileCardXml(parsed));
      } catch (err) {
        console.error('Error parsing member profile card json for docx:', err);
      }
      continue;
    }

    if (rawLine.startsWith('نطاق وموضوع التقرير:')) {
      const cleanLine = rawLine.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
      xmlParts.push(`
        <w:p>
          <w:pPr>
            <w:jc w:val="center"/>
            <w:spacing w:before="40" w:after="200"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
              <w:b/>
              <w:color w:val="334155"/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
            <w:t>${escapeXml(cleanLine)}</w:t>
          </w:r>
        </w:p>
      `);
      continue;
    }

    if (rawLine.includes('الاعتماد والتوقيعات الرسمية') || rawLine.includes('التوقيعات الرسمية')) {
      inSigSection = true;
      continue;
    }

    if (inSigSection && (rawLine.includes('مسؤول لجنة') || rawLine.includes('أ. أحمد') || rawLine.includes('أ. ريهام') || rawLine.includes('أ. محمود'))) {
      continue;
    }

    if (rawLine.startsWith('[TABLE_JSON]')) {
      try {
        const jsonStr = rawLine.replace('[TABLE_JSON]', '').trim();
        const parsed = JSON.parse(jsonStr);
        xmlParts.push(buildDocxTableXml(parsed.headers, parsed.rows, parsed.headerBg || '1B4CD3'));
      } catch (err) {
        console.error('Error parsing table json for docx:', err);
      }
      continue;
    }

    if (rawLine.startsWith('[KPI_CARDS_JSON]')) {
      try {
        const jsonStr = rawLine.replace('[KPI_CARDS_JSON]', '').trim();
        const parsed = JSON.parse(jsonStr);
        xmlParts.push(buildDocxKpiCardsXml(parsed));
      } catch (err) {
        console.error('Error parsing KPI cards json for docx:', err);
      }
      continue;
    }

    const isSectionHeader = rawLine.endsWith(':') && !rawLine.startsWith('•') && !rawLine.startsWith('نطاق') && !rawLine.startsWith('الفترة');
    const isItemCard = rawLine.startsWith('[');

    if (isSectionHeader || rawLine.startsWith('📌') || rawLine.startsWith('📊') || rawLine.startsWith('🏛️') || rawLine.startsWith('🗓️') || rawLine.startsWith('🎯')) {
      // Strip any emojis from heading
      const cleanHeader = rawLine.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
      xmlParts.push(`
        <w:p>
          <w:pPr>
            <w:pBdr>
              <w:bottom w:val="single" w:sz="16" w:space="8" w:color="1B4CD3"/>
            </w:pBdr>
            <w:shd w:val="clear" w:color="auto" w:fill="1B4CD3"/>
            <w:spacing w:before="320" w:after="160"/>
            <w:jc w:val="center"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
              <w:b/>
              <w:color w:val="FFFFFF"/>
              <w:sz w:val="26"/>
              <w:szCs w:val="26"/>
            </w:rPr>
            <w:t>${escapeXml(cleanHeader)}</w:t>
          </w:r>
        </w:p>
      `);
    } else if (rawLine.startsWith('══') || rawLine.startsWith('──')) {
      continue;
    } else if (isItemCard) {
      const cleanCard = rawLine.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
      xmlParts.push(`
        <w:p>
          <w:pPr>
            <w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/>
            <w:spacing w:before="180" w:after="80"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
              <w:b/>
              <w:color w:val="0C1E4D"/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
            <w:t>${escapeXml(cleanCard)}</w:t>
          </w:r>
        </w:p>
      `);
    } else if (rawLine.startsWith('•') || rawLine.startsWith('▫️') || rawLine.startsWith('⭐') || rawLine.startsWith('-')) {
      const cleanBullet = rawLine.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
      xmlParts.push(`
        <w:p>
          <w:pPr>
            <w:ind w:right="280"/>
            <w:spacing w:before="40" w:after="40"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
              <w:color w:val="1E293B"/>
              <w:sz w:val="22"/>
              <w:szCs w:val="22"/>
            </w:rPr>
            <w:t>${escapeXml(cleanBullet)}</w:t>
          </w:r>
        </w:p>
      `);
    } else {
      const cleanLine = rawLine.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
      xmlParts.push(`
        <w:p>
          <w:pPr>
            <w:spacing w:before="60" w:after="60" w:line="280" w:lineRule="atLeast"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
              <w:color w:val="334155"/>
              <w:sz w:val="22"/>
              <w:szCs w:val="22"/>
            </w:rPr>
            <w:t>${escapeXml(cleanLine)}</w:t>
          </w:r>
        </w:p>
      `);
    }
  }

  const signatureTableXml = `
    <w:p><w:pPr><w:spacing w:before="360" w:after="120"/></w:pPr></w:p>
    <w:p>
      <w:pPr>
        <w:pBdr>
          <w:bottom w:val="single" w:sz="12" w:space="6" w:color="1B4CD3"/>
        </w:pBdr>
        <w:shd w:val="clear" w:color="auto" w:fill="F0F4FF"/>
        <w:spacing w:before="120" w:after="120"/>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo"/>
          <w:b/>
          <w:color w:val="1B4CD3"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>• الاعتماد والتوقيعات الرسمية •</w:t>
      </w:r>
    </w:p>

    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:jc w:val="center"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="8" w:space="0" w:color="1B4CD3"/>
          <w:bottom w:val="single" w:sz="8" w:space="0" w:color="1B4CD3"/>
          <w:left w:val="none"/>
          <w:right w:val="none"/>
          <w:insideH w:val="none"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Cairo" w:hAnsi="Cairo"/><w:b/><w:color w:val="1B4CD3"/><w:sz w:val="20"/></w:rPr><w:t>مسؤول لجنة الموارد البشرية</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="40"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Aldhabi" w:hAnsi="Aldhabi" w:cs="Aldhabi"/><w:b/><w:color w:val="0F172A"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr><w:t>أ. ${escapeXml(data.hrManager || 'أحمد إبراهيم')}</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Cairo" w:hAnsi="Cairo"/><w:color w:val="64748B"/><w:sz w:val="16"/></w:rPr><w:t>(اعتماد وتوقيع رسمي)</w:t></w:r>
          </w:p>
        </w:tc>
        ${data.deputy ? `
        <w:tc>
          <w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Cairo" w:hAnsi="Cairo"/><w:b/><w:color w:val="1B4CD3"/><w:sz w:val="20"/></w:rPr><w:t>نائب مسؤول لجنة الموارد البشرية</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="40"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Aldhabi" w:hAnsi="Aldhabi" w:cs="Aldhabi"/><w:b/><w:color w:val="0F172A"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr><w:t>أ. ${escapeXml(data.deputy)}</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Cairo" w:hAnsi="Cairo"/><w:color w:val="64748B"/><w:sz w:val="16"/></w:rPr><w:t>(اعتماد وتوقيع رسمي)</w:t></w:r>
          </w:p>
        </w:tc>
        ` : ''}
      </w:tr>
    </w:tbl>
  `;

  return xmlParts.join('') + signatureTableXml;
}
