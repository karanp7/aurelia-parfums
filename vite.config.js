import { defineConfig, loadEnv } from 'vite';

// The Shopify env vars in Vercel are named without a VITE_ prefix
// (SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_ACCESS_TOKEN), so Vite's default
// "only expose VITE_-prefixed vars to client code" rule would hide them from
// the browser entirely. `loadEnv(mode, cwd, '')` reads every env var
// (regardless of prefix) into this Node-only config scope, and `define`
// below explicitly inlines just the two safe ones into the client bundle at
// build time as global constants (see src/lib/shopify.js).
//
// SHOPIFY_STOREFRONT_PRIVATE_TOKEN is deliberately never referenced here or
// anywhere in this codebase — a private Storefront API token must never ship
// in client-side code, unlike the public access token, which is designed for
// exactly that.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    define: {
      __SHOPIFY_STORE_DOMAIN__: JSON.stringify(env.SHOPIFY_STORE_DOMAIN || ''),
      __SHOPIFY_STOREFRONT_ACCESS_TOKEN__: JSON.stringify(env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || '')
    }
  };
});
