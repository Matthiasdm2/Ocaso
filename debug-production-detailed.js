#!/usr/bin/env node

// Gedetailleerde productie debug script
/* eslint-disable @typescript-eslint/no-var-requires */
const https = require('https');
const url = require('url');

const productionUrl = 'https://main.d1yqxvaeuc4uuj.amplifyapp.com';
const listingId = 'b1163fe5-942e-4107-872b-882c2563a1d0';

console.log(`🔍 Gedetailleerde productie debug voor: ${productionUrl}/listings/${listingId}\n`);

// Test 1: Check of listing pagina server-side data heeft
testServerSideData()
  .then(() => {
    console.log('✅ Server-side data test klaar\n');
    return testApiWithAuth();
  })
  .then(() => {
    console.log('✅ API test klaar\n');
    console.log('📋 Diagnose resultaten:');
    console.log('Als je nog steeds "Kan verkoper niet vinden" ziet, dan:');
    console.log('1. Check of je bent ingelogd als andere gebruiker');
    console.log('2. Check browser console voor JavaScript errors');
    console.log('3. Check Network tab voor failed API calls');
  })
  .catch(err => {
    console.error('❌ Test fout:', err.message);
  });

function testServerSideData() {
  return new Promise((resolve, reject) => {
    const pageUrl = `${productionUrl}/listings/${listingId}`;
    const parsedUrl = url.parse(pageUrl);

    console.log('🔍 Checking server-side rendered data...');

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      method: 'GET',
      headers: {
        'User-Agent': 'TestScript/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        // Check voor seller data in HTML
        if (data.includes('sellerId')) {
          console.log('✅ sellerId gevonden in server-side HTML');
        } else {
          console.log('⚠️ sellerId niet gevonden in server-side HTML');
        }

        if (data.includes('4f3fa562-5f9c-43d5-acdd-fdbe500e06c4')) {
          console.log('✅ Correcte seller UUID gevonden');
        } else {
          console.log('❌ Correcte seller UUID niet gevonden');
        }

        if (data.includes('Matthias De Mey')) {
          console.log('✅ Seller naam gevonden');
        } else {
          console.log('⚠️ Seller naam niet gevonden');
        }

        resolve();
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function testApiWithAuth() {
  return new Promise((resolve) => {
    console.log('🔐 Testing API authentication...');
    console.log('Voor volledige test moet je browser gebruiken met login');

    // Simuleer een POST request zonder auth (moet 401 geven)
    const apiUrl = `${productionUrl}/api/messages`;
    const parsedUrl = url.parse(apiUrl);

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TestScript/1.0'
      }
    };

    const req = https.request(options, (res) => {
      console.log(`📡 POST /api/messages zonder auth: ${res.statusCode}`);

      if (res.statusCode === 401) {
        console.log('✅ API geeft correct 401 zonder authenticatie');
      } else if (res.statusCode === 503) {
        console.log('🚨 API geeft nog steeds 503 - service role probleem!');
      } else {
        console.log(`⚠️ Onverwachte status: ${res.statusCode}`);
      }

      resolve();
    });

    req.on('error', () => {
      console.log('❌ API call failed');
      resolve();
    });

    req.write(JSON.stringify({
      otherUserId: 'test-user-id',
      listingId: listingId
    }));

    req.end();
  });
}
