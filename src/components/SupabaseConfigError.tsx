import React, { useState } from 'react';
import { useLanguage } from '../lib/LanguageContext';
import { useTheme } from '../lib/ThemeContext';
import { 
  Database, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertTriangle, 
  Globe, 
  Sun, 
  Moon, 
  Terminal, 
  Cloud 
} from 'lucide-react';

export const SupabaseConfigError: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'netlify' | 'local'>('netlify');

  const isAr = language === 'ar';

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const translations = {
    title: isAr ? 'مطلوب إعداد قاعدة البيانات Supabase' : 'Supabase Configuration Required',
    subtitle: isAr 
      ? 'EYE Workflow Hub يتطلب الاتصال بـ Supabase للعمل بشكل صحيح.' 
      : 'EYE Workflow Hub requires a Supabase connection to store and retrieve data.',
    warning: isAr
      ? 'تحذير: لم يتم العثور على متغيرات البيئة الخاصة بـ Supabase أو أنها غير صالحة. تم إيقاف تحميل التطبيق لمنع حدوث أعطال.'
      : 'Warning: Supabase environment variables were not found or are invalid. App execution has been halted to prevent client crashes.',
    
    tabNetlify: isAr ? 'الرفع على Netlify (موصى به)' : 'Deploying to Netlify (Recommended)',
    tabLocal: isAr ? 'التشغيل المحلي (Local)' : 'Local Development',

    netlifyStep1: isAr ? '1. افتح لوحة تحكم Netlify' : '1. Open the Netlify Dashboard',
    netlifyStep1Desc: isAr
      ? 'انتقل إلى موقعك، ثم توجه إلى الإعدادات: Site configuration > Environment variables'
      : 'Go to your site in Netlify, and navigate to: Site configuration > Environment variables',
    
    netlifyStep2: isAr ? '2. أضف متغيرات البيئة التالية' : '2. Add the following Environment Variables',
    netlifyStep2Desc: isAr
      ? 'تأكد من كتابة المفاتيح بدقة (يجب تبدأ بـ VITE_ لكي يقرأها تطبيق Vite)'
      : 'Ensure the keys match exactly (they must start with VITE_ to be bundled by Vite)',

    netlifyStep3: isAr ? '3. أعد بناء الموقع (Redeploy)' : '3. Rebuild Your Site (Redeploy)',
    netlifyStep3Desc: isAr
      ? 'قم بإعادة نشر الموقع (Trigger deploy) لتطبيق المتغيرات الجديدة في النسخة البرمجية.'
      : 'Trigger a new build (Redeploy) on Netlify to embed the new environment variables into the build.',

    localDesc: isAr
      ? 'إذا كنت تقوم بتشغيل الموقع محلياً، قم بإنشاء ملف باسم `.env` في المجلد الرئيسي للمشروع وأضف السطور التالية:'
      : 'If you are running the project locally, create a `.env` file in the root directory and add the following lines:',
    
    copied: isAr ? 'تم النسخ!' : 'Copied!',
    clickToCopy: isAr ? 'اضغط للنسخ' : 'Click to copy key',
    
    envUrlLabel: 'VITE_SUPABASE_URL',
    envKeyLabel: 'VITE_SUPABASE_ANON_KEY',
    
    docsBtn: isAr ? 'عرض وثائق Supabase' : 'View Supabase Docs',
    switchLang: isAr ? 'English' : 'العربية',
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      
      {/* Top Header Buttons */}
      <header className="w-full max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-blue-700 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            E
          </div>
          <span className="font-bold text-lg tracking-tight">EYE Hub</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <button 
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            <Globe className="h-4 w-4" />
            <span>{translations.switchLang}</span>
          </button>
          
          {/* Theme Switcher */}
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-slate-500 dark:text-slate-400"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8 flex flex-col items-center justify-center">
        
        {/* Warning Indicator */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-xl animate-pulse" />
          <div className="h-16 w-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 relative shadow-inner">
            <AlertTriangle className="h-8 w-8" />
          </div>
        </div>

        {/* Title and Intro */}
        <div className="text-center max-w-2xl mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3 text-slate-900 dark:text-white">
            {translations.title}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base leading-relaxed">
            {translations.subtitle}
          </p>
        </div>

        {/* Warning Callout */}
        <div className="w-full p-4 mb-8 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 flex gap-3 text-xs md:text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <p>{translations.warning}</p>
        </div>

        {/* Config Panel Card */}
        <div className="w-full glass-panel rounded-2xl shadow-xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 p-1">
            <button
              onClick={() => setActiveTab('netlify')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'netlify'
                  ? 'bg-white dark:bg-slate-950 shadow-sm text-blue-700 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Cloud className="h-4 w-4" />
              <span>{translations.tabNetlify}</span>
            </button>
            <button
              onClick={() => setActiveTab('local')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'local'
                  ? 'bg-white dark:bg-slate-950 shadow-sm text-blue-700 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Terminal className="h-4 w-4" />
              <span>{translations.tabLocal}</span>
            </button>
          </div>

          {/* Instructions Content */}
          <div className="p-6 md:p-8">
            
            {activeTab === 'netlify' && (
              <div className="space-y-6">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">1</div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm md:text-base text-slate-800 dark:text-slate-200">{translations.netlifyStep1}</h3>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">{translations.netlifyStep1Desc}</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">2</div>
                  <div className="space-y-3 flex-1">
                    <div>
                      <h3 className="font-bold text-sm md:text-base text-slate-800 dark:text-slate-200">{translations.netlifyStep2}</h3>
                      <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">{translations.netlifyStep2Desc}</p>
                    </div>

                    {/* Env variable clipboard items */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      {/* URL Card */}
                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex justify-between items-center group">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Environment Variable Key</span>
                          <p className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-400">{translations.envUrlLabel}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(translations.envUrlLabel, 'url')}
                          className="p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 active:scale-95 shadow-sm"
                          title={translations.clickToCopy}
                        >
                          {copiedKey === 'url' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>

                      {/* Anon Key Card */}
                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex justify-between items-center group">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Environment Variable Key</span>
                          <p className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-400">{translations.envKeyLabel}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(translations.envKeyLabel, 'key')}
                          className="p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 active:scale-95 shadow-sm"
                          title={translations.clickToCopy}
                        >
                          {copiedKey === 'key' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">3</div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm md:text-base text-slate-800 dark:text-slate-200">{translations.netlifyStep3}</h3>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">{translations.netlifyStep3Desc}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'local' && (
              <div className="space-y-4">
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">{translations.localDesc}</p>
                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-300 p-4 font-mono text-xs md:text-sm leading-relaxed">
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={() => copyToClipboard(
                        `VITE_SUPABASE_URL="your-supabase-project-url"\nVITE_SUPABASE_ANON_KEY="your-supabase-anon-key"`,
                        'code'
                      )}
                      className="p-1.5 rounded-md bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      {copiedKey === 'code' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-green-500" />
                          <span className="text-[10px] text-green-500">{translations.copied}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                  <span className="text-slate-500"># .env file</span>
                  <p className="text-slate-300 mt-2">VITE_SUPABASE_URL=<span className="text-amber-300">"https://your-project-ref.supabase.co"</span></p>
                  <p className="text-slate-300">VITE_SUPABASE_ANON_KEY=<span className="text-amber-300">"your-anon-public-key"</span></p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex flex-col md:flex-row gap-3">
          <a 
            href="https://supabase.com/dashboard" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold shadow-md shadow-blue-500/10 hover:shadow-blue-500/25 transition-all text-sm active:scale-98"
          >
            <Database className="h-4 w-4" />
            <span>{isAr ? 'افتح لوحة تحكم Supabase' : 'Open Supabase Dashboard'}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <a 
            href="https://docs.netlify.com/configure-builds/environment-variables/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold transition-all text-sm active:scale-98"
          >
            <span>{isAr ? 'دليل إعدادات Netlify' : 'Netlify Env Guide'}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-6 text-center border-t border-slate-100 dark:border-slate-900/50">
        <p className="text-xs text-slate-400 dark:text-slate-600">
          EYE Workflow Hub &bull; Made with pride
        </p>
      </footer>
    </div>
  );
};
