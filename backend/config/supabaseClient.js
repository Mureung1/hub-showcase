import { createClient } from "@supabase/supabase-js";

let supabaseClient;

export class SupabaseConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "SupabaseConfigurationError";
    this.code = "SUPABASE_NOT_CONFIGURED";
  }
}

function readSupabaseConfiguration() {
  const url = process.env.SUPABASE_URL?.trim();
  const secretKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  const missingVariables = [];

  if (!url) {
    missingVariables.push("SUPABASE_URL");
  }

  if (!secretKey) {
    missingVariables.push("SUPABASE_SECRET_KEY");
  }

  if (missingVariables.length > 0) {
    throw new SupabaseConfigurationError(
      `Missing required environment variables: ${missingVariables.join(", ")}`
    );
  }

  try {
    const parsedUrl = new URL(url);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Unsupported protocol");
    }
  } catch {
    throw new SupabaseConfigurationError(
      "SUPABASE_URL must be a valid HTTP or HTTPS URL."
    );
  }

  return { url, secretKey };
}

export function isSupabaseConfigured() {
  try {
    readSupabaseConfiguration();
    return true;
  } catch {
    return false;
  }
}

export function getSupabaseClient() {
  if (!supabaseClient) {
    const { url, secretKey } = readSupabaseConfiguration();

    supabaseClient = createClient(url, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });
  }

  return supabaseClient;
}
