import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import RegionSelectSheet from '../features/region/RegionSelectSheet'
import { useSelectedRegion } from '../features/region/useSelectedRegion'
import { useRegionRule, type BulkWasteRule, type CategoryRule } from '../features/region/useRegionOptions'
import { translateDayName } from '../i18n/helpers'
import { useLanguage } from '../i18n/LanguageContext'
import type { TranslationKey } from '../i18n/LanguageContext'

const CATEGORY_LABELS = ['생활쓰레기', '음식물쓰레기', '재활용품'] as const

// rule.dow는 "월+수+금"처럼 요일 한 글자로만 구성되어 있어 안전하게 번역할 수 있다.
function formatDow(dow: string, t: (key: TranslationKey) => string): string {
  return dow
    .split('+')
    .map((day) => translateDayName(day.trim(), t))
    .join(', ')
}

// unclltDay(미수거일)는 요일 외에 "설날당일" 같은 공휴일 명절 표기도 섞여 있어(TASK.md 리스크 참고)
// 임의로 요일 사전에 매핑하면 안 됨 — 정부 원본 텍스트를 그대로(한국어로) 보여준다.
function formatUnclltDay(unclltDay: string): string {
  return unclltDay.split('+').join(', ')
}

function formatTimeRange(beginTime: string, endTime: string): string {
  return `${beginTime} ~ ${endTime}`
}

function CategoryCard({ label, rule }: { label: (typeof CATEGORY_LABELS)[number]; rule: CategoryRule }) {
  const { t } = useLanguage()
  return (
    <div className="mt-4 rounded-[16px] border border-line bg-card p-[17px]">
      <h4 className="mb-[10px] text-xs font-extrabold tracking-wider text-green-700 uppercase">
        {t(`category.${label}`)}
      </h4>
      <p className="text-[13.5px] leading-relaxed text-ink">{rule.method}</p>
      <p className="mt-2 text-[13px] text-sub">
        {t('rules.dowLabel')}
        {formatDow(rule.dow, t)}
        <br />
        {t('rules.timeLabel')}
        {formatTimeRange(rule.beginTime, rule.endTime)}
      </p>
    </div>
  )
}

function BulkWasteCard({ rule }: { rule: BulkWasteRule }) {
  const { t } = useLanguage()
  return (
    <div className="mt-4 rounded-[16px] border border-line bg-card p-[17px]">
      <h4 className="mb-[10px] text-xs font-extrabold tracking-wider text-green-700 uppercase">
        {t('category.대형폐기물')}
      </h4>
      <p className="text-[13.5px] leading-relaxed text-ink">{rule.method}</p>
      <p className="mt-2 text-[13px] text-sub">
        {t('rules.placeLabel')}
        {rule.place}
        <br />
        {t('rules.timeLabel')}
        {formatTimeRange(rule.beginTime, rule.endTime)}
      </p>
    </div>
  )
}

export default function RulesPage() {
  const { region, setRegion } = useSelectedRegion()
  const [isRegionSheetOpen, setRegionSheetOpen] = useState(false)
  const { data: regionRule, isLoading, isError } = useRegionRule(region)
  const { t } = useLanguage()

  const hasAnyCategory =
    regionRule && (regionRule.categories.생활쓰레기 || regionRule.categories.음식물쓰레기 || regionRule.categories.재활용품)

  return (
    <div>
      <PageHeader title={t('rules.title')} backTo="/" />
      <div className="px-5 pt-[18px] pb-[90px]">
        <button
          type="button"
          onClick={() => setRegionSheetOpen(true)}
          className="flex w-full items-center gap-[6px] rounded-pill border border-green-100 bg-green-50 px-[14px] py-[11px] text-left text-[13.5px] font-bold text-green-900"
        >
          📍 {region ? `${region.ctpvNm} / ${region.sggNm}` : t('home.selectRegionPlaceholder')}
          <span className="ml-auto">▾</span>
        </button>

        {!region ? (
          <p className="mt-3 text-sm text-sub">{t('rules.selectRegionBody')}</p>
        ) : isLoading ? (
          <p className="mt-3 text-sm text-sub">{t('common.loading')}</p>
        ) : isError ? (
          <p className="mt-3 text-sm text-sub">{t('rules.notFound')}</p>
        ) : regionRule ? (
          <>
            {hasAnyCategory ? (
              CATEGORY_LABELS.map((label) => {
                const rule = regionRule.categories[label]
                return rule ? <CategoryCard key={label} label={label} rule={rule} /> : null
              })
            ) : (
              <p className="mt-3 text-sm text-sub">{t('rules.noDetail')}</p>
            )}

            {regionRule.categories.대형폐기물 ? <BulkWasteCard rule={regionRule.categories.대형폐기물} /> : null}

            {regionRule.unclltDay ? (
              <div className="mt-4 rounded-[16px] bg-green-50 p-[17px] text-[13px] leading-relaxed text-green-900">
                <b>{t('rules.unclltDay')}</b>
                <br />
                {formatUnclltDay(regionRule.unclltDay)}
              </div>
            ) : null}

            <div className="mt-4 rounded-[16px] bg-green-50 p-[17px] text-[13px] leading-relaxed text-green-900">
              {t('rules.source')}
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
