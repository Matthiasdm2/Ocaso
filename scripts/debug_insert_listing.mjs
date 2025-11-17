#!/usr/bin/env node
// scripts/debug_insert_listing.mjs
// Helper to call the dev debug API and attempt to insert a listing via server-side
// usage: node scripts/debug_insert_listing.mjs http://localhost:3000 <title> <price> <seller_id>

import fetch from 'node-fetch';

const [,, baseUrl, title, price, sellerId] = process.argv;
if (!baseUrl || !title || !price || !sellerId) {
  console.error('Usage: node scripts/debug_insert_listing.mjs http://localhost:3000 <title> <price> <seller_id>');
  process.exit(1);
}

(async () => {
  try {
    const res = await fetch(`${baseUrl}/api/debug/insert-listing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, price, seller_id: sellerId }),
    });
    const data = await res.json();
    console.log('Response:', res.status, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to call debug endpoint:', e);
  }
})();
