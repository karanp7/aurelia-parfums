import React, { useEffect, useMemo, useRef, useState } from 'react';
import { discoverySet, perfumes } from './data/perfumes.js';
import PerfumeBottle from './components/PerfumeBottle.jsx';
import { GIFT_WRAP_PRICE, rankMatches, discoverySetKey, crossSellProduct, computeSubtotal } from './lib/cartLogic.js';

const families = ['All', 'Floral', 'Woody', 'Fresh', 'Gourmand', 'Fruity'];
// P1 fix (#6): every mood a product in the catalog can carry must be offered
// as a quiz answer, or that product can never reach a full match score.
// Magnetic (Midnight Fig) and Romantic (Rose Obscura) were previously missing.
const MOOD_OPTIONS = ['Elegant', 'Confident', 'Energizing', 'Comforting', 'Magnetic', 'Romantic'];
const Icon = ({ children }) => <span aria-hidden="true">{children}</span>;
const money = (value) => `$${value.toFixed(2).replace('.00', '')}`;

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
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [activeProduct, setActiveProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('50 ml');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navSolid, setNavSolid] = useState(false);
  // P1 fix (#5): gift wrap and gift message are now real state, priced into
  // the subtotal, and persist while the cart opens/closes.
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftMessage, setGiftMessage] = useState('');
  const heroRef = useRef(null);
  useReveal();

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
    setActiveProduct(null);
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

  const openProduct = (product) => { setSelectedSize('50 ml'); setActiveProduct(product); };

  // P1 fix (#12): "Retake quiz" from the result screen used to reset every
  // answer, including the Myself/Gift choice from step 0. Now it preserves
  // that first answer and only resets the preference questions.
  const retakeQuiz = () => {
    setQuizAnswers((current) => ({ 0: current[0] }));
    setQuizStep(1);
  };
  const closeQuiz = () => { setQuizOpen(false); setQuizStep(0); setQuizAnswers({}); };
  const answerQuiz = (value) => { setQuizAnswers((current) => ({ ...current, [quizStep]: value })); setQuizStep((step) => step + 1); };

  // The hero's bouncing bottle previously always rendered the illustrated
  // placeholder (tone="rose", no image), regardless of the catalog. It now
  // shows whichever product is tagged "Bestseller" in the Excel `Badge`
  // column, falling back to the highest-rated / most-reviewed product if no
  // row is marked that way, so uploaded product photos actually appear here.
  const heroProduct = useMemo(() => {
    const bestseller = perfumes.find((product) => product.badge?.toLowerCase() === 'bestseller');
    if (bestseller) return bestseller;
    return [...perfumes].sort((a, b) => (b.rating - a.rating) || (b.reviews - a.reviews))[0] || null;
  }, []);

  const menuDialogRef = useDialogA11y(menuOpen, () => setMenuOpen(false));
  const productDialogRef = useDialogA11y(Boolean(activeProduct), () => setActiveProduct(null));
  const quizDialogRef = useDialogA11y(quizOpen, closeQuiz);
  const cartDialogRef = useDialogA11y(cartOpen, () => setCartOpen(false));
  const checkoutDialogRef = useDialogA11y(checkoutOpen, () => setCheckoutOpen(false));

  return <div className="site-shell">
    <header className={`nav ${navSolid ? 'nav-solid' : ''}`}>
      <button className="nav-icon" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Icon>☰</Icon></button>
      <a className="logo" href="#top">AURELIA <span>PARFUMS</span></a>
      <nav aria-label="Primary"><a href="#discovery">Discovery sets</a><a href="#collection">Shop</a><a href="#gifts">Gifts</a><button onClick={() => setQuizOpen(true)}>Find your scent</button></nav>
      <button className="bag" onClick={() => setCartOpen(true)} aria-label={`Open bag with ${itemCount} items`}><Icon>◇</Icon><span>Bag</span>{itemCount > 0 && <b>{itemCount}</b>}</button>
    </header>

    <main id="top">
      <section ref={heroRef} className="hero-cinematic">
        <div className="hero-light" aria-hidden="true" />
        <div className="hero-copy">
          <p className="overline">Fragrance without the guesswork</p>
          <h1>Find the one<br/><em>before the bottle.</em></h1>
          <p className="lede">Take a two-minute scent quiz, try three intelligently matched fragrances at home, then use every dollar of your discovery set toward the full bottle you love.</p>
          <div className="hero-buttons">
            <button className="btn btn-light" onClick={() => setQuizOpen(true)}>Find my scents <Icon>↗</Icon></button>
            <button className="btn btn-ghost" onClick={() => addDiscoverySet(perfumes.slice(0, 3))}>Try a discovery set</button>
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
          <label><span className="sr-only">Search fragrances</span><Icon>⌕</Icon><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search rose, woods, fresh, evening…"/></label>
          <div className="family-tabs" role="group" aria-label="Filter by fragrance family">{families.map((item) => <button key={item} className={family === item ? 'active' : ''} aria-pressed={family === item} onClick={() => setFamily(item)}>{item}</button>)}</div>
        </div>
        <div className="product-grid">
          {filtered.map((product) => <article className="product-card" key={product.id}>
            <button className="product-image" onClick={() => openProduct(product)} aria-label={`View ${product.name}`}>
              <div className={`product-backdrop tone-bg-${product.tone}`}/><span className="tag">{product.badge}</span><div className="bottle-wrap"><PerfumeBottle tone={product.tone} compact image={product.image} alt={product.imageAlt || product.name}/></div><span className="view-hint">Explore fragrance</span>
            </button>
            <div className="product-info"><p>{product.house}</p><h3>{product.name}</h3><span>{product.summary}</span><div className="card-review">★★★★★ <small>{product.rating} · {product.reviews} reviews</small></div><div><strong>From {money(product.sizes[0].price)}</strong><button onClick={() => openProduct(product)}>Choose size <Icon>＋</Icon></button></div></div>
          </article>)}
        </div>
      </section>

      <section className="reviews" data-reveal>
        <div className="section-intro"><p className="overline dark">What wearers actually notice</p><h2>Descriptions from real skin,<br/>real days and real preferences.</h2></div>
        <div className="review-grid">{perfumes.slice(0, 3).map((product) => <blockquote key={product.id}><div>★★★★★</div><p>“{product.reviewQuote}”</p><footer><strong>{product.name}</strong><span>{product.reviewMeta}</span></footer></blockquote>)}</div>
      </section>

      <section id="gifts" className="gift-section" data-reveal>
        <div className="gift-copy"><p className="overline">Fragrance, made easier to give</p><h2>A thoughtful gift<br/>without pretending to know.</h2><p>Choose a personalized discovery set, add a message and let the recipient use the value toward the fragrance they love.</p><div className="gift-points"><span>Complimentary gift note</span><span>Price-hidden receipt</span><span>Optional gift wrap</span><span>Digital gift cards</span></div><button className="btn btn-light" onClick={() => { setQuizAnswers({0:'Gift'}); setQuizStep(1); setQuizOpen(true); }}>Find a gift <Icon>↗</Icon></button></div>
        <div className="gift-art" aria-hidden="true"><div className="gift-box"><span>AURELIA</span><i/></div></div>
      </section>

      <section className="policies" data-reveal>
        <article><span>01</span><h3>Unopened bottles</h3><p>Eligible for return within 30 days when unused, sealed and in original condition. Return-shipping terms are shown before purchase.</p></article>
        <article><span>02</span><h3>Damaged or incorrect orders</h3><p>Contact support with photos. We replace leaking, damaged or incorrect products after verification.</p></article>
        <article><span>03</span><h3>Opened fragrance</h3><p>Opened bottles are generally not returnable for preference. Our sample-credit path is designed to prevent that costly mistake.</p></article>
        <article><span>04</span><h3>Shipping scope</h3><p>Prototype policy: ground delivery within the contiguous U.S. Final carrier, packaging and dangerous-goods rules must be approved before launch.</p></article>
      </section>
    </main>

    <footer className="site-footer"><div><a className="logo footer-logo" href="#top">AURELIA <span>PARFUMS</span></a><h2>Choose slowly.<br/><em>Wear confidently.</em></h2></div><div className="footer-links"><a href="#discovery">Discovery sets</a><a href="#collection">Full bottles</a><a href="#gifts">Gifts</a><button onClick={() => setQuizOpen(true)}>Scent finder</button><a href="#top">Shipping & returns</a></div><p>Prototype storefront · Commerce should be connected through Shopify before accepting orders.</p></footer>

    {menuOpen && <div className="overlay menu-overlay" role="dialog" aria-modal="true" aria-label="Mobile menu" ref={menuDialogRef} tabIndex={-1}><button className="close" onClick={() => setMenuOpen(false)}>×</button><nav><a onClick={() => setMenuOpen(false)} href="#discovery">Discovery sets</a><a onClick={() => setMenuOpen(false)} href="#collection">Shop fragrances</a><a onClick={() => setMenuOpen(false)} href="#gifts">Gifts</a><button onClick={() => { setMenuOpen(false); setQuizOpen(true); }}>Find your scent</button></nav></div>}

    {activeProduct && <div className="overlay modal-layer" role="dialog" aria-modal="true" aria-label={`${activeProduct.name} details`} ref={productDialogRef} tabIndex={-1}>
      <div className="product-modal">
        <button className="close" onClick={() => setActiveProduct(null)} aria-label="Close">×</button>
        <div className={`modal-art tone-bg-${activeProduct.tone}`}><PerfumeBottle tone={activeProduct.tone} image={activeProduct.image} alt={activeProduct.imageAlt || activeProduct.name}/></div>
        <div className="modal-copy"><p className="overline dark">{activeProduct.house}</p><h2>{activeProduct.name}</h2><div className="rating">★★★★★ <span>{activeProduct.rating} from {activeProduct.reviews} reviews</span></div><p className="plain-description">{activeProduct.description}</p>
          <div className="wear-grid"><div><small>Intensity</small><strong>{activeProduct.intensity}/5</strong></div><div><small>Longevity</small><strong>{activeProduct.longevity}</strong></div><div><small>Projection</small><strong>{activeProduct.projection}</strong></div></div>
          <div className="note-pyramid"><span><small>Top</small>{activeProduct.notes.top.join(', ')}</span><span><small>Heart</small>{activeProduct.notes.heart.join(', ')}</span><span><small>Base</small>{activeProduct.notes.base.join(', ')}</span></div>
          <blockquote className="modal-review">“{activeProduct.reviewQuote}”<small>{activeProduct.reviewMeta}</small></blockquote>
          <fieldset className="size-selector"><legend>Choose size</legend>{activeProduct.sizes.map((size) => <button key={size.label} className={selectedSize === size.label ? 'selected' : ''} aria-pressed={selectedSize === size.label} onClick={() => setSelectedSize(size.label)}><span>{size.label}</span><strong>{money(size.price)}</strong></button>)}</fieldset>
          <div className="modal-actions"><button className="btn btn-dark" onClick={() => addBottle(activeProduct, selectedSize)}>Add to bag</button><button className="text-button" onClick={() => { setActiveProduct(null); setQuizOpen(true); }}>Sample it first in a matched set</button></div>
          <p className="shipping-note">Ground-shipping availability is confirmed at checkout. Final fulfillment rules require carrier approval before production launch.</p>
        </div>
      </div>
    </div>}

    {quizOpen && <div className="overlay quiz-layer" role="dialog" aria-modal="true" aria-label="Scent finder" ref={quizDialogRef} tabIndex={-1}>
      <div className="quiz-modal"><button className="close" onClick={closeQuiz} aria-label="Close quiz">×</button><div className="quiz-progress"><span style={{ width: `${Math.min(100, ((quizStep + 1) / 5) * 100)}%` }}/></div>
        {quizStep === 0 && <QuizQuestion eyebrow="First, who is this for?" title="Are you choosing for yourself or someone else?" options={['Myself', 'Gift']} onAnswer={answerQuiz}/>} 
        {quizStep === 1 && <QuizQuestion eyebrow="The atmosphere" title="Which direction feels most natural?" options={['Floral', 'Woody', 'Fresh', 'Gourmand']} onAnswer={answerQuiz}/>} 
        {quizStep === 2 && <QuizQuestion eyebrow="The feeling" title="How should the fragrance make them feel?" options={MOOD_OPTIONS} onAnswer={answerQuiz}/>} 
        {quizStep === 3 && <QuizQuestion eyebrow="The presence" title="How noticeable should it be?" options={['Soft', 'Balanced', 'Bold']} onAnswer={answerQuiz}/>} 
        {quizStep >= 4 && <div className="quiz-result"><p className="overline dark">Your three-scent edit</p><h2>{quizAnswers[0] === 'Gift' ? 'A thoughtful shortlist.' : 'Try these on your skin.'}</h2><p>Varied enough to learn from, connected enough to feel personal.</p><div className="result-grid">{quizMatches.map((product, index) => <article key={product.id}><span>{index === 0 ? 'Strongest match' : index === 1 ? 'Softer alternative' : 'More adventurous'}</span><div className={`mini-art tone-bg-${product.tone}`}><PerfumeBottle tone={product.tone} compact image={product.image} alt={product.imageAlt || product.name}/></div><h3>{product.name}</h3><p>{product.summary}</p></article>)}</div><button className="btn btn-dark full" onClick={() => { addDiscoverySet(quizMatches); closeQuiz(); }}>Try all three — $18</button><button className="retake" onClick={retakeQuiz}>Retake quiz</button></div>}
      </div>
    </div>}

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
        <div className="checkout"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><small>Taxes and eligible ground-shipping rates are calculated in secure checkout.</small><button className="btn btn-dark" onClick={() => {setCartOpen(false);setCheckoutOpen(true);}}>Continue as guest <Icon>→</Icon></button><p>Secure production checkout should be Shopify-hosted. No account required.</p></div>
      </>}
    </div></div>}

    {checkoutOpen && <div className="overlay modal-layer" role="dialog" aria-modal="true" aria-label="Checkout integration preview" ref={checkoutDialogRef} tabIndex={-1}><div className="checkout-preview"><button className="close" onClick={() => setCheckoutOpen(false)}>×</button><p className="overline dark">Prototype boundary</p><h2>Connect this button to Shopify Checkout.</h2><p>The visual storefront is ready to hand off cart lines, variants, gift attributes and discovery-credit codes. Production payment, taxes, inventory, fraud checks, shipping restrictions and orders should be handled by Shopify.</p><div className="flow"><span>Storefront cart</span><i>→</i><span>Shopify checkout</span><i>→</i><span>Shopify Admin orders</span></div><ul><li>Guest checkout enabled</li><li>Orders visible in Shopify mobile and desktop admin</li><li>Ground-only shipping profiles for fragrance products</li><li>Packing slips, labels, tracking and customer emails</li></ul><button className="btn btn-dark full" onClick={() => setCheckoutOpen(false)}>Return to prototype</button></div></div>}
  </div>;
}

function QuizQuestion({ eyebrow, title, options, onAnswer }) {
  return <div className="quiz-question"><p className="overline dark">{eyebrow}</p><h2>{title}</h2><div>{options.map((option) => <button key={option} onClick={() => onAnswer(option)}><span>{option}</span><Icon>→</Icon></button>)}</div></div>;
}

export default App;
