-- FIX ALL CATEGORY ICONS - FORCE UPDATE
-- Doel: Zorg dat ALLE actieve categorieën consistente Tabler icons hebben
-- Datum: 2 Jan 2025
-- Dit is een force update die alle iconen overschrijft naar het juiste formaat

BEGIN;

-- STAP 1: Normaliseer alle bestaande icon URLs
UPDATE categories 
SET icon_url = REPLACE(icon_url, '@tabler/icons@latest', 'tabler-icons@latest')
WHERE icon_url LIKE '%@tabler/icons%';

UPDATE categories 
SET icon_url = REPLACE(icon_url, '@tabler/icons/', 'tabler-icons@latest/icons/')
WHERE icon_url LIKE '%@tabler/icons/%';

-- STAP 2: Force update alle hoofdcategorieën naar het juiste formaat
UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/device-laptop.svg'
WHERE slug = 'elektronica';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/home.svg'
WHERE slug = 'huis-tuin';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/car.svg'
WHERE slug = 'auto-motor';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/shirt.svg'
WHERE slug = 'mode-schoenen';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/ball-tennis.svg'
WHERE slug = 'sport-hobby';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/book.svg'
WHERE slug = 'boeken-media';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/users.svg'
WHERE slug = 'baby-kind';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/building-store.svg'
WHERE slug = 'zakelijk';

-- STAP 3: Force update vehicle categorieën
UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/truck.svg'
WHERE slug = 'bedrijfswagens';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/bike.svg'
WHERE slug = 'motoren';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/caravan.svg'
WHERE slug = 'camper-mobilhomes';

-- STAP 4: Update andere mogelijke categorieën
UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/device-mobile.svg'
WHERE slug = 'phones-tablets';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/device-desktop.svg'
WHERE slug = 'computers';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/bike.svg'
WHERE slug = 'fietsen-brommers';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/palette.svg'
WHERE slug = 'hobbys';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/music.svg'
WHERE slug = 'muziek-boeken-films';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/device-gamepad.svg'
WHERE slug = 'games';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/bone.svg'
WHERE slug = 'dieren';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/tools.svg'
WHERE slug = 'bouw';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/ticket.svg'
WHERE slug = 'tickets';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/briefcase.svg'
WHERE slug = 'diensten';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/building.svg'
WHERE slug = 'immo';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/gift.svg'
WHERE slug = 'gratis';

-- STAP 5: Update categorieën die nog het generieke category.svg icoon hebben
UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/shirt.svg'
WHERE slug = 'kleding' AND icon_url LIKE '%category.svg';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/baby.svg'
WHERE slug = 'kinderen-baby' AND icon_url LIKE '%category.svg';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/baby.svg'
WHERE slug = 'kinderen-baby';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/home.svg'
WHERE slug = 'huis-inrichting' AND icon_url LIKE '%category.svg';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/ball-tennis.svg'
WHERE slug = 'sport-fitness' AND icon_url LIKE '%category.svg';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/plant.svg'
WHERE slug = 'tuin-terras' AND icon_url LIKE '%category.svg';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/tools.svg'
WHERE slug = 'bouw-tuin' AND icon_url LIKE '%category.svg';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/ship.svg'
WHERE slug = 'caravans-boten' AND icon_url LIKE '%category.svg';

-- Update ook de "boten" categorie als die bestaat
UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/ship.svg'
WHERE slug = 'boten';

-- Force update caravans-boten naar ship icon
UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/ship.svg'
WHERE slug = 'caravans-boten';

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/ticket.svg'
WHERE slug = 'tickets-toegang' AND icon_url LIKE '%category.svg';

-- STAP 6: Fallback voor alle andere actieve categorieën zonder icon
UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/category.svg'
WHERE is_active = true 
  AND (icon_url IS NULL OR icon_url = '');

COMMIT;

