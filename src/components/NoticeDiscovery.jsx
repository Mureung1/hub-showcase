import { useEffect, useState } from "react";

import { discoverNotices, getNoticeSources } from "../api.js";

function formatPublishedAt(value) {
  if (!value) return null;
  return value.replaceAll("-", ".");
}

export default function NoticeDiscovery({ accessToken }) {
  const [sources, setSources] = useState([]);
  const [sourceId, setSourceId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [items, setItems] = useState(null);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");

  useEffect(() => {
    let active = true;

    getNoticeSources()
      .then((response) => {
        if (!active) return;
        const availableSources = Array.isArray(response.sources) ? response.sources : [];
        setSources(availableSources);
        setSourceId((current) => current || availableSources[0]?.id || "");
      })
      .catch((error) => {
        if (active) setErrorMessage(error.message || "공지 출처를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setIsLoadingSources(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedSource = sources.find((source) => source.id === sourceId) ?? null;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!sourceId || isDiscovering) return;

    setIsDiscovering(true);
    setErrorMessage("");
    setNoticeMessage("");
    setItems(null);

    try {
      const response = await discoverNotices({ keyword, sourceId }, accessToken);
      const candidates = Array.isArray(response.items) ? response.items : [];
      setItems(candidates);
      if (response.cached) setNoticeMessage("최근 탐색 결과를 표시하고 있습니다.");
    } catch (error) {
      setErrorMessage(error.message || "공지 목록을 가져오지 못했습니다.");
    } finally {
      setIsDiscovering(false);
    }
  }


  return (
    <section className="notice-discovery-panel" aria-labelledby="notice-discovery-title">
      <header className="notice-discovery-header">
        <div>
          <p className="eyebrow">Notice Discovery</p>
          <h2 id="notice-discovery-title">지원 공지 탐색</h2>
        </div>
        <span className="notice-discovery-badge">등록 출처만 조회</span>
      </header>

      <p className="notice-discovery-helper">
        공개 공지 목록에서 제목과 원문 링크를 찾습니다. 상세 본문은 자동으로 읽지 않습니다.
      </p>

      <form className="notice-discovery-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>출처</span>
          <select
            disabled={isLoadingSources || !sources.length}
            value={sourceId}
            onChange={(event) => setSourceId(event.target.value)}
          >
            {isLoadingSources ? <option>출처 불러오는 중</option> : null}
            {!isLoadingSources && !sources.length ? <option>사용 가능한 출처 없음</option> : null}
            {sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>검색어 (선택)</span>
          <input
            type="search"
            value={keyword}
            maxLength={80}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="예: 장학금, AI, 봉사"
          />
        </label>
        <button className="primary-button notice-discovery-submit" type="submit" disabled={!sourceId || isDiscovering}>
          {isDiscovering ? "탐색 중" : "공지 찾기"}
        </button>
      </form>

      {selectedSource && !selectedSource.supportsDetailExtraction ? (
        <p className="notice-discovery-detail-note">선택한 출처는 목록 정보만 제공합니다. 상세 공지는 원문 링크에서 확인하세요.</p>
      ) : null}
      {noticeMessage ? <p className="notice-message">{noticeMessage}</p> : null}
      {errorMessage ? <p className="notice-message is-error" role="alert">{errorMessage}</p> : null}
      {isDiscovering ? <p className="notice-discovery-state" role="status">공지 목록을 확인하고 있습니다.</p> : null}
      {!isDiscovering && items?.length === 0 ? <p className="notice-discovery-state">조건에 맞는 공지가 없습니다.</p> : null}

      {items?.length ? (
        <ul className="notice-candidate-list" aria-label="찾은 공지">
          {items.map((candidate) => (
            <li className="notice-candidate" key={candidate.id}>
              <div className="notice-candidate-copy">
                <div className="notice-candidate-meta">
                  <span>{candidate.sourceName}</span>
                  {candidate.category ? <span>{candidate.category}</span> : null}
                  {formatPublishedAt(candidate.publishedAt) ? <time dateTime={candidate.publishedAt}>{formatPublishedAt(candidate.publishedAt)}</time> : null}
                </div>
                <strong>{candidate.title}</strong>
                {candidate.snippet ? <p>{candidate.snippet}</p> : null}
              </div>
              <div className="notice-candidate-actions">
                <a href={candidate.url} target="_blank" rel="noreferrer">원문 보기</a>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
