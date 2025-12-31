# ENV VERCEL MASTERPLAN

This document inventories all environment variables required for OCASO, their scope, usage, and example placeholders. Do NOT commit real secrets.

| Name                           | Required | Scope      | Used in file(s) / scripts                | Example Value / Notes                  |
|--------------------------------|----------|------------|------------------------------------------|----------------------------------------|
| NEXT_PUBLIC_SUPABASE_URL       | Y        | client     | .env*, src/lib/supabase.ts, scripts/*    | https://dmnowaqinfkhovhyztan.supabase.co |
| NEXT_PUBLIC_SUPABASE_ANON_KEY  | Y        | client     | .env*, src/lib/supabase.ts, scripts/*    | sb_publishable_xxx                     |
| SUPABASE_SERVICE_ROLE_KEY      | Y        | server     | .env*, src/lib/supabase.ts, scripts/*    | sb_secret_xxx                          |
| SUPABASE_URL                   | Y        | server     | scripts/seed-*.ts, analyze-schema.ts     | https://dmnowaqinfkhovhyztan.supabase.co |
| SUPABASE_ANON_KEY              | N        | server     | .env.production, .env.vercel.prod        | sb_publishable_xxx                     |
| SUPABASE_JWT_SECRET            | N        | server     | .env.production, .env.vercel.prod        |                                        |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | N     | client     | .env*, Stripe integration                | pk_test_xxx                            |
| STRIPE_SECRET_KEY              | N        | server     | .env*, Stripe integration                | sk_test_xxx                            |
| STRIPE_WEBHOOK_SECRET          | N        | server     | .env*, Stripe integration                | whsec_xxx                              |
| SENDCLOUD_API_KEY              | N        | server     | .env.local.example, src/types/supabase.ts| your_sendcloud_api_key                 |
| SENDCLOUD_SECRET               | N        | server     | .env.local.example, src/types/supabase.ts| your_sendcloud_secret                  |
| SENTRY_DSN                     | N        | server     | .env*, Sentry integration                | https://xxx.ingest.sentry.io/xxx        |
| SENTRY_ENV                     | N        | both       | .env*, Sentry integration                | production / staging                   |
| ADMIN_TOKEN                    | N        | server     | .env.staging, .env*, admin logic         | admin-token-xxx                        |
| ALLOWED_ORIGINS                | N        | server     | .env*, CORS config                       | https://www.ocaso.be,https://ocaso.be   |
| ENABLE_RATE_LIMITING           | N        | server     | .env*, rate limiting logic               | true                                   |
| NODE_ENV                       | Y        | both       | .env*, src/lib/logger.ts                 | production / development               |
| IMAGE_SEARCH_OCR_ENABLED       | N        | server     | .env.e2e, .env.staging                   | 0 / 1                                  |
| IMAGE_SEARCH_OCR_TIMEOUT_MS    | N        | server     | .env.e2e                                 | 5000                                   |
| IMAGE_SEARCH_EMBEDDINGS_ENABLED| N        | server     | .env.e2e, .env.staging                   | 0 / 1                                  |
| IMAGE_SEARCH_URL               | N        | server     | .env.e2e                                 | http://localhost:9000/search           |
| IMAGE_SEARCH_TEXT_URL          | N        | server     | .env.e2e                                 | http://localhost:9000/search-text      |
| IMAGE_SEARCH_EMBEDDING_MAX_DIST| N        | server     | .env.e2e                                 | 0.30                                   |
| NEXT_PUBLIC_ENABLE_OAUTH       | N        | client     | .env.e2e, .env.staging                   | true / false                           |
| NEXT_PUBLIC_AFFILIATE_ENABLED  | N        | client     | .env.e2e                                 | true                                   |
| TURBO_CACHE                    | N        | server     | .env.production, .env.vercel.prod        | remote:rw                              |
| TURBO_DOWNLOAD_LOCAL_ENABLED   | N        | server     | .env.production, .env.vercel.prod        | true                                   |
| TURBO_REMOTE_ONLY              | N        | server     | .env.production, .env.vercel.prod        | true                                   |
| TURBO_RUN_SUMMARY              | N        | server     | .env.production, .env.vercel.prod        | true                                   |
| VERCEL_OIDC_TOKEN              | N        | server     | .env.vercel, .env.production             | (auto-managed by Vercel)               |
| VERCEL_*                       | N        | server     | .env.vercel, .env.production             | (auto-managed by Vercel)               |
| POSTGRES_*                     | N        | server     | .env.production, .env.vercel.prod        | (auto-managed by Supabase/Vercel)      |

## How to set via Vercel CLI
- Add: `vercel env add <VAR_NAME> <environment>`
- Pull: `vercel env pull .env.local`
- List: `vercel env ls`

## Notes
- Never commit real secrets.
- All Supabase keys must be set per environment.
- Service role key is server-only, never exposed to client.
- Stripe/Sendcloud keys are server-only.
- For E2E, use .env.e2e and .env.local.example as templates.
