require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testProfileAPI() {
  // Sign in first
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'info@ocaso.be',
    password: 'Arsamat1105'
  });

  if (signInError) {
    console.error('Sign in error:', signInError);
    return;
  }

  console.log('Signed in, token:', signInData.session?.access_token?.substring(0, 20) + '...');

  const response = await fetch('http://localhost:3000/api/profile/upsert', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${signInData.session.access_token}`
    },
    body: JSON.stringify({
      first_name: 'APITest',
      last_name: 'User'
    })
  });

  console.log('Status:', response.status);
  const body = await response.json();
  console.log('Body:', body);
}

testProfileAPI().catch(console.error);
