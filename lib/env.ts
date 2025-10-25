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
};

// Functions for runtime-only environment variables to avoid build-time evaluation
export function getSupabaseServiceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required but not set');
  }
  return value;
}

export function getSupabaseServiceRoleKeyOptional(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

export function getStripeSecretKey(): string {
  const value = process.env.STRIPE_SECRET_KEY;
  if (!value) {
    throw new Error('STRIPE_SECRET_KEY is required but not set');
  }
  return value;
}

export function getStripePublishableKey(): string {
  const value = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!value) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required but not set');
  }
  return value;
}

export function getStripeWebhookSecret(): string {
  const value = process.env.STRIPE_WEBHOOK_SECRET;
  if (!value) {
    throw new Error('STRIPE_WEBHOOK_SECRET is required but not set');
  }
  return value;
}
