import { useMemo, useState } from 'react';
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
  const exampleText = useMemo(() => JSON.stringify(exampleShowcase, null, 2), []);
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

  return (
    <main className="guide-page">
      <header className="guide-header">
        <p className="guide-eyebrow">AI Agent Challenge 2026</p>
        <h1>Showcase 작성 가이드</h1>
        <p>예시 파일을 복사하고, 프로젝트 내용을 바꾼 뒤 형식을 검사하세요.</p>
      </header>

      <section className="guide-steps" aria-label="작성 순서">
        <div><strong>1</strong><span>예시 복사</span></div>
        <div><strong>2</strong><span>내용 수정</span></div>
        <div><strong>3</strong><span>JSON 검사</span></div>
      </section>

      <section className="guide-section guide-folder">
        <h2>파일 구조</h2>
        <p>`showcase` 폴더 안에 JSON과 이미지를 넣습니다.</p>
        <pre>{`showcase/
├── showcase.json
├── thumbnail.webp
└── screenshots/
    └── home.webp`}</pre>
      </section>

      <section className="guide-section guide-rules">
        <h2>작성할 내용</h2>
        <ul>
          <li>`showcase.example.json`을 복사해 `showcase.json`을 만듭니다.</li>
          <li>`category`는 작성하지 않습니다.</li>
          <li>`agentTools`에는 Agent와 Skill을 함께 적습니다.</li>
          <li>`workflows`에는 개발 순서를 적습니다.</li>
          <li>`developmentWithAI`에는 AI와 함께 개발한 과정을 적습니다.</li>
        </ul>
      </section>

      <section className="guide-section guide-example">
        <div className="section-heading">
          <div>
            <h2>예시 JSON</h2>
            <p>필요한 부분만 바꿔서 사용합니다.</p>
          </div>
          <button type="button" onClick={() => setJsonText(exampleText)}>검사창에 넣기</button>
        </div>
        <details>
          <summary>전체 예시 보기</summary>
          <pre>{exampleText}</pre>
        </details>
      </section>

      <section className="guide-section guide-validator">
        <div className="section-heading">
          <div>
            <h2>마지막으로 확인하기</h2>
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
