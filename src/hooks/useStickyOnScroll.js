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
//
// Optional `containerRef`: bounds how long the element stays pinned to the
// container's own bottom edge, matching real `position: sticky`'s built-in
// behavior of un-sticking once its containing block scrolls past. Without
// this, an element pins for the rest of the page's scroll (fine for the
// Collection filter bar, which is meant to stay visible over the whole
// grid) — but a sidebar-style box like the PDP's purchase box would
// otherwise keep floating over unrelated full-width sections below its own
// column and visibly overlap/cut off their content (caught via a
// Playwright screenshot: the pinned box covered the Authenticity
// section's heading and third card).
export function useStickyOnScroll(offset, containerRef) {
  const ref = useRef(null);
  const naturalTopRef = useRef(null);
  const containerBottomRef = useRef(null);
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
      if (containerRef?.current) {
        containerBottomRef.current = containerRef.current.getBoundingClientRect().bottom + window.scrollY;
      }
    };
    const onScroll = () => {
      if (!pinned) measure();
      if (naturalTopRef.current == null) return;
      const pastTop = window.scrollY + offset >= naturalTopRef.current;
      // Deliberately doesn't factor the pinned element's own height into
      // this check (i.e. doesn't require the whole box to fit above the
      // container's bottom edge) - with a tall box that would leave almost
      // no room to ever pin. Good enough to fix the actual bug (floating
      // over unrelated full-width sections below the container) without
      // being pixel-perfect about the box's trailing edge.
      const withinContainer = containerBottomRef.current == null || window.scrollY + offset <= containerBottomRef.current;
      setPinned(pastTop && withinContainer);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [pinned, offset, containerRef]);

  return { ref, pinned, height: rect.height, left: rect.left, width: rect.width };
}
