-- ADD MISSING CATEGORY ICONS
-- Doel: Zorg dat alle actieve categorieën consistente Tabler icons hebben
-- Datum: 2 Jan 2025
-- Constraint: Alleen Supabase data fixes

BEGIN;

-- Eerst normaliseren we alle bestaande icon URLs naar dezelfde CDN structuur
-- Sommige gebruiken @tabler/icons, andere tabler-icons - we maken alles consistent
UPDATE categories 
SET icon_url = REPLACE(icon_url, '@tabler/icons@latest', 'tabler-icons@latest')
WHERE icon_url LIKE '%@tabler/icons%';

-- Ook normaliseren we @tabler/icons zonder @latest
UPDATE categories 
SET icon_url = REPLACE(icon_url, '@tabler/icons/', 'tabler-icons@latest/icons/')
WHERE icon_url LIKE '%@tabler/icons/%';

-- Update alle actieve categorieën die nog geen icon_url hebben met passende Tabler icons
-- We gebruiken dezelfde CDN URL structuur als de bestaande iconen voor consistentie

-- Standaard iconen voor categorieën die nog geen icon hebben
-- Deze worden alleen toegepast als icon_url NULL is

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/device-laptop.svg'
WHERE slug = 'elektronica' AND (icon_url IS NULL OR icon_url = '');

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/home.svg'
WHERE slug = 'huis-tuin' AND (icon_url IS NULL OR icon_url = '');

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/car.svg'
WHERE slug = 'auto-motor' AND (icon_url IS NULL OR icon_url = '');

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/shirt.svg'
WHERE slug = 'mode-schoenen' AND (icon_url IS NULL OR icon_url = '');

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/ball-tennis.svg'
WHERE slug = 'sport-hobby' AND (icon_url IS NULL OR icon_url = '');

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/book.svg'
WHERE slug = 'boeken-media' AND (icon_url IS NULL OR icon_url = '');

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/baby-carriage.svg'
WHERE slug = 'baby-kind' AND (icon_url IS NULL OR icon_url = '');

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/building-store.svg'
WHERE slug = 'zakelijk' AND (icon_url IS NULL OR icon_url = '');

-- Vehicle categorieën - update ook als ze al een icon_url hebben met oude format
UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/truck.svg'
WHERE slug = 'bedrijfswagens' AND (icon_url IS NULL OR icon_url = '' OR icon_url LIKE '%@tabler/icons%');

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/motorbike.svg'
WHERE slug = 'motoren' AND (icon_url IS NULL OR icon_url = '' OR icon_url LIKE '%@tabler/icons%');

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/caravan.svg'
WHERE slug = 'camper-mobilhomes' AND (icon_url IS NULL OR icon_url = '' OR icon_url LIKE '%@tabler/icons%');

-- Andere mogelijke categorieën (als ze bestaan)
UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/device-mobile.svg'
WHERE slug = 'phones-tablets' AND (icon_url IS NULL OR icon_url = '');

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/device-desktop.svg'
WHERE slug = 'computers' AND (icon_url IS NULL OR icon_url = '');

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/bike.svg'
WHERE slug = 'fietsen-brommers' AND (icon_url IS NULL OR icon_url = '');

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/palette.svg'
WHERE slug = 'hobbys' AND (icon_url IS NULL OR icon_url = '');

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/music.svg'
WHERE slug = 'muziek-boeken-films' AND (icon_url IS NULL OR icon_url = '');

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/device-gamepad.svg'
WHERE slug = 'games' AND (icon_url IS NULL OR icon_url = '');

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/paw.svg'
WHERE slug = 'dieren' AND (icon_url IS NULL OR icon_url = '');

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/tools.svg'
WHERE slug = 'bouw' AND (icon_url IS NULL OR icon_url = '');

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/ticket.svg'
WHERE slug = 'tickets' AND (icon_url IS NULL OR icon_url = '');

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/briefcase.svg'
WHERE slug = 'diensten' AND (icon_url IS NULL OR icon_url = '');

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/building.svg'
WHERE slug = 'immo' AND (icon_url IS NULL OR icon_url = '');

UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/gift.svg'
WHERE slug = 'gratis' AND (icon_url IS NULL OR icon_url = '');

-- Fallback voor alle andere actieve categorieën zonder icon
UPDATE categories 
SET icon_url = 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/category.svg'
WHERE is_active = true 
  AND (icon_url IS NULL OR icon_url = '');

COMMIT;

