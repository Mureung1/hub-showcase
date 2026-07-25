import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useItemSearch } from '../features/search/useItemSearch'
import { useLanguage } from '../i18n/LanguageContext'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const trimmed = query.trim()
  const { lang, t } = useLanguage()

  const { data: results = [], isLoading, isError } = useItemSearch(query)

  return (
    <div>
      <PageHeader title={t('search.title')} backTo="/" />
      <div className="px-5 pt-[18px] pb-[90px]">
        <div className="flex items-center gap-2 rounded-md border-[1.5px] border-green-600 px-[14px] py-[13px]">
          <span aria-hidden>🔍</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('search.placeholder')}
            className="flex-1 border-none bg-transparent text-sm text-ink outline-none placeholder:text-sub"
          />
        </div>

        {trimmed && (
          <div className="mt-6 text-xs font-extrabold tracking-wider text-green-700 uppercase">
            {t('search.resultsHeading')}
          </div>
        )}

        {!trimmed ? (
          <p className="mt-3 text-sm text-sub">{t('search.prompt')}</p>
        ) : isLoading ? (
          <p className="mt-3 text-sm text-sub">{t('search.loading')}</p>
        ) : isError ? (
          <p className="mt-3 text-sm text-sub">{t('search.error')}</p>
        ) : results.length === 0 ? (
          <p className="mt-3 text-sm text-sub">{t('search.empty')}</p>
        ) : (
          <ul className="mt-3">
            {results.map((item) => (
              <li key={item.id} className="border-t border-line first:border-t-0">
                <Link
                  to={`/result/${item.id}`}
                  className="flex items-center justify-between py-3 text-[13.5px] font-bold text-ink"
                >
                  <span>
                    {lang === 'en' && item.nameEn ? item.nameEn : item.name}
                    {lang === 'en' && item.nameEn ? (
                      <span className="block text-xs font-normal text-sub">{item.name}</span>
                    ) : null}
                  </span>
                  <span className="text-green-700">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
