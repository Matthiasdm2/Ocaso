-- Create category_filters table for vehicle details on /sell page
-- Migration: idempotent creation with required vehicle filter configurations

-- Create category_filters table if not exists
CREATE TABLE IF NOT EXISTS category_filters (
    id BIGSERIAL PRIMARY KEY,
    category_slug TEXT NOT NULL,
    filter_type TEXT NOT NULL DEFAULT 'vehicle',
    filter_key TEXT NOT NULL,
    filter_label TEXT NOT NULL,
    filter_options JSONB DEFAULT '[]',
    placeholder TEXT,
    input_type TEXT NOT NULL DEFAULT 'select',
    is_range BOOLEAN DEFAULT false,
    min_value NUMERIC,
    max_value NUMERIC,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint if not exists (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'category_filters_unique_idx'
    ) THEN
        CREATE UNIQUE INDEX category_filters_unique_idx 
        ON category_filters(category_slug, filter_key);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE category_filters ENABLE ROW LEVEL SECURITY;

-- Create policies (idempotent - drop and recreate)
DO $$
BEGIN
    DROP POLICY IF EXISTS "category_filters_read_policy" ON category_filters;
    DROP POLICY IF EXISTS "category_filters_write_policy" ON category_filters;
    
    CREATE POLICY "category_filters_read_policy" 
    ON category_filters FOR SELECT 
    USING (is_active = true);
    
    CREATE POLICY "category_filters_write_policy" 
    ON category_filters FOR ALL 
    USING (auth.jwt() ->> 'role' = 'service_role');
END $$;

-- UPSERT vehicle filter configurations for /sell page
-- Required keys: year, mileage_km, body_type, condition, fuel_type, power_hp, transmission

INSERT INTO category_filters (
    category_slug, filter_key, filter_label, filter_options, 
    placeholder, input_type, is_range, sort_order
) VALUES

-- AUTO & MOTOR filters
('auto-motor', 'year', 'Bouwjaar', '[]', 'Bijv. 2018', 'number', false, 10),
('auto-motor', 'mileage_km', 'Kilometerstand', '[]', 'Bijv. 85000', 'number', false, 20),
('auto-motor', 'body_type', 'Carrosserie', '["Sedan", "Hatchback", "SUV", "Stationwagon", "Coupé", "Cabriolet", "MPV", "Pick-up"]', 'Kies carrosserie type', 'select', false, 30),
('auto-motor', 'condition', 'Staat', '["Nieuw", "Zo goed als nieuw", "Gebruikt", "Opknapper"]', 'Kies staat', 'select', false, 40),
('auto-motor', 'fuel_type', 'Brandstof', '["Benzine", "Diesel", "Elektrisch", "Hybride", "LPG", "CNG"]', 'Kies brandstof type', 'select', false, 50),
('auto-motor', 'power_hp', 'Vermogen (pk)', '[]', 'Bijv. 150', 'number', false, 60),
('auto-motor', 'transmission', 'Transmissie', '["Handgeschakeld", "Automaat", "Semi-automaat"]', 'Kies transmissie', 'select', false, 70),

-- BEDRIJFSWAGENS filters
('bedrijfswagens', 'year', 'Bouwjaar', '[]', 'Bijv. 2019', 'number', false, 10),
('bedrijfswagens', 'mileage_km', 'Kilometerstand', '[]', 'Bijv. 120000', 'number', false, 20),
('bedrijfswagens', 'body_type', 'Type bedrijfswagen', '["Bestelwagen", "Vrachtwagen", "Chassis cabine", "Kipper", "Bakwagen", "Koelwagen", "Kraanwagen"]', 'Kies type', 'select', false, 30),
('bedrijfswagens', 'condition', 'Staat', '["Nieuw", "Zo goed als nieuw", "Gebruikt", "Opknapper"]', 'Kies staat', 'select', false, 40),
('bedrijfswagens', 'fuel_type', 'Brandstof', '["Benzine", "Diesel", "Elektrisch", "Hybride", "LPG", "CNG"]', 'Kies brandstof type', 'select', false, 50),
('bedrijfswagens', 'power_hp', 'Vermogen (pk)', '[]', 'Bijv. 180', 'number', false, 60),
('bedrijfswagens', 'transmission', 'Transmissie', '["Handgeschakeld", "Automaat", "Semi-automaat"]', 'Kies transmissie', 'select', false, 70),

-- CAMPER & MOBILHOMES filters
('camper-mobilhomes', 'year', 'Bouwjaar', '[]', 'Bijv. 2017', 'number', false, 10),
('camper-mobilhomes', 'mileage_km', 'Kilometerstand', '[]', 'Bijv. 95000', 'number', false, 20),
('camper-mobilhomes', 'body_type', 'Type camper', '["Integraal", "Halfintegraal", "Alcoof", "Bus camper", "Vouwwagen", "Caravan", "Mobilhome"]', 'Kies camper type', 'select', false, 30),
('camper-mobilhomes', 'condition', 'Staat', '["Nieuw", "Zo goed als nieuw", "Gebruikt", "Opknapper"]', 'Kies staat', 'select', false, 40),
('camper-mobilhomes', 'fuel_type', 'Brandstof', '["Benzine", "Diesel", "Elektrisch", "Hybride", "LPG", "CNG"]', 'Kies brandstof type', 'select', false, 50),
('camper-mobilhomes', 'power_hp', 'Vermogen (pk)', '[]', 'Bijv. 130', 'number', false, 60),
('camper-mobilhomes', 'transmission', 'Transmissie', '["Handgeschakeld", "Automaat", "Semi-automaat"]', 'Kies transmissie', 'select', false, 70)

ON CONFLICT (category_slug, filter_key) 
DO UPDATE SET
    filter_label = EXCLUDED.filter_label,
    filter_options = EXCLUDED.filter_options,
    placeholder = EXCLUDED.placeholder,
    input_type = EXCLUDED.input_type,
    is_range = EXCLUDED.is_range,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS category_filters_category_slug_idx ON category_filters(category_slug);
CREATE INDEX IF NOT EXISTS category_filters_filter_type_idx ON category_filters(filter_type);  
CREATE INDEX IF NOT EXISTS category_filters_sort_order_idx ON category_filters(sort_order);
CREATE INDEX IF NOT EXISTS category_filters_active_idx ON category_filters(is_active) WHERE is_active = true;
