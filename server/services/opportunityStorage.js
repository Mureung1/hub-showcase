import { createLocalOpportunityRepository, getLocalOpportunityConfig } from "./localOpportunityRepository.js";
import { createOpportunityRepository, getSupabaseOpportunityConfig } from "./opportunityRepository.js";

function readProvider(value) {
  const provider = String(value || "").trim().toLowerCase();
  return provider === "supabase" || provider === "sqlite" ? provider : null;
}

export function getOpportunityStorageConfig(environment = process.env) {
  const supabase = getSupabaseOpportunityConfig(environment);
  const requestedProvider = readProvider(environment.OPPORTUNITY_STORAGE_PROVIDER);
  const provider = requestedProvider || (supabase.configured ? "supabase" : "sqlite");
  const local = getLocalOpportunityConfig(environment);

  if (provider === "supabase") {
    return {
      ...supabase,
      label: "Supabase",
      provider,
    };
  }

  return {
    ...local,
    label: "로컬 SQLite DB",
    provider: "sqlite",
  };
}

export function createOpportunityStorage(options = {}) {
  const environment = options.environment ?? process.env;
  const config = getOpportunityStorageConfig(environment);
  const repository = config.provider === "supabase"
    ? createOpportunityRepository({ environment })
    : createLocalOpportunityRepository({ environment });

  return {
    ...repository,
    label: config.label,
    provider: config.provider,
  };
}
