import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedAdminUser() {
  const adminEmail = 'info@ocaso.be';

  console.log(`Seeding admin user: ${adminEmail}`);

  try {
    // 1. Get user ID from profiles table (assuming profile exists)
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, is_admin')
      .eq('email', adminEmail)
      .single();

    if (profileError) {
      console.error('Error querying profile:', profileError);
      return;
    }

    if (!existingProfile) {
      console.log('Profile does not exist - cannot seed admin');
      return;
    }

    const userId = existingProfile.id;
    console.log(`Found profile: ${userId}, current is_admin: ${existingProfile.is_admin}`);

    // 2. Ensure is_admin is true
    if (existingProfile.is_admin !== true) {
      console.log('Setting is_admin to true...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          is_admin: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        return;
      }
    } else {
      console.log('is_admin already true');
    }

    // 3. Verify the admin status
    const { data: finalProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('id, email, is_admin, updated_at')
      .eq('id', userId)
      .single();

    if (verifyError) {
      console.error('Error verifying profile:', verifyError);
      return;
    }

    console.log('Final profile:', finalProfile);

    if (finalProfile.is_admin === true) {
      console.log('✅ Admin seeding successful');
    } else {
      console.log('❌ Admin seeding failed - is_admin is not true');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

seedAdminUser().catch(console.error);
