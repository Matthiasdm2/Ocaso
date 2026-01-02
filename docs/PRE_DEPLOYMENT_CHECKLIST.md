# Pre-Deployment Checklist - Subscription Consistency Fix

## ✅ Code Changes

- [x] Helper functies gemaakt (`lib/subscription-helpers.ts`)
- [x] Admin subscription route geüpdatet (`app/api/admin/subscriptions/[id]/route.ts`)
- [x] Webhook geüpdatet (`app/api/stripe/webhook/route.ts`)
- [x] Profielpagina geüpdatet (`app/profile/(tabs)/business/page.tsx`)
- [x] Business upsert route geüpdatet (`app/api/profile/business/upsert/route.ts`)
- [x] Geen linter errors
- [x] Geen TODO/FIXME comments in nieuwe code

## ✅ Database

- [x] Migratie bestaat: `supabase/migrations/20260101210000_add_business_jsonb_column.sql`
- [ ] **ACHTING**: Migratie moet worden uitgevoerd op productie database
- [ ] Verifieer dat `business` JSONB kolom bestaat in productie

### Database Migratie Uitvoeren

```sql
-- Deze migratie voegt de business JSONB kolom toe als deze nog niet bestaat
-- Veilig om meerdere keren uit te voeren (idempotent)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'business'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN business JSONB DEFAULT '{}'::jsonb;
    COMMENT ON COLUMN public.profiles.business IS 'Business subscription data: plan, billing_cycle, subscription_active, subscription_updated_at';
  END IF;
END $$;
```

## ✅ Testing

- [x] Smoke test script gemaakt (`scripts/test-subscription-flow.mjs`)
- [ ] **Test in staging environment**:
  - [ ] Subscription purchase flow
  - [ ] Admin subscription update
  - [ ] Profielpagina toont subscription correct
  - [ ] Webhook verwerkt events correct

### Test Scenarios

1. **Subscription Purchase**
   - Gebruiker koopt abonnement via checkout
   - Webhook ontvangt event
   - Beide kolommen (`business_plan` + `business`) worden geüpdatet
   - Profielpagina toont subscription als actief

2. **Admin Update**
   - Admin wijst abonnement toe via dashboard
   - Beide kolommen worden geüpdatet
   - Profielpagina reflecteert update correct

3. **Edge Cases**
   - Lege/null business_plan → subscription niet actief
   - Ongeldig business_plan format → fallback naar default
   - Business JSONB kolom ontbreekt → fallback naar business_plan

## ✅ Error Handling

- [x] Webhook heeft error handling voor database updates
- [x] Admin route heeft error handling en verificatie
- [x] Helper functies hebben null checks
- [x] Profielpagina heeft fallback logica

## ✅ Backward Compatibility

- [x] Code werkt ook als `business` JSONB kolom niet bestaat (fallback naar `business_plan`)
- [x] Bestaande subscriptions blijven werken (worden gelezen via `business_plan`)
- [x] Geen breaking changes voor bestaande functionaliteit

## ⚠️ Pre-Deployment Actions

### 1. Database Migratie

```bash
# Via Supabase CLI
supabase db push

# Of handmatig via Supabase Dashboard SQL Editor
# Voer migratie uit: supabase/migrations/20260101210000_add_business_jsonb_column.sql
```

### 2. Environment Variables

Verifieer dat deze environment variables zijn ingesteld:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (voor webhook)
- `STRIPE_SECRET_KEY` (voor webhook)
- `STRIPE_WEBHOOK_SECRET` (voor webhook)

### 3. Stripe Webhook Configuration

- [ ] Verifieer dat Stripe webhook endpoint correct is geconfigureerd
- [ ] Test webhook events in Stripe dashboard
- [ ] Verifieer dat `checkout.session.completed` en `payment_intent.succeeded` events worden ontvangen

### 4. Monitoring

Na deployment, monitor:
- [ ] Webhook logs voor errors
- [ ] Admin subscription updates
- [ ] Profielpagina laadt zonder errors
- [ ] Database queries werken correct

## 📋 Deployment Steps

1. **Database Migratie**
   ```bash
   # Voer migratie uit op productie database
   supabase db push --db-url $PRODUCTION_DB_URL
   ```

2. **Code Deployment**
   ```bash
   # Deploy naar Vercel/andere hosting
   git push origin main
   # Of via CI/CD pipeline
   ```

3. **Verificatie**
   - Test subscription purchase flow
   - Test admin subscription update
   - Check logs voor errors

4. **Rollback Plan** (indien nodig)
   - Code rollback: git revert
   - Database rollback: migratie is idempotent, geen rollback nodig
   - Webhook blijft werken met oude code (alleen business_plan wordt geüpdatet)

## ✅ Post-Deployment Verification

- [ ] Test subscription purchase end-to-end
- [ ] Test admin subscription management
- [ ] Verifieer dat beide kolommen worden geüpdatet
- [ ] Check error logs
- [ ] Monitor performance

## 🎯 Success Criteria

- ✅ Subscription purchases werken correct
- ✅ Admin kan subscriptions beheren
- ✅ Profielpagina toont subscription status correct
- ✅ Geen errors in logs
- ✅ Beide kolommen blijven gesynchroniseerd

## 📝 Notes

- De migratie is **idempotent** - veilig om meerdere keren uit te voeren
- Code heeft **fallback logica** - werkt ook zonder `business` JSONB kolom
- **Geen breaking changes** - bestaande functionaliteit blijft werken
- Helper functies zorgen voor **consistente data** tussen beide kolommen

