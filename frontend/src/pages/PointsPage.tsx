import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import { COLLECTION_POINT_CATEGORIES, useCollectionPoints } from '../features/points/useCollectionPoints'
import type { CollectionPointCategory } from '../features/points/useCollectionPoints'
import { useLanguage } from '../i18n/LanguageContext'
import type { TranslationKey } from '../i18n/LanguageContext'

export default function PointsPage() {
  const { t } = useLanguage()
  const [category, setCategory] = useState<CollectionPointCategory>(COLLECTION_POINT_CATEGORIES[0])
  const { data: points = [], isLoading, isError } = useCollectionPoints(category)

  return (
    <div>
      <PageHeader title={t('points.title')} backTo="/" />
      <div className="px-5 pt-[18px] pb-[90px]">
        <div className="flex flex-wrap gap-2">
          {COLLECTION_POINT_CATEGORIES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCategory(option)}
              className={
                option === category
                  ? 'rounded-pill bg-green-600 px-[14px] py-[9px] text-[13px] font-bold text-white'
                  : 'rounded-pill border border-green-100 bg-green-50 px-[14px] py-[9px] text-[13px] font-bold text-green-900'
              }
            >
              {t(`points.category.${option}` as TranslationKey)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="mt-4 text-sm text-sub">{t('points.loading')}</p>
        ) : isError ? (
          <p className="mt-4 text-sm text-sub">{t('points.error')}</p>
        ) : points.length === 0 ? (
          <p className="mt-4 text-sm text-sub">{t('points.empty')}</p>
        ) : (
          <ul className="mt-4 rounded-[16px] border border-line bg-card p-[17px]">
            {points.map((point) => (
              <li
                key={point.id}
                className="flex items-center justify-between border-t border-line py-3 first:border-t-0"
              >
                <div>
                  <p className="text-[13.5px] font-bold text-ink">{point.name}</p>
                  <p className="text-xs text-sub">{point.address}</p>
                  {point.hours ? <p className="text-xs text-sub">{point.hours}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
