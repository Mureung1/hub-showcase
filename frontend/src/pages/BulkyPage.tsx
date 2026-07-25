import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { useBulkyWasteFee, useBulkyWasteItems } from '../features/bulky/useBulkyWaste'
import RegionSelectSheet from '../features/region/RegionSelectSheet'
import { formatSelectedRegionLabel, useSelectedRegion } from '../features/region/useSelectedRegion'
import { useLanguage } from '../i18n/LanguageContext'

export default function BulkyPage() {
  const { lang, t } = useLanguage()
  const { region, setRegion } = useSelectedRegion()
  const [isRegionSheetOpen, setRegionSheetOpen] = useState(false)
  const [itemName, setItemName] = useState('')

  const { data: items = [] } = useBulkyWasteItems(region)
  const { data: feeResult, isLoading, isError } = useBulkyWasteFee(region, itemName)

  // 지역이 바뀌면 이전 지역 기준으로 고른 품목은 더 이상 유효하지 않을 수 있어 초기화한다.
  useEffect(() => {
    setItemName('')
  }, [region?.ctpvNm, region?.sggNm])

  return (
    <div>
      <PageHeader title={t('bulky.title')} backTo="/" />
      <div className="px-5 pt-[18px] pb-[90px]">
        <button
          type="button"
          onClick={() => setRegionSheetOpen(true)}
          className="flex w-full items-center gap-[6px] rounded-pill border border-green-100 bg-green-50 px-[14px] py-[11px] text-left text-[13.5px] font-bold text-green-900"
        >
          📍 {region ? formatSelectedRegionLabel(region, lang) : t('home.selectRegionPlaceholder')}
          <span className="ml-auto">▾</span>
        </button>

        <select
          value={itemName}
          onChange={(event) => setItemName(event.target.value)}
          disabled={!region}
          className="mt-2 w-full rounded-md border border-line bg-card px-[13px] py-[13px] text-sm text-ink disabled:opacity-50"
        >
          <option value="">{t('bulky.itemPlaceholder')}</option>
          {items.map((item) => (
            <option key={item.itemName} value={item.itemName}>
              {item.itemName}
            </option>
          ))}
        </select>

        {!region ? (
          <p className="mt-4 text-sm text-sub">{t('bulky.selectRegionFirst')}</p>
        ) : !itemName ? (
          <p className="mt-4 text-sm text-sub">{t('bulky.selectItemPrompt')}</p>
        ) : isLoading ? (
          <p className="mt-4 text-sm text-sub">{t('bulky.loading')}</p>
        ) : isError ? (
          <p className="mt-4 text-sm text-sub">{t('bulky.notFound')}</p>
        ) : feeResult ? (
          <>
            <div className="mt-4 rounded-[16px] border border-line bg-card p-[17px]">
              <h4 className="mb-[10px] text-xs font-extrabold tracking-wider text-green-700 uppercase">
                {t('bulky.feeCardTitle')}
              </h4>
              <ul className="space-y-2">
                {feeResult.fees.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between border-t border-line py-2 text-[13.5px] first:border-t-0"
                  >
                    <span className="text-sub">
                      {entry.category}
                      {entry.spec ? <span className="block text-xs text-sub/80">{entry.spec}</span> : null}
                    </span>
                    <span className="font-display font-bold text-green-700">
                      {entry.paidFree === '무료' ? t('bulky.free') : `₩${entry.fee.toLocaleString()}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {feeResult.reportSite ? (
              <a href={feeResult.reportSite.reportUrl} target="_blank" rel="noreferrer">
                <button
                  type="button"
                  className="mt-4 w-full rounded-md bg-green-600 py-3 text-sm font-bold text-white"
                >
                  {t('bulky.goToReportSite')}
                </button>
              </a>
            ) : feeResult.managingInstitution ? (
              <p className="mt-4 text-sm text-sub">
                {t('bulky.noReportSiteContactPrefix')}
                {feeResult.managingInstitution}
              </p>
            ) : (
              <p className="mt-4 text-sm text-sub">{t('bulky.noReportSite')}</p>
            )}

            <div className="mt-4 rounded-[16px] bg-green-50 p-[17px] text-[13px] leading-relaxed text-green-900">
              {feeResult.reportSite ? t('bulky.reportSiteInfo') : null}
            </div>

            <div className="mt-4 rounded-[16px] bg-green-50 p-[17px] text-[13px] leading-relaxed text-green-900">
              {t('bulky.sourcePrefix')}
              {feeResult.fees[0].sourceDate}
              {t('bulky.sourceSuffix')}
            </div>
          </>
        ) : null}
      </div>

      {isRegionSheetOpen ? (
        <RegionSelectSheet
          initialRegion={region}
          onSave={(next) => {
            setRegion(next)
            setRegionSheetOpen(false)
          }}
          onClose={() => setRegionSheetOpen(false)}
        />
      ) : null}
    </div>
  )
}
