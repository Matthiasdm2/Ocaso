-- VEHICLES SPLIT MIGRATION
-- Split "Auto & Motor" naar 3 afzonderlijke vehicle categories
-- Datum: 31 december 2024

BEGIN;

-- B1) CANONICAL SLUGS & CATEGORIES
-- Update bestaande "Auto & Motor" category (behoud als auto-specifiek)
UPDATE categories 
SET 
  name = 'Auto & Motor',
  slug = 'auto-motor',
  sort_order = 3,
  is_active = true,
  icon_url = 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/car.svg'
WHERE id = 3;

-- Activeer "Bedrijfswagens" category (was inactive)
UPDATE categories 
SET 
  name = 'Bedrijfswagens',
  slug = 'bedrijfswagens',
  sort_order = 9,  -- Na zakelijk (8)
  is_active = true,
  icon_url = 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/truck.svg'
WHERE slug = 'vehicles-vans' AND name = 'Bedrijfsvoertuigen';

-- Als Bedrijfswagens niet bestaat, maak dan nieuwe
INSERT INTO categories (name, slug, sort_order, is_active, icon_url)
SELECT 'Bedrijfswagens', 'bedrijfswagens', 9, true, 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/truck.svg'
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE slug = 'bedrijfswagens'
);

-- Activeer/maak "Camper & Mobilhomes" category
UPDATE categories 
SET 
  name = 'Camper & Mobilhomes',
  slug = 'camper-mobilhomes',
  sort_order = 10,  -- Na bedrijfswagens (9)
  is_active = true,
  icon_url = 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/caravan.svg'
WHERE slug = 'vehicles-motorhomes' AND name = 'Campers & Motorhomes';

-- Als Camper & Mobilhomes niet bestaat, maak dan nieuwe
INSERT INTO categories (name, slug, sort_order, is_active, icon_url)
SELECT 'Camper & Mobilhomes', 'camper-mobilhomes', 10, true, 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/caravan.svg'
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE slug = 'camper-mobilhomes'
);

-- B2) MAAK CATEGORY_VEHICLE_BRANDS MAPPING TABLE
CREATE TABLE IF NOT EXISTS category_vehicle_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  vehicle_brand_id INTEGER REFERENCES vehicle_brands(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, vehicle_brand_id)
);

-- Enable RLS
ALTER TABLE category_vehicle_brands ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public read access
CREATE POLICY "Allow public read access on category_vehicle_brands" ON category_vehicle_brands
  FOR SELECT USING (true);

-- B3) FIX DUPLICATE BRAND SLUGS
-- Voeg vehicle_type suffix toe aan duplicates om unique slugs te maken

-- Update ford duplicates
UPDATE vehicle_brands 
SET slug = 'ford-car' 
WHERE name = 'Ford' AND vehicle_type = 'car' AND slug = 'ford';

UPDATE vehicle_brands 
SET slug = 'ford-van' 
WHERE name = 'Ford' AND vehicle_type = 'van' AND slug = 'ford';

UPDATE vehicle_brands 
SET slug = 'ford-truck' 
WHERE name = 'Ford' AND vehicle_type = 'truck' AND slug = 'ford';

-- Update mercedes-benz duplicates  
UPDATE vehicle_brands 
SET slug = 'mercedes-benz-car'
WHERE name = 'Mercedes-Benz' AND vehicle_type = 'car' AND slug = 'mercedes-benz';

UPDATE vehicle_brands 
SET slug = 'mercedes-benz-van'
WHERE name = 'Mercedes-Benz' AND vehicle_type = 'van' AND slug = 'mercedes-benz';

UPDATE vehicle_brands 
SET slug = 'mercedes-benz-truck'
WHERE name = 'Mercedes-Benz' AND vehicle_type = 'truck' AND slug = 'mercedes-benz';

-- Update renault duplicates
UPDATE vehicle_brands 
SET slug = 'renault-car'
WHERE name = 'Renault' AND vehicle_type = 'car' AND slug = 'renault';

UPDATE vehicle_brands 
SET slug = 'renault-van'
WHERE name = 'Renault' AND vehicle_type = 'van' AND slug = 'renault';

UPDATE vehicle_brands 
SET slug = 'renault-motorhome'
WHERE name = 'Renault' AND vehicle_type = 'motorhome' AND slug = 'renault';

-- Update other common duplicates (BMW, Fiat, Honda, etc.)
-- Voor alle andere duplicates: voeg vehicle_type suffix toe
UPDATE vehicle_brands 
SET slug = name || '-' || vehicle_type
WHERE slug IN (
  SELECT slug 
  FROM vehicle_brands 
  GROUP BY slug 
  HAVING COUNT(*) > 1
) AND slug NOT LIKE '%-car' AND slug NOT LIKE '%-van' AND slug NOT LIKE '%-truck' AND slug NOT LIKE '%-motorhome';

COMMIT;
