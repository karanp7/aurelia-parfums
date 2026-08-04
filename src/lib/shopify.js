// Thin GraphQL client for the Shopify Storefront API. The Storefront API's
// public access token is designed to be shipped in client-side code (unlike
// an Admin API token), so this runs directly from the browser with no proxy.
//
// Requires two Vite env vars, set in Vercel (Project Settings -> Environment
// Variables) and locally in .env.local (see .env.example):
//   VITE_SHOPIFY_STORE_DOMAIN     e.g. your-store.myshopify.com
//   VITE_SHOPIFY_STOREFRONT_TOKEN the Storefront API public access token
//                                 (Headless channel -> Storefront API client,
//                                 or a custom app's Storefront API token)

const API_VERSION = '2026-07';

// Optional chaining: import.meta.env only exists once Vite transforms this
// file. The plain `node --test` runner (see /test) imports it unbundled, so
// this must not throw when import.meta.env is undefined there.
const DOMAIN = import.meta.env?.VITE_SHOPIFY_STORE_DOMAIN;
const TOKEN = import.meta.env?.VITE_SHOPIFY_STOREFRONT_TOKEN;

export const isShopifyConfigured = Boolean(DOMAIN && TOKEN);

const ENDPOINT = DOMAIN ? `https://${DOMAIN}/api/${API_VERSION}/graphql.json` : null;

export class ShopifyConfigError extends Error {
  constructor() {
    super('Shopify is not configured: set VITE_SHOPIFY_STORE_DOMAIN and VITE_SHOPIFY_STOREFRONT_TOKEN.');
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
