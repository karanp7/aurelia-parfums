import { shopifyFetch, shortId } from './shopify.js';

// Kept intentionally small — Storefront API fields that exist on every
// Shopify product with zero setup, no metafields required.
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
  return null;
}

function truncate(text, max = 130) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, '')}…`;
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
    tone: deriveTone(node.id),
    price: sizes[0]?.price ?? Number(node.priceRange?.minVariantPrice?.amount ?? 0),
    compareAtPrice: sizes[0]?.compareAtPrice ?? null,
    sizes,
    availableForSale: Boolean(node.availableForSale) && sizes.some((size) => size.availableForSale),
    summary: truncate(node.description),
    description: (node.description || '').trim(),
    image: images[0]?.url || '',
    imageAlt: images[0]?.altText || node.title,
    images
  };
}

export async function fetchProducts({ first = 24, sortKey = 'BEST_SELLING', reverse = false } = {}) {
  const data = await shopifyFetch(PRODUCTS_QUERY, { first, sortKey, reverse });
  return (data.products?.nodes || []).map(mapShopifyProduct);
}

export async function fetchProductByHandle(handle) {
  const data = await shopifyFetch(PRODUCT_BY_HANDLE_QUERY, { handle });
  return data.product ? mapShopifyProduct(data.product) : null;
}
