/**
 * AyurvedaReport.jsx
 *
 * PPT-style Ayurveda report - scroll to navigate between slides.
 * Displays Ayurvedic constitution analysis including Prakriti, Vikriti,
 * dosha changes, health score, and personalized recommendations.
 */

import { useState, useEffect, useRef, useMemo, isValidElement, cloneElement } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAnalyticResponses from '../../../hooks/useAnalyticResponses';
import bgImg from "../../assets/bg.jpg";
import logo from "../../assets/genoLogo.png";

// Dosha images
import vataImg from "../../assets/vatta.png";
import pittaImg from "../../assets/pitta.png";
import kaphaImg from "../../assets/kapha2.png";

// Dosha icons (dedicated icon files for dominant dosha display)
import vataIcon from "../../assets/vattaicon.png";
import pittaIcon from "../../assets/pittaicon.png";
import kaphaIcon from "../../assets/kaphaicon.png";

// Corner decorations
import leftTopImg from "../../assets/lefttop.png";
import rightBottomImg from "../../assets/rightbottom.png";
import rightTopImg from "../../assets/righttop.png";
import leftBottomImg from "../../assets/leftbottom.png";

// Prakriti botanical border decoration
import prakritiBorderImg from "../../assets/prakritiborder.png";

// Pie chart outer ring decoration
import decorationImg from "../../assets/decoration.png";

// ============================================
// ANIMATION VARIANTS
// ============================================

const slideVariants = {
  enter: (direction) => ({
    y: direction > 0 ? 100 : -100,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    y: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction) => ({
    y: direction < 0 ? 100 : -100,
    opacity: 0,
    scale: 0.95,
  }),
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

// ============================================
// MOBILE DETECTION HOOK
// ============================================
/**
 * useIsMobile - Returns true when the viewport width is below `breakpoint` px.
 *
 * Uses window.matchMedia instead of a resize listener because matchMedia only
 * fires when the media query result *changes* (i.e. when crossing the 650px
 * threshold), rather than on every pixel of resize. Much more performant.
 *
 * @param {number} breakpoint - Width threshold in pixels (default 650)
 * @returns {boolean} - true when viewport < breakpoint
 */
const useIsMobile = (breakpoint = 650) => {
  const query = `(max-width: ${breakpoint - 1}px)`;
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    // Sync in case it changed between render and effect
    setIsMobile(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return isMobile;
};

// ============================================
// COLORS - Ayurveda Theme
// ============================================
const COLORS = {
  primary: '#243026',        // Dark green (headings/titles)
  vata: '#034a73',           // Blue
  pitta: '#9a2a1b',          // Red/maroon
  kapha: '#32563c',          // Green
  textBrown: '#243026',      // Dark green (body text)
  textLight: '#FFFFFF',
  textMuted: '#768b3c',      // Olive green (subtitles/labels)
  dotInactive: 'rgba(36, 48, 38, 0.4)',  // Primary at 40% opacity
  accent: '#D4A574',
};

// Mobile heading/subheading sizes — edit these two lines to change all mobile report headings at once
const MOBILE_HEADING = 'text-5xl mb-4';
const MOBILE_SUBHEADING = 'text-lg mb-4';

// Dosha colors mapping
const DOSHA_COLORS = {
  vata: COLORS.vata,
  pitta: COLORS.pitta,
  kapha: COLORS.kapha,
};

// Dosha images mapping
const DOSHA_IMAGES = {
  vata: vataImg,
  pitta: pittaImg,
  kapha: kaphaImg,
};

// Dosha icons mapping (for dominant dosha display)
const DOSHA_ICONS = {
  vata: vataIcon,
  pitta: pittaIcon,
  kapha: kaphaIcon,
};

// ============================================
// CORNER DECORATIONS COMPONENT
// ============================================
/**
 * CornerDecorations - Reusable component that renders decorative images
 * in all four corners of a slide. Used across all slide types for consistent styling.
 */
const CornerDecorations = () => (
  <>
    {/* Top-left corner decoration */}
    <img
      src={leftTopImg}
      alt=""
      className="absolute top-0 left-0 w-[18%] sm2:w-[20%] sm:w-[20%] mac:w-[12%] object-contain opacity-40 z-10 pointer-events-none"
    />
    {/* Top-right corner decoration */}
    <img
      src={rightTopImg}
      alt=""
      className="absolute top-2 right-0 w-[18%] sm2:w-[20%] sm:w-[20%] mac:w-[12%] object-contain opacity-40 z-10 pointer-events-none"
    />
    {/* Bottom-left corner decoration */}
    <img
      src={leftBottomImg}
      alt=""
      className="absolute bottom-0 left-0 w-[18%] sm2:w-[20%] sm:w-[20%] mac:w-[20%] object-contain opacity-30 z-10 pointer-events-none"
    />
    {/* Bottom-right corner decoration */}
    <img
      src={rightBottomImg}
      alt=""
      className="absolute bottom-0 right-0 w-[18%] sm2:w-[20%] sm:w-[20%] mac:w-[25%] object-contain opacity-30 z-10 pointer-events-none"
    />
  </>
);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert polar coordinates to cartesian coordinates
 * Used for calculating points on a circle for pie chart segments
 * @param {number} cx - Center X coordinate
 * @param {number} cy - Center Y coordinate
 * @param {number} r - Radius
 * @param {number} angle - Angle in degrees (0 = top, clockwise)
 */
const polarToCartesian = (cx, cy, r, angle) => {
  // Convert angle to radians, offset by -90 so 0 degrees starts at top
  const angleRad = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
};

/**
 * Generate SVG arc path for a pie segment
 * Creates a "slice" shape from center to arc and back
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} r - Radius
 * @param {number} startAngle - Start angle in degrees
 * @param {number} endAngle - End angle in degrees
 */
const describeArc = (cx, cy, r, startAngle, endAngle) => {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);

  // If the arc spans more than 180 degrees, use the large-arc flag
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  // Build the path: Move to center, Line to start of arc, Arc to end, close path
  return [
    `M ${cx} ${cy}`,           // Move to center
    `L ${start.x} ${start.y}`, // Line to start of arc
    `A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`, // Arc to end
    'Z'                        // Close path (back to center)
  ].join(' ');
};

/**
 * Calculate pie segment data from dosha percentages
 * Returns array of segment objects with paths and label positions
 * @param {number} vata - Vata percentage
 * @param {number} pitta - Pitta percentage
 * @param {number} kapha - Kapha percentage
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} r - Radius
 */
const calculatePieSegments = (vata, pitta, kapha, cx, cy, r) => {
  const total = vata + pitta + kapha;
  if (total === 0) return [];

  const segments = [];
  let currentAngle = 0;

  // Small overlap to prevent anti-aliasing gaps between segments
  const overlapDegrees = 0.5;

  const doshas = [
    { name: 'Vata', percentage: vata, color: COLORS.vata, image: vataImg },
    { name: 'Pitta', percentage: pitta, color: COLORS.pitta, image: pittaImg },
    { name: 'Kapha', percentage: kapha, color: COLORS.kapha, image: kaphaImg },
  ];

  doshas.forEach((dosha) => {
    if (dosha.percentage <= 0) return;

    // Calculate segment angle (percentage of 360 degrees)
    const segmentAngle = (dosha.percentage / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + segmentAngle;

    // Calculate label position (middle of segment, slightly outside radius)
    const midAngle = startAngle + segmentAngle / 2;
    const labelRadius = r * 1.25; // Position labels outside the pie
    const labelPos = polarToCartesian(cx, cy, labelRadius, midAngle);

    // Calculate line endpoint (at edge of pie)
    const lineEnd = polarToCartesian(cx, cy, r * 1.02, midAngle);

    // Add small overlap to end angle to prevent anti-aliasing gaps
    const pathEndAngle = endAngle + overlapDegrees;

    segments.push({
      ...dosha,
      startAngle,
      endAngle,
      path: describeArc(cx, cy, r, startAngle, pathEndAngle),
      labelX: labelPos.x,
      labelY: labelPos.y,
      lineEndX: lineEnd.x,
      lineEndY: lineEnd.y,
      midAngle,
    });

    currentAngle = endAngle;
  });

  return segments;
};

/**
 * Parse numbered paragraphs from text
 * Handles formats like "PARAGRAPH 1:", "1.", or double newlines
 */
const parseParagraphs = (text) => {
  if (!text) return [];

  // Try splitting by "PARAGRAPH X:" pattern
  const paragraphPattern = /PARAGRAPH\s*\d+[:\s]*/gi;
  let parts = text.split(paragraphPattern).filter(p => p.trim());

  if (parts.length > 1) return parts.map(p => p.trim());

  // Try splitting by numbered pattern "1.", "2.", etc.
  const numberedPattern = /\n\s*\d+\.\s+/g;
  parts = text.split(numberedPattern).filter(p => p.trim());

  if (parts.length > 1) return parts.map(p => p.trim());

  // Fall back to double newlines
  parts = text.split(/\n\s*\n/).filter(p => p.trim());

  return parts.length > 0 ? parts.map(p => p.trim()) : [text.trim()];
};

/**
 * Strip "PARAGRAPH X -" / "PARAGRAPH X:" markers from AI-generated text.
 *
 * The AI sometimes wraps sections in labels like "PARAGRAPH 1 - Physical Constitution: ..."
 * These are not recognized by parseSectionsByHeading or parseSections, so they leak into
 * slide bodies as raw text. This preprocessing removes them, leaving the real headings
 * (e.g. "Physical Constitution:") intact for the downstream parsers to find.
 *
 * @param {string} text - Raw interpretation text
 * @returns {string} - Text with PARAGRAPH markers removed
 */
const stripParagraphMarkers = (text) => {
  if (!text) return text;
  return text.replace(/PARAGRAPH\s*\d+\s*[-:.]?\s*/gi, '').trim();
};

/**
 * Strip common AI artifacts from heading text:
 * word counts like "(120 words)", leading dashes/bullets, trailing colons,
 * leading numbered-list markers ("1."), and extra whitespace.
 */
const cleanHeadingText = (text) => {
  if (!text) return text;
  return text
    .replace(/\s*\(?\[?\d+\s*words?\]?\)?\s*/gi, ' ')  // word counts
    .replace(/^[\s\-\*#]+/, '')                           // leading dashes/bullets/hashes
    .replace(/:\s*$/, '')                                 // trailing colon
    .replace(/^\d+\.\s*/, '')                             // leading numbered list marker
    .replace(/\s+/g, ' ')                                 // collapse whitespace
    .trim();
};

/**
 * Parse numbered sections from text
 * Handles formats like "SECTION 1: Title" or "1. Title"
 */
const parseSections = (text) => {
  if (!text) return [];

  const sections = [];

  // Try "SECTION X:" pattern
  const sectionPattern = /SECTION\s*(\d+)[:\s]*([^\n]*)\n?([\s\S]*?)(?=SECTION\s*\d+|$)/gi;
  let match;

  while ((match = sectionPattern.exec(text)) !== null) {
    sections.push({
      number: parseInt(match[1]),
      title: cleanHeadingText(match[2]?.trim()) || `Section ${match[1]}`,
      content: match[3]?.trim() || '',
    });
  }

  if (sections.length > 0) return sections;

  // Try "PARAGRAPH X - Title" pattern (safety net if stripParagraphMarkers was bypassed)
  // Extracts the real heading from the title portion — e.g. from "Physical Constitution: Your body..."
  // we take "Physical Constitution" as the title, not "Paragraph 1".
  const paragraphPattern = /PARAGRAPH\s*(\d+)\s*[-:.]\s*([^\n]*)\n?([\s\S]*?)(?=PARAGRAPH\s*\d+|$)/gi;

  while ((match = paragraphPattern.exec(text)) !== null) {
    const rawTitle = match[2]?.trim() || '';
    // Try to extract a real heading from the title (text before the first colon)
    const colonIdx = rawTitle.indexOf(':');
    const title = cleanHeadingText(colonIdx > 0 ? rawTitle.slice(0, colonIdx).trim() : rawTitle) || `Section ${match[1]}`;
    const content = colonIdx > 0
      ? (rawTitle.slice(colonIdx + 1).trim() + '\n' + (match[3] || '')).trim()
      : (match[3]?.trim() || '');

    sections.push({
      number: parseInt(match[1]),
      title,
      content,
    });
  }

  if (sections.length > 0) return sections;

  // Try numbered pattern "1. Title\nContent"
  const numberedPattern = /(\d+)\.\s*([^\n]+)\n([\s\S]*?)(?=\d+\.\s|$)/g;

  while ((match = numberedPattern.exec(text)) !== null) {
    sections.push({
      number: parseInt(match[1]),
      title: cleanHeadingText(match[2]?.trim()) || `Section ${match[1]}`,
      content: match[3]?.trim() || '',
    });
  }

  if (sections.length > 0) return sections;

  // Fall back to treating entire text as one section
  return [{ number: 1, title: '', content: text.trim() }];
};

/**
 * Split text into sections by inline headings (e.g. "Physical Constitution:", "Mental & Cognitive Attributes:")
 * Used specifically for Prakriti Assessment to give each subheading its own slide.
 *
 * How it works:
 * - Scans the text for headings that look like "Title Case Words:" (1-6 capitalized words, optionally joined by &)
 * - Collects the content after each heading until the next heading appears
 * - Any text before the very first heading is prepended to the first section's content
 * - Returns [] if no headings are found (so the caller can fall back to default behavior)
 *
 * @param {string} text - The full prakriti assessment text
 * @returns {Array<{heading: string, content: string}>} - One entry per subheading, or [] if none found
 */
const parseSectionsByHeading = (text) => {
  if (!text) return [];

  // Clean word-count artifacts like "(130 words)" and "PARAGRAPH X:" labels from AI-generated text
  const cleaned = text
    .replace(/\s*\(?\[?\d+\s*words?\]?\)?\s*/gi, ' ')
    .replace(/PARAGRAPH\s*\d+\s*[-:]\s*/gi, '')
    .trim();

  // Regex to match inline headings:
  // - [A-Z][a-z]+ matches a capitalized word like "Physical"
  // - (?:\s+(?:&\s+)?[A-Z][a-z]+){0,5} matches up to 5 more capitalized words,
  //   optionally preceded by "&" (handles "Mental & Cognitive Attributes")
  // - :\s* matches the colon and any trailing whitespace
  const headingRegex = /([A-Z][a-z]+(?:\s+(?:&\s+)?[A-Z][a-z]+){0,5}):\s*/g;

  const sections = [];
  let lastIndex = 0;
  let match;

  while ((match = headingRegex.exec(cleaned)) !== null) {
    // If there's content between the previous section end and this heading,
    // and we already have sections, append it to the last section
    if (sections.length > 0 && match.index > lastIndex) {
      sections[sections.length - 1].content += cleaned.slice(lastIndex, match.index).trim();
    }

    // Save any text that appeared before the very first heading (preamble)
    const preamble = sections.length === 0 && match.index > 0
      ? cleaned.slice(0, match.index).trim()
      : '';

    sections.push({
      heading: cleanHeadingText(match[1]),         // e.g. "Physical Constitution"
      content: preamble ? preamble + '\n\n' : '',  // will be filled with text after heading
    });

    lastIndex = headingRegex.lastIndex;
  }

  // Append any remaining text after the last heading
  if (sections.length > 0 && lastIndex < cleaned.length) {
    sections[sections.length - 1].content += cleaned.slice(lastIndex).trim();
  }

  return sections;
};

/**
 * Split long text into slide-sized chunks (~1000 characters each).
 *
 * Why 1000 chars? On an average screen (~700px viewport), after title/subtitle/
 * padding, roughly 500px is left for text. At text-lg with leading-relaxed
 * (~29px line height), that's ~17 lines × ~60 chars ≈ 1000 chars. Conservative
 * to avoid overflow on smaller screens.
 *
 * Algorithm:
 *  1. Split text into paragraphs by double newlines (\n\n).
 *  2. Walk through paragraphs, accumulating them into a "chunk" until
 *     adding the next paragraph would exceed the limit.
 *  3. If a single paragraph itself exceeds the limit, split it at
 *     sentence boundaries (". ") so each piece stays under the limit.
 *  4. Return an array of strings — one string per slide.
 *
 * @param {string} text - Full text to split
 * @param {number} maxChars - Max characters per chunk (default 1000)
 * @returns {string[]} - Array of text chunks, one per slide
 */
/**
 * Detect whether a single trimmed line looks like a section heading.
 *
 * Recognised patterns:
 *  - Title Case (with hyphens/numbers) + colon, up to ~8 words
 *    e.g. "Physical Constitution:", "Dosha-Based Diet:", "1. Mental Tendencies:"
 *  - ALL-CAPS label + colon  e.g. "DIET & LIFESTYLE:"
 *  - Bold markdown           e.g. "**Physical Constitution:**"
 *  - Any short line (≤60 chars) ending with a colon (catches edge cases)
 */
const HEADING_RE = new RegExp(
  '^(?:' +
  [
    // Title Case words (allow hyphens, digits, &) followed by colon — up to 8 words
    String.raw`(?:\d+[\.\)]\s*)?[A-Z][A-Za-z'-]+(?:\s+(?:&\s+)?[A-Za-z'-]+){0,7}\s*:`,
    // ALL-CAPS label + colon (≥3 chars)
    String.raw`[A-Z][A-Z\s&\-]{2,}:`,
    // Bold markdown, optionally followed by colon
    String.raw`\*\*[^*]+\*\*\s*:?`,
  ].join('|') +
  ')$'
);

/** Return true when `line` (trimmed) looks like a heading. */
const isHeadingLine = (line) => {
  const t = line.trim();
  if (!t) return false;
  // Reject multi-line text — a heading is always a single line
  if (t.includes('\n')) return false;
  // Short line ending with colon, but ONLY if it looks like a label
  // (starts with uppercase, bold marker, or number) and is ≤60 chars.
  // This avoids false positives on content lines like "as your doctor said:"
  if (t.length <= 60 && t.endsWith(':') && /^(?:[A-Z]|\*\*|\d+[\.\)])/.test(t)) return true;
  return HEADING_RE.test(t);
};

const splitTextIntoSlideChunks = (text, maxChars = 1400) => {
  if (!text) return [''];
  // Normalize \r\n (Windows) and lone \r (old Mac) to plain \n, then collapse
  // runs of 2+ blank/whitespace-only lines to a single \n\n so whitespace-pre-wrap
  // never shows large visual gaps. [^\S\n] = any whitespace except newline.
  const normalized = text
    .replace(/\r\n?/g, '\n')
    .replace(/(\n[^\S\n]*){2,}/g, '\n\n')
    .trim();
  if (normalized.length <= maxChars) return [normalized];

  const paragraphs = normalized.split(/\n\s*\n/).filter(p => p.trim());
  const chunks = [];
  let currentChunk = '';

  paragraphs.forEach((para) => {
    const trimmed = para.trim();

    // If adding this paragraph would exceed the limit…
    if (currentChunk && (currentChunk.length + trimmed.length + 2) > maxChars) {
      // Push what we have so far as a complete chunk
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }

    // If the paragraph itself is longer than the limit, split at sentences
    if (trimmed.length > maxChars) {
      const sentences = trimmed.split(/(?<=\.\s)/);
      sentences.forEach((sentence) => {
        if (currentChunk && (currentChunk.length + sentence.length) > maxChars) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        currentChunk += sentence;
      });
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
    }
  });

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // Orphan protection: scan the last few non-empty lines of each chunk.
  // If any trailing lines look like headings, move them (and any empty lines
  // between them) to the start of the next chunk so headings stay with content.
  for (let i = 0; i < chunks.length - 1; i++) {
    const lines = chunks[i].split('\n');

    // Walk backwards to find the first trailing heading (skip empty lines)
    let cutIndex = lines.length;
    for (let j = lines.length - 1; j >= Math.max(0, lines.length - 5); j--) {
      const trimmed = lines[j].trim();
      if (!trimmed) continue; // skip blank lines
      if (isHeadingLine(trimmed)) {
        cutIndex = j; // this line and everything after it should move
      } else {
        break; // stop at first non-heading, non-empty line
      }
    }

    if (cutIndex < lines.length) {
      const moved = lines.splice(cutIndex).map(l => l.trim()).join('\n');
      chunks[i] = lines.join('\n').trim();
      chunks[i + 1] = moved + '\n' + chunks[i + 1];
    }
  }

  // Clean up any chunks that became empty after orphan protection
  const filtered = chunks.filter(c => c.trim());

  return filtered.length > 0 ? filtered : [normalized];
};

/**
 * Create a hidden DOM element that mirrors TextContentSlide's exact layout.
 *
 * This invisible element is used to measure how much text actually fits on a
 * single slide at the current viewport size. Because it uses the same CSS
 * classes as the real slide, the browser resolves responsive padding, font
 * sizes, and line heights for us — no hardcoded breakpoints needed.
 *
 * @param {string} title    - Slide title (used to reserve its vertical space)
 * @param {string} subtitle - Slide subtitle (padded with " (99/99)" to reserve
 *                            the worst-case pagination suffix)
 * @returns {{ root: HTMLElement, container: HTMLElement, textEl: HTMLElement }}
 */
const createSlideMeasureElement = (title, subtitle) => {
  // Root: full-viewport size, invisible, non-interactive
  const root = document.createElement('div');
  root.style.cssText =
    'position:fixed;top:0;left:0;width:100vw;height:100vh;visibility:hidden;pointer-events:none;z-index:-9999;';

  // Outer content area — mirrors the absolute-positioned container in TextContentSlide
  // Same responsive classes: top/bottom/left/right insets + overflow hidden (not auto)
  // so scrollHeight > clientHeight reliably signals overflow.
  const container = document.createElement('div');
  container.className =
    'absolute top-10 bottom-10 left-6 right-6 sm:top-12 sm:bottom-12 sm:left-8 sm:right-8 md:top-16 md:bottom-16 md:left-12 md:right-12';
  container.style.overflow = 'hidden';

  // Inner flex column — mirrors the motion.div wrapper
  const inner = document.createElement('div');
  inner.className = 'w-full min-h-full flex flex-col px-4 sm:px-6 py-6 sm:py-8';

  // Title element — same classes as the <motion.h2>
  const titleEl = document.createElement('h2');
  titleEl.className = 'text-4xl sm:text-4xl md:text-6xl text-center mb-2';
  titleEl.style.fontFamily = 'JAINI, serif';
  titleEl.style.color = COLORS.primary;
  titleEl.textContent = cleanHeadingText(title) || '';

  // Subtitle element — same classes as the <motion.p>
  const subtitleEl = document.createElement('p');
  subtitleEl.className = 'text-sm sm:text-xl md:text-3xl mb-4 sm:my-6 md:my-8 text-center arca-heavy uppercase';
  subtitleEl.style.color = COLORS.textMuted;
  // Pad with worst-case pagination so we reserve enough vertical space
  subtitleEl.textContent = subtitle ? `${subtitle} (99/99)` : '';

  // Text content wrapper — same max-width constraints as the real slide
  const textWrapper = document.createElement('div');
  textWrapper.className = 'w-full max-w-3xl lg:max-w-5xl mx-auto flex-1 pb-4';

  // The actual text element — same responsive font + line-height + whitespace
  const textEl = document.createElement('p');
  textEl.className = 'text-base sm:text-xl leading-relaxed whitespace-pre-wrap opensans-regular italic';
  textEl.style.color = COLORS.textBrown;

  // Assemble the tree
  textWrapper.appendChild(textEl);
  inner.appendChild(titleEl);
  if (subtitle) inner.appendChild(subtitleEl);
  inner.appendChild(textWrapper);
  container.appendChild(inner);
  root.appendChild(container);

  return { root, container, textEl };
};

/**
 * DOM-based text splitting — measures real overflow instead of counting characters.
 *
 * This function replaces the old splitTextIntoSlideChunks for all normal cases.
 * It creates a hidden element (via createSlideMeasureElement) that is an exact
 * mirror of a TextContentSlide, then pours paragraphs into it one by one. When
 * scrollHeight exceeds clientHeight, we know overflow occurred and start a new
 * chunk.
 *
 * Falls back to the character-counting splitTextIntoSlideChunks if the custom
 * JAINI font hasn't loaded yet (font metrics affect line heights and therefore
 * how many paragraphs fit).
 *
 * @param {string} text     - The full text content
 * @param {string} title    - Slide title
 * @param {string} subtitle - Slide subtitle
 * @returns {string[]} - Array of text chunks, one per slide
 */
const measureTextIntoSlideChunks = (text, title, subtitle) => {
  if (!text) return [''];

  // Normalize whitespace (same as the old function)
  const normalized = text
    .replace(/\r\n?/g, '\n')
    .replace(/(\n[^\S\n]*){2,}/g, '\n\n')
    .trim();

  // Font safety: if the JAINI font hasn't loaded, measurements will be wrong
  // because the browser substitutes a fallback with different metrics. In that
  // rare case, fall back to the old character-counting approach.
  try {
    if (!document.fonts.check('16px JAINI')) {
      return splitTextIntoSlideChunks(text);
    }
  } catch {
    // document.fonts not supported — fall back
    return splitTextIntoSlideChunks(text);
  }

  const paragraphs = normalized.split(/\n\s*\n/).filter(p => p.trim());
  if (paragraphs.length === 0) return [normalized];

  const { root, container, textEl } = createSlideMeasureElement(title, subtitle);

  try {
    document.body.appendChild(root);

    const chunks = [];
    let currentParagraphs = []; // paragraphs accumulated for the current slide

    /**
     * Check whether the given set of paragraphs overflows the container.
     * Sets textEl's content and reads scrollHeight vs clientHeight.
     */
    const overflows = (paras) => {
      textEl.textContent = paras.join('\n\n');
      return container.scrollHeight > container.clientHeight;
    };

    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i].trim();
      const candidate = [...currentParagraphs, para];

      if (overflows(candidate)) {
        // Adding this paragraph caused overflow

        if (currentParagraphs.length > 0) {
          // Proactive orphan protection: if the last accumulated paragraph
          // looks like a heading, hold it back so it starts the next slide.
          let heldHeading = null;
          if (currentParagraphs.length > 1) {
            const lastPara = currentParagraphs[currentParagraphs.length - 1].trim();
            if (isHeadingLine(lastPara)) {
              heldHeading = currentParagraphs.pop();
            }
          }

          // Push what we had before this paragraph as a completed chunk
          chunks.push(currentParagraphs.join('\n\n'));
          // Start next accumulation with the held heading (if any)
          currentParagraphs = heldHeading ? [heldHeading] : [];
        }

        // Try the paragraph alone on a fresh page
        if (overflows([para])) {
          // Single paragraph overflows — split by sentences
          const sentences = para.split(/(?<=\.\s)/);
          let sentenceGroup = [];

          for (const sentence of sentences) {
            const sentenceCandidate = [...sentenceGroup, sentence];
            // Build the text as if it were a paragraph
            if (overflows([sentenceCandidate.join('')])) {
              if (sentenceGroup.length > 0) {
                chunks.push(sentenceGroup.join(''));
                sentenceGroup = [];
              }
              // If even a single sentence overflows, push it as-is (unavoidable)
              if (overflows([sentence])) {
                chunks.push(sentence.trim());
              } else {
                sentenceGroup = [sentence];
              }
            } else {
              sentenceGroup = sentenceCandidate;
            }
          }
          // Leftover sentences become part of the next accumulation.
          // Preserve any held heading so it stays at the top of the next chunk.
          if (sentenceGroup.length > 0) {
            currentParagraphs = [...currentParagraphs, sentenceGroup.join('')];
          }
        } else {
          // Paragraph fits on its own — start a fresh accumulation with it.
          // Preserve any held heading so it stays at the top of the next chunk.
          currentParagraphs = [...currentParagraphs, para];
        }
      } else {
        // No overflow — keep accumulating
        currentParagraphs = candidate;
      }
    }

    // Push whatever is left as the final chunk
    if (currentParagraphs.length > 0) {
      chunks.push(currentParagraphs.join('\n\n'));
    }

    // ── Orphan protection (post-processing) ──
    // Scan the last few non-empty lines of each chunk. If any trailing lines
    // look like headings, move them (and any empty lines between) to the next chunk.
    for (let i = 0; i < chunks.length - 1; i++) {
      const lines = chunks[i].split('\n');

      let cutIndex = lines.length;
      for (let j = lines.length - 1; j >= Math.max(0, lines.length - 5); j--) {
        const trimmed = lines[j].trim();
        if (!trimmed) continue; // skip blank lines
        if (isHeadingLine(trimmed)) {
          cutIndex = j;
        } else {
          break; // stop at first non-heading, non-empty line
        }
      }

      if (cutIndex < lines.length) {
        const moved = lines.splice(cutIndex).map(l => l.trim()).join('\n');
        chunks[i] = lines.join('\n').trim();
        chunks[i + 1] = moved + '\n' + chunks[i + 1];
      }
    }

    const filtered = chunks.filter(c => c.trim());
    return filtered.length > 0 ? filtered : [normalized];

  } finally {
    // Always clean up — even if an error is thrown above
    if (root.parentNode) {
      root.parentNode.removeChild(root);
    }
  }
};

/**
 * Build an array of slide objects from a (possibly long) text string.
 *
 * Uses measureTextIntoSlideChunks() to break the text into manageable pieces
 * and wraps each piece in a slide definition with a unique ID and a render
 * function that produces a <TextContentSlide>.
 *
 * If the text fits in a single chunk the ID is just `baseId`.
 * If it overflows, IDs become `baseId-chunk-0`, `baseId-chunk-1`, etc.
 *
 * @param {string} text     - The full text content
 * @param {string} baseId   - Base string for the slide ID (e.g. "prakriti-assessment-0")
 * @param {string} title    - Slide title
 * @param {string} subtitle - Slide subtitle
 * @returns {Array<{id: string, render: Function}>} - Slide objects ready to push
 */
const buildTextSlides = (text, baseId, title, subtitle) => {
  const chunks = measureTextIntoSlideChunks(text, title, subtitle);

  return chunks.map((chunk, i) => ({
    id: chunks.length === 1 ? baseId : `${baseId}-chunk-${i}`,
    topic: title,
    title: chunks.length > 1 ? `${subtitle} (${i + 1}/${chunks.length})` : subtitle,
    render: (active) => (
      <TextContentSlide
        title={title}
        subtitle={chunks.length > 1 ? `${subtitle} (${i + 1}/${chunks.length})` : subtitle}
        content={chunk}
        active={active}
      />
    ),
  }));
};

/**
 * Get score interpretation text and color
 */
const getScoreInterpretation = (score) => {
  if (score >= 80) return { text: 'Excellent', color: '#243026' };
  if (score >= 60) return { text: 'Good', color: '#3B82F6' };
  if (score >= 40) return { text: 'Moderate', color: '#ee9b00' };
  return { text: 'Needs Attention', color: '#EF4444' };
};

/**
 * Helper function for markdown-only parsing (bold/italic)
 * Separated from main function to allow reuse when processing inline headings
 * @param {string} text - Text that may contain markdown formatting
 * @param {object} counter - Shared counter object { current: number } for unique React keys
 * @returns {Array} - Array of text strings and JSX elements
 */
const parseMarkdownOnly = (text, counter = { current: 0 }) => {
  if (!text) return [];

  // Step 1: Strip all asterisks (existing behavior)
  const stripped = text.replace(/\*+/g, '');

  // Step 1.5: Capitalize first letter of each paragraph (after newlines and at start)
  const capitalized = stripped.replace(/(^|\n)(\s*)([a-z])/g, (m, nl, sp, ch) => nl + sp + ch.toUpperCase());

  // Step 2: Find and format special patterns:
  //   - (text in parentheses) → bold, capitalize first letter inside
  //   - number% → italic
  //   - "quoted text" or \u201Ccurly quoted\u201D → italic, capitalize first letter inside
  const regex = /(\([^)]+\))|(\d+(?:\.\d+)?\s*%)|(\d+(?:\.\d+)?\s+(?:health\s+)?score)|(?:[""\u201C]([^""\u201D]*?)[""\u201D])|\b([Ww]hose|[Ww]hom|[Ww]here|[Ww]hich|[Ww]hen|[Ww]hat|[Ww]ho|[Ww]hy|[Hh]ow)\b/gi;

  const result = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(capitalized)) !== null) {
    // Push any plain text before this match
    if (match.index > lastIndex) {
      result.push(capitalized.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // Parenthesized text → bold with first inner letter capitalized
      const inner = match[1].slice(1, -1); // remove ( and )
      const capitalizedInner = inner.charAt(0).toUpperCase() + inner.slice(1);
      result.push(
        <strong key={`fmt-${counter.current++}`} className="opensans-bold" style={{ fontStyle: 'normal' }}>{`(${capitalizedInner})`}</strong>
      );
    } else if (match[2]) {
      // Percentage like 45% → bold
      result.push(
        <strong key={`fmt-${counter.current++}`} className="opensans-bold" style={{ fontStyle: 'normal' }}>
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // Score like "75 health score" or "80 score" → bold
      result.push(
        <strong key={`fmt-${counter.current++}`} className="opensans-bold" style={{ fontStyle: 'normal' }}>
          {match[3]}
        </strong>
      );
    } else if (match[4] !== undefined) {
      // Quoted text → italic with first letter capitalized
      const inner = match[4];
      const capitalizedInner = inner.charAt(0).toUpperCase() + inner.slice(1);
      // Use the same quote character that was matched
      const openQuote = capitalized.charAt(match.index);
      const closeQuote = capitalized.charAt(match.index + match[0].length - 1);
      result.push(
        <em key={`fmt-${counter.current++}`} style={{ fontStyle: 'italic' }}>{openQuote}{capitalizedInner}{closeQuote}</em>
      );
    } else if (match[5]) {
      // Question word → only bold if it starts a sentence
      const before = capitalized.slice(0, match.index);
      const isStartOfSentence = match.index === 0 || /(?:[.!?:]\s*|\n\s*)$/.test(before);

      if (isStartOfSentence) {
        result.push(
          <strong key={`fmt-${counter.current++}`}>{match[5]}</strong>
        );
      } else {
        // Mid-sentence question word → render as plain text, no bold
        result.push(match[5]);
      }
    }

    lastIndex = match.index + match[0].length;
  }

  // Push any remaining plain text after the last match
  if (lastIndex < capitalized.length) {
    result.push(capitalized.slice(lastIndex));
  }

  // If no patterns were found, return the capitalized text as-is
  return result.length > 0 ? result : [capitalized];
};

/**
 * Post-process parsed text to highlight Ayurvedic classical references.
 * Scans plain-string elements for patterns like "Charaka Vimana 8.95" or
 * "Ashtanga Sangraha Sutra 19" and wraps them in italic + underline styling.
 * JSX elements (already-formatted bold, italic, headings, etc.) are skipped.
 *
 * @param {Array} parts - Array of strings and JSX elements from parseMarkdownOnly
 * @param {object} counter - Shared counter object { current: number } for unique React keys
 * @returns {Array} - New array with Ayurvedic references wrapped in styled spans
 */
const highlightAyurvedicReferences = (parts, counter = { current: 0 }) => {
  // Known Ayurvedic classical text names
  const textNames = [
    'Charaka', 'Caraka', 'Sushruta', 'Susruta', 'Ashtanga', 'Astanga',
    'Vagbhata', 'Bhela', 'Kashyapa', 'Kasyapa', 'Harita', 'Madhava',
    'Bhavaprakasha', 'Sharangadhara', 'Dhanvantari'
  ];

  // Known section/division names within Ayurvedic texts
  const sectionNames = [
    'Sutra', 'Vimana', 'Sthana', 'Khanda', 'Sangraha', 'Hridaya',
    'Samhita', 'Nidana', 'Chikitsa', 'Sharira', 'Indriya', 'Siddhi',
    'Kalpa', 'Uttara', 'Purva', 'Tantra', 'Sutrasthana', 'Sharirasthana'
  ];

  // Combine both lists into a single alternation group
  const allTerms = [...textNames, ...sectionNames].join('|');

  // The regex matches three kinds of Ayurvedic references:
  //   Pattern 1 (original): Full-name references like "Charaka Vimana 8.95", "Sutra Sthana 19"
  //   Pattern 2 (new): Abbreviated dot-separated like "Su.Shar.4.68", "A.H.Su.11.26", "Ch.Su.5.12-18"
  //   Pattern 3 (new): Verse/Sloka keywords like "verse 1.23", "Sloka 5.12"
  const regex = new RegExp(
    `((?:(?:${allTerms})\\s+)+\\d+(?:\\.\\d+(?:[\\-–]\\d+)?)?` +
    `|[A-Z][a-z]*(?:\\.[A-Z][a-z]*)+\\.\\d+(?:\\.\\d+(?:[\\-–]\\d+)?)?` +
    `|(?:[Vv]erse|[Ss]loka)\\s+\\d+(?:\\.\\d+(?:[\\-–]\\d+)?)?)`,
    'g'
  );

  const result = [];

  for (const part of parts) {
    // Only process plain strings; pass JSX elements through unchanged
    if (typeof part !== 'string') {
      if (isValidElement(part) && typeof part.props.children === 'string') {
        // Strip parentheses from the text before checking
        let childText = part.props.children;
        const hadParens = childText.startsWith('(') && childText.endsWith(')');
        if (hadParens) childText = childText.slice(1, -1);

        regex.lastIndex = 0;
        if (regex.test(childText)) {
          // Reference found — replace the <strong> entirely (no bold, no parentheses)
          regex.lastIndex = 0;
          const newChildren = [];
          let lastIdx = 0;
          let m;
          while ((m = regex.exec(childText)) !== null) {
            if (m.index > lastIdx) newChildren.push(childText.slice(lastIdx, m.index));
            newChildren.push(
              <span key={`ayur-${counter.current++}`} style={{ fontStyle: 'italic', textDecoration: 'underline', fontSize: '0.9em' }}>
                {m[1]}
              </span>
            );
            lastIdx = m.index + m[0].length;
          }
          if (lastIdx < childText.length) newChildren.push(childText.slice(lastIdx));
          // Push the spans directly — NOT wrapped in <strong>
          result.push(...newChildren);
          continue;
        }
      }
      result.push(part);
      continue;
    }

    let lastIdx = 0;
    let m;
    regex.lastIndex = 0; // Reset regex state for each string

    while ((m = regex.exec(part)) !== null) {
      // Push plain text before this match
      if (m.index > lastIdx) {
        result.push(part.slice(lastIdx, m.index));
      }
      // Wrap the matched reference in italic + underline
      result.push(
        <span key={`ayur-${counter.current++}`} style={{ fontStyle: 'italic', textDecoration: 'underline', fontSize: '0.9em' }}>
          {m[1]}
        </span>
      );
      lastIdx = m.index + m[0].length;
    }

    // Push any remaining text after the last match
    if (lastIdx < part.length) {
      result.push(part.slice(lastIdx));
    } else if (lastIdx === 0) {
      // No matches found — push the original string
      result.push(part);
    }
  }

  return result;
};

/**
 * Parse markdown-style formatting and inline headings, return JSX
 * - Converts **bold text** to <strong> and *italic text* to <em>
 * - Extracts inline headings like "Physical Constitution:" and styles them prominently
 * @param {string} text - Text that may contain markdown formatting and inline headings
 * @returns {JSX.Element} - Rendered text with formatting
 */
const parseMarkdownBold = (text) => {
  if (!text) return null;

  // Remove word count patterns like "130 words", "(50 words)", "[200 words]" and "PARAGRAPH X:" labels
  const cleanedText = text
    .replace(/\s*\(?\[?\d+\s*words?\]?\)?\s*/gi, ' ')
    .replace(/PARAGRAPH\s*\d+\s*[-:]\s*/gi, '')
    .replace(/\s+\((\d+)\)/g, '\n($1)')
    .trim();

  // Process text to extract inline headings and markdown formatting
  const parts = [];
  const counter = { current: 0 };

  // Split by inline headings pattern
  // Two alternatives (tried left-to-right):
  // Alt 1: Question-word headings — e.g., "Why GenoVeda Consultation is Critical for YOUR Case:"
  //   Starts with a capitalized question word (Why/What/How/etc.), then up to 60 chars of any
  //   text (no colons or newlines), ending with a colon. \b prevents partial matches ("Whatever").
  // Alt 2: Title-case headings — e.g., "Physical Constitution:" (1-4 capitalized words + colon)
  // Alt 1 is listed first so it takes priority, preventing Alt 2 from matching only the tail
  // (e.g., "Case:") of a longer question-word heading.
  const headingRegex = /((?:(?:Why|What|How|Where|When|Which|Who|Whom|Whose)\b[^:\n]{0,60})|(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})):\s*/g;

  let lastIndex = 0;
  let match;

  while ((match = headingRegex.exec(cleanedText)) !== null) {
    // Add text before this heading (with markdown parsing)
    if (match.index > lastIndex) {
      const beforeText = cleanedText.slice(lastIndex, match.index);
      parts.push(...parseMarkdownOnly(beforeText, counter));
    }

    // Add the heading as a styled element
    // Uses the primary color (#710000) for visibility
    parts.push(
      <strong key={`fmt-${counter.current++}`} className="text-[#243026] font-semibold">
        {match[1]}:
      </strong>,
      ' ' // Add space after heading
    );

    lastIndex = headingRegex.lastIndex;
  }

  // Add remaining text after last heading (with markdown parsing)
  if (lastIndex < cleanedText.length) {
    const remainingText = cleanedText.slice(lastIndex);
    parts.push(...parseMarkdownOnly(remainingText, counter));
  }

  // If no headings found, just do markdown parsing
  if (parts.length === 0) {
    return highlightAyurvedicReferences(parseMarkdownOnly(cleanedText, counter), counter);
  }

  return highlightAyurvedicReferences(parts, counter);
};

// ============================================
// PROGRESS DOTS COMPONENT
// ============================================
const ProgressDots = ({ current, total, onNavigate }) => (
  <div className="fixed right-2 sm:right-4 md:right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1.5 sm:gap-2">
    {Array.from({ length: total }).map((_, idx) => (
      <button
        key={idx}
        onClick={() => onNavigate(idx)}
        className={`
          w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 cursor-pointer
          ${idx === current ? 'scale-125' : 'hover:opacity-80'}
        `}
        style={{
          backgroundColor: idx === current ? COLORS.primary : COLORS.dotInactive
        }}
        aria-label={`Go to slide ${idx + 1}`}
      />
    ))}
  </div>
);

// ============================================
// MOBILE TOPIC NAV COMPONENT
// ============================================
/**
 * MobileTopicNav — a collapsible top navigation bar visible only on mobile (< 650px).
 *
 * Why: On mobile the right-side progress dots are tiny and unhelpful. This bar
 * shows the current topic name and, when tapped, expands to list all topics for
 * quick jump-to navigation. On desktop (>= 650px) it is hidden via `tab:hidden`.
 */
const MobileTopicNav = ({ topicGroups, currentTopic, isOpen, onToggle, onNavigate }) => (
  <div className="fixed top-0 left-0 right-0 z-50 tab:hidden">
    {/* Backdrop overlay — closes the dropdown when tapping outside */}
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="mobile-nav-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-40"
          onClick={onToggle}
        />
      )}
    </AnimatePresence>

    {/* Nav bar + dropdown container — sits above the backdrop */}
    <div className="relative z-50">
      {/* Collapsed bar — always visible on mobile */}
      <button
        onClick={onToggle}
        className="w-full grid grid-cols-3 items-center px-4 py-3 text-sm font-medium"
        style={{
          backgroundColor: 'rgba(255, 248, 240, 0.92)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgb(116,198,157,0.1)',
          color: COLORS.primary,
        }}
      >
        <img src={logo} alt="Sections" className="w-[40%] tabxs:w-[30%] justify-self-start" />
        <div className=" font-jaini justify-self-center text-center text-[1.65rem] h-auto whitespace-nowrap" style={{ color: COLORS.primary }}>
          Ayurveda Report
        </div>
        <div className='flex items-center gap-x-1 justify-self-end'>
          <motion.svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            className="mt-1"
          >
            <polyline points="6 9 12 15 18 9" />
          </motion.svg>
        </div>
      </button>

      {/* Expanded dropdown — lists all topic groups */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="mobile-nav-dropdown"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
            style={{
              backgroundColor: 'rgba(255, 248, 240, 0.96)',
              backdropFilter: 'blur(8px)',
              borderBottom: '1px solid rgb(116,198,157,0.1)',
            }}
          >
            <div className="py-1">
              {topicGroups.map((group) => {
                const isActive = group.topic === currentTopic;
                return (
                  <button
                    key={group.topic}
                    onClick={() => onNavigate(group.firstSlideIndex)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors"
                    style={{
                      backgroundColor: isActive ? 'rgba(36, 48, 38, 0.07)' : 'transparent',
                    }}
                  >
                    {/* Active indicator dot */}
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0 transition-colors"
                      style={{
                        backgroundColor: isActive ? COLORS.primary : COLORS.dotInactive,
                      }}
                    />
                    {/* Topic name */}
                    <span
                      className="truncate opensans-regular"
                      style={{
                        color: isActive ? COLORS.primary : COLORS.textBrown,
                        fontWeight: isActive ? 600 : 400,
                      }}
                    >
                      {group.topic}
                    </span>
                    {/* Slide count badge (only if more than 1 slide in this topic) */}
                    {group.slideCount > 1 && (
                      <span
                        className="ml-auto text-xs flex-shrink-0 opacity-50"
                        style={{ color: COLORS.textBrown }}
                      >
                        {group.slideCount} slides
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
);

// ============================================
// SLIDE WRAPPER COMPONENT
// ============================================
const Slide = ({ children, active, slideKey, direction = 1 }) => (
  <motion.div
    key={slideKey}
    custom={direction}
    variants={slideVariants}
    initial="enter"
    animate={active ? "center" : "exit"}
    exit="exit"
    transition={{
      y: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.4 },
      scale: { duration: 0.4 },
    }}
    className={`
      absolute inset-0 overflow-hidden
      ${!active ? 'pointer-events-none' : ''}
    `}
  >
    <motion.div
      className="w-full h-full"
      variants={containerVariants}
      initial="hidden"
      animate={active ? "visible" : "hidden"}
    >
      {children}
    </motion.div>
  </motion.div>
);

// ============================================
// ANIMATED NUMBER COMPONENT
// ============================================
const AnimatedNumber = ({ value, decimals = 1, duration = 1500, active = true }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (!active) {
      setDisplayValue(0);
      return;
    }
    startTimeRef.current = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(value * eased);
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [value, duration, active]);

  return <>{displayValue.toFixed(decimals)}</>;
};

// ============================================
// DOSHA IMAGE BAR COMPONENT
// ============================================
/**
 * DoshaImageBar - Displays a dosha visualization with circular icon and pill-shaped bar
 *
 * Layout: [Circular Icon on left, overlapping] [Pill-shaped bar with colored fill] [Percentage inside bar on right]
 *
 * The bar fill animates from 0 to the target percentage with a solid color.
 * The dosha icon is displayed in a circular container on the left that overlaps the bar.
 */
const DoshaImageBar = ({ dosha, percentage, active, delay = 0 }) => {
  const doshaLower = dosha.toLowerCase();
  const icon = DOSHA_ICONS[doshaLower];
  const color = DOSHA_COLORS[doshaLower];

  return (
    <div className="mb-6 relative flex items-center">
      {/* Circular icon container - positioned on left, overlapping bar */}
      <div
        className="relative z-10 w-11 h-11 sm2:w-14 sm2:h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: `white`,
          border: `4px solid ${color}50`
        }}
      >
        <img
          src={icon}
          alt={`${dosha} dosha icon`}
          className="w-8 h-8 sm2:w-10 sm2:h-10 sm:w-12 sm:h-12 object-contain"
        />
      </div>

      {/* Pill-shaped bar container - overlaps behind icon */}
      <div
        className="absolute left-5 sm2:left-7 sm:left-8 right-0 h-8 sm2:h-10 sm:h-12 rounded-full flex items-center px-2"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
      >
        {/* Animated color fill - inset with padding */}
        <motion.div
          className="h-5 sm2:h-6 sm:h-7 rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: active ? `${Math.max(percentage * 0.6, 8)}%` : '0%' }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: delay / 1000 }}
        />

        {/* Percentage text - positioned at far right */}
        <motion.span
          className="absolute right-4 text-base sm:text-lg font-semibold"
          style={{ color: '#243026' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: active ? 1 : 0 }}
          transition={{ duration: 0.5, delay: (delay / 1000) + 0.5 }}
        >
          {percentage.toFixed(1)}%
        </motion.span>
      </div>
    </div>
  );
};

// ============================================
// DOSHA PIE CHART COMPONENT
// ============================================
/**
 * DoshaPieChart - Displays a pie chart with textured segments using dosha images
 *
 * Each segment is filled with a pattern containing the respective dosha image
 * (Vata=blue waves, Pitta=orange fire, Kapha=green leaves).
 * Labels with percentages appear outside each segment.
 *
 * @param {number} vataPercentage - Vata percentage (0-100)
 * @param {number} pittaPercentage - Pitta percentage (0-100)
 * @param {number} kaphaPercentage - Kapha percentage (0-100)
 * @param {boolean} active - Triggers entrance animations
 * @param {number} size - Chart diameter in pixels (default: 280)
 */
const DoshaPieChart = ({
  vataPercentage,
  pittaPercentage,
  kaphaPercentage,
  active,
  size = 280,
  chartId = 'default', // Unique ID to prevent clipPath conflicts between multiple charts
  isMobile = false
}) => {
  // Calculate center and radius based on size
  // We need extra padding for labels, so the actual pie is smaller
  const padding = isMobile ? 85 : 60; // Space for labels outside the pie
  const svgSize = size + padding * 2;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const radius = size / 2;

  // Calculate all pie segments
  const segments = calculatePieSegments(
    vataPercentage,
    pittaPercentage,
    kaphaPercentage,
    cx,
    cy,
    radius
  );

  return (
    <motion.div
      className="flex items-center justify-center w-[260px] sm2:w-[300px] sm:w-[340px] mac:w-[420px] xxl:w-[500px] x3l:w-[540px]"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 0.8 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        className="overflow-visible"
        shapeRendering="geometricPrecision"
      >
        {/* Define clipPaths for each segment and outer circle */}
        {/* chartId ensures unique IDs when multiple pie charts exist in DOM */}
        <defs>
          {/* ClipPaths for each segment - clips texture to show only its slice */}
          {segments.map((segment) => (
            <clipPath key={`clip-${segment.name}`} id={`segment-clip-${segment.name.toLowerCase()}-${chartId}`}>
              <path d={segment.path} />
            </clipPath>
          ))}

          {/* Outer circular clip to ensure clean edges */}
          <clipPath id={`pie-clip-${chartId}`}>
            <circle cx={cx} cy={cy} r={radius - 2} />
          </clipPath>
        </defs>

        {/* Decorative outer ring - repeated decoration images arranged in a circle */}
        {/* Wrapped in a motion.g that continuously rotates 360° around the pie center */}
        <motion.g
          animate={{ rotate: active ? 360 : 0 }}
          transition={{
            rotate: {
              duration: 20,
              repeat: Infinity,
              ease: 'linear',
            },
          }}
          style={{ originX: `${cx}px`, originY: `${cy}px` }}
        >
          {(() => {
            const decoRadius = radius + 18; // ring sits just outside the pie
            const decoSize = 24;            // width & height of each decoration image
            const count = 48;               // number of decoration images around the ring
            return Array.from({ length: count }).map((_, i) => {
              const angle = (i * 360) / count;
              const pos = polarToCartesian(cx, cy, decoRadius, angle);
              return (
                <motion.image
                  key={`deco-${chartId}-${i}`}
                  href={decorationImg}
                  x={pos.x - decoSize / 2}
                  y={pos.y - decoSize / 2}
                  width={decoSize}
                  height={decoSize}
                  transform={`rotate(${angle}, ${pos.x}, ${pos.y})`}
                  opacity="1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: active ? 1 : 0 }}
                  transition={{ duration: 0.4, delay: 0.8 + i * 0.02 }}
                />
              );
            });
          })()}
        </motion.g>

        {/* Layered texture images - all same size, each clipped to its segment */}
        {/* This ensures all textures render at identical dimensions for uniform appearance */}
        <g clipPath={`url(#pie-clip-${chartId})`}>
          {segments.map((segment, index) => (
            <motion.image
              key={segment.name}
              href={segment.name === 'Vata' ? vataImg : segment.name === 'Pitta' ? pittaImg : kaphaImg}
              x={0}
              y={0}
              width={svgSize}
              height={svgSize}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#segment-clip-${segment.name.toLowerCase()}-${chartId})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: active ? 1 : 0 }}
              transition={{
                duration: 0.5,
                delay: index * 0.15,
                ease: 'easeOut',
              }}
            />
          ))}
        </g>

        {/* Clean outer border circle */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#706146"
          strokeWidth="4"
          initial={{ opacity: 0 }}
          animate={{ opacity: active ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        />

        {/* Labels with lines pointing to segments */}
        {segments.map((segment, index) => {
          // Determine text anchor based on position (left or right of center)
          const textAnchor = segment.labelX > cx ? 'start' : 'end';
          // Adjust label X position slightly based on side
          const labelXOffset = segment.labelX > cx ? (isMobile ? 5 : 8) : (isMobile ? -5 : -8);

          return (
            <motion.g
              key={`label-${segment.name}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: active ? 1 : 0, y: active ? 0 : 10 }}
              transition={{ duration: 0.4, delay: 0.7 + index * 0.1 }}
            >
              {/* Line from pie edge to label */}
              <line
                x1={segment.lineEndX}
                y1={segment.lineEndY}
                x2={segment.labelX}
                y2={segment.labelY}
                stroke={segment.color}
                strokeWidth="1.5"
                opacity="0.6"
              />

              {/* Dosha name */}
              <text
                x={segment.labelX + labelXOffset}
                y={segment.labelY - 14}
                textAnchor={textAnchor}
                fill={segment.color}
                fontSize={22}
                fontWeight="600"
                fontFamily="ArcaMajora3-Bold"
              >
                {segment.name}
              </text>

              {/* Percentage */}
              <text
                x={segment.labelX + labelXOffset}
                y={segment.labelY + 16}
                textAnchor={textAnchor}
                fill={COLORS.textBrown}
                fontSize={24}
                fontWeight="700"
                fontFamily="ArcaMajora3-Bold"
              >
                {segment.percentage.toFixed(1)}%
              </text>
            </motion.g>
          );
        })}
      </svg>
    </motion.div>
  );
};

// ============================================
// DOMINANT DOSHA DISPLAY COMPONENT
// ============================================
/**
 * DominantDoshaDisplay - Shows a larger, prominent display of the dominant dosha
 *
 * Displays the dominant dosha icon centered with the dosha name below it.
 * Uses JAINI font for the dosha name with color based on dosha type.
 * Used in the right column of Prakriti/Vikriti slides for visual emphasis.
 */
const DominantDoshaDisplay = ({ dosha, active }) => {
  if (!dosha) return null;

  const doshaLower = dosha.toLowerCase();
  const icon = DOSHA_ICONS[doshaLower];
  const color = DOSHA_COLORS[doshaLower];

  return (
    <motion.div
      className="flex flex-col items-center justify-center p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: active ? 1 : 0, y: active ? 0 : 20 }}
      transition={{ duration: 0.6, delay: 0.8 }}
    >
      {/* Label */}
      <span className="text-lg sm:text-[1.55rem] font-bold arca" style={{ color: COLORS.textMuted }}>
        Dominant Dosha
      </span>

      {/* Full dosha icon - no circular cropping */}
      <motion.div
        className="flex items-center justify-center aspect-square"
        initial={{ scale: 0.8 }}
        animate={{ scale: active ? 1 : 0.8 }}
        transition={{ duration: 0.5, delay: 1 }}
      >
        <img
          src={icon}
          alt={`${dosha} dosha icon`}
          className="w-24 h-24 sm2:w-28 sm2:h-28 sm:w-36 sm:h-36 tab:w-40 tab:h-40 mac:w-44 mac:h-44 md:w-48 md:h-48 object-contain"
        />
      </motion.div>

      {/* Dosha name with JAINI font */}
      <motion.p
        className="text-2xl sm2:text-3xl sm:text-4xl md:text-5xl uppercase mt-2 sm:mt-4"
        style={{
          color,
          fontFamily: 'saman, serif'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: active ? 1 : 0 }}
        transition={{ duration: 0.5, delay: 1.2 }}
      >
        {dosha}
      </motion.p>
    </motion.div>
  );
};

// ============================================
// DOSHA COMPARISON BAR COMPONENT
// ============================================
const DoshaComparisonBar = ({ label, prakritiValue, vikritiValue, change, color, active }) => {
  const changeColor = change > 0 ? '#226f54' : change < 0 ? '#da2c38' : COLORS.textMuted;
  const changeSign = change > 0 ? '+' : '';

  return (
    <div className="mb-6 mac:mb-8 xxl:mb-10 x3l:mb-12">
      <div className="flex justify-between items-center mb-2 mac:mb-3 xxl:mb-4">
        <span
          className="text-[1.05rem] mac:text-2xl xxl:text-3xl font-semibold capitalize arca"
          style={{ color: COLORS.textBrown }}
        >
          {label}
        </span>
        <span
          className="text-[1.05rem] mac:text-lg xxl:text-xl font-bold"
          style={{ color: changeColor }}
        >
          {changeSign}{change.toFixed(2)}%
        </span>
      </div>
      <div className="flex gap-2 mac:gap-3 xxl:gap-4 x3l:gap-6">
        {/* Prakriti bar */}
        <div className="flex-1">
          <div className="text-sm mac:text-lg xxl:text-xl mb-1 mac:mb-2 font-poppins font-medium" style={{ color: COLORS.textMuted }}>Birth</div>
          <div
            className="h-5 mac:h-6 xxl:h-7 x3l:h-8 rounded-full overflow-hidden"
            style={{ backgroundColor: 'rgba(139, 69, 19, 0.1)' }}
          >
            <motion.div
              className="h-full rounded-full opacity-60"
              style={{ backgroundColor: color }}
              initial={{ width: 0 }}
              animate={{ width: active ? `${prakritiValue}%` : 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>
        {/* Vikriti bar */}
        <div className="flex-1">
          <div className="text-sm mac:text-lg xxl:text-xl mb-1 mac:mb-2 font-poppins font-medium" style={{ color: COLORS.textMuted }}>Current</div>
          <div
            className="h-5 mac:h-6 xxl:h-7 x3l:h-8 rounded-full overflow-hidden"
            style={{ backgroundColor: 'rgba(139, 69, 19, 0.1)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              initial={{ width: 0 }}
              animate={{ width: active ? `${vikritiValue}%` : 0 }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// INTRO SLIDE COMPONENT
// ============================================
const IntroSlide = ({ active, isMobile }) => (
  <div
    className={`relative w-full ${isMobile ? 'h-full' : 'h-full min-h-[100vh] overflow-hidden'}`}
    style={isMobile ? {} : {
      backgroundImage: `url(${bgImg})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}
  >
    {/* Corner decorations - only on intro for mobile, always on desktop */}
    <CornerDecorations />

    {/* Content */}
    <motion.div
      className={`relative z-10 w-full flex flex-col items-center justify-center px-6 sm:px-8 md:px-12 ${isMobile ? 'h-full py-8' : 'h-full py-10 sm:py-14 md:py-20'}`}
      variants={containerVariants}
      initial="hidden"
      animate={(active || isMobile) ? "visible" : "hidden"}
    >


      <motion.h2
        variants={itemVariants}
        className="text-5xl leading-20 sm:text-[2.25rem] md:text-[6rem] mac:text-[4rem] tab:text-[3rem] text-center"
        style={{ fontFamily: 'SAMAN, serif', color: COLORS.primary }}
      >
        Welcome to
      </motion.h2>
      <motion.h2
        variants={itemVariants}
        className="text-5xl leading-20 sm:text-[2.25rem] md:text-[6rem] mac:text-[4rem] tab:text-[3rem] text-center"
        style={{ fontFamily: 'SAMAN, serif', color: COLORS.primary }}
      >
        Ayurveda Report
      </motion.h2>

      <motion.p
        variants={itemVariants}
        className="text-lg sm:text-xl md:text-3xl mt-6 sm:my-6 md:my-8 text-center font-poppins"
        style={{ color: COLORS.textMuted }}
      >
        Discover your unique constitution and personalized wellness insights
      </motion.p>

      {/* Scroll indicator - hidden on mobile since page scrolls naturally */}
      {!isMobile && (
        <motion.div
          variants={itemVariants}
          className="absolute bottom-8 sm:bottom-12 left-0 right-0 flex flex-col items-center gap-2"
        >
          <span className="text-sm font-poppins" style={{ color: COLORS.textMuted }}>
            Scroll to explore
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke={COLORS.textBrown}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  </div>
);

// ============================================
// PRAKRITI SLIDE COMPONENT (Birth Constitution)
// ============================================
const PrakritiSlide = ({ prakriti, active, isMobile }) => {
  if (!prakriti) return null;

  return (
    <div
      className={`relative w-full ${isMobile ? 'border-t border-[rgba(36,48,38,0.1)]' : 'h-full min-h-[100vh] overflow-hidden'}`}
      style={isMobile ? {} : {
        backgroundImage: `url(${bgImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Corner decorations - skip on mobile to reduce clutter */}
      {!isMobile && <CornerDecorations />}

      <motion.div
        className={`relative z-10 w-full flex flex-col items-center justify-center px-6 sm:px-8 md:px-12 ${isMobile ? 'py-8' : 'h-full py-10 sm:py-14 md:py-20'}`}
        variants={containerVariants}
        initial="hidden"
        animate={(active || isMobile) ? "visible" : "hidden"}
      >
        <motion.h2
          variants={itemVariants}
          className={`${MOBILE_HEADING} sm:text-4xl md:text-6xl text-center mb-1`}
          style={{ fontFamily: 'JAINI, serif', color: COLORS.primary }}
        >
          Prakriti
        </motion.h2>
        <motion.p
          variants={itemVariants}
          className={`${MOBILE_SUBHEADING} sm:text-xl md:text-3xl mb-4 sm:my-6 md:my-8 text-center arca-heavy uppercase`}
          style={{ color: COLORS.textMuted }}
        >
          Your Birth Constitution
        </motion.p>

        {/* Two-column layout: Pie Chart on left, Dominant Dosha on right */}
        <div className="flex flex-col tab800:flex-row gap-2 tab800:gap-12 md:gap-16 w-full max-w-4xl items-center justify-center">
          {/* Left Column - Dosha Pie Chart */}
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-center"
          >
            <DoshaPieChart
              vataPercentage={prakriti.vata_percentage || 0}
              pittaPercentage={prakriti.pitta_percentage || 0}
              kaphaPercentage={prakriti.kapha_percentage || 0}
              active={active}
              size={340}
              chartId="prakriti"
              isMobile={isMobile}
            />
          </motion.div>

          {/* Right Column - Dominant Dosha Display */}
          {prakriti.dominant_dosha && (
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-center tab:min-w-[200px] mac:min-w-[280px]"
            >
              <DominantDoshaDisplay
                dosha={prakriti.dominant_dosha}
                active={active}
              />
            </motion.div>
          )}
        </div>
      </motion.div>

    </div>
  );
};

// ============================================
// VIKRITI SLIDE COMPONENT (Current State)
// ============================================
const VikritiSlide = ({ vikriti, active, isMobile }) => {
  if (!vikriti) return null;

  return (
    <div
      className={`relative w-full ${isMobile ? 'border-t border-[rgba(36,48,38,0.1)]' : 'h-full min-h-[100vh] overflow-hidden'}`}
      style={isMobile ? {} : {
        backgroundImage: `url(${bgImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Corner decorations - skip on mobile */}
      {!isMobile && <CornerDecorations />}

      <motion.div
        className={`relative z-10 w-full flex flex-col items-center justify-center px-6 sm:px-8 md:px-12 ${isMobile ? 'py-8' : 'h-full py-10 sm:py-14 md:py-20'}`}
        variants={containerVariants}
        initial="hidden"
        animate={(active || isMobile) ? "visible" : "hidden"}
      >
        <motion.h2
          variants={itemVariants}
          className={`${MOBILE_HEADING} sm:text-4xl md:text-6xl text-center mb-1`}
          style={{ fontFamily: 'JAINI, serif', color: COLORS.primary }}
        >
          Vikriti
        </motion.h2>
        <motion.p
          variants={itemVariants}
          className={`${MOBILE_SUBHEADING} sm:text-xl md:text-3xl mb-4 sm:my-6 md:my-8 text-center arca-heavy uppercase`}
          style={{ color: COLORS.textMuted }}
        >
          Your Current State
        </motion.p>

        {/* Two-column layout: Pie Chart on left, Dominant Dosha on right */}
        <div className="flex flex-col tab800:flex-row gap-2 tab800:gap-12 md:gap-16 w-full max-w-4xl items-center justify-center">
          {/* Left Column - Dosha Pie Chart */}
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-center"
          >
            <DoshaPieChart
              vataPercentage={vikriti.vata_percentage || 0}
              pittaPercentage={vikriti.pitta_percentage || 0}
              kaphaPercentage={vikriti.kapha_percentage || 0}
              active={active}
              size={340}
              chartId="vikriti"
              isMobile={isMobile}
            />
          </motion.div>

          {/* Right Column - Dominant Dosha Display */}
          {vikriti.dominant_dosha && (
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-center tab:min-w-[200px] mac:min-w-[280px]"
            >
              <DominantDoshaDisplay
                dosha={vikriti.dominant_dosha}
                active={active}
              />
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ============================================
// DOSHA CHANGES SLIDE COMPONENT
// ============================================
const DoshaChangesSlide = ({ constitution, doshaChanges, active, isMobile }) => {
  if (!constitution || !doshaChanges) return null;

  const { prakriti, vikriti } = constitution;

  return (
    <div
      className={`relative w-full ${isMobile ? 'border-t border-[rgba(36,48,38,0.1)]' : 'h-full min-h-[100vh] overflow-hidden'}`}
      style={isMobile ? {} : {
        backgroundImage: `url(${bgImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Corner decorations - skip on mobile */}
      {!isMobile && <CornerDecorations />}

      <motion.div
        className={`relative z-10 w-full flex flex-col items-center justify-center px-6 sm:px-8 md:px-12 ${isMobile ? 'py-8' : 'h-full py-10 sm:py-14 md:py-20'}`}
        variants={containerVariants}
        initial="hidden"
        animate={(active || isMobile) ? "visible" : "hidden"}
      >
        <motion.h2
          variants={itemVariants}
          className={`${MOBILE_HEADING} sm:text-4xl md:text-6xl text-center mb-1`}
          style={{ fontFamily: 'JAINI, serif', color: COLORS.primary }}
        >
          Dosha Changes
        </motion.h2>
        <motion.p
          variants={itemVariants}
          className={`${MOBILE_SUBHEADING} sm:text-xl md:text-3xl mb-4 sm:my-6 md:my-8 text-center arca-heavy uppercase`}
          style={{ color: COLORS.textMuted }}
        >
          How your constitution has shifted
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="w-full max-w-lg mac:max-w-2xl md:max-w-3xl xxl:max-w-5xl x3l:max-w-6xl"
        >
          <DoshaComparisonBar
            label="Vata"
            prakritiValue={prakriti?.vata_percentage || 0}
            vikritiValue={vikriti?.vata_percentage || 0}
            change={doshaChanges.vata_change || 0}
            color={DOSHA_COLORS.vata}
            active={active}
          />
          <DoshaComparisonBar
            label="Pitta"
            prakritiValue={prakriti?.pitta_percentage || 0}
            vikritiValue={vikriti?.pitta_percentage || 0}
            change={doshaChanges.pitta_change || 0}
            color={DOSHA_COLORS.pitta}
            active={active}
          />
          <DoshaComparisonBar
            label="Kapha"
            prakritiValue={prakriti?.kapha_percentage || 0}
            vikritiValue={vikriti?.kapha_percentage || 0}
            change={doshaChanges.kapha_change || 0}
            color={DOSHA_COLORS.kapha}
            active={active}
          />
        </motion.div>

        {doshaChanges.dominance_shifted && (
          <motion.div
            variants={itemVariants}
            className="mt-4 sm:mt-6 md:mt-8 px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-center"
            style={{ backgroundColor: 'rgb(116,198,157,0.1)' }}
          >
            <span className="font-poppins font-medium" style={{ color: COLORS.primary, fontWeight: 600 }}>
              Dominance has shifted from your birth constitution
            </span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

// ============================================
// HEALTH SCORE SLIDE COMPONENT
// ============================================
const HealthScoreSlide = ({ healthAssessment, active, isMobile }) => {
  if (!healthAssessment) return null;

  const score = healthAssessment.overall_score || 0;
  const interpretation = getScoreInterpretation(score);

  return (
    <div
      className={`relative w-full ${isMobile ? 'border-t border-[rgba(36,48,38,0.1)]' : 'h-full min-h-[100vh] overflow-hidden'}`}
      style={isMobile ? {} : {
        backgroundImage: `url(${bgImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Corner decorations - skip on mobile */}
      {!isMobile && <CornerDecorations />}

      <motion.div
        className={`relative z-10 w-full flex flex-col items-center justify-center px-6 sm:px-8 md:px-12 ${isMobile ? 'py-8' : 'h-full py-10 sm:py-14 md:py-20'}`}
        variants={containerVariants}
        initial="hidden"
        animate={(active || isMobile) ? "visible" : "hidden"}
      >
        <motion.h2
          variants={itemVariants}
          className={`${MOBILE_HEADING} sm:text-4xl md:text-6xl text-center mb-1`}
          style={{ fontFamily: 'JAINI, serif', color: COLORS.primary }}
        >
          Health Score
        </motion.h2>
        <motion.p
          variants={itemVariants}
          className={`${MOBILE_SUBHEADING} sm:text-xl md:text-3xl mb-4 sm:my-6 md:my-8 text-center arca-heavy uppercase`}
          style={{ color: COLORS.textMuted }}
        >
          Your Overall Wellness
        </motion.p>

        {/* Large animated score */}
        <motion.div
          variants={itemVariants}
          className="relative mt-8 sm:mt-2"
        >
          <div
            className="text-6xl sm2:text-7xl sm:text-8xl mac:text-9xl font-bold"
            style={{ color: interpretation.color }}
          >
            <AnimatedNumber value={score} decimals={1} active={active} />
          </div>
          <div
            className="text-lg sm:text-xl md:text-2xl text-center mt-1 sm:mt-2 font-poppins"
            style={{ color: COLORS.textMuted }}
          >
            out of 100
          </div>
        </motion.div>

        {/* Score interpretation */}
        <motion.div
          variants={itemVariants}
          className="mt-4 sm:mt-6 md:mt-8 px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 rounded-xl text-center"
          style={{ backgroundColor: `${interpretation.color}20` }}
        >
          <span
            className="text-xl sm:text-2xl md:text-3xl font-bold font-poppins"
            style={{ color: interpretation.color }}
          >
            {interpretation.text}
          </span>
        </motion.div>

        {/* Score breakdown indicator */}
        <motion.div
          variants={itemVariants}
          className="mt-4 sm:mt-6 md:mt-8 w-full max-w-md"
        >
          <div
            className="h-4 rounded-full overflow-hidden"
            style={{ backgroundColor: 'rgba(139, 69, 19, 0.1)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: interpretation.color }}
              initial={{ width: 0 }}
              animate={{ width: active ? `${score}%` : 0 }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

// ============================================
// TEXT CONTENT SLIDE COMPONENT
// ============================================
const TextContentSlide = ({ title, subtitle, content, active }) => {
  return (
    <div
      className="relative w-full h-full min-h-[100vh] overflow-hidden"
      style={{
        backgroundImage: `url(${bgImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Corner decorations */}
      <CornerDecorations />

      {/* Decorative Borders */}
      {/* <img
        src={borderImg}
        alt=""
        className="absolute top-4 left-0 w-full h-auto z-20"
      />
      <img
        src={borderImg}
        alt=""
        className="absolute bottom-4 left-0 w-full h-auto z-20"
        style={{ transform: 'scaleY(-1)' }}
      /> */}

      {/* Scrollable content container - positioned inside the borders */}
      {/* top-14 on mobile gives extra room for the collapsible topic nav bar; tab:top-10 restores default at 650px+ */}
      <div className="absolute top-14 tab:top-10 bottom-10 left-6 right-6 sm:top-12 sm:bottom-12 sm:left-8 sm:right-8 md:top-16 md:bottom-16 md:left-12 md:right-12 overflow-y-auto z-10">
        <motion.div
          className="w-full min-h-full flex flex-col px-4 sm:px-6 py-6 sm:py-8"
          variants={containerVariants}
          initial="hidden"
          animate={active ? "visible" : "hidden"}
        >
          <motion.h2
            variants={itemVariants}
            className="text-4xl sm:text-4xl md:text-6xl text-center mb-2"
            style={{ fontFamily: 'JAINI, serif', color: COLORS.primary }}
          >
            {cleanHeadingText(title)}
          </motion.h2>
          {subtitle && (
            <motion.p
              variants={itemVariants}
              className="text-sm sm:text-xl md:text-3xl mb-4 sm:my-6 md:my-8 text-center arca-heavy uppercase"
              style={{ color: COLORS.textMuted }}
            >
              {subtitle}
            </motion.p>
          )}

          <motion.div
            variants={itemVariants}
            className="w-full max-w-3xl lg:max-w-5xl mx-auto flex-1 pb-4"
          >
            {typeof content === 'string' ? (
              <p
                className="text-base sm:text-xl leading-relaxed whitespace-pre-wrap opensans-regular"
                style={{ color: COLORS.textBrown }}
              >
                {parseMarkdownBold(content)}
              </p>
            ) : (
              content
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

// ============================================
// SECTIONS SLIDE COMPONENT
// ============================================
const SectionsSlide = ({ title, subtitle, sections, active }) => {
  return (
    <div
      className="relative w-full h-full min-h-[100vh] overflow-hidden"
      style={{
        backgroundImage: `url(${bgImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Corner decorations */}
      <CornerDecorations />

      {/* Decorative Borders */}
      {/* <img
        src={borderImg}
        alt=""
        className="absolute top-4 left-0 w-full h-auto z-20"
      />
      <img
        src={borderImg}
        alt=""
        className="absolute bottom-4 left-0 w-full h-auto z-20"
        style={{ transform: 'scaleY(-1)' }}
      /> */}

      {/* Scrollable content container - positioned inside the borders */}
      {/* top-14 on mobile gives extra room for the collapsible topic nav bar; tab:top-10 restores default at 650px+ */}
      <div className="absolute top-14 tab:top-10 bottom-10 left-6 right-6 sm:top-12 sm:bottom-12 sm:left-8 sm:right-8 md:top-16 md:bottom-16 md:left-12 md:right-12 overflow-y-auto z-10">
        <motion.div
          className="w-full min-h-full flex flex-col px-4 sm:px-6 py-6 sm:py-8"
          variants={containerVariants}
          initial="hidden"
          animate={active ? "visible" : "hidden"}
        >
          <motion.h2
            variants={itemVariants}
            className="text-4xl sm:text-4xl md:text-6xl text-center mb-2"
            style={{ fontFamily: 'JAINI, serif', color: COLORS.primary }}
          >
            {cleanHeadingText(title)}
          </motion.h2>
          {subtitle && (
            <motion.p
              variants={itemVariants}
              className="text-sm sm:text-xl md:text-3xl mb-4 sm:my-6 md:my-8 text-center arca-heavy uppercase"
              style={{ color: COLORS.textMuted }}
            >
              {subtitle}
            </motion.p>
          )}

          <motion.div
            variants={itemVariants}
            className="w-full max-w-3xl lg:max-w-5xl mx-auto flex-1 pb-4"
          >
            <div className="flex flex-col gap-4">
              {sections.map((section, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: 'rgba(36, 48, 38, 0.05)' }}
                >
                  {section.title && (
                    <h3
                      className="text-lg font-semibold mb-2 font-poppins font-medium"
                      style={{ color: COLORS.primary }}
                    >
                      {section.title}
                    </h3>
                  )}
                  <p
                    className="text-base sm:text-xl leading-relaxed whitespace-pre-wrap opensans-regular"
                    style={{ color: COLORS.textBrown }}
                  >
                    {parseMarkdownBold(section.content)}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

// ============================================
// MOBILE TEXT SECTION COMPONENT
// ============================================
/**
 * MobileTextSection - A flowing text section for mobile layouts.
 *
 * On desktop the report uses TextContentSlide which constrains content to a
 * fixed 100vh "slide". On mobile (< 650px) we don't want that constraint —
 * content should flow naturally so users can scroll through it like a normal
 * web page. This component renders a title, optional subtitle, and the full
 * text content with a subtle divider line at the top for visual separation.
 */
const MobileTextSection = ({ title, subtitle, content }) => (
  <div className="px-5 py-8 border-t border-[rgba(36,48,38,0.1)]">
    {title && (
      <h2
        className={`${MOBILE_HEADING} text-center mb-1`}
        style={{ fontFamily: 'JAINI, serif', color: COLORS.primary }}
      >
        {cleanHeadingText(title)}
      </h2>
    )}
    {subtitle && (
      <p
        className={`${MOBILE_SUBHEADING} mb-4 text-center arca-heavy uppercase`}
        style={{ color: COLORS.textMuted }}
      >
        {subtitle}
      </p>
    )}
    <div className="w-full max-w-3xl mx-auto">
      {typeof content === 'string' ? (
        <p
          className="text-base leading-relaxed whitespace-pre-wrap opensans-regular"
          style={{ color: COLORS.textBrown }}
        >
          {parseMarkdownBold(content)}
        </p>
      ) : (
        content
      )}
    </div>
  </div>
);

// ============================================
// MOBILE SECTIONS SECTION COMPONENT
// ============================================
/**
 * MobileSectionsSection - Renders numbered/titled sections in a flowing layout
 * for mobile. Same idea as MobileTextSection but for content that has been
 * parsed into an array of {title, content} objects (like Detailed Explanation
 * or Recommendations that have sub-sections).
 */
const MobileSectionsSection = ({ title, subtitle, sections }) => (
  <div className="px-5 py-8 border-t border-[rgba(36,48,38,0.1)]">
    {title && (
      <h2
        className={`${MOBILE_HEADING} text-center mb-1`}
        style={{ fontFamily: 'JAINI, serif', color: COLORS.primary }}
      >
        {cleanHeadingText(title)}
      </h2>
    )}
    {subtitle && (
      <p
        className={`${MOBILE_SUBHEADING} mb-4 text-center arca-heavy uppercase`}
        style={{ color: COLORS.textMuted }}
      >
        {subtitle}
      </p>
    )}
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-4">
      {sections.map((section, idx) => (
        <div
          key={idx}
          className="p-4 rounded-lg"
          style={{ backgroundColor: 'rgba(36, 48, 38, 0.05)' }}
        >
          {section.title && (
            <h3
              className="text-base font-semibold mb-2 font-poppins font-medium"
              style={{ color: COLORS.primary }}
            >
              {section.title}
            </h3>
          )}
          <p
            className="text-base leading-relaxed whitespace-pre-wrap opensans-regular"
            style={{ color: COLORS.textBrown }}
          >
            {parseMarkdownBold(section.content)}
          </p>
        </div>
      ))}
    </div>
  </div>
);

// ============================================
// LOADING SLIDE COMPONENT
// ============================================
const LoadingSlide = () => (
  <div
    className="relative w-full h-full min-h-[100vh] overflow-hidden flex items-center justify-center"
    style={{
      backgroundImage: `url(${bgImg})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}
  >
    {/* Corner decorations */}
    <CornerDecorations />

    <div className="text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-4 rounded-full mx-auto mb-4"
        style={{ borderColor: `${COLORS.primary} transparent transparent transparent` }}
      />
      <p className="font-poppins" style={{ color: COLORS.textBrown }}>Loading your report...</p>
    </div>
  </div>
);

// ============================================
// ERROR SLIDE COMPONENT
// ============================================
const ErrorSlide = ({ message }) => (
  <div
    className="relative w-full h-full min-h-[100vh] overflow-hidden flex items-center justify-center"
    style={{
      backgroundImage: `url(${bgImg})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}
  >
    {/* Corner decorations */}
    <CornerDecorations />

    <div className="text-center px-6">
      <div className="text-6xl mb-4">⚠️</div>
      <h2
        className="text-2xl font-semibold mb-2"
        style={{ color: COLORS.primary }}
      >
        Unable to Load Report
      </h2>
      <p className="font-poppins" style={{ color: COLORS.textBrown }}>{message}</p>
    </div>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================
const AyurvedaReport = () => {
  // Get URL parameters (orgName, formName, clevoCode)
  const { orgName, formName, clevoCode } = useParams();
  const formCode = `${orgName}/${formName}`;
  const containerRef = useRef(null);

  // Use the hook to fetch data
  const { getAgentResponse, isLoading, error } = useAnalyticResponses(formCode, clevoCode);

  // State
  const [reportData, setReportData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Mobile detection - when true, we show a single scrollable page instead of slides
  const isMobile = useIsMobile(650);

  // Ref for resetting scroll position when changing mobile pages
  const mobileScrollRef = useRef(null);

  // Navigation lock
  const isLockedRef = useRef(false);
  const touchStartY = useRef(0);
  const wheelCooldownTimer = useRef(null);
  const isWheelCoolingDown = useRef(false);

  // Fetch report data on mount
  useEffect(() => {
    const fetchReport = async () => {
      try {
        const data = await getAgentResponse();
        if (data) {
          // Handle case where agent_response is an array (e.g., [{...}])
          // Extract the first element if it's an array
          const reportObj = Array.isArray(data) ? data[0] : data;

          // Check if it's Ayurvedic format by looking for 'constitution' field
          if (reportObj && reportObj.constitution) {
            setReportData(reportObj);
          } else {
            setLoadError('This report is not in Ayurvedic format.');
          }
        } else {
          setLoadError('Report not found.');
        }
      } catch (err) {
        setLoadError(err.message);
      }
    };
    fetchReport();
  }, [getAgentResponse]);

  // Build slides array
  const slides = [];

  if (reportData) {
    const { constitution, dosha_changes, health_assessment } = reportData;
    const interpretation = health_assessment?.interpretation || {};

    // Slide 0: Intro/Cover
    slides.push({
      id: 'intro',
      topic: 'Introduction',
      title: 'Introduction',
      render: (active) => <IntroSlide active={active} />,
    });

    // Slide 1: Prakriti (Birth Constitution)
    if (constitution?.prakriti) {
      slides.push({
        id: 'prakriti',
        topic: 'Prakriti',
        title: 'Prakriti',
        render: (active) => <PrakritiSlide prakriti={constitution.prakriti} active={active} />,
      });
    }

    // Slide 2: Vikriti (Current State)
    if (constitution?.vikriti) {
      slides.push({
        id: 'vikriti',
        topic: 'Vikriti',
        title: 'Vikriti',
        render: (active) => <VikritiSlide vikriti={constitution.vikriti} active={active} />,
      });
    }

    // Slide 3: Dosha Changes
    if (dosha_changes) {
      slides.push({
        id: 'dosha-changes',
        topic: 'Dosha Changes',
        title: 'Dosha Changes',
        render: (active) => (
          <DoshaChangesSlide
            constitution={constitution}
            doshaChanges={dosha_changes}
            active={active}
          />
        ),
      });
    }

    // Slide 4: Health Score
    if (health_assessment) {
      slides.push({
        id: 'health-score',
        topic: 'Health Score',
        title: 'Health Score',
        render: (active) => <HealthScoreSlide healthAssessment={health_assessment} active={active} />,
      });
    }

    // Slide 5+: Prakriti Assessment (split into one slide per subheading if possible)
    if (interpretation.prakriti_assessment) {
      const cleanedPrakriti = stripParagraphMarkers(interpretation.prakriti_assessment);
      const headingSections = parseSectionsByHeading(cleanedPrakriti);

      if (headingSections.length > 0) {
        // Each subheading (e.g. "Physical Constitution", "Mental & Cognitive Attributes")
        // gets its own dedicated slide — auto-split if content overflows
        headingSections.forEach((section, idx) => {
          slides.push(...buildTextSlides(
            section.content,
            `prakriti-assessment-${idx}`,
            'Prakriti Assessment',
            section.heading
          ));
        });
      } else {
        // Fallback: no recognizable headings — auto-split into multiple slides if needed
        slides.push(...buildTextSlides(
          cleanedPrakriti,
          'prakriti-assessment',
          'Prakriti Assessment',
          'Understanding your birth constitution'
        ));
      }
    }

    // Slide 6+: Comprehensive Summary (split into one slide per subheading if possible)
    if (interpretation.comprehensive_summary) {
      const cleanedSummary = stripParagraphMarkers(interpretation.comprehensive_summary);
      const summaryHeadings = parseSectionsByHeading(cleanedSummary);

      if (summaryHeadings.length > 0) {
        // Each subheading gets its own dedicated slide — auto-split if content overflows
        summaryHeadings.forEach((section, idx) => {
          slides.push(...buildTextSlides(
            section.content,
            `comprehensive-summary-${idx}`,
            'Comprehensive Summary',
            section.heading
          ));
        });
      } else {
        // Fallback: no recognizable headings — auto-split into multiple slides if needed
        slides.push(...buildTextSlides(
          cleanedSummary,
          'comprehensive-summary',
          'Comprehensive Summary',
          'An overview of your health profile'
        ));
      }
    }

    // Slide 7+: Detailed Explanation (split into one slide per section)
    if (interpretation.detailed_explanation) {
      // Try numbered/SECTION parsing first (e.g. "SECTION 1 - AHARA"),
      // then fall back to heading-based parsing (e.g. "Physical Constitution:")
      const cleanedDetailed = stripParagraphMarkers(interpretation.detailed_explanation);
      const headingSections = parseSectionsByHeading(cleanedDetailed);
      const numberedSections = parseSections(cleanedDetailed);

      if (numberedSections.length > 0) {
        numberedSections.forEach((section, idx) => {
          slides.push(...buildTextSlides(
            section.content,
            `detailed-explanation-${idx}`,
            'Detailed Explanation',
            section.title || `Section ${section.number}`
          ));
        });
      } else if (headingSections.length > 0) {
        headingSections.forEach((section, idx) => {
          slides.push(...buildTextSlides(
            section.content,
            `detailed-explanation-${idx}`,
            'Detailed Explanation',
            section.heading
          ));
        });
      } else {
        // Fallback: auto-split into multiple slides if needed
        slides.push(...buildTextSlides(
          cleanedDetailed,
          'detailed-explanation',
          'Detailed Explanation',
          'In-depth analysis of your constitution'
        ));
      }
    }

    // Slide 8+: Recommendations (split into one slide per section)
    if (interpretation.recommendations) {
      const cleanedRecommendations = stripParagraphMarkers(interpretation.recommendations);
      const headingSections = parseSectionsByHeading(cleanedRecommendations);
      const numberedSections = parseSections(cleanedRecommendations);

      if (numberedSections.length > 0) {
        numberedSections.forEach((section, idx) => {
          slides.push(...buildTextSlides(
            section.content,
            `recommendations-${idx}`,
            'Recommendations',
            section.title || `Section ${section.number}`
          ));
        });
      } else if (headingSections.length > 0) {
        headingSections.forEach((section, idx) => {
          slides.push(...buildTextSlides(
            section.content,
            `recommendations-${idx}`,
            'Recommendations',
            section.heading
          ));
        });
      } else {
        // Fallback: auto-split into multiple slides if needed
        slides.push(...buildTextSlides(
          cleanedRecommendations,
          'recommendations',
          'Recommendations',
          'Personalized guidance for your wellness'
        ));
      }
    }
  }

  // Auto-close mobile nav when the slide changes (user swiped or used prev/next)
  useEffect(() => {
    setMobileNavOpen(false);
  }, [currentSlide]);

  // ── Mobile sections ──
  // On mobile we skip the expensive text-chunking (measureTextIntoSlideChunks)
  // because there are no 100vh slides to fill. Instead we store the raw text
  // and render it in a flowing layout via MobileTextSection / MobileSectionsSection.
  const mobileSections = [];

  if (reportData && isMobile) {
    const { constitution, dosha_changes, health_assessment } = reportData;
    const interpretation = health_assessment?.interpretation || {};

    // Intro
    mobileSections.push({
      id: 'intro',
      type: 'intro',
      topic: 'Introduction',
    });

    // Prakriti chart
    if (constitution?.prakriti) {
      mobileSections.push({
        id: 'prakriti',
        type: 'prakriti',
        topic: 'Prakriti',
        data: constitution.prakriti,
      });
    }

    // Vikriti chart
    if (constitution?.vikriti) {
      mobileSections.push({
        id: 'vikriti',
        type: 'vikriti',
        topic: 'Vikriti',
        data: constitution.vikriti,
      });
    }

    // Dosha changes
    if (dosha_changes) {
      mobileSections.push({
        id: 'dosha-changes',
        type: 'dosha-changes',
        topic: 'Dosha Changes',
        data: { constitution, doshaChanges: dosha_changes },
      });
    }

    // Health score
    if (health_assessment) {
      mobileSections.push({
        id: 'health-score',
        type: 'health-score',
        topic: 'Health Score',
        data: health_assessment,
      });
    }

    // Prakriti Assessment text — raw, no chunking
    if (interpretation.prakriti_assessment) {
      const cleaned = stripParagraphMarkers(interpretation.prakriti_assessment);
      const headingSections = parseSectionsByHeading(cleaned);

      if (headingSections.length > 0) {
        headingSections.forEach((section, idx) => {
          mobileSections.push({
            id: `prakriti-assessment-${idx}`,
            type: 'text',
            topic: 'Prakriti Assessment',
            title: 'Prakriti Assessment',
            subtitle: section.heading,
            content: section.content,
          });
        });
      } else {
        mobileSections.push({
          id: 'prakriti-assessment',
          type: 'text',
          topic: 'Prakriti Assessment',
          title: 'Prakriti Assessment',
          subtitle: 'Understanding your birth constitution',
          content: cleaned,
        });
      }
    }

    // Comprehensive Summary — raw, no chunking
    if (interpretation.comprehensive_summary) {
      const cleaned = stripParagraphMarkers(interpretation.comprehensive_summary);
      const headingSections = parseSectionsByHeading(cleaned);

      if (headingSections.length > 0) {
        headingSections.forEach((section, idx) => {
          mobileSections.push({
            id: `comprehensive-summary-${idx}`,
            type: 'text',
            topic: 'Comprehensive Summary',
            title: 'Comprehensive Summary',
            subtitle: section.heading,
            content: section.content,
          });
        });
      } else {
        mobileSections.push({
          id: 'comprehensive-summary',
          type: 'text',
          topic: 'Comprehensive Summary',
          title: 'Comprehensive Summary',
          subtitle: 'An overview of your health profile',
          content: cleaned,
        });
      }
    }

    // Detailed Explanation — raw, no chunking
    if (interpretation.detailed_explanation) {
      const cleaned = stripParagraphMarkers(interpretation.detailed_explanation);
      const headingSections = parseSectionsByHeading(cleaned);
      const numberedSections = parseSections(cleaned);

      if (numberedSections.length > 0) {
        mobileSections.push({
          id: 'detailed-explanation',
          type: 'sections',
          topic: 'Detailed Explanation',
          title: 'Detailed Explanation',
          subtitle: 'In-depth analysis of your constitution',
          sections: numberedSections,
        });
      } else if (headingSections.length > 0) {
        headingSections.forEach((section, idx) => {
          mobileSections.push({
            id: `detailed-explanation-${idx}`,
            type: 'text',
            topic: 'Detailed Explanation',
            title: 'Detailed Explanation',
            subtitle: section.heading,
            content: section.content,
          });
        });
      } else {
        mobileSections.push({
          id: 'detailed-explanation',
          type: 'text',
          topic: 'Detailed Explanation',
          title: 'Detailed Explanation',
          subtitle: 'In-depth analysis of your constitution',
          content: cleaned,
        });
      }
    }

    // Recommendations — raw, no chunking
    if (interpretation.recommendations) {
      const cleaned = stripParagraphMarkers(interpretation.recommendations);
      const headingSections = parseSectionsByHeading(cleaned);
      const numberedSections = parseSections(cleaned);

      if (numberedSections.length > 0) {
        mobileSections.push({
          id: 'recommendations',
          type: 'sections',
          topic: 'Recommendations',
          title: 'Recommendations',
          subtitle: 'Personalized guidance for your wellness',
          sections: numberedSections,
        });
      } else if (headingSections.length > 0) {
        headingSections.forEach((section, idx) => {
          mobileSections.push({
            id: `recommendations-${idx}`,
            type: 'text',
            topic: 'Recommendations',
            title: 'Recommendations',
            subtitle: section.heading,
            content: section.content,
          });
        });
      } else {
        mobileSections.push({
          id: 'recommendations',
          type: 'text',
          topic: 'Recommendations',
          title: 'Recommendations',
          subtitle: 'Personalized guidance for your wellness',
          content: cleaned,
        });
      }
    }
  }

  // totalSlides works for both desktop slides and mobile sections
  const totalSlides = isMobile ? mobileSections.length : slides.length;

  // ── Topic navigation data ──
  // Groups consecutive slides/sections by their `topic` field so the nav can show
  // a compact list of topic names (e.g. "Prakriti Assessment" covers 4 entries).
  // On mobile, we use mobileSections; on desktop, we use slides.
  const topicGroups = useMemo(() => {
    const source = isMobile ? mobileSections : slides;
    const groups = [];
    for (let i = 0; i < source.length; i++) {
      const topic = source[i].topic || 'Unknown';
      const last = groups[groups.length - 1];
      if (last && last.topic === topic) {
        last.slideCount++;
      } else {
        groups.push({ topic, firstSlideIndex: i, slideCount: 1 });
      }
    }
    return groups;
  }, [isMobile ? mobileSections.length : slides.length, reportData, isMobile]);

  // Find which topic group the current slide/section belongs to
  const currentTopic = useMemo(() => {
    for (let i = topicGroups.length - 1; i >= 0; i--) {
      if (currentSlide >= topicGroups[i].firstSlideIndex) {
        return topicGroups[i].topic;
      }
    }
    return topicGroups[0]?.topic || '';
  }, [topicGroups, currentSlide]);

  // Safety clamp: if totalSlides shrinks (e.g. rotating from desktop→mobile),
  // ensure currentSlide doesn't go out of bounds
  useEffect(() => {
    if (totalSlides > 0 && currentSlide >= totalSlides) {
      setCurrentSlide(totalSlides - 1);
    }
  }, [totalSlides]);

  // When the mobile page changes, reset scroll to the top of the new page
  useEffect(() => {
    if (isMobile && mobileScrollRef.current) {
      mobileScrollRef.current.scrollTop = 0;
    }
  }, [currentSlide, isMobile]);

  // Navigation functions
  const goToSlide = (index) => {
    if (isLockedRef.current) return;
    if (index < 0 || index >= totalSlides) return;

    isLockedRef.current = true;
    setSlideDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);

    setTimeout(() => {
      isLockedRef.current = false;
    }, 600);
  };

  const move = (direction) => {
    goToSlide(currentSlide + direction);
  };

  // Wheel handler — disabled on mobile so native scrolling works
  useEffect(() => {
    if (isMobile) return;
    const container = containerRef.current;
    if (!container || totalSlides === 0) return;

    const handleWheel = (e) => {
      e.preventDefault();

      // ALWAYS reset the cooldown timer on every wheel event,
      // even while the animation lock is active. This ensures
      // inertia events during the lock still keep the cooldown alive.
      clearTimeout(wheelCooldownTimer.current);
      wheelCooldownTimer.current = setTimeout(() => {
        isWheelCoolingDown.current = false;
      }, 150);

      // Block if animation is running OR cooldown is active
      if (isLockedRef.current || isWheelCoolingDown.current) return;

      // First wheel event of a new gesture — trigger immediately
      isWheelCoolingDown.current = true;
      const direction = e.deltaY > 0 ? 1 : -1;
      move(direction);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [currentSlide, totalSlides, isMobile]);

  // Touch handlers — disabled on mobile so native scrolling works
  useEffect(() => {
    if (isMobile) return;
    const container = containerRef.current;
    if (!container || totalSlides === 0) return;

    const handleTouchStart = (e) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
      if (isLockedRef.current) return;

      const deltaY = touchStartY.current - e.changedTouches[0].clientY;
      if (Math.abs(deltaY) > 50) {
        const direction = deltaY > 0 ? 1 : -1;
        move(direction);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentSlide, totalSlides, isMobile]);

  // Keyboard handler — disabled on mobile so native scrolling works
  useEffect(() => {
    if (isMobile) return;
    if (totalSlides === 0) return;

    const handleKeyDown = (e) => {
      if (isLockedRef.current) return;

      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        move(1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        move(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, totalSlides, isMobile]);

  // Render loading state
  if (isLoading) {
    return (
      <div ref={containerRef} className="ayurveda-report h-screen w-full overflow-hidden relative">
        <LoadingSlide />
      </div>
    );
  }

  // Render error state
  if (loadError || error) {
    return (
      <div ref={containerRef} className="ayurveda-report h-screen w-full overflow-hidden relative">
        <ErrorSlide message={loadError || error} />
      </div>
    );
  }

  // ── Helper: render a single mobile section by type ──
  const renderMobileSection = (section) => {
    switch (section.type) {
      case 'intro':
        return <IntroSlide active={true} isMobile={true} />;
      case 'prakriti':
        return <PrakritiSlide prakriti={section.data} active={true} isMobile={true} />;
      case 'vikriti':
        return <VikritiSlide vikriti={section.data} active={true} isMobile={true} />;
      case 'dosha-changes':
        return (
          <DoshaChangesSlide
            constitution={section.data.constitution}
            doshaChanges={section.data.doshaChanges}
            active={true}
            isMobile={true}
          />
        );
      case 'health-score':
        return <HealthScoreSlide healthAssessment={section.data} active={true} isMobile={true} />;
      case 'text':
        return (
          <MobileTextSection
            title={section.title}
            subtitle={section.subtitle}
            content={section.content}
          />
        );
      case 'sections':
        return (
          <MobileSectionsSection
            title={section.title}
            subtitle={section.subtitle}
            sections={section.sections}
          />
        );
      default:
        return null;
    }
  };

  // ── Mobile layout (paged — one section per page) ──
  // Each section fills the screen. User scrolls within a section if it's long,
  // and uses Prev/Next buttons to navigate between sections.
  if (isMobile && mobileSections.length > 0) {
    const currentMobileSection = mobileSections[currentSlide] || mobileSections[0];

    return (
      <div
        ref={containerRef}
        className="ayurveda-report h-[100dvh] w-full flex flex-col relative"
        style={{ fontSynthesis: 'style' }}
      >
        {/* Fixed background layer — iOS doesn't support backgroundAttachment:fixed,
            so we use a fixed-position div behind the content instead */}
        <div
          className="fixed inset-0 -z-10"
          style={{
            backgroundImage: `url(${bgImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Topic nav dropdown — fixed at top */}
        <MobileTopicNav
          topicGroups={topicGroups}
          currentTopic={currentTopic}
          isOpen={mobileNavOpen}
          onToggle={() => setMobileNavOpen(prev => !prev)}
          onNavigate={(idx) => { goToSlide(idx); setMobileNavOpen(false); }}
        />

        {/* Scrollable content area — shows only the current section */}
        <div
          ref={mobileScrollRef}
          className="flex-1 overflow-y-auto pt-[45px] flex flex-col"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMobileSection.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="min-h-full grow"
            >
              {renderMobileSection(currentMobileSection)}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom navigation bar — Prev / page counter / Next */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{
            backgroundColor: 'rgba(36, 48, 38, 0.25)',
            backdropFilter: 'blur(8px)',
            borderTop: '1px solid rgb(116,198,157,0.1)',
          }}
        >
          <button
            onClick={() => move(-1)}
            disabled={currentSlide === 0}
            className="flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium transition-opacity"
            style={{
              color: COLORS.primary,
              opacity: currentSlide === 0 ? 0.35 : 1,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Prev
          </button>

          <span className="text-sm font-medium" style={{ color: COLORS.primary }}>
            {currentSlide + 1} / {totalSlides}
          </span>

          <button
            onClick={() => move(1)}
            disabled={currentSlide === totalSlides - 1}
            className="flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium transition-opacity"
            style={{
              color: COLORS.primary,
              opacity: currentSlide === totalSlides - 1 ? 0.35 : 1,
            }}
          >
            Next
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Render main report (desktop — PPT slide mode)
  return (
    <div
      ref={containerRef}
      className="ayurveda-report h-screen w-full overflow-hidden relative"
      style={{ fontSynthesis: 'style' }}
    >
      {/* Slides */}
      <AnimatePresence initial={false} custom={slideDirection}>
        {slides.map((slide, idx) => (
          <Slide
            key={slide.id}
            slideKey={slide.id}
            active={idx === currentSlide}
            direction={slideDirection}
          >
            {slide.render(idx === currentSlide)}
          </Slide>
        ))}
      </AnimatePresence>

      {/* Mobile topic nav — visible only below 650px */}
      {totalSlides > 0 && (
        <MobileTopicNav
          topicGroups={topicGroups}
          currentTopic={currentTopic}
          isOpen={mobileNavOpen}
          onToggle={() => setMobileNavOpen(prev => !prev)}
          onNavigate={(idx) => { goToSlide(idx); setMobileNavOpen(false); }}
        />
      )}

      {/* Progress dots — hidden on mobile, visible at 650px+ */}
      {totalSlides > 0 && (
        <motion.div
          className="hidden tab:block"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <ProgressDots
            current={currentSlide}
            total={totalSlides}
            onNavigate={goToSlide}
          />
        </motion.div>
      )}

      {/* Slide counter */}
      {totalSlides > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="hidden tab:flex fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium"
          style={{
            backgroundColor: 'rgba(36, 48, 38, 0.15)',
            backdropFilter: 'blur(8px)',
            color: COLORS.primary
          }}
        >
          <motion.span
            key={currentSlide}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {currentSlide + 1}
          </motion.span>
          {' / '}
          {totalSlides}
        </motion.div>
      )}

      {/* Mobile navigation buttons - visible only below 650px */}
      {totalSlides > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 tab:hidden"
          style={{
            backgroundColor: 'rgba(36, 48, 38, 0.1)',
            backdropFilter: 'blur(8px)',
            borderTop: '1px solid rgb(116,198,157,0.1)',
          }}
        >
          <button
            onClick={() => move(-1)}
            disabled={currentSlide === 0}
            className="flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium transition-opacity"
            style={{
              color: COLORS.primary,
              opacity: currentSlide === 0 ? 0.35 : 1,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Prev
          </button>

          <span className="text-sm font-medium" style={{ color: COLORS.primary }}>
            {currentSlide + 1} / {totalSlides}
          </span>

          <button
            onClick={() => move(1)}
            disabled={currentSlide === totalSlides - 1}
            className="flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium transition-opacity"
            style={{
              color: COLORS.primary,
              opacity: currentSlide === totalSlides - 1 ? 0.35 : 1,
            }}
          >
            Next
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default AyurvedaReport;
