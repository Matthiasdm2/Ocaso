#!/usr/bin/env node

/**
 * Navigation Test Script
 * Test alle routes en redirects in de OCASO applicatie
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// Alle routes die getest moeten worden
const ROUTES = [
  // Hoofdpagina's
  { path: '/', expectedRedirect: '/explore', name: 'Homepage' },
  { path: '/explore', name: 'Ontdekken' },
  { path: '/marketplace', name: 'Marktplaats' },
  { path: '/business', name: 'Ocaso Shops' },
  { path: '/categories', name: 'Categorieën' },
  { path: '/search', name: 'Zoeken' },
  { path: '/sell', name: 'Plaats zoekertje' },
  
  // Authenticatie
  { path: '/login', name: 'Inloggen' },
  { path: '/register', name: 'Registreren' },
  { path: '/auth/login', expectedRedirect: '/login', name: 'Auth Login (redirect)' },
  { path: '/auth/register', name: 'Auth Register' },
  
  // Profiel routes
  { path: '/profile', expectedRedirect: '/profile/info', name: 'Profiel (redirect)' },
  { path: '/profile/info', name: 'Mijn gegevens' },
  { path: '/profile/business', name: 'Ocaso Shop' },
  { path: '/profile/chats', name: 'Chats' },
  { path: '/profile/listings', name: 'Mijn zoekertjes' },
  { path: '/profile/favorites', name: 'Mijn favorieten' },
  { path: '/profile/reviews', name: 'Mijn reviews' },
  { path: '/profile/more', name: 'Meer' },
  
  // Support pagina's
  { path: '/about', name: 'Over OCASO' },
  { path: '/help', name: 'Help & FAQ' },
  { path: '/safety', name: 'Veilig handelen' },
  { path: '/contact', name: 'Contact' },
  { path: '/terms', name: 'Voorwaarden' },
  { path: '/privacy', name: 'Privacy' },
  { path: '/cookies', name: 'Cookies' },
  { path: '/support', name: 'Support' },
  
  // Andere pagina's
  { path: '/messages', expectedRedirect: '/profile', name: 'Messages (redirect)' },
  { path: '/recent', name: 'Recent' },
  { path: '/sponsored', name: 'Sponsored' },
  { path: '/admin', name: 'Admin (beveiligd)' },
  
  // Checkout (kan 404 zijn zonder sessie)
  { path: '/checkout', name: 'Checkout' },
];

const ISSUES = [];
const SUCCESS = [];
const WARNINGS = [];

async function testRoute(route) {
  const url = `${BASE_URL}${route.path}`;
  
  try {
    // Eerst proberen met manual redirect om server-side redirects te zien
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'User-Agent': 'OCASO-Navigation-Test/1.0',
      },
    });

    const status = response.status;
    const location = response.headers.get('location');
    
    // Check redirect
    if (route.expectedRedirect) {
      if (status >= 300 && status < 400 && location) {
        const redirectPath = new URL(location, BASE_URL).pathname;
        if (redirectPath === route.expectedRedirect) {
          SUCCESS.push(`✅ ${route.name} (${route.path}) → ${route.expectedRedirect} (server-side)`);
          return { success: true, status, redirect: redirectPath };
        } else {
          ISSUES.push(`❌ ${route.name} (${route.path}): Verkeerde redirect! Verwacht: ${route.expectedRedirect}, Kreeg: ${redirectPath}`);
          return { success: false, status, redirect: redirectPath };
        }
      } else if (status === 200) {
        // Mogelijk client-side redirect - check HTML content
        const html = await response.text();
        // Check voor Next.js redirect() in HTML of meta refresh
        if (html.includes('redirect') || html.includes(route.expectedRedirect)) {
          // Volg de redirect om te zien waar we eindigen
          const followResponse = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            headers: {
              'User-Agent': 'OCASO-Navigation-Test/1.0',
            },
          });
          const finalUrl = new URL(followResponse.url).pathname;
          if (finalUrl === route.expectedRedirect) {
            SUCCESS.push(`✅ ${route.name} (${route.path}) → ${route.expectedRedirect} (client-side)`);
            return { success: true, status: 200, redirect: finalUrl, clientSide: true };
          } else {
            ISSUES.push(`❌ ${route.name} (${route.path}): Client-side redirect naar verkeerde locatie! Verwacht: ${route.expectedRedirect}, Kreeg: ${finalUrl}`);
            return { success: false, status: 200, redirect: finalUrl };
          }
        } else {
          ISSUES.push(`❌ ${route.name} (${route.path}): Verwacht redirect naar ${route.expectedRedirect}, maar kreeg status ${status} zonder redirect`);
          return { success: false, status };
        }
      } else {
        ISSUES.push(`❌ ${route.name} (${route.path}): Verwacht redirect naar ${route.expectedRedirect}, maar kreeg status ${status}`);
        return { success: false, status };
      }
    }
    
    // Check normale pagina
    if (status === 200) {
      SUCCESS.push(`✅ ${route.name} (${route.path}) - Status: ${status}`);
      return { success: true, status };
    } else if (status >= 300 && status < 400) {
      // Onverwachte redirect
      WARNINGS.push(`⚠️  ${route.name} (${route.path}): Onverwachte redirect naar ${location || 'onbekend'} (${status})`);
      return { success: true, status, redirect: location };
    } else if (status === 401 || status === 403) {
      // Beveiligde pagina - dit is OK
      SUCCESS.push(`✅ ${route.name} (${route.path}) - Beveiligd (${status})`);
      return { success: true, status, protected: true };
    } else if (status === 404) {
      ISSUES.push(`❌ ${route.name} (${route.path}): Pagina niet gevonden (404)`);
      return { success: false, status };
    } else {
      ISSUES.push(`❌ ${route.name} (${route.path}): Onverwachte status ${status}`);
      return { success: false, status };
    }
  } catch (error) {
    ISSUES.push(`❌ ${route.name} (${route.path}): Fout - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 OCASO Navigation Test\n');
  console.log(`Testing against: ${BASE_URL}\n`);
  console.log(`Testing ${ROUTES.length} routes...\n`);
  
  // Test alle routes
  for (const route of ROUTES) {
    await testRoute(route);
    // Kleine delay om server niet te overbelasten
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('RESULTATEN');
  console.log('='.repeat(60) + '\n');
  
  if (SUCCESS.length > 0) {
    console.log(`✅ SUCCESVOL (${SUCCESS.length}):`);
    SUCCESS.forEach(msg => console.log(`   ${msg}`));
    console.log('');
  }
  
  if (WARNINGS.length > 0) {
    console.log(`⚠️  WAARSCHUWINGEN (${WARNINGS.length}):`);
    WARNINGS.forEach(msg => console.log(`   ${msg}`));
    console.log('');
  }
  
  if (ISSUES.length > 0) {
    console.log(`❌ PROBLEMEN (${ISSUES.length}):`);
    ISSUES.forEach(msg => console.log(`   ${msg}`));
    console.log('');
  }
  
  // Summary
  const total = ROUTES.length;
  const successCount = SUCCESS.length;
  const issueCount = ISSUES.length;
  const warningCount = WARNINGS.length;
  
  console.log('='.repeat(60));
  console.log(`TOTAAL: ${total} routes getest`);
  console.log(`✅ Succesvol: ${successCount}`);
  console.log(`⚠️  Waarschuwingen: ${warningCount}`);
  console.log(`❌ Problemen: ${issueCount}`);
  console.log('='.repeat(60));
  
  // Exit code
  process.exit(issueCount > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

