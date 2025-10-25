// Runtime config for environment variables
// This ensures environment variables are available in production

export const getEnvVar = (name: string, fallback?: string): string => {
  const value = process.env[name];
  if (value) return value;

  // Production fallbacks for Amplify
  const fallbacks: Record<string, string> = {
    'NODE_ENV': 'production',
    'NEXT_PUBLIC_SUPABASE_URL': 'https://dmnowaqinfkhovhyztan.supabase.co',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'sb_publishable_6EUcWrLAZQ-abTkRXy7LLg_CofHMZ26',
    'SUPABASE_SERVICE_ROLE_KEY': 'sb_secret_qcAd1n4QrsYnOOVJcBlAnA_6mVGa0fM',
    'STRIPE_SECRET_KEY': 'sk_test_51S9WEa1zucWY3IcBtFlZKGj2vJ2efKP0mMBOpZCayafhP8GJPFXYh1UShX7GQF0CvhrOEqrWrfEhsi2ShCVXWQqu006MDAV5kA',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': 'pk_test_51S9WEa1zucWY3IcBtFlZKGj2vJ2efKP0mMBOpZCayafhP8GJPFXYh1UShX7GQF0CvhrOEqrWrfEhsi2ShCVXWQqu006MDAV5kA',
    'STRIPE_WEBHOOK_SECRET': 'whsec_550e1dcc6f49127e8bb2facaeb36affe9fe0fe1a9df029b368cbc9308ac150af'
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
  SUPABASE_SERVICE_ROLE_KEY: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
  STRIPE_SECRET_KEY: getEnvVar('STRIPE_SECRET_KEY'),
  STRIPE_PUBLISHABLE_KEY: getEnvVar('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
  STRIPE_WEBHOOK_SECRET: getEnvVar('STRIPE_WEBHOOK_SECRET')
};
