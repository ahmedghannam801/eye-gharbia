import React from 'react';
import { getGovernorateNameEn } from '../types';

interface EyeLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  theme?: 'light' | 'dark';
  governorate?: string;
}

export const EyeLogo: React.FC<EyeLogoProps> = ({
  className = '',
  size = 64,
  showText = true,
  theme = 'dark',
  governorate,
}) => {
  const isDark = theme === 'dark';
  const govName = governorate || (typeof window !== 'undefined' ? localStorage.getItem('eye_current_governorate') || '' : '');
  const govEn = getGovernorateNameEn(govName);

  return (
    <div className={`flex items-center gap-3 ${className}`} id="eye-brand-logo">
      {/* Official Egyptian Youth Entity (EYE) logo */}
      <img
        src="/eye-logo-transparent.png"
        alt="Egyptian Youth Entity Logo"
        width={size}
        height={size}
        className="shrink-0 transition-transform duration-300 hover:scale-105 aspect-square object-cover rounded-full border border-slate-200 dark:border-slate-800"
        style={{ width: size, height: size, minWidth: size, minHeight: size, aspectRatio: '1 / 1' }}
      />

      {showText && (
        <div className="flex flex-col">
          <span className={`text-lg font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'} leading-none`}>
            EYE Tasks
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-eye-brand mt-0.5">
            EYE {govEn} Official
          </span>
        </div>
      )}
    </div>
  );
};

export const AnubisVector: React.FC<{ size?: number; className?: string }> = ({ size = 120, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Jackal / Anubis Head & Staff Vector Representation */}
      <g stroke="var(--color-eye-brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Ears */}
        <path d="M 35,40 L 40,10 L 45,35" />
        <path d="M 47,38 L 54,12 L 56,38" />
        
        {/* Head/Snout */}
        <path d="M 35,40 C 35,45 20,50 18,52 C 16,53 18,57 20,57 C 25,57 38,50 42,48" fill="rgba(245, 158, 11, 0.1)" />
        
        {/* Eye */}
        <circle cx="33" cy="46" r="1.5" fill="var(--color-eye-brand)" />

        {/* Neck and Headdress */}
        <path d="M 42,48 L 45,70 L 30,85" />
        <path d="M 47,42 L 55,68 L 65,85" />
        <path d="M 38,55 L 60,55" strokeWidth="1.5" />
        <path d="M 39,60 L 59,60" strokeWidth="1.5" />
        <path d="M 41,65 L 57,65" strokeWidth="1.5" />

        {/* Staff / Scepter */}
        <line x1="68" y1="20" x2="68" y2="110" strokeWidth="3" />
        <path d="M 64,20 L 68,10 L 72,20 L 68,20" fill="var(--color-eye-brand)" />
        <path d="M 62,110 L 74,110" strokeWidth="2" />

        {/* Torso Silhouette */}
        <path d="M 28,85 L 35,115 L 60,115 L 65,85 Z" fill="rgba(245, 158, 11, 0.05)" />
      </g>
    </svg>
  );
};

export const MinistryLogo: React.FC<{ size?: number; className?: string }> = ({
  className = '',
}) => {
  return (
    <div 
      className={`flex items-center gap-2.5 sm:gap-3.5 bg-white dark:bg-slate-900/95 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-blue-500/40 shadow-md dark:shadow-xl backdrop-blur-md shrink-0 w-full sm:w-auto justify-start transition-all duration-300 hover:border-blue-500/60 ${className}`} 
      id="ministry-youth-sports-official-card"
    >
      {/* Official Eagle Emblem Badge with Glowing Ring */}
      <div className="relative p-0.5 sm:p-1 rounded-full bg-gradient-to-br from-blue-600 via-blue-500 to-amber-500 shadow-[0_0_18px_rgba(37,99,235,0.35)] shrink-0">
        <div className="w-11 h-11 sm:w-16 sm:h-16 rounded-full bg-[#071638] flex items-center justify-center border-2 border-slate-200 dark:border-slate-950 overflow-hidden p-0.5 sm:p-1">
          <img
            src="/ministry-logo.png"
            alt="وزارة الشباب والرياضة"
            className="w-full h-full object-contain mix-blend-lighten contrast-125 brightness-110 scale-110"
          />
        </div>
      </div>

      {/* Symmetric Official Typography */}
      <div className="flex flex-col text-start min-w-0">
        <span className="text-xs sm:text-base lg:text-lg font-black tracking-tight text-slate-900 dark:text-white leading-tight drop-shadow-sm truncate">
          وزارة الشباب والرياضة
        </span>
        <span className="text-[9px] sm:text-xs font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400 mt-0.5 sm:mt-1 leading-none truncate">
          MINISTRY OF YOUTH & SPORTS
        </span>
        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 leading-none mt-0.5 sm:mt-1 truncate">
          الإدارة المركزية للتمكين الشبابي
        </span>
      </div>
    </div>
  );
};





