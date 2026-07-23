import { useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useDisposalRule } from '../features/disposal/useDisposalRule'
import { useLanguage } from '../i18n/LanguageContext'

export default function ResultPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const { data, isLoading, isError } = useDisposalRule(itemId)
  const { lang, t } = useLanguage()

  const rule = data?.disposalRule
  const steps = lang === 'ko' ? rule?.steps : rule?.stepsEn
  const parts = lang === 'ko' ? rule?.parts : rule?.partsEn
  const commonMistakes = lang === 'ko' ? rule?.commonMistakes : rule?.commonMistakesEn
  const reason = lang === 'ko' ? rule?.reason : rule?.reasonEn
  const itemName = lang === 'en' && data?.item.nameEn ? data.item.nameEn : data?.item.name

  return (
    <div>
      <PageHeader title={itemName ?? t('result.titleFallback')} backTo="/search" />
      <div className="px-5 pt-[18px] pb-[90px]">
        {isLoading ? (
          <p className="text-sm text-sub">{t('common.loading')}</p>
        ) : isError ? (
          <p className="text-sm text-sub">{t('result.notFound')}</p>
        ) : data && rule ? (
          <>
            <div className="font-display text-[22px] font-bold text-ink">{itemName}</div>

            <div className="mt-4 rounded-[16px] border border-line bg-card p-[17px]">
              <h4 className="mb-[10px] text-xs font-extrabold tracking-wider text-green-700 uppercase">
                {t('result.steps')}
              </h4>
              <ul className="space-y-2">
                {steps?.map((step, index) => (
                  <li key={index} className="text-[13.5px] leading-relaxed text-ink">
                    {index + 1}. {step}
                  </li>
                ))}
              </ul>
            </div>

            {parts && parts.length > 0 && (
              <div className="mt-4 rounded-[16px] border border-line bg-card p-[17px]">
                <h4 className="mb-[10px] text-xs font-extrabold tracking-wider text-green-700 uppercase">
                  {t('result.parts')}
                </h4>
                {parts.map((part) => (
                  <div
                    key={part.part}
                    className="flex items-center justify-between border-t border-line py-2 text-[13.5px] text-ink first:border-t-0"
                  >
                    <span>{part.part}</span>
                    <span className="rounded-pill bg-green-100 px-3 py-1 text-xs font-bold text-green-900">
                      {part.category}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {commonMistakes && commonMistakes.length > 0 && (
              <div className="mt-4 rounded-[16px] border border-line bg-card p-[17px]">
                <h4 className="mb-[10px] text-xs font-extrabold tracking-wider text-green-700 uppercase">
                  {t('result.mistakes')}
                </h4>
                <ul className="space-y-1">
                  {commonMistakes.map((mistake, index) => (
                    <li key={index} className="text-[13.5px] leading-relaxed text-ink">
                      ✕ {mistake}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {reason && (
              <div className="mt-4 rounded-[16px] bg-green-100 p-[17px] text-[13px] leading-relaxed text-green-900">
                <b>{t('result.reasonTitle')}</b>
                <br />
                {reason}
              </div>
            )}

            <div className="mt-4 rounded-[16px] bg-green-50 p-[17px] text-[13px] leading-relaxed text-green-900">
              {t('result.sourcePrefix')}
              {rule.sourceRegion}
              {t('result.sourceSuffix')}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
