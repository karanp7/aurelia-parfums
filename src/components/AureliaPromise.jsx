import React from 'react';
import Logo from './Logo.jsx';
import Icon from './Icon.jsx';
import Button from './Button.jsx';

// /authenticity - the kit this was adapted from asked for a dedicated
// "Aurelia Promise" page with sourcing/packaging/verification pillars and
// an authenticity-guarantee close. Every claim here already exists,
// word-for-word or near enough, on the real site (the announcement bar's
// "100% Authentic Guarantee", the homepage trust-row's sourcing/gift-
// packaging claims, and the real "Damaged or incorrect orders" policy) -
// reused and reframed under the kit's three-pillar structure rather than
// inventing new certifications, review counts or processes that don't
// exist in this store.
export default function AureliaPromise({ onBack, onShopAll }) {
  return (
    <div className="promise-page">
      <header className="promise-nav">
        <Logo onClick={onBack} />
        <button type="button" className="promise-back" onClick={onBack}><Icon name="arrowLeft" size={14} /> Back to Aurelia</button>
      </header>

      <section className="promise-hero">
        <p className="overline">The Aurelia Promise</p>
        <h1>Authentic luxury, guaranteed.</h1>
        <p className="promise-lede">Every fragrance we sell is sourced, packaged and stood behind the same way — no exceptions.</p>
      </section>

      <section className="promise-pillars">
        <article>
          <Icon name="shield" size={30} />
          <span>01</span>
          <h2>Sourcing</h2>
          <p>We source directly from authorized distributors and the brands themselves — never gray-market resellers, so every bottle you receive is the real thing.</p>
        </article>
        <article>
          <Icon name="gift" size={30} />
          <span>02</span>
          <h2>Packaging</h2>
          <p>Fragrances ship in their original, sealed manufacturer packaging, protected for transit — with optional luxury gift wrap available at checkout.</p>
        </article>
        <article>
          <Icon name="refresh" size={30} />
          <span>03</span>
          <h2>Verification</h2>
          <p>If anything ever arrives leaking, damaged, or incorrect, contact us with photos and we'll replace it after verification — no returns-department runaround.</p>
        </article>
      </section>

      <section className="promise-guarantee">
        <Icon name="check" size={22} />
        <h2>100% Authentic Guarantee</h2>
        <p>on every order, every time.</p>
      </section>

      <section className="promise-cta">
        <Button variant="primary" onClick={onShopAll}>Shop with confidence <Icon name="arrowRight" /></Button>
      </section>
    </div>
  );
}
