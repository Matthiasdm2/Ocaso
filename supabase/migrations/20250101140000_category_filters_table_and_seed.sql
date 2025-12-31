-- Migration: Create category_filters table and seed vehicle filter data
-- Created: 2024-12-31 14:00:00
-- Purpose: Store filter configurations for vehicle categories in /sell page

-- Create category_filters table
CREATE TABLE IF NOT EXISTS public.category_filters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_slug TEXT NOT NULL,
    filter_key TEXT NOT NULL,
    filter_type TEXT NOT NULL DEFAULT 'text',
    label TEXT NOT NULL,
    placeholder TEXT,
    options JSONB DEFAULT NULL,
    validation JSONB DEFAULT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(category_slug, filter_key)
);

-- Enable RLS
ALTER TABLE public.category_filters ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: Public access for all authenticated and anonymous users
CREATE POLICY "category_filters_select_policy" ON public.category_filters
    FOR SELECT USING (true);

-- INSERT/UPDATE/DELETE: Service role only
CREATE POLICY "category_filters_insert_policy" ON public.category_filters
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "category_filters_update_policy" ON public.category_filters
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "category_filters_delete_policy" ON public.category_filters
    FOR DELETE USING (auth.role() = 'service_role');

-- Seed vehicle filter data (idempotent via UPSERT)
-- auto-motor filters
INSERT INTO public.category_filters (category_slug, filter_key, filter_type, label, placeholder, options, validation, display_order)
VALUES 
    ('auto-motor', 'year', 'number', 'Jaar', 'Bouwjaar', '{"min": 1900, "max": 2025}', '{"required": false}', 1),
    ('auto-motor', 'mileage_km', 'number', 'Kilometerstand', 'Aantal kilometers', '{"min": 0, "max": 500000, "step": 1000}', '{"required": false}', 2),
    ('auto-motor', 'body_type', 'select', 'Carrosserie', 'Selecteer carrosserietype', '[
        {"id": "sedan", "value": "sedan", "label": "Sedan"},
        {"id": "hatchback", "value": "hatchback", "label": "Hatchback"},
        {"id": "estate", "value": "estate", "label": "Estate"},
        {"id": "suv", "value": "suv", "label": "SUV"},
        {"id": "coupe", "value": "coupe", "label": "Coupé"},
        {"id": "convertible", "value": "convertible", "label": "Cabriolet"},
        {"id": "mpv", "value": "mpv", "label": "MPV"}
    ]', '{"required": false}', 3),
    ('auto-motor', 'condition', 'select', 'Staat', 'Selecteer staat', '[
        {"id": "nieuw", "value": "nieuw", "label": "Nieuw"},
        {"id": "gebruikt_uitstekend", "value": "gebruikt_uitstekend", "label": "Gebruikt - Uitstekend"},
        {"id": "gebruikt_goed", "value": "gebruikt_goed", "label": "Gebruikt - Goed"},
        {"id": "gebruikt_redelijk", "value": "gebruikt_redelijk", "label": "Gebruikt - Redelijk"},
        {"id": "voor_onderdelen", "value": "voor_onderdelen", "label": "Voor onderdelen"}
    ]', '{"required": false}', 4),
    ('auto-motor', 'fuel_type', 'select', 'Brandstof', 'Selecteer brandstoftype', '[
        {"id": "benzine", "value": "benzine", "label": "Benzine"},
        {"id": "diesel", "value": "diesel", "label": "Diesel"},
        {"id": "elektrisch", "value": "elektrisch", "label": "Elektrisch"},
        {"id": "hybrid", "value": "hybrid", "label": "Hybride"},
        {"id": "lpg", "value": "lpg", "label": "LPG"},
        {"id": "cng", "value": "cng", "label": "CNG"}
    ]', '{"required": false}', 5),
    ('auto-motor', 'power_hp', 'number', 'Vermogen (PK)', 'Vermogen in paardenkrachten', '{"min": 1, "max": 2000}', '{"required": false}', 6),
    ('auto-motor', 'transmission', 'select', 'Transmissie', 'Selecteer transmissietype', '[
        {"id": "handmatig", "value": "handmatig", "label": "Handmatig"},
        {"id": "automatisch", "value": "automatisch", "label": "Automatisch"},
        {"id": "semi_automatisch", "value": "semi_automatisch", "label": "Semi-automatisch"}
    ]', '{"required": false}', 7)
ON CONFLICT (category_slug, filter_key) 
DO UPDATE SET
    filter_type = EXCLUDED.filter_type,
    label = EXCLUDED.label,
    placeholder = EXCLUDED.placeholder,
    options = EXCLUDED.options,
    validation = EXCLUDED.validation,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

-- bedrijfswagens filters
INSERT INTO public.category_filters (category_slug, filter_key, filter_type, label, placeholder, options, validation, display_order)
VALUES 
    ('bedrijfswagens', 'year', 'number', 'Jaar', 'Bouwjaar', '{"min": 1900, "max": 2025}', '{"required": false}', 1),
    ('bedrijfswagens', 'mileage_km', 'number', 'Kilometerstand', 'Aantal kilometers', '{"min": 0, "max": 1000000, "step": 1000}', '{"required": false}', 2),
    ('bedrijfswagens', 'body_type', 'select', 'Carrosserie', 'Selecteer carrosserietype', '[
        {"id": "bestelwagen", "value": "bestelwagen", "label": "Bestelwagen"},
        {"id": "vrachtwagen", "value": "vrachtwagen", "label": "Vrachtwagen"},
        {"id": "chassis_cabine", "value": "chassis_cabine", "label": "Chassis cabine"},
        {"id": "pickup", "value": "pickup", "label": "Pickup"},
        {"id": "bus", "value": "bus", "label": "Bus"},
        {"id": "trailer", "value": "trailer", "label": "Trailer"}
    ]', '{"required": false}', 3),
    ('bedrijfswagens', 'condition', 'select', 'Staat', 'Selecteer staat', '[
        {"id": "nieuw", "value": "nieuw", "label": "Nieuw"},
        {"id": "gebruikt_uitstekend", "value": "gebruikt_uitstekend", "label": "Gebruikt - Uitstekend"},
        {"id": "gebruikt_goed", "value": "gebruikt_goed", "label": "Gebruikt - Goed"},
        {"id": "gebruikt_redelijk", "value": "gebruikt_redelijk", "label": "Gebruikt - Redelijk"},
        {"id": "voor_onderdelen", "value": "voor_onderdelen", "label": "Voor onderdelen"}
    ]', '{"required": false}', 4),
    ('bedrijfswagens', 'fuel_type', 'select', 'Brandstof', 'Selecteer brandstoftype', '[
        {"id": "benzine", "value": "benzine", "label": "Benzine"},
        {"id": "diesel", "value": "diesel", "label": "Diesel"},
        {"id": "elektrisch", "value": "elektrisch", "label": "Elektrisch"},
        {"id": "hybrid", "value": "hybrid", "label": "Hybride"},
        {"id": "lpg", "value": "lpg", "label": "LPG"},
        {"id": "cng", "value": "cng", "label": "CNG"}
    ]', '{"required": false}', 5),
    ('bedrijfswagens', 'power_hp', 'number', 'Vermogen (PK)', 'Vermogen in paardenkrachten', '{"min": 1, "max": 1000}', '{"required": false}', 6),
    ('bedrijfswagens', 'transmission', 'select', 'Transmissie', 'Selecteer transmissietype', '[
        {"id": "handmatig", "value": "handmatig", "label": "Handmatig"},
        {"id": "automatisch", "value": "automatisch", "label": "Automatisch"},
        {"id": "semi_automatisch", "value": "semi_automatisch", "label": "Semi-automatisch"}
    ]', '{"required": false}', 7)
ON CONFLICT (category_slug, filter_key) 
DO UPDATE SET
    filter_type = EXCLUDED.filter_type,
    label = EXCLUDED.label,
    placeholder = EXCLUDED.placeholder,
    options = EXCLUDED.options,
    validation = EXCLUDED.validation,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

-- camper-mobilhomes filters
INSERT INTO public.category_filters (category_slug, filter_key, filter_type, label, placeholder, options, validation, display_order)
VALUES 
    ('camper-mobilhomes', 'year', 'number', 'Jaar', 'Bouwjaar', '{"min": 1900, "max": 2025}', '{"required": false}', 1),
    ('camper-mobilhomes', 'mileage_km', 'number', 'Kilometerstand', 'Aantal kilometers', '{"min": 0, "max": 500000, "step": 1000}', '{"required": false}', 2),
    ('camper-mobilhomes', 'body_type', 'select', 'Type', 'Selecteer campertype', '[
        {"id": "campervan", "value": "campervan", "label": "Campervan"},
        {"id": "motorhome", "value": "motorhome", "label": "Motorhome"},
        {"id": "caravan", "value": "caravan", "label": "Caravan"},
        {"id": "vouwwagen", "value": "vouwwagen", "label": "Vouwwagen"},
        {"id": "mobilhome", "value": "mobilhome", "label": "Mobilhome"}
    ]', '{"required": false}', 3),
    ('camper-mobilhomes', 'condition', 'select', 'Staat', 'Selecteer staat', '[
        {"id": "nieuw", "value": "nieuw", "label": "Nieuw"},
        {"id": "gebruikt_uitstekend", "value": "gebruikt_uitstekend", "label": "Gebruikt - Uitstekend"},
        {"id": "gebruikt_goed", "value": "gebruikt_goed", "label": "Gebruikt - Goed"},
        {"id": "gebruikt_redelijk", "value": "gebruikt_redelijk", "label": "Gebruikt - Redelijk"},
        {"id": "voor_onderdelen", "value": "voor_onderdelen", "label": "Voor onderdelen"}
    ]', '{"required": false}', 4),
    ('camper-mobilhomes', 'fuel_type', 'select', 'Brandstof', 'Selecteer brandstoftype', '[
        {"id": "benzine", "value": "benzine", "label": "Benzine"},
        {"id": "diesel", "value": "diesel", "label": "Diesel"},
        {"id": "elektrisch", "value": "elektrisch", "label": "Elektrisch"},
        {"id": "hybrid", "value": "hybrid", "label": "Hybride"},
        {"id": "lpg", "value": "lpg", "label": "LPG"}
    ]', '{"required": false}', 5),
    ('camper-mobilhomes', 'power_hp', 'number', 'Vermogen (PK)', 'Vermogen in paardenkrachten', '{"min": 1, "max": 500}', '{"required": false}', 6),
    ('camper-mobilhomes', 'transmission', 'select', 'Transmissie', 'Selecteer transmissietype', '[
        {"id": "handmatig", "value": "handmatig", "label": "Handmatig"},
        {"id": "automatisch", "value": "automatisch", "label": "Automatisch"},
        {"id": "semi_automatisch", "value": "semi_automatisch", "label": "Semi-automatisch"}
    ]', '{"required": false}', 7)
ON CONFLICT (category_slug, filter_key) 
DO UPDATE SET
    filter_type = EXCLUDED.filter_type,
    label = EXCLUDED.label,
    placeholder = EXCLUDED.placeholder,
    options = EXCLUDED.options,
    validation = EXCLUDED.validation,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_category_filters_category_slug ON public.category_filters(category_slug);
CREATE INDEX IF NOT EXISTS idx_category_filters_display_order ON public.category_filters(category_slug, display_order);
