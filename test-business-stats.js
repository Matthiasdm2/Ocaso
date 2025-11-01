import fetch from 'node-fetch';

async function testBusinessStats() {
  const businessId = 'e8e07914-c4fd-46b2-a4a1-9c0dc3eb1173';

  try {
    console.log('Testing business stats API...');
    const response = await fetch(`http://localhost:3000/api/business/${businessId}/stats`);
    const data = await response.json();

    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ API werkt correct!');
    } else {
      console.log('❌ API error:', data);
    }
  } catch (error) {
    console.error('❌ Fetch error:', error.message);
  }
}

testBusinessStats();
