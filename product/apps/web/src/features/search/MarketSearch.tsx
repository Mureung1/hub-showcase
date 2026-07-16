import { MapPinned, Search, Store } from "lucide-react";
import { useState } from "react";

import type { MarketSearchResult } from "./searchApi";
import { useMarketSearch } from "./useMarketSearch";

type MarketSearchProps = {
  onSelect: (result: MarketSearchResult) => void;
};

export function MarketSearch({ onSelect }: MarketSearchProps) {
  const [query, setQuery] = useState("");
  const { state, results, search, retry, clear } = useMarketSearch();

  return (
    <div className="market-search-shell">
      <form
        className="map-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          void search(query);
        }}
      >
        <button type="submit" aria-label="검색">
          <Search size={17} />
        </button>
        <input
          aria-label="상권 또는 점포 검색"
          value={query}
          maxLength={80}
          placeholder="상권명, 점포명, 주소, 업종 검색"
          onChange={(event) => {
            setQuery(event.target.value);
            if (state !== "idle") clear();
          }}
        />
      </form>
      {state !== "idle" && (
        <div className="market-search-results">
          {state === "input-error" && <p>검색어를 입력해 주세요.</p>}
          {state === "loading" && <p aria-live="polite">검색 중입니다.</p>}
          {state === "error" && (
            <p role="alert">
              검색 API에 연결할 수 없습니다. 예시 데이터로 대체하지 않습니다.
              <button type="button" onClick={retry}>
                다시 시도
              </button>
            </p>
          )}
          {state === "ready" && results.length === 0 && <p>검색 결과가 없습니다.</p>}
          {state === "ready" && results.length > 0 && (
            <ul aria-label="검색 결과">
              {results.map((result) => (
                <li key={`${result.result_type}:${result.id}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery(result.name);
                      clear();
                      onSelect(result);
                    }}
                  >
                    {result.result_type === "market" ? (
                      <MapPinned size={15} />
                    ) : (
                      <Store size={15} />
                    )}
                    <span>
                      <b>{result.name}</b>
                      <small>
                        {result.result_type === "store"
                          ? `${result.category_name ?? "업종 미분류"} · ${result.market_name}`
                          : (result.address ?? result.market_name)}
                      </small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
