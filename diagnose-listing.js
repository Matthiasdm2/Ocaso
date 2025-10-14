#!/usr/bin/env node

// Diagnostisch script voor listing seller problemen
// Gebruik: node diagnose-listing.js <listing-id>

/* eslint-disable @typescript-eslint/no-var-requires */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Lees environment variables
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const listingId = process.argv[2];

if (!listingId) {
  console.log('Gebruik: node diagnose-listing.js <listing-id>');
  process.exit(1);
}

async function diagnoseListing() {
  console.log(`🔍 Diagnose voor listing: ${listingId}\n`);

  try {
    // Haal listing op met seller relatie
    const { data: listing, error } = await supabase
      .from("listings")
      .select("*,categories,seller:profiles!listings_seller_id_fkey(id,display_name,full_name,avatar_url,is_business,created_at,address,invoice_address,stripe_account_id,vat)")
      .eq("id", listingId)
      .maybeSingle();

    if (error) {
      console.log('❌ Database error:', error);
      return;
    }

    if (!listing) {
      console.log('❌ Listing niet gevonden');
      return;
    }

    console.log('📋 Listing info:');
    console.log(`- ID: ${listing.id}`);
    console.log(`- Titel: ${listing.title}`);
    console.log(`- seller_id (raw): ${listing.seller_id}`);
    console.log(`- seller object:`, listing.seller ? '✅ aanwezig' : '❌ null/undefined');

    if (listing.seller) {
      console.log(`- seller.id: ${listing.seller.id}`);
      console.log(`- seller.display_name: ${listing.seller.display_name}`);
    }

    // Test de ClientActions logica
    const sellerId = listing.seller?.id || listing.seller_id || null;
    console.log(`\n🎯 ClientActions sellerId zou zijn: ${sellerId || 'null'}`);

    if (!sellerId) {
      console.log('🚨 PROBLEEM: sellerId is null - dit veroorzaakt de "Kan verkoper niet vinden" fout!');
    } else {
      console.log('✅ sellerId gevonden - contact button zou moeten werken');
    }

    // Controleer of de seller bestaat in profiles tabel
    if (listing.seller_id) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('id', listing.seller_id)
        .single();

      if (profileError) {
        console.log('❌ Profile lookup error:', profileError);
      } else if (profile) {
        console.log('✅ Seller profile bestaat:', profile);
      } else {
        console.log('❌ Seller profile niet gevonden in profiles tabel');
      }
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

diagnoseListing();
