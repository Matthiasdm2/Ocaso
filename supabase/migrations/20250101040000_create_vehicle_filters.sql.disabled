-- Create vehicle filters configuration table for marketplace

-- Category filters configuration table
CREATE TABLE category_filters (
    id BIGSERIAL PRIMARY KEY,
    category_slug TEXT NOT NULL REFERENCES categories(slug),
    filter_type TEXT NOT NULL,
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

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_category_filters_updated_at 
    BEFORE UPDATE ON category_filters 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add unique constraint to prevent duplicate filters per category
CREATE UNIQUE INDEX category_filters_unique_idx 
ON category_filters(category_slug, filter_key);

-- Add RLS policies
ALTER TABLE category_filters ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active category filters
CREATE POLICY "category_filters_read_policy" 
ON category_filters FOR SELECT 
USING (is_active = true);

-- Policy: Only admins can insert/update/delete category filters
CREATE POLICY "category_filters_write_policy" 
ON category_filters FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role' OR 
       EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Seed vehicle category filters for the 4 canonical vehicle categories
INSERT INTO category_filters (category_slug, filter_type, filter_key, filter_label, filter_options, placeholder, input_type, is_range, sort_order) VALUES

-- Auto & Motor filters
('auto-motor', 'vehicle', 'bouwjaar', 'Bouwjaar', '[]', 'Kies bouwjaar', 'select', true, 10),
('auto-motor', 'vehicle', 'kilometerstand', 'Kilometerstand', '[]', 'Kies kilometerstand', 'select', true, 20),
('auto-motor', 'vehicle', 'brandstof', 'Brandstof', '["Benzine", "Diesel", "Elektrisch", "Hybride", "LPG", "CNG"]', 'Kies brandstof', 'select', false, 30),
('auto-motor', 'vehicle', 'carrosserie', 'Carrosserie type', '["Sedan", "Hatchback", "SUV", "Stationwagon", "Coupé", "Cabriolet", "MPV", "Pick-up"]', 'Kies carrosserie', 'select', false, 40),
('auto-motor', 'vehicle', 'transmissie', 'Transmissie', '["Handgeschakeld", "Automaat", "Semi-automaat"]', 'Kies transmissie', 'select', false, 50),
('auto-motor', 'vehicle', 'vermogen', 'Vermogen (kW)', '[]', 'Kies vermogen', 'select', true, 60),
('auto-motor', 'vehicle', 'deuren', 'Aantal deuren', '["2", "3", "4", "5"]', 'Kies aantal deuren', 'select', false, 70),

-- Bedrijfswagens filters  
('bedrijfswagens', 'vehicle', 'bouwjaar', 'Bouwjaar', '[]', 'Kies bouwjaar', 'select', true, 10),
('bedrijfswagens', 'vehicle', 'kilometerstand', 'Kilometerstand', '[]', 'Kies kilometerstand', 'select', true, 20),
('bedrijfswagens', 'vehicle', 'brandstof', 'Brandstof', '["Benzine", "Diesel", "Elektrisch", "Hybride", "LPG", "CNG"]', 'Kies brandstof', 'select', false, 30),
('bedrijfswagens', 'vehicle', 'carrosserie', 'Type bedrijfswagen', '["Bestelwagen", "Vrachtwagen", "Chassis cabine", "Kipper", "Bakwagen", "Koelwagen", "Kraanwagen"]', 'Kies type', 'select', false, 40),
('bedrijfswagens', 'vehicle', 'laadvermogen', 'Laadvermogen (kg)', '[]', 'Kies laadvermogen', 'select', true, 50),
('bedrijfswagens', 'vehicle', 'gvw', 'Toegestaan totaalgewicht', '["< 3500 kg", "3500-7500 kg", "7500-12000 kg", "> 12000 kg"]', 'Kies gewichtsklasse', 'select', false, 60),

-- Motoren filters
('motoren', 'vehicle', 'bouwjaar', 'Bouwjaar', '[]', 'Kies bouwjaar', 'select', true, 10),
('motoren', 'vehicle', 'kilometerstand', 'Kilometerstand', '[]', 'Kies kilometerstand', 'select', true, 20),
('motoren', 'vehicle', 'cilinderinhoud', 'Cilinderinhoud (cc)', '[]', 'Kies cilinderinhoud', 'select', true, 30),
('motoren', 'vehicle', 'motortype', 'Type motor', '["Naked bike", "Sportmotor", "Toermotor", "Cruiser", "Enduro", "Cross", "Scooter", "Bromfiets"]', 'Kies type motor', 'select', false, 40),
('motoren', 'vehicle', 'transmissie', 'Transmissie', '["Handgeschakeld", "Automaat", "CVT"]', 'Kies transmissie', 'select', false, 50),
('motoren', 'vehicle', 'vermogen', 'Vermogen (kW)', '[]', 'Kies vermogen', 'select', true, 60),

-- Camper & Mobilhomes filters
('camper-mobilhomes', 'vehicle', 'bouwjaar', 'Bouwjaar', '[]', 'Kies bouwjaar', 'select', true, 10),
('camper-mobilhomes', 'vehicle', 'kilometerstand', 'Kilometerstand', '[]', 'Kies kilometerstand', 'select', true, 20),
('camper-mobilhomes', 'vehicle', 'brandstof', 'Brandstof', '["Benzine", "Diesel", "Elektrisch", "Hybride", "LPG", "CNG"]', 'Kies brandstof', 'select', false, 30),
('camper-mobilhomes', 'vehicle', 'campertype', 'Type camper', '["Integraal", "Halfintegraal", "Alcoof", "Bus camper", "Vouwwagen", "Caravan", "Mobilhome"]', 'Kies camper type', 'select', false, 40),
('camper-mobilhomes', 'vehicle', 'slaapplaatsen', 'Slaapplaatsen', '["1", "2", "3", "4", "5", "6", "7+"]', 'Kies aantal', 'select', false, 50),
('camper-mobilhomes', 'vehicle', 'lengte', 'Lengte (m)', '[]', 'Kies lengte', 'select', true, 60),
('camper-mobilhomes', 'vehicle', 'gvw', 'Toegestaan totaalgewicht', '["< 3500 kg", "3500-7500 kg", "7500-12000 kg", "> 12000 kg"]', 'Kies gewichtsklasse', 'select', false, 70);

-- Create indexes for performance
CREATE INDEX category_filters_category_slug_idx ON category_filters(category_slug);
CREATE INDEX category_filters_filter_type_idx ON category_filters(filter_type);
CREATE INDEX category_filters_sort_order_idx ON category_filters(sort_order);
CREATE INDEX category_filters_active_idx ON category_filters(is_active) WHERE is_active = true;
