import React, { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { useNavigate, useLocation, matchPath } from 'react-router-dom';
import PerfumeBottle from './components/PerfumeBottle.jsx';
import Button from './components/Button.jsx';
import Dialog, { DialogClose } from './components/Dialog.jsx';
import LoadingSkeleton from './components/LoadingSkeleton.jsx';
import EmptyState from './components/EmptyState.jsx';
import ProductCard from './components/ProductCard.jsx';
import { isShopifyConfigured } from './lib/shopify.js';
import { fetchProducts, fetchProductByHandle } from './lib/shopifyProducts.js';
import {
  getOrCreateCart, addCartLine, updateCartLineQuantity, removeCartLine, setCartAttributes,
  LINE_TYPE_ATTRIBUTE_KEY, DISCOVERY_LINE_ATTRIBUTE_VALUE, GIFT_WRAP_LINE_ATTRIBUTE_VALUE, MATCHES_ATTRIBUTE_KEY
} from './lib/shopifyCart.js';
import { rankMatches, discoverySetKey, crossSellProduct } from './lib/cartLogic.js';
import { readWishlist, toggleWishlistId, writeWishlist } from './lib/wishlist.js';

// L-04 fix: the quiz and checkout-preview modals aren't needed on first
// paint, so they're split into their own chunks and only fetched when opened.
const QuizModal = lazy(() => import('./components/QuizModal.jsx'));

// These two products don't exist in Shopify yet (confirmed with the user).
// Everything that depends on them degrades gracefully — see the null checks
// around discoveryProduct/giftWrapProduct below — rather than assuming they
// exist. Create them in Shopify Admin with these exact handles (or edit the
// constants here to match whatever handles you use) to light the rest up.
const DISCOVERY_SET_HANDLE = 'discovery-set';
const GIFT_WRAP_HANDLE = 'gift-wrap';

const Icon = ({ children }) => <span aria-hidden="true">{children}</span>;
const money = (value) => `$${Number(value).toFixed(2).replace('.00', '')}`;

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
// overlay (product modal, quiz, cart drawer, mobile menu).
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

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);
  const [discoveryProduct, setDiscoveryProduct] = useState(null);
  const [giftWrapProduct, setGiftWrapProduct] = useState(null);
  const [directProduct, setDirectProduct] = useState(null);

  const [cart, setCart] = useState(null);
  const [cartLoading, setCartLoading] = useState(true);
  const [cartError, setCartError] = useState(null);
  const [mutating, setMutating] = useState(false);

  const [cartOpen, setCartOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [selectedSize, setSelectedSize] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navSolid, setNavSolid] = useState(false);
  const [giftMessage, setGiftMessage] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupDone, setSignupDone] = useState(false);
  const [wishlist, setWishlist] = useState(() => readWishlist());

  const heroRef = useRef(null);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  useReveal();

  // Load the catalog, the two optional placeholder products, and the cart
  // once on mount. Each is independent — a slow/missing discovery-set
  // product must never block the main catalog from rendering.
  useEffect(() => {
    if (!isShopifyConfigured) { setProductsLoading(false); setCartLoading(false); return undefined; }
    let cancelled = false;

    fetchProducts()
      .then((list) => { if (!cancelled) setProducts(list); })
      .catch((error) => { if (!cancelled) setProductsError(error.message); })
      .finally(() => { if (!cancelled) setProductsLoading(false); });

    fetchProductByHandle(DISCOVERY_SET_HANDLE)
      .then((product) => { if (!cancelled) setDiscoveryProduct(product); })
      .catch(() => {});

    fetchProductByHandle(GIFT_WRAP_HANDLE)
      .then((product) => { if (!cancelled) setGiftWrapProduct(product); })
      .catch(() => {});

    getOrCreateCart()
      .then((shopifyCart) => {
        if (cancelled) return;
        setCart(shopifyCart);
        setGiftMessage(shopifyCart?.attributes?.find((attribute) => attribute.key === 'Gift message')?.value || '');
      })
      .catch((error) => { if (!cancelled) setCartError(error.message); })
      .finally(() => { if (!cancelled) setCartLoading(false); });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setNavSolid(window.scrollY > 24);
      if (heroRef.current) heroRef.current.style.setProperty('--scroll', `${Math.min(window.scrollY, 650)}px`);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // H-05: product detail is driven by the route (/products/:handle) rather
  // than local state, so products are linkable/bookmarkable and Back closes
  // the modal instead of leaving the site. Shopify's real `handle` replaces
  // the old locally-generated id.
  const productMatch = useMemo(() => matchPath('/products/:handle', location.pathname), [location.pathname]);
  const handle = productMatch?.params?.handle;
  const activeProductFromList = handle ? products.find((product) => product.handle === handle) : null;

  useEffect(() => {
    if (!handle || activeProductFromList || productsLoading || !isShopifyConfigured) { setDirectProduct(null); return undefined; }
    let cancelled = false;
    fetchProductByHandle(handle)
      .then((product) => { if (!cancelled) setDirectProduct(product); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [handle, activeProductFromList, productsLoading]);

  const activeProduct = activeProductFromList || directProduct;
  const closeProduct = () => navigate('/');
  const openProduct = (product) => {
    setSelectedSize(product.sizes.find((size) => size.availableForSale)?.label || product.sizes[0]?.label || null);
    navigate(`/products/${product.handle}`);
  };

  useEffect(() => {
    document.title = activeProduct ? `${activeProduct.name} — Aurelia Parfums` : 'Aurelia — Find your signature scent';
  }, [activeProduct]);

  useEffect(() => {
    document.body.style.overflow = cartOpen || quizOpen || activeProduct || menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [cartOpen, quizOpen, activeProduct, menuOpen]);

  // Family options are derived from the real catalog instead of a fixed
  // list, so the filter and the quiz's "atmosphere" question always match
  // whatever productType values actually exist in Shopify.
  const families = useMemo(() => ['All', ...new Set(products.map((product) => product.family))], [products]);
  const familyOptions = useMemo(() => families.filter((item) => item !== 'All'), [families]);

  const filtered = products.filter((product) => {
    const searchable = [product.name, product.house, product.family, product.summary, product.description, ...(product.tags || [])]
      .join(' ')
      .toLowerCase();
    return (family === 'All' || product.family === family) && searchable.includes(search.toLowerCase());
  });

  const quizMatches = useMemo(() => rankMatches(products, quizAnswers, 3), [products, quizAnswers]);

  // Sorted by real Shopify sales (sortKey: BEST_SELLING in shopifyProducts.js)
  // — products[0] is an honest bestseller signal, not a guess. An explicit
  // "Bestseller" tag (if a merchant sets one) always wins over that signal.
  const heroProduct = useMemo(
    () => products.find((product) => product.badge === 'Bestseller') || products[0] || null,
    [products]
  );

  const relatedProducts = useMemo(() => {
    if (!activeProduct) return [];
    const sameFamily = products.filter((product) => product.id !== activeProduct.id && product.family === activeProduct.family);
    const rest = products.filter((product) => product.id !== activeProduct.id && product.family !== activeProduct.family);
    return [...sameFamily, ...rest].slice(0, 3);
  }, [activeProduct, products]);

  const itemCount = cart?.totalQuantity || 0;
  const shippingThreshold = 100;
  const subtotal = cart?.subtotal || 0;
  const shippingRemaining = Math.max(0, shippingThreshold - subtotal);
  const shippingProgress = Math.min(100, (subtotal / shippingThreshold) * 100);
  const giftWrapLine = cart?.lines.find((line) => line.type === 'gift-wrap');
  const discoveryPriceLabel = discoveryProduct ? money(discoveryProduct.price) : '$18';

  async function runCartMutation(mutation) {
    setMutating(true);
    setCartError(null);
    try {
      const updated = await mutation();
      setCart(updated);
      return updated;
    } catch (error) {
      setCartError(error.message);
      throw error;
    } finally {
      setMutating(false);
    }
  }

  const addBottle = async (product, sizeLabel) => {
    if (!cart) return;
    const variant = product.sizes.find((size) => size.label === sizeLabel) || product.sizes[0];
    if (!variant) return;
    try {
      await runCartMutation(() => addCartLine(cart.id, { merchandiseId: variant.variantId, quantity: 1 }));
      setCartOpen(true);
      closeProduct();
    } catch {
      // cartError is already set and surfaced in the cart drawer
    }
  };

  // P0 fix (#1 / Bug A), adapted for Shopify: a personalized discovery set
  // is identified by its visible "Matches" cart-line attribute rather than a
  // client-only key, so retaking the quiz and adding a different set never
  // silently merges into an existing line — and adding the *same* set twice
  // increments quantity instead of creating a duplicate line.
  const addDiscoverySet = async (matches = quizMatches) => {
    if (!cart || !discoveryProduct?.sizes?.[0] || !matches.length) return;
    const matchNames = matches.map((product) => product.name);
    const key = discoverySetKey(matchNames);
    const existingLine = cart.lines.find(
      (line) => line.type === 'discovery' && line.matches && discoverySetKey(line.matches) === key
    );
    try {
      if (existingLine) {
        await runCartMutation(() => updateCartLineQuantity(cart.id, existingLine.lineId, existingLine.quantity + 1));
      } else {
        await runCartMutation(() => addCartLine(cart.id, {
          merchandiseId: discoveryProduct.sizes[0].variantId,
          quantity: 1,
          attributes: [
            { key: LINE_TYPE_ATTRIBUTE_KEY, value: DISCOVERY_LINE_ATTRIBUTE_VALUE },
            { key: MATCHES_ATTRIBUTE_KEY, value: matchNames.join(', ') }
          ]
        }));
      }
      setCartOpen(true);
    } catch {
      // cartError is already set and surfaced in the cart drawer
    }
  };

  const updateQuantity = (line, delta) => {
    if (!cart) return;
    const newQuantity = line.quantity + delta;
    runCartMutation(() => (
      newQuantity <= 0
        ? removeCartLine(cart.id, line.lineId)
        : updateCartLineQuantity(cart.id, line.lineId, newQuantity)
    )).catch(() => {});
  };

  const toggleGiftWrap = (checked) => {
    if (!cart || !giftWrapProduct?.sizes?.[0]) return;
    runCartMutation(() => (
      checked
        ? addCartLine(cart.id, {
            merchandiseId: giftWrapProduct.sizes[0].variantId,
            quantity: 1,
            attributes: [{ key: LINE_TYPE_ATTRIBUTE_KEY, value: GIFT_WRAP_LINE_ATTRIBUTE_VALUE }]
          })
        : giftWrapLine ? removeCartLine(cart.id, giftWrapLine.lineId) : Promise.resolve(cart)
    )).catch(() => {});
  };

  const saveGiftMessage = () => {
    if (!cart) return;
    runCartMutation(() => setCartAttributes(cart.id, [{ key: 'Gift message', value: giftMessage }])).catch(() => {});
  };

  const crossSell = useMemo(() => {
    const discovery = cart?.lines.find((line) => line.type === 'discovery');
    if (discovery?.matches?.length) {
      return { type: 'bottle', product: crossSellProduct(products, discovery.matches, products[1]) };
    }
    return { type: 'discovery', product: discoveryProduct };
  }, [cart, products, discoveryProduct]);

  const focusSearch = () => {
    document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' });
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  };
  const clearFilters = () => { setSearch(''); setFamily('All'); };

  const toggleWishlist = (productId) => setWishlist((current) => {
    const next = toggleWishlistId(productId, current);
    writeWishlist(next);
    return next;
  });

  const retakeQuiz = () => {
    setQuizAnswers((current) => ({ 0: current[0] }));
    setQuizStep(1);
  };
  const closeQuiz = () => { setQuizOpen(false); setQuizStep(0); setQuizAnswers({}); };
  const answerQuiz = (value) => { setQuizAnswers((current) => ({ ...current, [quizStep]: value })); setQuizStep((step) => step + 1); };

  const menuDialogRef = useDialogA11y(menuOpen, () => setMenuOpen(false));
  const productDialogRef = useDialogA11y(Boolean(activeProduct), closeProduct);
  const quizDialogRef = useDialogA11y(quizOpen, closeQuiz);
  const cartDialogRef = useDialogA11y(cartOpen, () => setCartOpen(false));

  if (!isShopifyConfigured) {
    return <div className="site-shell">
      <header className="nav nav-solid"><a className="logo" href="#top">AURELIA <span>PARFUMS</span></a></header>
      <main id="top" className="setup-notice">
        <p className="overline dark">Setup needed</p>
        <h1 className="display">Connect Shopify to go live.</h1>
        <p>Set <code>SHOPIFY_STORE_DOMAIN</code> and <code>SHOPIFY_STOREFRONT_ACCESS_TOKEN</code> — in Vercel's Project Settings for production, or in a local <code>.env.local</code> for development (see <code>.env.example</code>) — then reload.</p>
      </main>
    </div>;
  }

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
            <Button variant="secondary" onClick={() => setQuizOpen(true)}>Find my scents <Icon>↗</Icon></Button>
            <Button variant="ghost" disabled={!discoveryProduct || products.length < 3} onClick={() => addDiscoverySet(products.slice(0, 3))}>Try a starter set</Button>
          </div>
          <p className="hero-proof">3 × 2 ml samples · {discoveryPriceLabel} bottle credit · Ground shipping within the contiguous U.S.</p>
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
          <article><span>03</span><h3>Choose without pressure</h3><p>Wear each scent more than once. Apply the full {discoveryPriceLabel} set price toward your bottle within 45 days.</p></article>
        </div>
      </section>

      <section className="discovery-feature" data-reveal>
        <div className="discovery-art" aria-hidden="true"><div className="set-box"><span>AURELIA</span><small>PERSONAL DISCOVERY SET</small></div><div className="vial-row"><i/><i/><i/></div></div>
        <div className="discovery-copy">
          <p className="overline">Your personal discovery set</p>
          <h2>Three considered matches.<br/>One confident decision.</h2>
          <p>Each set includes three 2 ml sprays—enough to wear each fragrance several times in different settings.</p>
          <ul><li>Personalized from your quiz results</li><li>{discoveryPriceLabel} credit toward an eligible full bottle</li><li>Credit delivered by email and valid for 45 days</li><li>Discovery sets are final sale; damaged items are replaced</li></ul>
          <div className="price-action"><strong>{discoveryPriceLabel}</strong><Button onClick={() => setQuizOpen(true)}>Build my set <Icon>↗</Icon></Button></div>
        </div>
      </section>

      <section id="collection" className="collection" data-reveal>
        <div className="collection-head"><div><p className="overline dark">Full bottles</p><h2>For when you already know.</h2></div><p>Clear descriptions and real product details, pulled straight from the shop.</p></div>
        <div className="finder-row">
          <label><span className="sr-only">Search fragrances</span><Icon>⌕</Icon><input ref={searchInputRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search rose, woods, fresh, evening…"/></label>
          <div className="family-tabs" role="group" aria-label="Filter by fragrance family">{families.map((item) => <button key={item} className={family === item ? 'active' : ''} aria-pressed={family === item} onClick={() => setFamily(item)}>{item}</button>)}</div>
        </div>
        {productsLoading ? <LoadingSkeleton count={6} />
          : productsError ? <EmptyState title="Couldn't load the catalog." description={productsError} />
          : filtered.length ? <div className="product-grid">
          {filtered.map((product) => <ProductCard
            key={product.id}
            product={product}
            mutating={mutating}
            wishlisted={wishlist.includes(product.id)}
            onToggleWishlist={toggleWishlist}
            onOpen={openProduct}
            onQuickAdd={(p) => addBottle(p, p.sizes.find((size) => size.availableForSale)?.label)}
          />)}
        </div> : <EmptyState
          title={`No fragrances match "${search}".`}
          description="Try a different note, family or spelling."
          action={<Button variant="text" onClick={clearFilters}>Clear search &amp; filters</Button>}
        />}
      </section>

      <section id="gifts" className="gift-section" data-reveal>
        <div className="gift-copy"><p className="overline">Fragrance, made easier to give</p><h2>A thoughtful gift<br/>without pretending to know.</h2><p>Choose a personalized discovery set, add a message and let the recipient use the value toward the fragrance they love.</p><div className="gift-points"><span>Complimentary gift note</span><span>Price-hidden receipt</span><span>Optional gift wrap</span><span>Digital gift cards</span></div><Button variant="secondary" onClick={() => { setQuizAnswers({0:'Gift'}); setQuizStep(1); setQuizOpen(true); }}>Find a gift <Icon>↗</Icon></Button></div>
        <div className="gift-art" aria-hidden="true"><div className="gift-box"><span>AURELIA</span><i/></div></div>
      </section>

      <section id="policies" className="policies" data-reveal>
        <article><span>01</span><h3>Unopened bottles</h3><p>Eligible for return within 30 days when unused, sealed and in original condition. Return-shipping terms are shown before purchase.</p></article>
        <article><span>02</span><h3>Damaged or incorrect orders</h3><p>Contact support with photos. We replace leaking, damaged or incorrect products after verification.</p></article>
        <article><span>03</span><h3>Opened fragrance</h3><p>Opened bottles are generally not returnable for preference. Our sample-credit path is designed to prevent that costly mistake.</p></article>
        <article><span>04</span><h3>Shipping scope</h3><p>Ground delivery within the contiguous U.S. Final carrier, packaging and dangerous-goods rules are configured in Shopify shipping profiles.</p></article>
      </section>
    </main>

    <footer className="site-footer">
      <div><a className="logo footer-logo" href="#top">AURELIA <span>PARFUMS</span></a><h2>Choose slowly.<br/><em>Wear confidently.</em></h2></div>
      <div className="footer-links"><a href="#discovery">Discovery sets</a><a href="#collection">Full bottles</a><a href="#gifts">Gifts</a><button onClick={() => setQuizOpen(true)}>Scent finder</button><a href="#policies">Shipping &amp; returns</a></div>
      <form className="footer-signup" onSubmit={(event) => { event.preventDefault(); if (!signupEmail.trim()) return; setSignupDone(true); setSignupEmail(''); }}>
        <label htmlFor="footer-email">Get first access to new fragrances</label>
        {signupDone ? <p className="signup-done">Thanks — we'll be in touch.</p> : <div className="signup-row">
          <input id="footer-email" type="email" required value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} placeholder="you@email.com"/>
          <Button variant="secondary" type="submit">Sign up</Button>
        </div>}
      </form>
      <p>Storefront by Aurelia Parfums · Powered by Shopify.</p>
    </footer>

    {menuOpen && <Dialog overlayClassName="menu-overlay" label="Mobile menu" dialogRef={menuDialogRef}><DialogClose onClick={() => setMenuOpen(false)} /><nav><a onClick={() => setMenuOpen(false)} href="#discovery">Discovery sets</a><a onClick={() => setMenuOpen(false)} href="#collection">Shop fragrances</a><a onClick={() => setMenuOpen(false)} href="#gifts">Gifts</a><button onClick={() => { setMenuOpen(false); setQuizOpen(true); }}>Find your scent</button></nav></Dialog>}

    {activeProduct && <Dialog overlayClassName="modal-layer" label={`${activeProduct.name} details`} dialogRef={productDialogRef}>
      <div className="product-modal">
        <DialogClose onClick={closeProduct} />
        <div className={`modal-art tone-bg-${activeProduct.tone}`}><PerfumeBottle tone={activeProduct.tone} image={activeProduct.image} alt={activeProduct.imageAlt || activeProduct.name}/></div>
        <div className="modal-copy"><p className="overline dark">{activeProduct.house}</p><h2>{activeProduct.name}</h2><p className="plain-description">{activeProduct.description}</p>
          <fieldset className="size-selector"><legend>Choose size</legend>{activeProduct.sizes.map((size) => <button key={size.variantId} disabled={!size.availableForSale} className={selectedSize === size.label ? 'selected' : ''} aria-pressed={selectedSize === size.label} onClick={() => setSelectedSize(size.label)}><span>{size.label}{!size.availableForSale ? ' · Sold out' : ''}</span><strong>{money(size.price)}</strong></button>)}</fieldset>
          <div className="modal-actions"><Button disabled={mutating || !activeProduct.sizes.some((size) => size.availableForSale)} onClick={() => addBottle(activeProduct, selectedSize)}>Add to bag</Button><Button variant="text" onClick={() => { closeProduct(); setQuizOpen(true); }}>Sample it first in a matched set</Button></div>
          <p className="shipping-note">Ground-shipping availability and delivery estimates are confirmed at checkout.</p>
          {relatedProducts.length > 0 && <div className="related-rail">
            <p className="overline dark">You may also like</p>
            <div className="related-grid">{relatedProducts.map((product) => <button key={product.id} className="related-card" onClick={() => openProduct(product)}>
              <div className={`related-art tone-bg-${product.tone}`}><PerfumeBottle tone={product.tone} compact image={product.image} alt={product.imageAlt || product.name}/></div>
              <span>{product.name}</span>
            </button>)}</div>
          </div>}
        </div>
      </div>
    </Dialog>}

    {quizOpen && <Suspense fallback={null}>
      <QuizModal
        quizStep={quizStep}
        quizAnswers={quizAnswers}
        quizMatches={quizMatches}
        familyOptions={familyOptions}
        discoveryPrice={discoveryProduct?.price ?? null}
        onAnswer={answerQuiz}
        onClose={closeQuiz}
        onRetake={retakeQuiz}
        onAddSet={() => { addDiscoverySet(quizMatches); closeQuiz(); }}
        dialogRef={quizDialogRef}
      />
    </Suspense>}

    {cartOpen && <Dialog overlayClassName="align-right" label="Shopping bag" dialogRef={cartDialogRef}><div className="cart-drawer"><div className="drawer-head"><h2>Your bag</h2><DialogClose onClick={() => setCartOpen(false)} className="static" /></div>
      {cartError && <p className="cart-error">{cartError}</p>}
      {cartLoading ? <EmptyState className="empty" title="Loading your bag…" /> : !cart?.lines?.length ? <EmptyState className="empty" title="Nothing chosen yet." description="Start with a personalized discovery set if you are still learning what you love." action={<Button onClick={() => {setCartOpen(false);setQuizOpen(true);}}>Find my scents</Button>} /> : <>
        <div className="shipping-progress"><div><strong>{shippingRemaining > 0 ? `${money(shippingRemaining)} away from complimentary ground shipping` : 'Complimentary ground shipping unlocked'}</strong><span>Contiguous U.S. only</span></div><i><b style={{width:`${shippingProgress}%`}}/></i></div>
        <div className="cart-list">{cart.lines.map((line) => <article key={line.lineId}><div className="cart-art">{line.type === 'discovery' ? <div className="mini-set">3</div> : line.type === 'gift-wrap' ? <div className="mini-set" aria-hidden="true">GW</div> : <PerfumeBottle tone="rose" compact image={line.image} alt={line.imageAlt || line.name}/>}</div><div><small>{line.type === 'discovery' ? 'Discovery set' : line.type === 'gift-wrap' ? 'Gift wrap' : line.name}</small><h3>{line.type === 'discovery' ? 'Personal discovery set' : line.name}</h3><p>{line.size}</p>{line.matches && <p>{line.matches.join(' · ')}</p>}{line.type !== 'gift-wrap' && <div className="quantity"><button onClick={() => updateQuantity(line, -1)} aria-label={`Decrease quantity of ${line.name}`}>−</button><span>{line.quantity}</span><button onClick={() => updateQuantity(line, 1)} aria-label={`Increase quantity of ${line.name}`}>＋</button></div>}</div><strong>{money(line.lineTotal)}</strong></article>)}</div>
        <div className="cart-options">
          <label>
            <input type="checkbox" checked={Boolean(giftWrapLine)} disabled={!giftWrapProduct || mutating} onChange={(event) => toggleGiftWrap(event.target.checked)} />
            {' '}{giftWrapProduct ? `Add premium gift wrap — ${money(giftWrapProduct.price)}` : 'Premium gift wrap (coming soon)'}
          </label>
          <label htmlFor="gift-message">Gift message</label>
          <textarea
            id="gift-message"
            value={giftMessage}
            onChange={(event) => setGiftMessage(event.target.value)}
            onBlur={saveGiftMessage}
            placeholder="Optional message for the recipient"
          />
        </div>
        {crossSell.product && <div className="smart-pair"><p className="overline dark">A useful next step</p>{crossSell.type === 'discovery' ? <><h3>Not completely sure?</h3><p>Try three matches before opening another full bottle. The {money(crossSell.product.price)} becomes bottle credit.</p><button disabled={mutating} onClick={() => addDiscoverySet(products.slice(0,3))}>Add discovery set — {money(crossSell.product.price)}</button></> : <><h3>{crossSell.product.name}</h3><p>Your discovery set can lead into this full bottle once you have worn it at home.</p><button disabled={mutating} onClick={() => addBottle(crossSell.product, crossSell.product.sizes[0]?.label)}>Add {crossSell.product.sizes[0]?.label} — {money(crossSell.product.price)}</button></>}</div>}
        <div className="checkout"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><small>Taxes and eligible ground-shipping rates are calculated at checkout.</small><div className="payment-badges"><span>Visa</span><span>Mastercard</span><span>Amex</span><span>Apple Pay</span><span>Shop Pay</span></div><Button href={cart?.checkoutUrl || undefined} style={{opacity: cart?.checkoutUrl ? 1 : .5, pointerEvents: cart?.checkoutUrl ? 'auto' : 'none'}}>Checkout <Icon>→</Icon></Button><p>Secure checkout is hosted by Shopify. No account required.</p></div>
      </>}
    </div></Dialog>}
  </div>;
}

export default App;
