-- CONSOLIDATE CATEGORIES
-- Doel: Verwijder/consolideer categorieën volgens nieuwe structuur
-- Datum: 2 Jan 2025

BEGIN;

-- STAP 1: Splits "Bouw & Tuin" in twee aparte categorieën
-- Eerst controleren of "Bouw" en "Tuin" al bestaan
DO $$
DECLARE
    bouw_tuin_id INTEGER;
    bouw_id INTEGER;
    tuin_id INTEGER;
    bouw_exists BOOLEAN;
    tuin_exists BOOLEAN;
BEGIN
    -- Vind "Bouw & Tuin" categorie
    SELECT id INTO bouw_tuin_id FROM categories WHERE slug = 'bouw-tuin' AND is_active = true;
    
    IF bouw_tuin_id IS NOT NULL THEN
        -- Check of "Bouw" al bestaat
        SELECT EXISTS(SELECT 1 FROM categories WHERE slug = 'bouw' AND is_active = true) INTO bouw_exists;
        
        -- Check of "Tuin" al bestaat
        SELECT EXISTS(SELECT 1 FROM categories WHERE slug = 'tuin' AND is_active = true) INTO tuin_exists;
        
        -- Verplaats listings van "Bouw & Tuin" naar "Bouw" of "Tuin" op basis van subcategorie
        -- Eerst maken we de nieuwe categorieën aan als ze niet bestaan
        
        IF NOT bouw_exists THEN
            -- Maak "Bouw" categorie aan
            INSERT INTO categories (name, slug, icon_url, is_active, sort_order)
            VALUES ('Bouw', 'bouw', 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/tools.svg', true, 
                    (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM categories))
            RETURNING id INTO bouw_id;
        ELSE
            SELECT id INTO bouw_id FROM categories WHERE slug = 'bouw' AND is_active = true;
        END IF;
        
        IF NOT tuin_exists THEN
            -- Maak "Tuin" categorie aan
            INSERT INTO categories (name, slug, icon_url, is_active, sort_order)
            VALUES ('Tuin', 'tuin', 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/plant.svg', true,
                    (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM categories))
            RETURNING id INTO tuin_id;
        ELSE
            SELECT id INTO tuin_id FROM categories WHERE slug = 'tuin' AND is_active = true;
        END IF;
        
        -- Verplaats listings: als subcategorie "bouw" bevat → Bouw, anders → Tuin
        -- Eerst naar Bouw als subcategorie bouw-gerelateerd is
        UPDATE listings 
        SET category_id = bouw_id
        WHERE category_id = bouw_tuin_id 
          AND EXISTS (
              SELECT 1 FROM subcategories s 
              WHERE s.id = listings.subcategory_id 
              AND (LOWER(s.name) LIKE '%bouw%' OR LOWER(s.name) LIKE '%constructie%' OR LOWER(s.name) LIKE '%materiaal%')
          );
        
        -- Rest naar Tuin (alle listings die nog niet zijn verplaatst)
        UPDATE listings 
        SET category_id = tuin_id
        WHERE category_id = bouw_tuin_id;
        
        -- Verplaats subcategorieën naar Bouw
        UPDATE subcategories 
        SET category_id = bouw_id
        WHERE category_id = bouw_tuin_id 
          AND (LOWER(name) LIKE '%bouw%' OR LOWER(name) LIKE '%constructie%' OR LOWER(name) LIKE '%materiaal%');
        
        -- Rest van subcategorieën naar Tuin
        UPDATE subcategories 
        SET category_id = tuin_id
        WHERE category_id = bouw_tuin_id;
        
        -- Deactiveer "Bouw & Tuin"
        UPDATE categories SET is_active = false WHERE id = bouw_tuin_id;
    END IF;
END $$;

-- STAP 2: Verwijder "Sport & Hobby"
-- Verplaats listings naar "Sport & Fitness" of "Hobbys" op basis van subcategorie
DO $$
DECLARE
    sport_hobby_id INTEGER;
    sport_fitness_id INTEGER;
    hobbys_id INTEGER;
BEGIN
    SELECT id INTO sport_hobby_id FROM categories WHERE slug = 'sport-hobby' AND is_active = true;
    SELECT id INTO sport_fitness_id FROM categories WHERE slug = 'sport-fitness' AND is_active = true;
    SELECT id INTO hobbys_id FROM categories WHERE slug = 'hobbys' AND is_active = true;
    
    IF sport_hobby_id IS NOT NULL THEN
        -- Verplaats listings naar Sport & Fitness als subcategorie sport-gerelateerd is
        IF sport_fitness_id IS NOT NULL THEN
            UPDATE listings 
            SET category_id = sport_fitness_id
            WHERE category_id = sport_hobby_id 
              AND EXISTS (
                  SELECT 1 FROM subcategories s 
                  WHERE s.id = listings.subcategory_id 
                  AND (LOWER(s.name) LIKE '%sport%' OR LOWER(s.name) LIKE '%fitness%' OR LOWER(s.name) LIKE '%voetbal%' OR LOWER(s.name) LIKE '%tennis%')
              );
        END IF;
        
        -- Rest naar Hobbys
        IF hobbys_id IS NOT NULL THEN
            UPDATE listings 
            SET category_id = hobbys_id
            WHERE category_id = sport_hobby_id;
        END IF;
        
        -- Verplaats subcategorieën
        IF sport_fitness_id IS NOT NULL THEN
            UPDATE subcategories 
            SET category_id = sport_fitness_id
            WHERE category_id = sport_hobby_id 
              AND (LOWER(name) LIKE '%sport%' OR LOWER(name) LIKE '%fitness%' OR LOWER(name) LIKE '%voetbal%' OR LOWER(name) LIKE '%tennis%');
        END IF;
        
        IF hobbys_id IS NOT NULL THEN
            UPDATE subcategories 
            SET category_id = hobbys_id
            WHERE category_id = sport_hobby_id;
        END IF;
        
        -- Deactiveer "Sport & Hobby"
        UPDATE categories SET is_active = false WHERE id = sport_hobby_id;
    END IF;
END $$;

-- STAP 3: Verwijder "Boeken & Media"
-- Verplaats listings naar "Muziek, Boeken & Films"
DO $$
DECLARE
    boeken_media_id INTEGER;
    muziek_boeken_films_id INTEGER;
BEGIN
    SELECT id INTO boeken_media_id FROM categories WHERE slug = 'boeken-media' AND is_active = true;
    SELECT id INTO muziek_boeken_films_id FROM categories WHERE slug = 'muziek-boeken-films' AND is_active = true;
    
    IF boeken_media_id IS NOT NULL AND muziek_boeken_films_id IS NOT NULL THEN
        -- Verplaats alle listings
        UPDATE listings 
        SET category_id = muziek_boeken_films_id
        WHERE category_id = boeken_media_id;
        
        -- Verplaats alle subcategorieën
        UPDATE subcategories 
        SET category_id = muziek_boeken_films_id
        WHERE category_id = boeken_media_id;
        
        -- Deactiveer "Boeken & Media"
        UPDATE categories SET is_active = false WHERE id = boeken_media_id;
    END IF;
END $$;

-- STAP 4: Verwijder "Huis & Tuin"
-- Verplaats listings naar "Huis & Inrichting" of "Tuin & Terras" op basis van subcategorie
DO $$
DECLARE
    huis_tuin_id INTEGER;
    huis_inrichting_id INTEGER;
    tuin_terras_id INTEGER;
BEGIN
    SELECT id INTO huis_tuin_id FROM categories WHERE slug = 'huis-tuin' AND is_active = true;
    SELECT id INTO huis_inrichting_id FROM categories WHERE slug = 'huis-inrichting' AND is_active = true;
    SELECT id INTO tuin_terras_id FROM categories WHERE slug = 'tuin-terras' AND is_active = true;
    
    IF huis_tuin_id IS NOT NULL THEN
        -- Verplaats listings naar Huis & Inrichting als subcategorie huis-gerelateerd is
        IF huis_inrichting_id IS NOT NULL THEN
            UPDATE listings 
            SET category_id = huis_inrichting_id
            WHERE category_id = huis_tuin_id 
              AND EXISTS (
                  SELECT 1 FROM subcategories s 
                  WHERE s.id = listings.subcategory_id 
                  AND (LOWER(s.name) LIKE '%huis%' OR LOWER(s.name) LIKE '%inrichting%' OR LOWER(s.name) LIKE '%meubel%' OR LOWER(s.name) LIKE '%keuken%' OR LOWER(s.name) LIKE '%badkamer%')
              );
        END IF;
        
        -- Verplaats listings naar Tuin & Terras als subcategorie tuin-gerelateerd is
        IF tuin_terras_id IS NOT NULL THEN
            UPDATE listings 
            SET category_id = tuin_terras_id
            WHERE category_id = huis_tuin_id 
              AND EXISTS (
                  SELECT 1 FROM subcategories s 
                  WHERE s.id = listings.subcategory_id 
                  AND (LOWER(s.name) LIKE '%tuin%' OR LOWER(s.name) LIKE '%terras%' OR LOWER(s.name) LIKE '%plant%' OR LOWER(s.name) LIKE '%gazon%')
              );
        END IF;
        
        -- Rest naar Huis & Inrichting (fallback)
        IF huis_inrichting_id IS NOT NULL THEN
            UPDATE listings 
            SET category_id = huis_inrichting_id
            WHERE category_id = huis_tuin_id;
        END IF;
        
        -- Verplaats subcategorieën naar Huis & Inrichting
        IF huis_inrichting_id IS NOT NULL THEN
            UPDATE subcategories 
            SET category_id = huis_inrichting_id
            WHERE category_id = huis_tuin_id 
              AND (LOWER(name) LIKE '%huis%' OR LOWER(name) LIKE '%inrichting%' OR LOWER(name) LIKE '%meubel%' OR LOWER(name) LIKE '%keuken%' OR LOWER(name) LIKE '%badkamer%');
        END IF;
        
        -- Verplaats subcategorieën naar Tuin & Terras
        IF tuin_terras_id IS NOT NULL THEN
            UPDATE subcategories 
            SET category_id = tuin_terras_id
            WHERE category_id = huis_tuin_id 
              AND (LOWER(name) LIKE '%tuin%' OR LOWER(name) LIKE '%terras%' OR LOWER(name) LIKE '%plant%' OR LOWER(name) LIKE '%gazon%');
        END IF;
        
        -- Rest van subcategorieën naar Huis & Inrichting
        IF huis_inrichting_id IS NOT NULL THEN
            UPDATE subcategories 
            SET category_id = huis_inrichting_id
            WHERE category_id = huis_tuin_id;
        END IF;
        
        -- Deactiveer "Huis & Tuin"
        UPDATE categories SET is_active = false WHERE id = huis_tuin_id;
    END IF;
END $$;

COMMIT;

