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
              <p className="text-[13.5px] leading-relaxed text-ink">{data.disposalRule.method}</p>
            </div>

            <div className="mt-4 rounded-[16px] bg-green-100 p-[17px] text-[13px] leading-relaxed text-green-900">
              출처: 공공데이터포털 분리배출 정보조회 서비스 ({data.disposalRule.sourceRegion} 기준)
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
