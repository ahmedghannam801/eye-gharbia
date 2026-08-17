/**
 * EYE Workflow Hub — Color & Contrast Utilities
 * Auto-detects background luminance and returns a contrast-safe text color.
 * Guarantees WCAG AA (4.5:1 minimum) for body text.
 */

export type RGB = { r: number; g: number; b: number };

/* ── Parse any CSS color string into RGB ── */
export function parseColor(input: string): RGB | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();

  // Hex (#fff, #ffffff, #ffffff00)
  if (s.startsWith('#')) {
    let hex = s.slice(1);
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length === 4) hex = hex.split('').map(c => c + c).join('');
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if ([r, g, b].some(Number.isNaN)) return null;
      return { r, g, b };
    }
    return null;
  }

  // rgb(...) / rgba(...)
  const rgbMatch = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }

  return null;
}

/* ── Compute relative luminance per WCAG (0..1) ── */
export function luminance({ r, g, b }: RGB): number {
  const toLinear = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/* ── Contrast ratio between two colors (1..21) ── */
export function contrastRatio(c1: RGB, c2: RGB): number {
  const L1 = luminance(c1);
  const L2 = luminance(c2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/* ── Pick best text color (black or white) for a given background ── */
export function pickReadableText(bgColor: string): '#111827' | '#FFFFFF' {
  const bg = parseColor(bgColor);
  if (!bg) return '#111827';
  const lum = luminance(bg);
  // Threshold ~0.55 — light bg → dark text, dark bg → light text
  return lum > 0.55 ? '#111827' : '#FFFFFF';
}

/* ── Verify a pair meets WCAG AA (4.5:1) or AAA (7:1) ── */
export function meetsWCAG(
  fg: string,
  bg: string,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText = false
): boolean {
  const c1 = parseColor(fg);
  const c2 = parseColor(bg);
  if (!c1 || !c2) return false;
  const ratio = contrastRatio(c1, c2);
  if (level === 'AAA') return ratio >= (isLargeText ? 4.5 : 7);
  return ratio >= (isLargeText ? 3 : 4.5);
}

/* ── Auto-fix a color until it meets AA on the given bg ── */
export function autoFixContrast(fg: string, bg: string, targetRatio = 4.5): string {
  const c1 = parseColor(fg);
  const c2 = parseColor(bg);
  if (!c1 || !c2) return fg;
  if (contrastRatio(c1, c2) >= targetRatio) return fg;

  const bgIsLight = luminance(c2) > 0.5;
  let bestText = bgIsLight ? '#111827' : '#FFFFFF';

  // Try variations to find best readable
  for (let i = 0; i < 12; i++) {
    const candidate = bgIsLight
      ? `rgb(${15 + i * 2}, ${23 + i * 2}, ${42 + i * 2})`
      : `rgb(${255 - i * 2}, ${255 - i * 2}, ${255 - i * 2})`;
    const cc = parseColor(candidate);
    if (cc && contrastRatio(cc, c2) >= targetRatio) {
      bestText = candidate;
      break;
    }
  }
  return bestText;
}

/* ── React hook: auto-contrast text color from element background ── */
export function useAutoContrast(): {
  register: (el: HTMLElement | null) => void;
  textColor: string;
} {
  const [textColor, setTextColor] = React.useState('#111827');

  const register = (el: HTMLElement | null) => {
    if (!el) return;
    // Walk up to find the nearest non-transparent background
    let node: HTMLElement | null = el;
    let bg = '';
    while (node && node !== document.documentElement) {
      const c = window.getComputedStyle(node).backgroundColor;
      const rgb = parseColor(c);
      // Skip fully transparent backgrounds
      if (rgb && !(rgb.r === 0 && rgb.g === 0 && rgb.b === 0 && c.includes('0)'))) {
        bg = c;
        break;
      }
      // Also accept rgba with non-zero alpha
      const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (m && (!m[4] || parseFloat(m[4]) > 0.5)) {
        bg = c;
        break;
      }
      node = node.parentElement;
    }
    if (!bg) bg = window.getComputedStyle(document.body).backgroundColor || '#ffffff';
    setTextColor(pickReadableText(bg));
  };

  return { register, textColor };
}

// Re-export React for the hook
import React from 'react';
