# Listing Creation Fixes - 2 Januari 2025

## Problemen Gevonden en Opgelost

### 1. ✅ `allow_offers` kolom mismatch
**Probleem:** Code gebruikte `allow_offers` (met underscore), database heeft `allowoffers` (zonder underscore)
**Oplossing:** API route aangepast om `allowoffers` te gebruiken
**Bestand:** `app/api/listings/route.ts` regel 312

### 2. ✅ `main_photo` kolom ontbreekt
**Probleem:** Kolom bestaat niet in database
**Oplossing:** Migration gemaakt: `20250102030000_add_main_photo_column.sql`
**Status:** Migration moet worden uitgevoerd

### 3. ✅ Comprehensive migration voor alle kolommen
**Probleem:** Mogelijk ontbrekende kolommen
**Oplossing:** Migration gemaakt: `20250102040000_ensure_all_listing_columns.sql`
**Kolommen die worden gecontroleerd/toegevoegd:**
- `main_photo` (text)
- `created_by` (uuid)
- `allowoffers` (boolean)
- `state` (text)
- `location` (text)
- `allow_shipping` (boolean)
- `shipping_length`, `shipping_width`, `shipping_height`, `shipping_weight` (numeric)
- `min_bid` (numeric)
- `secure_pay` (boolean)
- `promo_featured`, `promo_top` (boolean)
- `category_id`, `subcategory_id` (integer)
- `stock` (integer)

## Status Waarden

**Huidige situatie:**
- API gebruikt: `"actief"` (Nederlands)
- Sommige queries gebruiken: `"active"` (Engels)
- Dit kan inconsistenties veroorzaken

**Aanbeveling:** Standaardiseer op één waarde (bijv. `"actief"` voor Nederlandse markt)

## Vehicle Details

**Status:** ✅ Opgelost
- Filter keys worden correct getransformeerd naar database velden
- Exacte waarden worden gebruikt (geen ranges bij plaatsen)
- Range filters zijn alleen voor zoeken/filteren

## Categoriedetectie

**Status:** ✅ Verbeterd
- Contextuele hints toegevoegd
- Automatische detectie werkt voor alle categorieën
- AI fallback optioneel beschikbaar

## Acties Vereist

1. **Voer migrations uit:**
   ```bash
   # Via Supabase CLI
   supabase db push
   
   # Of via npm script
   npm run migrate:apply
   ```

2. **Test listing creation:**
   - Test met verschillende categorieën
   - Test met vehicle details
   - Test zonder vehicle details
   - Test met alle optionele velden

3. **Monitor voor errors:**
   - Check console logs voor "Could not find column" errors
   - Check database schema cache errors

## Bekende Issues

- Status waarde inconsistentie (`actief` vs `active`) - niet kritiek maar moet worden gestandaardiseerd
- Vehicle details sectie moet zichtbaar zijn voor `auto-motor` categorie (opgelost met slug fix)

