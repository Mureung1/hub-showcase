import 'server-only';
import type { PaymentAdapter } from './payment-adapter';
import { UnconfiguredPaymentAdapter } from './unconfigured-adapter';
export function getPaymentAdapter(provider: string): PaymentAdapter { return new UnconfiguredPaymentAdapter(provider || 'unconfigured'); }
