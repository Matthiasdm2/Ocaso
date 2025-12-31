-- CANONICAL VEHICLE CATEGORIES MIGRATION
-- Date: 31 December 2024
-- Purpose: DEFINITIVELY establish 4 vehicle categories with exact brand counts
-- Contract: FROZEN - this is the SINGLE SOURCE OF TRUTH for vehicle categorization

BEGIN;

-- ========================================
-- STEP 1: ENSURE 4 VEHICLE CATEGORIES EXIST
-- ========================================

-- Update existing Auto & Motor to be "Auto & Motor" (personenwagens)
UPDATE categories 
SET 
  name = 'Auto & Motor',
  slug = 'auto-motor',
  sort_order = 3,
  is_active = true,
  icon_url = 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/car.svg'
WHERE id = 3;

-- Ensure Bedrijfswagens exists and is active
INSERT INTO categories (name, slug, sort_order, is_active, icon_url)
VALUES ('Bedrijfswagens', 'bedrijfswagens', 9, true, 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/truck.svg')
ON CONFLICT (slug) DO UPDATE SET
  name = 'Bedrijfswagens',
  sort_order = 9,
  is_active = true,
  icon_url = 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/truck.svg';

-- Create Motoren category
INSERT INTO categories (name, slug, sort_order, is_active, icon_url)
VALUES ('Motoren', 'motoren', 11, true, 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/motorbike.svg')
ON CONFLICT (slug) DO UPDATE SET
  name = 'Motoren',
  sort_order = 11,
  is_active = true,
  icon_url = 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/motorbike.svg';

-- Ensure Camper & Mobilhomes exists and is active
INSERT INTO categories (name, slug, sort_order, is_active, icon_url)
VALUES ('Camper & Mobilhomes', 'camper-mobilhomes', 10, true, 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/caravan.svg')
ON CONFLICT (slug) DO UPDATE SET
  name = 'Camper & Mobilhomes',
  sort_order = 10,
  is_active = true,
  icon_url = 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/caravan.svg';

-- ========================================
-- STEP 2: ENSURE VEHICLE_BRANDS TABLE EXISTS
-- ========================================

CREATE TABLE IF NOT EXISTS vehicle_brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE vehicle_brands ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public read access
DROP POLICY IF EXISTS "Allow public read access on vehicle_brands" ON vehicle_brands;
CREATE POLICY "Allow public read access on vehicle_brands" ON vehicle_brands
  FOR SELECT USING (true);

-- ========================================
-- STEP 3: ENSURE CATEGORY_VEHICLE_BRANDS MAPPING TABLE EXISTS
-- ========================================

CREATE TABLE IF NOT EXISTS category_vehicle_brands (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  vehicle_brand_id INTEGER REFERENCES vehicle_brands(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, vehicle_brand_id)
);

-- Enable RLS
ALTER TABLE category_vehicle_brands ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public read access
DROP POLICY IF EXISTS "Allow public read access on category_vehicle_brands" ON category_vehicle_brands;
CREATE POLICY "Allow public read access on category_vehicle_brands" ON category_vehicle_brands
  FOR SELECT USING (true);

-- ========================================
-- STEP 4: CLEAR EXISTING MAPPINGS
-- ========================================

-- Clear existing mappings to ensure clean state
DELETE FROM category_vehicle_brands 
WHERE category_id IN (
  SELECT id FROM categories 
  WHERE slug IN ('auto-motor', 'bedrijfswagens', 'motoren', 'camper-mobilhomes')
);

-- ========================================
-- STEP 5: UPSERT AUTO & MOTOR BRANDS (45 EXACT)
-- ========================================

-- Auto & Motor brands (personenwagens)
INSERT INTO vehicle_brands (name, slug) VALUES
('Abarth', 'abarth'),
('Alfa Romeo', 'alfa-romeo'),
('Audi', 'audi'),
('BMW', 'bmw'),
('BYD', 'byd'),
('Citroën', 'citroen'),
('Cupra', 'cupra'),
('Dacia', 'dacia'),
('DS Automobiles', 'ds-automobiles'),
('Fiat', 'fiat'),
('Ford', 'ford'),
('Genesis', 'genesis'),
('Honda', 'honda'),
('Hyundai', 'hyundai'),
('Jaguar', 'jaguar'),
('Jeep', 'jeep'),
('Kia', 'kia'),
('Land Rover', 'land-rover'),
('Lexus', 'lexus'),
('Lynk & Co', 'lynk-co'),
('Mazda', 'mazda'),
('Mercedes-Benz', 'mercedes-benz'),
('MG', 'mg'),
('MINI', 'mini'),
('Mitsubishi', 'mitsubishi'),
('Nissan', 'nissan'),
('Opel', 'opel'),
('Peugeot', 'peugeot'),
('Polestar', 'polestar'),
('Porsche', 'porsche'),
('Renault', 'renault'),
('SEAT', 'seat'),
('Škoda', 'skoda'),
('Smart', 'smart'),
('Subaru', 'subaru'),
('Suzuki', 'suzuki'),
('Tesla', 'tesla'),
('Toyota', 'toyota'),
('Volkswagen', 'volkswagen'),
('Volvo', 'volvo'),
('Aiways', 'aiways'),
('Leapmotor', 'leapmotor'),
('NIO', 'nio'),
('Ora', 'ora'),
('XPeng', 'xpeng')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = true,
  updated_at = NOW();

-- ========================================
-- STEP 6: UPSERT BEDRIJFSWAGENS BRANDS (25 EXACT)
-- ========================================

INSERT INTO vehicle_brands (name, slug) VALUES
('BYD Commercial', 'byd-commercial'),
('Citroën Professional', 'citroen-professional'),
('DAF', 'daf'),
('Fiat Professional', 'fiat-professional'),
('Ford Commercial', 'ford-commercial'),
('Hyundai Commercial', 'hyundai-commercial'),
('Isuzu', 'isuzu'),
('Iveco', 'iveco'),
('MAN', 'man'),
('Maxus', 'maxus'),
('Mercedes-Benz Commercial', 'mercedes-benz-commercial'),
('Mitsubishi Fuso', 'mitsubishi-fuso'),
('Nissan Commercial', 'nissan-commercial'),
('Opel Commercial', 'opel-commercial'),
('Peugeot Professional', 'peugeot-professional'),
('Piaggio Commercial', 'piaggio-commercial'),
('RAM', 'ram'),
('Renault Commercial', 'renault-commercial'),
('Scania', 'scania'),
('SsangYong', 'ssangyong'),
('Tata', 'tata'),
('Toyota Commercial', 'toyota-commercial'),
('Volkswagen Commercial', 'volkswagen-commercial'),
('Volvo Trucks', 'volvo-trucks'),
('Vauxhall', 'vauxhall')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = true,
  updated_at = NOW();

-- ========================================
-- STEP 7: UPSERT MOTOREN BRANDS (25 EXACT)
-- ========================================

INSERT INTO vehicle_brands (name, slug) VALUES
('Aprilia', 'aprilia'),
('Benelli', 'benelli'),
('BMW Motorrad', 'bmw-motorrad'),
('CFMOTO', 'cfmoto'),
('Ducati', 'ducati'),
('GasGas', 'gasgas'),
('Harley-Davidson', 'harley-davidson'),
('Honda Motorcycles', 'honda-motorcycles'),
('Husqvarna', 'husqvarna'),
('Indian', 'indian'),
('Kawasaki', 'kawasaki'),
('KTM', 'ktm'),
('Kymco', 'kymco'),
('Moto Guzzi', 'moto-guzzi'),
('MV Agusta', 'mv-agusta'),
('Peugeot Motocycles', 'peugeot-motocycles'),
('Piaggio Motorcycles', 'piaggio-motorcycles'),
('Royal Enfield', 'royal-enfield'),
('Suzuki Motorcycles', 'suzuki-motorcycles'),
('Sym', 'sym'),
('Triumph', 'triumph'),
('Vespa', 'vespa'),
('Yamaha', 'yamaha'),
('Zero Motorcycles', 'zero-motorcycles'),
('Zontes', 'zontes')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = true,
  updated_at = NOW();

-- ========================================
-- STEP 8: UPSERT CAMPER & MOBILHOMES BRANDS (25 EXACT)
-- ========================================

INSERT INTO vehicle_brands (name, slug) VALUES
('Adria', 'adria'),
('Bailey', 'bailey'),
('Bürstner', 'buerstner'),
('Carado', 'carado'),
('Carthago', 'carthago'),
('Challenger', 'challenger'),
('Dethleffs', 'dethleffs'),
('Elddis', 'elddis'),
('Fendt', 'fendt'),
('Hobby', 'hobby'),
('Hymer', 'hymer'),
('Knaus', 'knaus'),
('Laika', 'laika'),
('Lunar', 'lunar'),
('McLouis', 'mclouis'),
('Pilote', 'pilote'),
('Rapido', 'rapido'),
('Roller Team', 'roller-team'),
('Sunlight', 'sunlight'),
('Swift', 'swift'),
('Tabbert', 'tabbert'),
('Trigano', 'trigano'),
('Weinsberg', 'weinsberg'),
('Westfalia', 'westfalia'),
('XGO', 'xgo')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = true,
  updated_at = NOW();

-- ========================================
-- STEP 9: CREATE CATEGORY-BRAND MAPPINGS
-- ========================================

-- Map Auto & Motor brands
INSERT INTO category_vehicle_brands (category_id, vehicle_brand_id)
SELECT 
  c.id as category_id,
  vb.id as vehicle_brand_id
FROM categories c
CROSS JOIN vehicle_brands vb
WHERE c.slug = 'auto-motor'
  AND vb.slug IN (
    'abarth', 'alfa-romeo', 'audi', 'bmw', 'byd', 'citroen', 'cupra', 'dacia',
    'ds-automobiles', 'fiat', 'ford', 'genesis', 'honda', 'hyundai', 'jaguar',
    'jeep', 'kia', 'land-rover', 'lexus', 'lynk-co', 'mazda', 'mercedes-benz',
    'mg', 'mini', 'mitsubishi', 'nissan', 'opel', 'peugeot', 'polestar', 
    'porsche', 'renault', 'seat', 'skoda', 'smart', 'subaru', 'suzuki', 
    'tesla', 'toyota', 'volkswagen', 'volvo', 'aiways', 'leapmotor', 'nio', 
    'ora', 'xpeng'
  )
ON CONFLICT (category_id, vehicle_brand_id) DO NOTHING;

-- Map Bedrijfswagens brands
INSERT INTO category_vehicle_brands (category_id, vehicle_brand_id)
SELECT 
  c.id as category_id,
  vb.id as vehicle_brand_id
FROM categories c
CROSS JOIN vehicle_brands vb
WHERE c.slug = 'bedrijfswagens'
  AND vb.slug IN (
    'byd-commercial', 'citroen-professional', 'daf', 'fiat-professional',
    'ford-commercial', 'hyundai-commercial', 'isuzu', 'iveco', 'man', 'maxus',
    'mercedes-benz-commercial', 'mitsubishi-fuso', 'nissan-commercial',
    'opel-commercial', 'peugeot-professional', 'piaggio-commercial', 'ram',
    'renault-commercial', 'scania', 'ssangyong', 'tata', 'toyota-commercial',
    'volkswagen-commercial', 'volvo-trucks', 'vauxhall'
  )
ON CONFLICT (category_id, vehicle_brand_id) DO NOTHING;

-- Map Motoren brands
INSERT INTO category_vehicle_brands (category_id, vehicle_brand_id)
SELECT 
  c.id as category_id,
  vb.id as vehicle_brand_id
FROM categories c
CROSS JOIN vehicle_brands vb
WHERE c.slug = 'motoren'
  AND vb.slug IN (
    'aprilia', 'benelli', 'bmw-motorrad', 'cfmoto', 'ducati', 'gasgas',
    'harley-davidson', 'honda-motorcycles', 'husqvarna', 'indian', 'kawasaki',
    'ktm', 'kymco', 'moto-guzzi', 'mv-agusta', 'peugeot-motocycles',
    'piaggio-motorcycles', 'royal-enfield', 'suzuki-motorcycles', 'sym',
    'triumph', 'vespa', 'yamaha', 'zero-motorcycles', 'zontes'
  )
ON CONFLICT (category_id, vehicle_brand_id) DO NOTHING;

-- Map Camper & Mobilhomes brands
INSERT INTO category_vehicle_brands (category_id, vehicle_brand_id)
SELECT 
  c.id as category_id,
  vb.id as vehicle_brand_id
FROM categories c
CROSS JOIN vehicle_brands vb
WHERE c.slug = 'camper-mobilhomes'
  AND vb.slug IN (
    'adria', 'bailey', 'buerstner', 'carado', 'carthago', 'challenger',
    'dethleffs', 'elddis', 'fendt', 'hobby', 'hymer', 'knaus', 'laika',
    'lunar', 'mclouis', 'pilote', 'rapido', 'roller-team', 'sunlight',
    'swift', 'tabbert', 'trigano', 'weinsberg', 'westfalia', 'xgo'
  )
ON CONFLICT (category_id, vehicle_brand_id) DO NOTHING;

COMMIT;
