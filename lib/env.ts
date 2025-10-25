// Runtime config for environment variables
// This ensures environment variables are available in production

export const getEnvVar = (name: string, fallback?: string): string => {
  const value = process.env[name];
  if (value) return value;

  // Production fallbacks for Amplify - REMOVED FOR SECURITY
  // Secrets should be set via Amplify Console or SSM Parameters
  const fallbacks: Record<string, string> = {
    'NODE_ENV': 'production',
    'NEXT_PUBLIC_SUPABASE_URL': 'https://dmnowaqinfkhovhyztan.supabase.co',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'sb_publishable_6EUcWrLAZQ-abTkRXy7LLg_CofHMZ26',
    // REMOVED: SUPABASE_SERVICE_ROLE_KEY for security
    // REMOVED: STRIPE_SECRET_KEY for security
    // REMOVED: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY for security
    // REMOVED: STRIPE_WEBHOOK_SECRET for security
  };

  const fallbackValue = fallbacks[name] || fallback;
  if (fallbackValue) return fallbackValue;

  throw new Error(`Environment variable ${name} is not set and has no fallback`);
};

// Export commonly used environment variables
export const env = {
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  SUPABASE_URL: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  SUPABASE_ANON_KEY: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  // These will fail if not set via Amplify Console or SSM:
  SUPABASE_SERVICE_ROLE_KEY: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
  STRIPE_SECRET_KEY: getEnvVar('STRIPE_SECRET_KEY'),
  STRIPE_PUBLISHABLE_KEY: getEnvVar('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
  STRIPE_WEBHOOK_SECRET: getEnvVar('STRIPE_WEBHOOK_SECRET')
};
