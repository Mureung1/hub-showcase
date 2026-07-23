import { createContext, useContext, useState, type ReactNode } from 'react'
import { en } from './en'
import { ko } from './ko'

export type Lang = 'ko' | 'en'
export type TranslationKey = keyof typeof ko

const DICTIONARIES: Record<Lang, Record<TranslationKey, string>> = { ko, en }
const STORAGE_KEY = 'ecobot-lang'

interface LanguageContextValue {
  lang: Lang
  toggleLang: () => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function readInitialLang(): Lang {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'en' ? 'en' : 'ko'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(readInitialLang)

  function toggleLang() {
    setLang((prev) => {
      const next: Lang = prev === 'ko' ? 'en' : 'ko'
      window.localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }

  function t(key: TranslationKey): string {
    return DICTIONARIES[lang][key]
  }

  return <LanguageContext.Provider value={{ lang, toggleLang, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage는 LanguageProvider 안에서만 사용할 수 있습니다')
  }
  return context
}
