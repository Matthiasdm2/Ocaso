#!/usr/bin/env node

/**
 * FASE C - EMERGENCY HOTFIX VIA MOCK DATA
 * Create mock vehicle filters in API response until table is ready
 */

import { readFile, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚨 EMERGENCY HOTFIX - MOCK VEHICLE FILTERS');
console.log('==========================================');

// Step 1: Update API endpoint to return mock data
console.log('Step 1: Patching API endpoint with fallback mock data...');

const apiPath = resolve(__dirname, '../app/api/categories/filters/route.ts');
const apiContent = await readFile(apiPath, 'utf-8');

// Add fallback mock data
const mockDataSection = `
// EMERGENCY HOTFIX: Mock data fallback when table doesn't exist
const MOCK_VEHICLE_FILTERS = {
  'auto-motor': [
    { id: 1, filter_key: 'bouwjaar', filter_label: 'Bouwjaar', filter_options: [], placeholder: 'Kies bouwjaar', input_type: 'select', is_range: true, sort_order: 10 },
    { id: 2, filter_key: 'kilometerstand', filter_label: 'Kilometerstand', filter_options: [], placeholder: 'Kies kilometerstand', input_type: 'select', is_range: true, sort_order: 20 },
    { id: 3, filter_key: 'brandstof', filter_label: 'Brandstof', filter_options: ["Benzine", "Diesel", "Elektrisch", "Hybride", "LPG", "CNG"], placeholder: 'Kies brandstof', input_type: 'select', is_range: false, sort_order: 30 },
    { id: 4, filter_key: 'carrosserie', filter_label: 'Carrosserie type', filter_options: ["Sedan", "Hatchback", "SUV", "Stationwagon", "Coupé", "Cabriolet"], placeholder: 'Kies carrosserie', input_type: 'select', is_range: false, sort_order: 40 }
  ],
  'bedrijfswagens': [
    { id: 5, filter_key: 'bouwjaar', filter_label: 'Bouwjaar', filter_options: [], placeholder: 'Kies bouwjaar', input_type: 'select', is_range: true, sort_order: 10 },
    { id: 6, filter_key: 'kilometerstand', filter_label: 'Kilometerstand', filter_options: [], placeholder: 'Kies kilometerstand', input_type: 'select', is_range: true, sort_order: 20 },
    { id: 7, filter_key: 'brandstof', filter_label: 'Brandstof', filter_options: ["Benzine", "Diesel", "Elektrisch", "Hybride", "LPG", "CNG"], placeholder: 'Kies brandstof', input_type: 'select', is_range: false, sort_order: 30 },
    { id: 8, filter_key: 'carrosserie', filter_label: 'Type bedrijfswagen', filter_options: ["Bestelwagen", "Vrachtwagen", "Chassis cabine", "Kipper", "Bakwagen"], placeholder: 'Kies type', input_type: 'select', is_range: false, sort_order: 40 }
  ],
  'camper-mobilhomes': [
    { id: 9, filter_key: 'bouwjaar', filter_label: 'Bouwjaar', filter_options: [], placeholder: 'Kies bouwjaar', input_type: 'select', is_range: true, sort_order: 10 },
    { id: 10, filter_key: 'kilometerstand', filter_label: 'Kilometerstand', filter_options: [], placeholder: 'Kies kilometerstand', input_type: 'select', is_range: true, sort_order: 20 },
    { id: 11, filter_key: 'brandstof', filter_label: 'Brandstof', filter_options: ["Benzine", "Diesel", "Elektrisch", "Hybride", "LPG", "CNG"], placeholder: 'Kies brandstof', input_type: 'select', is_range: false, sort_order: 30 },
    { id: 12, filter_key: 'campertype', filter_label: 'Type camper', filter_options: ["Integraal", "Halfintegraal", "Alcoof", "Bus camper", "Vouwwagen", "Caravan"], placeholder: 'Kies camper type', input_type: 'select', is_range: false, sort_order: 40 }
  ]
};
`;

// Check if API needs patching
if (!apiContent.includes('MOCK_VEHICLE_FILTERS')) {
  console.log('📝 Applying emergency patch to API endpoint...');
  
  // Insert mock data before the existing function
  const newApiContent = apiContent.replace(
    'export async function GET(request: Request) {',
    mockDataSection + '\nexport async function GET(request: Request) {'
  );
  
  // Update the error handling to use mock data
  const patchedContent = newApiContent.replace(
    `if (error) {
      console.error('Error fetching category filters:', error);
      return NextResponse.json(
        { error: 'Failed to fetch category filters' },
        { status: 500 }
      );
    }`,
    `if (error) {
      console.error('Error fetching category filters (using fallback):', error);
      
      // EMERGENCY FALLBACK: Use mock data if table doesn't exist
      const mockFilters = MOCK_VEHICLE_FILTERS[categorySlug];
      if (mockFilters) {
        console.log('🚨 Using mock vehicle filters for:', categorySlug);
        return NextResponse.json({
          category: categorySlug,
          filters: mockFilters
        });
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch category filters' },
        { status: 500 }
      );
    }`
  );
  
  await writeFile(apiPath, patchedContent, 'utf-8');
  console.log('✅ Emergency patch applied to API endpoint');
  
} else {
  console.log('ℹ️ API endpoint already patched');
}

console.log('==========================================');
console.log('🎯 HOTFIX APPLIED!');
console.log('API will now return mock data for vehicle categories');
console.log('Test URLs:');
console.log('  http://localhost:3000/api/categories/filters?category=auto-motor');
console.log('  http://localhost:3000/api/categories/filters?category=bedrijfswagens'); 
console.log('  http://localhost:3000/api/categories/filters?category=camper-mobilhomes');
console.log('');
console.log('Note: This is a temporary fix. Please create the category_filters');
console.log('table in Supabase when possible to replace mock data.');

process.exit(0);
