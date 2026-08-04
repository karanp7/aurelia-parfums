import React, { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { useNavigate, useLocation, matchPath } from 'react-router-dom';
import { discoverySet, perfumes } from './data/perfumes.js';
import PerfumeBottle from './components/PerfumeBottle.jsx';
import { GIFT_WRAP_PRICE, rankMatches, discoverySetKey, crossSellProduct, computeSubtotal } from './lib/cartLogic.js';

// L-04 fix: the quiz and checkout-preview modals aren't needed on first
// paint, so they're split into their own chunks and only fetched when opened.
const QuizModal = lazy(() => import('./components/QuizModal.jsx'));
const CheckoutPreview = lazy(() => import('./components/CheckoutPreview.jsx'));

const families = ['All', 'Floral', 'Woody', 'Fresh', 'Gourmand', 'Fruity'];
const Icon = ({ children }) => <span aria-hidden="true">{children}</span>;
const money = (value) => `$${value.toFixed(2).replace('.00', '')}`;

const CART_KEY = 'aurelia:cart';
const GIFT_WRAP_KEY = 'aurelia:gift-wrap';
const GIFT_MESSAGE_KEY = 'aurelia:gift-message';
const SIGNUPS_KEY = 'aurelia:signups';

function readStoredCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function useReveal() {
  useEffect(() => {
    const nodes = document.querySelectorAll('[data-reveal]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('is-visible'));
    }, { threshold: 0.12 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
}

// P0 fix (#3): shared accessible-dialog behavior — focus moves into the
// dialog on open, Tab/Shift+Tab is trapped inside it, Escape closes it, and
// focus is restored to whatever triggered it on close. Applied to every
// overlay (product modal, quiz, cart drawer, checkout preview, mobile menu).
function useDialogA11y(isOpen, onClose) {
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    triggerRef.current = document.activeElement;

    const getFocusable = () => Array.from(
      containerRef.current?.querySelectorAll(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
      ) || []
    ).filter((el) => !el.disabled && el.offsetParent !== null);

    const focusFirst = () => {
      const focusable = getFocusable();
      (focusable[0] || containerRef.current)?.focus();
    };
    // Defer one frame so conditionally-rendered content inside the dialog exists.
    const raf = requestAnimationFrame(focusFirst);

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key === 'Tab') {
        const focusable = getFocusable();
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown, true);
      triggerRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  return containerRef;
}

function App() {
  const [family, setFamily] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState(readStoredCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [selectedSize, setSelectedSize] = useState('50 ml');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navSolid, setNavSolid] = useState(false);
  // P1 fix (#5) + C-01 fix: gift wrap and gift message are real state, priced
  // into the subtotal, and now persisted (see below) so they survive a reload
  // along with the rest of the cart.
  const [giftWrap, setGiftWrap] = useState(() => localStorage.getItem(GIFT_WRAP_KEY) === 'true');
  const [giftMessage, setGiftMessage] = useState(() => localStorage.getItem(GIFT_MESSAGE_KEY) || '');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupDone, setSignupDone] = useState(false);
  const heroRef = useRef(null);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  useReveal();

  // C-01 fix: the cart previously lived only in React state, so reloading the
  // tab, tapping a link that reloaded, or a dropped connection silently
  // emptied it. It's now persisted to localStorage and rehydrated on load.
  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem(GIFT_WRAP_KEY, String(giftWrap)); }, [giftWrap]);
  useEffect(() => { localStorage.setItem(GIFT_MESSAGE_KEY, giftMessage); }, [giftMessage]);

  // H-05 fix: product detail used to be pure client state with no URL of its
  // own — it couldn't be linked, bookmarked or shared, and the browser Back
  // button left the whole site instead of closing the modal. It's now driven
  // by the route (/products/:id), so a deep link, a shareable URL and correct
  // Back-button behavior all come from the same change.
  const productMatch = useMemo(() => matchPath('/products/:id', location.pathname), [location.pathname]);
  const activeProduct = productMatch ? perfumes.find((product) => product.id === productMatch.params.id) || null : null;
  const closeProduct = () => navigate('/');
  const openProduct = (product) => { setSelectedSize('50 ml'); navigate(`/products/${product.id}`); };

  useEffect(() => {
    document.title = activeProduct ? `${activeProduct.name} — Aurelia Parfums` : 'Aurelia — Find your signature scent';
  }, [activeProduct]);

  useEffect(() => {
    const onScroll = () => {
      setNavSolid(window.scrollY > 24);
      if (heroRef.current) heroRef.current.style.setProperty('--scroll', `${Math.min(window.scrollY, 650)}px`);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = cartOpen || quizOpen || activeProduct || checkoutOpen || menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [cartOpen, quizOpen, activeProduct, checkoutOpen, menuOpen]);

  const filtered = perfumes.filter((product) => {
    const searchable = [product.name, product.house, product.family, product.secondaryFamily, product.summary, ...Object.values(product.notes).flat()].join(' ').toLowerCase();
    return (family === 'All' || product.family === family) && searchable.includes(search.toLowerCase());
  });

  const quizMatches = useMemo(() => rankMatches(perfumes, quizAnswers, 3), [quizAnswers]);

  // M-04 fix: the homepage reviews section used to always show whichever
  // three products happened to sit first in the catalog file. It now
  // surfaces the three highest-rated products instead.
  const featuredReviews = useMemo(
    () => [...perfumes].sort((a, b) => (b.rating - a.rating) || (b.reviews - a.reviews)).slice(0, 3),
    []
  );

  const subtotal = computeSubtotal(cart, giftWrap);
  const shippingThreshold = 100;
  const shippingRemaining = Math.max(0, shippingThreshold - subtotal);
  const shippingProgress = Math.min(100, (subtotal / shippingThreshold) * 100);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addItem = (item) => {
    const key = item.key || `${item.type}-${item.id}-${item.size || 'standard'}`;
    setCart((current) => {
      const found = current.find((entry) => entry.key === key);
      if (found) return current.map((entry) => entry.key === key ? { ...entry, quantity: entry.quantity + 1 } : entry);
      return [...current, { ...item, key, quantity: 1 }];
    });
    setCartOpen(true);
    closeProduct();
  };

  const addBottle = (product, size = '50 ml') => {
    const variant = product.sizes.find((option) => option.label === size) || product.sizes[1];
    addItem({ type: 'bottle', id: product.id, name: product.name, house: product.house, tone: product.tone, image: product.image, size: variant.label, price: variant.price });
  };

  // P0 fix (#1 / Bug A): key each personalized discovery set by the actual
  // matched product IDs, not a constant string, so two different quiz
  // outcomes never collide into a single merged cart line.
  const addDiscoverySet = (matches = quizMatches) => addItem({
    type: 'discovery',
    id: discoverySet.id,
    name: discoverySet.name,
    tone: 'cream',
    size: `${discoverySet.sampleCount} × ${discoverySet.sampleSize}`,
    price: discoverySet.price,
    matches: matches.map((product) => product.name),
    key: discoverySetKey(matches)
  });

  const updateQuantity = (key, delta) => setCart((current) => current
    .map((item) => item.key === key ? { ...item, quantity: item.quantity + delta } : item)
    .filter((item) => item.quantity > 0));

  // P0 fix (#2 / Bug B): the cross-sell should read the top-ranked quiz
  // match (matches[0], already rank-ordered) rather than whichever matched
  // product happens to appear first in the catalog's declaration order.
  const crossSell = useMemo(() => {
    const discovery = cart.find((item) => item.type === 'discovery');
    if (discovery?.matches?.length) {
      return { type: 'bottle', product: crossSellProduct(perfumes, discovery.matches, perfumes[1]) };
    }
    return { type: 'discovery', product: discoverySet };
  }, [cart]);

  // H-04 fix: search previously only existed inside the Shop section, with no
  // entry point from the sticky nav. This scrolls there and focuses it from
  // anywhere on the page.
  const focusSearch = () => {
    document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' });
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  };
  const clearFilters = () => { setSearch(''); setFamily('All'); };

  // P1 fix (#12): "Retake quiz" from the result screen used to reset every
  // answer, including the Myself/Gift choice from step 0. Now it preserves
  // that first answer and only resets the preference questions.
  const retakeQuiz = () => {
    setQuizAnswers((current) => ({ 0: current[0] }));
    setQuizStep(1);
  };
  const closeQuiz = () => { setQuizOpen(false); setQuizStep(0); setQuizAnswers({}); };
  const answerQuiz = (value) => { setQuizAnswers((current) => ({ ...current, [quizStep]: value })); setQuizStep((step) => step + 1); };

  // The hero's bouncing bottle shows whichever product is tagged
  // "Bestseller" in the Excel `Badge` column, falling back to the
  // highest-rated / most-reviewed product if no row is marked that way.
  const heroProduct = useMemo(() => {
    const bestseller = perfumes.find((product) => product.badge?.toLowerCase() === 'bestseller');
    if (bestseller) return bestseller;
    return [...perfumes].sort((a, b) => (b.rating - a.rating) || (b.reviews - a.reviews))[0] || null;
  }, []);

  // L-05 fix: the product modal had no path to another product once it was
  // open — cross-sell only existed in the cart drawer. Same-family matches
  // first, other products filling any remaining slots.
  const relatedProducts = useMemo(() => {
    if (!activeProduct) return [];
    const sameFamily = perfumes.filter((product) => product.id !== activeProduct.id && product.family === activeProduct.family);
    const rest = perfumes.filter((product) => product.id !== activeProduct.id && product.family !== activeProduct.family);
    return [...sameFamily, ...rest].slice(0, 3);
  }, [activeProduct]);

  // H-07 fix: there was previously no way to capture an email anywhere on
  // the site, so a visitor who didn't buy on their first visit left no trace
  // to remarket to. This stores signups locally for now — swap in a real ESP
  // (Klaviyo, Mailchimp, etc.) before launch, the same prototype boundary the
  // checkout preview below already documents for payments.
  const submitSignup = (event) => {
    event.preventDefault();
    if (!signupEmail.trim()) return;
    try {
      const list = JSON.parse(localStorage.getItem(SIGNUPS_KEY) || '[]');
      list.push({ email: signupEmail.trim(), at: new Date().toISOString() });
      localStorage.setItem(SIGNUPS_KEY, JSON.stringify(list));
    } catch {
      // storage unavailable — signup still confirms locally
    }
    setSignupDone(true);
    setSignupEmail('');
  };

  const menuDialogRef = useDialogA11y(menuOpen, () => setMenuOpen(false));
  const productDialogRef = useDialogA11y(Boolean(activeProduct), closeProduct);
  const quizDialogRef = useDialogA11y(quizOpen, closeQuiz);
  const cartDialogRef = useDialogA11y(cartOpen, () => setCartOpen(false));
  const checkoutDialogRef = useDialogA11y(checkoutOpen, () => setCheckoutOpen(false));

  return <div className="site-shell">
    <a className="skip-link" href="#top">Skip to content</a>
    <header className={`nav ${navSolid ? 'nav-solid' : ''}`}>
      <button className="nav-icon" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Icon>☰</Icon></button>
      <a className="logo" href="#top">AURELIA <span>PARFUMS</span></a>
      <nav aria-label="Primary"><a href="#discovery">Discovery sets</a><a href="#collection">Shop</a><a href="#gifts">Gifts</a><button onClick={() => setQuizOpen(true)}>Find your scent</button></nav>
      <div className="nav-actions">
        <button className="icon-btn" aria-label="Search fragrances" onClick={focusSearch}><Icon>⌕</Icon></button>
        <button className="bag" onClick={() => setCartOpen(true)} aria-label={`Open bag with ${itemCount} items`}><Icon>◇</Icon><span>Bag</span>{itemCount > 0 && <b>{itemCount}</b>}</button>
      </div>
    </header>

    <main id="top" tabIndex={-1}>
      <section ref={heroRef} className="hero-cinematic">
        <div className="hero-light" aria-hidden="true" />
        <div className="hero-copy">
          <p className="overline">Fragrance without the guesswork</p>
          <h1>Find the one<br/><em>before the bottle.</em></h1>
          <p className="lede">Take a two-minute scent quiz, try three intelligently matched fragrances at home, then use every dollar of your discovery set toward the full bottle you love.</p>
          <div className="hero-buttons">
            <button className="btn btn-light" onClick={() => setQuizOpen(true)}>Find my scents <Icon>↗</Icon></button>
            <button className="btn btn-ghost" onClick={() => addDiscoverySet(perfumes.slice(0, 3))}>Try a starter set</button>
          </div>
          <p className="hero-proof">3 × 2 ml samples · $18 bottle credit · Ground shipping within the contiguous U.S.</p>
        </div>
        <div className="hero-stage" aria-hidden="true">
          <div className="halo" />
          <div className="hero-bottle">
            <PerfumeBottle
              tone={heroProduct?.tone || 'rose'}
              image={heroProduct?.image}
              alt={heroProduct?.imageAlt || heroProduct?.name || 'Perfume bottle'}
            />
          </div>
          <div className="sample-vial sample-one"/><div className="sample-vial sample-two"/><div className="sample-vial sample-three"/>
        </div>
      </section>

      <section className="trust-row" aria-label="Store commitments">
        <div><strong>Authenticity guaranteed</strong><span>Sourced through trusted partners</span></div>
        <div><strong>Sample before committing</strong><span>Your set becomes bottle credit</span></div>
        <div><strong>Guest checkout</strong><span>No account required</span></div>
        <div><strong>Ground-shipping care</strong><span>Fragrance-safe fulfillment</span></div>
      </section>

      <section id="discovery" className="discovery-story" data-reveal>
        <div className="section-intro"><p className="overline dark">The easier way to buy fragrance online</p><h2>Smell it in your life,<br/>not just on a screen.</h2></div>
        <div className="journey-grid">
          <article><span>01</span><h3>Tell us what you love</h3><p>Shop for yourself or a gift. Share the moods, notes and intensity that feel right.</p></article>
          <article><span>02</span><h3>Try three at home</h3><p>Receive three 2 ml fragrances selected to create a useful, varied shortlist.</p></article>
          <article><span>03</span><h3>Choose without pressure</h3><p>Wear each scent more than once. Apply the full $18 set price toward your bottle within 45 days.</p></article>
        </div>
      </section>

      <section className="discovery-feature" data-reveal>
        <div className="discovery-art" aria-hidden="true"><div className="set-box"><span>AURELIA</span><small>PERSONAL DISCOVERY SET</small></div><div className="vial-row"><i/><i/><i/></div></div>
        <div className="discovery-copy">
          <p className="overline">Your personal discovery set</p>
          <h2>Three considered matches.<br/>One confident decision.</h2>
          <p>Each set includes three 2 ml sprays—enough to wear each fragrance several times in different settings.</p>
          <ul><li>Personalized from your quiz results</li><li>$18 credit toward an eligible full bottle</li><li>Credit delivered by email and valid for 45 days</li><li>Discovery sets are final sale; damaged items are replaced</li></ul>
          <div className="price-action"><strong>$18</strong><button className="btn btn-dark" onClick={() => setQuizOpen(true)}>Build my set <Icon>↗</Icon></button></div>
        </div>
      </section>

      <section id="collection" className="collection" data-reveal>
        <div className="collection-head"><div><p className="overline dark">Full bottles</p><h2>For when you already know.</h2></div><p>Clear descriptions, real wear guidance and verified customer language—not just a list of notes.</p></div>
        <div className="finder-row">
          <label><span className="sr-only">Search fragrances</span><Icon>⌕</Icon><input ref={searchInputRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search rose, woods, fresh, evening…"/></label>
          <div className="family-tabs" role="group" aria-label="Filter by fragrance family">{families.map((item) => <button key={item} className={family === item ? 'active' : ''} aria-pressed={family === item} onClick={() => setFamily(item)}>{item}</button>)}</div>
        </div>
        {filtered.length ? <div className="product-grid">
          {filtered.map((product) => <article className="product-card" key={product.id}>
            <button className="product-image" onClick={() => openProduct(product)} aria-label={`View ${product.name}`}>
              <div className={`product-backdrop tone-bg-${product.tone}`}/><span className="tag">{product.badge}</span><div className="bottle-wrap"><PerfumeBottle tone={product.tone} compact image={product.image} alt={product.imageAlt || product.name}/></div><span className="view-hint">Explore fragrance</span>
            </button>
            <div className="product-info"><p>{product.house}</p><h3>{product.name}</h3><span>{product.summary}</span><div className="card-review">★★★★★ <small>{product.rating} · {product.reviews} reviews</small></div><div><strong>From {money(product.sizes[0].price)}</strong><div className="product-actions"><button onClick={() => addBottle(product)}>Quick add</button><button onClick={() => openProduct(product)}>Choose size <Icon>＋</Icon></button></div></div></div>
          </article>)}
        </div> : <div className="no-results">
          <h3>No fragrances match “{search}”.</h3>
          <p>Try a different note, family or spelling.</p>
          <button className="text-button" onClick={clearFilters}>Clear search &amp; filters</button>
        </div>}
      </section>

      <section className="reviews" data-reveal>
        <div className="section-intro"><p className="overline dark">What wearers actually notice</p><h2>Descriptions from real skin,<br/>real days and real preferences.</h2></div>
        <div className="review-grid">{featuredReviews.map((product) => <blockquote key={product.id}><div>★★★★★</div><p>“{product.reviewQuote}”</p><footer><strong>{product.name}</strong><span>{product.reviewMeta}</span></footer></blockquote>)}</div>
      </section>

      <section id="gifts" className="gift-section" data-reveal>
        <div className="gift-copy"><p className="overline">Fragrance, made easier to give</p><h2>A thoughtful gift<br/>without pretending to know.</h2><p>Choose a personalized discovery set, add a message and let the recipient use the value toward the fragrance they love.</p><div className="gift-points"><span>Complimentary gift note</span><span>Price-hidden receipt</span><span>Optional gift wrap</span><span>Digital gift cards</span></div><button className="btn btn-light" onClick={() => { setQuizAnswers({0:'Gift'}); setQuizStep(1); setQuizOpen(true); }}>Find a gift <Icon>↗</Icon></button></div>
        <div className="gift-art" aria-hidden="true"><div className="gift-box"><span>AURELIA</span><i/></div></div>
      </section>

      <section id="policies" className="policies" data-reveal>
        <article><span>01</span><h3>Unopened bottles</h3><p>Eligible for return within 30 days when unused, sealed and in original condition. Return-shipping terms are shown before purchase.</p></article>
        <article><span>02</span><h3>Damaged or incorrect orders</h3><p>Contact support with photos. We replace leaking, damaged or incorrect products after verification.</p></article>
        <article><span>03</span><h3>Opened fragrance</h3><p>Opened bottles are generally not returnable for preference. Our sample-credit path is designed to prevent that costly mistake.</p></article>
        <article><span>04</span><h3>Shipping scope</h3><p>Prototype policy: ground delivery within the contiguous U.S. Final carrier, packaging and dangerous-goods rules must be approved before launch.</p></article>
      </section>
    </main>

    <footer className="site-footer">
      <div><a className="logo footer-logo" href="#top">AURELIA <span>PARFUMS</span></a><h2>Choose slowly.<br/><em>Wear confidently.</em></h2></div>
      <div className="footer-links"><a href="#discovery">Discovery sets</a><a href="#collection">Full bottles</a><a href="#gifts">Gifts</a><button onClick={() => setQuizOpen(true)}>Scent finder</button><a href="#policies">Shipping &amp; returns</a></div>
      <form className="footer-signup" onSubmit={submitSignup}>
        <label htmlFor="footer-email">Get first access to new fragrances</label>
        {signupDone ? <p className="signup-done">Thanks — we'll be in touch.</p> : <div className="signup-row">
          <input id="footer-email" type="email" required value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} placeholder="you@email.com"/>
          <button className="btn btn-light" type="submit">Sign up</button>
        </div>}
      </form>
      <p>Prototype storefront · Commerce should be connected through Shopify before accepting orders.</p>
    </footer>

    {menuOpen && <div className="overlay menu-overlay" role="dialog" aria-modal="true" aria-label="Mobile menu" ref={menuDialogRef} tabIndex={-1}><button className="close" onClick={() => setMenuOpen(false)}>×</button><nav><a onClick={() => setMenuOpen(false)} href="#discovery">Discovery sets</a><a onClick={() => setMenuOpen(false)} href="#collection">Shop fragrances</a><a onClick={() => setMenuOpen(false)} href="#gifts">Gifts</a><button onClick={() => { setMenuOpen(false); setQuizOpen(true); }}>Find your scent</button></nav></div>}

    {activeProduct && <div className="overlay modal-layer" role="dialog" aria-modal="true" aria-label={`${activeProduct.name} details`} ref={productDialogRef} tabIndex={-1}>
      <div className="product-modal">
        <button className="close" onClick={closeProduct} aria-label="Close">×</button>
        <div className={`modal-art tone-bg-${activeProduct.tone}`}><PerfumeBottle tone={activeProduct.tone} image={activeProduct.image} alt={activeProduct.imageAlt || activeProduct.name}/></div>
        <div className="modal-copy"><p className="overline dark">{activeProduct.house}</p><h2>{activeProduct.name}</h2><div className="rating">★★★★★ <span>{activeProduct.rating} from {activeProduct.reviews} reviews</span></div><p className="plain-description">{activeProduct.description}</p>
          <div className="wear-grid"><div><small>Intensity</small><strong>{activeProduct.intensity}/5</strong></div><div><small>Longevity</small><strong>{activeProduct.longevity}</strong></div><div><small>Projection</small><strong>{activeProduct.projection}</strong></div></div>
          <div className="note-pyramid"><span><small>Top</small>{activeProduct.notes.top.join(', ')}</span><span><small>Heart</small>{activeProduct.notes.heart.join(', ')}</span><span><small>Base</small>{activeProduct.notes.base.join(', ')}</span></div>
          <blockquote className="modal-review">“{activeProduct.reviewQuote}”<small>{activeProduct.reviewMeta}</small></blockquote>
          <fieldset className="size-selector"><legend>Choose size</legend>{activeProduct.sizes.map((size) => <button key={size.label} className={selectedSize === size.label ? 'selected' : ''} aria-pressed={selectedSize === size.label} onClick={() => setSelectedSize(size.label)}><span>{size.label}</span><strong>{money(size.price)}</strong></button>)}</fieldset>
          <div className="modal-actions"><button className="btn btn-dark" onClick={() => addBottle(activeProduct, selectedSize)}>Add to bag</button><button className="text-button" onClick={() => { closeProduct(); setQuizOpen(true); }}>Sample it first in a matched set</button></div>
          <p className="shipping-note">Ground-shipping availability is confirmed at checkout. Final fulfillment rules require carrier approval before production launch.</p>
          {relatedProducts.length > 0 && <div className="related-rail">
            <p className="overline dark">You may also like</p>
            <div className="related-grid">{relatedProducts.map((product) => <button key={product.id} className="related-card" onClick={() => openProduct(product)}>
              <div className={`related-art tone-bg-${product.tone}`}><PerfumeBottle tone={product.tone} compact image={product.image} alt={product.imageAlt || product.name}/></div>
              <span>{product.name}</span>
            </button>)}</div>
          </div>}
        </div>
      </div>
    </div>}

    {quizOpen && <Suspense fallback={null}>
      <QuizModal
        quizStep={quizStep}
        quizAnswers={quizAnswers}
        quizMatches={quizMatches}
        onAnswer={answerQuiz}
        onClose={closeQuiz}
        onRetake={retakeQuiz}
        onAddSet={() => { addDiscoverySet(quizMatches); closeQuiz(); }}
        dialogRef={quizDialogRef}
      />
    </Suspense>}

    {cartOpen && <div className="overlay align-right" role="dialog" aria-modal="true" aria-label="Shopping bag" ref={cartDialogRef} tabIndex={-1}><div className="cart-drawer"><div className="drawer-head"><h2>Your bag</h2><button className="close static" onClick={() => setCartOpen(false)}>×</button></div>
      {!cart.length ? <div className="empty"><h3>Nothing chosen yet.</h3><p>Start with a personalized discovery set if you are still learning what you love.</p><button className="btn btn-dark" onClick={() => {setCartOpen(false);setQuizOpen(true);}}>Find my scents</button></div> : <>
        <div className="shipping-progress"><div><strong>{shippingRemaining > 0 ? `${money(shippingRemaining)} away from complimentary ground shipping` : 'Complimentary ground shipping unlocked'}</strong><span>Contiguous U.S. only in this prototype</span></div><i><b style={{width:`${shippingProgress}%`}}/></i></div>
        <div className="cart-list">{cart.map((item) => <article key={item.key}><div className="cart-art">{item.type === 'discovery' ? <div className="mini-set">3</div> : <PerfumeBottle tone={item.tone} compact image={item.image} alt={item.name}/>}</div><div><small>{item.type === 'discovery' ? 'Discovery set' : item.house}</small><h3>{item.name}</h3><p>{item.size}</p>{item.matches && <p>{item.matches.join(' · ')}</p>}<div className="quantity"><button onClick={() => updateQuantity(item.key, -1)} aria-label={`Decrease quantity of ${item.name}`}>−</button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.key, 1)} aria-label={`Increase quantity of ${item.name}`}>＋</button></div></div><strong>{money(item.price * item.quantity)}</strong></article>)}</div>
        <div className="cart-options">
          <label>
            <input type="checkbox" checked={giftWrap} onChange={(event) => setGiftWrap(event.target.checked)} />
            {' '}Add premium gift wrap — {money(GIFT_WRAP_PRICE)}
          </label>
          <label htmlFor="gift-message">Gift message</label>
          <textarea
            id="gift-message"
            value={giftMessage}
            onChange={(event) => setGiftMessage(event.target.value)}
            placeholder="Optional message for the recipient"
          />
        </div>
        <div className="smart-pair"><p className="overline dark">A useful next step</p>{crossSell.type === 'discovery' ? <><h3>Not completely sure?</h3><p>Try three matches before opening another full bottle. The $18 becomes bottle credit.</p><button onClick={() => addDiscoverySet(perfumes.slice(0,3))}>Add discovery set — $18</button></> : <><h3>{crossSell.product.name}</h3><p>Your discovery set can lead into this full bottle once you have worn it at home.</p><button onClick={() => addBottle(crossSell.product)}>Add 50 ml — {money(crossSell.product.price)}</button></>}</div>
        <div className="checkout"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><small>Taxes and eligible ground-shipping rates are calculated in secure checkout.</small><div className="payment-badges"><span>Visa</span><span>Mastercard</span><span>Amex</span><span>Apple Pay</span><span>Shop Pay</span></div><button className="btn btn-dark" onClick={() => {setCartOpen(false);setCheckoutOpen(true);}}>Continue as guest <Icon>→</Icon></button><p>Secure production checkout should be Shopify-hosted. No account required.</p></div>
      </>}
    </div></div>}

    {checkoutOpen && <Suspense fallback={null}>
      <CheckoutPreview onClose={() => setCheckoutOpen(false)} dialogRef={checkoutDialogRef} />
    </Suspense>}
  </div>;
}

export default App;
