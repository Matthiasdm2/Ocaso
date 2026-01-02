# Subscription Synchronization Fix

## Probleem
Het abonnementsbeheer in het adminpaneel had geen weerspiegeling op de abonnementen in het profiel. Wanneer een admin een abonnement toewees, werden de onderliggende velden niet zichtbaar omdat:

1. De profielpagina leest subscription data uit de `business` JSONB kolom
2. De admin route update alleen de `business_plan` text kolom
3. Er was geen synchronisatie tussen beide

## Oplossing

### 1. Admin Subscription Route (`app/api/admin/subscriptions/[id]/route.ts`)
- **Bijgewerkt** om zowel `business_plan` als `business` JSONB kolom te updaten
- Parse plan naam (bijv. "basis_maandelijks") naar plan type ("basic") en billing cycle ("monthly")
- Update `business` JSONB met:
  - `plan`: "basic" of "pro"
  - `billing_cycle`: "monthly" of "yearly"
  - `subscription_active`: true/false
  - `subscription_updated_at`: ISO timestamp
- Fallback mechanisme: als `business` JSONB kolom niet bestaat, wordt alleen `business_plan` geüpdatet

### 2. Profiel Pagina (`app/profile/(tabs)/business/page.tsx`)
- **Bijgewerkt** om `business_plan` kolom als fallback te gebruiken
- Check eerst `business` JSONB kolom voor subscription data
- Als `business` JSONB niet beschikbaar is, gebruik `business_plan` kolom:
  - Parse plan naam om plan type te bepalen (pro vs basic)
  - Parse plan naam om billing cycle te bepalen (jaarlijks vs maandelijks)
  - `subscriptionActive` = true als `business_plan` niet leeg is
- Query aangepast om `business_plan` te selecteren naast `business`

### 3. Business Upsert Route (`app/api/profile/business/upsert/route.ts`)
- **Bijgewerkt** om ook `business_plan` te controleren als fallback
- Check `business.subscription_active` eerst
- Fallback naar `business_plan` check als `business` JSONB niet beschikbaar is

### 4. Database Migratie (`supabase/migrations/20260101210000_add_business_jsonb_column.sql`)
- **Toegevoegd** migratie om `business` JSONB kolom toe te voegen als deze niet bestaat
- Default waarde: `{}` (leeg JSON object)

## Resultaat

✅ Wanneer een admin een abonnement toewijst via het adminpaneel:
- `business_plan` kolom wordt geüpdatet
- `business` JSONB kolom wordt geüpdatet (als deze bestaat)
- Profielpagina toont correct subscription status
- Alle shop velden worden zichtbaar wanneer `subscriptionActive === true`

✅ Wanneer een gebruiker een abonnement koopt via Stripe:
- Stripe webhook update `business` JSONB kolom
- Profielpagina leest correct subscription status
- Alle shop velden worden zichtbaar

✅ Backward compatibility:
- Werkt met of zonder `business` JSONB kolom
- Fallback naar `business_plan` kolom als `business` niet beschikbaar is

## Testen

1. **Admin toewijzing:**
   ```bash
   curl -X PUT 'http://localhost:3000/api/admin/subscriptions/{user_id}' \
     -H 'Content-Type: application/json' \
     -d '{"business_plan":"basis_maandelijks"}'
   ```

2. **Profielpagina controleren:**
   - Ga naar `/profile/business`
   - Controleer dat shop velden zichtbaar zijn wanneer abonnement actief is
   - Controleer dat subscription status correct wordt getoond

3. **Velden zichtbaarheid:**
   - Zonder abonnement: alleen subscription sectie zichtbaar
   - Met abonnement: alle shop velden zichtbaar (branding, categories, winkelgegevens, etc.)

## Bestanden Gewijzigd

1. `app/api/admin/subscriptions/[id]/route.ts` - Admin subscription update route
2. `app/profile/(tabs)/business/page.tsx` - Profielpagina met fallback logica
3. `app/api/profile/business/upsert/route.ts` - Business upsert route met fallback
4. `supabase/migrations/20260101210000_add_business_jsonb_column.sql` - Database migratie (nieuw)

