# Vercel Deploy Fail Root Cause

## Datum
31 december 2025

## Context
Branch: qa/e2e-full-portal-stabilization-20251231
Map: /Users/matthiasdemey/Desktop/Ocasso /Ocasso  back up/Ocaso Rewrite

## Vercel Build Error(s)

```
Error: Command "npm run build" exited with 1

Relevant build output:

▲ Next.js 14.2.32
Creating an optimized production build ...
⚠ Compiled with warnings

./node_modules/@supabase/realtime-js/dist/module/lib/websocket-factory.js
A Node.js API is used (process.versions at line: 34) which is not supported in the Edge Runtime.
Import trace for requested module:
./node_modules/@supabase/realtime-js/dist/module/lib/websocket-factory.js
./node_modules/@supabase/realtime-js/dist/module/index.js
./node_modules/@supabase/supabase-js/dist/module/index.js
./node_modules/@supabase/ssr/dist/module/createBrowserClient.js
./node_modules/@supabase/ssr/dist/module/index.js

./node_modules/@supabase/supabase-js/dist/module/index.js
A Node.js API is used (process.version at line: 24) which is not supported in the Edge Runtime.
Import trace for requested module:
./node_modules/@supabase/supabase-js/dist/module/index.js
./node_modules/@supabase/ssr/dist/module/createBrowserClient.js
./node_modules/@supabase/ssr/dist/module/index.js

TypeScript error:
./analyze-schema.ts:53:22
Type error: Parameter 'col' implicitly has an 'any' type.

Next.js build worker exited with code: 1 and signal: null
```

## Root cause(s)
1. TypeScript build error: `analyze-schema.ts` bevat een parameter zonder expliciet type (`col` heeft 'any' type). Dit blokkeert de build.
2. Supabase client gebruikt Node.js API's in Edge Runtime context (waarschuwing, niet direct build-blocking, maar vereist aandacht voor Edge/server splitsing).

## Single Source of Truth (stap A3)

### Build Environment
- **Node version expected**: 20 (gepind in .nvmrc)
- **Package manager**: npm (package-lock.json aanwezig)
- **Next.js version**: ^14.2.32
- **TypeScript version**: ^5.4.5

### Build Commands
- **Install command**: `npm install` (default)
- **Build command**: `next build`
- **Output directory**: Next.js default (.next)

### Required Environment Variables (names only)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_AFFILIATE_ENABLED
- SUPABASE_SERVICE_ROLE_KEY (server-side only)
- STRIPE_PUBLIC_KEY
- STRIPE_SECRET_KEY
- DATABASE_URL (mogelijk voor migrations)

### Lockfile Status
- package-lock.json: aanwezig (425KB, recent bijgewerkt)
- yarn.lock: niet aanwezig
- pnpm-lock.yaml: niet aanwezig

## Volgende stap
- Ga naar stap B4: lokale build reproduceren (al gedaan, faalt met dezelfde error).
- Stap C6: fix het TypeScript build error in analyze-schema.ts.
