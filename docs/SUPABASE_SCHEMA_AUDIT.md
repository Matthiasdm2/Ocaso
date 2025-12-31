# SUPABASE SCHEMA AUDIT - PHASE 16

**Generated:** 31 December 2025  
**Purpose:** Schema analyse voor Phase 16 categorisering + voertuigmerken

## HUIDIGE SCHEMA STATUS

### TABELLEN GEVONDEN

| Tabel                     | Status     | Primary Key | Unique Constraints         | Actie              |
| ------------------------- | ---------- | ----------- | -------------------------- | ------------------ |
| `categories`              | ✅ EXISTS  | id serial   | unique(name), unique(slug) | **KEEP + MIGRATE** |
| `subcategories`           | ✅ EXISTS  | id serial   | unique(category_id, slug)  | **KEEP + MIGRATE** |
| `vehicle_brands`          | ✅ EXISTS  | id serial   | unique(slug, vehicle_type) | **KEEP + UPDATE**  |
| `category_vehicle_brands` | ❌ MISSING | N/A         | N/A                        | **CREATE**         |

### MIGRATION ANALYSE

**Bestaande Migrations (Latest):**

```
20251102210000_create_categories_tables.sql        → Basic categories/subcategories
20251230121000_create_vehicle_brands_table.sql     → Vehicle brands table
20251230150000_seed_full_categories.sql            → Category seeds
20251230161000_add_real_vehicle_brands.sql         → Brand seeds
```

**Schema Inconsistenties:**

1. **Primary Keys:** Huidige schema gebruikt `serial` (int), specificatie vereist `uuid`
2. **Missing Table:** `category_vehicle_brands` mapping table bestaat niet
3. **Constraints:** Geen `lower()` unique constraints voor case-insensitive uniqueness
4. **RLS:** Policies bestaan maar mogelijk niet volledig voor mapping table

### CATEGORIES TABEL AUDIT

**Huidige Schema:**

```sql
categories (
  id serial primary key,              -- ❌ Should be UUID
  name text not null unique,          -- ✅ OK
  slug text not null unique,          -- ❌ Should be lower(slug)
  icon_url text,                      -- ✅ Optional
  is_active boolean default true,     -- ✅ OK
  position integer,                   -- ⚠️ Inconsistent (vs sort_order)
  sort_order integer default 0,      -- ⚠️ Duplicate of position
  created_at timestamptz default now(), -- ✅ OK
  updated_at timestamptz default now()  -- ✅ OK but not in spec
)
```

**Required Changes:**

- [ ] Migrate to UUID primary key
- [ ] Add unique index on `lower(slug)`
- [ ] Remove duplicate position/sort_order
- [ ] Clean up column inconsistencies

### SUBCATEGORIES TABEL AUDIT

**Huidige Schema:**

```sql
subcategories (
  id serial primary key,                    -- ❌ Should be UUID
  category_id integer not null references categories(id), -- ❌ Should be UUID
  name text not null,                       -- ✅ OK
  slug text not null,                       -- ✅ OK
  is_active boolean default true,           -- ✅ OK
  sort_order integer default 0,             -- ✅ OK
  created_at timestamptz default now(),     -- ✅ OK
  updated_at timestamptz default now(),     -- ✅ OK but not in spec
  unique(category_id, slug)                 -- ❌ Should be lower(slug)
)
```

**Required Changes:**

- [ ] Migrate to UUID primary key + foreign key
- [ ] Add unique index on `(category_id, lower(slug))`

### VEHICLE_BRANDS TABEL AUDIT

**Huidige Schema:**

```sql
vehicle_brands (
  id serial primary key,                    -- ❌ Should be UUID
  name text not null,                       -- ✅ OK
  slug text not null,                       -- ✅ OK
  vehicle_type text not null check (...),   -- ✅ OK (good constraint)
  is_active boolean default true,           -- ✅ OK
  order_index integer default 0,            -- ⚠️ Should be sort_order?
  created_at timestamptz default now(),     -- ✅ OK
  updated_at timestamptz default now(),     -- ❌ Not in spec
  unique(slug, vehicle_type)                -- ❌ Should be lower(slug)
)
```

**Required Changes:**

- [ ] Migrate to UUID primary key
- [ ] Add unique index on `lower(slug)` (globally unique)
- [ ] Remove updated_at (not in spec)
- [ ] Standardize order_index → sort_order

### MISSING TABLE: category_vehicle_brands

**Required Schema:**

```sql
category_vehicle_brands (
  category_id uuid not null references categories(id) on delete cascade,
  brand_id uuid not null references vehicle_brands(id) on delete cascade,
  primary key (category_id, brand_id)
)
```

## CODE USAGE ANALYSE

### ACTIVE SUPABASE USAGE

| Component/Service                     | Table Access          | Status     |
| ------------------------------------- | --------------------- | ---------- |
| `lib/services/brand.service.ts`       | `vehicle_brands`      | ✅ Working |
| `lib/services/subcategory.service.ts` | `subcategories`       | ✅ Working |
| `components/CategorySelect.tsx`       | `categories`          | ✅ Working |
| `app/sell/actions.ts`                 | listings + categories | ✅ Working |

### HARDCODED DATA STILL IN USE

| File                              | Usage              | Impact                     |
| --------------------------------- | ------------------ | -------------------------- |
| `lib/categories.ts`               | CATEGORIES export  | **HIGH** - Needs migration |
| `data/vehicle/brands.*.json`      | Static brand lists | **HIGH** - Needs migration |
| `app/api/vehicle/brands/route.ts` | API endpoint       | **MEDIUM** - Needs update  |

## RLS POLICIES AUDIT

### Categories & Subcategories

```sql
✅ categories_select: SELECT for all users
✅ subcategories_select: SELECT for all users
❌ Missing: INSERT/UPDATE policies for admin
```

### Vehicle Brands

```sql
✅ vehicle_brands_select: SELECT for all users
✅ vehicle_brands_insert: INSERT for admin only
✅ vehicle_brands_update: UPDATE for admin only
❌ Missing: category_vehicle_brands policies
```

## OVERBODIGE TABELLEN

**Scan Results:** Geen overbodige categorie/brand tabellen gevonden

- Alle huidige tabellen zijn relevant voor Phase 16
- Mogelijk legacy tables in other domains (bv. orders, messaging)

**Actie:** Separate cleanup audit needed voor non-category tables

## MIGRATION STRATEGIE

### Prioriteit 1: Schema Migratie (UUID + Constraints)

1. `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`
2. Add nieuwe UUID columns naast bestaande serial columns
3. Populate UUIDs and update referenties
4. Drop old serial columns en rename UUID columns
5. Add proper unique constraints met `lower()`

### Prioriteit 2: Mapping Table

1. Create `category_vehicle_brands` table
2. Add RLS policies
3. Seed initial mappings

### Prioriteit 3: Data Migration

1. Seed canonical categories from hardcoded data
2. Seed vehicle brands from JSON files
3. Create category → brand mappings

### Prioriteit 4: Code Updates

1. Update services voor canonical access
2. Remove hardcoded data dependencies
3. Add missing UI components

## ACTIEPLAN

1. ✅ Schema audit complete
2. 🔄 Create canonical migration files
3. 🔄 Implement seed scripts
4. 🔄 Update services & UI
5. 🔄 Drop overbodige files
6. 🔄 Testing
