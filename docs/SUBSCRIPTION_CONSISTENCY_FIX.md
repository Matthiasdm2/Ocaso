# Subscription Consistency Fix

## Overzicht

Alle code die subscriptions leest of schrijft is nu geharmoniseerd om consistent te werken met zowel de `business_plan` text kolom als de `business` JSONB kolom.

## Probleem

Er waren inconsistenties in hoe verschillende delen van de codebase subscriptions behandelden:

1. **Webhook** update beide kolommen (`business_plan` + `business` JSONB) ✅
2. **Admin subscription route** update alleen `business_plan`, niet `business` JSONB ❌
3. **Profielpagina** parseert subscription data handmatig op meerdere plaatsen ❌
4. **Business upsert** gebruikt handmatige logica voor subscription check ❌

## Oplossing

### 1. Helper Functies (`lib/subscription-helpers.ts`)

Nieuwe helper functies voor consistente subscription format conversie:

- `parseBusinessPlan(businessPlan)`: Converteer "basis_maandelijks" → { plan: "basic", billing: "monthly" }
- `formatBusinessPlan(plan, billing)`: Converteer { plan: "basic", billing: "monthly" } → "basis_maandelijks"
- `isSubscriptionActive(businessPlan)`: Check of subscription actief is
- `getSubscriptionData(business, businessPlan)`: Haal subscription data op met fallback logica

### 2. Admin Subscription Route (`app/api/admin/subscriptions/[id]/route.ts`)

**Voor:**
- Update alleen `business_plan` kolom
- Geen synchronisatie met `business` JSONB

**Na:**
- Update beide kolommen (`business_plan` + `business` JSONB)
- Gebruikt helper functies voor format conversie
- Consistent met webhook gedrag

```typescript
// Parse business_plan naar plan en billing
const parsed = parseBusinessPlan(business_plan);

if (parsed) {
  updateData.business = {
    plan: parsed.plan,
    billing_cycle: parsed.billing,
    subscription_active: true,
    subscription_updated_at: new Date().toISOString(),
  };
}
```

### 3. Webhook (`app/api/stripe/webhook/route.ts`)

**Voor:**
- Handmatige format conversie
- Code duplicatie tussen `checkout.session.completed` en `payment_intent.succeeded`

**Na:**
- Gebruikt `formatBusinessPlan()` helper functie
- Consistente code tussen beide events

```typescript
const businessPlan = formatBusinessPlan(planType, billingCycle);
```

### 4. Profielpagina (`app/profile/(tabs)/business/page.tsx`)

**Voor:**
- Handmatige parsing op meerdere plaatsen
- Inconsistente logica tussen verschillende queries
- Probeert `business.subscription_updated_at` te lezen zonder fallback

**Na:**
- Gebruikt `getSubscriptionData()` helper functie
- Consistente parsing op alle plaatsen
- Query selecteert beide kolommen (`business_plan` + `business`)
- Fallback logica ingebouwd in helper functie

```typescript
const subscriptionData = getSubscriptionData(
  r.business as Record<string, unknown> | null,
  r.business_plan
);

if (subscriptionData) {
  return {
    subscriptionActive: subscriptionData.subscriptionActive,
    plan: subscriptionData.plan,
    billingCycle: subscriptionData.billing,
    subscriptionUpdatedAt: subscriptionData.subscriptionUpdatedAt,
  };
}
```

### 5. Business Upsert Route (`app/api/profile/business/upsert/route.ts`)

**Voor:**
- Handmatige subscription check logica

**Na:**
- Gebruikt `isSubscriptionActive()` helper functie

```typescript
const subscriptionActive = isSubscriptionActive(profile.business_plan);
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Subscription Purchase (Stripe Webhook)                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │ formatBusinessPlan()           │
        │ Converteer plan + billing      │
        │ → "basis_maandelijks"          │
        └───────────────┬─────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │ Update profiles tabel:        │
        │ - business_plan: "basis_..."   │
        │ - business: {                  │
        │     plan: "basic",             │
        │     billing_cycle: "monthly",  │
        │     subscription_active: true │
        │   }                            │
        └───────────────┬─────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Admin Dashboard                                              │
│ - Leest business_plan                                       │
│ - Toont subscription status                                 │
│ - Kan updaten via admin route                               │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │ Admin Update                   │
        │ parseBusinessPlan()            │
        │ Update beide kolommen         │
        └───────────────┬─────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Profielpagina                                               │
│ - getSubscriptionData()                                      │
│ - Leest beide kolommen                                      │
│ - Fallback naar business_plan als business JSONB leeg is   │
└─────────────────────────────────────────────────────────────┘
```

## Format Mapping

| business_plan | plan | billing | business JSONB |
|---------------|------|---------|----------------|
| `basis_maandelijks` | `basic` | `monthly` | `{ plan: "basic", billing_cycle: "monthly", ... }` |
| `basis_jaarlijks` | `basic` | `yearly` | `{ plan: "basic", billing_cycle: "yearly", ... }` |
| `pro_maandelijks` | `pro` | `monthly` | `{ plan: "pro", billing_cycle: "monthly", ... }` |
| `pro_jaarlijks` | `pro` | `yearly` | `{ plan: "pro", billing_cycle: "yearly", ... }` |
| `null` of `""` | - | - | `{ subscription_active: false }` |

## Bestanden Gewijzigd

1. ✅ `lib/subscription-helpers.ts` - Nieuwe helper functies
2. ✅ `app/api/admin/subscriptions/[id]/route.ts` - Update beide kolommen
3. ✅ `app/api/stripe/webhook/route.ts` - Gebruik helper functies
4. ✅ `app/profile/(tabs)/business/page.tsx` - Gebruik helper functies, selecteer beide kolommen
5. ✅ `app/api/profile/business/upsert/route.ts` - Gebruik helper functie

## Voordelen

1. **Consistentie**: Alle code gebruikt dezelfde logica voor subscription parsing
2. **Onderhoudbaarheid**: Wijzigingen aan format conversie op één plaats
3. **Betrouwbaarheid**: Fallback logica ingebouwd in helper functies
4. **Type Safety**: Helper functies hebben duidelijke type definities
5. **Testbaarheid**: Helper functies kunnen apart getest worden

## Testen

Gebruik het smoke test script om te verifiëren dat alles werkt:

```bash
node scripts/test-subscription-flow.mjs
```

Dit test:
- Subscription purchase simulatie
- Database verificatie (beide kolommen)
- Admin API check
- Admin update functionaliteit

## Volgende Stappen

1. ✅ Alle code geharmoniseerd
2. ⏳ Test met echte Stripe checkout flow
3. ⏳ Test subscription cancellation
4. ⏳ Test edge cases (lege waarden, ongeldige formaten)

