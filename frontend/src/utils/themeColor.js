export const DEFAULT_PRIMARY_COLOR = '#0369A1';
export const PRIMARY_COLOR_STORAGE_KEY = 'jb_primary_color';

export const PRESET_PRIMARY_COLORS = [
  { id: 'sky', hex: '#0369A1' },
  { id: 'blue', hex: '#1D4ED8' },
  { id: 'indigo', hex: '#4338CA' },
  { id: 'violet', hex: '#6D28D9' },
  { id: 'teal', hex: '#0F766E' },
  { id: 'emerald', hex: '#15803D' },
  { id: 'crimson', hex: '#B91C1C' },
  { id: 'slate', hex: '#334155' },
];

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

const THEME_CSS_KEYS = [
  '--color-sky-50',
  '--color-sky-100',
  '--color-sky-200',
  '--color-sky-300',
  '--color-sky-400',
  '--color-sky-500',
  '--color-sky-600',
  '--color-sky-700',
  '--color-sky-800',
  '--color-sky-900',
  '--color-sky-950',
  '--color-primary',
  '--color-primary-hover',
  '--color-primary-active',
  '--color-primary-soft',
  '--color-primary-subtle',
  '--color-primary-border',
  '--color-primary-contrast',
  '--color-primary-fg',
];

export function normalizeHexColor(value) {
  const cleaned = String(value || '').trim().toUpperCase();
  return HEX_COLOR_PATTERN.test(cleaned) ? cleaned : '';
}

export function isValidHexColor(value) {
  return Boolean(normalizeHexColor(value));
}

function hexToRgb(hex) {
  const normalized = normalizeHexColor(hex) || DEFAULT_PRIMARY_COLOR;
  const intVal = parseInt(normalized.slice(1), 16);
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255,
  };
}

function rgbToHex({ r, g, b }) {
  const toHex = (n) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixRgb(c1, c2, weight2) {
  const w2 = Math.max(0, Math.min(1, weight2));
  const w1 = 1 - w2;
  return {
    r: c1.r * w1 + c2.r * w2,
    g: c1.g * w1 + c2.g * w2,
    b: c1.b * w1 + c2.b * w2,
  };
}

function relativeLuminance({ r, g, b }) {
  const linearize = (channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Calculates WCAG 2.1 contrast ratio between two hex colors: (L1 + 0.05) / (L2 + 0.05).
 */
export function getContrastRatio(hex1, hex2) {
  const norm1 = normalizeHexColor(hex1) || DEFAULT_PRIMARY_COLOR;
  const norm2 = normalizeHexColor(hex2) || '#FFFFFF';
  const lum1 = relativeLuminance(hexToRgb(norm1));
  const lum2 = relativeLuminance(hexToRgb(norm2));
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

/**
 * WCAG contrast ratio between the selected primary background color and white `#FFFFFF`.
 */
export function getContrastRatioOnWhite(hex) {
  return getContrastRatio(hex, '#FFFFFF');
}

/**
 * Ensures optimal WCAG text contrast for any given background color.
 * Returns either dark text (#0F172A) or light text (#FFFFFF) depending on which provides
 * compliant contrast (preferring WCAG AA >= 4.5:1, or the higher ratio).
 */
export function ensureAccessibleTextColor(
  backgroundHex,
  { darkText = '#0F172A', lightText = '#FFFFFF' } = {}
) {
  const normBg = normalizeHexColor(backgroundHex) || DEFAULT_PRIMARY_COLOR;
  const contrastLight = getContrastRatio(normBg, lightText);
  const contrastDark = getContrastRatio(normBg, darkText);

  // If contrast against white is at least 4.5:1, use light text
  if (contrastLight >= 4.5) {
    return lightText;
  }
  // Otherwise pick whichever provides higher contrast
  if (contrastDark >= contrastLight) {
    return darkText;
  }
  return lightText;
}

export function getContrastTextColor(backgroundHex) {
  return ensureAccessibleTextColor(backgroundHex);
}

/**
 * Returns comprehensive text contrast info for the given background color.
 */
export function getTextContrastInfo(backgroundHex) {
  const normBg = normalizeHexColor(backgroundHex) || DEFAULT_PRIMARY_COLOR;
  const textColor = ensureAccessibleTextColor(normBg);
  const ratio = getContrastRatio(normBg, textColor);
  const isDarkText = textColor !== '#FFFFFF';
  const meetsAA = ratio >= 4.5;
  const meetsAALarge = ratio >= 3.0;

  return {
    textColor,
    ratio,
    isDarkText,
    meetsAA,
    meetsAALarge,
  };
}

/**
 * Derive a balanced 50–950 Tailwind-style shade ramp anchored on `700 === hex`.
 */
export function derivePrimaryPalette(hex) {
  const normalized = normalizeHexColor(hex) || DEFAULT_PRIMARY_COLOR;
  const base = hexToRgb(normalized);
  const white = { r: 255, g: 255, b: 255 };
  const darkAnchor = { r: 10, g: 15, b: 28 };

  return {
    50: rgbToHex(mixRgb(base, white, 0.93)),
    100: rgbToHex(mixRgb(base, white, 0.84)),
    200: rgbToHex(mixRgb(base, white, 0.7)),
    300: rgbToHex(mixRgb(base, white, 0.52)),
    400: rgbToHex(mixRgb(base, white, 0.34)),
    500: rgbToHex(mixRgb(base, white, 0.18)),
    600: rgbToHex(mixRgb(base, white, 0.09)),
    700: normalized,
    800: rgbToHex(mixRgb(base, darkAnchor, 0.2)),
    900: rgbToHex(mixRgb(base, darkAnchor, 0.35)),
    950: rgbToHex(mixRgb(base, darkAnchor, 0.52)),
  };
}

function updateFaviconColor(primaryHex, softHex) {
  if (typeof document === 'undefined') return;
  const link = document.querySelector('link[rel="icon"]');
  if (!link) return;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='6' fill='${softHex}'/><text x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-weight='700' font-size='26' fill='${primaryHex}'>JB</text></svg>`;
  link.setAttribute('href', `data:image/svg+xml,${encodeURIComponent(svg)}`);
}

export function getCachedPrimaryColor() {
  if (typeof window === 'undefined') return DEFAULT_PRIMARY_COLOR;
  try {
    const stored = window.localStorage.getItem(PRIMARY_COLOR_STORAGE_KEY);
    return normalizeHexColor(stored) || DEFAULT_PRIMARY_COLOR;
  } catch {
    return DEFAULT_PRIMARY_COLOR;
  }
}

export function applyPrimaryColorTheme(rawHex, { persistCache = true } = {}) {
  const normalized = normalizeHexColor(rawHex) || DEFAULT_PRIMARY_COLOR;
  const palette = derivePrimaryPalette(normalized);
  const contrastColor = ensureAccessibleTextColor(palette[700]);

  if (typeof document !== 'undefined') {
    const rootStyle = document.documentElement.style;
    if (normalized === DEFAULT_PRIMARY_COLOR) {
      THEME_CSS_KEYS.forEach((key) => rootStyle.removeProperty(key));
      updateFaviconColor('#0369A1', '#E0F2FE');
    } else {
      rootStyle.setProperty('--color-sky-50', palette[50]);
      rootStyle.setProperty('--color-sky-100', palette[100]);
      rootStyle.setProperty('--color-sky-200', palette[200]);
      rootStyle.setProperty('--color-sky-300', palette[300]);
      rootStyle.setProperty('--color-sky-400', palette[400]);
      rootStyle.setProperty('--color-sky-500', palette[500]);
      rootStyle.setProperty('--color-sky-600', palette[600]);
      rootStyle.setProperty('--color-sky-700', palette[700]);
      rootStyle.setProperty('--color-sky-800', palette[800]);
      rootStyle.setProperty('--color-sky-900', palette[900]);
      rootStyle.setProperty('--color-sky-950', palette[950]);

      rootStyle.setProperty('--color-primary', palette[700]);
      rootStyle.setProperty('--color-primary-hover', palette[800]);
      rootStyle.setProperty('--color-primary-active', palette[900]);
      rootStyle.setProperty('--color-primary-soft', palette[50]);
      rootStyle.setProperty('--color-primary-subtle', palette[100]);
      rootStyle.setProperty('--color-primary-border', palette[200]);
      rootStyle.setProperty('--color-primary-contrast', contrastColor);
      rootStyle.setProperty('--color-primary-fg', contrastColor);
      updateFaviconColor(palette[700], palette[100]);
    }
  }

  if (persistCache && typeof window !== 'undefined') {
    try {
      if (normalized === DEFAULT_PRIMARY_COLOR) {
        window.localStorage.removeItem(PRIMARY_COLOR_STORAGE_KEY);
      } else {
        window.localStorage.setItem(PRIMARY_COLOR_STORAGE_KEY, normalized);
      }
    } catch {
      // Ignore storage quota errors
    }
  }

  return normalized;
}

export function restoreCachedPrimaryColor() {
  return applyPrimaryColorTheme(getCachedPrimaryColor(), { persistCache: false });
}
