export type ImportServerConfig = {
  cronSecret: string;
  serviceRoleKey: string;
};

export function readImportServerConfig(
  environment: Record<string, string | undefined>
): ImportServerConfig | null {
  const cronSecret = environment.CRON_SECRET?.trim();
  const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!cronSecret && !serviceRoleKey) {
    return null;
  }

  if (!cronSecret) {
    throw new Error('CRON_SECRET is required');
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  }

  return {
    cronSecret,
    serviceRoleKey,
  };
}
