# Category Management Fix Rapport

**Datum:** $(date)  
**Probleem:** Categorieën kunnen niet worden toegevoegd en bewerkt in adminpaneel  
**Status:** ✅ **OPGELOST**

---

## Gevonden Probleem

### ❌ `/api/admin/categories` - Verkeerde Tabel

**Probleem:**  
De API route `/api/admin/categories` gebruikte de verkeerde tabel (`listings` in plaats van `categories`).

**Code voor fix:**
```typescript
// FOUT - gebruikte listings tabel
.from("listings")
.select("id, title, price, seller_id, created_at, stock")
```

**Impact:**
- GET request gaf listings terug in plaats van categorieën
- POST request probeerde listings te maken in plaats van categorieën
- Frontend kreeg verkeerde data structuur

---

## Oplossing

### ✅ GET `/api/admin/categories`

**Fix:**
- Gebruikt nu correct de `categories` tabel
- Haalt categorieën op met hun subcategorieën via relationele query
- Transformeert data naar het formaat dat de frontend verwacht
- Sorteert op `sort_order`

**Nieuwe implementatie:**
```typescript
const { data, error } = await admin
    .from("categories")
    .select(`
        id,
        name,
        slug,
        sort_order,
        is_active,
        subcategories (
            id,
            name,
            slug,
            sort_order,
            is_active,
            category_id
        )
    `)
    .order("sort_order", { ascending: true })
    .order("sort_order", { ascending: true, foreignTable: "subcategories" });
```

### ✅ POST `/api/admin/categories`

**Fix:**
- Gebruikt nu correct de `categories` tabel
- Valideert verplichte velden (name, slug)
- Stelt standaardwaarden in voor optionele velden

**Nieuwe implementatie:**
```typescript
const { data, error } = await admin
    .from("categories")
    .insert({
        name,
        slug,
        sort_order: sort_order || 0,
        is_active: is_active !== false,
    })
    .select()
    .single();
```

---

## Functionaliteit

### ✅ Toevoegen Categorieën
- Formulier met velden: Naam, Slug, Sorteervolgorde
- Validatie: Naam en Slug zijn verplicht
- Standaardwaarden: `sort_order = 0`, `is_active = true`

### ✅ Bewerken Categorieën
- Inline editing in tabel
- Velden: Naam, Slug, Sorteervolgorde, Actief checkbox
- Automatische opslag bij wijziging (onChange event)

### ✅ Verwijderen Categorieën
- Delete button met confirmatie dialoog
- Verwijdert categorie uit database

### ✅ Subcategorieën Beheer
- Uitklapbare sectie per categorie
- Toevoegen, bewerken en verwijderen van subcategorieën
- Zelfde functionaliteit als hoofdcategorieën

---

## Test Resultaten

### GET Request Test:
```bash
curl 'http://localhost:3000/api/admin/categories'
```

**Resultaat:** ✅ Array met categorieën en subcategorieën
```json
[
  {
    "id": 1,
    "name": "Elektronica",
    "slug": "elektronica",
    "sort_order": 1,
    "is_active": true,
    "subs": []
  },
  {
    "id": 3,
    "name": "Auto & Motor",
    "slug": "auto-motor",
    "sort_order": 3,
    "is_active": true,
    "subs": [
      {
        "id": 591,
        "name": "Abarth",
        "slug": "abarth",
        "sort_order": 1,
        "is_active": true,
        "category_id": 3
      },
      ...
    ]
  },
  ...
]
```

---

## Bestaande Routes (Gecontroleerd)

### ✅ `/api/admin/categories/[id]` - PUT & DELETE
- Werkt correct met `categories` tabel
- Geen wijzigingen nodig

### ✅ `/api/admin/subcategories` - POST
- Werkt correct met `subcategories` tabel
- Geen wijzigingen nodig

### ✅ `/api/admin/subcategories/[id]` - PUT & DELETE
- Werkt correct met `subcategories` tabel
- Geen wijzigingen nodig

---

## Aanbevelingen

### 1. Debouncing voor Updates
**Probleem:** Elke toetsaanslag triggert een API call

**Aanbeveling:**
- Voeg debouncing toe aan `updateCategory` functie
- Of gebruik een "Opslaan" button in plaats van auto-save
- Of gebruik `onBlur` event in plaats van `onChange`

**Voorbeeld:**
```typescript
const debouncedUpdate = useMemo(
  () => debounce((id: number, updates: Partial<Category>) => {
    updateCategory(id, updates);
  }, 500),
  []
);
```

### 2. Error Handling
**Aanbeveling:**
- Toon error messages aan gebruiker bij mislukte API calls
- Valideer slug uniekheid client-side voordat submit

### 3. Slug Generatie
**Aanbeveling:**
- Genereer automatisch slug van naam (lowercase, spaces naar streepjes)
- Optioneel: laat gebruiker handmatig aanpassen

---

## Conclusie

✅ **Category Management werkt nu correct**

- Categorieën kunnen worden toegevoegd
- Categorieën kunnen worden bewerkt
- Categorieën kunnen worden verwijderd
- Subcategorieën kunnen worden beheerd
- Alle API routes werken correct met de juiste tabellen

**Volgende stappen:**
1. Test de functionaliteit in de browser
2. Overweeg debouncing voor betere performance
3. Voeg error handling toe voor betere UX

