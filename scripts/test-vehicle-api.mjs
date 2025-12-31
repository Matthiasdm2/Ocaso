#!/usr/bin/env node

/**
 * TEST VEHICLE FILTERS API ENDPOINTS
 */

console.log('🧪 Testing Vehicle Filters API Endpoints');
console.log('=========================================');

const testUrls = [
  'http://localhost:3000/api/categories/filters?category=auto-motor',
  'http://localhost:3000/api/categories/filters?category=bedrijfswagens', 
  'http://localhost:3000/api/categories/filters?category=camper-mobilhomes',
  'http://localhost:3000/api/categories/filters?category=motoren'
];

async function testApi() {
  for (const url of testUrls) {
    const category = url.split('category=')[1];
    console.log(`\n🔍 Testing: ${category}`);
    console.log(`URL: ${url}`);
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      console.log(`Status: ${response.status}`);
      
      if (response.ok && data.filters) {
        console.log(`✅ Filters found: ${data.filters.length}`);
        console.log(`   Filter keys: ${data.filters.map(f => f.filter_key).join(', ')}`);
      } else {
        console.log(`❌ Error: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      console.log(`❌ Request failed: ${err.message}`);
    }
  }
}

// Test with a delay to ensure server is ready
setTimeout(testApi, 2000);

console.log('\nWaiting for server to be ready...');
