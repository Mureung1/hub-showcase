import type { AdapterResult } from '../core/types';
import type { NormalizedPaymentEvent } from '../../dto/payment';
import type { PaymentCheckoutInput } from './types';
export interface PaymentAdapter { readonly provider: string; isConfigured(): boolean; createCheckoutSession(input: PaymentCheckoutInput): Promise<AdapterResult<{ checkoutUrl: string; expiresAt: string }>>; verifyAndNormalizeWebhook(input: { rawBody: Uint8Array; headers: Readonly<Record<string,string>> }): Promise<AdapterResult<NormalizedPaymentEvent>> }
