#!/usr/bin/env node

// Test script voor productie API debugging
// Gebruik: node test-production-api.js <production-url>

/* eslint-disable @typescript-eslint/no-var-requires */
const https = require('https');
const url = require('url');

const productionUrl = process.argv[2] || 'https://main.dmnowaqinfkhovhyztan.amplifyapp.com';

console.log(`Testing productie API op: ${productionUrl}`);

// Test 1: GET /api/messages (moet 401 geven zonder auth)
testEndpoint(`${productionUrl}/api/messages`, 'GET')
  .then(() => {
    console.log('✅ GET /api/messages test klaar\n');
    return testEndpoint(`${productionUrl}/api/messages`, 'POST', {
      otherUserId: 'test-user-id',
      listingId: 'test-listing-id'
    });
  })
  .then(() => {
    console.log('✅ POST /api/messages test klaar\n');
    console.log('Resultaten:');
    console.log('- Als je 503 fouten ziet, ontbreekt SUPABASE_SERVICE_ROLE_KEY in productie');
    console.log('- Ga naar AWS Amplify Console > App > Environment variables');
    console.log('- Voeg SUPABASE_SERVICE_ROLE_KEY toe met dezelfde waarde als in .env.local');
  })
  .catch(err => {
    console.error('❌ Test fout:', err.message);
  });

function testEndpoint(endpointUrl, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(endpointUrl);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TestScript/1.0'
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }

    console.log(`\n🧪 Testing ${method} ${endpointUrl}`);

    const req = https.request(options, (res) => {
      let data = '';

      console.log(`📡 Status: ${res.statusCode}`);
      console.log(`📡 Headers:`, JSON.stringify(res.headers, null, 2));

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log(`📄 Response:`, JSON.stringify(jsonData, null, 2));

          if (res.statusCode === 503 && jsonData.error === 'service_role_missing') {
            console.log('🚨 GEVONDEN: SUPABASE_SERVICE_ROLE_KEY ontbreekt in productie!');
          }
        } catch (e) {
          console.log(`📄 Raw Response:`, data);
        }

        resolve();
      });
    });

    req.on('error', (err) => {
      console.error(`❌ Request error:`, err.message);
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}
