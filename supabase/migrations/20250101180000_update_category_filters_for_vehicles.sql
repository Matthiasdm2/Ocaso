-- Migration: Update existing category_filters table for vehicle details
-- Created: 2024-01-01 18:00:00
-- Purpose: Modify existing table structure and add vehicle filter data

-- Check if label column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'category_filters' 
                   AND column_name = 'label') THEN
        ALTER TABLE public.category_filters ADD COLUMN label TEXT;
    END IF;
END $$;

-- Check if placeholder column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'category_filters' 
                   AND column_name = 'placeholder') THEN
        ALTER TABLE public.category_filters ADD COLUMN placeholder TEXT;
    END IF;
END $$;

-- Check if options column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'category_filters' 
                   AND column_name = 'options') THEN
        ALTER TABLE public.category_filters ADD COLUMN options JSONB DEFAULT NULL;
    END IF;
END $$;

-- Check if validation column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'category_filters' 
                   AND column_name = 'validation') THEN
        ALTER TABLE public.category_filters ADD COLUMN validation JSONB DEFAULT NULL;
    END IF;
END $$;

-- Check if display_order column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'category_filters' 
                   AND column_name = 'display_order') THEN
        ALTER TABLE public.category_filters ADD COLUMN display_order INTEGER DEFAULT 0;
    END IF;
END $$;

-- Update existing records to populate the new columns based on existing data
UPDATE public.category_filters SET 
    label = COALESCE(filter_label, 'Filter'),
    placeholder = 'Selecteer optie',
    display_order = COALESCE(sort_order, 0)
WHERE label IS NULL;

-- Clear existing vehicle filter data to avoid conflicts
DELETE FROM public.category_filters WHERE category_slug IN ('auto-motor', 'bedrijfswagens', 'camper-mobilhomes');

-- Seed vehicle filter data (fresh insert with all required fields)
-- auto-motor filters
INSERT INTO public.category_filters (category_slug, filter_key, filter_type, filter_label, label, placeholder, options, validation, display_order)
VALUES 
    ('auto-motor', 'year', 'number', 'Jaar', 'Jaar', 'Bouwjaar', '{"min": 1900, "max": 2025}', '{"required": false}', 1),
    ('auto-motor', 'mileage_km', 'number', 'Kilometerstand', 'Kilometerstand', 'Aantal kilometers', '{"min": 0, "max": 500000, "step": 1000}', '{"required": false}', 2),
    ('auto-motor', 'body_type', 'select', 'Carrosserie', 'Carrosserie', 'Selecteer carrosserietype', '[
        {"id": "sedan", "value": "sedan", "label": "Sedan"},
        {"id": "hatchback", "value": "hatchback", "label": "Hatchback"},
        {"id": "estate", "value": "estate", "label": "Estate"},
        {"id": "suv", "value": "suv", "label": "SUV"},
        {"id": "coupe", "value": "coupe", "label": "Coupé"},
        {"id": "convertible", "value": "convertible", "label": "Cabriolet"},
        {"id": "mpv", "value": "mpv", "label": "MPV"}
    ]', '{"required": false}', 3),
    ('auto-motor', 'condition', 'select', 'Staat', 'Staat', 'Selecteer staat', '[
        {"id": "nieuw", "value": "nieuw", "label": "Nieuw"},
        {"id": "gebruikt_uitstekend", "value": "gebruikt_uitstekend", "label": "Gebruikt - Uitstekend"},
        {"id": "gebruikt_goed", "value": "gebruikt_goed", "label": "Gebruikt - Goed"},
        {"id": "gebruikt_redelijk", "value": "gebruikt_redelijk", "label": "Gebruikt - Redelijk"},
        {"id": "voor_onderdelen", "value": "voor_onderdelen", "label": "Voor onderdelen"}
    ]', '{"required": false}', 4),
    ('auto-motor', 'fuel_type', 'select', 'Brandstof', 'Brandstof', 'Selecteer brandstoftype', '[
        {"id": "benzine", "value": "benzine", "label": "Benzine"},
        {"id": "diesel", "value": "diesel", "label": "Diesel"},
        {"id": "elektrisch", "value": "elektrisch", "label": "Elektrisch"},
        {"id": "hybrid", "value": "hybrid", "label": "Hybride"},
        {"id": "lpg", "value": "lpg", "label": "LPG"},
        {"id": "cng", "value": "cng", "label": "CNG"}
    ]', '{"required": false}', 5),
    ('auto-motor', 'power_hp', 'number', 'Vermogen (PK)', 'Vermogen (PK)', 'Vermogen in paardenkrachten', '{"min": 1, "max": 2000}', '{"required": false}', 6),
    ('auto-motor', 'transmission', 'select', 'Transmissie', 'Transmissie', 'Selecteer transmissietype', '[
        {"id": "handmatig", "value": "handmatig", "label": "Handmatig"},
        {"id": "automatisch", "value": "automatisch", "label": "Automatisch"},
        {"id": "semi_automatisch", "value": "semi_automatisch", "label": "Semi-automatisch"}
    ]', '{"required": false}', 7);

-- bedrijfswagens filters
INSERT INTO public.category_filters (category_slug, filter_key, filter_type, filter_label, label, placeholder, options, validation, display_order)
VALUES 
    ('bedrijfswagens', 'year', 'number', 'Jaar', 'Jaar', 'Bouwjaar', '{"min": 1900, "max": 2025}', '{"required": false}', 1),
    ('bedrijfswagens', 'mileage_km', 'number', 'Kilometerstand', 'Kilometerstand', 'Aantal kilometers', '{"min": 0, "max": 1000000, "step": 1000}', '{"required": false}', 2),
    ('bedrijfswagens', 'body_type', 'select', 'Carrosserie', 'Carrosserie', 'Selecteer carrosserietype', '[
        {"id": "bestelwagen", "value": "bestelwagen", "label": "Bestelwagen"},
        {"id": "vrachtwagen", "value": "vrachtwagen", "label": "Vrachtwagen"},
        {"id": "chassis_cabine", "value": "chassis_cabine", "label": "Chassis cabine"},
        {"id": "pickup", "value": "pickup", "label": "Pickup"},
        {"id": "bus", "value": "bus", "label": "Bus"},
        {"id": "trailer", "value": "trailer", "label": "Trailer"}
    ]', '{"required": false}', 3),
    ('bedrijfswagens', 'condition', 'select', 'Staat', 'Staat', 'Selecteer staat', '[
        {"id": "nieuw", "value": "nieuw", "label": "Nieuw"},
        {"id": "gebruikt_uitstekend", "value": "gebruikt_uitstekend", "label": "Gebruikt - Uitstekend"},
        {"id": "gebruikt_goed", "value": "gebruikt_goed", "label": "Gebruikt - Goed"},
        {"id": "gebruikt_redelijk", "value": "gebruikt_redelijk", "label": "Gebruikt - Redelijk"},
        {"id": "voor_onderdelen", "value": "voor_onderdelen", "label": "Voor onderdelen"}
    ]', '{"required": false}', 4),
    ('bedrijfswagens', 'fuel_type', 'select', 'Brandstof', 'Brandstof', 'Selecteer brandstoftype', '[
        {"id": "benzine", "value": "benzine", "label": "Benzine"},
        {"id": "diesel", "value": "diesel", "label": "Diesel"},
        {"id": "elektrisch", "value": "elektrisch", "label": "Elektrisch"},
        {"id": "hybrid", "value": "hybrid", "label": "Hybride"},
        {"id": "lpg", "value": "lpg", "label": "LPG"},
        {"id": "cng", "value": "cng", "label": "CNG"}
    ]', '{"required": false}', 5),
    ('bedrijfswagens', 'power_hp', 'number', 'Vermogen (PK)', 'Vermogen (PK)', 'Vermogen in paardenkrachten', '{"min": 1, "max": 1000}', '{"required": false}', 6),
    ('bedrijfswagens', 'transmission', 'select', 'Transmissie', 'Transmissie', 'Selecteer transmissietype', '[
        {"id": "handmatig", "value": "handmatig", "label": "Handmatig"},
        {"id": "automatisch", "value": "automatisch", "label": "Automatisch"},
        {"id": "semi_automatisch", "value": "semi_automatisch", "label": "Semi-automatisch"}
    ]', '{"required": false}', 7);

-- camper-mobilhomes filters
INSERT INTO public.category_filters (category_slug, filter_key, filter_type, filter_label, label, placeholder, options, validation, display_order)
VALUES 
    ('camper-mobilhomes', 'year', 'number', 'Jaar', 'Jaar', 'Bouwjaar', '{"min": 1900, "max": 2025}', '{"required": false}', 1),
    ('camper-mobilhomes', 'mileage_km', 'number', 'Kilometerstand', 'Kilometerstand', 'Aantal kilometers', '{"min": 0, "max": 500000, "step": 1000}', '{"required": false}', 2),
    ('camper-mobilhomes', 'body_type', 'select', 'Type', 'Type', 'Selecteer campertype', '[
        {"id": "campervan", "value": "campervan", "label": "Campervan"},
        {"id": "motorhome", "value": "motorhome", "label": "Motorhome"},
        {"id": "caravan", "value": "caravan", "label": "Caravan"},
        {"id": "vouwwagen", "value": "vouwwagen", "label": "Vouwwagen"},
        {"id": "mobilhome", "value": "mobilhome", "label": "Mobilhome"}
    ]', '{"required": false}', 3),
    ('camper-mobilhomes', 'condition', 'select', 'Staat', 'Staat', 'Selecteer staat', '[
        {"id": "nieuw", "value": "nieuw", "label": "Nieuw"},
        {"id": "gebruikt_uitstekend", "value": "gebruikt_uitstekend", "label": "Gebruikt - Uitstekend"},
        {"id": "gebruikt_goed", "value": "gebruikt_goed", "label": "Gebruikt - Goed"},
        {"id": "gebruikt_redelijk", "value": "gebruikt_redelijk", "label": "Gebruikt - Redelijk"},
        {"id": "voor_onderdelen", "value": "voor_onderdelen", "label": "Voor onderdelen"}
    ]', '{"required": false}', 4),
    ('camper-mobilhomes', 'fuel_type', 'select', 'Brandstof', 'Brandstof', 'Selecteer brandstoftype', '[
        {"id": "benzine", "value": "benzine", "label": "Benzine"},
        {"id": "diesel", "value": "diesel", "label": "Diesel"},
        {"id": "elektrisch", "value": "elektrisch", "label": "Elektrisch"},
        {"id": "hybrid", "value": "hybrid", "label": "Hybride"},
        {"id": "lpg", "value": "lpg", "label": "LPG"}
    ]', '{"required": false}', 5),
    ('camper-mobilhomes', 'power_hp', 'number', 'Vermogen (PK)', 'Vermogen (PK)', 'Vermogen in paardenkrachten', '{"min": 1, "max": 500}', '{"required": false}', 6),
    ('camper-mobilhomes', 'transmission', 'select', 'Transmissie', 'Transmissie', 'Selecteer transmissietype', '[
        {"id": "handmatig", "value": "handmatig", "label": "Handmatig"},
        {"id": "automatisch", "value": "automatisch", "label": "Automatisch"},
        {"id": "semi_automatisch", "value": "semi_automatisch", "label": "Semi-automatisch"}
    ]', '{"required": false}', 7);

-- Create index for performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_category_filters_category_slug ON public.category_filters(category_slug);
CREATE INDEX IF NOT EXISTS idx_category_filters_display_order ON public.category_filters(category_slug, display_order);
