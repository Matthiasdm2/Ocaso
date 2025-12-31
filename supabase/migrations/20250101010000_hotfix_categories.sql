-- CATEGORIE HOTFIX MIGRATION
-- Doel: Fix sort orders, duplicaten, icons
-- Datum: 31 Dec 2024
-- Constraint: Alleen Supabase data fixes

BEGIN;

-- STAP 1: Fix sort orders voor hoofdcategorieën
UPDATE categories SET sort_order = 1 WHERE name = 'Elektronica' AND slug = 'elektronica';
UPDATE categories SET sort_order = 2 WHERE name = 'Huis & Tuin' AND slug = 'huis-tuin';  
UPDATE categories SET sort_order = 3 WHERE name = 'Auto & Motor' AND slug = 'auto-motor';
UPDATE categories SET sort_order = 4 WHERE name = 'Mode & Schoenen' AND slug = 'mode-schoenen';
UPDATE categories SET sort_order = 5 WHERE name = 'Sport & Hobby' AND slug = 'sport-hobby';
UPDATE categories SET sort_order = 6 WHERE name = 'Boeken & Media' AND slug = 'boeken-media';
UPDATE categories SET sort_order = 7 WHERE name = 'Baby & Kind' AND slug = 'baby-kind';
UPDATE categories SET sort_order = 8 WHERE name = 'Zakelijk' AND slug = 'zakelijk';

-- STAP 2: Deactiveer duplicaten (behoud alleen hoofdcategorieën)
UPDATE categories SET is_active = false WHERE slug LIKE 'vehicles-%' OR slug LIKE 'multimedia-%' OR slug LIKE 'immo-%';
UPDATE categories SET is_active = false WHERE slug LIKE 'vehicles/%' OR slug = 'vehicles';
UPDATE categories SET is_active = false WHERE slug IN ('home-garden', 'multimedia', 'immo');
UPDATE categories SET is_active = false WHERE name = 'Voertuigen' AND slug = 'vehicles';

-- STAP 3: Icon URLs toevoegen voor hoofdcategorieën  
UPDATE categories SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/device-laptop.svg' WHERE slug = 'elektronica';
UPDATE categories SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/home.svg' WHERE slug = 'huis-tuin';
UPDATE categories SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/car.svg' WHERE slug = 'auto-motor';
UPDATE categories SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/shirt.svg' WHERE slug = 'mode-schoenen';
UPDATE categories SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/ball-tennis.svg' WHERE slug = 'sport-hobby';
UPDATE categories SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/book.svg' WHERE slug = 'boeken-media';
UPDATE categories SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/baby-carriage.svg' WHERE slug = 'baby-kind';
UPDATE categories SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/building-store.svg' WHERE slug = 'zakelijk';

-- STAP 4: Update subcategorie posities voor consistentie
UPDATE categories SET sort_order = 10 WHERE slug = 'computers';
UPDATE categories SET sort_order = 11 WHERE slug = 'phones-tablets';
UPDATE categories SET sort_order = 12 WHERE slug = 'huis-inrichting';
UPDATE categories SET sort_order = 13 WHERE slug = 'tuin-terras';

COMMIT;
