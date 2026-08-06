import React, { useState } from 'react';

// Campaign media contract for the hero. Real desktop/tablet/mobile
// photography (and, optionally, a video) go here once they're shot — see
// public/images/campaigns/README.md for exact dimensions and crop-safe
// areas. None of that exists yet, so every path below points at a file
// that isn't there, and the component is built to fail gracefully when
// that's true: no broken-image icon, no letterboxed white rectangle,
// just a neutral dark backdrop (the same tone the real photography's own
// left-hand "dark, uncluttered" zone is briefed to have) until a real
// asset lands. This deliberately does not fabricate a photorealistic
// scene or float a studio product shot on top of it — see the removed
// PerfumeBottle usage this replaced.
const DEFAULT_ASSETS = {
  desktop: '/images/campaigns/hero-desktop-placeholder.jpg',
  tablet: '/images/campaigns/hero-tablet-placeholder.jpg',
  mobile: '/images/campaigns/hero-mobile-placeholder.jpg'
};

export default function HeroMedia({
  desktopImage = DEFAULT_ASSETS.desktop,
  tabletImage = DEFAULT_ASSETS.tablet,
  mobileImage = DEFAULT_ASSETS.mobile,
  video = null,
  className = ''
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className={`hero-media ${className}`.trim()} aria-hidden="true">
      {video ? (
        <video className="hero-media-video" src={video} autoPlay muted loop playsInline />
      ) : !imageFailed ? (
        <picture className="hero-media-picture">
          <source media="(max-width:640px)" srcSet={mobileImage} />
          <source media="(max-width:1024px)" srcSet={tabletImage} />
          <img className="hero-media-image" src={desktopImage} alt="" onError={() => setImageFailed(true)} />
        </picture>
      ) : null}
    </div>
  );
}
