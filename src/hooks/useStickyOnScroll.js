import { useEffect, useRef, useState } from 'react';

// CSS `position: sticky` can't work anywhere in this app — .site-shell (the
// outer wrapper, needed so decorative absolutely-positioned elements never
// cause horizontal scroll) has `overflow: hidden`, which disables sticky for
// every descendant per spec. The nav already works around this by tracking
// scroll position in JS and toggling real `position: fixed` once an
// element's natural position scrolls past a fixed header stack, with a
// same-height placeholder so content doesn't jump. Originally built inline
// in FilterBar.jsx (Phase 3) for the Collection page's filter bar; extracted
// here so the Product Detail Page's sticky purchase box and mobile sticky
// add-to-cart bar can reuse the exact same, already-debugged logic instead
// of re-deriving it.
//
// Usage: const { ref, pinned, height } = useStickyOnScroll(110);
// Attach `ref` to the element that should pin, add an `is-pinned` class
// (or similar) when `pinned` is true, and apply `style={{ height }}` only
// while pinned so the element's normal-flow space doesn't collapse.
//
// Also returns `left`/`width` (the element's own horizontal position/size
// right before it pinned) for callers — like the Product Detail Page's
// purchase box, which only occupies one column rather than the full
// viewport width like the Collection filter bar — that need to lock their
// fixed-position box to the same horizontal space it occupied in flow,
// the same way real `position: sticky` would.
export function useStickyOnScroll(offset) {
  const ref = useRef(null);
  const naturalTopRef = useRef(null);
  const [pinned, setPinned] = useState(false);
  const [rect, setRect] = useState({ height: 0, left: 0, width: 0 });

  useEffect(() => {
    // Keep re-measuring on every tick while unpinned — async image/webfont
    // loads shift layout well after mount, so a one-time measurement goes
    // stale and pins prematurely (confirmed via a Playwright repro in Phase
    // 3: pinning fired ~450px before the bar had actually scrolled near the
    // header). Freeze the reference the instant it pins so a fixed
    // element's own ever-growing getBoundingClientRect().top doesn't
    // corrupt it.
    const measure = () => {
      if (!ref.current) return;
      const box = ref.current.getBoundingClientRect();
      naturalTopRef.current = box.top + window.scrollY;
      setRect({ height: box.height, left: box.left, width: box.width });
    };
    const onScroll = () => {
      if (!pinned) measure();
      if (naturalTopRef.current == null) return;
      setPinned(window.scrollY + offset >= naturalTopRef.current);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [pinned, offset]);

  return { ref, pinned, height: rect.height, left: rect.left, width: rect.width };
}
