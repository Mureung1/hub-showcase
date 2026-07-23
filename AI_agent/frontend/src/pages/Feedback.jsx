import { useEffect, useState } from "react";

import Header from "../components/layout/Header";
import {
  getLatestFeedback,
  saveLatestFeedback,
} from "../features/career/feedbackApi";
import { navigate, routes } from "../router";

function Feedback() {
  const [submission, setSubmission] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadFeedback = async () => {
      try {
        const latestResult = await getLatestFeedback();

        if (!latestResult.submission) {
          if (isMounted) {
            setSubmission(null);
            setFeedback(null);
          }
          return;
        }

        const result = latestResult.feedback
          ? latestResult
          : await saveLatestFeedback();

        if (isMounted) {
          setSubmission(result.submission);
          setFeedback(result.feedback);
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadFeedback();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="feedback-page">
      <style>{styles}</style>
      <Header />
      <section className="feedback-content">
        <div className="feedback-heading">
          <div>
            <span className="feedback-badge">AI Feedback</span>
            <h1>AI 피드백</h1>
            <p>최근 제출한 결과물을 기준으로 전체 평가와 포트폴리오 반영 포인트를 확인합니다.</p>
          </div>
          {submission && (
            <aside className="feedback-summary">
              <span>최근 제출</span>
              <strong>{submission.missionTitle}</strong>
              <small>{submission.submittedUrl || submission.submittedFileName}</small>
              {submission.submittedFileData && (
                <a href={submission.submittedFileData} download={submission.submittedFileName}>
                  제출 파일 열기
                </a>
              )}
            </aside>
          )}
        </div>

        {isLoading ? (
          <EmptyState title="제출 정보를 불러오는 중입니다." text="잠시만 기다려 주세요." />
        ) : !submission ? (
          <EmptyState
            title="아직 제출한 결과물이 없습니다."
            text={message || "미션을 수행한 뒤 링크 또는 파일 형태로 결과물을 제출해 주세요."}
            actionLabel="결과물 제출하기"
            onAction={() => navigate(routes.upload)}
          />
        ) : (
          <div className="feedback-grid">
            <section className="feedback-card feedback-wide">
              <span>전체 평가</span>
              <p>{feedback.overall}</p>
            </section>
            <FeedbackList title="잘한 점" items={feedback.strengths} />
            <FeedbackList title="개선할 점" items={feedback.improvements} />
            <FeedbackList title="수정 제안" items={feedback.revisions} />
            <FeedbackList title="포트폴리오 반영 포인트" items={feedback.portfolioPoints} wide />
            <div className="feedback-actions">
              <button type="button" className="cm-button cm-button-secondary" onClick={() => navigate(routes.upload)}>
                다시 제출
              </button>
              <button type="button" className="cm-button cm-button-primary" onClick={() => navigate(routes.portfolio)}>
                포트폴리오로 이동
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function FeedbackList({ title, items, wide = false }) {
  return (
    <section className={wide ? "feedback-card feedback-wide" : "feedback-card"}>
      <span>{title}</span>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function EmptyState({ title, text, actionLabel, onAction }) {
  return (
    <div className="cm-empty-state feedback-empty">
      <strong>{title}</strong>
      <p>{text}</p>
      {actionLabel && (
        <button type="button" className="cm-button cm-button-primary cm-button-start" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

const styles = `
.feedback-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 12% 8%, rgba(37, 99, 235, 0.16), transparent 28%),
    linear-gradient(135deg, #f8fafc 0%, #eef6ff 48%, #f8fbff 100%);
  color: #0f172a;
  font-family: Arial, sans-serif;
}

.feedback-content {
  width: min(1120px, calc(100% - clamp(32px, 6vw, 96px)));
  margin: 0 auto;
  padding: clamp(38px, 6vw, 78px) 0 96px;
}

.feedback-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
  gap: 18px;
  align-items: end;
  margin-bottom: 18px;
}

.feedback-badge {
  display: inline-flex;
  margin-bottom: 14px;
  padding: 8px 13px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
  font-size: 13px;
  font-weight: 800;
}

.feedback-heading h1 {
  margin: 0 0 14px;
  font-size: clamp(32px, 5vw, 48px);
  line-height: 1.15;
}

.feedback-heading p {
  max-width: 760px;
  margin: 0;
  color: #475569;
  font-size: 17px;
  line-height: 1.7;
}

.feedback-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.feedback-card,
.feedback-summary {
  min-width: 0;
  padding: 22px;
  border-radius: 18px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.08);
}

.feedback-wide {
  grid-column: 1 / -1;
}

.feedback-summary {
  display: grid;
  gap: 8px;
}

.feedback-card > span,
.feedback-summary span {
  color: #2563eb;
  font-size: 13px;
  font-weight: 900;
}

.feedback-card p {
  margin: 10px 0 0;
  color: #475569;
  line-height: 1.7;
}

.feedback-card ul {
  display: grid;
  gap: 10px;
  margin: 12px 0 0;
  padding-left: 18px;
  color: #475569;
  line-height: 1.65;
}

.feedback-summary small {
  color: #475569;
  line-height: 1.5;
  word-break: break-all;
}

.feedback-empty {
  max-width: 680px;
}

.feedback-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 860px) {
  .feedback-heading,
  .feedback-grid {
    grid-template-columns: 1fr;
  }
}
`;

export default Feedback;
