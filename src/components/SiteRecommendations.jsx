import { useEffect, useMemo, useState } from "react";

import { getRecommendationSites, recommendSites } from "../api.js";
import {
  SITE_INFORMATION_LABELS,
  SITE_INFORMATION_TYPES,
  SITE_PROVIDER_TYPE_LABELS,
} from "../constants/siteRecommendations.js";
import { findSavedRegistrySiteIds } from "../storage/noticeHistoryStore.js";

const LEGACY_TRACKED_SITES_STORAGE_KEY = "uniradar.trackedSites";

function labelsFor(types) {
  return types.map((type) => SITE_INFORMATION_LABELS[type]).filter(Boolean);
}

function CoverageList({ label, types, tone = "default" }) {
  if (!types?.length) return null;

  return (
    <div className={`coverage-item is-${tone}`}>
      <span>{label}</span>
      <strong>{labelsFor(types).join(", ")}</strong>
    </div>
  );
}

function RecommendationCard({ item, isSaved, onSave }) {
  const providerLabel = SITE_PROVIDER_TYPE_LABELS[item.providerType] || "등록 사이트";

  return (
    <article className="site-recommendation-card">
      <div className="site-recommendation-card-top">
        <div>
          <div className="site-recommendation-meta">
            <span className={item.trusted ? "site-trust-badge" : "site-trust-badge is-unverified"}>
              {item.trusted ? "공식·공공" : "확인 필요"}
            </span>
            <span>{providerLabel}</span>
          </div>
          <h3>{item.name}</h3>
        </div>
        <strong className="site-score" aria-label={`추천 점수 ${item.score}점`}>{item.score}</strong>
      </div>

      <p className="site-recommendation-reason">{item.recommendationReason}</p>

      {item.profileReasons?.length ? (
        <div className="site-detail-group">
          <span>프로필 관련성</span>
          <ul>{item.profileReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        </div>
      ) : null}

      {item.complementaryReasons?.length ? (
        <div className="site-detail-group">
          <span>현재 출처 범위 보완</span>
          <ul>{item.complementaryReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        </div>
      ) : null}

      <div className="site-chip-row" aria-label="제공 정보">
        {labelsFor(item.informationTypes).map((label) => <span key={label}>{label}</span>)}
      </div>

      {item.strengths?.length ? <p className="site-detail-line"><b>장점</b>{item.strengths.join(" · ")}</p> : null}
      {item.limitations?.length ? <p className="site-detail-line is-caution"><b>확인</b>{item.limitations.join(" · ")}</p> : null}

      <div className="site-recommendation-actions">
        <a href={item.url} target="_blank" rel="noreferrer">사이트 열기</a>
        <button className="compact-button" type="button" disabled={isSaved} onClick={() => onSave(item.siteId)}>
          {isSaved ? "저장된 출처" : "출처에 저장"}
        </button>
      </div>
    </article>
  );
}

export default function SiteRecommendations({ onAddSource, profile, savedSources = [] }) {
  const [sites, setSites] = useState([]);
  const [desiredInformation, setDesiredInformation] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState(null);
  const [isLoadingSites, setIsLoadingSites] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");

  useEffect(() => {
    let active = true;

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LEGACY_TRACKED_SITES_STORAGE_KEY);
    }

    getRecommendationSites()
      .then((response) => {
        if (active) setSites(Array.isArray(response.sites) ? response.sites : []);
      })
      .catch((error) => {
        if (active) setErrorMessage(error.message || "등록 사이트를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setIsLoadingSites(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const savedSourceSiteIds = useMemo(
    () => findSavedRegistrySiteIds(sites, savedSources),
    [savedSources, sites],
  );
  const savedSourceIdSet = useMemo(() => new Set(savedSourceSiteIds), [savedSourceSiteIds]);

  function toggleInformationType(type) {
    setDesiredInformation((currentTypes) => currentTypes.includes(type)
      ? currentTypes.filter((currentType) => currentType !== type)
      : [...currentTypes, type]);
  }

  async function requestRecommendations(nextSavedSourceSiteIds = savedSourceSiteIds) {
    if (!profile) {
      setErrorMessage("사이트 추천을 받으려면 먼저 프로필을 저장해주세요.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setNoticeMessage("");

    try {
      const response = await recommendSites({
        desiredInformation,
        keyword: keyword.trim() || null,
        profile,
        trackedSiteIds: nextSavedSourceSiteIds,
      });
      setResult(response);
      if (!response.recommendations?.length) {
        setNoticeMessage("현재 조건에서 추가로 추천할 등록 사이트가 없습니다.");
      }
    } catch (error) {
      setResult(null);
      setErrorMessage(error.message || "사이트 추천을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!isLoading) requestRecommendations();
  }

  async function handleAddSource(siteId) {
    const site = sites.find((item) => item.id === siteId);
    if (!site || savedSourceIdSet.has(siteId)) return;

    setErrorMessage("");
    try {
      await onAddSource?.(site);
      const nextSavedSourceSiteIds = Array.from(new Set([...savedSourceSiteIds, siteId]));
      setNoticeMessage(`${site.name}을(를) 저장된 출처에 추가했습니다.`);
      if (result) await requestRecommendations(nextSavedSourceSiteIds);
    } catch (error) {
      setErrorMessage(error.message || "추천 사이트를 저장된 출처에 추가하지 못했습니다.");
    }
  }

  return (
    <section className="site-recommendation-panel" aria-labelledby="site-recommendation-title">
      <header className="site-recommendation-header">
        <div>
          <p className="eyebrow">Site Recommendation</p>
          <h2 id="site-recommendation-title">정보 사이트 추천</h2>
        </div>
        <span className="notice-discovery-badge">등록 사이트 기반</span>
      </header>
      <p className="site-recommendation-helper">
        프로필과 저장된 출처를 비교해 부족한 정보 영역을 보완할 공식·공공 사이트를 추천합니다.
      </p>

      <form className="site-recommendation-form" onSubmit={handleSubmit}>
        <fieldset className="information-type-fieldset">
          <legend>원하는 정보 종류</legend>
          <div className="information-type-grid">
            {SITE_INFORMATION_TYPES.map((type) => (
              <label key={type}>
                <input type="checkbox" checked={desiredInformation.includes(type)} onChange={() => toggleInformationType(type)} />
                <span>{SITE_INFORMATION_LABELS[type]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="field">
          <span>추가 검색어 (선택)</span>
          <input value={keyword} maxLength={80} onChange={(event) => setKeyword(event.target.value)} placeholder="예: AI, 데이터, 창업" />
        </label>
        <button className="primary-button site-recommendation-submit" type="submit" disabled={isLoading || isLoadingSites || !profile}>
          {isLoading ? "추천 중" : "사이트 추천 받기"}
        </button>
      </form>

      {!profile ? <p className="notice-message is-error">프로필을 저장하면 관심 분야와 전공에 맞춰 추천할 수 있습니다.</p> : null}
      {noticeMessage ? <p className="notice-message" role="status">{noticeMessage}</p> : null}
      {errorMessage ? <p className="notice-message is-error" role="alert">{errorMessage}</p> : null}
      {isLoading ? <p className="site-recommendation-state" role="status">등록된 사이트를 비교해 추천 이유를 만들고 있습니다.</p> : null}

      {result?.coverage ? (
        <section className="coverage-summary" aria-label="정보 범위 요약">
          <CoverageList label="현재 확인" types={result.coverage.currentlyCovered} tone="covered" />
          <CoverageList label="부족 정보" types={result.coverage.missingCoverage} tone="missing" />
          <CoverageList label="추천으로 보완" types={result.coverage.newlyCovered} tone="new" />
          <CoverageList label="추가 확인" types={result.coverage.stillMissing} tone="remaining" />
        </section>
      ) : null}

      {result ? (
        <div className="site-recommendation-result">
          <div className="site-recommendation-result-heading">
            <h3>추천 결과</h3>
            <span>{result.mode === "gemini" ? "Gemini 설명 보조" : "규칙 기반 추천"}</span>
          </div>
          {result.fallbackUsed ? <p className="notice-message is-error">Gemini 설명 생성에 실패해 규칙 기반 추천 결과를 표시합니다. {result.fallbackReason}</p> : null}
          {!isLoading && !result.recommendations?.length ? <p className="site-recommendation-state">저장된 출처와 입력 조건을 모두 확인했지만 추가 후보가 없습니다.</p> : null}
          <div className="site-recommendation-list">
            {result.recommendations?.map((item) => (
              <RecommendationCard
                key={item.siteId}
                item={item}
                isSaved={savedSourceIdSet.has(item.siteId)}
                onSave={handleAddSource}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}