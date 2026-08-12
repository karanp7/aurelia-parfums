import React, { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { useNavigate, useLocation, useSearchParams, matchPath } from 'react-router-dom';
import PerfumeBottle from './components/PerfumeBottle.jsx';
import EntryGateway from './components/EntryGateway.jsx';
import CategoryListing from './components/CategoryListing.jsx';
import Logo from './components/Logo.jsx';
import Button from './components/Button.jsx';
import Dialog, { DialogClose } from './components/Dialog.jsx';
import EmptyState from './components/EmptyState.jsx';
import ProductCard from './components/ProductCard.jsx';
import ProductDetailPage from './components/ProductDetailPage.jsx';
import Icon from './components/Icon.jsx';
import { PRICE_BUCKETS } from './components/FilterBar.jsx';
import { isShopifyConfigured } from './lib/shopify.js';
import { fetchProducts, fetchProductByHandle, findConcentration } from './lib/shopifyProducts.js';
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

// sessionStorage key backing the entry gateway's "seen it this session"
// state - see the hasEntered useState below for the full rationale.
const ENTRY_GATEWAY_KEY = 'aurelia-entered';

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

// Structural shells only — no real reviews app or Instagram feed is
// connected yet, so these stay empty until real content exists rather than
// shipping fabricated quotes or lifestyle photography. The wrapper section
// still always mounts (see the always-mount pattern used for Featured
// Brands) so useReveal's one-time querySelectorAll finds it.
const testimonials = [];
const instagramPosts = [];

const money = (value) => `$${Number(value).toFixed(2).replace('.00', '')}`;

// `key` re-runs the scan/observe whenever the homepage's [data-reveal]
// sections actually remount - e.g. navigating home <-> a product page
// unmounts and later remounts them (same App instance, just a ternary),
// so a mount-only effect would leave the fresh nodes stuck at their
// initial opacity:0 with no observer watching them.
function useReveal(key) {
  useEffect(() => {
    const nodes = document.querySelectorAll('[data-reveal]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('is-visible'));
    }, { threshold: 0.12 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [key]);
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
function ShopDropdown({ open, onToggle, onClose, onShopNew, onGoToSection, onGoToAllFragrances, onGoToCategory }) {
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
      <button aria-haspopup="true" aria-expanded={open} onClick={onToggle}>Shop <Icon name="chevronDown"/></button>
      {open && <div className="shop-dropdown-menu" role="menu">
        <a role="menuitem" href="#collection" onClick={(event) => { event.preventDefault(); onGoToAllFragrances(); onClose(); }}>All Fragrances</a>
        <a role="menuitem" href="/men" onClick={(event) => { event.preventDefault(); onGoToCategory('men'); onClose(); }}>Men</a>
        <a role="menuitem" href="/women" onClick={(event) => { event.preventDefault(); onGoToCategory('women'); onClose(); }}>Women</a>
        <a role="menuitem" href="#best-sellers" onClick={(event) => { event.preventDefault(); onGoToSection('best-sellers'); onClose(); }}>Best Sellers</a>
        <button role="menuitem" onClick={onShopNew}>New Arrivals</button>
        <a role="menuitem" href="#gifts" onClick={(event) => { event.preventDefault(); onGoToSection('gifts'); onClose(); }}>Gifts</a>
      </div>}
    </div>
  );
}

// Collection filters live in the URL (?family=Woody&occasion=Evening&...)
// so a filtered view is bookmarkable/shareable and survives a refresh -
// read once on mount, not on every render, since the filter state itself
// (not the URL) stays the source of truth while the page is open. Falls
// back to each filter's existing default when a param is absent/invalid.
function readFilterParams(search) {
  const params = new URLSearchParams(search);
  return {
    family: params.get('family') || 'All',
    search: params.get('q') || '',
    sort: params.get('sort') || 'best-selling',
    brand: params.get('brand') || 'All',
    priceBucket: params.get('price') || 'all',
    availabilityOnly: params.get('stock') === '1',
    sizeFilter: params.get('size') || 'All',
    gender: params.get('gender') || 'All',
    occasion: params.get('occasion') || 'All',
    concentration: params.get('concentration') || 'All',
    newArrivalOnly: params.get('new') === '1',
    bestSellerOnly: params.get('bestseller') === '1',
    onSaleOnly: params.get('sale') === '1'
  };
}

function App() {
  const [searchParams] = useSearchParams();
  const initialFilters = useRef(readFilterParams(searchParams.toString() ? `?${searchParams.toString()}` : '')).current;

  const [family, setFamily] = useState(initialFilters.family);
  const [search, setSearch] = useState(initialFilters.search);
  const [sort, setSort] = useState(initialFilters.sort);
  const [brand, setBrand] = useState(initialFilters.brand);
  const [priceBucket, setPriceBucket] = useState(initialFilters.priceBucket);
  const [availabilityOnly, setAvailabilityOnly] = useState(initialFilters.availabilityOnly);
  const [sizeFilter, setSizeFilter] = useState(initialFilters.sizeFilter);
  // Gender: real, tag-derived facet (same "Men"/"Women"/"Unisex" tag the
  // homepage entry gateway's Men/Women boxes also read) - gracefully
  // hidden by FilterBar/FilterDrawer whenever no product carries the tag,
  // same rule as Occasion/Concentration below.
  const [gender, setGender] = useState(initialFilters.gender);
  // Occasion/Concentration: real, metafield/variant-derived facets (same
  // data the Product Detail Page already shows) - gracefully hidden by
  // FilterBar/FilterDrawer whenever the catalog has no products with that
  // data set, rather than shown as an empty, useless dropdown.
  const [occasion, setOccasion] = useState(initialFilters.occasion);
  const [concentration, setConcentration] = useState(initialFilters.concentration);
  // New Arrival / Best Seller: the exact same tag-derived `badge` value
  // already used for the real product-card badges, exposed as filter
  // toggles instead of read-only chrome.
  const [newArrivalOnly, setNewArrivalOnly] = useState(initialFilters.newArrivalOnly);
  const [bestSellerOnly, setBestSellerOnly] = useState(initialFilters.bestSellerOnly);
  // On Sale: real, not fabricated - the exact same compareAtPrice data
  // ProductCard's own savings-badge already reads, exposed as a filter
  // toggle instead of read-only chrome (same reasoning as New Arrival/
  // Best Seller above).
  const [onSaleOnly, setOnSaleOnly] = useState(initialFilters.onSaleOnly);

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
  const [giftMessage, setGiftMessage] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupDone, setSignupDone] = useState(false);
  const [wishlist, setWishlist] = useState(() => readWishlist());
  const [recentlyViewed, setRecentlyViewed] = useState(() => readRecentlyViewed());
  const [wishlistFilterOn, setWishlistFilterOn] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [shopMenuOpen, setShopMenuOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  // The entry gateway (EntryGateway.jsx) is the site's real front door -
  // shown once per browser session on a fresh visit to "/", never on a
  // deep link (a shared product URL shouldn't detour through a Men/Women/
  // Gifts choice). sessionStorage (not localStorage) so it resets on a
  // fresh browser/new session, matching the agreed behavior, and reads
  // synchronously on first render so there's no flash of the gateway on
  // an already-entered return visit within the same session.
  const [hasEntered, setHasEntered] = useState(() => sessionStorage.getItem(ENTRY_GATEWAY_KEY) === '1');
  // See enterSite/the effect below - the exact history entry key the
  // gateway itself was showing on when a real enterSite() call happened
  // this page load, so backing all the way out to it can be recognized
  // and turned back into "show the gateway again."
  const gatewayEntryKeyRef = useRef(null);

  const searchInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

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

  // H-05: product detail is driven by the route (/products/:handle) rather
  // than local state, so products are linkable/bookmarkable and Back closes
  // the modal instead of leaving the site. Shopify's real `handle` replaces
  // the old locally-generated id.
  const productMatch = useMemo(() => matchPath('/products/:handle', location.pathname), [location.pathname]);
  const handle = productMatch?.params?.handle;
  const activeProductFromList = handle ? products.find((product) => product.handle === handle) : null;

  // Real routes (H-08), same reasoning as /products/:handle above: Men/
  // Women get their own sidebar-filter product listing (CategoryListing)
  // reached either from the entry gateway or directly/bookmarked, with working
  // Back navigation for free via the browser's own history instead of a
  // same-URL trick like Gifts (which has no dedicated page, just a scroll
  // target on the shop homepage) needs.
  const categoryGender = location.pathname === '/men' ? 'Men' : location.pathname === '/women' ? 'Women' : null;

  // Deep-linking straight to /men or /women (a bookmark, a shared link) -
  // never goes through enterSite(), which is normally what sets the
  // gender filter - so the landing page's own filter shortcuts and the
  // eventual "Shop All" handoff to the product grid stay in sync with
  // the URL either way.
  useEffect(() => {
    if (categoryGender) setGender(categoryGender);
  }, [categoryGender]);

  // Any deep link past the gateway (a category page, same as above, or a
  // product page - a bookmark, a shared link) also never goes through
  // enterSite(), the only other place hasEntered gets set. Left false,
  // clicking anything that eventually navigates to '/' (a family tab on
  // /men, "Back to shop" on a product page) would land back on '/' with
  // hasEntered still false - satisfying the gateway's own early-return
  // condition and showing it again mid-navigation, corrupting whatever
  // filter/scroll was in flight (H-08 bug: a family tab click bounced back
  // to /men instead of reaching the filtered grid). Bookmarking either
  // kind of deep link should behave like having already chosen something
  // on the gateway, since in a real sense the shopper already has.
  useEffect(() => {
    if ((categoryGender || handle) && !hasEntered) setHasEntered(true);
  }, [categoryGender, handle, hasEntered]);

  useEffect(() => {
    if (!handle || activeProductFromList || productsLoading || !isShopifyConfigured) { setDirectProduct(null); return undefined; }
    let cancelled = false;
    fetchProductByHandle(handle)
      .then((product) => { if (!cancelled) setDirectProduct(product); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [handle, activeProductFromList, productsLoading]);

  const activeProduct = activeProductFromList || directProduct;
  // Re-scans/re-observes whenever the current [data-reveal] sections
  // actually (re)mount - true right after the product page closes, the
  // entry gateway is passed, or navigating directly between /men and
  // /women (each swaps in its own distinct set of data-reveal sections,
  // so hasEntered/activeProduct alone wouldn't change between those two
  // and the effect wouldn't otherwise re-run).
  //
  // categoryGender is checked *before* !hasEntered deliberately: a direct
  // deep link to /men already renders CategoryListing on its very first
  // render regardless of hasEntered (the gateway's own early-return only
  // ever applies to '/'), but hasEntered still starts false and only
  // flips true a moment later via the sync effect below. Checking
  // !hasEntered first produced a spurious 'gateway' key on that first
  // render (even though CategoryListing, not the gateway, was what
  // actually mounted), which changed to the correct category key once
  // hasEntered caught up. (CategoryListing itself has no [data-reveal]
  // sections - it's a utilitarian filter/grid page, not a scroll-reveal
  // one - so unlike the earlier editorial hub, no products-readiness key
  // suffix is needed here.)
  useReveal(activeProduct ? 'product' : categoryGender ? categoryGender : (!hasEntered ? 'gateway' : 'home'));
  const closeProduct = () => navigate('/');
  const openProduct = (product) => navigate(`/products/${product.handle}`);

  useEffect(() => {
    document.title = activeProduct
      ? `${activeProduct.name} — Aurelia Parfums`
      : categoryGender
        ? `${categoryGender}'s Fragrances — Aurelia Parfums`
        : 'Aurelia — Find your signature scent';
  }, [activeProduct, categoryGender]);

  // Every nav/footer/menu link that jumps to a homepage section (`#collection`,
  // `#best-sellers`, etc.) assumes those sections are mounted - true once
  // past both the entry gateway AND off a product page, neither of which
  // render the homepage sections. `document.getElementById` then returns
  // null and the link silently does nothing. `goToSection` covers every
  // case: if a product page is open or the gateway hasn't been passed yet,
  // it clears whichever of those is blocking the homepage and remembers
  // the target in a ref; once the homepage sections mount, the effect
  // below scrolls to it (deferred a frame so the freshly-mounted DOM has
  // actually painted before `scrollIntoView` measures it).
  const pendingScrollRef = useRef(null);
  const goToSection = (id, options) => {
    if (activeProduct || !hasEntered || categoryGender) {
      pendingScrollRef.current = { id, ...options };
      if (activeProduct) closeProduct();
      else if (categoryGender) navigate('/');
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    if (options?.focusSearch) window.requestAnimationFrame(() => searchInputRef.current?.focus());
  };
  useEffect(() => {
    if (activeProduct || !hasEntered || categoryGender || !pendingScrollRef.current) return;
    const { id, focusSearch: shouldFocusSearch } = pendingScrollRef.current;
    pendingScrollRef.current = null;
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      if (shouldFocusSearch) searchInputRef.current?.focus();
    });
  }, [activeProduct, hasEntered, categoryGender]);

  // The three entry-gateway choices. Men/Women set the real, tag-derived
  // gender filter (see deriveGender in shopifyProducts.js) - applied once
  // the shopper actually reaches the product grid - and land on their own
  // real CategoryListing route (H-08); Gifts needs no filter or dedicated
  // page, just a scroll straight to the real #gifts section already on
  // the shop homepage. All three mark the gateway seen for the rest of
  // this browser session.
  //
  // Neither a plain navigate nor setHasEntered on its own reliably left
  // Back with something to return to (H-06 bug report: "no back option").
  // /men and /women are genuinely different URLs from the gateway's own
  // '/', so navigating to them mints a real history entry on its own -
  // no same-URL trick needed there. Gifts stays on '/', so it still needs
  // one: `navigate('/?_e=1')` (a real push, unlike every filter change's
  // {replace:true}) forces a genuinely different URL to get a distinct
  // entry at all, and the immediate {replace:true} follow-up strips the
  // throwaway marker back out of the address bar right away.
  const enterSite = (choice) => {
    gatewayEntryKeyRef.current = location.key;
    sessionStorage.setItem(ENTRY_GATEWAY_KEY, '1');
    setHasEntered(true);
    if (choice === 'men') { setGender('Men'); setFamily('All'); navigate('/men'); }
    else if (choice === 'women') { setGender('Women'); setFamily('All'); navigate('/women'); }
    else if (choice === 'gifts') {
      goToSection('gifts');
      navigate('/?_e=1');
      navigate('/', { replace: true });
    }
  };

  // Pressing Back enough times to land back on the exact entry the
  // gateway itself was showing on (captured above) means the user has
  // backed all the way out of the shop to where they made their choice.
  // gatewayEntryKeyRef only ever gets set by a real enterSite() call this
  // page load, so this never fires for a repeat visit within the same
  // session where sessionStorage already skipped the gateway entirely.
  //
  // A raw `popstate` listener rather than reacting to `location`/
  // `hasEntered` in a normal effect: right after enterSite fires, there's
  // a render where the local hasEntered state has already flipped true
  // but React Router's own location context hasn't caught up to the new
  // key yet (the two update on different schedules) - comparing them
  // reactively in that window produced a false "just popped back" match
  // and immediately un-entered the shop. Reading the popped entry's own
  // key straight off the native event sidesteps that race entirely, since
  // it only ever runs in response to an actual browser back/forward action.
  useEffect(() => {
    const onPopState = (event) => {
      if (gatewayEntryKeyRef.current == null) return;
      if (event.state?.key === gatewayEntryKeyRef.current && window.location.pathname === '/') {
        sessionStorage.removeItem(ENTRY_GATEWAY_KEY);
        gatewayEntryKeyRef.current = null;
        setHasEntered(false);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Previously only set inside openProduct(), which meant a direct
  // /products/:handle visit (no click-through - a bookmark, a shared link,
  // a page reload) left `selectedSize` at null: pricing still fell back to
  // sizes[0] correctly, but the size-selector buttons never showed any
  // size as selected. Keyed on the product's own id (not the whole object,
  // which can change reference on unrelated re-renders) so this covers
  // every way the product page is reached, uniformly.
  useEffect(() => {
    if (!activeProduct) return;
    setSelectedSize(activeProduct.sizes.find((size) => size.availableForSale)?.label || activeProduct.sizes[0]?.label || null);
  }, [activeProduct?.id]);

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

  // The browser's own native scroll restoration (on by default) remembers
  // and re-applies each history entry's scroll position on back/forward -
  // including, in some browsers, racing *after* the scrollTo(0,0) effect
  // below and silently overriding it right back to wherever the page was
  // scrolled to when last left. Since this app already owns scroll
  // position deliberately (this effect, plus goToSection's own explicit
  // scrollIntoView elsewhere), the browser's default only fights it -
  // switching to 'manual' once makes this app the sole authority.
  useEffect(() => {
    window.history.scrollRestoration = 'manual';
  }, []);

  // Product detail and the Men/Women listing are real pages (not overlays
  // or in-page scroll targets), so they should scroll like one: jump to
  // the top on arrival, the way a real page load would - client-side
  // routing doesn't do this for free, it just swaps content under
  // whatever scroll position the previous page happened to be at (the
  // reported bug: clicking "Men" while scrolled down elsewhere landed on
  // /men still scrolled to that same pixel offset, deep in its sidebar).
  useEffect(() => {
    if (handle || categoryGender) window.scrollTo(0, 0);
  }, [handle, categoryGender]);

  // `activeProduct` deliberately dropped from this condition — it used to
  // lock body scroll because the product modal was an overlay on top of a
  // scrollable page; now it's the page's own main content, so locking
  // scroll here would make it permanently unscrollable.
  useEffect(() => {
    document.body.style.overflow = cartOpen || quizOpen || menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [cartOpen, quizOpen, menuOpen]);

  // Family options are derived from the real catalog instead of a fixed
  // list, so the filter and the quiz's "atmosphere" question always match
  // whatever productType values actually exist in Shopify.
  const families = useMemo(() => ['All', ...new Set(products.map((product) => product.family))], [products]);
  const familyOptions = useMemo(() => families.filter((item) => item !== 'All'), [families]);

  // Brand and Size options, same "derive from the real catalog" pattern as
  // family above — never a fixed/guessed list.
  const brandOptions = useMemo(() => [...new Set(products.map((product) => product.house))].sort(), [products]);
  const sizeOptions = useMemo(() => [...new Set(products.flatMap((product) => product.sizes.map((size) => size.label)))], [products]);
  // Gender/Occasion/Concentration options: empty whenever no product in
  // the catalog has that tag/metafield/variant-option set, which is the
  // signal FilterBar/FilterDrawer use to hide the whole dropdown rather
  // than show one with nothing real to select.
  const genderOptions = useMemo(() => [...new Set(products.map((product) => product.gender).filter(Boolean))].sort(), [products]);
  const occasionOptions = useMemo(() => [...new Set(products.flatMap((product) => product.occasions || []))].sort(), [products]);
  const concentrationOptions = useMemo(() => [...new Set(products.map((product) => findConcentration(product)).filter(Boolean))].sort(), [products]);

  // Resolves stored ids against the live catalog (drops any id no longer
  // in `products` - e.g. a delisted product) rather than caching stale
  // product data in localStorage alongside the ids.
  const recentlyViewedProducts = useMemo(
    () => recentlyViewed.map((id) => products.find((product) => product.id === id)).filter(Boolean),
    [recentlyViewed, products]
  );

  // Real count of active filters (excludes search, which has its own
  // always-visible input) - shown as a badge on the mobile "Filters"
  // trigger so users know something is applied without opening the drawer.
  const activeFilterCount = [
    family !== 'All', brand !== 'All', priceBucket !== 'all', availabilityOnly, sizeFilter !== 'All',
    gender !== 'All', occasion !== 'All', concentration !== 'All', newArrivalOnly, bestSellerOnly, onSaleOnly
  ].filter(Boolean).length;
  // Same count, minus gender - on /men or /women, gender is always set
  // (it's the page itself, not a filter the shopper applied), so it would
  // otherwise always show as "1 filter active" with nothing really applied.
  const categoryActiveFilterCount = activeFilterCount - (gender !== 'All' ? 1 : 0);

  const filtered = useMemo(() => products.filter((product) => {
    // Notes (top/heart/base) are real metafield data when a merchant has
    // set them — including them here is the whole reason "vanilla"/"oud"/
    // "rose" can match a product whose name/description never mentions
    // the word. Falls through to name/house/etc. either way.
    const noteWords = [...(product.notes?.top || []), ...(product.notes?.heart || []), ...(product.notes?.base || [])];
    const searchable = [product.name, product.house, product.family, product.summary, product.description, ...(product.tags || []), ...noteWords]
      .join(' ')
      .toLowerCase();
    const matchesWishlist = !wishlistFilterOn || wishlist.includes(product.id);
    const matchesBrand = brand === 'All' || product.house === brand;
    const matchesGender = gender === 'All' || product.gender === gender;
    const matchesOccasion = occasion === 'All' || (product.occasions || []).includes(occasion);
    const matchesConcentration = concentration === 'All' || findConcentration(product) === concentration;
    const matchesNewArrival = !newArrivalOnly || product.badge === 'New';
    const matchesBestSeller = !bestSellerOnly || product.badge === 'Bestseller';
    const matchesOnSale = !onSaleOnly || Boolean(product.compareAtPrice);
    const matchesAvailability = !availabilityOnly || product.availableForSale;
    const matchesSize = sizeFilter === 'All' || product.sizes.some((size) => size.label === sizeFilter);
    const matchesPrice = PRICE_BUCKETS.find((bucket) => bucket.value === priceBucket)?.test(product.price) ?? true;
    return (family === 'All' || product.family === family)
      && searchable.includes(search.toLowerCase())
      && matchesWishlist && matchesBrand && matchesAvailability && matchesSize && matchesPrice
      && matchesGender && matchesOccasion && matchesConcentration && matchesNewArrival && matchesBestSeller && matchesOnSale;
  }), [products, family, search, wishlistFilterOn, wishlist, brand, availabilityOnly, sizeFilter, priceBucket, gender, occasion, concentration, newArrivalOnly, bestSellerOnly, onSaleOnly]);

  // Live suggestions as you type, before pressing Enter - real matching
  // products only (name/house/notes, the same fields the search itself
  // matches against), never a fabricated "trending searches" list. Capped
  // at 6 so the dropdown stays a quick scan, not a second product grid.
  const searchSuggestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    const matches = [];
    for (const product of products) {
      if (matches.length >= 6) break;
      const noteWords = [...(product.notes?.top || []), ...(product.notes?.heart || []), ...(product.notes?.base || [])];
      const hit = product.name.toLowerCase().includes(query)
        || product.house.toLowerCase().includes(query)
        || noteWords.some((note) => note.toLowerCase().includes(query));
      if (hit) matches.push(product);
    }
    return matches;
  }, [search, products]);

  // Reset pagination whenever the result set's composition changes, so
  // switching filters never leaves the grid stuck deep in a stale "show
  // more" state from a previous, larger result set.
  useEffect(() => { setVisibleCount(12); }, [family, search, brand, priceBucket, availabilityOnly, sizeFilter, sort, wishlistFilterOn, gender, occasion, concentration, newArrivalOnly, bestSellerOnly, onSaleOnly]);

  // Keeps the URL in sync as filters change (replace, not push, so every
  // keystroke/click doesn't spam browser history) - only defaults are
  // omitted, so a URL with nothing applied stays a bare "/". Search stays
  // out deliberately: syncing every keystroke would thrash history/URL on
  // every character even with replace, and search isn't counted in
  // activeFilterCount for the same reason.
  //
  // Skipped entirely while on a category page: there's no filter UI there
  // to reflect. Checks the real, authoritative window.location.pathname
  // here rather than React Router's own `location`/categoryGender -
  // confirmed via a direct trace that React Router's own location can lag
  // window.location.pathname by a render or two after a same-tick
  // navigate() call elsewhere (e.g. enterSite's setGender + navigate
  // ('/men'), or goToSection's navigate('/') when leaving a category
  // page). Also navigates explicitly with `{ pathname: window.location
  // .pathname, search }` instead of setSearchParams(params) - that
  // shorthand resolves the target relative to React Router's *own*
  // (potentially stale) current location internally, which silently
  // rewrote a just-pushed /men or a just-navigated-to '/' back to
  // wherever React Router still thought it was, even once the effect's
  // own window.location-based guard above correctly let it through.
  useEffect(() => {
    if (window.location.pathname !== '/') return;
    const params = new URLSearchParams();
    if (family !== 'All') params.set('family', family);
    if (sort !== 'best-selling') params.set('sort', sort);
    if (brand !== 'All') params.set('brand', brand);
    if (priceBucket !== 'all') params.set('price', priceBucket);
    if (availabilityOnly) params.set('stock', '1');
    if (sizeFilter !== 'All') params.set('size', sizeFilter);
    if (gender !== 'All') params.set('gender', gender);
    if (occasion !== 'All') params.set('occasion', occasion);
    if (concentration !== 'All') params.set('concentration', concentration);
    if (newArrivalOnly) params.set('new', '1');
    if (bestSellerOnly) params.set('bestseller', '1');
    if (onSaleOnly) params.set('sale', '1');
    navigate({ pathname: '/', search: params.toString() }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family, sort, brand, priceBucket, availabilityOnly, sizeFilter, gender, occasion, concentration, newArrivalOnly, bestSellerOnly, onSaleOnly, categoryGender]);

  const quizMatches = useMemo(() => rankMatches(products, quizAnswers, 3), [products, quizAnswers]);

  const relatedProducts = useMemo(() => {
    if (!activeProduct) return [];
    const sameFamily = products.filter((product) => product.id !== activeProduct.id && product.family === activeProduct.family);
    const rest = products.filter((product) => product.id !== activeProduct.id && product.family !== activeProduct.family);
    return [...sameFamily, ...rest].slice(0, 3);
  }, [activeProduct, products]);

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
    goToSection('collection');
  };

  const itemCount = cart?.totalQuantity || 0;
  const shippingThreshold = 100;
  const subtotal = cart?.subtotal || 0;
  const shippingRemaining = Math.max(0, shippingThreshold - subtotal);
  const shippingProgress = Math.min(100, (subtotal / shippingThreshold) * 100);
  const giftWrapLine = cart?.lines.find((line) => line.type === 'gift-wrap');

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

  // `quantity` defaults to 1 so every existing call site (grid/rail Quick
  // Add, "Add to bag") keeps working unchanged; the Product Detail Page's
  // quantity selector is the only caller that passes something else.
  //
  // No longer calls closeProduct() after adding — that made sense when the
  // product modal was an overlay (closing it returned you to the page
  // underneath), but now product detail is a real page, and navigating a
  // shopper away from it right after they add to bag would undo the point
  // of staying to browse/checkout from there.
  const addBottle = async (product, sizeLabel, quantity = 1) => {
    if (!cart) return;
    const variant = product.sizes.find((size) => size.label === sizeLabel) || product.sizes[0];
    if (!variant) return;
    try {
      await runCartMutation(() => addCartLine(cart.id, { merchandiseId: variant.variantId, quantity }));
      setCartOpen(true);
    } catch {
      // cartError is already set and surfaced in the cart drawer
    }
  };

  // "Buy Now" skips the cart drawer entirely and sends the shopper straight
  // to Shopify's real hosted checkout with just this line in the cart -
  // reuses the exact same mutation as Add to Bag, just redirects on success
  // instead of opening the drawer.
  const buyNow = async (product, sizeLabel, quantity = 1) => {
    if (!cart) return;
    const variant = product.sizes.find((size) => size.label === sizeLabel) || product.sizes[0];
    if (!variant) return;
    try {
      const updatedCart = await runCartMutation(() => addCartLine(cart.id, { merchandiseId: variant.variantId, quantity }));
      if (updatedCart?.checkoutUrl) window.location.href = updatedCart.checkoutUrl;
    } catch {
      // cartError is already set; with no drawer open here, the shopper
      // stays on the product page and can retry Add to Bag/Buy Now.
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

  // General "You may also like" cart rail (distinct from the narrower,
  // discovery-set-specific `crossSell` above) - real family-based
  // similarity, the same logic already driving the Product Detail Page's
  // own "You may also like" rail (see relatedProducts), just keyed off
  // every family already in the bag instead of one active product. Never
  // a fabricated "customers also bought" list - no real purchase-history
  // data exists in this store to back one.
  const cartCrossSell = useMemo(() => {
    if (!cart?.lines?.length) return [];
    const cartHandles = new Set(cart.lines.map((line) => line.handle).filter(Boolean));
    const cartFamilies = new Set(
      cart.lines
        .map((line) => products.find((product) => product.handle === line.handle)?.family)
        .filter(Boolean)
    );
    if (!cartFamilies.size) return [];
    return products.filter((product) => !cartHandles.has(product.handle) && cartFamilies.has(product.family)).slice(0, 3);
  }, [cart, products]);

  // "All Fragrances" (Shop dropdown, footer "Full bottles", mobile menu
  // "Shop fragrances") means exactly that - the whole catalog, no gender
  // pre-filter - but `gender` is real, persistent state, forced to Men/
  // Women by the categoryGender sync effect while on /men or /women, and
  // plain goToSection('collection') alone doesn't touch it. Left alone, a
  // shopper leaving /men this way still saw only Men's products on a
  // section literally labeled "All Fragrances". Only gender resets here -
  // any other filter a shopper deliberately set stays as they left it.
  const goToAllFragrances = () => { setGender('All'); goToSection('collection'); };

  const focusSearch = () => goToSection('collection', { focusSearch: true });
  // Split so the mobile filter drawer's "Clear all" can reset just the
  // filter facets without also wiping the search box it doesn't contain
  // (that would reset text the user can still see and is still typing in).
  const clearFilterFacets = () => {
    setFamily('All'); setBrand('All'); setPriceBucket('all'); setAvailabilityOnly(false); setSizeFilter('All');
    setGender('All'); setOccasion('All'); setConcentration('All'); setNewArrivalOnly(false); setBestSellerOnly(false); setOnSaleOnly(false);
  };
  const clearFilters = () => { setSearch(''); clearFilterFacets(); };
  // Category pages (/men, /women) need the same "clear everything" actions
  // but must never reset gender - that's the page's own identity, set by
  // the route, not a filter a shopper applied and might want to clear.
  const clearCategoryFacets = () => {
    setFamily('All'); setBrand('All'); setPriceBucket('all'); setAvailabilityOnly(false); setSizeFilter('All');
    setOccasion('All'); setConcentration('All'); setNewArrivalOnly(false); setBestSellerOnly(false); setOnSaleOnly(false);
  };
  const clearCategoryFilters = () => { setSearch(''); clearCategoryFacets(); };

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
  const quizDialogRef = useDialogA11y(quizOpen, closeQuiz);
  const cartDialogRef = useDialogA11y(cartOpen, () => setCartOpen(false));
  const filterDrawerDialogRef = useDialogA11y(filterDrawerOpen, () => setFilterDrawerOpen(false));

  if (!isShopifyConfigured) {
    return <div className="site-shell">
      <header className="nav"><Logo/></header>
      <main id="top" className="setup-notice">
        <p className="overline dark">Setup needed</p>
        <h1 className="display">Connect Shopify to go live.</h1>
        <p>Set <code>SHOPIFY_STORE_DOMAIN</code> and <code>SHOPIFY_STOREFRONT_ACCESS_TOKEN</code> — in Vercel's Project Settings for production, or in a local <code>.env.local</code> for development (see <code>.env.example</code>) — then reload.</p>
      </main>
    </div>;
  }

  // The entry gateway only intercepts a fresh session's landing on "/" -
  // a direct/shared link (a product page, or "/" with a query string
  // already attached from a bookmark) skips straight to the shop, same as
  // how most real "enter site" gateways behave.
  if (!hasEntered && location.pathname === '/') {
    return <EntryGateway onSelect={enterSite} />;
  }

  return <div className="site-shell">
    <a className="skip-link" href="#top">Skip to content</a>
    <div className="announcement-bar">
      <span><Icon name="shield" size={13}/>100% Authentic Guarantee</span>
      <span><Icon name="truck" size={13}/>Free Shipping on Orders $100+</span>
      <span><Icon name="refresh" size={13}/>Easy Returns Within 30 Days</span>
    </div>
    <header className="nav">
      <button className="nav-icon" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Icon name="menu"/></button>
      <Logo/>
      <nav aria-label="Primary">
        <ShopDropdown
          open={shopMenuOpen}
          onToggle={() => setShopMenuOpen((open) => !open)}
          onClose={() => setShopMenuOpen(false)}
          onShopNew={() => { shopByTerm('New'); setShopMenuOpen(false); }}
          onGoToSection={goToSection}
          onGoToAllFragrances={goToAllFragrances}
          onGoToCategory={(choice) => navigate(`/${choice}`)}
        />
        <a href="#best-sellers" onClick={(event) => { event.preventDefault(); goToSection('best-sellers'); }}>Best Sellers</a>
        <button onClick={() => setQuizOpen(true)}>Scent Finder</button>
        <a href="#gifts" onClick={(event) => { event.preventDefault(); goToSection('gifts'); }}>Gifts</a>
      </nav>
      <div className="nav-actions">
        <button className="icon-btn" aria-label="Search fragrances" onClick={focusSearch}><Icon name="search"/></button>
        <button
          className={`icon-btn${wishlistFilterOn ? ' active' : ''}`}
          aria-label={wishlistFilterOn ? 'Show all fragrances' : 'Show saved fragrances'}
          aria-pressed={wishlistFilterOn}
          onClick={() => { setWishlistFilterOn((on) => !on); goToSection('collection'); }}
        ><Icon name="heart" filled={wishlistFilterOn}/></button>
        <button className="bag" onClick={() => setCartOpen(true)} aria-label={`Open bag with ${itemCount} items`}><Icon name="bag"/>{itemCount > 0 && <b>{itemCount}</b>}</button>
      </div>
    </header>

    <main id="top" tabIndex={-1}>
      {activeProduct ? <ProductDetailPage
        product={activeProduct}
        selectedSize={selectedSize}
        onSelectSize={setSelectedSize}
        mutating={mutating}
        addBottle={addBottle}
        buyNow={buyNow}
        onBack={closeProduct}
        onSampleFirst={() => { closeProduct(); setQuizOpen(true); }}
        relatedProducts={relatedProducts}
        recentlyViewedProducts={recentlyViewedProducts.filter((item) => item.id !== activeProduct.id)}
        wishlist={wishlist}
        toggleWishlist={toggleWishlist}
        openProduct={openProduct}
      /> : categoryGender ? <CategoryListing
        pageGender={categoryGender}
        searchInputRef={searchInputRef}
        search={search} onSearchChange={setSearch}
        searchSuggestions={searchSuggestions} onSelectSuggestion={openProduct}
        family={family} familyOptions={familyOptions} onFamilyChange={setFamily}
        brand={brand} brandOptions={brandOptions} onBrandChange={setBrand}
        priceBucket={priceBucket} onPriceBucketChange={setPriceBucket}
        availabilityOnly={availabilityOnly} onAvailabilityChange={setAvailabilityOnly}
        sizeFilter={sizeFilter} sizeOptions={sizeOptions} onSizeChange={setSizeFilter}
        occasion={occasion} occasionOptions={occasionOptions} onOccasionChange={setOccasion}
        concentration={concentration} concentrationOptions={concentrationOptions} onConcentrationChange={setConcentration}
        newArrivalOnly={newArrivalOnly} onNewArrivalChange={setNewArrivalOnly}
        bestSellerOnly={bestSellerOnly} onBestSellerChange={setBestSellerOnly}
        onSaleOnly={onSaleOnly} onOnSaleChange={setOnSaleOnly}
        sort={sort} sortOptions={Object.entries(SORT_OPTIONS).map(([value, option]) => ({ value, label: option.label }))} onSortChange={setSort}
        activeFilterCount={categoryActiveFilterCount} onClearFacets={clearCategoryFacets} onClearAll={clearCategoryFilters}
        filtered={filtered} visibleCount={visibleCount} onShowMore={() => setVisibleCount((count) => count + 12)}
        productsLoading={productsLoading} productsError={productsError}
        mutating={mutating} wishlist={wishlist} toggleWishlist={toggleWishlist} openProduct={openProduct} addBottle={addBottle}
        bestSellers={bestSellers}
        wishlistFilterOn={wishlistFilterOn} onClearWishlistFilter={() => setWishlistFilterOn(false)}
        filterDrawerOpen={filterDrawerOpen} onOpenFilters={() => setFilterDrawerOpen(true)} onCloseFilters={() => setFilterDrawerOpen(false)} filterDrawerDialogRef={filterDrawerDialogRef}
      /> : <>
      {/* Collection now leads the shop homepage (H-07): the entry gateway
          already delivers the "hero" moment before this page is ever
          reached, so a shopper who chose Men/Women on the gateway lands
          directly on the real, filtered product grid instead of a second
          marketing homepage first. Same CategoryListing component /men
          /women use (H-10) - pageGender omitted here, so Gender becomes a
          real sidebar facet like any other instead of the page's fixed
          identity, and the heading reads "All Fragrances" instead of
          "{X}'s Fragrances". */}
      <section id="collection">
        <CategoryListing
          searchInputRef={searchInputRef}
          search={search} onSearchChange={setSearch}
          searchSuggestions={searchSuggestions} onSelectSuggestion={openProduct}
          family={family} familyOptions={familyOptions} onFamilyChange={setFamily}
          brand={brand} brandOptions={brandOptions} onBrandChange={setBrand}
          priceBucket={priceBucket} onPriceBucketChange={setPriceBucket}
          availabilityOnly={availabilityOnly} onAvailabilityChange={setAvailabilityOnly}
          sizeFilter={sizeFilter} sizeOptions={sizeOptions} onSizeChange={setSizeFilter}
          gender={gender} genderOptions={genderOptions} onGenderChange={setGender}
          occasion={occasion} occasionOptions={occasionOptions} onOccasionChange={setOccasion}
          concentration={concentration} concentrationOptions={concentrationOptions} onConcentrationChange={setConcentration}
          newArrivalOnly={newArrivalOnly} onNewArrivalChange={setNewArrivalOnly}
          bestSellerOnly={bestSellerOnly} onBestSellerChange={setBestSellerOnly}
          onSaleOnly={onSaleOnly} onOnSaleChange={setOnSaleOnly}
          sort={sort} sortOptions={Object.entries(SORT_OPTIONS).map(([value, option]) => ({ value, label: option.label }))} onSortChange={setSort}
          activeFilterCount={activeFilterCount} onClearFacets={clearFilterFacets} onClearAll={clearFilters}
          filtered={filtered} visibleCount={visibleCount} onShowMore={() => setVisibleCount((count) => count + 12)}
          productsLoading={productsLoading} productsError={productsError}
          mutating={mutating} wishlist={wishlist} toggleWishlist={toggleWishlist} openProduct={openProduct} addBottle={addBottle}
          bestSellers={bestSellers}
          recentlyViewedProducts={recentlyViewedProducts}
          wishlistFilterOn={wishlistFilterOn} onClearWishlistFilter={() => setWishlistFilterOn(false)}
          filterDrawerOpen={filterDrawerOpen} onOpenFilters={() => setFilterDrawerOpen(true)} onCloseFilters={() => setFilterDrawerOpen(false)} filterDrawerDialogRef={filterDrawerDialogRef}
        />
      </section>

      <section className="trust-row" aria-label="Store commitments">
        <div><Icon name="shield" size={34}/><strong>100% Authentic</strong><span>We source directly from authorized distributors</span></div>
        <div><Icon name="truck" size={34}/><strong>Free Shipping</strong><span>On orders $100+ within the U.S.</span></div>
        <div><Icon name="gift" size={34}/><strong>Luxury Gift Packaging</strong><span>Optional gift wrap at checkout</span></div>
        <div><Icon name="refresh" size={34}/><strong>Easy Returns</strong><span>30-day returns on unopened items</span></div>
      </section>

      <section id="best-sellers" className="bestsellers-section" data-reveal>
        <div className="collection-head"><div><p className="overline dark">Best sellers</p><h2>What Aurelia customers reach for first.</h2></div><Button variant="text" onClick={() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })}>View all <Icon name="arrowRight"/></Button></div>
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

      <section id="gifts" className="gift-section" data-reveal>
        <div className="gift-copy"><p className="overline">Fragrance, made easier to give</p><h2>A thoughtful gift<br/>without pretending to know.</h2><p>Choose a personalized discovery set, add a message and let the recipient use the value toward the fragrance they love.</p><div className="gift-points"><span>Complimentary gift note</span><span>Price-hidden receipt</span><span>Optional gift wrap</span><span>Digital gift cards</span></div><Button variant="secondary" onClick={() => { setQuizAnswers({0:'Gift'}); setQuizStep(1); setQuizOpen(true); }}>Find a gift <Icon name="arrowUpRight"/></Button></div>
        <div className="gift-art" aria-hidden="true"><div className="gift-box"><span>AURELIA</span><i/></div></div>
      </section>

      <section id="policies" className="policies" data-reveal>
        <article><span>01</span><h3>Unopened bottles</h3><p>Eligible for return within 30 days when unused, sealed and in original condition. Return-shipping terms are shown before purchase.</p></article>
        <article><span>02</span><h3>Damaged or incorrect orders</h3><p>Contact support with photos. We replace leaking, damaged or incorrect products after verification.</p></article>
        <article><span>03</span><h3>Opened fragrance</h3><p>Opened bottles are generally not returnable for preference. Our sample-credit path is designed to prevent that costly mistake.</p></article>
        <article><span>04</span><h3>Shipping scope</h3><p>Ground delivery within the contiguous U.S. Final carrier, packaging and dangerous-goods rules are configured in Shopify shipping profiles.</p></article>
      </section>
      </>}
    </main>

    <footer className="site-footer">
      <div><Logo className="footer-logo"/><h2>Choose slowly.<br/><em>Wear confidently.</em></h2></div>
      <div className="footer-links"><a href="#collection" onClick={(event) => { event.preventDefault(); goToAllFragrances(); }}>Full bottles</a><a href="#gifts" onClick={(event) => { event.preventDefault(); goToSection('gifts'); }}>Gifts</a><button onClick={() => setQuizOpen(true)}>Scent finder</button><a href="#policies" onClick={(event) => { event.preventDefault(); goToSection('policies'); }}>Shipping &amp; returns</a></div>
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

    {menuOpen && <Dialog overlayClassName="menu-overlay" label="Mobile menu" dialogRef={menuDialogRef}><DialogClose onClick={() => setMenuOpen(false)} /><nav><a href="#collection" onClick={(event) => { event.preventDefault(); setMenuOpen(false); goToAllFragrances(); }}>Shop fragrances</a><a href="#gifts" onClick={(event) => { event.preventDefault(); setMenuOpen(false); goToSection('gifts'); }}>Gifts</a><button onClick={() => { setMenuOpen(false); setQuizOpen(true); }}>Find your scent</button></nav></Dialog>}

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
        <div className="cart-list">{cart.lines.map((line) => <article key={line.lineId}><div className="cart-art">{line.type === 'discovery' ? <div className="mini-set">3</div> : line.type === 'gift-wrap' ? <div className="mini-set" aria-hidden="true">GW</div> : <PerfumeBottle tone="rose" compact image={line.image} alt={line.imageAlt || line.name}/>}</div><div><small>{line.type === 'discovery' ? 'Discovery set' : line.type === 'gift-wrap' ? 'Gift wrap' : line.name}</small><h3>{line.type === 'discovery' ? 'Personal discovery set' : line.name}</h3><p>{line.size}</p>{line.matches && <p>{line.matches.join(' · ')}</p>}{line.type !== 'gift-wrap' && <div className="quantity"><button onClick={() => updateQuantity(line, -1)} aria-label={`Decrease quantity of ${line.name}`}><Icon name="minus"/></button><span>{line.quantity}</span><button onClick={() => updateQuantity(line, 1)} aria-label={`Increase quantity of ${line.name}`}><Icon name="plus"/></button></div>}</div><strong>{money(line.lineTotal)}</strong></article>)}</div>
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
        {cartCrossSell.length > 0 && <div className="cart-cross-sell">
          <p className="overline dark">You may also like</p>
          <div className="rail-row">
            {cartCrossSell.map((product) => <ProductCard
              key={product.id}
              product={product}
              size="rail"
              mutating={mutating}
              wishlisted={wishlist.includes(product.id)}
              onToggleWishlist={toggleWishlist}
              onOpen={(clickedProduct) => { setCartOpen(false); openProduct(clickedProduct); }}
              onQuickAdd={addBottle}
            />)}
          </div>
        </div>}
        {crossSell.product && <div className="smart-pair"><p className="overline dark">A useful next step</p>{crossSell.type === 'discovery' ? <><h3>Not completely sure?</h3><p>Try three matches before opening another full bottle. The {money(crossSell.product.price)} becomes bottle credit.</p><button disabled={mutating} onClick={() => addDiscoverySet(products.slice(0,3))}>Add discovery set — {money(crossSell.product.price)}</button></> : <><h3>{crossSell.product.name}</h3><p>Your discovery set can lead into this full bottle once you have worn it at home.</p><button disabled={mutating} onClick={() => addBottle(crossSell.product, crossSell.product.sizes[0]?.label)}>Add {crossSell.product.sizes[0]?.label} — {money(crossSell.product.price)}</button></>}</div>}
        <div className="checkout"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><small>Taxes and eligible ground-shipping rates are calculated at checkout.</small><div className="payment-badges"><span>Visa</span><span>Mastercard</span><span>Amex</span><span>Apple Pay</span><span>Shop Pay</span></div><Button href={cart?.checkoutUrl || undefined} style={{opacity: cart?.checkoutUrl ? 1 : .5, pointerEvents: cart?.checkoutUrl ? 'auto' : 'none'}}>Checkout <Icon name="arrowRight"/></Button><p>Secure checkout is hosted by Shopify. No account required.</p></div>
      </>}
    </div></Dialog>}
  </div>;
}

export default App;
