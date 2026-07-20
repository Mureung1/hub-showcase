import process from "node:process";

import { createClient } from "@supabase/supabase-js";

import { readSupabaseConfig } from "./config.js";

export function createSupabaseAdmin(environment = process.env) {
  const { serviceRoleKey, url } = readSupabaseConfig(environment);

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
