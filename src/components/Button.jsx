import React from 'react';

// Thin wrapper around the existing button/anchor classes so call sites read
// as <Button variant="..."> instead of repeating className combinations.
// Deliberately renders the exact same classes as before (.btn.btn-dark etc,
// .text-button) - this is a behavior-preserving refactor, not a visual change.
const VARIANT_CLASS = { primary: 'btn-dark', secondary: 'btn-light', ghost: 'btn-ghost' };

export default function Button({ variant = 'primary', full = false, href, className = '', children, ...rest }) {
  if (variant === 'text') {
    const classes = ['text-button', className].filter(Boolean).join(' ');
    const Tag = href ? 'a' : 'button';
    return <Tag className={classes} href={href} {...rest}>{children}</Tag>;
  }
  const classes = ['btn', VARIANT_CLASS[variant] || 'btn-dark', full && 'full', className].filter(Boolean).join(' ');
  const Tag = href ? 'a' : 'button';
  return <Tag className={classes} href={href} {...rest}>{children}</Tag>;
}
