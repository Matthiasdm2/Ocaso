const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://dmnowaqinfkhovhyztan.supabase.co',
    'seyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtbm93YXFpbmZraG92aHl6dGFuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE5NjgzNywiZXhwIjoyMDcwNzcyODM3fQ.IgWoeD3IeoHkYfaI3-kc30PVZStvj5O0nk2c95yf0DU' // service role
);

async function createUser() {
    const { data, error } = await supabase.auth.admin.createUser({
        email: 'test-user@ocaso-test.local',
        password: 'TestPassword123!',
        email_confirm: true,
        user_metadata: {
            first_name: 'Test',
            last_name: 'User',
        },
    });

    if (error) {
        console.error('Error creating user:', error);
    } else {
        console.log('User created:', data);
    }
}

createUser();
