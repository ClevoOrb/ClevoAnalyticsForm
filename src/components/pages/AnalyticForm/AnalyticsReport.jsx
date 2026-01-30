/**
 * AnalyticsReport.jsx
 *
 * PPT-style health report - scroll to navigate between slides.
 * Clean white theme with orange accent.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAnalyticResponses from '../../../hooks/useAnalyticResponses';
import useAnalyticForms from '../../../hooks/useAnalyticForms';
import { applyTheme } from '../../common/ThemeSelector';
import { applyThemeMethod } from '../../common/ThemeMethodSelector';

// Animation variants for slides
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

// Stagger children animation
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
// COLORS - Clean white theme with orange accent
// ============================================
const COLORS = {
  bg: '#FFFFFF',
  bgLight: '#F8F9FA',
  accent: '#F5A623',
  accentDark: '#E8891E',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  squiggle: 'rgba(245, 200, 150, 0.6)',
  cardBg: '#F5F5F5',
};

// ============================================
// REPORT THEMES - Color variations for slides
// ============================================
const REPORT_THEMES = {
  teal: {
    name: 'Teal',
    coverGradient: ['#2b00ff', '#000000'],
    primary: '#3cc2d8',
    primaryDark: '#22626d',
    secondary: '#7affe6',
    secondaryMid: '#3a8b7e',
    accent: '#a5f7ff',
    darkBg: '#0a0f0f',
    baseDark: '#131416',
  },
  blue: {
    name: 'Blue',
    coverGradient: ['#3b82f6', '#000000'],
    primary: '#3b82f6',
    primaryDark: '#1e40af',
    secondary: '#93c5fd',
    secondaryMid: '#2563eb',
    accent: '#bfdbfe',
    darkBg: '#0a0f1a',
    baseDark: '#131620',
  },
  purple: {
    name: 'Purple',
    coverGradient: ['#8b5cf6', '#000000'],
    primary: '#8b5cf6',
    primaryDark: '#5b21b6',
    secondary: '#c4b5fd',
    secondaryMid: '#7c3aed',
    accent: '#ddd6fe',
    darkBg: '#0f0a1a',
    baseDark: '#1a1625',
  },
  green: {
    name: 'Green',
    coverGradient: ['#10b981', '#000000'],
    primary: '#10b981',
    primaryDark: '#047857',
    secondary: '#6ee7b7',
    secondaryMid: '#059669',
    accent: '#a7f3d0',
    darkBg: '#0a0f0d',
    baseDark: '#131816',
  },
  orange: {
    name: 'Orange',
    coverGradient: ['#f97316', '#000000'],
    primary: '#f97316',
    primaryDark: '#c2410c',
    secondary: '#fdba74',
    secondaryMid: '#ea580c',
    accent: '#fed7aa',
    darkBg: '#0f0d0a',
    baseDark: '#1a1613',
  },
};

// Default theme
const DEFAULT_THEME = REPORT_THEMES.teal;

// ============================================
// UTILITY
// ============================================
const getScoreColor = (score) => {
  if (score <= 3) return '#ef4444';
  if (score <= 5) return '#f59e0b';
  if (score <= 7) return '#3b82f6';
  return '#08B7F6';
};

const getScoreLabel = (score) => {
  if (score <= 3) return 'Needs Attention';
  if (score <= 5) return 'Room to Grow';
  if (score <= 7) return 'Good Progress';
  if (score <= 8.5) return 'Great Shape';
  return 'Excellent';
};

// ============================================
// ANIMATED NUMBER
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
// DOUGHNUT CHART
// ============================================
const DoughnutChart = ({ score, size = 200, active = true, darkMode = false, theme = DEFAULT_THEME }) => {
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    if (active) {
      const timer = setTimeout(() => setIsAnimated(true), 300);
      return () => clearTimeout(timer);
    } else {
      setIsAnimated(false);
    }
  }, [active]);

  const percentage = (score / 10) * 100;
  const strokeWidth = 68; // Same ring thickness for both modes
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const scoreLength = (percentage / 100) * circumference;

  // Unique ID for gradient to avoid conflicts
  const gradientId = `scoreGradient-${size}`;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full transform -rotate-90">
        {/* Gradient definition for progress */}
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={darkMode ? theme.primary : '#2b00ff'} />
            <stop offset="50%" stopColor={darkMode ? theme.primaryDark : '#6366f1'} />
            <stop offset="100%" stopColor={darkMode ? theme.primary : '#2b00ff'} />
          </linearGradient>
        </defs>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={darkMode ? theme.darkBg : "rgba(43,0,255,0.1)"}
          strokeWidth={strokeWidth}
        />
        {/* Progress ring - Gradient */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={`${isAnimated ? scoreLength : 0} ${circumference}`}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-6xl font-bold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
          <AnimatedNumber value={score} active={active} />
        </span>
        <span className={`text-lg ${darkMode ? 'text-white/60' : 'text-[#999999]'}`}>/10</span>
      </div>
    </div>
  );
};

// ============================================
// PROGRESS BAR
// ============================================
const ProgressBar = ({ value, max = 10, label = '', active = true }) => {
  const [width, setWidth] = useState(0);
  const percentage = (value / max) * 100;

  useEffect(() => {
    if (active) {
      const timer = setTimeout(() => setWidth(percentage), 100);
      return () => clearTimeout(timer);
    } else {
      setWidth(0);
    }
  }, [percentage, active]);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-white font-medium">{label}</span>
        <span className="text-white text-sm font-bold">{value.toFixed(1)}</span>
      </div>
      <div className="w-full h-3 bg-[#2D3137] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#08B7F6] rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
};

// ============================================
// SHARED COMPONENTS
// ============================================

// Header bar for all slides
const SlideHeader = ({ isDarkMode }) => (
  <div className="absolute top-0 left-0 right-0 px-6 md:px-12 py-6 flex justify-between items-center z-10">
    <div className="flex items-center gap-2">
      <img src="/assets/Logo1.svg" alt="Orbuculum" className="h-8 w-auto object-contain" />
    </div>
    <span className={`text-sm hidden sm:block ${isDarkMode ? 'text-[#fdfcfc]' : 'text-[#1A1A1A]'}`}>Analysis Report</span>
  </div>
);

// Theme toggle button component
const ThemeToggle = ({ isDarkMode, onToggle }) => (
  <button
    onClick={onToggle}
    className={`fixed top-6 right-16 sm:right-20 z-50 p-2.5 rounded-full backdrop-blur transition-all hover:scale-110 ${
      isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/10 hover:bg-black/20'
    }`}
    aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
  >
    {isDarkMode ? (
      // Sun icon - shown in dark mode, click to go light
      <svg className="w-5 h-5 text-yellow-300" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
      </svg>
    ) : (
      // Moon icon - shown in light mode, click to go dark
      <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
      </svg>
    )}
  </button>
);

// 4-pointed star SVG
const StarIcon = ({ size = 24, color = "#1A1A1A", className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width={size} height={size} className={className}>
    <path d="M372.7 186.3 320 160l-26.3-52.7a60 60 0 0 0-107.4 0L160 160l-52.7 26.3a60 60 0 0 0 0 107.4L160 320l26.3 52.7a60 60 0 0 0 107.4 0L320 320l52.7-26.3a60 60 0 0 0 0-107.4Z" fill={color} />
  </svg>
);

// 8-pointed starburst SVG
const StarburstIcon = ({ size = 40, color = "#F5A623", className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width={size} height={size} className={className}>
    <path d="m320.5 199.7 38.1-19L400 160v-.4A79.6 79.6 0 0 0 321 80h-1l-19.6 39.2-20.1 40.3a30 30 0 0 0 40.2 40.3ZM159.5 199.7a30 30 0 0 0 40.2-40.2l-16.3-32.6L160 80h-1a79.7 79.7 0 0 0-79 79.6v.4l41 20.5 38.5 19.2ZM320.5 280.3a30 30 0 0 0-40.2 40.2l16.3 32.6L320 400h1.1a80 80 0 0 0 78.9-78.8V320l-43-21.5-36.5-18.2ZM159.5 280.3l-32.6 16.3L80 320v1.2A80 80 0 0 0 159 400h1.1l20.4-40.8 19.3-38.7a30 30 0 0 0-40.2-40.2ZM410.2 184l-.5-.6-47.1 15.8-37.2 12.3a30 30 0 0 0 0 57l43.7 14.5 40.6 13.6.5-.5a79.8 79.8 0 0 0 0-112.2ZM268.5 154.6l16.1-48.4 12-35.9-.5-.5a79.7 79.7 0 0 0-112.7.5l16.9 50.5 11.2 33.8a30 30 0 0 0 57 0ZM211.5 325.4 198.7 364l-15.3 45.8.5.5a79.8 79.8 0 0 0 112.2 0l.5-.5-16.9-50.4-11.2-33.9a30 30 0 0 0-57 0ZM154.6 211.5 115 198.4l-44.8-15-.5.5a79.8 79.8 0 0 0 0 112.2l.5.5 44.6-14.9 39.7-13.2a30 30 0 0 0 0-57Z" fill={color} />
  </svg>
);

// Orange circle icon wrapper
const OrangeIcon = ({ children, size = 48 }) => (
  <div
    className="rounded-full flex items-center justify-center"
    style={{ width: size, height: size, backgroundColor: COLORS.accent }}
  >
    {children}
  </div>
);

// Squiggle decoration using bend-squiggle.svg with gradient
const SquiggleDecor = ({ position = "right", className = "" }) => (
  <svg
    viewBox="0 0 6937 4458"
    className={`absolute pointer-events-none ${className}`}
    preserveAspectRatio="xMidYMid slice"
    style={{
      ...(position === "right" ? { right: '-10%', top: '50%', transform: 'translateY(-50%)', height: '120%', width: 'auto', opacity: 0.7 } : {}),
      ...(position === "left" ? { left: '-10%', top: '50%', transform: 'translateY(-50%) scaleX(-1)', height: '120%', width: 'auto', opacity: 0.7 } : {}),
      ...(position === "bottom" ? { bottom: '-20%', left: '50%', transform: 'translateX(-50%) rotate(90deg)', width: '100%', height: 'auto', opacity: 0.7 } : {}),
    }}
  >
    <defs>
      <linearGradient id="squiggleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F5A623" stopOpacity="0.8" />
        <stop offset="50%" stopColor="#E8891E" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#FFD699" stopOpacity="0.4" />
      </linearGradient>
    </defs>
    <path
      d="M41.0652 1288.86C732.065 640.189 2264.44 -434.06 3014.07 315.856C4286.57 1588.86 2568.57 3415.86 2032.07 2761.36C1495.57 2106.86 2441.07 1206.86 3014.07 1034.36C3587.07 861.855 3832.07 925.355 4186.57 1034.36C4541.07 1143.36 5142.37 1383 5341.07 2424.86C5618.46 3879.4 4750.07 4734.35 3932.07 4270.35C3114.07 3806.36 2877.07 2443.86 4704.57 2479.86C6166.57 2508.66 6762.4 3685.52 6877.57 4270.35"
      stroke="url(#squiggleGradient)"
      strokeWidth="120"
      fill="none"
    />
  </svg>
);

// ============================================
// SLIDE WRAPPER - Full screen slide with white bg
// ============================================
const Slide = ({ children, active, noPadding = false, slideKey, direction = 1, isDarkMode = true }) => (
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
      absolute inset-0 bg-white overflow-hidden
      ${!active ? 'pointer-events-none' : ''}
    `}
  >
    <SlideHeader isDarkMode={isDarkMode} />
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
// SLIDE CONTENTS
// ============================================

// Slide 0: Cover Page (Annual Report Style)
// Note: Cover slide keeps gradient background in both modes (branded element)
const CoverSlide = ({ theme, isDarkMode }) => (
  <div
    className="relative w-full h-full min-h-[100vh] overflow-hidden flex flex-col"
    style={{ background: `linear-gradient(to top, ${theme.coverGradient[0]} 0%, ${theme.coverGradient[1]} 100%)` }}
  >

    <div className='w-full h-full flex flex-col items-center justify-center relative z-10'>
      <div className='w-full flex flex-col items-center'>
        <div className='text-[#fefefe] text-3xl sm:text-5xl md:text-7xl font-inter font-[200]'> Welcome to</div>

        <div className='text-[#fefefe] text-4xl sm:text-6xl md:text-[7rem] font-manrope font-[500] text-center px-4'>
          Analysis Report
        </div>
      </div>
    </div>

    {/* Scroll hint */}
    <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm font-manrope animate-bounce z-10">
      Scroll to continue ↓
    </p>
  </div>
);

// Slide 1: Content Index (like Image 1)
const ContentIndexSlide = ({ sections, theme, isDarkMode }) => (
  <div
    className="relative h-full overflow-hidden"
    style={{ background: isDarkMode ? theme.darkBg : 'linear-gradient(135deg, #f8faff 0%, #e0e7ff 100%)' }}
  >
    {/* Circle - different colors for dark/light modes */}
    <div
      className="h-[110%] aspect-square rounded-full absolute top-4"
      style={{ background: isDarkMode
        ? `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark}, ${theme.baseDark}, ${theme.baseDark})`
        : 'linear-gradient(135deg, #2a00f9, #6366f1, #e0e7ff, #e0e7ff)'
      }}
    />

    {/* Content - positioned like the image */}
    <div className="absolute inset-0 flex items-center">
      <div className="flex flex-col items-start px-6 sm:px-0 sm:ml-[8%] md:ml-[12%] lg:ml-[15%]">
        {/* Number + Title + Paragraph row */}
        <div className="flex items-start">
          <div className={`leading-none -mt-[0.1em] font-inter font-bold text-[4rem] sm:text-[7rem] md:text-[10rem] mr-4 sm:mr-6 md:mr-10 ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
            01
          </div>
          <div className="max-w-xl">
            <h1 className={`font-inter font-bold text-2xl sm:text-3xl md:text-5xl leading-tight ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
              {sections?.[0]?.section_name || 'Health'}
            </h1>
            <h2 className={`font-manrope font-medium text-xl sm:text-2xl md:text-4xl mt-1 ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
              Assessment
            </h2>
            <p className={` font-montserrat font-[500] text-base md:text-lg leading-relaxed mt-6 ${isDarkMode ? 'text-white/80' : 'text-[#1A1A1A]/80'}`}>
              This comprehensive report analyzes your responses across {sections?.length || 0} key
              health dimensions. Each section provides detailed insights into different aspects
              of your wellbeing, helping you understand your current health status and identify
              areas for improvement. The assessment covers{' '}
              {sections?.slice(0, 3).map(s => s.section_name).join(', ') || 'various health metrics'}
              {sections?.length > 3 ? ` and ${sections.length - 3} more sections` : ''}.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Slide 2: Hero Score (matching ContentIndexSlide structure)
const HeroSlide = ({ score, formName, active, theme, isDarkMode }) => (
  <div
    className="relative h-full overflow-hidden"
    style={{ background: isDarkMode ? theme.darkBg : 'linear-gradient(135deg, #f8faff 0%, #e0e7ff 100%)' }}
  >

    {/* Content - positioned like ContentIndexSlide */}
    <div className="absolute inset-0 flex items-center">
      <div className="flex flex-col items-start px-6 sm:px-0 sm:ml-[8%] md:ml-[12%] lg:ml-[15%]">
        {/* Number + Title + Content row */}
        <div className="flex items-start">
          <div className={`-mt-[0.1em] font-inter font-bold text-[4rem] sm:text-[7rem] md:text-[10rem] leading-none mr-4 sm:mr-6 md:mr-10 ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
            02
          </div>
          <div className="max-w-md lg:max-w-xl">
            <h1 className={`font-inter font-bold text-2xl sm:text-3xl md:text-5xl leading-tight ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
              Health
            </h1>
            <h2 className={`font-manrope font-medium text-xl sm:text-2xl md:text-4xl mt-1 ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
              Assessment
            </h2>
            <p className={`font-montserrat font-[500] text-base md:text-lg leading-relaxed mt-4 sm:mt-6 max-w-sm md:max-w-md ${isDarkMode ? 'text-white/80' : 'text-[#1A1A1A]/80'}`}>
              Your comprehensive health assessment results. This report analyzes your responses
              across multiple health dimensions to provide actionable insights for your wellbeing.
            </p>

            {/* Score badge and status - responsive */}
            <div className="flex flex-wrap items-center gap-3 mt-4 sm:mt-6">
              <div
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full"
                style={{ backgroundColor: isDarkMode ? `${theme.primary}33` : 'rgba(59, 130, 246, 0.2)' }}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isDarkMode ? theme.primary : '#3b82f6' }} />
                <span className="font-medium text-sm sm:text-base" style={{ color: isDarkMode ? theme.primary : '#3b82f6' }}>{getScoreLabel(score)}</span>
              </div>
              <div className={`text-sm sm:text-base font-medium ${isDarkMode ? 'text-white/60' : 'text-[#1A1A1A]/60'}`}>
                Score: <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>{score.toFixed(1)}</span>/10
              </div>
            </div>

            {/* Form name */}
            <div className={`mt-4 sm:mt-6 pt-4 sm:pt-6 border-t ${isDarkMode ? 'border-white/20' : 'border-[#1A1A1A]/20'}`}>
              <p className={`font-semibold text-sm sm:text-base font-montserrat ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>{formName}</p>
              <p className={`text-sm sm:text-base font-montserrat ${isDarkMode ? 'text-white/50' : 'text-[#1A1A1A]/50'}`}>Health Assessment Form</p>
            </div>
          </div>
        </div>
      </div>
      {/* Score Ring - positioned on right side */}
      <div className="hidden md:flex items-center px-6 justify-center">
        <DoughnutChart score={score} size={300} active={active} darkMode={isDarkMode} theme={theme} />
      </div>
    </div>
  </div>
);

// Slide 3: Stats (with overlapping circles background)
const StatsSlide = ({ stats, sectionsRated, totalSections, active, theme, isDarkMode }) => {
  const items = [
    { value: stats?.rated_questions || 0, label: 'Questions Analyzed' },
    { value: sectionsRated || 0, label: 'Sections Completed' },
    { value: totalSections || 0, label: 'Total Sections' },
  ];
  const coverage = stats?.rating_coverage || '100%';

  return (
    <div className="relative h-full overflow-hidden" style={{ background: isDarkMode ? theme.darkBg : 'linear-gradient(135deg, #f8faff 0%, #e0e7ff 100%)' }}>
      {/* Outer circle - larger, behind */}
      <div
        className="absolute rounded-full pointer-events-none h-[150%] aspect-square right-[-10%] top-[60%] transform -translate-y-1/2"
        style={{ background: isDarkMode
          ? `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark}, ${theme.baseDark}, ${theme.baseDark})`
          : 'linear-gradient(135deg, #e0e7ff, #93a0fa, #2b00ff, #6366f1)'
        }}
      >
        {/* Inner circle - concentric (centered within outer) */}
        <div
          className="absolute rounded-full pointer-events-none h-[70%] aspect-square left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
          style={{ background: isDarkMode
            ? `linear-gradient(135deg, ${theme.secondary}, ${theme.secondaryMid}, ${theme.baseDark}, ${theme.baseDark})`
            : 'linear-gradient(135deg, #818cf8, #a5b4fc, #e0e7ff, #e0e7ff)'
          }}
        />
      </div>


      {/* Content */}
      <div className="absolute inset-0 flex items-center">
        <div className="flex flex-col items-start px-6 sm:px-0 sm:ml-[8%] md:ml-[12%] lg:ml-[15%]">
          {/* Number + Title + Content row */}
          <div className="flex items-start">
            <div className={`font-inter font-bold text-[4rem] sm:text-[7rem] md:text-[10rem] leading-none -mt-[0.1em] mr-4 sm:mr-6 md:mr-10 ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
              03
            </div>
            <div className="max-w-md lg:max-w-xl">
              <h1 className={`font-inter font-bold text-2xl sm:text-3xl md:text-5xl leading-tight ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
                Assessment
              </h1>
              <h2 className={`font-manrope font-medium text-xl sm:text-2xl md:text-4xl mt-1 ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
                Overview
              </h2>
              <p className={`font-montserrat font-[500] text-base md:text-lg leading-relaxed mt-4 sm:mt-6 max-w-sm md:max-w-md ${isDarkMode ? 'text-white/70' : 'text-[#1A1A1A]/70'}`}>
                Summary of your health assessment metrics, showing the scope and coverage of your evaluation across all sections.
              </p>

              {/* Stats row */}
              <div className="flex flex-wrap gap-4 sm:gap-6 mt-6 sm:mt-8">
                {items.map((item, idx) => (
                  <div key={idx} className="flex flex-col">
                    <div className={`text-2xl sm:text-3xl md:text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-black font-[500]'}`}>
                      {typeof item.value === 'number' ? (
                        <AnimatedNumber value={item.value} decimals={0} active={active} />
                      ) : item.value}
                    </div>
                    <div className={`text-base sm:text-lg mt-1 ${isDarkMode ? 'text-white/50' : 'text-black'}`}>{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Coverage bar */}
              <div className="mt-6 sm:mt-8">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm sm:text-base ${isDarkMode ? 'text-white/60' : 'text-[#1A1A1A]/60'}`}>Completion Rate</span>
                  <span className={`font-bold text-sm sm:text-base ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>{coverage}</span>
                </div>
                <div className={`w-full max-w-xs h-2 sm:h-3 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-[rgba(43,0,255,0.1)]'}`}>
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: active ? coverage : '0%',
                      background: isDarkMode
                        ? `linear-gradient(90deg, ${theme.primary}, ${theme.baseDark})`
                        : 'linear-gradient(90deg,#6366f1, #2b00ff )'
                    }}
                  />
                </div>
              </div>

              {/* Ratio badge */}
              <div className="mt-4 sm:mt-6 inline-flex items-center gap-3 px-4 py-2 rounded-full" style={{ backgroundColor: isDarkMode ? `${theme.primary}33` : 'rgba(43,0,255,0.15)' }}>
                <span className={`text-sm sm:text-base ${isDarkMode ? 'text-white/60' : 'text-[#1A1A1A]/60'}`}>Sections Ratio</span>
                <span className={`font-bold text-sm sm:text-base ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>{sectionsRated} : {totalSections}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Slide 4: Breakdown (with overlapping circles background)
const BreakdownSlide = ({ sections, active, theme, isDarkMode }) => (
  <div className="relative h-full overflow-hidden" style={{ background: isDarkMode ? theme.darkBg : 'linear-gradient(135deg, #f8faff 0%, #e0e7ff 100%)' }}>

   <div className='relative h-full w-full flex items-center justify-center'>
      {/* Circle 1 - larger, positioned left-center */}
      <div
        className="absolute rounded-full pointer-events-none aspect-square h-[70%]"
        style={{ background: isDarkMode
          ? `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark}, ${theme.baseDark}, ${theme.baseDark})`
          : 'linear-gradient(135deg, #2b00ff, #6366f1, #e0e7ff, #e0e7ff)'
        }}
      />

      {/* Circle 2 - smaller, positioned right-bottom, overlapping */}
      <div
        className="absolute rounded-full pointer-events-none aspect-square h-[50%] tab:right-[20%] mac:bottom-[20%] top-[30%] mac:right-[20%] right-[60%]"
        style={{ background: isDarkMode
          ? `linear-gradient(135deg, ${theme.secondary}, ${theme.secondaryMid}, ${theme.baseDark}, ${theme.baseDark})`
          : 'linear-gradient(135deg, #818cf8, #a5b4fc, #e0e7ff, #e0e7ff)'
        }}
      />
    </div>

    {/* Content */}
    <div className="absolute inset-0 flex items-center">
      <div className="flex flex-col items-start px-6 sm:px-0 sm:ml-[8%] md:ml-[12%] lg:ml-[15%]">
        {/* Number + Title + Content row */}
        <div className="flex items-start">
          <div className={`font-inter font-bold text-[4rem] sm:text-[7rem] md:text-[10rem] leading-none -mt-[0.1em] mr-4 sm:mr-6 md:mr-10 ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
            04
          </div>
          <div className="max-w-md lg:max-w-xl">
            <h1 className={`font-inter font-bold text-2xl sm:text-3xl md:text-5xl leading-tight ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
              Section
            </h1>
            <h2 className={`font-manrope font-medium text-xl sm:text-2xl md:text-4xl mt-1 ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
              Breakdown
            </h2>
            <p className={`font-montserrat font-[500] text-base md:text-lg leading-relaxed mt-4 sm:mt-6 max-w-sm md:max-w-md ${isDarkMode ? 'text-white/70' : 'text-[#1A1A1A]/70'}`}>
              Performance across each section of your health assessment, showing your scores and areas of strength.
            </p>

            {/* Section scores */}
            <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
              {sections?.map((section, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className={`text-sm sm:text-base font-medium ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>{section.section_name}</span>
                    <span className={`text-sm sm:text-base font-bold ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>{section.section_score.toFixed(1)}/10</span>
                  </div>
                  <div className={`w-full max-w-xs h-2 sm:h-3 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-[rgba(43,0,255,0.1)]'}`}>
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: active ? `${(section.section_score / 10) * 100}%` : '0%',
                        background: isDarkMode
                          ? (section.section_score >= 7
                              ? `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`
                              : section.section_score >= 5
                                ? `linear-gradient(90deg, ${theme.primaryDark}, ${theme.primary})`
                                : `linear-gradient(90deg, ${theme.baseDark}, ${theme.primaryDark})`)
                          : (section.section_score >= 7
                              ? 'linear-gradient(90deg, #2b00ff, #6366f1)'
                              : section.section_score >= 5
                                ? 'linear-gradient(90deg, #6366f1, #818cf8)'
                                : 'linear-gradient(90deg, #818cf8, #a5b4fc)')
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Slide 5: Summary
const SummarySlide = ({ overview, theme, isDarkMode }) => (
  <div className="relative h-full overflow-hidden" style={{ background: isDarkMode ? theme.darkBg : 'linear-gradient(135deg, #f8faff 0%, #e0e7ff 100%)' }}>
    {/* Centered container for content + pills */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex flex-col sm:flex-row items-center gap-8 md:gap-12 lg:gap-16 px-6">
        {/* Content section */}
        <div className="flex items-start">
          <div className={`font-inter font-bold text-[4rem] sm:text-[7rem] md:text-[10rem] leading-none -mt-[0.1em] mr-4 sm:mr-6 md:mr-10 ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
            05
          </div>
          <div className="max-w-md lg:max-w-xl">
            <h1 className={`font-inter font-bold text-2xl sm:text-3xl md:text-5xl leading-tight ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
              Comprehensive
            </h1>
            <h2 className={`font-manrope font-medium text-xl sm:text-2xl md:text-4xl mt-1 ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
              Summary
            </h2>
            <p className={`font-montserrat font-[500] text-base md:text-lg leading-relaxed mt-4 sm:mt-6 max-w-sm md:max-w-md ${isDarkMode ? 'text-white/70' : 'text-[#1A1A1A]/70'}`}>
              An overview of your complete health assessment, highlighting key findings and overall health status.
            </p>

            {/* Overview text box */}
            <div className={`mt-6 sm:mt-8 p-4 sm:p-6 rounded-2xl max-w-sm md:max-w-md ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-[#1A1A1A]/5 border border-[#1A1A1A]/10'}`}>
              <p className={`text-sm sm:text-base leading-relaxed line-clamp-6 ${isDarkMode ? 'text-white/80' : 'text-[#1A1A1A]/80'}`}>
                {overview}
              </p>
            </div>
          </div>
        </div>

        {/* Decorative pills - hidden on mobile */}
        <div className="hidden sm:flex h-[50vh] md:h-[60vh] gap-x-4 md:gap-x-6">
          <div
            className="w-20 md:w-28 lg:w-32 rounded-full relative flex items-start justify-center overflow-hidden"
            style={{ background: isDarkMode
              ? `linear-gradient(to top, ${theme.accent} 0%, ${theme.secondaryMid} 15%, black 70%)`
              : 'linear-gradient(to bottom, #c7d2fe 0%, #818cf8 15%, #2b00ff 70%)'
            }}
          >
            <div className="w-full aspect-square rounded-full" style={{ backgroundColor: isDarkMode ? theme.accent : '#c7d2fe' }} />
          </div>
          <div
            className="w-20 md:w-28 lg:w-32 rounded-full relative flex items-end justify-center overflow-hidden"
            style={{ background: isDarkMode
              ? `linear-gradient(to bottom, ${theme.accent} 0%, ${theme.secondaryMid} 15%, black 70%)`
              : 'linear-gradient(to top, #c7d2fe 0%, #818cf8 15%, #2b00ff 70%)'
            }}
          >
            <div className="w-full aspect-square rounded-full" style={{ backgroundColor: isDarkMode ? theme.accent : '#c7d2fe' }} />
          </div>
          <div
            className="w-20 md:w-28 lg:w-32 rounded-full relative flex items-start justify-center overflow-hidden"
            style={{ background: isDarkMode
              ? `linear-gradient(to top, ${theme.accent} 0%, ${theme.secondaryMid} 15%, black 70%)`
              : 'linear-gradient(to bottom, #c7d2fe 0%, #818cf8 15%, #2b00ff 70%)'
            }}
          >
            <div className="w-full aspect-square rounded-full" style={{ backgroundColor: isDarkMode ? theme.accent : '#c7d2fe' }} />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Slide 06: Key Insights (Dark + overlapping circles background)
const KeyInsightsSlide = ({ insights, theme, isDarkMode }) => (
  <div className="relative h-full overflow-hidden" style={{ background: isDarkMode ? theme.darkBg : 'linear-gradient(135deg, #f8faff 0%, #e0e7ff 100%)' }}>

    <div className='relative h-full w-full flex items-center justify-center'>
      {/* Circle 1 - larger, positioned left-center */}
      <div
        className="absolute rounded-full pointer-events-none aspect-square h-[70%]"
        style={{ background: isDarkMode
          ? `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark}, ${theme.baseDark}, ${theme.baseDark})`
          : 'linear-gradient(135deg, #2b00ff, #6366f1, #e0e7ff, #e0e7ff)'
        }}
      />

      {/* Circle 2 - smaller, positioned right-bottom, overlapping */}
      <div
        className="absolute rounded-full pointer-events-none aspect-square h-[50%] tab:right-[20%] mac:bottom-[20%] top-[30%] mac:right-[20%] right-[60%]"
        style={{ background: isDarkMode
          ? `linear-gradient(135deg, ${theme.secondary}, ${theme.secondaryMid}, ${theme.baseDark}, ${theme.baseDark})`
          : 'linear-gradient(135deg, #818cf8, #a5b4fc, #e0e7ff, #e0e7ff)'
        }}
      />
    </div>

    {/* Content */}
    <div className="absolute inset-0 flex items-center">
      <div className="flex flex-col items-start px-6 sm:px-0 sm:ml-[8%] md:ml-[12%] lg:ml-[15%]">
        {/* Number + Title + Content row */}
        <div className="flex items-start">
          <div className={`font-inter font-bold text-[4rem] sm:text-[7rem] md:text-[10rem] leading-none -mt-[0.1em] mr-4 sm:mr-6 md:mr-10 ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
            06
          </div>
          <div className="max-w-md lg:max-w-xl">
            <h1 className={`font-inter font-bold text-2xl sm:text-3xl md:text-5xl leading-tight ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
              Key
            </h1>
            <h2 className={`font-manrope font-medium text-xl sm:text-2xl md:text-4xl mac:mt-1 ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
              Insights
            </h2>
            <p className={`font-montserrat font-[500] text-base md:text-lg leading-relaxed mt-4 sm:mt-6 max-w-sm md:max-w-md ${isDarkMode ? 'text-white/70' : 'text-[#1A1A1A]/70'}`}>
              Important findings from your health assessment analysis.
            </p>

            {/* Insights list */}
            <div className="mt-6 sm:mt-8 space-y-3 max-h-[40vh] overflow-y-auto pr-2">
              {insights?.slice(0, 4).map((insight, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 sm:p-4 rounded-xl ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-[#1A1A1A]/5 border border-[#1A1A1A]/10'}`}
                >
                  <div
                    className="w-8 h-8 mt-1 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isDarkMode
                        ? (idx === 0 ? `linear-gradient(135deg, ${theme.accent}, ${theme.secondaryMid})` : `${theme.accent}33`)
                        : (idx === 0 ? 'linear-gradient(135deg, #1A1A1A, #3a3a3a)' : 'rgba(26, 26, 26, 0.2)')
                    }}
                  >
                    <span className="text-white font-bold text-sm font-montserrat">{idx + 1}</span>
                  </div>
                  <p className={`font-montserrat font-[500] text-base md:text-lg leading-relaxed ${isDarkMode ? 'text-white/80' : 'text-[#1A1A1A]/80'}`}>{insight}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Slide 07: Priority Actions (Dark + cyan pills background)
const PriorityActionsSlide = ({ actions, theme, isDarkMode }) => (
  <div className="relative h-full overflow-hidden" style={{ background: isDarkMode ? theme.darkBg : 'linear-gradient(135deg, #f8faff 0%, #e0e7ff 100%)' }}>
    {/* Decorative pills - aligned to right side, hidden on mobile */}
    <div className="hidden sm:flex absolute right-[5%] md:right-[10%] top-1/2 -translate-y-1/2 h-[50%] md:h-[60%] gap-x-4 md:gap-x-6">
      <div
        className="w-20 md:w-28 lg:w-32 rounded-full relative flex items-start justify-center overflow-hidden"
        style={{ background: isDarkMode
          ? `linear-gradient(to top, ${theme.accent} 0%, ${theme.secondaryMid} 15%, black 70%)`
          : 'linear-gradient(to bottom, #c7d2fe 0%, #818cf8 15%, #2b00ff 70%)'
        }}
      >
        <div className="w-full aspect-square rounded-full" style={{ backgroundColor: isDarkMode ? theme.accent : '#c7d2fe' }} />
      </div>
      <div
        className="w-20 md:w-28 lg:w-32 rounded-full relative flex items-end justify-center overflow-hidden"
        style={{ background: isDarkMode
          ? `linear-gradient(to bottom, ${theme.accent} 0%, ${theme.secondaryMid} 15%, black 70%)`
          : 'linear-gradient(to top, #c7d2fe 0%, #818cf8 15%, #2b00ff 70%)'
        }}
      >
        <div className="w-full aspect-square rounded-full" style={{ backgroundColor: isDarkMode ? theme.accent : '#c7d2fe' }} />
      </div>
      <div
        className="w-20 md:w-28 lg:w-32 rounded-full relative flex items-start justify-center overflow-hidden"
        style={{ background: isDarkMode
          ? `linear-gradient(to top, ${theme.accent} 0%, ${theme.secondaryMid} 15%, black 70%)`
          : 'linear-gradient(to bottom, #c7d2fe 0%, #818cf8 15%, #2b00ff 70%)'
        }}
      >
        <div className="w-full aspect-square rounded-full" style={{ backgroundColor: isDarkMode ? theme.accent : '#c7d2fe' }} />
      </div>
    </div>

    {/* Content */}
    <div className="absolute inset-0 flex items-center">
      <div className="flex flex-col items-start px-6 sm:px-0 sm:ml-[8%] md:ml-[12%] lg:ml-[15%]">
        {/* Number + Title + Content row */}
        <div className="flex items-start">
          <div className={`font-inter font-bold text-[4rem] sm:text-[7rem] md:text-[10rem] leading-none -mt-[0.1em] mr-4 sm:mr-6 md:mr-10 ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
            07
          </div>
          <div className="max-w-md lg:max-w-xl">
            <h1 className={`font-inter font-bold text-2xl sm:text-3xl md:text-5xl leading-tight ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
              Priority
            </h1>
            <h2 className={`font-manrope font-medium text-xl sm:text-2xl md:text-4xl mt-1 ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
              Actions
            </h2>
            <p className={`font-montserrat font-[500] text-base md:text-lg leading-relaxed mt-4 sm:mt-6 max-w-sm md:max-w-md ${isDarkMode ? 'text-white/70' : 'text-[#1A1A1A]/70'}`}>
              Recommended steps to improve your health outcomes.
            </p>

            {/* Action cards */}
            <div className="mt-6 sm:mt-8 space-y-4 max-h-[45vh] overflow-y-auto pr-2">
              {actions?.slice(0, 2).map((action, idx) => (
                <div
                  key={idx}
                  className={`p-4 sm:p-5 rounded-2xl ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-[#1A1A1A]/5 border border-[#1A1A1A]/10'}`}
                >
                  {/* Action header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                      style={{
                        background: isDarkMode
                          ? (idx === 0 ? `linear-gradient(135deg, ${theme.accent}, ${theme.secondaryMid})` : `${theme.accent}33`)
                          : (idx === 0 ? 'linear-gradient(135deg, #1A1A1A, #3a3a3a)' : 'rgba(26, 26, 26, 0.2)')
                      }}
                    >
                      <span className="text-white font-bold text-sm">{idx + 1}</span>
                    </div>
                    <h4 className={`font-montserrat font-[500] text-base md:text-lg leading-tight ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>{action.action}</h4>
                  </div>

                  {/* Rationale */}
                  <p className={`font-montserrat font-[500] text-base md:text-lg leading-relaxed mb-3 pl-11 ${isDarkMode ? 'text-white/60' : 'text-[#1A1A1A]/60'}`}>
                    {action.rationale}
                  </p>

                  {/* Expected Impact badge */}
                  {action.expected_impact && (
                    <div className="pl-11">
                      <div
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg"
                        style={{
                          backgroundColor: isDarkMode ? `${theme.accent}1a` : 'rgba(59, 130, 246, 0.1)',
                          border: isDarkMode ? `1px solid ${theme.accent}33` : '1px solid rgba(59, 130, 246, 0.2)'
                        }}
                      >
                        <svg className="w-6 h-6" style={{ color: isDarkMode ? theme.accent : '#3b82f6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span style={{ color: isDarkMode ? theme.accent : '#3b82f6' }} className="text-sm font-medium ">{action.expected_impact}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Enhanced Question Card with full details
const QuestionCard = ({ question, index }) => {
  const isOptimal = question.options_considered?.is_best_option;
  const bestOption = question.options_considered?.best_option;
  const ratingColor = question.rating >= 8 ? '#10b981' : question.rating >= 5 ? COLORS.accent : '#ef4444';

  return (
    <div className="bg-[#F5F5F5] rounded-2xl p-5 border-l-4" style={{ borderLeftColor: ratingColor }}>
      {/* Header with question and score */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <p className="text-[#1A1A1A] font-semibold text-sm leading-tight">{question.question}</p>
          {question.has_sub_question && question.sub_question && (
            <p className="text-[#999999] text-xs mt-1 italic">{question.sub_question}</p>
          )}
        </div>
        <div
          className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
          style={{ backgroundColor: ratingColor }}
        >
          <span className="text-white font-bold text-lg">{question.rating}</span>
          <span className="text-white/70 text-[10px]">/10</span>
        </div>
      </div>

      {/* Answer comparison */}
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg">
          <span className="text-[#999999] text-xs">Your answer:</span>
          <span className="text-[#1A1A1A] font-medium text-xs">{question.answer}</span>
          {isOptimal && (
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        {!isOptimal && bestOption && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200">
            <span className="text-amber-600 text-xs">Optimal:</span>
            <span className="text-amber-700 font-medium text-xs">{bestOption}</span>
          </div>
        )}
      </div>

      {/* Reasoning */}
      {question.reasoning && (
        <p className="text-[#666666] text-xs leading-relaxed">{question.reasoning}</p>
      )}
    </div>
  );
};

// Slide: Section Detail (Enhanced)
const SectionDetailSlide = ({ section, summary }) => {
  const scoreColor = section.section_score >= 8 ? '#10b981' : section.section_score >= 5 ? COLORS.accent : '#ef4444';
  const scoreLabel = section.section_score >= 8 ? 'Excellent' : section.section_score >= 6 ? 'Good' : section.section_score >= 4 ? 'Fair' : 'Needs Work';

  return (
    <div className="relative h-full flex items-center overflow-hidden">
      <div className="absolute right-0 top-0 bottom-0 w-1/3 pointer-events-none overflow-hidden">
        <svg viewBox="0 0 6937 4458" className="h-full w-auto" style={{ marginRight: '-20%', opacity: 0.5, transform: 'scaleX(-1)' }} preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="sectionSquiggleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFD699" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#F5A623" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#E8891E" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          <path d="M41.0652 1288.86C732.065 640.189 2264.44 -434.06 3014.07 315.856C4286.57 1588.86 2568.57 3415.86 2032.07 2761.36C1495.57 2106.86 2441.07 1206.86 3014.07 1034.36C3587.07 861.855 3832.07 925.355 4186.57 1034.36C4541.07 1143.36 5142.37 1383 5341.07 2424.86C5618.46 3879.4 4750.07 4734.35 3932.07 4270.35C3114.07 3806.36 2877.07 2443.86 4704.57 2479.86C6166.57 2508.66 6762.4 3685.52 6877.57 4270.35" stroke="url(#sectionSquiggleGradient)" strokeWidth="120" fill="none" />
        </svg>
      </div>

      <div className="w-full flex flex-col md:flex-row gap-6 h-full pt-20 pb-16 overflow-y-auto">
        {/* Left - Score and Summary */}
        <div className="md:w-2/5 flex-shrink-0">
          {/* Score Card */}
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2D2D2D] rounded-2xl p-6 mb-4">
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center"
                style={{ backgroundColor: scoreColor }}
              >
                <span className="text-3xl font-bold text-white">{section.section_score.toFixed(1)}</span>
                <span className="text-xs text-white/70">/10</span>
              </div>
              <div>
                <h1 className="text-white text-2xl md:text-3xl font-bold leading-tight">
                  {section.section_name}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: scoreColor }} />
                  <span className="text-white/70 text-sm">{scoreLabel}</span>
                </div>
              </div>
            </div>
            <p className="text-white/50 text-xs mt-4">{section.rated_questions?.length || 0} questions analyzed</p>
          </div>

          {/* Section Summary */}
          {summary?.summary && (
            <div className="bg-[#F5F5F5] rounded-2xl p-5 mb-4">
              <h3 className="text-[#1A1A1A] font-semibold text-sm mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Summary
              </h3>
              <p className="text-[#666666] text-sm leading-relaxed">{summary.summary}</p>
            </div>
          )}

          {/* Key Points */}
          {summary?.key_points?.length > 0 && (
            <div className="bg-[#F5F5F5] rounded-2xl p-5">
              <h3 className="text-[#1A1A1A] font-semibold text-sm mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Key Points
              </h3>
              <ul className="space-y-2">
                {summary.key_points.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[#666666] text-xs leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-[#1A1A1A] text-white text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right - Questions */}
        <div className="flex-1 overflow-y-auto pr-2">
          <h3 className="text-[#1A1A1A] font-semibold text-sm mb-4">Question Analysis</h3>
          {section.rated_questions?.length > 0 && (
            <div className="space-y-4">
              {section.rated_questions.map((q, idx) => (
                <QuestionCard key={idx} question={q} index={idx} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Slide: Recommendations (Enhanced with expected impact)
const RecommendationsSlide = ({ actions }) => (
  <div className="relative h-full flex items-center overflow-hidden">
    <SquiggleDecor position="left" />
    <StarIcon size={28} color="#1A1A1A" className="absolute top-24 right-1/4" />

    <div className="w-full pt-20 pb-16">
      <div className="flex items-center gap-4 mb-6">
        <OrangeIcon size={48}>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </OrangeIcon>
        <div>
          <h1 className="text-[#1A1A1A] text-3xl md:text-4xl font-bold">Priority Actions</h1>
          <p className="text-[#999999] text-sm">Recommended steps to improve your health</p>
        </div>
      </div>

      <div className="space-y-4">
        {actions?.slice(0, 3).map((action, idx) => (
          <div
            key={idx}
            className="bg-[#F5F5F5] rounded-2xl p-5 border-l-4"
            style={{ borderLeftColor: idx === 0 ? '#10b981' : idx === 1 ? COLORS.accent : '#1A1A1A' }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: idx === 0 ? '#10b981' : idx === 1 ? COLORS.accent : '#1A1A1A' }}
              >
                <span className="text-white font-bold text-lg">{idx + 1}</span>
              </div>
              <div className="flex-1">
                <h4 className="text-[#1A1A1A] font-semibold text-base mb-2">{action.action}</h4>
                <p className="text-[#666666] text-sm leading-relaxed mb-3">{action.rationale}</p>
                {action.expected_impact && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200 inline-flex">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span className="text-green-700 text-xs font-medium">Expected Impact: {action.expected_impact}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Slide: Monitoring Points (Tracking Checklist)
const MonitoringSlide = ({ monitoringPoints }) => (
  <div className="relative h-full flex items-center">
    <div className="absolute right-0 top-0 bottom-0 w-1/3 pointer-events-none overflow-hidden">
      <svg viewBox="0 0 6937 4458" className="h-full w-auto" style={{ marginRight: '-20%', opacity: 0.5, transform: 'scaleX(-1)' }} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="monitorSquiggleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#059669" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#047857" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path d="M41.0652 1288.86C732.065 640.189 2264.44 -434.06 3014.07 315.856C4286.57 1588.86 2568.57 3415.86 2032.07 2761.36C1495.57 2106.86 2441.07 1206.86 3014.07 1034.36C3587.07 861.855 3832.07 925.355 4186.57 1034.36C4541.07 1143.36 5142.37 1383 5341.07 2424.86C5618.46 3879.4 4750.07 4734.35 3932.07 4270.35C3114.07 3806.36 2877.07 2443.86 4704.57 2479.86C6166.57 2508.66 6762.4 3685.52 6877.57 4270.35" stroke="url(#monitorSquiggleGradient)" strokeWidth="120" fill="none" />
      </svg>
    </div>

    <div className="w-full flex flex-col md:flex-row gap-8">
      {/* Left - Title and description */}
      <div className="md:w-2/5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-[#1A1A1A] text-3xl md:text-4xl font-bold leading-tight mb-4">
          Progress<br />Tracking
        </h1>
        <p className="text-[#666666] text-sm leading-relaxed mb-6">
          Monitor these key metrics regularly to track your improvement journey. Consistent tracking helps ensure you stay on course toward your health goals.
        </p>

        <div className="flex items-center gap-3">
          <StarIcon size={24} color="#10b981" />
          <span className="text-[#999999] text-sm">{monitoringPoints?.length || 0} tracking points</span>
        </div>
      </div>

      {/* Right - Checklist */}
      <div className="flex-1">
        <div className="bg-[#F5F5F5] rounded-2xl p-6">
          <h3 className="text-[#1A1A1A] font-semibold text-sm mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Monitoring Checklist
          </h3>
          <div className="space-y-3">
            {monitoringPoints?.map((point, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-xl">
                <div className="w-6 h-6 rounded-lg border-2 border-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-3 h-3 rounded bg-green-500/20" />
                </div>
                <p className="text-[#666666] text-sm leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <StarburstIcon size={36} color="#10b981" />
        </div>
      </div>
    </div>
  </div>
);

// Slide: Notable Patterns
const PatternsSlide = ({ patterns }) => (
  <div className="relative h-full flex items-center">
    <SquiggleDecor position="left" />

    <div className="w-full">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        </div>
        <div>
          <h1 className="text-[#1A1A1A] text-3xl md:text-4xl font-bold">Notable Patterns</h1>
          <p className="text-[#999999] text-sm">Trends identified in your responses</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {patterns?.map((pattern, idx) => (
          <div
            key={idx}
            className="bg-gradient-to-br from-[#F5F5F5] to-white rounded-2xl p-5 border border-gray-100"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-[#666666] text-sm leading-relaxed">{pattern}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-4">
        <StarIcon size={24} color="#7c3aed" />
        <StarburstIcon size={32} color="#a78bfa" />
      </div>
    </div>
  </div>
);

// Slide: End
const EndSlide = ({ clevoCode, timestamp, onBack, onExport }) => (
  <div className="relative h-full flex items-center justify-center">
    {/* Decorative squiggles with gradient */}
    <div className="absolute left-0 top-0 bottom-0 w-1/3 pointer-events-none overflow-hidden">
      <svg viewBox="0 0 6937 4458" className="h-full w-auto" style={{ marginLeft: '-25%', opacity: 0.5 }} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="endLeftSquiggleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5A623" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#E8891E" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FFD699" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path d="M41.0652 1288.86C732.065 640.189 2264.44 -434.06 3014.07 315.856C4286.57 1588.86 2568.57 3415.86 2032.07 2761.36C1495.57 2106.86 2441.07 1206.86 3014.07 1034.36C3587.07 861.855 3832.07 925.355 4186.57 1034.36C4541.07 1143.36 5142.37 1383 5341.07 2424.86C5618.46 3879.4 4750.07 4734.35 3932.07 4270.35C3114.07 3806.36 2877.07 2443.86 4704.57 2479.86C6166.57 2508.66 6762.4 3685.52 6877.57 4270.35" stroke="url(#endLeftSquiggleGradient)" strokeWidth="120" fill="none" />
      </svg>
    </div>
    <div className="absolute right-0 top-0 bottom-0 w-1/3 pointer-events-none overflow-hidden">
      <svg viewBox="0 0 6937 4458" className="h-full w-auto" style={{ marginRight: '-25%', opacity: 0.5, transform: 'scaleX(-1)' }} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="endRightSquiggleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD699" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#F5A623" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#E8891E" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path d="M41.0652 1288.86C732.065 640.189 2264.44 -434.06 3014.07 315.856C4286.57 1588.86 2568.57 3415.86 2032.07 2761.36C1495.57 2106.86 2441.07 1206.86 3014.07 1034.36C3587.07 861.855 3832.07 925.355 4186.57 1034.36C4541.07 1143.36 5142.37 1383 5341.07 2424.86C5618.46 3879.4 4750.07 4734.35 3932.07 4270.35C3114.07 3806.36 2877.07 2443.86 4704.57 2479.86C6166.57 2508.66 6762.4 3685.52 6877.57 4270.35" stroke="url(#endRightSquiggleGradient)" strokeWidth="120" fill="none" />
      </svg>
    </div>

    <div className="text-center z-10">
      <div className="flex justify-center mb-6">
        <OrangeIcon size={80}>
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </OrangeIcon>
      </div>

      <h1 className="text-[#1A1A1A] text-4xl md:text-5xl font-bold mb-2">Report Complete</h1>
      <p className="text-[#999999] mb-8">
        Generated on {new Date(timestamp).toLocaleDateString('en-US', {
          month: 'long', day: 'numeric', year: 'numeric'
        })}
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
        <button
          onClick={onExport}
          className="px-8 py-4 text-white font-medium rounded-xl transition-all hover:scale-105"
          style={{ backgroundColor: COLORS.accent }}
        >
          Export Report
        </button>
        <button
          onClick={onBack}
          className="px-8 py-4 border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] font-medium rounded-xl transition-all"
        >
          Back to Form
        </button>
      </div>

      <p className="text-[#999999] text-xs font-mono">ID: {clevoCode}</p>

      <div className="mt-8 flex justify-center gap-4">
        <StarIcon size={24} color="#1A1A1A" />
        <StarburstIcon size={32} color="#F5A623" />
        <StarIcon size={24} color="#1A1A1A" />
      </div>
    </div>
  </div>
);

// ============================================
// PROGRESS DOTS
// ============================================
const ProgressDots = ({ current, total, onNavigate }) => (
  <div className="fixed right-4 md:right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2">
    {Array.from({ length: total }).map((_, idx) => (
      <button
        key={idx}
        onClick={() => onNavigate(idx)}
        className={`
          w-3 h-3 rounded-full transition-all duration-300 cursor-pointer
          ${idx === current ? 'scale-125' : 'hover:opacity-80'}
        `}
        style={{
          backgroundColor: idx === current ? COLORS.accent : '#D1D5DB'
        }}
        aria-label={`Go to slide ${idx + 1}`}
      />
    ))}
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================
const AnalyticsReport = () => {
  const { orgName, formName, clevoCode } = useParams();
  const navigate = useNavigate();
  const formCode = `${orgName}/${formName}`;
  const containerRef = useRef(null);

  const { getAgentResponse, isLoading, error } = useAnalyticResponses(formCode, clevoCode);
  const { getForm } = useAnalyticForms();

  const [reportData, setReportData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [formConfig, setFormConfig] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1); // 1 = forward, -1 = backward
  const [reportTheme, setReportTheme] = useState(DEFAULT_THEME);
  const [isDarkMode, setIsDarkMode] = useState(true); // Dark/Light theme toggle

  // Lock to prevent rapid navigation (simple debounce)
  const isLockedRef = useRef(false);
  const touchStartY = useRef(0);

  // Load form config
  useEffect(() => {
    const loadFormConfig = async () => {
      try {
        const config = await getForm(formCode);
        if (config) {
          setFormConfig(config);
          applyTheme(config.theme_color || "default", config.custom_colors);
          applyThemeMethod(config.theme_method || "solid");

          // Set report theme from form config
          const themeName = config.report_theme || config.theme_color || 'teal';
          setReportTheme(REPORT_THEMES[themeName] || DEFAULT_THEME);
        }
      } catch (err) {
        console.error("Error loading form config:", err);
      }
    };
    loadFormConfig();
  }, [formCode, getForm]);

  // Fetch report
  useEffect(() => {
    const fetchReport = async () => {
      try {
        const data = await getAgentResponse();
        if (data) {
          setReportData(data);
        } else {
          setLoadError('Report not found.');
        }
      } catch (err) {
        setLoadError(err.message);
      }
    };
    fetchReport();
  }, [getAgentResponse]);

  // Build slides array once we have data
  const slides = [];
  if (reportData) {
    const { statistics, llm_insights, section_ratings } = reportData;
    const sectionSummaryMap = {};
    llm_insights?.section_summaries?.forEach(s => { sectionSummaryMap[s.section_name] = s; });

    // Slide 0: Cover Page
    slides.push({
      id: 'cover',
      render: () => <CoverSlide theme={reportTheme} isDarkMode={isDarkMode} />,
    });

    // Slide 1: Content Index - Introduction
    slides.push({
      id: 'content-index',
      render: () => <ContentIndexSlide sections={section_ratings} theme={reportTheme} isDarkMode={isDarkMode} />,
    });

    // Slide 2: Hero - Overall Score
    slides.push({
      id: 'hero',
      render: (active) => (
        <HeroSlide
          score={statistics?.average_rating || 0}
          formName={formConfig?.name || 'Health Assessment'}
          active={active}
          theme={reportTheme}
          isDarkMode={isDarkMode}
        />
      ),
    });

    // Slide 3: Stats - Assessment Overview
    slides.push({
      id: 'stats',
      render: (active) => (
        <StatsSlide
          stats={statistics}
          sectionsRated={reportData.sections_rated}
          totalSections={reportData.total_sections}
          active={active}
          theme={reportTheme}
          isDarkMode={isDarkMode}
        />
      ),
    });

    // Slide 4: Breakdown - Section Scores
    slides.push({
      id: 'breakdown',
      render: (active) => <BreakdownSlide sections={section_ratings} active={active} theme={reportTheme} isDarkMode={isDarkMode} />,
    });

    // Slide 5: Summary - Comprehensive Overview & Insights
    slides.push({
      id: 'summary',
      render: () => (
        <SummarySlide
          overview={llm_insights?.comprehensive_summary?.overview || 'No summary available.'}
          theme={reportTheme}
          isDarkMode={isDarkMode}
        />
      ),
    });

    // Slide 6: Key Insights
    slides.push({
      id: 'insights',
      render: () => (
        <KeyInsightsSlide
          insights={llm_insights?.comprehensive_summary?.key_insights || []}
          theme={reportTheme}
          isDarkMode={isDarkMode}
        />
      ),
    });

    // Slide 7: Priority Actions
    slides.push({
      id: 'actions',
      render: () => (
        <PriorityActionsSlide
          actions={llm_insights?.recommendations?.priority_actions || []}
          theme={reportTheme}
          isDarkMode={isDarkMode}
        />
      ),
    });
  }

  const totalSlides = slides.length;

  // Navigate to a specific slide
  const goToSlide = (index) => {
    if (isLockedRef.current) return;
    if (index < 0 || index >= totalSlides) return;

    isLockedRef.current = true;
    setSlideDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);

    // Unlock after animation completes
    setTimeout(() => {
      isLockedRef.current = false;
    }, 600);
  };

  // Move by direction (+1 or -1)
  const move = (direction) => {
    goToSlide(currentSlide + direction);
  };

  // Wheel handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container || totalSlides === 0) return;

    const handleWheel = (e) => {
      e.preventDefault();
      if (isLockedRef.current) return;

      // Determine direction: positive deltaY = scroll down = next slide
      const direction = e.deltaY > 0 ? 1 : -1;
      move(direction);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [currentSlide, totalSlides]);

  // Touch handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container || totalSlides === 0) return;

    const handleTouchStart = (e) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
      if (isLockedRef.current) return;

      const deltaY = touchStartY.current - e.changedTouches[0].clientY;
      // Require at least 50px swipe
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
  }, [currentSlide, totalSlides]);

  // Keyboard handler
  useEffect(() => {
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
  }, [currentSlide, totalSlides]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: '#E5E7EB', borderTopColor: COLORS.accent }}
          />
          <p className="text-[#999999] text-sm">Loading your report...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || loadError) {
    return (
      <div className="h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-[#F5F5F5] rounded-2xl max-w-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-[#1A1A1A] text-xl font-bold mb-2">Unable to Load</h2>
          <p className="text-[#666666] text-sm mb-6">{error || loadError}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] font-medium rounded-xl transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!reportData || totalSlides === 0) return null;

  return (
    <div
      ref={containerRef}
      className="h-screen bg-white overflow-hidden relative"
    >
      {/* Theme toggle button */}
      <ThemeToggle isDarkMode={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />

      {/* Slides with AnimatePresence for smooth transitions */}
      <AnimatePresence initial={false} custom={slideDirection}>
        {slides.map((slide, idx) => (
          <Slide
            key={slide.id}
            slideKey={slide.id}
            active={idx === currentSlide}
            direction={slideDirection}
            isDarkMode={isDarkMode}
          >
            {slide.render(idx === currentSlide)}
          </Slide>
        ))}
      </AnimatePresence>

      {/* Progress dots with animation */}
      <motion.div
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

      {/* Back button - hidden on cover slide */}
      <AnimatePresence>
        {currentSlide > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            onClick={() => navigate(`/${orgName}/${formName}`)}
            className="fixed bottom-4 left-4 md:bottom-6 md:left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#1A1A1A] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Slide counter with animation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm font-medium"
        style={{ backgroundColor: '#F5F5F5', color: '#666666' }}
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
    </div>
  );
};

export default AnalyticsReport;
