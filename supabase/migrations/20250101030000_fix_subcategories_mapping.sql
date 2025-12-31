-- CATEGORIE HOTFIX V2 - SUBCATEGORIES FIX
-- Doel: Update subcategory mapping naar actieve categories
-- Datum: 31 Dec 2024

BEGIN;

-- STAP 1: Update alle auto-subcategories van category_id 11 naar 3 (Auto & Motor)
UPDATE subcategories 
SET category_id = 3 
WHERE category_id = 11;

-- STAP 2: Update eventuele andere subcategories voor hoofdcategorieën
-- Computers (category_id mogelijk 19 -> naar Elektronica 1)
UPDATE subcategories 
SET category_id = 1 
WHERE category_id = 19;

-- STAP 3: Update telefoons naar Elektronica
UPDATE subcategories 
SET category_id = 1 
WHERE category_id = 20;

-- STAP 4: Update kleding naar Mode & Schoenen
UPDATE subcategories 
SET category_id = 4 
WHERE category_id = 21;

-- STAP 5: Update baby spullen naar Baby & Kind
UPDATE subcategories 
SET category_id = 7 
WHERE category_id = 22;

-- STAP 6: Update sport naar Sport & Hobby
UPDATE subcategories 
SET category_id = 5 
WHERE category_id = 23;

-- STAP 7: Update hobbys naar Sport & Hobby
UPDATE subcategories 
SET category_id = 5 
WHERE category_id = 24;

-- STAP 8: Update media naar Boeken & Media
UPDATE subcategories 
SET category_id = 6 
WHERE category_id = 25;

-- STAP 9: Update games naar Sport & Hobby (gaming als hobby)
UPDATE subcategories 
SET category_id = 5 
WHERE category_id = 26;

-- STAP 10: Update huis & inrichting naar Huis & Tuin
UPDATE subcategories 
SET category_id = 2 
WHERE category_id = 16;

-- STAP 11: Update tuin & terras naar Huis & Tuin
UPDATE subcategories 
SET category_id = 2 
WHERE category_id = 17;

COMMIT;
