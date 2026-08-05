import React from 'react';
import Icon from './Icon.jsx';

// Shared overlay shell for all 4 overlays (mobile menu, product modal, quiz
// modal, cart drawer). useDialogA11y (focus-trap/Escape/focus-restore) stays
// called in App.jsx — its returned ref is passed in explicitly as `dialogRef`
// rather than relying on plain `ref` forwarding, to keep that boundary clear.
//
// Deliberately does NOT render a close button itself: the 4 current overlays
// aren't shape-identical (the cart drawer's close button sits inside its
// .drawer-head next to a heading; the other 3 float one as the first overlay
// child) — each caller renders its own via <DialogClose> instead of forcing
// one universal layout.
export default function Dialog({ overlayClassName = '', label, dialogRef, children }) {
  return (
    <div className={`overlay ${overlayClassName}`.trim()} role="dialog" aria-modal="true" aria-label={label} ref={dialogRef} tabIndex={-1}>
      {children}
    </div>
  );
}

export function DialogClose({ onClick, label = 'Close', className = '' }) {
  return <button className={`close ${className}`.trim()} onClick={onClick} aria-label={label}><Icon name="close" size={16}/></button>;
}
