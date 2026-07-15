import { useState } from 'react';

function DraftEditor({ job, onBack }) {
  const [answers, setAnswers] = useState(job.essayQuestions.map((q) => q.draft));

  function updateAnswer(index, value) {
    setAnswers(answers.map((answer, i) => (i === index ? value : answer)));
  }

  return (
    <section className="card">
      <p className="eyebrow">STEP 4</p>
      <h1>자기소개서 초안</h1>
      <p className="subtitle">{job.title} · 문항 {job.essayQuestions.length}개에 대한 초안이에요. 자유롭게 수정해보세요.</p>

      {job.essayQuestions.map((essayQuestion, index) => (
        <div className="question-block" key={essayQuestion.question}>
          <h3>
            문항 {index + 1}. {essayQuestion.question} ({essayQuestion.maxLength}자 이내)
          </h3>
          <p className="info-box info-box--accent">분석: {essayQuestion.analysis}</p>
          <textarea
            className="field-input field-textarea"
            rows={5}
            maxLength={essayQuestion.maxLength}
            value={answers[index]}
            onChange={(event) => updateAnswer(index, event.target.value)}
          />
        </div>
      ))}

      <div className="actions">
        <button type="button" className="btn-link" onClick={onBack}>
          ← 다른 공고 보러 돌아가기
        </button>
        <button type="button" className="btn-primary" onClick={onBack}>
          저장 / 완료
        </button>
      </div>
    </section>
  );
}

export default DraftEditor;
