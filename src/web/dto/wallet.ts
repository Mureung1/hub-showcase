export interface WalletDto { readonly balance: number; readonly updatedAt: string }
export interface LedgerItemDto { readonly id: string; readonly amount: number; readonly direction: 'credit' | 'debit'; readonly reason: string; readonly occurredAt: string }
export interface LedgerPageDto { readonly items: readonly LedgerItemDto[]; readonly nextCursor: string | null }
