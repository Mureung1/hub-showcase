import 'server-only';
export interface ServerEnv {
  readonly cronSecret: string;
  readonly evidenceMimeTypes: readonly string[];
  readonly evidenceMaxBytes: number;
}
export function getServerEnv(): ServerEnv {
  const env = {
    cronSecret: process.env.CRON_SECRET ?? '',
    evidenceMimeTypes: (process.env.EVIDENCE_ALLOWED_MIME_TYPES ?? 'image/jpeg,image/png,application/pdf').split(',').filter(Boolean),
    evidenceMaxBytes: Number(process.env.EVIDENCE_MAX_BYTES ?? 5_242_880),
  } satisfies ServerEnv;
  if (process.env.NODE_ENV === 'production' && !env.cronSecret) throw new Error('CRON_SECRET is required');
  return env;
}
