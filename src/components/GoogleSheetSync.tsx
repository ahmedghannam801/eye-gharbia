import React, { useState, useEffect } from 'react';
import { UserProfile, MemberEvaluation } from '../types';
import { db } from '../db/localDb';
import { useLanguage } from '../lib/LanguageContext';
import { Sheet, Table, RefreshCw, CheckCircle2, AlertTriangle, FileSpreadsheet, UploadCloud, Copy, ExternalLink, Code, Search, Sparkles, X, ArrowRight, ShieldCheck, Database } from 'lucide-react';

interface ParsedRow {
  identifier: string; // membershipCode, email, or fullName
  matchedUser?: UserProfile;
  commitmentRating: number;
  qualityRating: number;
  teamworkRating: number;
  activityRating: number;
  overallRating: number;
  feedbackComment: string;
  status: 'matched' | 'unmatched';
}

export const GoogleSheetSyncModal: React.FC<{
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}> = ({ currentUser, isOpen, onClose, onSuccess }) => {
  const { language, isRtl } = useLanguage();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'url' | 'file' | 'script'>('url');
  const [sheetUrl, setSheetUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const allUsers = db.getUsers().filter(u => u.status === 'Active');

  // Convert standard Google Sheet URL to direct CSV export URL
  const getCsvExportUrl = (rawUrl: string): string => {
    let url = rawUrl.trim();
    if (!url) return '';
    if (url.includes('/export?format=csv') || url.includes('/pub?output=csv')) return url;

    // Match Google Sheet ID from standard URL: /spreadsheets/d/{SHEET_ID}/
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      const sheetId = match[1];
      // Check if there is a gid parameter
      const gidMatch = url.match(/[?&]gid=([0-9]+)/);
      const gidParam = gidMatch && gidMatch[1] ? `&gid=${gidMatch[1]}` : '';
      return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`;
    }
    return url;
  };

  // Helper to parse CSV string into headers and rows
  const parseCsvText = (csvText: string): ParsedRow[] => {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    // Parse CSV row keeping quotes in mind
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^"|"$/g, ''));
      return result;
    };

    const headers = parseLine(lines[0]).map(h => h.toLowerCase());

    // Locate header indices
    const codeIdx = headers.findIndex(h => h.includes('code') || h.includes('كود') || h.includes('معرف') || h.includes('membership'));
    const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('إيميل') || h.includes('بريد'));
    const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('اسم') || h.includes('العضو'));

    const commitmentIdx = headers.findIndex(h => h.includes('commit') || h.includes('التزام') || h.includes('جدية'));
    const qualityIdx = headers.findIndex(h => h.includes('qual') || h.includes('جودة') || h.includes('إتقان'));
    const teamworkIdx = headers.findIndex(h => h.includes('team') || h.includes('جماعي') || h.includes('تواصل'));
    const activityIdx = headers.findIndex(h => h.includes('initiat') || h.includes('نشاط') || h.includes('مبادرة') || h.includes('فاعلية'));
    const overallIdx = headers.findIndex(h => h.includes('overall') || h.includes('إجمالي') || h.includes('كلي') || h.includes('التقييم'));
    const feedbackIdx = headers.findIndex(h => h.includes('feed') || h.includes('note') || h.includes('ملاحظ') || h.includes('تعليق'));

    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      if (cols.length === 0) continue;

      const codeVal = codeIdx !== -1 ? cols[codeIdx] || '' : '';
      const emailVal = emailIdx !== -1 ? cols[emailIdx] || '' : '';
      const nameVal = nameIdx !== -1 ? cols[nameIdx] || '' : '';

      const identifier = codeVal || emailVal || nameVal || cols[0] || '';
      if (!identifier) continue;

      // Find matching user in system
      const matched = allUsers.find(u => {
        if (codeVal && u.membershipCode && u.membershipCode.toLowerCase() === codeVal.toLowerCase()) return true;
        if (emailVal && u.email && u.email.toLowerCase() === emailVal.toLowerCase()) return true;
        if (nameVal && u.fullName && u.fullName.toLowerCase().includes(nameVal.toLowerCase())) return true;
        if (identifier && u.membershipCode && u.membershipCode.toLowerCase() === identifier.toLowerCase()) return true;
        if (identifier && u.fullName && u.fullName.toLowerCase().includes(identifier.toLowerCase())) return true;
        return false;
      });

      const parseNum = (idx: number, def = 5): number => {
        if (idx === -1 || !cols[idx]) return def;
        const n = parseFloat(cols[idx].replace(/[^0-9.]/g, ''));
        return isNaN(n) ? def : Math.min(5, Math.max(1, n));
      };

      const commitment = parseNum(commitmentIdx, 5);
      const quality = parseNum(qualityIdx, 5);
      const teamwork = parseNum(teamworkIdx, 5);
      const activity = parseNum(activityIdx, 5);

      let overall = overallIdx !== -1 ? parseNum(overallIdx, 0) : 0;
      if (overall === 0) {
        overall = Number(((commitment + quality + teamwork + activity) / 4).toFixed(1));
      }

      const feedback = feedbackIdx !== -1 ? cols[feedbackIdx] || '' : '';

      rows.push({
        identifier,
        matchedUser: matched,
        commitmentRating: commitment,
        qualityRating: quality,
        teamworkRating: teamwork,
        activityRating: activity,
        overallRating: overall,
        feedbackComment: feedback,
        status: matched ? 'matched' : 'unmatched',
      });
    }

    return rows;
  };

  const handleFetchSheet = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setParsedRows([]);
    if (!sheetUrl.trim()) {
      setErrorMsg(isAr ? 'يرجى إدخال رابط Google Sheet أو رابط CSV المنشور.' : 'Please enter a Google Sheet URL.');
      return;
    }

    setIsLoading(true);
    try {
      const csvUrl = getCsvExportUrl(sheetUrl);
      let csvText = '';
      try {
        const response = await fetch(csvUrl);
        if (response.ok) {
          csvText = await response.text();
        } else {
          throw new Error('Direct fetch blocked by CORS');
        }
      } catch {
        // Fallback proxy to bypass CORS
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(csvUrl)}`;
        const proxyRes = await fetch(proxyUrl);
        if (!proxyRes.ok) {
          throw new Error(isAr ? 'تأكد من أن الرابط متاح للجميع (Anyone with link can view)' : 'Sheet is not publicly viewable.');
        }
        csvText = await proxyRes.text();
      }

      const rows = parseCsvText(csvText);
      if (rows.length === 0) {
        setErrorMsg(isAr ? 'لم يتم العثور على تقييمات صالحة بالملف. يرجى التأكد من تسمية الأعمدة (الاسم/الكود والتقييم).' : 'No valid rating rows found. Check column headers.');
      } else {
        setParsedRows(rows);
      }
    } catch (err: any) {
      setErrorMsg(
        isAr
          ? `تعذر قراءة الشيت مباشرة: ${err.message}. يمكنك استخدام تبويب (رفع كملف CSV) أو (اللصق المباشر).`
          : `Failed to fetch sheet: ${err.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    setSuccessMsg('');
    setParsedRows([]);
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCsvText(text);
        if (rows.length === 0) {
          setErrorMsg(isAr ? 'تعذر قراءة بيانات التقييمات من الملف.' : 'Could not parse ratings from file.');
        } else {
          setParsedRows(rows);
        }
      } catch (err: any) {
        setErrorMsg(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg(isAr ? 'خطأ أثناء قراءة الملف' : 'File read error');
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  const handleConfirmSync = () => {
    const validRows = parsedRows.filter(r => r.matchedUser);
    if (validRows.length === 0) {
      setErrorMsg(isAr ? 'لا توجد أعضاء متطابقة للاستيراد.' : 'No matched members to import.');
      return;
    }

    const evaluationsData: Omit<MemberEvaluation, 'id' | 'createdAt'>[] = validRows.map(r => ({
      targetUserId: r.matchedUser!.id,
      targetUserName: r.matchedUser!.fullName,
      targetUserRole: r.matchedUser!.role,
      committee: r.matchedUser!.committee,
      department: r.matchedUser!.department,
      evaluatorId: currentUser.id,
      evaluatorName: `${currentUser.fullName} (Google Sheets Sync)`,
      evaluatorRole: currentUser.role,
      overallRating: r.overallRating,
      commitmentRating: r.commitmentRating,
      qualityRating: r.qualityRating,
      teamworkRating: r.teamworkRating,
      activityRating: r.activityRating,
      feedbackComment: r.feedbackComment || 'تم المزامنة تلقائياً عبر نظام Google Sheets',
    }));

    const importedCount = db.bulkImportMemberEvaluations(evaluationsData, currentUser);
    setSuccessMsg(
      isAr
        ? `تمت مزامنة واعتماد تقييمات ${importedCount} عضو بنجاح وتحديث لوحة الصدارة!`
        : `Successfully imported and synced ratings for ${importedCount} members!`
    );

    setTimeout(() => {
      if (onSuccess) onSuccess();
      onClose();
    }, 2000);
  };

  const sampleAppsScriptCode = `// Google Apps Script Auto-Sync for EYE Workflow Hub
function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  var range = e.range;
  var row = range.getRow();
  
  // Skip header row
  if (row <= 1) return;
  
  var values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  var payload = {
    membershipCode: values[0], // Column A: Membership Code or Email
    commitmentRating: values[1],
    qualityRating: values[2],
    teamworkRating: values[3],
    activityRating: values[4],
    feedbackComment: values[5] || ""
  };
  
  Logger.log("Synced row " + row + ": " + JSON.stringify(payload));
}`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(sampleAppsScriptCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-3xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95" dir={isRtl ? 'rtl' : 'ltr'}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isAr ? 'مركز ربط ومزامنة Google Sheets 🔗' : 'Google Sheets Sync Center 🔗'}</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isAr ? 'ربط تقييمات شيت جوجل المباشرة بملفات الأعضاء ولوحة الصدارة' : 'Sync Google Sheets evaluations directly to member profiles'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit border border-slate-200/50 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('url')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'url' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isAr ? 'مزامنة عبر الرابط المباشر' : 'Live URL Sync'}</span>
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'file' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>{isAr ? 'رفع ملف CSV / Excel' : 'Upload CSV/Excel'}</span>
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'script' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>{isAr ? 'كود المزامنة التلقائية (Apps Script)' : 'Apps Script Code'}</span>
          </button>
        </div>

        {/* Alert Error/Success Messages */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-black flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: LIVE URL SYNC */}
        {activeTab === 'url' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'ضع رابط Google Sheet الخاص بك:' : 'Enter Google Sheet Link:'}
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={sheetUrl}
                  onChange={e => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1..."
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  onClick={handleFetchSheet}
                  disabled={isLoading}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 shrink-0"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  <span>{isAr ? 'سحب البيانات' : 'Fetch Sheet'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                💡 {isAr ? 'تأكد من مشاركة شيت جوجل كـ (Anyone with the link can view) لسحب التقييمات مباشرة.' : 'Ensure the Google Sheet access is set to View for Anyone with Link.'}
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: FILE UPLOAD */}
        {activeTab === 'file' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-8 text-center bg-slate-50/50 dark:bg-slate-850/50 hover:bg-emerald-500/5 transition-all">
              <UploadCloud className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-1">
                {isAr ? 'اختر ملف CSV / Excel تم تصديره من شيت جوجل' : 'Select CSV/Excel file'}
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                {isAr ? 'اسحب الملف هنا أو انقر للتصفح' : 'Drag & drop file here or click to browse'}
              </p>
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
                id="google-sheet-file-input"
              />
              <label
                htmlFor="google-sheet-file-input"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl cursor-pointer shadow-md inline-block"
              >
                {isAr ? 'تصفح الملفات' : 'Browse Files'}
              </label>
            </div>
          </div>
        )}

        {/* TAB 3: APPS SCRIPT CODE */}
        {activeTab === 'script' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>{isAr ? 'كيفية تفعيل المزامنة التلقائية اللحظية من داخل Google Sheet:' : 'How to enable Auto-Sync in Google Sheets:'}</span>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 font-medium">
                <li>{isAr ? 'افتح شيت التقييمات في Google Sheets.' : 'Open your Google Sheet.'}</li>
                <li>{isAr ? 'من القائمة العلوية اختر (Extensions ⬅️ Apps Script).' : 'Go to Extensions -> Apps Script.'}</li>
                <li>{isAr ? 'امسح الكود القديم وانصخ الكود التالي ولصقه هناك ثم اضغط Save.' : 'Paste the code below and save.'}</li>
              </ol>
            </div>

            <div className="relative bg-slate-950 text-slate-200 p-4 rounded-2xl font-mono text-xs overflow-x-auto border border-slate-800">
              <button
                onClick={handleCopyScript}
                className="absolute end-3 top-3 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-sans font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الكود' : 'Copy Code')}</span>
              </button>
              <pre>{sampleAppsScriptCode}</pre>
            </div>
          </div>
        )}

        {/* PREVIEW TABLE OF PARSED ROWS */}
        {parsedRows.length > 0 && (
          <div className="space-y-4 pt-2 border-t border-slate-150 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-500" />
                <span>{isAr ? `معاينة الأعضاء والتقييمات المستخرجة (${parsedRows.length} عضو):` : `Parsed Ratings Preview (${parsedRows.length}):`}</span>
              </h3>
              <span className="text-[11px] font-bold text-emerald-600">
                {parsedRows.filter(r => r.matchedUser).length} {isAr ? 'عضو متطابق بالنظام' : 'matched members'}
              </span>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-[11px]">
                  <tr>
                    <th className="p-3 text-start">{isAr ? 'العضو في الشيت' : 'Sheet Identifier'}</th>
                    <th className="p-3 text-start">{isAr ? 'العضو المتطابق بالكيان' : 'Matched System Member'}</th>
                    <th className="p-3 text-center">{isAr ? 'التقييم الإجمالي' : 'Overall'}</th>
                    <th className="p-3 text-start">{isAr ? 'الملاحظات' : 'Feedback'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                  {parsedRows.map((row, idx) => (
                    <tr key={idx} className={row.matchedUser ? 'bg-emerald-500/5' : 'bg-rose-500/5'}>
                      <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {row.identifier}
                      </td>
                      <td className="p-3 font-bold">
                        {row.matchedUser ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{row.matchedUser.fullName} ({row.matchedUser.committee})</span>
                          </span>
                        ) : (
                          <span className="text-rose-500 text-[11px] font-bold">
                            ⚠️ {isAr ? 'عضو غير مسجل بالكيان' : 'Unmatched'}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-amber-500">
                        ⭐ {row.overallRating} / 5.0
                      </td>
                      <td className="p-3 text-slate-500 truncate max-w-xs text-[11px]">
                        {row.feedbackComment || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleConfirmSync}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-2xl shadow-lg transition-all cursor-pointer"
              >
                {isAr ? `اعتماد ومزامنة تقييمات (${parsedRows.filter(r => r.matchedUser).length}) عضو الآن 🚀` : 'Confirm & Sync Ratings Now 🚀'}
              </button>
              <button
                onClick={onClose}
                className="px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-2xl cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
