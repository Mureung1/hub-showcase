import { useEffect, useState } from 'react'
import { buildNaverSearchUrl, buildCoupangSearchUrl, fetchNaverProducts, estimateCoupangPrice } from '../utils/purchaseLinks'

function PurchaseLinkPanel({ ingredient, pickedLink = null, onTogglePick }) {
  const [naverProducts, setNaverProducts] = useState([])
  const [status, setStatus] = useState('idle') // idle | loading | error | done

  useEffect(() => {
    if (!ingredient) {
      setNaverProducts([])
      setStatus('idle')
      return
    }

    let cancelled = false
    setStatus('loading')

    fetchNaverProducts(ingredient.name)
      .then((items) => {
        if (cancelled) return
        setNaverProducts(items)
        setStatus('done')
      })
      .catch(() => {
        if (cancelled) return
        setNaverProducts([])
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

  const cheapest = naverProducts[0] ?? null

  return (
    <div className="rounded-card border border-border bg-bg-surface p-4">
      <p className="text-sm text-text-secondary">선택한 재료</p>
      <p className="mt-1 text-lg font-bold text-text-primary">{ingredient.name}</p>

      {status === 'loading' && <p className="mt-4 text-sm text-text-secondary">최저가 검색 중...</p>}

      {status === 'done' && cheapest && (
        <>
          <div className="mt-4 rounded-card bg-primary-soft p-3">
            <p className="text-xs text-primary-text">최저가</p>
            <p className="mt-0.5 truncate text-xs text-primary-text" title={cheapest.title}>
              {cheapest.title}
            </p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-xl font-extrabold text-primary-text">{cheapest.price.toLocaleString()}원</span>
              <a
                href={cheapest.link}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-text-primary transition hover:brightness-95"
              >
                최저가 구매하기
              </a>
            </div>
          </div>

          <p className="mt-4 text-xs font-semibold text-text-secondary">
            네이버 판매처별 가격 비교 ({naverProducts.length}개) · 체크하면 아래 구매 버튼으로 한 번에 열 수 있어요
          </p>
          <ul className="mt-2 flex flex-col divide-y divide-border">
            {naverProducts.map((product) => (
              <li key={product.link} className="flex items-start gap-2 py-3">
                <input
                  type="checkbox"
                  checked={pickedLink === product.link}
                  onChange={() => onTogglePick(product)}
                  className="mt-1 h-4 w-4 shrink-0 accent-primary"
                  aria-label={`${product.title} 선택`}
                />
                <a
                  href={product.link}
                  target="_blank"
                  rel="noreferrer"
                  title={product.title}
                  className="flex min-w-0 flex-1 flex-col gap-1 transition hover:bg-bg-muted"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate font-semibold text-text-primary">{product.title}</span>
                    <span className="flex shrink-0 flex-col items-end font-bold text-primary-text">
                      {product.price.toLocaleString()}원
                      {product.unitPrice && (
                        <span className="text-[10px] font-normal text-text-secondary">
                          ({product.unitPrice.label} {product.unitPrice.value.toLocaleString()}원)
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                    {product.mallName === '네이버' ? '네이버' : `${product.mallName} · 네이버`}
                    {product.isCatalogMatch && (
                      <span className="rounded-pill bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary-text">
                        가격비교 확인
                      </span>
                    )}
                  </span>
                </a>
              </li>
            ))}
            <li>
              <a
                href={buildCoupangSearchUrl(ingredient.name)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 py-3 transition hover:bg-bg-muted"
              >
                <span className="font-semibold text-text-secondary line-through">쿠팡 추정가 (미구현)</span>
                <span className="shrink-0 font-bold text-text-secondary line-through">
                  {estimateCoupangPrice(cheapest.price).toLocaleString()}원
                </span>
              </a>
            </li>
          </ul>
        </>
      )}

      {(status === 'error' || (status === 'done' && !cheapest)) && (
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
              className="rounded-full border border-border bg-bg-surface px-4 py-2 text-center text-sm font-medium text-text-primary line-through transition hover:bg-bg-muted"
            >
              쿠팡에서 검색
            </a>
          </div>
        </>
      )}

      <p className="mt-3 text-xs text-text-secondary">
        목록 중 판매처가 "쿠팡"인 항목은 네이버쇼핑이 가져온 실제 가격이에요. 맨 아래 취소선 표시된 "쿠팡 추정가"만 저희가 계산한 예상치(검색 링크만 제공)예요.
      </p>
    </div>
  )
}

export default PurchaseLinkPanel
