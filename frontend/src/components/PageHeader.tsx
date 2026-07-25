import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'

interface PageHeaderProps {
  title: ReactNode
  backTo?: string
  action?: ReactNode
  hideLanguageToggle?: boolean
}

export default function PageHeader({ title, backTo, action, hideLanguageToggle }: PageHeaderProps) {
  const { lang, toggleLang, t } = useLanguage()

  return (
    <header className="flex items-center justify-between border-b border-line bg-sand px-5 py-[18px]">
      <div className="flex items-center gap-[10px]">
        {backTo ? (
          <Link to={backTo} aria-label={t('common.back')} className="text-lg text-green-700">
            ←
          </Link>
        ) : null}
        <div className="font-display text-[17px] font-bold text-green-900">{title}</div>
      </div>
      <div className="flex items-center gap-2">
        {!hideLanguageToggle ? (
          <button
            type="button"
            onClick={toggleLang}
            aria-label="Translate"
            className="rounded-pill border border-green-600 bg-card px-3 py-[6px] text-xs font-extrabold text-green-700"
          >
            🌐 {lang === 'ko' ? 'EN' : '한국어'}
          </button>
        ) : null}
        {action}
      </div>
    </header>
  )
}
