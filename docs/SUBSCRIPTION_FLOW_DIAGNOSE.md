# Subscription Flow Diagnose

## Test Resultaten

### ✅ Database Updates Werken
- Webhook simulatie: **PASSED**
- Database verificatie: **PASSED**
- Helper functions: **PASSED**
- Admin route: **PASSED**

### ❌ Client-Side Query Probleem
- Client-side query krijgt **lege data** terug
- Admin client ziet wel de data
- **Probleem: RLS (Row Level Security) blokkeert data**

## Root Cause

De RLS policy `profiles_select_all` staat alleen **authenticated users** toe om profiles te lezen:

```sql
CREATE POLICY profiles_select_all ON public.profiles 
FOR SELECT TO authenticated 
USING (true);
```

Dit betekent:
- ✅ Authenticated users kunnen hun eigen profiel lezen
- ❌ Anon users kunnen geen profielen lezen
- ✅ Service role (admin) kan alles lezen

## Mogelijke Oorzaken

1. **Gebruiker is niet ingelogd**
   - Check: Is de gebruiker ingelogd wanneer checkout wordt voltooid?
   - Check: Wordt de auth session correct behouden na checkout redirect?

2. **RLS Policy Probleem**
   - De policy staat alleen `authenticated` toe, niet `anon`
   - Dit is correct voor security, maar betekent dat gebruikers ingelogd moeten zijn

3. **Webhook Update Probleem**
   - Webhook gebruikt service role (kan alles updaten) ✅
   - Maar client-side query gebruikt anon key (moet authenticated zijn) ❌

## Oplossingen

### Oplossing 1: Verifieer Auth State
Zorg dat gebruikers ingelogd blijven na checkout redirect:

```typescript
// In checkout success handler
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  // Redirect naar login
  router.push('/login');
  return;
}
```

### Oplossing 2: Check Webhook Logs
Verifieer dat webhook daadwerkelijk wordt getriggerd:

1. Ga naar Stripe Dashboard → Webhooks
2. Check of webhook events worden ontvangen
3. Check webhook logs voor errors

### Oplossing 3: Test Met Echte Checkout
Test de volledige flow:

1. Login als gebruiker
2. Start checkout voor subscription
3. Voltooi betaling
4. Check of redirect naar `/profile/business?success=true` werkt
5. Check of profiel data wordt geladen

## Test Scripts

### Database Test
```bash
node scripts/test-subscription-flow-complete.mjs
```
**Resultaat:** ✅ Alle database tests slagen

### End-to-End Test
```bash
node scripts/test-subscription-end-to-end.mjs
```
**Resultaat:** ❌ Client-side query krijgt lege data (RLS probleem)

## Debugging Stappen

1. **Check Auth State**
   ```javascript
   const { data: { user } } = await supabase.auth.getUser();
   console.log('User:', user?.id);
   ```

2. **Check Database Direct**
   ```sql
   SELECT id, business_plan, business 
   FROM profiles 
   WHERE id = 'USER_ID';
   ```

3. **Check Webhook Logs**
   - Stripe Dashboard → Webhooks → [Your webhook] → Logs
   - Zoek naar `checkout.session.completed` of `payment_intent.succeeded`
   - Check of metadata correct is

4. **Check Server Logs**
   - Check Next.js server logs voor webhook errors
   - Check Supabase logs voor RLS errors

## Conclusie

De database en code werken correct. Het probleem ligt waarschijnlijk bij:
1. **Auth state** - Gebruiker is niet ingelogd na checkout
2. **Webhook** - Wordt niet getriggerd of faalt silently
3. **RLS** - Gebruiker heeft niet de juiste permissions

**Volgende stappen:**
1. Test met echte checkout flow (niet simulatie)
2. Check webhook logs in Stripe
3. Check auth state na checkout redirect
4. Check server logs voor errors

