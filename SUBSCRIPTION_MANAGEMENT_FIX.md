# Subscription Management Fix Rapport

**Datum:** $(date)  
**Probleem:** Abonnementen kunnen niet worden beheerd in adminpaneel  
**Status:** ✅ **OPGELOST**

---

## Gevonden Problemen

### ❌ `/api/admin/users?subscriptions=true` - Ontbrekende Kolom

**Probleem:**  
De API route probeerde `subscription_active` kolom te selecteren die niet bestaat in de database.

**Foutmelding:**
```
{"error":"column profiles.subscription_active does not exist"}
```

**Oorzaak:**  
De database heeft alleen `business_plan` kolom, maar geen `subscription_active` kolom.

---

### ❌ `/api/admin/subscriptions/[id]` - Ontbrekende Kolom

**Probleem:**  
De PUT route probeerde `subscription_active` kolom te updaten die niet bestaat.

**Foutmelding:**
```
{"error":"Could not find the 'subscription_active' column of 'profiles' in the schema cache"}
```

---

## Oplossingen

### ✅ GET `/api/admin/users?subscriptions=true`

**Fix:**
- Verwijderd `subscription_active` uit select statement
- `subscription_active` wordt nu afgeleid van `business_plan` (actief als `business_plan` niet null/empty is)
- Data wordt verrijkt voordat het wordt teruggestuurd

**Nieuwe implementatie:**
```typescript
const selectFields = subscriptions
    ? "id, full_name, email, business_plan"
    : "id, full_name, display_name, email, account_type, is_admin, is_business, avatar_url, created_at, updated_at";

// Na query:
if (subscriptions && data) {
    const enrichedData = data.map((user: any) => ({
        ...user,
        subscription_active: !!user.business_plan, // Actief als business_plan niet null/empty is
    }));
    return NextResponse.json(enrichedData);
}
```

### ✅ PUT `/api/admin/subscriptions/[id]`

**Fix:**
- Probeert eerst beide kolommen te updaten (`business_plan` en `subscription_active`)
- Als `subscription_active` kolom niet bestaat, valt terug op alleen `business_plan` updaten
- Betere error handling toegevoegd

**Nieuwe implementatie:**
```typescript
const updateData: Record<string, unknown> = {};

if (business_plan !== undefined) {
    updateData.business_plan = business_plan || null;
}

if (subscription_active !== undefined) {
    updateData.subscription_active = subscription_active;
} else if (business_plan !== undefined) {
    // Als alleen business_plan wordt gezet, probeer subscription_active af te leiden
    updateData.subscription_active = !!business_plan;
}

// Probeer update met beide kolommen
const { error } = await admin.from("profiles").update(updateData).eq("id", params.id);

// Als subscription_active kolom niet bestaat, val terug op alleen business_plan
if (error?.message?.includes("subscription_active")) {
    const { error: retryError } = await admin
        .from("profiles")
        .update({ business_plan: business_plan || null })
        .eq("id", params.id);
    // ...
}
```

### ✅ Frontend Verbeteringen

**Fix:**
- Betere error handling toegevoegd
- Data wordt automatisch gerefresht na succesvolle update
- Duidelijke foutmeldingen voor gebruikers
- Validatie toegevoegd voor formulier inputs

**Verbeteringen:**
- `assignSubscription` refresht nu data na update
- `fetchUsers` heeft betere error handling
- `handleAssign` heeft validatie en betere foutmeldingen

---

## Functionaliteit

### ✅ Abonnementen Toewijzen
- Zoek gebruiker op naam of email
- Selecteer abonnement plan:
  - Basis Maandelijks
  - Basis Jaarlijks
  - Pro Maandelijks
  - Pro Jaarlijks
- Toewijzen via "Toewijzen" knop

### ✅ Abonnementen Bewerken
- Dropdown per gebruiker in tabel
- Direct wijzigen van abonnement plan
- Automatische refresh na update

### ✅ Abonnementen Status
- Toont huidige plan per gebruiker
- Toont of abonnement actief is (afgeleid van `business_plan`)

---

## Test Resultaten

### GET Request Test:
```bash
curl 'http://localhost:3000/api/admin/users?subscriptions=true'
```

**Resultaat:** ✅ Array met gebruikers en subscription data
```json
[
  {
    "id": "ceff7855-beed-4d1e-9b93-83cfca0ad3e0",
    "full_name": "Matthias De Mey",
    "email": "matthias.dm2@gmail.com",
    "business_plan": null,
    "subscription_active": false
  },
  ...
]
```

### PUT Request Test:
```bash
curl -X PUT 'http://localhost:3000/api/admin/subscriptions/{user-id}' \
  -H 'Content-Type: application/json' \
  -d '{"business_plan":"basis_maandelijks"}'
```

**Resultaat:** ✅ `{"success":true}`

---

## Database Schema

**Huidige situatie:**
- ✅ `business_plan` kolom bestaat
- ❌ `subscription_active` kolom bestaat niet (in productie database)

**Oplossing:**
- `subscription_active` wordt afgeleid van `business_plan`
- Als `business_plan` niet null/empty is → `subscription_active = true`
- Als `business_plan` null/empty is → `subscription_active = false`

**Optionele Migratie (voor toekomst):**
Als je `subscription_active` kolom wilt toevoegen:
```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_active boolean DEFAULT false;

-- Update bestaande records
UPDATE profiles 
SET subscription_active = (business_plan IS NOT NULL AND business_plan != '');
```

---

## Aanbevelingen

### 1. Database Migratie
**Aanbeveling:**
- Overweeg `subscription_active` kolom toe te voegen voor expliciete controle
- Of houd het zoals het is (afgeleid van `business_plan`)

### 2. Abonnement Annuleren
**Aanbeveling:**
- Voeg "Annuleren" functionaliteit toe
- Zet `business_plan` naar `null` om abonnement te annuleren

### 3. Abonnement Geschiedenis
**Aanbeveling:**
- Overweeg een `subscription_history` tabel voor audit trail
- Log wanneer abonnementen worden toegewezen/gewijzigd/geannuleerd

### 4. Validatie
**Aanbeveling:**
- Valideer dat gebruiker bestaat voordat abonnement wordt toegewezen
- Valideer dat plan waarde geldig is

---

## Conclusie

✅ **Subscription Management werkt nu correct**

- Abonnementen kunnen worden toegewezen aan gebruikers
- Abonnementen kunnen worden bewerkt
- Abonnement status wordt correct getoond
- Werkt zonder `subscription_active` kolom (afgeleid van `business_plan`)

**Volgende stappen:**
1. Test de functionaliteit in de browser
2. Overweeg database migratie voor `subscription_active` kolom
3. Voeg abonnement annuleren functionaliteit toe

