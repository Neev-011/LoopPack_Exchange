import React from 'react';

/**
 * LoopPack Exchange Official Brand Logo Component
 *
 * Based on the approved Brand Identity:
 * - Isometric Open Box with emerging Green Leaf
 * - "LoopPack" dual-tone typography
 * - "EXCHANGE" wide-spaced sub-wordmark
 *
 * @param {'horizontal' | 'icon' | 'stacked'} [variant='horizontal']
 * @param {'light' | 'dark' | 'auto'} [theme='light']
 * @param {number} [height=36]
 * @param {boolean} [showTagline=false]
 * @param {string} [className='']
 * @param {object} [style={}]
 */
export default function Logo({
  variant = 'horizontal',
  theme = 'light',
  height = 36,
  showTagline = false,
  className = '',
  style = {},
  ...props
}) {
  const isDark = theme === 'dark';

  // Leaf Gradient Colors
  const leafStart = isDark ? '#22C55E' : '#16A34A';
  const leafMid = isDark ? '#4ADE80' : '#22C55E';
  const leafEnd = isDark ? '#86EFAC' : '#84D46B';
  const leafSpine = isDark ? '#166534' : '#15803D';

  // Box Colors
  const boxStroke = isDark ? '#FFFFFF' : '#0F3D2E';
  const boxFillRight = isDark ? '#FFFFFF' : '#0F3D2E';
  const boxFillLeft = isDark ? '#0F3D2E' : '#FFFFFF';

  // Typography Colors
  const loopColor = isDark ? '#FFFFFF' : '#0F3D2E';
  const packColor = isDark ? '#4ADE80' : '#22C55E';
  const exchangeColor = isDark ? '#E2E8F0' : '#0F3D2E';
  const taglineColor = isDark ? '#94A3B8' : '#64748B';

  const gradId = `lpxLeafGrad_${theme}_${Math.random().toString(36).substr(2, 6)}`;

  // 1. Icon-only mark (1:1 aspect ratio)
  if (variant === 'icon') {
    return (
      <svg
        viewBox="0 0 120 120"
        height={height}
        width={height}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`looppack-logo-icon ${className}`}
        style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
        {...props}
      >
        <defs>
          <linearGradient id={gradId} x1="48" y1="70" x2="82" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={leafStart} />
            <stop offset="45%" stopColor={leafMid} />
            <stop offset="100%" stopColor={leafEnd} />
          </linearGradient>
        </defs>

        {/* Leaf */}
        <path d="M 50 68 C 34 50 40 24 82 16 C 80 38 68 58 50 68 Z" fill={`url(#${gradId})`} />
        <path d="M 50 68 Q 58 42 82 16" stroke={leafSpine} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4" />

        {/* Isometric Box */}
        <path d="M 28 56 L 56 44" stroke={boxStroke} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M 28 56 L 56 70 L 56 100 L 28 86 Z" stroke={boxStroke} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill={boxFillLeft} />
        <path d="M 56 70 L 84 56 L 84 86 L 56 100 Z" fill={boxFillRight} stroke={boxStroke} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }

  // 2. Stacked / Vertical hero mark
  if (variant === 'stacked') {
    const width = (height * 280) / 240;
    return (
      <div
        className={`looppack-logo-stacked ${className}`}
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          ...style
        }}
        {...props}
      >
        <svg
          viewBox="0 0 120 120"
          height={height * 0.65}
          width={height * 0.65}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={gradId} x1="48" y1="70" x2="82" y2="16" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={leafStart} />
              <stop offset="45%" stopColor={leafMid} />
              <stop offset="100%" stopColor={leafEnd} />
            </linearGradient>
          </defs>
          <path d="M 50 68 C 34 50 40 24 82 16 C 80 38 68 58 50 68 Z" fill={`url(#${gradId})`} />
          <path d="M 50 68 Q 58 42 82 16" stroke={leafSpine} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4" />
          <path d="M 28 56 L 56 44" stroke={boxStroke} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M 28 56 L 56 70 L 56 100 L 28 86 Z" stroke={boxStroke} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill={boxFillLeft} />
          <path d="M 56 70 L 84 56 L 84 86 L 56 100 Z" fill={boxFillRight} stroke={boxStroke} strokeWidth="2" strokeLinejoin="round" />
        </svg>

        <div style={{ marginTop: '8px' }}>
          <div style={{ fontSize: `${height * 0.28}px`, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif" }}>
            <span style={{ color: loopColor }}>Loop</span>
            <span style={{ color: packColor }}>Pack</span>
          </div>
          <div style={{ fontSize: `${height * 0.1}px`, fontWeight: 700, color: exchangeColor, letterSpacing: '0.38em', textTransform: 'uppercase', marginTop: '4px' }}>
            EXCHANGE
          </div>
          {showTagline && (
            <div style={{ fontSize: `${height * 0.08}px`, fontWeight: 600, color: taglineColor, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '8px' }}>
              PACK TODAY • A GREENER TOMORROW
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Horizontal Header / Navbar lockup (Default)
  const calculatedWidth = (height * 360) / 90;

  return (
    <div
      className={`looppack-logo-horizontal ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${height * 0.28}px`,
        height: `${height}px`,
        textDecoration: 'none',
        userSelect: 'none',
        ...style
      }}
      {...props}
    >
      {/* Icon */}
      <svg
        viewBox="0 0 120 120"
        height={height}
        width={height}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id={gradId} x1="48" y1="70" x2="82" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={leafStart} />
            <stop offset="45%" stopColor={leafMid} />
            <stop offset="100%" stopColor={leafEnd} />
          </linearGradient>
        </defs>
        <path d="M 50 68 C 34 50 40 24 82 16 C 80 38 68 58 50 68 Z" fill={`url(#${gradId})`} />
        <path d="M 50 68 Q 58 42 82 16" stroke={leafSpine} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4" />
        <path d="M 28 56 L 56 44" stroke={boxStroke} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M 28 56 L 56 70 L 56 100 L 28 86 Z" stroke={boxStroke} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill={boxFillLeft} />
        <path d="M 56 70 L 84 56 L 84 86 L 56 100 Z" fill={boxFillRight} stroke={boxStroke} strokeWidth="2" strokeLinejoin="round" />
      </svg>

      {/* Typography */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{
          fontSize: `${height * 0.58}px`,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: '-0.025em',
          fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif"
        }}>
          <span style={{ color: loopColor }}>Loop</span>
          <span style={{ color: packColor }}>Pack</span>
        </div>
        <div style={{
          fontSize: `${height * 0.22}px`,
          fontWeight: 700,
          color: exchangeColor,
          letterSpacing: '0.34em',
          textTransform: 'uppercase',
          marginTop: '2px',
          fontFamily: "'Inter', system-ui, sans-serif"
        }}>
          EXCHANGE
        </div>
      </div>
    </div>
  );
}
