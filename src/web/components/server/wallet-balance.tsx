import type { WalletDto } from '../../dto/wallet';
export function WalletBalance({ wallet }: { wallet: WalletDto }) { return <section className="glass plane"><p className="eyebrow">Point wallet</p><p className="metric">{wallet.balance.toLocaleString()}P</p><p className="muted">마지막 갱신 {new Date(wallet.updatedAt).toLocaleString('ko-KR')}</p></section> }
