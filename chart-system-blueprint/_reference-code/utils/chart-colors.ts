/**
 * Centralized chart color palettes for data visualization.
 *
 * Uses QI CSS variables where possible, with semantic hex fallbacks
 * for chart-specific colors that don't map to a QI variable.
 *
 * Usage:
 *   import { CHART_COLORS, CHART_COLORS_HEX } from '@/lib/ui/chart-colors';
 *
 * - CHART_COLORS: uses CSS variables (for DOM elements)
 * - CHART_COLORS_HEX: uses raw hex values (for canvas/SVG/chart libraries)
 */

/** Chart palette using CSS variables — for DOM-rendered charts */
export const CHART_COLORS = [
  'var(--qi-accent)',      // #F08700 orange
  'var(--qi-info-fg)',     // #3B82F6 blue
  'var(--qi-success-fg)',  // #10B981 emerald
  'var(--qi-warning-fg)',  // #F59E0B amber
  'var(--qi-error-fg)',    // #EF4444 red
  '#8B5CF6',               // violet (no QI var)
  '#EC4899',               // pink (no QI var)
  '#06B6D4',               // cyan (no QI var)
  '#84CC16',               // lime (no QI var)
  '#14B8A6',               // teal (no QI var)
] as const;

/** Chart palette with raw hex — for canvas/SVG/chart libraries that don't support CSS vars */
export const CHART_COLORS_HEX = [
  '#F08700', // orange (accent)
  '#3B82F6', // blue (info)
  '#10B981', // emerald (success)
  '#F59E0B', // amber (warning)
  '#EF4444', // red (error)
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#14B8A6', // teal
] as const;

/** HubSpot brand color */
export const HUBSPOT_COLOR = '#FF7A59';

/** Google brand colors (do not modify — brand assets) */
export const GOOGLE_COLORS = {
  blue: '#4285F4',
  green: '#34A853',
  yellow: '#FBBC05',
  red: '#EA4335',
} as const;
