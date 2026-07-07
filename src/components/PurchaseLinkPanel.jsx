import { buildNaverSearchUrl, buildCoupangSearchUrl } from '../utils/purchaseLinks'

function PurchaseLinkPanel({ ingredient }) {
  if (!ingredient) {
    return (
      <div className="rounded-xl border border-orange-100 bg-white p-4 text-sm text-gray-500">
        재료를 클릭하면 네이버·쿠팡 검색 결과를 바로 확인할 수 있어요.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-orange-100 bg-white p-4">
      <p className="text-sm text-gray-500">선택한 재료</p>
      <p className="mt-1 text-lg font-bold text-gray-900">{ingredient.name}</p>
      <div className="mt-4 flex flex-col gap-2">
        <a
          href={buildNaverSearchUrl(ingredient.name)}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-center font-medium text-orange-700 transition hover:bg-orange-100"
        >
          네이버에서 검색
        </a>
        <a
          href={buildCoupangSearchUrl(ingredient.name)}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-center font-medium text-orange-700 transition hover:bg-orange-100"
        >
          쿠팡에서 검색
        </a>
      </div>
      <p className="mt-3 text-xs text-gray-400">
        실제 최저가 비교는 준비 중이에요. 지금은 검색 결과로 바로 연결돼요.
      </p>
    </div>
  )
}

export default PurchaseLinkPanel
