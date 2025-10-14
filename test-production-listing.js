#!/usr/bin/env node

// Test script om productie listing pagina te controleren
// Gebruikt Puppeteer om de pagina te laden en JavaScript uit te voeren

/* eslint-disable @typescript-eslint/no-var-requires */
const puppeteer = require('puppeteer');

const listingId = process.argv[2] || '6ac12081-161b-40ce-ad32-30e33761c610';
const productionUrl = process.argv[3] || 'https://main.d123456789.amplifyapp.com'; // Placeholder - moet worden vervangen

async function testProductionListing() {
  console.log(`🌐 Testing productie listing page: ${productionUrl}/listings/${listingId}`);

  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Luister naar console messages en network errors
    page.on('console', msg => {
      if (msg.text().includes('Kan verkoper niet vinden') ||
          msg.text().includes('API fout') ||
          msg.text().includes('contact')) {
        console.log('📝 Console:', msg.text());
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/messages') && response.status() === 503) {
        console.log('🚨 503 Error op:', response.url());
      }
    });

    // Ga naar de listing pagina
    await page.goto(`${productionUrl}/listings/${listingId}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wacht even voor JavaScript
    await page.waitForTimeout(2000);

    // Controleer of de contact button bestaat
    const contactButtonExists = await page.$('button:has-text("Contact")') !== null;
    console.log(`📱 Contact button aanwezig: ${contactButtonExists ? '✅' : '❌'}`);

    if (contactButtonExists) {
      // Klik op de contact button en kijk wat er gebeurt
      console.log('🖱️ Klik op contact button...');

      const [response] = await Promise.all([
        page.waitForResponse(res => res.url().includes('/api/messages'), { timeout: 5000 }).catch(() => null),
        page.click('button:has-text("Contact")').catch(() => null)
      ]);

      if (response) {
        console.log(`📡 API Response status: ${response.status()}`);
        if (response.status() === 503) {
          console.log('🚨 503 SERVICE UNAVAILABLE - SUPABASE_SERVICE_ROLE_KEY ontbreekt!');
        }
      } else {
        console.log('⚠️ Geen API call gedetecteerd');
      }
    }

    // Controleer page content voor foutmeldingen
    const pageContent = await page.content();
    if (pageContent.includes('Kan verkoper niet vinden')) {
      console.log('🚨 Foutmelding gevonden: "Kan verkoper niet vinden voor dit zoekertje"');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Controleer of puppeteer geïnstalleerd is
try {
  require('puppeteer');
  testProductionListing();
} catch (e) {
  console.log('📦 Puppeteer niet geïnstalleerd. Installeer met: npm install puppeteer');
  console.log('💡 Alternatief: Test handmatig in browser developer tools');
}
