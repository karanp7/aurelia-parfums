import React from 'react';

// Every "icon" sitewide used to be a raw Unicode/emoji-style character
// (☰ ⌕ ♡ ♥ ◇ ↗ → ← ✓ ★ ▾ × − ＋) dropped straight into JSX — free to type,
// but it reads as a template, not a designed brand. This is a small,
// hand-authored, single-file icon set instead: one shared 20x20 viewBox,
// one stroke width (1.5), one line-cap/join style, so every glyph on the
// site comes from the same optical family. No icon-library dependency —
// just inline SVG, matching the "minimal dependencies" standing rule.
//
// `filled` toggles solid-fill rendering for the two icons that need a
// filled/outline state (heart, star) rather than needing two separate
// icon names per state.
const ICONS = {
  menu: () => <path d="M3 6h14M3 10h14M3 14h14" />,
  search: () => <><circle cx="8.5" cy="8.5" r="5.5" /><path d="M16.5 16.5l-4-4" /></>,
  heart: ({ filled }) => (
    <path
      d="M10 17.3c-.3 0-.6-.1-.8-.3C6.7 14.9 2 11 2 6.9 2 4.5 3.9 2.6 6.3 2.6c1.4 0 2.7.7 3.7 1.9 1-1.2 2.3-1.9 3.7-1.9 2.4 0 4.3 1.9 4.3 4.3 0 4.1-4.7 8-7.2 10.1-.2.2-.5.3-.8.3z"
      fill={filled ? 'currentColor' : 'none'}
    />
  ),
  bag: () => (
    <>
      <path d="M5 7h10l.8 10a1 1 0 01-1 1.1H5.2a1 1 0 01-1-1.1L5 7z" />
      <path d="M7.2 7V5.6a2.8 2.8 0 015.6 0V7" />
    </>
  ),
  arrowUpRight: () => <path d="M6 14L14 6M8 6h6v6" />,
  arrowRight: () => <path d="M3 10h13M11 5l5 5-5 5" />,
  arrowLeft: () => <path d="M17 10H4M9 5l-5 5 5 5" />,
  check: () => <path d="M4 10.5l4 4L16 6" />,
  star: ({ filled }) => (
    <path
      d="M10 2.5l2.24 4.7 5.1.62-3.75 3.6.94 5.08L10 14l-4.53 2.5.94-5.08-3.75-3.6 5.1-.62L10 2.5z"
      fill={filled ? 'currentColor' : 'none'}
    />
  ),
  chevronDown: () => <path d="M5 8l5 5 5-5" />,
  close: () => <path d="M5 5l10 10M15 5L5 15" />,
  minus: () => <path d="M4 10h12" />,
  plus: () => <path d="M10 4v12M4 10h12" />,
  shield: () => (
    <>
      <path d="M10 2.2l6.5 2.4v5c0 4.3-2.8 7.6-6.5 8.6-3.7-1-6.5-4.3-6.5-8.6v-5L10 2.2z" />
      <path d="M7.2 10l2 2 3.6-3.8" />
    </>
  ),
  truck: () => (
    <>
      <rect x="1.5" y="5.5" width="10.5" height="8.5" />
      <path d="M12 8.5h3l2.5 2.5v3H12z" />
      <circle cx="5.5" cy="16" r="1.6" />
      <circle cx="14.2" cy="16" r="1.6" />
    </>
  ),
  gift: () => (
    <>
      <rect x="2.5" y="8" width="15" height="9.5" />
      <path d="M1.5 5h17v3.5h-17z" />
      <path d="M10 5v12.5" />
      <path d="M10 5S7.8 1.2 5.6 1.5C4 1.7 3.6 3.6 5 4.4c1 .6 3.4.6 5 .6z" />
      <path d="M10 5s2.2-3.8 4.4-3.5c1.6.2 2 2.1.6 2.9-1 .6-3.4.6-5 .6z" />
    </>
  ),
  refresh: () => (
    <>
      <path d="M2.5 10a7.5 7.5 0 0112.9-5.2L17 6.4" />
      <path d="M17 2.5v4h-4" />
      <path d="M17.5 10a7.5 7.5 0 01-12.9 5.2L3 13.6" />
      <path d="M3 17.5v-4h4" />
    </>
  ),
  user: () => (
    <>
      <circle cx="10" cy="6.8" r="3.5" />
      <path d="M3.2 17.5c0-3.7 3-6.7 6.8-6.7s6.8 3 6.8 6.7" />
    </>
  )
};

export default function Icon({ name, filled = false, size = 18, className = '', ...rest }) {
  const render = ICONS[name];
  if (!render) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon${className ? ` ${className}` : ''}`}
      aria-hidden="true"
      {...rest}
    >
      {render({ filled })}
    </svg>
  );
}
