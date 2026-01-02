# Subscription Fixes - Verwijderen en Activatie

## Problemen Opgelost

### 1. ❌ Abonnement verwijderen slaat niet op

**Probleem:**
- Wanneer een admin een abonnement probeert te verwijderen (business_plan = null), werd alleen `subscription_active: false` gezet in de business JSONB
- Andere velden (plan, billing_cycle) werden niet behouden
- Supabase JSONB updates vervangen het hele object, niet mergen

**Oplossing:**
- Admin route haalt nu eerst bestaande business JSONB op
- Merge met bestaande waarden bij verwijderen
- Behoudt historische data (plan, billing_cycle) terwijl subscription_active op false wordt gezet

**Code wijziging:**
```typescript
// Haal eerst bestaande business JSONB op
const { data: currentProfile } = await admin
    .from("profiles")
    .select("business")
    .eq("id", params.id)
    .maybeSingle();

const existingBusiness = (currentProfile?.business as Record<string, unknown>) || {};

// Bij verwijderen: merge met bestaande waarden
if (!business_plan || business_plan.trim() === '') {
    updateData.business = {
        ...existingBusiness, // Behoud bestaande velden
        subscription_active: false,
        subscription_updated_at: new Date().toISOString(),
    };
}
```

### 2. ❌ Account wordt niet geactiveerd

**Probleem:**
- Wanneer een abonnement wordt toegevoegd, werd `subscriptionActive` niet correct bepaald
- `getSubscriptionData()` checkte alleen `business.subscription_active`, maar als die niet bestaat werd het false
- Real-time subscription luisterde alleen naar `business_plan` changes, niet naar `business` JSONB changes

**Oplossing:**
- `getSubscriptionData()` beschouwt nu subscription als actief als `plan` en `billing_cycle` bestaan, zelfs als `subscription_active` niet expliciet is gezet
- Real-time subscription luistert nu naar beide kolommen (`business_plan` + `business`)
- Betere verificatie in admin route om beide kolommen te synchroniseren

**Code wijzigingen:**

1. **Helper functie (`lib/subscription-helpers.ts`):**
```typescript
// Als plan en billing_cycle bestaan maar subscription_active niet, beschouw als actief
const subscriptionActive = business.subscription_active !== undefined 
  ? !!business.subscription_active 
  : true; // Als plan en billing_cycle bestaan maar subscription_active niet, beschouw als actief
```

2. **Real-time subscription (`app/profile/(tabs)/business/page.tsx`):**
```typescript
// Check of business_plan of business JSONB is geüpdatet
const businessPlanChanged = payload.new.business_plan !== payload.old?.business_plan;
const businessChanged = JSON.stringify(payload.new.business) !== JSON.stringify(payload.old?.business);

if (businessPlanChanged || businessChanged) {
    window.location.reload();
}
```

3. **Admin route verificatie (`app/api/admin/subscriptions/[id]/route.ts`):**
```typescript
// Verifieer dat business JSONB ook correct is geüpdatet
const verifiedBusiness = verifyData.business as Record<string, unknown> | null;
const expectedActive = !!business_plan;
const actualActive = verifiedBusiness?.subscription_active;

if (typeof actualActive === 'boolean' && actualActive !== expectedActive) {
    // Fix mismatch
    const fixBusiness = {
        ...verifiedBusiness,
        subscription_active: expectedActive,
        subscription_updated_at: new Date().toISOString(),
    };
    await admin.from("profiles").update({ business: fixBusiness }).eq("id", params.id);
}
```

## Test Resultaten

✅ **TEST 1: Abonnement toevoegen**
- business_plan wordt correct gezet
- business JSONB wordt correct geüpdatet
- subscription_active = true

✅ **TEST 2: Abonnement verwijderen**
- business_plan wordt null
- business.subscription_active wordt false
- Bestaande velden worden behouden

✅ **TEST 3: Abonnement reactiveren**
- Abonnement wordt opnieuw geactiveerd
- Beide kolommen worden gesynchroniseerd

## Bestanden Gewijzigd

1. ✅ `app/api/admin/subscriptions/[id]/route.ts`
   - Merge met bestaande business JSONB bij verwijderen
   - Betere verificatie van beide kolommen

2. ✅ `lib/subscription-helpers.ts`
   - Verbeterde logica voor subscription_active bepaling
   - Beschouwt subscription als actief als plan en billing_cycle bestaan

3. ✅ `app/profile/(tabs)/business/page.tsx`
   - Real-time subscription luistert naar beide kolommen
   - Automatische refresh bij subscription changes

## Verificatie

Test script: `scripts/test-subscription-remove-activate.mjs`

```bash
node scripts/test-subscription-remove-activate.mjs
```

Alle tests slagen! ✅

