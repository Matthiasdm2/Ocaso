#!/usr/bin/env node

// Test script voor productie listing pagina
/* eslint-disable @typescript-eslint/no-var-requires */
const https = require('https');
const url = require('url');

const listingUrl = 'https://main.d1yqxvaeuc4uuj.amplifyapp.com/listings/b1163fe5-942e-4107-872b-882c2563a1d0';

console.log(`🌐 Testing productie listing: ${listingUrl}`);

// Test 1: Check of de pagina laadt
testPageLoad(listingUrl)
  .then(() => {
    console.log('✅ Pagina laadt succesvol\n');
    return testContactFunctionality();
  })
  .catch(err => {
    console.error('❌ Test fout:', err.message);
  });

function testPageLoad(pageUrl) {
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(pageUrl);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      method: 'GET',
      headers: {
        'User-Agent': 'TestScript/1.0'
      }
    };

    console.log('📄 Loading pagina...');

    const req = https.request(options, (res) => {
      let data = '';

      console.log(`📡 Status: ${res.statusCode}`);

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          // Check of de pagina de verwachte content heeft
          if (data.includes('Fietsbril')) {
            console.log('✅ Listing titel gevonden');
          } else {
            console.log('⚠️ Listing titel niet gevonden');
          }

          if (data.includes('Contact')) {
            console.log('✅ Contact button gevonden');
          } else {
            console.log('❌ Contact button niet gevonden');
          }

          if (data.includes('Kan verkoper niet vinden')) {
            console.log('🚨 Foutmelding gevonden in HTML');
          }

          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

function testContactFunctionality() {
  console.log('🔧 Om contact functionaliteit te testen:');
  console.log('1. Open de URL in je browser');
  console.log('2. Log in als een andere gebruiker (niet de verkoper)');
  console.log('3. Klik op de "Contact" button');
  console.log('4. Check browser console voor fouten');
  console.log('5. Check network tab voor API calls naar /api/messages');
  console.log('');
  console.log('🚨 Verwachte resultaten:');
  console.log('- Geen "Kan verkoper niet vinden" alert');
  console.log('- POST /api/messages call met status 200');
  console.log('- Redirect naar chat pagina');
}
