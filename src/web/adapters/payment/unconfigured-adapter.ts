import type { PaymentAdapter } from './payment-adapter';
import { adapterError } from '../core/types';
export class UnconfiguredPaymentAdapter implements PaymentAdapter { constructor(readonly provider: string) {} isConfigured() { return false; } async createCheckoutSession() { return adapterError('CONFIGURATION_ERROR'); } async verifyAndNormalizeWebhook() { return adapterError('CONFIGURATION_ERROR'); } }
