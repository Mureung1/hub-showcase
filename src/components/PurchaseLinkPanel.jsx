import { useEffect, useState } from 'react'
import { buildNaverSearchUrl, buildCoupangSearchUrl, fetchNaverProducts, estimateCoupangPrice } from '../utils/purchaseLinks'

function PurchaseLinkPanel({ ingredient }) {
  const [naverProduct, setNaverProduct] = useState(null)
  const [status, setStatus] = useState('idle') // idle | loading | error | done

  useEffect(() => {
    if (!ingredient) {
      setNaverProduct(null)
      setStatus('idle')
      return
    }

    let cancelled = false
    setStatus('loading')

    fetchNaverProducts(ingredient.name)
      .then((items) => {
        if (cancelled) return
        setNaverProduct(items[0] ?? null)
        setStatus('done')
      })
      .catch(() => {
        if (cancelled) return
        setNaverProduct(null)
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [ingredient])

  if (!ingredient) {
    return (
      <div className="rounded-card border border-border bg-bg-surface p-4 text-sm text-text-secondary">
        재료를 클릭하면 최저가를 바로 확인할 수 있어요.
      </div>
    )
  }

  const coupangPrice = naverProduct ? estimateCoupangPrice(naverProduct.price) : null
  const lowest =
    naverProduct && coupangPrice != null
      ? coupangPrice < naverProduct.price
        ? { price: coupangPrice, link: buildCoupangSearchUrl(ingredient.name) }
        : { price: naverProduct.price, link: naverProduct.link }
      : null

  return (
    <div className="rounded-card border border-border bg-bg-surface p-4">
      <p className="text-sm text-text-secondary">선택한 재료</p>
      <p className="mt-1 text-lg font-bold text-text-primary">{ingredient.name}</p>

      {status === 'loading' && <p className="mt-4 text-sm text-text-secondary">최저가 검색 중...</p>}

      {status === 'done' && naverProduct && lowest && (
        <>
          <div className="mt-4 rounded-card bg-primary-soft p-3">
            <p className="text-xs text-primary-text">최저가</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-xl font-extrabold text-primary-text">{lowest.price.toLocaleString()}원</span>
              <a
                href={lowest.link}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-text-primary transition hover:brightness-95"
              >
                최저가 구매하기
              </a>
            </div>
          </div>

          <p className="mt-4 text-xs font-semibold text-text-secondary">쇼핑몰별 최저가</p>
          <ul className="mt-2 flex flex-col divide-y divide-border">
            <li>
              <a
                href={naverProduct.link}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 py-3 transition hover:bg-bg-muted"
              >
                <span className="font-semibold text-text-primary">네이버 · {naverProduct.mallName}</span>
                <span className="shrink-0 font-bold text-primary-text">{naverProduct.price.toLocaleString()}원</span>
              </a>
            </li>
            <li>
              <a
                href={buildCoupangSearchUrl(ingredient.name)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 py-3 transition hover:bg-bg-muted"
              >
                <span className="font-semibold text-text-primary">쿠팡</span>
                <span className="shrink-0 font-bold text-primary-text">
                  {coupangPrice.toLocaleString()}원 <span className="text-[10px] font-normal text-text-secondary">(예상)</span>
                </span>
              </a>
            </li>
          </ul>
        </>
      )}

      {(status === 'error' || (status === 'done' && !naverProduct)) && (
        <>
          <p className="mt-4 text-sm text-text-secondary">검색 결과를 가져오지 못했어요. 아래 링크로 직접 찾아보세요.</p>
          <div className="mt-3 flex flex-col gap-2">
            <a
              href={buildNaverSearchUrl(ingredient.name)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-border bg-bg-surface px-4 py-2 text-center text-sm font-medium text-text-primary transition hover:bg-bg-muted"
            >
              네이버에서 검색
            </a>
            <a
              href={buildCoupangSearchUrl(ingredient.name)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-border bg-bg-surface px-4 py-2 text-center text-sm font-medium text-text-primary transition hover:bg-bg-muted"
            >
              쿠팡에서 검색
            </a>
          </div>
        </>
      )}

      <p className="mt-3 text-xs text-text-secondary">쿠팡은 실제 최저가 연동 전이라 추정 가격이에요.</p>
    </div>
  )
}

export default PurchaseLinkPanel
