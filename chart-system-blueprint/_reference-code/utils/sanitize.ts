/**
 * HTML Sanitization Utility
 *
 * Uses DOMPurify to sanitize HTML content and prevent XSS attacks.
 * This module provides safe HTML rendering for dangerouslySetInnerHTML.
 */

import DOMPurify from 'dompurify';

/**
 * Default DOMPurify configuration
 * Allows safe HTML tags while removing potentially dangerous content
 */
const DEFAULT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    // Text formatting
    'p',
    'br',
    'span',
    'div',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'strike',
    'sub',
    'sup',
    'small',
    'mark',
    'del',
    'ins',
    // Headings
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    // Lists
    'ul',
    'ol',
    'li',
    'dl',
    'dt',
    'dd',
    // Tables
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
    'caption',
    'colgroup',
    'col',
    // Links and media
    'a',
    'img',
    // Block elements
    'blockquote',
    'pre',
    'code',
    'hr',
    // Semantic elements
    'article',
    'section',
    'nav',
    'aside',
    'header',
    'footer',
    'main',
    'figure',
    'figcaption',
    'address',
    'time',
  ],
  ALLOWED_ATTR: [
    // Common attributes
    'class',
    'id',
    'style',
    'title',
    'lang',
    'dir',
    // Links
    'href',
    'target',
    'rel',
    // Images
    'src',
    'alt',
    'width',
    'height',
    'loading',
    // Tables
    'colspan',
    'rowspan',
    'scope',
  ],
  ALLOW_DATA_ATTR: false,
  // Force all links to open in new tab with noopener
  ADD_ATTR: ['target', 'rel'],
};

/**
 * Configuration for SVG content (more permissive for charts)
 */
const SVG_CONFIG: DOMPurify.Config = {
  ...DEFAULT_CONFIG,
  ADD_TAGS: [
    'svg',
    'path',
    'g',
    'rect',
    'circle',
    'ellipse',
    'line',
    'polyline',
    'polygon',
    'text',
    'tspan',
    'defs',
    'clipPath',
    'mask',
    'use',
    'linearGradient',
    'radialGradient',
    'stop',
    'pattern',
    'image',
    'foreignObject',
    'marker',
    'symbol',
    'title',
    'desc',
    'metadata',
  ],
  ADD_ATTR: [
    'viewBox',
    'preserveAspectRatio',
    'xmlns',
    'xmlns:xlink',
    'fill',
    'stroke',
    'stroke-width',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-dasharray',
    'stroke-dashoffset',
    'opacity',
    'fill-opacity',
    'stroke-opacity',
    'transform',
    'x',
    'y',
    'x1',
    'y1',
    'x2',
    'y2',
    'cx',
    'cy',
    'r',
    'rx',
    'ry',
    'points',
    'd',
    'dx',
    'dy',
    'text-anchor',
    'dominant-baseline',
    'font-size',
    'font-family',
    'font-weight',
    'font-style',
    'letter-spacing',
    'clip-path',
    'clip-rule',
    'fill-rule',
    'offset',
    'stop-color',
    'stop-opacity',
    'gradientUnits',
    'gradientTransform',
    'patternUnits',
    'patternTransform',
    'markerWidth',
    'markerHeight',
    'refX',
    'refY',
    'orient',
  ],
};

/**
 * Configuration for email content (strictest)
 */
const EMAIL_CONFIG: DOMPurify.Config = {
  ...DEFAULT_CONFIG,
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
};

/**
 * Sanitize HTML content
 * @param html - Raw HTML string to sanitize
 * @returns Sanitized HTML string safe for dangerouslySetInnerHTML
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, DEFAULT_CONFIG);
}

/**
 * Sanitize email HTML content (strictest sanitization)
 * @param html - Raw email HTML to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeEmailHtml(html: string): string {
  if (!html) return '';

  // Add hook to force links to open in new tab
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });

  const result = DOMPurify.sanitize(html, EMAIL_CONFIG);

  // Remove hook after use
  DOMPurify.removeHook('afterSanitizeAttributes');

  return result;
}

/**
 * Sanitize SVG content (for charts and infographics)
 * @param svg - Raw SVG string to sanitize
 * @returns Sanitized SVG string
 */
export function sanitizeSvg(svg: string): string {
  if (!svg) return '';
  return DOMPurify.sanitize(svg, SVG_CONFIG);
}

/**
 * Sanitize chat message content
 * @param html - Message HTML content
 * @returns Sanitized HTML string
 */
export function sanitizeMessageHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, DEFAULT_CONFIG);
}

/**
 * Sanitize search highlight content (very minimal)
 * Only allows mark, strong, em tags for highlighting
 */
export function sanitizeHighlight(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['mark', 'strong', 'em', 'b', 'i', 'span'],
    ALLOWED_ATTR: ['class'],
  });
}

/**
 * Check if HTML contains potentially dangerous content
 * @param html - HTML string to check
 * @returns true if HTML appears dangerous
 */
export function hasDangerousContent(html: string): boolean {
  if (!html) return false;

  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick, onerror, etc.
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /data:/i,
    /vbscript:/i,
  ];

  return dangerousPatterns.some((pattern) => pattern.test(html));
}
