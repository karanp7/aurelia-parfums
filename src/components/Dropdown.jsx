import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

// Self-contained accessible dropdown (aria-haspopup/expanded, Escape +
// click-outside close) — same pattern as the nav's ShopDropdown in
// App.jsx, generalized so Sort (Collection page) and every filter
// dropdown (Brand/Price/Availability/Size, and the visible-but-disabled
// Gender/Season/Occasion/Concentration placeholders) share one building
// block instead of each hand-rolling their own.
export default function Dropdown({ label, options, value, onChange, className = '', disabled = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') setOpen(false); };
    const onClickOutside = (event) => { if (ref.current && !ref.current.contains(event.target)) setOpen(false); };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [open]);

  // "All"/"all" is every filter's real default value across the app - a
  // single generic check here instead of each call site passing its own
  // isActive flag. Drives the chip's filled/active styling so an applied
  // filter reads as visually "on", not just as differently-labeled text.
  const isActive = !disabled && value !== 'All' && value !== 'all';

  return (
    <div className={`filter-dropdown${disabled ? ' filter-dropdown--disabled' : ''}${isActive ? ' filter-dropdown--active' : ''} ${className}`} ref={ref}>
      <button type="button" disabled={disabled} title={disabled ? 'Coming soon' : undefined} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="filter-dropdown-label">{label}</span>
        <span>{disabled ? 'Coming soon' : current?.label ?? 'All'}</span>
        <Icon name="chevronDown" size={14}/>
      </button>
      {open && <ul className="filter-dropdown-menu" role="listbox">
        {options.map((option) => (
          <li key={option.value} role="option" aria-selected={option.value === value}>
            <button type="button" disabled={option.disabled} title={option.disabled ? 'Coming soon' : undefined} onClick={() => { if (option.disabled) return; onChange(option.value); setOpen(false); }}>{option.label}</button>
          </li>
        ))}
      </ul>}
    </div>
  );
}
