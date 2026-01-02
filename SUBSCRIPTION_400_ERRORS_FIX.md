# 400 Errors Fix - Database Column Issues

## Probleem
400 errors bij Supabase queries omdat niet-bestaande kolommen worden geselecteerd:
- `business` JSONB kolom bestaat niet in `profiles` tabel
- Queries proberen deze kolom te selecteren → 400 error

## Oplossingen Geïmplementeerd

### 1. Profielpagina Queries (`app/profile/(tabs)/business/page.tsx`)
**Voor**: Selecteerde `business` kolom die niet bestaat
**Na**: Alleen `business_plan` kolom wordt geselecteerd

```typescript
// VOOR (fout):
.select('..., business, business_plan')

// NA (correct):
.select('..., business_plan')
```

### 2. Admin Subscription Route (`app/api/admin/subscriptions/[id]/route.ts`)
**Voor**: Probeerde `business` JSONB kolom te updaten
**Na**: Update alleen `business_plan` kolom

```typescript
// VOOR (fout):
.select("business, business_plan")
.update({ business_plan, business: {...} })

// NA (correct):
.select("business_plan")
.update({ business_plan })
```

### 3. Business Upsert Route (`app/api/profile/business/upsert/route.ts`)
**Voor**: Probeerde `business` JSONB kolom te lezen
**Na**: Check alleen `business_plan` kolom

```typescript
// VOOR (fout):
.select("business, business_plan")
const subscriptionActive = business?.subscription_active || !!business_plan

// NA (correct):
.select("business_plan")
const subscriptionActive = !!(business_plan && business_plan.trim() !== '')
```

## Subscription Logic Vereenvoudigd

Alle subscription checks gebruiken nu alleen `business_plan` kolom:

```typescript
subscriptionActive: !!(r.business_plan && r.business_plan.trim() !== '')
```

## Bestanden Gewijzigd

1. ✅ `app/profile/(tabs)/business/page.tsx` - Verwijderd `business` uit select queries
2. ✅ `app/api/admin/subscriptions/[id]/route.ts` - Vereenvoudigd naar alleen `business_plan`
3. ✅ `app/api/profile/business/upsert/route.ts` - Vereenvoudigd naar alleen `business_plan`

## Test

Na deze fixes zouden de 400 errors moeten verdwijnen:
- ✅ Profiles queries werken zonder `business` kolom
- ✅ Subscription checks werken met alleen `business_plan`
- ✅ Admin updates werken correct

## Notities

- `business_id` in reviews tabel bestaat WEL (geen probleem daar)
- `first_name`, `last_name` worden gebruikt in InfoPageClient (mogelijk bestaan deze wel)
- `business` JSONB kolom bestaat NIET (verwijderd uit alle queries)

