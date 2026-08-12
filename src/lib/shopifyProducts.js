import { shopifyFetch, shortId } from './shopify.js';

// Kept intentionally small — Storefront API fields that exist on every
// Shopify product with zero setup, no metafields required.
//
// The metafield fields below are the one exception: they're real extension
// points for the Product Detail Page's Fragrance Pyramid / Performance /
// Occasions sections, which stay hidden until a merchant actually sets
// them (see mapShopifyProduct below and PRODUCT_METAFIELD_KEYS at the
// bottom of this file for the exact namespace/key each one needs). Safe to
// request unconditionally: Shopify returns `null` for an unset metafield
// rather than erroring the query, unlike e.g. `quantityAvailable`, which
// requires a shop-level Storefront API setting and was deliberately left
// out for that reason.
const PRODUCT_FIELDS = `
  id
  handle
  title
  description
  vendor
  productType
  tags
  availableForSale
  images(first: 5) { nodes { url altText } }
  priceRange { minVariantPrice { amount currencyCode } }
  variants(first: 10) {
    nodes {
      id
      title
      availableForSale
      price { amount currencyCode }
      compareAtPrice { amount currencyCode }
      selectedOptions { name value }
    }
  }
  topNotes: metafield(namespace: "custom", key: "top_notes") { value }
  heartNotes: metafield(namespace: "custom", key: "heart_notes") { value }
  baseNotes: metafield(namespace: "custom", key: "base_notes") { value }
  longevity: metafield(namespace: "custom", key: "longevity") { value }
  projection: metafield(namespace: "custom", key: "projection") { value }
  versatility: metafield(namespace: "custom", key: "versatility") { value }
  occasions: metafield(namespace: "custom", key: "occasions") { value }
  # Unlike the plain-text metafields above, Shopify's standard "Target
  # gender" category metafield is a metaobject reference (its entries -
  # Male/Female/Unisex - are metaobjects, not literal text: confirmed via
  # Shopify Admin, Settings > Custom data > Metaobjects > "Target
  # gender"). A plain { value } only returns the metaobject's raw
  # GID/reference id, not "Male" - reference/references walks through to
  # the actual metaobject and its fields, covering both the single- and
  # list-reference configurations since only one of the two is ever
  # populated for a given metafield.
  targetGender: metafield(namespace: "shopify", key: "target-gender") {
    value
    reference {
      ... on Metaobject { handle fields { key value } }
    }
    references(first: 5) {
      nodes {
        ... on Metaobject { handle fields { key value } }
      }
    }
  }
`;

// Collection page sort options map straight onto Shopify's own
// productSortKeys enum/reverse args - real server-side ordering (sales
// rank, creation date, price, title), never a client-invented "popularity"
// score. See SORT_OPTIONS in the caller for the label <-> key mapping.
const PRODUCTS_QUERY = `
  query StorefrontProducts($first: Int!, $sortKey: ProductSortKeys, $reverse: Boolean) {
    products(first: $first, sortKey: $sortKey, reverse: $reverse) {
      nodes { ${PRODUCT_FIELDS} }
    }
  }
`;

const PRODUCT_BY_HANDLE_QUERY = `
  query StorefrontProductByHandle($handle: String!) {
    product(handle: $handle) { ${PRODUCT_FIELDS} }
  }
`;

// The Scent Finder quiz's "how should it feel" / "how noticeable" questions
// score against these words if a merchant has added them as product tags.
// No metafields exist yet (see conversation) — this is the documented
// upgrade path: add Storefront metafields (family, mood, intensity, notes,
// per the old SHOPIFY_IMPLEMENTATION.md plan) for richer matching later.
export const MOOD_TAGS = ['Elegant', 'Confident', 'Energizing', 'Comforting', 'Magnetic', 'Romantic'];
export const INTENSITY_TAGS = ['Soft', 'Balanced', 'Bold'];

const TONES = ['rose', 'amber', 'blue', 'plum', 'cream', 'red'];

/**
 * Purely decorative color assignment (the card backdrop / bottle tint) —
 * not a claim about the product, so it's safe to derive deterministically
 * from the product id rather than requiring merchant input.
 */
export function deriveTone(id) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  return TONES[hash % TONES.length];
}

function findTag(tags, options) {
  return options.find((option) => tags.some((tag) => tag.toLowerCase() === option.toLowerCase())) || null;
}

/** Only ever reflects a real merchant-set tag — never fabricated. */
function deriveBadge(tags) {
  const lower = tags.map((tag) => tag.toLowerCase());
  if (lower.includes('bestseller')) return 'Bestseller';
  if (lower.includes('new')) return 'New';
  if (lower.includes('limited') || lower.includes('small batch')) return 'Small batch';
  if (lower.includes('exclusive')) return 'Exclusive';
  if (lower.includes('editors-pick') || lower.includes("editor's pick") || lower.includes('editors pick')) return "Editor's Pick";
  return null;
}

// The "Target gender" metaobject's entries (confirmed via Shopify Admin:
// Content > Metaobjects > Target gender -> Gender/Male/Female rows) - the
// exact field key Shopify uses internally for the entry's own display
// text isn't documented anywhere reachable, so rather than bet on one
// guessed key name, every field's value AND the metaobject's own handle
// are scanned for a literal "male"/"female"/"unisex" match - whichever
// key Shopify actually used, one of these is virtually certain to carry
// that word given what Admin visibly shows for these three entries.
function extractMetaobjectGenderWord(metaobject) {
  if (!metaobject) return null;
  const candidates = [metaobject.handle, ...(metaobject.fields || []).map((field) => field.value)]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase().trim());
  return candidates.find((word) => word === 'male' || word === 'female' || word === 'unisex') || null;
}

// Primary source: Shopify's own Standard Product Taxonomy "Target gender"
// category metafield (namespace "shopify", key "target-gender") - set via
// the "Category metafields" panel Shopify Admin shows once a product has
// a matching category, not a custom tag. Confirmed as this store's actual
// setup - a metaobject reference (Male/Female/Unisex are metaobject
// entries, not plain text), so it's checked first. Falls back to a plain
// "Men"/"Women"/"Unisex" tag (or a legacy "Target Gender : Male" free-text
// tag) for any product that only has a tag set - never fabricated either
// way, all are real merchant-entered values.
function deriveGender(tags, targetGenderMetafield) {
  const metaobject = targetGenderMetafield?.reference || targetGenderMetafield?.references?.nodes?.[0];
  const fromMetaobject = extractMetaobjectGenderWord(metaobject);
  if (fromMetaobject === 'male') return 'Men';
  if (fromMetaobject === 'female') return 'Women';
  if (fromMetaobject === 'unisex') return 'Unisex';

  // Covers the (less likely, but cheap to also support) case of a plain
  // text metafield value rather than a metaobject reference.
  const fromPlainValue = parseMetafieldList(targetGenderMetafield?.value)[0]?.toLowerCase();
  if (fromPlainValue === 'male') return 'Men';
  if (fromPlainValue === 'female') return 'Women';
  if (fromPlainValue === 'unisex') return 'Unisex';

  const lower = tags.map((tag) => tag.toLowerCase().trim());
  if (lower.some((tag) => tag === 'men' || tag === "men's" || tag === 'mens' || tag === 'male')) return 'Men';
  if (lower.some((tag) => tag === 'women' || tag === "women's" || tag === 'womens' || tag === 'female')) return 'Women';
  if (lower.includes('unisex')) return 'Unisex';
  const targetGenderTag = lower.find((tag) => tag.startsWith('target gender'));
  if (targetGenderTag) {
    const value = targetGenderTag.split(':')[1]?.trim();
    if (value === 'male') return 'Men';
    if (value === 'female') return 'Women';
    if (value === 'unisex') return 'Unisex';
  }
  return null;
}

// Parses a metafield value into a list, defensively - works whether a
// merchant configures it as a `list.single_line_text_field` (Storefront
// API returns that as a JSON-encoded array string) or a plain single-line
// text field with comma-separated values. Returns [] (not fabricated
// content) for anything empty or unparseable.
function parseMetafieldList(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).map((item) => item.trim()).filter(Boolean);
  } catch {
    // Not JSON - fall through to comma-split below.
  }
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

// Performance metafields (longevity/projection/versatility) are expected
// as a plain number 0-5 - clamped defensively rather than trusting
// whatever a merchant typed. Returns null (section stays hidden) for
// anything unset or non-numeric, never a guessed rating.
function parseMetafieldRating(value) {
  if (!value) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.max(0, Math.min(5, num));
}

function truncate(text, max = 130) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

// Real, not guessed: only returns a value if a merchant has actually
// configured a variant option literally named "Concentration" (e.g. "Eau
// de Parfum" vs "Eau de Toilette") — most stores won't have this set up,
// so callers simply omit it rather than inferring it from a size label or
// product title. Shared by the Product Detail Page and ProductCard so both
// apply the identical honesty rule instead of each guessing independently.
export function findConcentration(product) {
  for (const size of product.sizes) {
    const match = (size.selectedOptions || []).find((option) => /concentration/i.test(option.name));
    if (match?.value) return match.value;
  }
  return null;
}

export function mapShopifyProduct(node) {
  const images = node.images?.nodes || [];
  const tags = node.tags || [];
  const sizes = (node.variants?.nodes || []).map((variant) => {
    const price = Number(variant.price.amount);
    // Only ever a real Shopify compare-at value — never computed/invented.
    // Shopify treats compareAtPrice <= price as "no discount" (a merchant
    // artifact, not a real markdown), so that case is dropped here too.
    const compareAtRaw = variant.compareAtPrice?.amount ? Number(variant.compareAtPrice.amount) : null;
    const compareAtPrice = compareAtRaw && compareAtRaw > price ? compareAtRaw : null;
    return {
      variantId: variant.id,
      label: variant.title === 'Default Title' ? 'Standard' : variant.title,
      price,
      compareAtPrice,
      availableForSale: variant.availableForSale,
      selectedOptions: variant.selectedOptions || []
    };
  });

  return {
    id: shortId(node.id),
    gid: node.id,
    handle: node.handle,
    name: node.title,
    house: node.vendor || 'Aurelia Parfums',
    // Distinct from `house` above: null when Shopify's vendor field was
    // never set, rather than coalesced to the store's own name — Featured
    // Brands (Milestone 6) needs this to avoid listing the store itself as
    // if it were a resold designer brand.
    vendorRaw: node.vendor || null,
    family: node.productType || 'Fragrance',
    tags,
    mood: findTag(tags, MOOD_TAGS),
    intensityTag: findTag(tags, INTENSITY_TAGS),
    badge: deriveBadge(tags),
    gender: deriveGender(tags, node.targetGender),
    tone: deriveTone(node.id),
    price: sizes[0]?.price ?? Number(node.priceRange?.minVariantPrice?.amount ?? 0),
    compareAtPrice: sizes[0]?.compareAtPrice ?? null,
    sizes,
    availableForSale: Boolean(node.availableForSale) && sizes.some((size) => size.availableForSale),
    summary: truncate(node.description),
    description: (node.description || '').trim(),
    image: images[0]?.url || '',
    imageAlt: images[0]?.altText || node.title,
    images,
    // Structural extension points for the Product Detail Page - each stays
    // an empty array/null until the matching metafield is actually set in
    // Shopify Admin (see PRODUCT_METAFIELD_KEYS below), never fabricated.
    notes: {
      top: parseMetafieldList(node.topNotes?.value),
      heart: parseMetafieldList(node.heartNotes?.value),
      base: parseMetafieldList(node.baseNotes?.value)
    },
    performance: {
      longevity: parseMetafieldRating(node.longevity?.value),
      projection: parseMetafieldRating(node.projection?.value),
      versatility: parseMetafieldRating(node.versatility?.value)
    },
    occasions: parseMetafieldList(node.occasions?.value)
  };
}

// Reference for setting these up in Shopify Admin (Settings > Custom data
// > Products > Add definition), so the Fragrance Pyramid/Performance/
// Occasions sections on the Product Detail Page activate automatically
// with zero further code changes once real values exist:
//   custom.top_notes / custom.heart_notes / custom.base_notes
//     - list of single-line text (or comma-separated single-line text)
//   custom.longevity / custom.projection / custom.versatility
//     - number (0-5)
//   custom.occasions
//     - list of single-line text (or comma-separated single-line text)
// gender reads shopify.target-gender instead - Shopify's own Standard
// Product Taxonomy category metafield, set via "Category metafields" on
// a product's category (not "Add definition" like the custom.* ones
// above) - a metaobject reference to one of the Male/Female/Unisex
// entries under Content > Metaobjects > Target gender, not plain text.
export const PRODUCT_METAFIELD_KEYS = {
  topNotes: 'custom.top_notes',
  heartNotes: 'custom.heart_notes',
  baseNotes: 'custom.base_notes',
  longevity: 'custom.longevity',
  projection: 'custom.projection',
  versatility: 'custom.versatility',
  occasions: 'custom.occasions',
  targetGender: 'shopify.target-gender'
};

export async function fetchProducts({ first = 24, sortKey = 'BEST_SELLING', reverse = false } = {}) {
  const data = await shopifyFetch(PRODUCTS_QUERY, { first, sortKey, reverse });
  return (data.products?.nodes || []).map(mapShopifyProduct);
}

export async function fetchProductByHandle(handle) {
  const data = await shopifyFetch(PRODUCT_BY_HANDLE_QUERY, { handle });
  return data.product ? mapShopifyProduct(data.product) : null;
}
