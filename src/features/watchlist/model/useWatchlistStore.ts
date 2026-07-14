import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WatchlistState {
  symbols: string[]
  addSymbol: (symbol: string) => void
  removeSymbol: (symbol: string) => void
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      symbols: [],
      addSymbol: (symbol) =>
        set((state) => ({
          symbols: state.symbols.includes(symbol) ? state.symbols : [...state.symbols, symbol],
        })),
      removeSymbol: (symbol) =>
        set((state) => ({
          symbols: state.symbols.filter((savedSymbol) => savedSymbol !== symbol),
        })),
    }),
    {
      name: 'gazua-watchlist',
    },
  ),
)
