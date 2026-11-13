# Demo deployment rule

**The Vercel deployment of this project is a demo / dev-only site, not a production service.**
Treat it exactly like local development.

## What this means

- Everything that works locally must also work on the Vercel deployment. If a feature is gated by
  `import.meta.env.DEV` (or any "dev-only" check), it must be made to run on the deployment too.
- The dev test incoming call (`src/dev/testIncomingCall.js`, flagged `isTestRequest`) is seeded for
  `astrologer-demo` on the deployment as well as locally. It is stored only in that browser's
  `localStorage` and is never synced to Redis, so it cannot duplicate across browsers.
  - Turn it off by setting `VITE_DEMO_MODE=false` at build time.
  - Remove the test records from a browser with `window.clearTestIncomingCall()`.
- Real requests (made by a user from another browser) sync through `/api/consultations`
  (Upstash Redis). A user must request `astrologer-demo` (Dr. Rani) for it to appear on that
  astrologer's dashboard.
- Demo data, test accounts, wallet balances and prices are fake. Do not put real customer data or
  real payment details in this deployment.
- "Push to the deployment" means deploying the current local working tree
  (`vercel --prod`), so the site matches local.

## Environment

- Production alias: `https://astro-textbased.vercel.app` (public).
- Per-deployment and `*-bakthi-project.vercel.app` URLs are behind Vercel Authentication and redirect
  to a Vercel login page. Use the alias above.
- Redis variables (`KV_REST_API_URL`, `KV_REST_API_TOKEN`, ...) are set for Production, Preview and
  Development in the Vercel project.
