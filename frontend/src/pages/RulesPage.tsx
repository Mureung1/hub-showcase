import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import RegionSelectSheet from '../features/region/RegionSelectSheet'
import { useSelectedRegion } from '../features/region/useSelectedRegion'
import { useRegionRule, type BulkWasteRule, type CategoryRule } from '../features/region/useRegionOptions'

const CATEGORY_LABELS = ['생활쓰레기', '음식물쓰레기', '재활용품'] as const

function formatDays(dow: string): string {
  return dow.split('+').join(', ')
}

function formatTimeRange(beginTime: string, endTime: string): string {
  return `${beginTime} ~ ${endTime}`
}

function CategoryCard({ label, rule }: { label: string; rule: CategoryRule }) {
  return (
    <div className="mt-4 rounded-[16px] border border-line bg-card p-[17px]">
      <h4 className="mb-[10px] text-xs font-extrabold tracking-wider text-green-700 uppercase">{label}</h4>
      <p className="text-[13.5px] leading-relaxed text-ink">{rule.method}</p>
      <p className="mt-2 text-[13px] text-sub">
        배출 요일: {formatDays(rule.dow)}
        <br />
        배출 시간: {formatTimeRange(rule.beginTime, rule.endTime)}
      </p>
    </div>
  )
}

function BulkWasteCard({ rule }: { rule: BulkWasteRule }) {
  return (
    <div className="mt-4 rounded-[16px] border border-line bg-card p-[17px]">
      <h4 className="mb-[10px] text-xs font-extrabold tracking-wider text-green-700 uppercase">대형폐기물</h4>
      <p className="text-[13.5px] leading-relaxed text-ink">{rule.method}</p>
      <p className="mt-2 text-[13px] text-sub">
        배출 장소: {rule.place}
        <br />
        배출 시간: {formatTimeRange(rule.beginTime, rule.endTime)}
      </p>
    </div>
  )
}

export default function RulesPage() {
  const { region, setRegion } = useSelectedRegion()
  const [isRegionSheetOpen, setRegionSheetOpen] = useState(false)
  const { data: regionRule, isLoading, isError } = useRegionRule(region)

  const hasAnyCategory =
    regionRule && (regionRule.categories.생활쓰레기 || regionRule.categories.음식물쓰레기 || regionRule.categories.재활용품)

  return (
    <div>
      <PageHeader title="배출 규정" backTo="/" />
      <div className="px-5 pt-[18px] pb-[90px]">
        <button
          type="button"
          onClick={() => setRegionSheetOpen(true)}
          className="flex w-full items-center gap-[6px] rounded-pill border border-green-100 bg-green-50 px-[14px] py-[11px] text-left text-[13.5px] font-bold text-green-900"
        >
          📍 {region ? `${region.ctpvNm} / ${region.sggNm}` : '지역을 선택해 주세요'}
          <span className="ml-auto">▾</span>
        </button>

        {!region ? (
          <p className="mt-3 text-sm text-sub">지역을 선택하면 해당 지역의 배출 규정을 보여드려요.</p>
        ) : isLoading ? (
          <p className="mt-3 text-sm text-sub">불러오는 중...</p>
        ) : isError ? (
          <p className="mt-3 text-sm text-sub">해당 지역의 배출 정보를 찾을 수 없어요.</p>
        ) : regionRule ? (
          <>
            {hasAnyCategory ? (
              CATEGORY_LABELS.map((label) => {
                const rule = regionRule.categories[label]
                return rule ? <CategoryCard key={label} label={label} rule={rule} /> : null
              })
            ) : (
              <p className="mt-3 text-sm text-sub">등록된 세부 배출 정보가 없어요.</p>
            )}

            {regionRule.categories.대형폐기물 ? <BulkWasteCard rule={regionRule.categories.대형폐기물} /> : null}

            {regionRule.unclltDay ? (
              <div className="mt-4 rounded-[16px] bg-green-50 p-[17px] text-[13px] leading-relaxed text-green-900">
                <b>미수거일</b>
                <br />
                {formatDays(regionRule.unclltDay)}
              </div>
            ) : null}

            <div className="mt-4 rounded-[16px] bg-green-50 p-[17px] text-[13px] leading-relaxed text-green-900">
              출처: 공공데이터포털 생활쓰레기배출정보 조회서비스
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
