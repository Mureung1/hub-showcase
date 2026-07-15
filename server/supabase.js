import { createClient } from '@supabase/supabase-js';

const REQUIRED_ENVIRONMENT_VARIABLES = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY'];

let supabaseClient;

class SupabaseConfigurationError extends Error {
  constructor(missingVariables) {
    super(`Missing required environment variables: ${missingVariables.join(', ')}`);
    this.name = 'SupabaseConfigurationError';
  }
}

function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const missingVariables = REQUIRED_ENVIRONMENT_VARIABLES.filter(
    (variableName) => !process.env[variableName]?.trim(),
  );

  if (missingVariables.length > 0) {
    throw new SupabaseConfigurationError(missingVariables);
  }

  supabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );

  return supabaseClient;
}

export { getSupabaseClient, SupabaseConfigurationError };
