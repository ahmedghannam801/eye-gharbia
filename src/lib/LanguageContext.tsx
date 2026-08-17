import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language, COMMITTEE_TRANSLATIONS, DEPARTMENT_TRANSLATIONS } from './translations';

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['ar']) => string;
  translateCommittee: (commCode: string) => string;
  translateDepartment: (deptCode: string) => string;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('eye_language');
    return (saved === 'en' || saved === 'ar') ? saved : 'ar'; // default to Arabic
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('eye_language', lang);
  };

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    if (language === 'ar') {
      document.documentElement.classList.add('rtl');
    } else {
      document.documentElement.classList.remove('rtl');
    }
  }, [language]);

  const t = (key: keyof typeof translations['ar']): string => {
    const dict = translations[language] || translations['ar'];
    return (dict[key] as string) || (translations['ar'][key] as string) || String(key);
  };

  const translateCommittee = (commCode: string): string => {
    const comms = COMMITTEE_TRANSLATIONS[language] || COMMITTEE_TRANSLATIONS['ar'];
    return comms[commCode] || commCode;
  };

  const translateDepartment = (deptCode: string): string => {
    const depts = DEPARTMENT_TRANSLATIONS[language] || DEPARTMENT_TRANSLATIONS['ar'];
    return depts[deptCode] || deptCode;
  };

  const isRtl = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translateCommittee, translateDepartment, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
