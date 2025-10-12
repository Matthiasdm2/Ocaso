// Diagnostic script voor chat problemen
// Voer dit uit in de browser console op een listing pagina

console.log('=== CHAT DIAGNOSTIC TOOL ===');

// 1. Check authentication
async function checkAuth() {
  console.log('1. Checking authentication...');
  try {
    const { createClient } = await import('/lib/supabaseClient.js');
    const supa = createClient();
    const { data: { session } } = await supa.auth.getSession();
    console.log('Session:', session ? 'Present' : 'Missing');
    console.log('User ID:', session?.user?.id || 'None');
    return session?.user?.id;
  } catch (e) {
    console.error('Auth error:', e);
    return null;
  }
}

// 2. Check listing data
function checkListingData() {
  console.log('2. Checking listing data...');
  // Probeer listing ID te vinden in de URL
  const urlMatch = window.location.pathname.match(/\/listings\/([^\/]+)/);
  const listingId = urlMatch ? urlMatch[1] : null;
  console.log('Listing ID from URL:', listingId);

  // Probeer seller ID te vinden in de DOM
  const sellerElements = document.querySelectorAll('[data-seller-id]');
  const sellerId = sellerElements.length > 0 ? sellerElements[0].getAttribute('data-seller-id') : null;
  console.log('Seller ID from DOM:', sellerId);

  return { listingId, sellerId };
}

// 3. Test messages API
async function testMessagesAPI(userId) {
  console.log('3. Testing messages API...');
  try {
    const response = await fetch('/api/messages');
    console.log('Messages API status:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('Messages data:', data);
    } else {
      const error = await response.text();
      console.log('Messages API error:', error);
    }
  } catch (e) {
    console.error('Messages API fetch error:', e);
  }
}

// 4. Test contact button click
function testContactButton() {
  console.log('4. Testing contact button...');
  const contactButtons = document.querySelectorAll('button');
  const contactBtn = Array.from(contactButtons).find(btn =>
    btn.textContent?.toLowerCase().includes('contact') ||
    btn.textContent?.toLowerCase().includes('chat')
  );
  console.log('Contact button found:', !!contactBtn);

  if (contactBtn) {
    console.log('Contact button text:', contactBtn.textContent);
    console.log('Contact button disabled:', contactBtn.disabled);
  }
}

// 5. Check for JavaScript errors
function checkErrors() {
  console.log('5. Checking for JavaScript errors...');
  // Listen for errors
  window.addEventListener('error', (e) => {
    console.error('JavaScript error:', e.error);
  });

  // Check if chat dock exists
  const chatDock = document.querySelector('[data-chat-dock]');
  console.log('Chat dock found:', !!chatDock);
}

// Run all checks
async function runDiagnostics() {
  const userId = await checkAuth();
  const listingData = checkListingData();
  await testMessagesAPI(userId);
  testContactButton();
  checkErrors();

  console.log('=== DIAGNOSTIC SUMMARY ===');
  console.log('User authenticated:', !!userId);
  console.log('Listing ID:', listingData.listingId);
  console.log('Seller ID:', listingData.sellerId);
  console.log('Ready for chat:', !!(userId && listingData.listingId && listingData.sellerId));
}

// Start diagnostics
runDiagnostics();
