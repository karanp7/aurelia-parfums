import React, { useState } from 'react';

// The permanent campaign engine behind the hero (and, by the same
// contract, any future full-bleed editorial banner). Swap the three
// image props / video prop for a new season's assets - Christmas,
// summer, Father's Day, Valentine's, Black Friday - and nothing else
// needs to change; see public/images/campaigns/README.md for the exact
// crop/composition brief every asset (including today's placeholder) is
// expected to follow, so the text-safe zone stays correct across
// campaigns without touching code.
//
// None of the default assets exist yet, so every one currently fails to
// load, and the component is built to fail gracefully when that's true:
// no broken-image icon, no letterboxed white rectangle, just the neutral
// dark backdrop (see .hero-media in styles.css) until a real asset lands.
// Real media fades in once decoded rather than popping in - onLoad/
// onLoadedData toggle `is-loaded`, styles.css does the actual transition.
const DEFAULT_ASSETS = {
  desktop: '/images/campaigns/hero-desktop-placeholder.png',
  tablet: '/images/campaigns/hero-tablet-placeholder.jpg',
  mobile: '/images/campaigns/hero-mobile-placeholder.jpg'
};

export default function HeroMedia({
  desktopImage = DEFAULT_ASSETS.desktop,
  tabletImage = DEFAULT_ASSETS.tablet,
  mobileImage = DEFAULT_ASSETS.mobile,
  video = null,
  overlay = true,
  loading = 'eager',
  className = ''
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`hero-media ${className}`.trim()} aria-hidden="true">
      {video ? (
        <video
          className={`hero-media-video${loaded ? ' is-loaded' : ''}`}
          src={video}
          autoPlay
          muted
          loop
          playsInline
          onLoadedData={() => setLoaded(true)}
        />
      ) : !imageFailed ? (
        <picture className="hero-media-picture">
          <source media="(max-width:640px)" srcSet={mobileImage} />
          <source media="(max-width:1024px)" srcSet={tabletImage} />
          {/* The hero image is almost always the page's LCP element, so it
              loads eager (not lazy) by default - lazy-loading it would
              directly hurt the Lighthouse/LCP numbers Part 13 asks to
              protect. `loading` stays a prop rather than hardcoded in
              case HeroMedia is ever reused below the fold (an editorial
              banner further down a page), where lazy would be correct. */}
          <img
            className={`hero-media-image${loaded ? ' is-loaded' : ''}`}
            src={desktopImage}
            alt=""
            loading={loading}
            onLoad={() => setLoaded(true)}
            onError={() => setImageFailed(true)}
          />
        </picture>
      ) : null}
      {overlay && <div className="hero-media-dark" aria-hidden="true" />}
      {overlay && <div className="hero-media-gradient" aria-hidden="true" />}
    </div>
  );
}
