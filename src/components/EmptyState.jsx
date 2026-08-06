import React from 'react';

// Used for the shop grid's error/no-results states (className="no-results")
// and the cart drawer's loading/empty states (className="empty") — kept as
// one small component with a className prop rather than merging those two
// existing, differently-styled contexts into a single new class.
export default function EmptyState({ className = 'no-results', title, description, action, children }) {
  return (
    <div className={className}>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
      {children}
    </div>
  );
}
