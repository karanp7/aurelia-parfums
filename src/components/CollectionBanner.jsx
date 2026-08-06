import React from 'react';
import Button from './Button.jsx';
import Icon from './Icon.jsx';

// Optional editorial banner for the Collection page - image or video,
// headline, description, CTA. Renders nothing when no banner data exists
// (the real, current state: no Shopify Collection resource is queried
// anywhere in this app - the "Collection page" is a client-side filtered
// view over the full product list, so there's no live seasonal/designer-
// spotlight/collection-story content to show yet) rather than shipping a
// placeholder box. Ready for Holiday, Summer, Designer Spotlight, New
// Arrivals, or Limited Edition campaigns once a real content source (a
// Shopify Collection's own image/description/metafields) is queried -
// swapping the `banner` prop's data is meant to be the only change
// needed, same contract as HeroMedia's campaign props.
export default function CollectionBanner({ banner }) {
  if (!banner) return null;
  const { image, video, eyebrow, headline, description, ctaLabel, ctaHref, onCtaClick } = banner;

  return (
    <section className="collection-banner" aria-label={headline}>
      <div className="collection-banner-media" aria-hidden="true">
        {video ? (
          <video className="collection-banner-video" src={video} autoPlay muted loop playsInline />
        ) : image ? (
          <img className="collection-banner-image" src={image} alt="" loading="lazy" />
        ) : null}
      </div>
      <div className="collection-banner-copy">
        {eyebrow && <p className="overline dark">{eyebrow}</p>}
        <h2>{headline}</h2>
        {description && <p>{description}</p>}
        {ctaLabel && <Button variant="secondary" href={ctaHref} onClick={onCtaClick}>{ctaLabel} <Icon name="arrowRight"/></Button>}
      </div>
    </section>
  );
}
