import type { CoreAdapter } from './core-adapter';
import { MockAdapter } from './mock-adapter';
import { RealCoreAdapter } from './real-core-adapter';
import { assertCompleteProductionCapabilities } from './capabilities';
import { getAdapterMode } from '../../config/adapter-mode';
let instance: CoreAdapter | undefined;
class HybridCoreAdapter extends MockAdapter {
  private readonly real = new RealCoreAdapter();
  override createUserChallenge(...args: Parameters<CoreAdapter['createUserChallenge']>) { return this.real.createUserChallenge(...args); }
  override joinUserChallenge(...args: Parameters<CoreAdapter['joinUserChallenge']>) { return this.real.joinUserChallenge(...args); }
  override getWallet(...args: Parameters<CoreAdapter['getWallet']>) { return this.real.getWallet(...args); }
  override getLedger(...args: Parameters<CoreAdapter['getLedger']>) { return this.real.getLedger(...args); }
  override processDailyEliminations(...args: Parameters<CoreAdapter['processDailyEliminations']>) { return this.real.processDailyEliminations(...args); }
  override settleChallenge(...args: Parameters<CoreAdapter['settleChallenge']>) { return this.real.settleChallenge(...args); }
}
export function getCoreAdapter(): CoreAdapter {
  if (instance) return instance;
  const enforceProduction = process.env.VERCEL_ENV === 'production';
  const mode = getAdapterMode({ enforceProduction });
  if (enforceProduction) assertCompleteProductionCapabilities();
  instance = mode === 'real' ? new RealCoreAdapter() : mode === 'hybrid' ? new HybridCoreAdapter() : new MockAdapter();
  return instance;
}
