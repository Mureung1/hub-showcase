import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getArticle, markArticleRead, getArticleSummary, getArticleSimplified } from '../api/articles';
import { getBookmarks, addBookmark, removeBookmark } from '../api/bookmarks';
import ArticleAiPanel from '../components/ArticleAiPanel';
import TermHighlight from '../components/TermHighlight';

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// content를 terms 목록 기준으로 쪼개서, 매칭되는 부분마다 TermHighlight로 감싼 배열을 만든다
function renderWithTermHighlights(content, terms) {
  if (!terms || terms.length === 0) return content;

  const termByName = new Map(terms.map((t) => [t.term, t]));
  const longestFirst = [...terms].sort((a, b) => b.term.length - a.term.length); // 짧은 용어가 긴 용어의 일부를 먼저 먹지 않도록
  const pattern = new RegExp(`(${longestFirst.map((t) => escapeRegExp(t.term)).join('|')})`, 'g');

  return content.split(pattern).map((part, i) => {
    const matched = termByName.get(part);
    if (!matched) return part;
    return (
      <TermHighlight key={i} term={matched.term} explanation={matched.explanation}>
        {part}
      </TermHighlight>
    );
  });
}

export default function Article() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [aiMode, setAiMode] = useState(null); // 'summary' | 'simplify' | null — AI 요약/쉽게 설명 중 지금 뭘 보여주는 중인지
  const [simplifyLevel, setSimplifyLevel] = useState('easy'); // '쉽게 설명' 전용 난이도, 'AI 요약'엔 영향 없음
  const [summaryContent, setSummaryContent] = useState(null); // 난이도 없는 단일 요약, 재클릭 시 재요청 방지용 캐시 겸용
  const [simplifiedByLevel, setSimplifiedByLevel] = useState({}); // level -> content
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  function fetchSimplified(level) {
    setAiError(null);
    if (simplifiedByLevel[level]) return; // 이미 받아온 레벨이면 재요청 안 함

    setAiLoading(true);
    getArticleSimplified(id, level)
      .then((data) => {
        setSimplifiedByLevel((prev) => ({ ...prev, [level]: data.content }));
      })
      .catch((err) => setAiError(err.message))
      .finally(() => setAiLoading(false));
  }

  function handleSelectSimplifyLevel(level) {
    setSimplifyLevel(level);
    if (aiMode === 'simplify') fetchSimplified(level); // 이미 '쉽게 설명' 보는 중이면 난이도 바꿀 때 바로 재요청
  }

  function handleClickSummary() {
    setAiMode('summary');
    setAiError(null);
    if (summaryContent) return;

    setAiLoading(true);
    getArticleSummary(id)
      .then((data) => setSummaryContent(data.content))
      .catch((err) => setAiError(err.message))
      .finally(() => setAiLoading(false));
  }

  function handleClickSimplify() {
    setAiMode('simplify');
    fetchSimplified(simplifyLevel);
  }

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([getArticle(id), getBookmarks()])
      .then(([articleData, bookmarks]) => {
        setArticle(articleData);
        setIsBookmarked(bookmarks.some((b) => b.article.id === id));
        markArticleRead(id).catch(() => {});
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleToggleBookmark() {
    setIsBookmarked((prev) => !prev);
    try {
      if (isBookmarked) await removeBookmark(id);
      else await addBookmark(id);
    } catch (err) {
      setIsBookmarked((prev) => !prev);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="font-body-md text-body-md text-on-surface-variant">불러오는 중...</p>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="font-body-md text-body-md text-error">{error || 'not_found'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-container-padding py-stack-lg flex gap-stack-lg items-start justify-center">
      <div className="max-w-2xl w-full">
        <Link
          to="/"
          className="inline-flex items-center gap-1 font-label-mono text-label-mono uppercase tracking-wide text-primary mb-stack-lg"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          피드로
        </Link>

        <div className="flex items-center gap-stack-sm mb-stack-sm">
          <span className="font-label-mono text-label-mono uppercase tracking-wide bg-surface-container-low text-on-surface-variant px-2 py-1 rounded">
            {article.source}
          </span>
          <span className="font-caption text-caption text-on-surface-variant">
            {new Date(article.publishedAt).toLocaleString('ko-KR')}
          </span>
        </div>

        <div className="flex items-start justify-between gap-stack-md mb-stack-lg">
          <h1 className="font-headline-sm text-headline-sm text-on-surface">
            {article.title}
          </h1>
          <button
            type="button"
            onClick={handleToggleBookmark}
            aria-label={isBookmarked ? '북마크 해제' : '북마크 추가'}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded bg-btn-gray"
          >
            <span
              className="material-symbols-outlined text-[20px] text-on-surface"
              style={{ fontVariationSettings: isBookmarked ? "'FILL' 1" : "'FILL' 0" }}
            >
              bookmark
            </span>
          </button>
        </div>

        {article.content ? (
          <p className="font-body-lg text-body-lg text-on-surface whitespace-pre-line">
            {renderWithTermHighlights(article.content, article.terms)}
          </p>
        ) : (
          <p className="font-body-md text-body-md text-on-surface-variant">
            본문을 불러오지 못했어요. 원문 링크를 확인해주세요.
          </p>
        )}
      </div>

      <ArticleAiPanel
        mode={aiMode}
        simplifyLevel={simplifyLevel}
        onSelectSimplifyLevel={handleSelectSimplifyLevel}
        onClickSummary={handleClickSummary}
        onClickSimplify={handleClickSimplify}
        loading={aiLoading}
        error={aiError}
        content={aiMode === 'summary' ? summaryContent : simplifiedByLevel[simplifyLevel]}
      />
      </div>
    </div>
  );
}
