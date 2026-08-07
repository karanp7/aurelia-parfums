# Hero campaign media

This folder is where the real hero background photography (and,
optionally, a video) go once shot. Nothing here yet — `HeroMedia.jsx`
references the filenames below, they don't exist, and the component
falls back to a neutral dark backdrop until they do (see the comment at
the top of that file for how the fallback works).

Drop files in using these exact names and the hero picks them up with no
code changes:

```
public/images/campaigns/hero-desktop-placeholder.jpg   (rename to the real file, same path)
public/images/campaigns/hero-tablet-placeholder.jpg
public/images/campaigns/hero-mobile-placeholder.jpg
public/images/campaigns/hero-video.mp4                 (optional, pass its path into <HeroMedia video=.../>)
```

## Desktop — `hero-desktop-placeholder.jpg`

- **Size:** ~2400 × 1200px (roughly 2:1)
- **Subject:** bottle/product positioned on the **right** third of the frame
- **Left two-thirds:** dark, uncluttered — this is where the headline,
  buttons, and eyebrow text sit. Avoid busy detail, bright highlights, or
  anything the eye needs to read in that zone.
- **No text baked into the image** — all copy is real HTML/CSS on top.
- **No white/studio background** — this replaces a plain product cutout,
  not a resized version of one.
- Shown at `object-fit: cover`, so the extreme top/bottom edges may crop
  on unusually wide or narrow viewports. Keep the subject and the
  dark-left copy zone within the center ~85% of the frame vertically.

## Tablet — `hero-tablet-placeholder.jpg`

- Same brief as desktop (subject right, dark left, no text, no white bg).
- Used between 641px and 1024px viewport width.
- A tighter crop of the same shot works fine if a separate capture isn't
  available — doesn't need to be a wholly different photo.

## Mobile — `hero-mobile-placeholder.jpg`

- **Size:** ~1200 × 1600px, **portrait**
- **Subject:** bottle positioned **upper-middle or right** of frame
- **Safe area:** the **lower portion** of the frame needs to read as dark
  and uncluttered — headline and buttons stack there on mobile (the
  layout anchors hero text to the bottom of the section below 800px
  viewport width, with its own scrim gradient darkening that zone
  further as a safety net — the photo itself should already be
  reasonably dark/calm there, not relying on the scrim alone).
- Used at 640px viewport width and below.
- No text baked in, no white background — same rules as desktop.

## Video (optional)

If a campaign video exists instead of/alongside stills, pass its path to
`<HeroMedia video="/images/campaigns/hero-video.mp4" />` in `App.jsx`.
When `video` is set it takes priority over the image sources entirely.
Should be silent (it renders muted regardless), loop cleanly, and follow
the same "dark left, subject right" composition as the desktop still so
the text overlay stays legible.

---

# Entry gateway media

The site's front door (`EntryGateway.jsx`) — shown once per browser
session before the shop itself. Separate filenames from the hero above
so the two campaigns can be shot/updated independently. Same fallback
contract: nothing here yet, so the hero falls back to a neutral dark
gradient and each of the three tiles falls back to one of the site's
existing decorative tones, never a broken-image icon.

```
public/images/campaigns/gateway-hero-desktop.jpg
public/images/campaigns/gateway-hero-tablet.jpg
public/images/campaigns/gateway-hero-mobile.jpg
public/images/campaigns/gateway-women.jpg
public/images/campaigns/gateway-men.jpg
public/images/campaigns/gateway-gifts.jpg
```

## Gateway hero — `gateway-hero-desktop/tablet/mobile.jpg`

- Same crop/composition brief as the shop hero above, but this one is
  shown **centered full-bleed** behind a centered headline, not a
  left-aligned one — keep the **center** of the frame calm/uncluttered
  rather than the left third, and avoid anything that needs to be read
  directly behind the middle of the frame.
- No text baked in, no white/studio background, same as every other
  campaign asset on this site.
- Desktop ~2400×1200 (2:1), tablet a tighter crop of the same shot,
  mobile ~1200×1600 portrait.

## Category tiles — `gateway-women.jpg` / `gateway-men.jpg` / `gateway-gifts.jpg`

- **Size:** ~1200×1600px, portrait (shown at `object-fit: cover` in a
  3:4 box on desktop, 4:3 on mobile where the three stack vertically).
- Each tile has its own dark scrim gradient along the **bottom** third
  for the label/CTA sitting there — keep the bottom of the frame darker
  and less busy than the rest, similar to the mobile hero's safe area.
- No text baked in.
