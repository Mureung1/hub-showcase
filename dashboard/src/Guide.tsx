import { useState } from 'react';
import Ajv from 'ajv/dist/2020.js';
import schema from '../schemas/showcase.schema.json';
import exampleShowcase from '../../showcase/showcase.example.json';
import './guide.css';

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

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
            <h2>작성할 내용 예시</h2>
            <p>샘플을 열어 내용을 바꾸고 `showcase/showcase.json`으로 저장합니다.</p>
          </div>
          <button type="button" onClick={() => setSampleOpen((open) => !open)}>
            {sampleOpen ? '샘플 닫기' : '샘플 열어보기'}
          </button>
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
            <h2>JSON 형식 확인하기</h2>
            <p>내용의 좋고 나쁨이 아니라 작성 형식만 확인합니다.</p>
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
    </main>
  );
}
