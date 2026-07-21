import { useState } from 'react';
import { createRepository, createInterview, sendMessage, exportMarkdownUrl } from './api/client.js';

function TopBar() {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-6)',
        background: 'var(--color-bg-elevated)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <span style={{ display: 'flex', gap: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FEBC2E' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }} />
      </span>
      <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-weight-medium)' }}>
        Portfolio Zero-to-One Builder
      </span>
    </header>
  );
}

function UrlStep({ onSubmit, loading, error }) {
  const [url, setUrl] = useState('');

  return (
    <div style={{ maxWidth: 560, width: '100%' }}>
      <h1
        style={{
          fontSize: 'var(--font-size-display)',
          fontWeight: 'var(--font-weight-bold)',
          lineHeight: 'var(--line-height-tight)',
          letterSpacing: '-0.02em',
          margin: 0,
        }}
      >
        📁 GitHub 저장소로<br />포트폴리오 초안 만들기
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-title)', marginTop: 'var(--space-4)' }}>
        저장소 URL을 입력하면 코드 기반 질문으로 인터뷰가 시작됩니다.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(url);
        }}
        style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-6)' }}
      >
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          required
          style={{
            flex: 1,
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-control)',
            border: '1px solid var(--color-border-strong)',
            fontSize: 'var(--font-size-body)',
            background: 'var(--color-bg-surface)',
          }}
        />
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? '후보 파일 코드를 가져오는 중...' : '시작'}
        </button>
      </form>
      {error && <p style={{ color: '#D64545' }}>{error}</p>}
    </div>
  );
}

function ChatStep({ question, citedCode, onSubmit, loading, error }) {
  const [answer, setAnswer] = useState('');

  return (
    <div className="card" style={{ maxWidth: 760, width: '100%' }}>
      <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-caption)', margin: 0 }}>
        질문 (읽기전용)
      </p>
      <p style={{ fontSize: 'var(--font-size-title)', fontWeight: 'var(--font-weight-medium)' }}>
        {question}
      </p>
      {citedCode && (
        <pre
          style={{
            background: 'var(--color-bg-subtle)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-control)',
            overflowX: 'auto',
            overflowY: 'auto',
            maxHeight: 320,
            fontSize: 'var(--font-size-caption)',
          }}
        >
          {citedCode}
        </pre>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(answer);
          setAnswer('');
        }}
      >
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="답변을 입력하세요"
          required
          rows={8}
          style={{
            width: '100%',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-control)',
            border: '1px solid var(--color-border-strong)',
            fontSize: 'var(--font-size-body)',
            resize: 'vertical',
          }}
        />
        <div style={{ marginTop: 'var(--space-3)', textAlign: 'right' }}>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? '전송 중...' : '답변 제출'}
          </button>
        </div>
      </form>
      {error && <p style={{ color: '#D64545' }}>{error}</p>}
    </div>
  );
}

function DoneStep({ markdown, interviewId }) {
  return (
    <div className="card" style={{ maxWidth: 960, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 'var(--font-size-title)', fontWeight: 'var(--font-weight-bold)', margin: 0 }}>
          📄 포트폴리오 초안
        </h1>
        <a href={exportMarkdownUrl(interviewId)} download="portfolio.md">
          <button className="btn-primary">마크다운 다운로드</button>
        </a>
      </div>
      <pre
        style={{
          background: 'var(--color-bg-subtle)',
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-control)',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          fontSize: 'var(--font-size-body)',
          marginTop: 'var(--space-4)',
        }}
      >
        {markdown}
      </pre>
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState('url');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [interviewId, setInterviewId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [citedCode, setCitedCode] = useState(null);
  const [markdown, setMarkdown] = useState('');

  async function handleUrlSubmit(url) {
    setLoading(true);
    setError(null);
    try {
      const repo = await createRepository(url);
      const interview = await createInterview(repo.repository_id);
      setInterviewId(interview.interview_id);
      setQuestion(interview.question);
      setCitedCode(interview.cited_code);
      setStep('chat');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnswerSubmit(answer) {
    setLoading(true);
    setError(null);
    try {
      const result = await sendMessage(interviewId, answer);
      setMarkdown(result.portfolio_markdown);
      if (result.next_question) {
        setQuestion(result.next_question);
        setCitedCode(result.next_cited_code);
      } else {
        setStep('done');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      <TopBar />
      <main
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-7) var(--page-margin)',
        }}
      >
        {step === 'url' && <UrlStep onSubmit={handleUrlSubmit} loading={loading} error={error} />}
        {step === 'chat' && (
          <ChatStep question={question} citedCode={citedCode} onSubmit={handleAnswerSubmit} loading={loading} error={error} />
        )}
        {step === 'done' && <DoneStep markdown={markdown} interviewId={interviewId} />}
      </main>
    </div>
  );
}
