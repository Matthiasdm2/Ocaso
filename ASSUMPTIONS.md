# ASSUMPTIONS.md

## Assumptions About OCASO Codebase

### Technical Stack Assumptions
- **Framework**: Next.js 14 met App Router en Server Components.
- **Database**: Supabase (PostgreSQL) met Row Level Security (RLS) policies.
- **Authentication**: Supabase Auth met JWT tokens.
- **Payments**: Stripe voor alle betalingen, inclusief escrow.
- **Hosting**: Vercel (gebaseerd op vercel.json en deployment setup).
- **Styling**: Tailwind CSS met PostCSS, geen CSS modules.
- **State Management**: React hooks en local state, geen globale state libraries zoals Redux/Zustand.
- **API**: RESTful API in Next.js API routes (/api/*), geen GraphQL of tRPC.
- **Image Handling**: Sharp voor processing, Supabase Storage voor opslag, Next.js Image component voor optimalisatie.
- **Real-time**: Supabase Real-time subscriptions voor chats en notificaties.
- **Forms**: Native HTML forms met React state, geen form libraries zoals React Hook Form.
- **Icons**: Lucide React voor alle icons.
- **Animations**: Framer Motion voor motion effects.

### Business Logic Assumptions
- **Marketplace Model**: C2C tweedehands marktplaats met B2C bedrijfselementen.
- **Currency**: Euro (EUR), gebaseerd op Stripe config en prijzen.
- **Language**: Nederlands als primaire taal, met vertaling support voor meerdere talen.
- **Location**: België/Flanders gefocust, met geo-search binnen radius.
- **User Roles**: Regular users, sellers, businesses, admins (verschillende profiel types).
- **Credits**: Virtuele valuta voor transacties, gekoppeld aan Stripe payments.
- **Shipping**: Via Ocaso (Sendcloud), met tracking en verzekering.
- **Safety**: Escrow betalingen, verificatie badges, reviews voor vertrouwen.

### Development Assumptions
- **Version Control**: Git met main branch, geen trunk-based development.
- **CI/CD**: Vercel deployments, scripts voor linting (npm run lint), typechecking (npm run typecheck), maar geen geautomatiseerde tests.
- **Testing**: Beperkt, mogelijk Vitest voor unit tests, maar niet prominent.
- **Code Quality**: ESLint, Prettier, TypeScript strict mode.
- **Environment**: .env.local voor lokale dev, Supabase CLI voor database management.
- **Build Process**: Next.js build, geen custom webpack config zichtbaar.

### Security Assumptions
- **RLS**: Database security via Supabase RLS policies, met meerdere fix files duidend op iteratieve verbetering.
- **Auth**: JWT via Supabase, met session management.
- **API Security**: Basic auth checks in API routes, geen advanced rate limiting of API keys.
- **Data Privacy**: GDPR compliant met consent modals en privacy beleid.
- **Input Validation**: Basis validatie in forms, geen uitgebreide sanitization zichtbaar.
- **HTTPS**: Aangenomen via Vercel hosting.

### Performance Assumptions
- **SSR/SSG**: Next.js voor SEO en performance, met cache headers.
- **Caching**: Next.js caching, Supabase caching, geen Redis of CDN config.
- **Image Optimization**: Next.js Image component, Sharp processing.
- **Bundle Size**: Groot vanwege vele dependencies (Supabase, Stripe, Framer Motion, etc.).
- **Database Queries**: Directe Supabase client calls, geen ORM zoals Prisma.

### Scalability Assumptions
- **Database**: Supabase scales automatisch, met RLS voor multi-tenancy.
- **Storage**: Supabase Storage voor images, scales automatisch.
- **Traffic**: Ontworpen voor moderate traffic, geen extreme scaling measures (load balancers, etc.).
- **Real-time**: Supabase real-time voor beperkt aantal concurrent users.

### Database Schema Assumptions
- **User Management**: Supabase auth.users as primary user table, profiles table for extended data including roles.
- **Roles**: User roles stored in profiles.role, with organization-specific roles in organization_members.
- **Organizations**: B2C shops managed via organizations table, with members having roles.
- **Listings**: Support both C2C (organization_id NULL) and B2C (organization_id set).
- **Chats**: One chat per listing-buyer-seller combination.
- **Subscriptions**: Feature-based entitlements via subscription_plans and features JSONB.
- **QR Credits**: Append-only ledger for auditability, balance calculated via view, no negative balances enforced at DB level (handled in app).
- **Payments**: Provider-agnostic design, with external_id for Stripe payment intents.
- **Boosts**: Meta campaign integration assumed, status-driven lifecycle.
- **Audit**: Admin actions logged in admin_audit_logs for compliance.
- **RLS**: Default deny with explicit policies, no public access to any table.
- **Indexes**: Added for common query patterns (user_id, listing_id, etc.).
- **Views**: qr_balance as derived view from ledger for performance.
- **No Triggers**: Business logic handled in application layer, no DB triggers.
- **UUIDs**: All primary keys use UUID for scalability.
- **Timestamps**: All tables have created_at/updated_at for auditing.
- **Constraints**: Check constraints for enums, foreign keys for referential integrity.</content>
<parameter name="filePath">/Users/matthiasdemey/Desktop/Ocasso /Ocasso  back up/Ocaso Rewrite/ASSUMPTIONS.md
