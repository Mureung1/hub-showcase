import { useState } from 'react';
import { createRepository, createInterview, sendMessage, exportMarkdownUrl } from './api/client.js';

function UrlStep({ onSubmit, loading, error }) {
  const [url, setUrl] = useState('');

  return (
    <div className="card" style={{ maxWidth: 480, margin: '80px auto' }}>
      <h1 style={{ fontSize: 'var(--font-size-title)', fontWeight: 'var(--font-weight-bold)', marginTop: 0 }}>
        📁 GitHub 저장소 URL 입력
      </h1>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        분석할 GitHub 저장소 URL을 입력하면 인터뷰가 시작됩니다.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(url);
        }}
        style={{ display: 'flex', gap: 'var(--space-2)' }}
      >
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          required
          style={{
            flex: 1,
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-control)',
            border: '1px solid var(--color-border-strong)',
            fontSize: 'var(--font-size-body)',
          }}
        />
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? '분석 중...' : '시작'}
        </button>
      </form>
      {error && <p style={{ color: '#D64545', marginBottom: 0 }}>{error}</p>}
    </div>
  );
}

function ChatStep({ question, citedCode, onSubmit, loading, error }) {
  const [answer, setAnswer] = useState('');

  return (
    <div className="card" style={{ maxWidth: 640, margin: '60px auto' }}>
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
          rows={5}
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
    <div className="card" style={{ maxWidth: 720, margin: '60px auto' }}>
      <h1 style={{ fontSize: 'var(--font-size-title)', fontWeight: 'var(--font-weight-bold)', marginTop: 0 }}>
        📄 포트폴리오 초안
      </h1>
      <pre
        style={{
          background: 'var(--color-bg-subtle)',
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-control)',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          fontSize: 'var(--font-size-body)',
        }}
      >
        {markdown}
      </pre>
      <a href={exportMarkdownUrl(interviewId)} download="portfolio.md">
        <button className="btn-primary">마크다운 다운로드</button>
      </a>
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
        setCitedCode(null);
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
    <div style={{ minHeight: '100vh', padding: 'var(--page-margin)' }}>
      {step === 'url' && <UrlStep onSubmit={handleUrlSubmit} loading={loading} error={error} />}
      {step === 'chat' && (
        <ChatStep question={question} citedCode={citedCode} onSubmit={handleAnswerSubmit} loading={loading} error={error} />
      )}
      {step === 'done' && <DoneStep markdown={markdown} interviewId={interviewId} />}
    </div>
  );
}
