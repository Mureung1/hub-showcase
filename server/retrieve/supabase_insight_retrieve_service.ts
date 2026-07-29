import { createClient } from '@supabase/supabase-js';

import { createSupabaseInsightCaptureAuthenticator } from '../supabase_insight_capture.js';
import { createGoogleGeminiEmbeddingClient } from './gemini_embedding_client.js';
import { createInsightRetrieveService } from './insight_retrieve_service.js';
import { createSupabaseInsightEmbeddingStore } from './supabase_insight_embedding_store.js';

const SERVER_AUTH_OPTIONS = {
  autoRefreshToken: false,
  detectSessionInUrl: false,
  persistSession: false,
} as const;

export type SupabaseInsightRetrieveServiceConfig = {
  geminiApiKey: string;
  publishableKey: string;
  serviceRoleKey: string;
  url: string;
};

export function createSupabaseInsightRetrieveService(
  config: SupabaseInsightRetrieveServiceConfig
) {
  const authClient = createClient(config.url, config.publishableKey, {
    auth: SERVER_AUTH_OPTIONS,
  });

  return createInsightRetrieveService({
    authenticator: createSupabaseInsightCaptureAuthenticator(authClient),
    embedder: createGoogleGeminiEmbeddingClient(config.geminiApiKey),
    store: createSupabaseInsightEmbeddingStore({
      serviceRoleKey: config.serviceRoleKey,
      url: config.url,
    }),
  });
}
