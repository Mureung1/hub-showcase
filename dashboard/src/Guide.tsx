import { useState } from 'react';
import Ajv from 'ajv/dist/2020.js';
import schema from '../schemas/showcase.schema.json';
import exampleShowcase from '../../showcase/showcase.example.json';
import './guide.css';

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

const emptyShowcase = {
  schemaVersion: 1,
  title: '',
  summary: '',
  githubUser: '',
  demoUrl: '',
  demoVideoUrl: '',
  thumbnail: '',
  screenshots: [],
  problem: '',
  targetUsers: [],
  features: [],
  featureTags: [],
  techStack: [],
  techHighlights: [],
  developmentWithAI: '',
  agent: {
    summary: '',
    agentTools: [],
    workflows: [],
  },
};

function formatErrors(errors: typeof validate.errors) {
  return (errors ?? []).map((error) => {
    const path = error.instancePath || '/';
    const allowed = error.params.allowedValues as string[] | undefined;
    return allowed
      ? `${path} ${error.message} (허용값: ${allowed.join(', ')})`
      : `${path} ${error.message ?? '형식이 올바르지 않습니다.'}`;
  });
}

export default function Guide() {
  const [exampleText, setExampleText] = useState(() => JSON.stringify(exampleShowcase, null, 2));
  const [sampleOpen, setSampleOpen] = useState(false);
  const [copyState, setCopyState] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [result, setResult] = useState<{ ok: boolean; messages: string[] } | null>(null);

  const validateJson = () => {
    try {
      const value = JSON.parse(jsonText);
      const valid = validate(value);
      setResult({
        ok: valid,
        messages: valid ? ['작성 형식이 올바릅니다.'] : formatErrors(validate.errors),
      });
    } catch (error) {
      setResult({
        ok: false,
        messages: [error instanceof Error ? `JSON 문법 오류: ${error.message}` : 'JSON 문법을 확인하세요.'],
      });
    }
  };

  const copyExample = async () => {
    await navigator.clipboard.writeText(exampleText);
    setCopyState('복사했습니다.');
    window.setTimeout(() => setCopyState(''), 1800);
  };

  const downloadEmptyShowcase = () => {
    const content = `${JSON.stringify(emptyShowcase, null, 2)}\n`;
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'showcase.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="guide-page">
      <header className="guide-header">
        <p className="guide-eyebrow">AI Agent Challenge 2026</p>
        <h1>Showcase 작성 가이드</h1>
        <p>예시 파일을 복사하고, 프로젝트 내용을 바꾼 뒤 형식을 검사하세요.</p>
      </header>

      <section className="guide-section guide-instructions">
        <h2>해야 할 것</h2>
        <ol>
          <li><strong>showcase.json을 PR에 포함하세요.</strong></li>
          <li><strong>아래 예시를 참고해 파일을 작성하세요.</strong></li>
        </ol>
      </section>

      <section className="guide-section guide-folder">
        <h2>파일 구조</h2>
        <p>여러분 프로젝트 최상위에 `showcase` 폴더를 생성하고 JSON과 썸네일, 기타 스크린샷 이미지를 넣습니다.</p>
        <pre>{`showcase/
├── showcase.json
├── thumbnail.webp
└── screenshots/
    └── home.webp`}</pre>
      </section>

      <section className="guide-section guide-example">
        <div className="section-heading">
          <div>
            <h2>showcase.json 예시</h2>
            <p>아래에서 편집하고, 복사해서 사용하세요.</p>
            <p><code>githubUser</code>는 <code>github_id(이름)</code> 형식으로 작성합니다. 예: <code>crong(윤지수)</code></p>
          </div>
          <div className="guide-example-actions">
            <button type="button" onClick={() => setSampleOpen((open) => !open)}>
              {sampleOpen ? '샘플 닫기' : '샘플 열어보기'}
            </button>
            <button type="button" onClick={downloadEmptyShowcase}>빈 showcase.json 다운로드</button>
          </div>
        </div>
        {sampleOpen && (
          <>
            <textarea
              className="example-editor"
              value={exampleText}
              onChange={(event) => setExampleText(event.target.value)}
              spellCheck={false}
              aria-label="showcase JSON 샘플"
            />
            <div className="example-actions">
              <button type="button" onClick={copyExample}>내용 복사</button>
              {copyState && <span>{copyState}</span>}
            </div>
          </>
        )}
      </section>

      <section className="guide-section guide-validator">
        <div className="section-heading">
          <div>
            <h2>showcase.json 형식 검사</h2>
            <p>showcase를 작성하셨으면 아래에서 검사해보세요.</p>
          </div>
          <button type="button" onClick={() => { setJsonText(''); setResult(null); }}>지우기</button>
        </div>
        <textarea
          value={jsonText}
          onChange={(event) => { setJsonText(event.target.value); setResult(null); }}
          placeholder="showcase.json 내용을 붙여넣으세요."
          spellCheck={false}
          aria-label="showcase JSON 입력"
        />
        <button className="validate-button" type="button" onClick={validateJson} disabled={!jsonText.trim()}>
          검사하기
        </button>
        {result && (
          <div className={`validation-result ${result.ok ? 'valid' : 'invalid'}`} role="status">
            <strong>{result.ok ? '작성 형식이 올바릅니다.' : '확인이 필요합니다.'}</strong>
            {!result.ok && <ul>{result.messages.map((message) => <li key={message}>{message}</li>)}</ul>}
          </div>
        )}
      </section>

      <section className="guide-section guide-faq">
        <h2>자주 묻는 질문</h2>
        <div className="faq-list">
          <details>
            <summary>이미지 경로는 어떻게 작성하나요?</summary>
            <p><code>showcase</code> 폴더를 기준으로 작성합니다. 썸네일은 <code>thumbnail.webp</code>, 추가 화면은 <code>screenshots/home.webp</code>처럼 적습니다.</p>
          </details>
          <details>
            <summary>이미지 URL을 적어도 되나요?</summary>
            <p>외부 URL은 사용할 수 없습니다. 이미지를 <code>showcase</code> 폴더에 넣고 상대 경로를 작성하세요.</p>
          </details>
          <details>
            <summary>이미지 파일이 없으면 프로젝트가 사라지나요?</summary>
            <p>프로젝트 내용은 표시됩니다. 대표 이미지는 기본 이미지로 바뀌고, 없는 추가 화면은 표시하지 않습니다.</p>
          </details>
          <details>
            <summary>내용을 모두 작성해야 하나요?</summary>
            <p>일부 내용이 비어 있어도 표시됩니다. 값이 없는 항목은 화면에서 숨깁니다. 제목과 설명 등 표시할 내용이 전혀 없으면 제외됩니다.</p>
          </details>
          <details>
            <summary>배포 링크와 시연 영상 링크는 어디에 넣나요?</summary>
            <p><code>demoUrl</code>에는 서비스 주소를, <code>demoVideoUrl</code>에는 YouTube나 Drive 같은 시연 영상의 <code>https://</code> 주소를 넣습니다.</p>
          </details>
          <details>
            <summary>작성한 내용은 언제 사이트에 나오나요?</summary>
            <p>PR이 머지된 뒤 정해진 수집 작업이 실행되면 반영됩니다. 이미지와 JSON을 함께 확인한 뒤 다음 수집 결과에서 표시합니다.</p>
          </details>
        </div>
      </section>
    </main>
  );
}
