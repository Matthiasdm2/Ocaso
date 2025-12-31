-- CATEGORIE HOTFIX V2 MIGRATION
-- Doel: Fix subcategories mapping naar actieve categories
-- Datum: 31 Dec 2024
-- Issue: Subcategories gekoppeld aan oude/inactive category IDs

BEGIN;

-- Simpele check: toon actieve categories
SELECT 'ACTIVE CATEGORIES:' as info;
SELECT id, name, slug, is_active, sort_order FROM categories WHERE is_active = true ORDER BY sort_order;

-- Toon sample subcategories met hun category mapping
SELECT 'SUBCATEGORIES MAPPING:' as info;
SELECT s.id, s.name, s.category_id, c.name as category_name, c.is_active as cat_active 
FROM subcategories s 
LEFT JOIN categories c ON s.category_id = c.id 
LIMIT 15;

COMMIT;
