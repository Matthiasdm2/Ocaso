# CATEGORY SURFACE MAP - PHASE 16 AUDIT

**Generated:** 31 December 2025  
**Purpose:** Inventaris van alle hardcoded categorieën/subcategorieën/merken

## HARDCODED CATEGORIEËN GEVONDEN

| Path                                  | Type         | Content                                                                   | Action            | Notes                                    |
| ------------------------------------- | ------------ | ------------------------------------------------------------------------- | ----------------- | ---------------------------------------- |
| `lib/categories.ts`                   | hardcoded    | Complete category/subcategory struktur (19 categories, ~80 subcategories) | **REPLACE**       | Core hardcoded data - moet naar Supabase |
| `data/vehicle/brands.car.json`        | hardcoded    | 150+ auto merken                                                          | **REPLACE**       | Move to Supabase vehicle_brands          |
| `data/vehicle/brands.motorcycle.json` | hardcoded    | Moto merken                                                               | **REPLACE**       | Move to Supabase vehicle_brands          |
| `data/vehicle/brands.commercial.json` | hardcoded    | Bedrijfsvoertuig merken                                                   | **REPLACE**       | Move to Supabase vehicle_brands          |
| `data/vehicle/brands.camper.json`     | hardcoded    | Camper merken                                                             | **REPLACE**       | Move to Supabase vehicle_brands          |
| `app/api/vehicle/brands/route.ts`     | API endpoint | Vehicle brands API                                                        | **UPDATE**        | Update to use Supabase                   |
| `lib/services/brand.service.ts`       | service      | Brand service for vehicle_brands table                                    | **KEEP + UPDATE** | Already uses Supabase but needs update   |
| `lib/services/subcategory.service.ts` | service      | Subcategory service                                                       | **KEEP + UPDATE** | Already uses Supabase                    |

## SUPABASE REFERENCES GEVONDEN

| Path                                     | Type      | Reference                            | Status           |
| ---------------------------------------- | --------- | ------------------------------------ | ---------------- |
| `src/types/supabase.ts`                  | types     | categories, subcategories table refs | ✅ Correct       |
| `components/CategorySelect.tsx`          | component | supabase.from("categories")          | ✅ Uses Supabase |
| `components/CategorySidebar.tsx`         | component | Uses category data via props         | ✅ Good pattern  |
| `components/BusinessCategorySidebar.tsx` | component | Uses category data via props         | ✅ Good pattern  |
| `app/sell/actions.ts`                    | actions   | vehicle listings                     | ✅ Uses Supabase |

## UI COMPONENTS ANALYSE

### MARKTPLAATS/EXPLORE PAGES

- **CategorySidebar.tsx**: Gebruikt categories prop - ✅ Ready voor Supabase data
- **BusinessCategorySidebar.tsx**: Gebruikt categories prop - ✅ Ready voor Supabase data

### SELL/PLAATS ZOEKERTJE

- **CategorySelect.tsx**: Direct Supabase fetch - ✅ Good
- **VehicleCategoryAndBrandSelect**: Gebruikt brand.service.ts - ⚠️ Needs update to new schema

### MARKETPLACE FILTERS

- Geen merkfilters gevonden voor voertuigen - **NEED TO ADD**

## ACTIONS REQUIRED

### 1. REPLACE HARDCODED DATA

```
lib/categories.ts → DELETE (migrate to Supabase seed)
data/vehicle/brands.*.json → DELETE (migrate to Supabase seed)
```

### 2. UPDATE SERVICES

```
lib/services/brand.service.ts → Update schema
lib/services/category.service.ts → CREATE (unified service)
```

### 3. ADD MISSING UI

```
Marketplace voertuig merkfilters → ADD
Sell page vehicle brand selector → UPDATE
```

### 4. MIGRATIONS NEEDED

```
- Clean categories/subcategories schema (UUID primary keys)
- vehicle_brands table with proper constraints
- category_vehicle_brands mapping table
- RLS policies for all tables
```

## VOERTUIG CATEGORIES MAPPING

Gebaseerd op huidige `lib/categories.ts`:

| Hardcoded Category                        | Supabase Slug        | Vehicle Type |
| ----------------------------------------- | -------------------- | ------------ |
| "Auto's"                                  | `autos`              | car          |
| "Fietsen & Brommers" → "motorfietsen" sub | `motos`              | motorcycle   |
| "Caravans, Campers & Boten"               | `campers`            | camper       |
| _Missing_                                 | `bedrijfsvoertuigen` | commercial   |

**Note**: Bedrijfsvoertuigen category mist in huidige hardcoded data!

## SCHEMA ALIGNMENT CHECK

Current migrations found:

- ✅ `20251102210000_create_categories_tables.sql` (basic structure)
- ❌ Missing: proper UUID schema
- ❌ Missing: vehicle_brands table
- ❌ Missing: category_vehicle_brands mapping

## NEXT STEPS

1. ✅ Complete this audit
2. 🔄 Supabase schema audit
3. 🔄 Create canonical migrations
4. 🔄 Implement seed scripts
5. 🔄 Update services
6. 🔄 Add missing UI components
7. 🔄 Cleanup old files
8. 🔄 Testing
