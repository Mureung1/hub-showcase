import { useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useDisposalRule } from '../features/disposal/useDisposalRule'

export default function ResultPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const { data, isLoading, isError } = useDisposalRule(itemId)

  return (
    <div>
      <PageHeader title={data?.item.name ?? '배출 안내'} backTo="/search" />
      <div className="px-5 pt-[18px] pb-[90px]">
        {isLoading ? (
          <p className="text-sm text-sub">불러오는 중...</p>
        ) : isError ? (
          <p className="text-sm text-sub">해당 품목의 배출방법 정보를 찾을 수 없어요.</p>
        ) : data ? (
          <>
            <div className="font-display text-[22px] font-bold text-ink">{data.item.name}</div>

            <div className="mt-4 rounded-[16px] border border-line bg-card p-[17px]">
              <h4 className="mb-[10px] text-xs font-extrabold tracking-wider text-green-700 uppercase">
                배출 방법
              </h4>
              <ul className="space-y-2">
                {data.disposalRule.steps.map((step, index) => (
                  <li key={index} className="text-[13.5px] leading-relaxed text-ink">
                    {index + 1}. {step}
                  </li>
                ))}
              </ul>
            </div>

            {data.disposalRule.parts.length > 0 && (
              <div className="mt-4 rounded-[16px] border border-line bg-card p-[17px]">
                <h4 className="mb-[10px] text-xs font-extrabold tracking-wider text-green-700 uppercase">
                  부품별 분리
                </h4>
                {data.disposalRule.parts.map((part) => (
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

            {data.disposalRule.commonMistakes.length > 0 && (
              <div className="mt-4 rounded-[16px] border border-line bg-card p-[17px]">
                <h4 className="mb-[10px] text-xs font-extrabold tracking-wider text-green-700 uppercase">
                  자주 하는 실수
                </h4>
                <ul className="space-y-1">
                  {data.disposalRule.commonMistakes.map((mistake, index) => (
                    <li key={index} className="text-[13.5px] leading-relaxed text-ink">
                      ✕ {mistake}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.disposalRule.reason && (
              <div className="mt-4 rounded-[16px] bg-green-100 p-[17px] text-[13px] leading-relaxed text-green-900">
                <b>왜 이렇게 버려야 하나요?</b>
                <br />
                {data.disposalRule.reason}
              </div>
            )}

            <div className="mt-4 rounded-[16px] bg-green-50 p-[17px] text-[13px] leading-relaxed text-green-900">
              출처: 공공데이터포털 분리배출 정보조회 서비스 ({data.disposalRule.sourceRegion} 기준)
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
