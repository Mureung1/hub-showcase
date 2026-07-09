import { create } from 'zustand'

type ThemeMode = 'light' | 'dark' | 'system'

type ThemeStore = {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: 'system',
  setMode: (mode) => set({ mode }),
}))
