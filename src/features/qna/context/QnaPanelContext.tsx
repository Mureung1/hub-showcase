import { createContext, useContext, useState, type ReactNode } from 'react'

interface QnaPanelContextValue {
  isOpen: boolean
  toggle: () => void
}

const QnaPanelContext = createContext<QnaPanelContextValue | null>(null)

export function QnaPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const toggle = () => setIsOpen((value) => !value)

  return <QnaPanelContext.Provider value={{ isOpen, toggle }}>{children}</QnaPanelContext.Provider>
}

export function useQnaPanel() {
  const ctx = useContext(QnaPanelContext)
  if (!ctx) throw new Error('useQnaPanel must be used within QnaPanelProvider')
  return ctx
}
