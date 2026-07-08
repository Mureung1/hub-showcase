import { useState } from 'react';
import { requestPortfolio } from '../api/analyzeClient.js';

const EXAMPLE_JD = `[예시] 백엔드 개발자 채용

필수 요건
- Java, Spring Boot 기반 서비스 개발 경험
- MySQL 등 RDB 사용 경험

우대 사항
- Redis, Docker 사용 경험
- MSA 환경 이해

주요 업무
- 상품/주문 API 개발 및 운영`;

export default function PortfolioBuilder({ onBack }) {
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [jdText, setJdText] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | error | done
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState(null);
  const [showMarkdown, setShowMarkdown] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');
    setResult(null);

    try {
      const data = await requestPortfolio({ repositoryUrl, jdText });
      setResult(data);
      setStatus('done');
    } catch (err) {
      setErrorMessage(err.message);
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased py-16 px-6 max-w-4xl mx-auto">
      <button
        type="button"
        onClick={onBack}
        className="text-xs font-mono text-slate-400 hover:text-slate-600 mb-8"
      >
        ← 소개 페이지로 돌아가기
      </button>

      <h1 className="text-3xl font-black text-slate-950 tracking-tight mb-2">포트폴리오 생성기 (Prototype)</h1>
      <p className="text-sm text-slate-500 mb-10">
        공개 GitHub Repository 1개와 채용공고(JD)를 입력하면, README/설정 파일에서 확인되는 근거만으로 포트폴리오를 생성합니다.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-slate-400" htmlFor="repositoryUrl">
            GitHub Repository URL
          </label>
          <input
            id="repositoryUrl"
            type="text"
            required
            value={repositoryUrl}
            onChange={(e) => setRepositoryUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-slate-400" htmlFor="jdText">
            채용공고(JD) 텍스트
          </label>
          <textarea
            id="jdText"
            required
            rows={8}
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder={EXAMPLE_JD}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? '분석 중...' : '포트폴리오 생성'}
        </button>
      </form>

      {status === 'error' && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {status === 'loading' && (
        <div className="mt-6 p-4 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500">
          GitHub Repository 분석 및 JD 매칭을 진행하고 있습니다...
        </div>
      )}

      {status === 'done' && result && (
        <div className="mt-10 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">{result.portfolio.title}</h2>
            <button
              type="button"
              onClick={() => setShowMarkdown((v) => !v)}
              className="text-xs font-mono text-blue-600 hover:underline"
            >
              {showMarkdown ? '슬라이드 보기' : 'Markdown 원본 보기'}
            </button>
          </div>

          {showMarkdown ? (
            <pre className="whitespace-pre-wrap bg-slate-900 text-slate-100 text-xs p-6 rounded-xl overflow-x-auto">
              {result.portfolio.markdown}
            </pre>
          ) : (
            <div className="space-y-4">
              {result.portfolio.slides.map((slide, idx) => (
                <div key={idx} className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <div className="text-xs font-mono text-blue-600 font-bold mb-2">{slide.title}</div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{slide.content}</p>
                  {slide.evidence.length > 0 && (
                    <div className="mt-3 text-xs text-slate-400 font-mono">
                      Evidence: {slide.evidence.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="p-4 bg-slate-100 rounded-lg text-xs text-slate-500 font-mono">
            analysis_confidence: {result.projectMetadata.analysis_confidence} · matched skills: {result.matchingResult.highlight_points.join(', ') || '없음'}
          </div>
        </div>
      )}
    </div>
  );
}
