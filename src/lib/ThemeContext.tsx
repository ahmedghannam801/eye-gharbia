import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';
export type AccentTheme = 'blue' | 'gold' | 'emerald' | 'purple';

interface ThemeContextProps {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  accentTheme: AccentTheme;
  setAccentTheme: (accent: AccentTheme) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('eye_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const [accentTheme, setAccentThemeState] = useState<AccentTheme>(() => {
    const saved = localStorage.getItem('eye_accent_theme');
    return (saved as AccentTheme) || 'blue';
  });

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setAccentTheme = (accent: AccentTheme) => {
    setAccentThemeState(accent);
    localStorage.setItem('eye_accent_theme', accent);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('eye_theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute('data-accent', accentTheme);

    const accentMap: Record<AccentTheme, { primary: string; dark: string }> = {
      blue: { primary: '#2b66ff', dark: '#1b4cd3' },
      gold: { primary: '#d97706', dark: '#b45309' },
      emerald: { primary: '#059669', dark: '#047857' },
      purple: { primary: '#7c3aed', dark: '#6d28d9' },
    };

    const colors = accentMap[accentTheme] || accentMap.blue;
    root.style.setProperty('--color-eye-brand', colors.primary);
    root.style.setProperty('--color-eye-brand-dark', colors.dark);
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--border-focus', colors.primary);
  }, [accentTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, accentTheme, setAccentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
