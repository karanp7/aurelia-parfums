import React, { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { useNavigate, useLocation, matchPath } from 'react-router-dom';
import PerfumeBottle from './components/PerfumeBottle.jsx';
import Button from './components/Button.jsx';
import Dialog, { DialogClose } from './components/Dialog.jsx';
import LoadingSkeleton, { CollectionHeaderSkeleton, FilterBarSkeleton } from './components/LoadingSkeleton.jsx';
import EmptyState from './components/EmptyState.jsx';
import ProductCard from './components/ProductCard.jsx';
import FilterBar, { PRICE_BUCKETS } from './components/FilterBar.jsx';
import FilterDrawer from './components/FilterDrawer.jsx';
import { isShopifyConfigured } from './lib/shopify.js';
import { fetchProducts, fetchProductByHandle } from './lib/shopifyProducts.js';
import {
  getOrCreateCart, addCartLine, updateCartLineQuantity, removeCartLine, setCartAttributes,
  LINE_TYPE_ATTRIBUTE_KEY, DISCOVERY_LINE_ATTRIBUTE_VALUE, GIFT_WRAP_LINE_ATTRIBUTE_VALUE, MATCHES_ATTRIBUTE_KEY
} from './lib/shopifyCart.js';
import { rankMatches, discoverySetKey, crossSellProduct } from './lib/cartLogic.js';
import { readWishlist, toggleWishlistId, writeWishlist } from './lib/wishlist.js';
import { readRecentlyViewed, recordView, writeRecentlyViewed } from './lib/recentlyViewed.js';

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

// Discovery Set's business model isn't finalized — every purchase entry
// point (hero CTA, homepage section, quiz result, cart cross-sell) is gated
// behind this single flag rather than deleted, so re-enabling later is one
// line instead of reconstructing four separate UI call sites. The Shopify
// cart-line/attribute plumbing for it (addDiscoverySet, shopifyCart.js)
// stays fully intact either way. The Scent Finder quiz itself is unaffected —
// it's the recommendation engine, not the disabled purchase mechanic.
const DISCOVERY_COMMERCE_ENABLED = false;

// Shop by Mood: no separate "occasion" data exists in Shopify, so each tile
// reuses the existing search/filter mechanism rather than needing new data
// plumbing — clicking one just searches the catalog for that word (matching
// whatever real products' tags/descriptions happen to reference it) and
// scrolls to the shop grid. Tones reuse the same six decorative colors the
// product cards already use, just for a different (non-product) surface.
// Sort options map straight onto Shopify's own productSortKeys/reverse args
// (see fetchProducts in shopifyProducts.js) - real server-side ordering,
// not a client-invented ranking. "Highest Rated"/"Most Popular" are left
// out: there's no real rating data anywhere in this Shopify integration,
// and "Most Popular" would just be a second name for Best Sellers.
const SORT_OPTIONS = {
  'best-selling': { label: 'Best Sellers', sortKey: 'BEST_SELLING', reverse: false },
  newest: { label: 'Newest', sortKey: 'CREATED', reverse: true },
  'price-asc': { label: 'Price: Low to High', sortKey: 'PRICE', reverse: false },
  'price-desc': { label: 'Price: High to Low', sortKey: 'PRICE', reverse: true },
  alphabetical: { label: 'Alphabetical (A–Z)', sortKey: 'TITLE', reverse: false }
};

const MOOD_TILES = [
  { label: 'Date Night', tone: 'plum' },
  { label: 'Everyday', tone: 'cream' },
  { label: 'Office', tone: 'blue' },
  { label: 'Summer', tone: 'amber' },
  { label: 'Winter', tone: 'rose' },
  { label: 'Special Occasions', tone: 'red' }
];

// Structural shells only — no real reviews app or Instagram feed is
// connected yet, so these stay empty until real content exists rather than
// shipping fabricated quotes or lifestyle photography. The wrapper section
// still always mounts (see the always-mount pattern used for Featured
// Brands) so useReveal's one-time querySelectorAll finds it.
const testimonials = [];
const instagramPosts = [];

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

// Small self-contained dropdown for the nav's "Shop" item — Escape and a
// click outside both close it, matching the spirit of useDialogA11y above
// without the full focus-trap machinery a real modal needs (a dropdown menu
// is dismissable, not modal).
function ShopDropdown({ open, onToggle, onClose, onShopNew }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    const onClickOutside = (event) => { if (ref.current && !ref.current.contains(event.target)) onClose(); };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [open, onClose]);

  return (
    <div className="shop-dropdown" ref={ref}>
      <button aria-haspopup="true" aria-expanded={open} onClick={onToggle}>Shop <span aria-hidden="true">▾</span></button>
      {open && <div className="shop-dropdown-menu" role="menu">
        <a role="menuitem" href="#collection" onClick={onClose}>All Fragrances</a>
        <a role="menuitem" href="#best-sellers" onClick={onClose}>Best Sellers</a>
        <button role="menuitem" onClick={onShopNew}>New Arrivals</button>
        <a role="menuitem" href="#gifts" onClick={onClose}>Gifts</a>
      </div>}
    </div>
  );
}

function App() {
  const [family, setFamily] = useState('All');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('best-selling');
  const [brand, setBrand] = useState('All');
  const [priceBucket, setPriceBucket] = useState('all');
  const [availabilityOnly, setAvailabilityOnly] = useState(false);
  const [sizeFilter, setSizeFilter] = useState('All');

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
  const [discoveryWaitlistEmail, setDiscoveryWaitlistEmail] = useState('');
  const [discoveryWaitlistDone, setDiscoveryWaitlistDone] = useState(false);
  const [wishlist, setWishlist] = useState(() => readWishlist());
  const [recentlyViewed, setRecentlyViewed] = useState(() => readRecentlyViewed());
  const [wishlistFilterOn, setWishlistFilterOn] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [shopMenuOpen, setShopMenuOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const heroRef = useRef(null);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  useReveal();

  // Sort changes (including the initial mount) refetch straight from
  // Shopify with the matching sortKey/reverse rather than re-sorting
  // client-side — keeps every sort option, including the default Best
  // Sellers, backed by Shopify's own real ordering.
  useEffect(() => {
    if (!isShopifyConfigured) { setProductsLoading(false); return undefined; }
    let cancelled = false;
    setProductsLoading(true);
    const { sortKey, reverse } = SORT_OPTIONS[sort];

    fetchProducts({ sortKey, reverse })
      .then((list) => { if (!cancelled) setProducts(list); })
      .catch((error) => { if (!cancelled) setProductsError(error.message); })
      .finally(() => { if (!cancelled) setProductsLoading(false); });

    return () => { cancelled = true; };
  }, [sort]);

  // Load the two optional placeholder products and the cart once on mount.
  // Each is independent — a slow/missing discovery-set product must never
  // block the main catalog from rendering.
  useEffect(() => {
    if (!isShopifyConfigured) { setCartLoading(false); return undefined; }
    let cancelled = false;

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

  // Records a view however the product detail was reached — grid click,
  // quiz result, related-products rail, or a direct /products/:handle
  // visit — since `activeProduct` resolves the same way for all of them.
  useEffect(() => {
    if (!activeProduct?.id) return;
    setRecentlyViewed((prev) => {
      const next = recordView(activeProduct.id, prev);
      writeRecentlyViewed(next);
      return next;
    });
  }, [activeProduct?.id]);

  useEffect(() => {
    document.body.style.overflow = cartOpen || quizOpen || activeProduct || menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [cartOpen, quizOpen, activeProduct, menuOpen]);

  // Family options are derived from the real catalog instead of a fixed
  // list, so the filter and the quiz's "atmosphere" question always match
  // whatever productType values actually exist in Shopify.
  const families = useMemo(() => ['All', ...new Set(products.map((product) => product.family))], [products]);
  const familyOptions = useMemo(() => families.filter((item) => item !== 'All'), [families]);

  // Brand and Size options, same "derive from the real catalog" pattern as
  // family above — never a fixed/guessed list.
  const brandOptions = useMemo(() => [...new Set(products.map((product) => product.house))].sort(), [products]);
  const sizeOptions = useMemo(() => [...new Set(products.flatMap((product) => product.sizes.map((size) => size.label)))], [products]);

  // Resolves stored ids against the live catalog (drops any id no longer
  // in `products` - e.g. a delisted product) rather than caching stale
  // product data in localStorage alongside the ids.
  const recentlyViewedProducts = useMemo(
    () => recentlyViewed.map((id) => products.find((product) => product.id === id)).filter(Boolean),
    [recentlyViewed, products]
  );

  // Real, not fabricated: driven by the actual `family` filter (Shopify
  // productType) rather than inventing a separate page per marketing
  // category — "Woody Fragrances" only ever appears if products in that
  // real family exist in the catalog.
  const collectionHeading = family === 'All' ? 'All Fragrances' : `${family} Fragrances`;

  // Only the very first fetch has nothing real to show for the header/filter
  // bar (their content - family/brand/size options - is itself derived from
  // `products`). A later sort-triggered refetch keeps them visible and only
  // re-skeletons the grid, so re-sorting doesn't flash the whole section.
  const firstLoad = productsLoading && products.length === 0;

  // Real count of active filters (excludes search, which has its own
  // always-visible input) - shown as a badge on the mobile "Filters"
  // trigger so users know something is applied without opening the drawer.
  const activeFilterCount = [family !== 'All', brand !== 'All', priceBucket !== 'all', availabilityOnly, sizeFilter !== 'All'].filter(Boolean).length;

  const filtered = useMemo(() => products.filter((product) => {
    const searchable = [product.name, product.house, product.family, product.summary, product.description, ...(product.tags || [])]
      .join(' ')
      .toLowerCase();
    const matchesWishlist = !wishlistFilterOn || wishlist.includes(product.id);
    const matchesBrand = brand === 'All' || product.house === brand;
    const matchesAvailability = !availabilityOnly || product.availableForSale;
    const matchesSize = sizeFilter === 'All' || product.sizes.some((size) => size.label === sizeFilter);
    const matchesPrice = PRICE_BUCKETS.find((bucket) => bucket.value === priceBucket)?.test(product.price) ?? true;
    return (family === 'All' || product.family === family)
      && searchable.includes(search.toLowerCase())
      && matchesWishlist && matchesBrand && matchesAvailability && matchesSize && matchesPrice;
  }), [products, family, search, wishlistFilterOn, wishlist, brand, availabilityOnly, sizeFilter, priceBucket]);

  // Reset pagination whenever the result set's composition changes, so
  // switching filters never leaves the grid stuck deep in a stale "show
  // more" state from a previous, larger result set.
  useEffect(() => { setVisibleCount(12); }, [family, search, brand, priceBucket, availabilityOnly, sizeFilter, sort, wishlistFilterOn]);

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

  // Featured Brands: derived from real Shopify vendor values, not a
  // hardcoded list. Uses `vendorRaw` (null when unset) rather than the
  // store-name-coalesced `house`, so Aurelia Parfums itself never shows up
  // as if it were a resold designer brand. Normalizes casing/whitespace
  // before deduping (free-text field — "Chanel" vs "CHANEL " would
  // otherwise double-count) and hides below 3 distinct real vendors rather
  // than rendering an awkward 1-2-tile row.
  const featuredBrands = useMemo(() => {
    const seen = new Map();
    products.forEach((product) => {
      const trimmed = product.vendorRaw?.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) seen.set(key, trimmed);
    });
    return [...seen.values()];
  }, [products]);

  // Best Sellers: reuses the already-fetched `products` array (no new
  // fetch) — an explicit "Bestseller" tag wins a slot first, the rest fill
  // from the front of the list, which is already real-sales-ordered via
  // sortKey: BEST_SELLING in shopifyProducts.js. Never a separate curated
  // list to fall out of sync with the actual catalog.
  const bestSellers = useMemo(() => {
    const tagged = products.filter((product) => product.badge === 'Bestseller');
    const rest = products.filter((product) => product.badge !== 'Bestseller');
    return [...tagged, ...rest].slice(0, 5);
  }, [products]);

  const shopByTerm = (term) => {
    setSearch(term);
    setFamily('All');
    document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' });
  };

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

  // Discovery-set cross-sell only ever suggests a real bottle to follow up a
  // *pre-existing* discovery-set cart line (e.g. one added before commerce
  // for it was disabled). It deliberately never falls back to suggesting a
  // fresh discovery-set purchase when DISCOVERY_COMMERCE_ENABLED is off —
  // that fallback used to be the cart drawer's default state for any cart
  // with no discovery line, which would have silently reintroduced the exact
  // purchase path the four other entry points are being gated to remove.
  const crossSell = useMemo(() => {
    const discovery = cart?.lines.find((line) => line.type === 'discovery');
    if (discovery?.matches?.length) {
      return { type: 'bottle', product: crossSellProduct(products, discovery.matches, products[1]) };
    }
    if (DISCOVERY_COMMERCE_ENABLED) {
      return { type: 'discovery', product: discoveryProduct };
    }
    return { type: null, product: null };
  }, [cart, products, discoveryProduct]);

  const focusSearch = () => {
    document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' });
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  };
  // Split so the mobile filter drawer's "Clear all" can reset just the
  // filter facets without also wiping the search box it doesn't contain
  // (that would reset text the user can still see and is still typing in).
  const clearFilterFacets = () => {
    setFamily('All'); setBrand('All'); setPriceBucket('all'); setAvailabilityOnly(false); setSizeFilter('All');
  };
  const clearFilters = () => { setSearch(''); clearFilterFacets(); };

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
  const filterDrawerDialogRef = useDialogA11y(filterDrawerOpen, () => setFilterDrawerOpen(false));

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
    <div className="announcement-bar">
      <span>100% Authentic Guarantee</span>
      <span>Free Shipping on Orders $100+</span>
      <span>Easy Returns Within 30 Days</span>
    </div>
    <header className={`nav ${navSolid ? 'nav-solid' : ''}`}>
      <button className="nav-icon" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Icon>☰</Icon></button>
      <a className="logo" href="#top">AURELIA <span>PARFUMS</span></a>
      <nav aria-label="Primary">
        <ShopDropdown
          open={shopMenuOpen}
          onToggle={() => setShopMenuOpen((open) => !open)}
          onClose={() => setShopMenuOpen(false)}
          onShopNew={() => { shopByTerm('New'); setShopMenuOpen(false); }}
        />
        <a href="#best-sellers">Best Sellers</a>
        <button onClick={() => setQuizOpen(true)}>Scent Finder</button>
        <a href="#featured-brands">Brands</a>
        <a href="#discovery">Discovery Sets</a>
        <a href="#gifts">Gifts</a>
      </nav>
      <div className="nav-actions">
        <button className="icon-btn" aria-label="Search fragrances" onClick={focusSearch}><Icon>⌕</Icon></button>
        <button
          className={`icon-btn${wishlistFilterOn ? ' active' : ''}`}
          aria-label={wishlistFilterOn ? 'Show all fragrances' : 'Show saved fragrances'}
          aria-pressed={wishlistFilterOn}
          onClick={() => { setWishlistFilterOn((on) => !on); document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' }); }}
        ><Icon>{wishlistFilterOn ? '♥' : '♡'}</Icon></button>
        <button className="bag" onClick={() => setCartOpen(true)} aria-label={`Open bag with ${itemCount} items`}><Icon>◇</Icon><span>Bag</span>{itemCount > 0 && <b>{itemCount}</b>}</button>
      </div>
    </header>

    <main id="top" tabIndex={-1}>
      <section ref={heroRef} className="hero-cinematic">
        <div className="hero-light" aria-hidden="true" />
        <div className="hero-copy">
          <p className="overline">Find your signature</p>
          <h1>Authentic luxury fragrances.<br/><em>Better prices.</em></h1>
          <p className="lede">100% genuine designer fragrances, yours to experience — take a two-minute scent quiz for a personalized match, or shop the best sellers directly.</p>
          <div className="hero-buttons">
            <Button variant="secondary" onClick={() => setQuizOpen(true)}>Find your scent <Icon>↗</Icon></Button>
            <Button variant="ghost" onClick={() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })}>Shop best sellers</Button>
          </div>
          <p className="hero-proof">100% Authentic · Ground shipping within the contiguous U.S.</p>
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
        <div><strong>100% Authentic Guarantee</strong><span>Sourced through trusted, authorized channels</span></div>
        <div><strong>Fast U.S. Shipping</strong><span>Ground delivery, fragrance-safe fulfillment</span></div>
        <div><strong>Luxury Gift Packaging</strong><span>Optional gift wrap at checkout</span></div>
        <div><strong>30-Day Easy Returns</strong><span>Unopened bottles, no questions asked</span></div>
      </section>

      <section id="best-sellers" className="bestsellers-section" data-reveal>
        <div className="collection-head"><div><p className="overline dark">Best sellers</p><h2>What Aurelia customers reach for first.</h2></div><Button variant="text" onClick={() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })}>View all <Icon>→</Icon></Button></div>
        {bestSellers.length > 0 && <div className="bestsellers-grid">
          {bestSellers.map((product) => <ProductCard
            key={product.id}
            product={product}
            mutating={mutating}
            wishlisted={wishlist.includes(product.id)}
            onToggleWishlist={toggleWishlist}
            onOpen={openProduct}
            onQuickAdd={addBottle}
          />)}
        </div>}
      </section>

      <section id="discovery" className="discovery-story" data-reveal>
        <div className="section-intro"><p className="overline dark">The easier way to buy fragrance online</p><h2>Smell it in your life,<br/>not just on a screen.</h2></div>
        <div className="journey-grid">
          <article><span>01</span><h3>Tell us what you love</h3><p>Shop for yourself or a gift. Share the moods, notes and intensity that feel right.</p></article>
          <article><span>02</span><h3>Get matched instantly</h3><p>The Scent Finder recommends real fragrances from the shop based on your answers.</p></article>
          <article><span>03</span><h3>Shop with confidence</h3><p>Every recommendation links straight to a genuine, authentic bottle you can buy today.</p></article>
        </div>
      </section>

      <section className="discovery-feature" data-reveal>
        <article className="discovery-card">
          <div className="discovery-art" aria-hidden="true"><div className="set-box"><span>AURELIA</span><small>PERSONAL DISCOVERY SET</small></div><div className="vial-row"><i/><i/><i/></div></div>
          <div className="discovery-copy">
            <p className="overline">Coming soon</p>
            <h2>Three considered matches.<br/>One confident decision.</h2>
            <p>Sample sets are on the way — three 2 ml sprays so you can try a fragrance at home before committing to a full bottle.</p>
            {DISCOVERY_COMMERCE_ENABLED ? (
              <div className="price-action"><strong>{discoveryPriceLabel}</strong><Button onClick={() => setQuizOpen(true)}>Build my set <Icon>↗</Icon></Button></div>
            ) : (
              <form className="waitlist-form" onSubmit={(event) => { event.preventDefault(); if (!discoveryWaitlistEmail.trim()) return; setDiscoveryWaitlistDone(true); setDiscoveryWaitlistEmail(''); }}>
                <label htmlFor="discovery-waitlist-email">Be first to know when it launches</label>
                {discoveryWaitlistDone ? <p className="waitlist-done">Thanks — we'll let you know.</p> : <div className="signup-row">
                  <input id="discovery-waitlist-email" type="email" required value={discoveryWaitlistEmail} onChange={(event) => setDiscoveryWaitlistEmail(event.target.value)} placeholder="you@email.com"/>
                  <Button variant="secondary" type="submit">Notify me</Button>
                </div>}
              </form>
            )}
          </div>
        </article>
        <article className="scentfinder-card">
          <div className="scentfinder-copy">
            <p className="overline">Not sure where to start?</p>
            <h2>Let our Scent Finder<br/>find your perfect match.</h2>
            <p>Answer a few quick questions and we'll recommend fragrances just for you.</p>
            <Button variant="secondary" onClick={() => setQuizOpen(true)}>Take the quiz <Icon>→</Icon></Button>
          </div>
        </article>
      </section>

      <section className="mood-section" data-reveal>
        <div className="section-intro"><p className="overline dark">Shop by mood</p><h2>Find the fragrance for the moment.</h2></div>
        <div className="mood-grid">
          {MOOD_TILES.map((mood) => <button key={mood.label} className={`mood-tile tone-bg-${mood.tone}`} onClick={() => shopByTerm(mood.label)}>
            <span>{mood.label}</span>
          </button>)}
        </div>
      </section>

      <section id="featured-brands" className="brands-section" data-reveal>
        {featuredBrands.length >= 3 && <>
          <div className="section-intro"><p className="overline dark">Featured brands</p><h2>The designer houses we carry.</h2></div>
          <div className="brands-row">
            {featuredBrands.map((brand) => <button key={brand} className="brand-wordmark" onClick={() => shopByTerm(brand)}>{brand}</button>)}
          </div>
        </>}
      </section>

      <section id="testimonials" className="testimonials-section" data-reveal>
        {testimonials.length > 0 && <>
          <div className="section-intro"><p className="overline dark">In their words</p><h2>What customers are saying.</h2></div>
          <div className="testimonials-row">
            {testimonials.map((item) => <blockquote key={item.author}><p>{item.quote}</p><footer>{item.author}</footer></blockquote>)}
          </div>
        </>}
      </section>

      <section id="instagram" className="instagram-section" data-reveal>
        {instagramPosts.length > 0 && <>
          <div className="section-intro"><p className="overline dark">Follow along</p><h2>@aureliaparfums</h2></div>
          <div className="instagram-row">
            {instagramPosts.map((post) => <a key={post.url} href={post.url} target="_blank" rel="noreferrer"><img src={post.image} alt={post.alt}/></a>)}
          </div>
        </>}
      </section>

      <section id="collection" className="collection" data-reveal>
        {firstLoad ? <CollectionHeaderSkeleton /> : <>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <a href="#top">Home</a><span aria-hidden="true">/</span>
            <a href="#collection">Shop</a><span aria-hidden="true">/</span>
            <span aria-current="page">{collectionHeading}</span>
          </nav>
          <div className="collection-head"><div><p className="overline dark">{family === 'All' ? 'Full bottles' : family}</p><h2>{collectionHeading}</h2></div><p>Discover authentic designer fragrances at exceptional prices.</p></div>
        </>}
        {firstLoad ? <FilterBarSkeleton /> : <FilterBar
          searchInputRef={searchInputRef}
          search={search} onSearchChange={setSearch}
          family={family} familyOptions={familyOptions} onFamilyChange={setFamily}
          brand={brand} brandOptions={brandOptions} onBrandChange={setBrand}
          priceBucket={priceBucket} onPriceBucketChange={setPriceBucket}
          availabilityOnly={availabilityOnly} onAvailabilityChange={setAvailabilityOnly}
          sizeFilter={sizeFilter} sizeOptions={sizeOptions} onSizeChange={setSizeFilter}
          sort={sort} sortOptions={Object.entries(SORT_OPTIONS).map(([value, option]) => ({ value, label: option.label }))} onSortChange={setSort}
          activeFilterCount={activeFilterCount} onOpenFilters={() => setFilterDrawerOpen(true)}
        />}
        {filterDrawerOpen && <FilterDrawer
          dialogRef={filterDrawerDialogRef}
          onClose={() => setFilterDrawerOpen(false)}
          family={family} familyOptions={familyOptions} onFamilyChange={setFamily}
          brand={brand} brandOptions={brandOptions} onBrandChange={setBrand}
          priceBucket={priceBucket} onPriceBucketChange={setPriceBucket}
          availabilityOnly={availabilityOnly} onAvailabilityChange={setAvailabilityOnly}
          sizeFilter={sizeFilter} sizeOptions={sizeOptions} onSizeChange={setSizeFilter}
          onClear={clearFilterFacets}
          resultCount={filtered.length}
        />}
        {productsLoading ? <LoadingSkeleton count={8} />
          : productsError ? <EmptyState title="Couldn't load the catalog." description={productsError} />
          : filtered.length ? <>
          <div className="product-grid">
          {filtered.slice(0, visibleCount).map((product) => <ProductCard
            key={product.id}
            product={product}
            mutating={mutating}
            wishlisted={wishlist.includes(product.id)}
            onToggleWishlist={toggleWishlist}
            onOpen={openProduct}
            onQuickAdd={addBottle}
          />)}
          </div>
          {visibleCount < filtered.length && <div className="show-more-row">
            <Button variant="secondary" onClick={() => setVisibleCount((count) => count + 12)}>Show more ({filtered.length - visibleCount} remaining)</Button>
          </div>}
        </> : wishlistFilterOn ? <EmptyState
          title="You haven't saved any fragrances yet."
          description="Tap the heart icon on any product to save it here."
          action={<Button variant="text" onClick={() => setWishlistFilterOn(false)}>Show all fragrances</Button>}
        /> : <EmptyState
          title="No fragrances matched your filters."
          description="Try a different note, family or spelling."
          action={<Button variant="text" onClick={clearFilters}>Clear filters</Button>}
        />}
        {recentlyViewedProducts.length > 0 && <div className="recently-viewed-rail">
          <p className="overline dark">Recently viewed</p>
          <div className="rail-row">
            {recentlyViewedProducts.map((product) => <ProductCard
              key={product.id}
              product={product}
              size="rail"
              mutating={mutating}
              wishlisted={wishlist.includes(product.id)}
              onToggleWishlist={toggleWishlist}
              onOpen={openProduct}
              onQuickAdd={addBottle}
            />)}
          </div>
        </div>}
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
        <label htmlFor="footer-email">Exclusive launches, private offers and personalized recommendations</label>
        {signupDone ? <p className="signup-done">Thanks — we'll be in touch.</p> : <div className="signup-row">
          <input id="footer-email" type="email" required value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} placeholder="you@email.com"/>
          <Button variant="secondary" type="submit">Sign up</Button>
        </div>}
      </form>
      <p>
        <span>Storefront by Aurelia Parfums · Powered by Shopify.</span>
        <span className="payment-badges"><span>Visa</span><span>Mastercard</span><span>Amex</span><span>Apple Pay</span><span>Shop Pay</span></span>
      </p>
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
            <div className="rail-row">{relatedProducts.map((product) => <ProductCard
              key={product.id}
              product={product}
              size="rail"
              mutating={mutating}
              wishlisted={wishlist.includes(product.id)}
              onToggleWishlist={toggleWishlist}
              onOpen={openProduct}
              onQuickAdd={addBottle}
            />)}</div>
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
        discoveryEnabled={DISCOVERY_COMMERCE_ENABLED}
        discoveryPrice={discoveryProduct?.price ?? null}
        wishlist={wishlist}
        onToggleWishlist={toggleWishlist}
        mutating={mutating}
        onQuickAdd={addBottle}
        onAnswer={answerQuiz}
        onClose={closeQuiz}
        onRetake={retakeQuiz}
        onAddSet={() => { addDiscoverySet(quizMatches); closeQuiz(); }}
        onSelectProduct={(product) => { closeQuiz(); openProduct(product); }}
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
