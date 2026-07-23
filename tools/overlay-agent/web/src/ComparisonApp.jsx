import { useEffect, useState } from "react";
import { compareComposition, CompositionComparisonError } from "./features/composition-compare";

const imageTypes = ["image/jpeg", "image/png", "image/webp"];

function pageUrl(path = "") {
  return `${import.meta.env.BASE_URL}${path}`;
}

function FilePicker({ label, accept, file, onChange, hint }) {
  return <label className="comparison-picker"><span>{label}</span><input type="file" accept={accept} onChange={(event) => onChange(event.target.files?.[0] ?? null)} /><strong>{file?.name ?? "파일 선택"}</strong><small>{hint}</small></label>;
}

function ScoreCard({ label, score, limited }) {
  return <article className="score-card"><span>{label}</span><strong>{typeof score === "number" ? `${score}점` : "분석 제한"}</strong>{limited && <small>조건을 충분히 확인하지 못했습니다.</small>}</article>;
}

export default function ComparisonApp() {
  const [referenceFile, setReferenceFile] = useState(null);
  const [guideFile, setGuideFile] = useState(null);
  const [capturedFile, setCapturedFile] = useState(null);
  const [referencePreview, setReferencePreview] = useState("");
  const [capturedPreview, setCapturedPreview] = useState("");
  const [guideSummary, setGuideSummary] = useState("");
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("예시 사진, guide.json, 촬영 사진을 선택하세요.");
  const [loading, setLoading] = useState(false);

  useEffect(() => () => {
    if (referencePreview) URL.revokeObjectURL(referencePreview);
  }, [referencePreview]);

  useEffect(() => () => {
    if (capturedPreview) URL.revokeObjectURL(capturedPreview);
  }, [capturedPreview]);

  function selectImage(file, setFile, setPreview, label) {
    if (!file) return;
    if (!imageTypes.includes(file.type)) {
      setMessage(`${label}은 JPG, PNG, WebP만 사용할 수 있습니다.`);
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setMessage(`${label}은 12MB 이하만 사용할 수 있습니다.`);
      return;
    }
    setFile(file);
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setResult(null);
  }

  async function selectGuide(file) {
    if (!file) return;
    try {
      const guide = JSON.parse(await file.text());
      if (!Array.isArray(guide.personFrames) || ![1, 2].includes(guide.personFrames.length)) {
        throw new Error("인물 프레임이 1개 또는 2개인 guide.json이 필요합니다.");
      }
      const lineCount = Array.isArray(guide.backgroundLines) ? guide.backgroundLines.length : 0;
      if (lineCount > 5) throw new Error("배경선은 최대 5개인 guide.json만 사용할 수 있습니다.");
      setGuideFile(file);
      setGuideSummary(`인물 ${guide.personFrames.length}명 · 배경선 ${lineCount}개`);
      setMessage("비교할 파일을 준비했습니다.");
      setResult(null);
    } catch (error) {
      setGuideFile(null);
      setGuideSummary("");
      setMessage(`guide.json을 읽지 못했습니다. ${error.message}`);
    }
  }

  async function runComparison() {
    try {
      setLoading(true);
      setResult(null);
      setMessage("인물 배치와 배경 기준선을 비교하고 있습니다.");
      const nextResult = await compareComposition({ referenceFile, guideFile, capturedFile });
      setResult(nextResult);
      setMessage(nextResult.status === "ok" ? "구도 비교를 완료했습니다." : "인물 배치는 비교했지만 배경 분석이 제한되었습니다.");
    } catch (error) {
      setMessage(error instanceof CompositionComparisonError ? error.message : "구도 비교를 시작하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const ready = Boolean(referenceFile && guideFile && capturedFile);
  return <main className="app-shell comparison-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark">P</div><div><p className="eyebrow">Photo Navigation · Composition Compare</p><h1>촬영 구도 비교</h1></div></div><a className="top-link" href={pageUrl()}>레이아웃 등록으로</a></header>
    <section className="comparison-intro"><div><p className="eyebrow">Reference + Guide + Capture</p><h2>예시 구도와 방금 찍은 사진을 비교합니다.</h2><p>인물 배치와 관리자가 등록한 배경선을 따로 확인합니다. 배경 구조를 찾지 못하면 점수를 만들지 않고 분석 제한으로 안내합니다.</p></div></section>
    <section className="comparison-inputs" aria-label="구도 비교 파일 입력">
      <FilePicker label="1. 예시 사진" accept="image/jpeg,image/png,image/webp" file={referenceFile} onChange={(file) => selectImage(file, setReferenceFile, setReferencePreview, "예시 사진")} hint="가이드가 만들어진 원본" />
      <FilePicker label="2. guide.json" accept="application/json,.json" file={guideFile} onChange={selectGuide} hint={guideSummary || "인물 프레임과 배경선"} />
      <FilePicker label="3. 촬영 사진" accept="image/jpeg,image/png,image/webp" file={capturedFile} onChange={(file) => selectImage(file, setCapturedFile, setCapturedPreview, "촬영 사진")} hint="방금 촬영한 결과" />
    </section>
    <button className="action-button comparison-action" type="button" disabled={!ready || loading} onClick={runComparison}>{loading ? "구도 비교 중..." : "구도 비교 실행"}</button>
    <p className={`comparison-message ${result?.status === "limited" ? "limited" : ""}`}>{message}</p>
    <section className="comparison-images" aria-label="예시 사진과 촬영 사진 비교">{referencePreview ? <img src={referencePreview} alt="비교 기준 예시 사진" /> : <div className="comparison-empty">예시 사진</div>}{capturedPreview ? <img src={capturedPreview} alt="비교할 촬영 사진" /> : <div className="comparison-empty">촬영 사진</div>}</section>
    {result && <section className="comparison-result" aria-live="polite"><div className="score-grid"><ScoreCard label="인물 배치" score={result.person.score} /><ScoreCard label="배경 기준" score={result.background.score} limited={result.background.status !== "ok"} /><ScoreCard label="구도 일치도" score={result.compositionScore} limited={result.status !== "ok"} /></div><div className="comparison-feedback"><strong>촬영 피드백</strong><ul>{result.feedback.map((item) => <li key={item}>{item}</li>)}</ul></div><details><summary>분석 세부 정보</summary><pre>{JSON.stringify(result.analysisQuality, null, 2)}</pre></details></section>}
  </main>;
}
