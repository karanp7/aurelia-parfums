import React from 'react';

// Wraps the existing .tag pill class so call sites read as <Badge> instead
// of a raw span. Tone variants (authentic/shipping/sold-out) are added in
// Milestone 3 alongside the product card work that actually uses them —
// this stays a plain behavior-preserving wrapper for now.
export default function Badge({ tone, className = '', children }) {
  const classes = ['tag', tone && `tag-${tone}`, className].filter(Boolean).join(' ');
  return <span className={classes}>{children}</span>;
}
