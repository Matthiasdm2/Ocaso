-- normalize_categories.sql
-- Doel: listings.category_id / listings.subcategory_id en listings.categories (int[])
-- volledig normaliseren + indexes + (optionele) trigger.
-- Voer stap voor stap uit in de Supabase SQL editor. Maak eerst een backup.

------------------------------------------------------------
-- 1. Inspectie huidig schema
------------------------------------------------------------
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'listings'
--   AND column_name IN ('categories','category_id','subcategory_id');

------------------------------------------------------------
-- 1b. Automatische conversie als categories nog json/jsonb is
-- (voert stap 2 automatisch uit zodat latere unnest() werkt op int[])
------------------------------------------------------------
DO $$
DECLARE v_type text;
BEGIN
  SELECT data_type INTO v_type
  FROM information_schema.columns
  WHERE table_name = 'listings' AND column_name = 'categories';
  IF v_type IN ('json','jsonb') THEN
    RAISE NOTICE 'Converteer json/jsonb categories -> int[]';
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS categories_int int[];
    UPDATE listings
    SET categories_int = ARRAY(
      SELECT jsonb_array_elements_text(categories)::int
    )
    WHERE categories IS NOT NULL AND categories_int IS NULL;
    ALTER TABLE listings DROP COLUMN categories;
    ALTER TABLE listings RENAME COLUMN categories_int TO categories;
  END IF;
END $$;

------------------------------------------------------------
-- 2. Als 'categories' kolom JSON/JSONB is -> converteer naar int[]
------------------------------------------------------------
-- BEGIN;
-- ALTER TABLE listings ADD COLUMN categories_int int[];
-- UPDATE listings
-- SET categories_int = ARRAY(
--   SELECT jsonb_array_elements_text(categories)::int
-- )
-- WHERE categories IS NOT NULL;
-- ALTER TABLE listings DROP COLUMN categories;
-- ALTER TABLE listings RENAME COLUMN categories_int TO categories;
-- COMMIT;

------------------------------------------------------------
-- 3. Als 'categories' kolom text[] is -> cast naar int[]
------------------------------------------------------------
-- BEGIN;
-- ALTER TABLE listings
--   ALTER COLUMN categories TYPE int[]
--   USING (
--     ARRAY(
--       SELECT CASE
--                WHEN trim(x)::text ~ '^[0-9]+$' THEN trim(x)::int
--              END
--       FROM unnest(categories) AS x
--     )
--   );
-- COMMIT;

------------------------------------------------------------
-- 4. Voeg kolommen toe indien ze nog niet bestaan
------------------------------------------------------------
ALTER TABLE listings ADD COLUMN IF NOT EXISTS category_id int;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS subcategory_id int;

------------------------------------------------------------
-- 5. Backfill subcategory_id vanuit categories array
------------------------------------------------------------
WITH first_sub AS (
  SELECT l.id,
         (
           SELECT sc.id FROM unnest(l.categories) cid
           JOIN subcategories sc ON sc.id = cid
           ORDER BY sc.id LIMIT 1
         ) AS sub_id
  FROM listings l
  WHERE l.subcategory_id IS NULL
)
UPDATE listings l
SET subcategory_id = fs.sub_id
FROM first_sub fs
WHERE l.id = fs.id
  AND fs.sub_id IS NOT NULL;

-- Dynamische variant: ondersteunt zowel (a) categories met parent_id kolom
-- als (b) gescheiden categories + subcategories tabellen zonder parent_id.
DO $$
DECLARE has_parent_col boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'parent_id'
  ) INTO has_parent_col;

  IF has_parent_col THEN
    -- Variant A: categories tabel is hiërarchisch (parent_id IS NULL = top-level)
    WITH first_cat AS (
      SELECT l.id,
             (
               SELECT c.id FROM unnest(l.categories) cid
               JOIN categories c ON c.id = cid AND c.parent_id IS NULL
               ORDER BY c.id LIMIT 1
             ) AS cat_id
      FROM listings l
      WHERE l.category_id IS NULL
    )
    UPDATE listings l
    SET category_id = fc.cat_id
    FROM first_cat fc
    WHERE l.id = fc.id AND fc.cat_id IS NOT NULL;
  ELSE
    -- Variant B: categories bevat alleen top-level; subcategories aparte tabel
    WITH first_cat_simple AS (
      SELECT l.id,
             (
               SELECT c.id FROM unnest(l.categories) cid
               JOIN categories c ON c.id = cid
               ORDER BY c.id LIMIT 1
             ) AS cat_id
      FROM listings l
      WHERE l.category_id IS NULL
    )
    UPDATE listings l
    SET category_id = fcs.cat_id
    FROM first_cat_simple fcs
    WHERE l.id = fcs.id AND fcs.cat_id IS NOT NULL;
  END IF;

  -- Universele fallback: afleiden via subcategory koppeling
  UPDATE listings l
  SET category_id = sc.category_id
  FROM subcategories sc
  WHERE l.category_id IS NULL
    AND l.subcategory_id = sc.id;
END $$;

------------------------------------------------------------
-- 8. (Optioneel) categories array opnieuw genereren uit kolommen
------------------------------------------------------------
-- UPDATE listings
-- SET categories = ARRAY(
--   SELECT DISTINCT x FROM unnest(ARRAY[category_id, subcategory_id]) x
--   WHERE x IS NOT NULL
-- );

------------------------------------------------------------
-- 8b. JSONB-SAFE VARIANT (gebruik als je stap 1b/2 nog niet wilde draaien) ***OPTIONEEL***
-- Deze variant berekent tijdelijk een int[] uit json/jsonb zonder kolom te wijzigen.
-- Vervang dan stap 5 & 6 door onderstaande blokken.
------------------------------------------------------------
-- WITH first_sub AS (
--   SELECT l.id,
--          (
--            SELECT sc.id FROM (
--              SELECT CASE
--                       WHEN pg_typeof(l.categories)::text IN ('json','jsonb') THEN ARRAY(SELECT jsonb_array_elements_text(l.categories)::int)
--                       ELSE l.categories::int[]
--                     END AS cat_array
--            ) ca
--            CROSS JOIN LATERAL unnest(ca.cat_array) AS cid
--            JOIN subcategories sc ON sc.id = cid
--            ORDER BY sc.id LIMIT 1
--          ) AS sub_id
--   FROM listings l
--   WHERE l.subcategory_id IS NULL
-- )
-- UPDATE listings l
-- SET subcategory_id = fs.sub_id
-- FROM first_sub fs
-- WHERE l.id = fs.id AND fs.sub_id IS NOT NULL;
--
-- WITH first_cat AS (
--   SELECT l.id,
--          (
--            SELECT c.id FROM (
--              SELECT CASE
--                       WHEN pg_typeof(l.categories)::text IN ('json','jsonb') THEN ARRAY(SELECT jsonb_array_elements_text(l.categories)::int)
--                       ELSE l.categories::int[]
--                     END AS cat_array
--            ) ca
--            CROSS JOIN LATERAL unnest(ca.cat_array) AS cid
--            JOIN categories c ON c.id = cid AND c.parent_id IS NULL
--            ORDER BY c.id LIMIT 1
--          ) AS cat_id
--   FROM listings l
--   WHERE l.category_id IS NULL
-- )
-- UPDATE listings l
-- SET category_id = fc.cat_id
-- FROM first_cat fc
-- WHERE l.id = fc.id AND fc.cat_id IS NOT NULL;

------------------------------------------------------------
-- 9. Indexen voor performance
------------------------------------------------------------
CREATE INDEX IF NOT EXISTS listings_category_id_idx ON listings(category_id);
CREATE INDEX IF NOT EXISTS listings_subcategory_id_idx ON listings(subcategory_id);
CREATE INDEX IF NOT EXISTS listings_categories_gin ON listings USING gin (categories);

------------------------------------------------------------
-- 10. Trigger om categories array synchroon te houden (optioneel)
------------------------------------------------------------
-- CREATE OR REPLACE FUNCTION listings_sync_categories()
-- RETURNS trigger AS $$
-- BEGIN
--   NEW.categories :=
--     ARRAY(SELECT DISTINCT x
--           FROM unnest(ARRAY[NEW.category_id, NEW.subcategory_id]) x
--           WHERE x IS NOT NULL)::int[];
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- DROP TRIGGER IF EXISTS trg_listings_sync_categories ON listings;
-- CREATE TRIGGER trg_listings_sync_categories
-- BEFORE INSERT OR UPDATE OF category_id, subcategory_id ON listings
-- FOR EACH ROW EXECUTE FUNCTION listings_sync_categories();

------------------------------------------------------------
-- 11. Validatie
------------------------------------------------------------
-- SELECT id, category_id, subcategory_id, categories
-- FROM listings
-- WHERE (category_id IS NULL OR subcategory_id IS NULL)
--   AND array_length(categories,1) > 0
-- LIMIT 50;
--
-- SELECT
--   COUNT(*) AS totaal,
--   COUNT(*) FILTER (WHERE category_id IS NULL) AS zonder_category,
--   COUNT(*) FILTER (WHERE subcategory_id IS NULL) AS zonder_subcategory
-- FROM listings;

------------------------------------------------------------
-- 12. (Optioneel) Constraints pas na volledige vulling
------------------------------------------------------------
-- ALTER TABLE listings ALTER COLUMN category_id SET NOT NULL;
-- ALTER TABLE listings ALTER COLUMN subcategory_id SET NOT NULL;

-- Klaar. Controleer nu de pagina /debug/marketplace-cats.
