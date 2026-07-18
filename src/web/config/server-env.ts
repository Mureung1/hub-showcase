import 'server-only';
export interface ServerEnv {
  readonly cronSecret: string;
  readonly paymentProvider: string;
  readonly paymentProviderSecret: string;
  readonly paymentWebhookSecret: string;
  readonly checkoutEnabled: boolean;
  readonly evidenceMimeTypes: readonly string[];
  readonly evidenceMaxBytes: number;
}
export function getServerEnv(): ServerEnv {
  const checkoutEnabled = process.env.PAYMENT_CHECKOUT_ENABLED === 'true';
  const env = {
    cronSecret: process.env.CRON_SECRET ?? '', paymentProvider: process.env.PAYMENT_PROVIDER ?? '',
    paymentProviderSecret: process.env.PAYMENT_PROVIDER_SECRET ?? '', paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET ?? '',
    checkoutEnabled, evidenceMimeTypes: (process.env.EVIDENCE_ALLOWED_MIME_TYPES ?? 'image/jpeg,image/png,application/pdf').split(',').filter(Boolean),
    evidenceMaxBytes: Number(process.env.EVIDENCE_MAX_BYTES ?? 5_242_880),
  } satisfies ServerEnv;
  if (process.env.NODE_ENV === 'production' && !env.cronSecret) throw new Error('CRON_SECRET is required');
  if (process.env.NODE_ENV === 'production' && checkoutEnabled && (!env.paymentProvider || !env.paymentProviderSecret)) throw new Error('Payment provider configuration is required');
  return env;
}
