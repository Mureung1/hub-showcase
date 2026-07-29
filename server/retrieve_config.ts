const FORBIDDEN_BROWSER_SECRET_KEYS = [
  'VITE_GEMINI_API_KEY',
  'VITE_SUPABASE_SERVICE_ROLE_KEY',
] as const;

export type RetrieveServerConfig = {
  geminiApiKey: string;
  serviceRoleKey: string;
  supabaseUrl: string;
};

export function readOptionalRetrieveConfig(
  environment: Record<string, string | undefined>
): RetrieveServerConfig | null {
  rejectBrowserSecrets(environment);

  const geminiApiKey = readValue(environment, 'GEMINI_API_KEY');

  if (!geminiApiKey) {
    return null;
  }

  const serviceRoleKey = requireValue(environment, 'SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = requireValue(environment, 'VITE_SUPABASE_URL');

  return {
    geminiApiKey,
    serviceRoleKey,
    supabaseUrl,
  };
}

function rejectBrowserSecrets(environment: Record<string, string | undefined>) {
  for (const key of FORBIDDEN_BROWSER_SECRET_KEYS) {
    if (readValue(environment, key)) {
      throw new Error(`${key} must not be exposed to the browser`);
    }
  }
}

function requireValue(
  environment: Record<string, string | undefined>,
  name: string
) {
  const value = readValue(environment, name);

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function readValue(
  environment: Record<string, string | undefined>,
  name: string
) {
  return environment[name]?.trim();
}
