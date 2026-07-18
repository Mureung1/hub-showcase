import { requireSession } from '../../../web/auth/session';
import { getCoreAdapter } from '../../../web/adapters/core/registry';
import { ErrorState } from '../../../web/components/error-state';
import { WalletBalance } from '../../../web/components/server/wallet-balance';
import { LedgerList } from '../../../web/components/server/ledger-list';
export default async function WalletPage() { const ctx = await requireSession('/wallet'); const adapter = getCoreAdapter(); const [wallet,ledger] = await Promise.all([adapter.getWallet(ctx),adapter.getLedger(ctx)]); return <main><h1>Point Wallet</h1>{wallet.ok ? <WalletBalance wallet={wallet.value} /> : <ErrorState message="잔액을 불러오지 못했습니다." traceId={wallet.error.traceId} />}{ledger.ok ? <LedgerList ledger={ledger.value} /> : <ErrorState message="거래 내역을 불러오지 못했습니다." traceId={ledger.error.traceId} />}</main> }
