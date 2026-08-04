// Thin GraphQL client for the Shopify Storefront API. The Storefront API's
// public access token is designed to be shipped in client-side code (unlike
// an Admin API token), so this runs directly from the browser with no proxy.
//
// Requires two env vars, set in Vercel (Project Settings -> Environment
// Variables) and locally in .env.local (see .env.example):
//   SHOPIFY_STORE_DOMAIN            e.g. your-store.myshopify.com
//   SHOPIFY_STOREFRONT_ACCESS_TOKEN the Storefront API PUBLIC access token
//                                   (Headless channel -> Storefront API
//                                   client, or a custom app's Storefront
//                                   API token)
//
// These deliberately don't use Vite's VITE_ prefix convention, so they can't
// be read via import.meta.env directly - vite.config.js's `define` inlines
// them as the two global constants read below instead. A third var,
// SHOPIFY_STOREFRONT_PRIVATE_TOKEN, may also exist in Vercel - it is never
// read here or anywhere else in this codebase. A private Storefront token
// must never ship in client-side code; only the public one is safe for that.

const API_VERSION = '2026-07';

// `typeof` never throws on an undeclared identifier, unlike a direct
// reference - these two globals only exist once Vite's `define` (see
// vite.config.js) has replaced them at build/dev-serve time. The plain
// `node --test` runner (see /test) imports this file unbundled, where
// neither identifier is declared at all, so this must not throw there.
const DOMAIN = typeof __SHOPIFY_STORE_DOMAIN__ !== 'undefined' ? __SHOPIFY_STORE_DOMAIN__ : undefined;
const TOKEN = typeof __SHOPIFY_STOREFRONT_ACCESS_TOKEN__ !== 'undefined' ? __SHOPIFY_STOREFRONT_ACCESS_TOKEN__ : undefined;

export const isShopifyConfigured = Boolean(DOMAIN && TOKEN);

const ENDPOINT = DOMAIN ? `https://${DOMAIN}/api/${API_VERSION}/graphql.json` : null;

export class ShopifyConfigError extends Error {
  constructor() {
    super('Shopify is not configured: set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESS_TOKEN.');
    this.name = 'ShopifyConfigError';
  }
}

export async function shopifyFetch(query, variables = {}) {
  if (!isShopifyConfigured) throw new ShopifyConfigError();

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': TOKEN
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`Shopify Storefront API request failed: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((error) => error.message).join('; '));
  }
  return json.data;
}

/** Shopify GraphQL IDs are gid://shopify/Type/123 — this pulls out the trailing id. */
export function shortId(gid = '') {
  return gid.split('/').pop();
}
