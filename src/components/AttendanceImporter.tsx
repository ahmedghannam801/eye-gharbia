import React, { useState, useRef, useCallback } from 'react';
import ExcelJS from 'exceljs';
import { db } from '../db/localDb';
import { UserProfile } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import {
  Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle,
  AlertTriangle, FileText, Download, Info, Loader2, RefreshCw,
} from 'lucide-react';

interface AttendanceImporterProps {
  currentUser: UserProfile;
  onClose: () => void;
}

interface ImportResult {
  added: number;
  updated: number;
  skipped: number;
  errors: string[];
}

type StepType = 'idle' | 'preview' | 'importing' | 'done';

const SAMPLE_CSV = `اسم العضو,نوع الحدث,الحضور,التاريخ
أحمد محمد,ميتينج أونلاين,حضر,2024-08-01
فاطمة علي,ميتينج أوفلاين,عذر مقبول,2024-08-01
محمود حسن,تاسك,غاب,2024-08-01
`;

export const AttendanceImporter: React.FC<AttendanceImporterProps> = ({ currentUser, onClose }) => {
  const { language, isRtl } = useLanguage();
  const isAr = language === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<StepType>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<Array<Record<string, string>>>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parseError, setParseError] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const parseFile = useCallback(async (file: File) => {
    setParseError('');
    setFileName(file.name);

    const isCSV = file.name.toLowerCase().endsWith('.csv');
    const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');

    if (!isCSV && !isExcel) {
      setParseError(isAr ? 'صيغة الملف غير مدعومة. يُرجى رفع ملف .xlsx أو .csv فقط.' : 'Unsupported file format. Please upload .xlsx or .csv only.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        let jsonRows: Array<Record<string, string>> = [];

        if (isCSV) {
          // Parse CSV directly
          const text = data as string;
          const lines = text.split('\n').filter(line => line.trim());
          if (lines.length === 0) {
            setParseError(isAr ? 'الملف فارغ أو لا يحتوي على بيانات.' : 'The file is empty or contains no data.');
            return;
          }
          const csvHeaders = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          jsonRows = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const row: Record<string, string> = {};
            csvHeaders.forEach((h, i) => {
              row[h] = values[i] || '';
            });
            return row;
          });
        } else {
          // Parse Excel using ExcelJS (secure, no prototype pollution)
          const workbook = new ExcelJS.Workbook();
          const buffer = data as ArrayBuffer;
          await workbook.xlsx.load(buffer);
          const worksheet = workbook.getWorksheet(1);

          if (!worksheet) {
            setParseError(isAr ? 'الملف لا يحتوي على أوراق عمل.' : 'File contains no worksheets.');
            return;
          }

          const rows: string[][] = [];
          worksheet.eachRow((row, rowNumber) => {
            const rowData: string[] = [];
            row.eachCell((cell, colNumber) => {
              rowData[colNumber - 1] = cell.value?.toString() || '';
            });
            rows.push(rowData);
          });

          if (rows.length === 0) {
            setParseError(isAr ? 'الملف فارغ أو لا يحتوي على بيانات.' : 'The file is empty or contains no data.');
            return;
          }

          const excelHeaders = rows[0];
          jsonRows = rows.slice(1).map(row => {
            const obj: Record<string, string> = {};
            excelHeaders.forEach((h, i) => {
              obj[h || `col_${i}`] = row[i] || '';
            });
            return obj;
          });
        }

        if (jsonRows.length === 0) {
          setParseError(isAr ? 'الملف فارغ أو لا يحتوي على بيانات.' : 'The file is empty or contains no data.');
          return;
        }

        setHeaders(Object.keys(jsonRows[0]));
        setParsedRows(jsonRows);
        setStep('preview');
      } catch (err) {
        setParseError(isAr ? `خطأ في قراءة الملف: ${String(err)}` : `Error reading file: ${String(err)}`);
      }
    };

    if (isCSV) {
      reader.readAsText(file, 'UTF-8');
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, [isAr]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleImport = async () => {
    setStep('importing');
    try {
      const result = await db.importAttendanceFromFile(parsedRows, currentUser);
      setImportResult(result);
      setStep('done');
    } catch (err) {
      setImportResult({
        added: 0,
        updated: 0,
        skipped: 0,
        errors: [String(err)],
      });
      setStep('done');
    }
  };

  const handleReset = () => {
    setStep('idle');
    setParsedRows([]);
    setHeaders([]);
    setFileName('');
    setParseError('');
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadSample = () => {
    const blob = new Blob(['﻿' + SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'نموذج_ملف_الحضور.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center px-4 py-6"
      dir={isRtl ? 'rtl' : 'ltr'}
      id="attendance-importer-modal"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-violet-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {isAr ? '📥 استيراد ملف الحضور' : '📥 Import Attendance File'}
              </h2>
              <p className="text-[10px] text-slate-500 font-semibold">
                {isAr ? 'Excel أو CSV — الحضور والغياب وبيانات الاجتماعات' : 'Excel or CSV — attendance, absences, and meeting data'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
            id="close-attendance-importer-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* STEP: IDLE */}
          {step === 'idle' && (
            <>
              {/* Column Guide */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-black text-xs">
                  <Info className="w-4 h-4 shrink-0" />
                  {isAr ? 'الأعمدة المطلوبة في الملف' : 'Required File Columns'}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { col: isAr ? 'اسم العضو' : 'Member Name', note: isAr ? 'أو الـ ID / كود العضوية' : 'or ID / membership code' },
                    { col: isAr ? 'نوع الحدث' : 'Event Type', note: isAr ? 'ميتينج أونلاين / أوفلاين / تاسك' : 'online / offline / task' },
                    { col: isAr ? 'الحضور' : 'Attendance', note: isAr ? 'حضر / غاب / عذر مقبول' : 'present / absent / excused' },
                    { col: isAr ? 'التاريخ' : 'Date', note: 'YYYY-MM-DD أو DD/MM/YYYY' },
                  ].map(({ col, note }) => (
                    <div key={col} className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-blue-100 dark:border-blue-900">
                      <p className="text-xs font-black text-blue-700 dark:text-blue-400">{col}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{note}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={downloadSample}
                  className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  id="download-sample-btn"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isAr ? 'تحميل ملف نموذجي (CSV)' : 'Download sample file (CSV)'}
                </button>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200
                  ${isDragging
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/20 scale-[1.01]'
                    : 'border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }
                `}
                id="attendance-drop-zone"
              >
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all ${isDragging ? 'bg-violet-500' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  <Upload className={`w-7 h-7 transition-colors ${isDragging ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                  {isAr ? 'اسحب وأفلت الملف هنا' : 'Drag & drop your file here'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {isAr ? 'أو انقر للاختيار من جهازك' : 'or click to browse from your device'}
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  {['.xlsx', '.xls', '.csv'].map(ext => (
                    <span key={ext} className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-[10px] font-black text-slate-500">
                      {ext}
                    </span>
                  ))}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="attendance-file-input"
                />
              </div>

              {parseError && (
                <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-4">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400">{parseError}</p>
                </div>
              )}
            </>
          )}

          {/* STEP: PREVIEW */}
          {step === 'preview' && (
            <>
              <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-emerald-800 dark:text-emerald-300 truncate">{fileName}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-semibold mt-0.5">
                    {isAr ? `${parsedRows.length} صف · ${headers.length} عمود` : `${parsedRows.length} rows · ${headers.length} columns`}
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                  {isAr ? 'معاينة الأعمدة المكتشفة' : 'Detected Columns Preview'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {headers.map(h => (
                    <span key={h} className="px-3 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200">
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {isAr ? `أول ${Math.min(5, parsedRows.length)} صفوف` : `First ${Math.min(5, parsedRows.length)} rows`}
                </p>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-xs min-w-max">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800">
                        {headers.map(h => (
                          <th key={h} className="px-3 py-2 text-start font-black text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          {headers.map(h => (
                            <td key={h} className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">
                              {row[h] || <span className="text-slate-300">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 5 && (
                  <p className="text-[10px] text-slate-400 text-center font-semibold">
                    {isAr ? `و ${parsedRows.length - 5} صف آخر...` : `and ${parsedRows.length - 5} more rows...`}
                  </p>
                )}
              </div>
            </>
          )}

          {/* STEP: IMPORTING */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
                  <Loader2 className="w-9 h-9 text-violet-600 animate-spin" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-violet-300 dark:border-violet-700 animate-ping opacity-50" />
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-slate-800 dark:text-white">
                  {isAr ? 'جارٍ معالجة الملف...' : 'Processing file...'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {isAr ? 'تحقق من الأعضاء، إنشاء سجلات الحضور، ومزامنة Supabase' : 'Matching members, creating attendance records, syncing to Supabase'}
                </p>
              </div>
            </div>
          )}

          {/* STEP: DONE */}
          {step === 'done' && importResult && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{importResult.added}</p>
                  <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-500 mt-1">
                    {isAr ? '✅ صف مُضاف' : '✅ Added'}
                  </p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{importResult.updated}</p>
                  <p className="text-[10px] font-black text-amber-700 dark:text-amber-500 mt-1">
                    {isAr ? '🔄 صف محدّث' : '🔄 Updated'}
                  </p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-black text-slate-500 dark:text-slate-400">{importResult.skipped}</p>
                  <p className="text-[10px] font-black text-slate-500 mt-1">
                    {isAr ? '⏭ صف متجاهل' : '⏭ Skipped'}
                  </p>
                </div>
              </div>

              {(importResult.added > 0 || importResult.updated > 0) && (
                <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                      {isAr ? 'تم الاستيراد بنجاح! ✅' : 'Import successful! ✅'}
                    </p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-0.5">
                      {isAr
                        ? `تمت إضافة ${importResult.added} سجل حضور جديد وتحديث ${importResult.updated} سجل في Supabase.`
                        : `${importResult.added} new attendance records added and ${importResult.updated} updated in Supabase.`}
                    </p>
                  </div>
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-black text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {isAr ? `${importResult.errors.length} تحذير / خطأ` : `${importResult.errors.length} warning(s)`}
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {importResult.errors.map((err, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[10px] text-red-600 dark:text-red-400">
                        <span className="shrink-0 mt-0.5">•</span>
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importResult.added === 0 && importResult.updated === 0 && importResult.errors.length === 0 && (
                <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    {isAr
                      ? 'لم يتم إضافة أي بيانات — ربما الصفوف كلها غائبون أو موجودون مسبقاً أو كانت هناك مشكلة في مطابقة الأعضاء.'
                      : 'No data was added — rows may all be absent, already exist, or there were member matching issues.'}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3 shrink-0">
          {step === 'idle' && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all"
              id="cancel-importer-btn"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all"
                id="back-importer-btn"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {isAr ? 'ملف آخر' : 'Another file'}
              </button>
              <button
                onClick={handleImport}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-xl text-xs font-black py-2.5 transition-all shadow-lg"
                id="start-import-btn"
              >
                <Upload className="w-4 h-4" />
                {isAr ? `استيراد ${parsedRows.length} صف` : `Import ${parsedRows.length} rows`}
              </button>
            </>
          )}

          {step === 'done' && (
            <>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all"
                id="import-another-btn"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {isAr ? 'استيراد ملف آخر' : 'Import another file'}
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-black py-2.5 transition-all shadow-sm"
                id="done-importer-btn"
              >
                {isAr ? '✅ تم — إغلاق' : '✅ Done — Close'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};