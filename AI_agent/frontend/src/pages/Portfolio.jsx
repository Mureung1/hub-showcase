import { useEffect, useState } from "react";

import Header from "../components/layout/Header";
import {
  getLatestPortfolioDraft,
  saveLatestPortfolioDraft,
} from "../features/career/portfolioApi";
import { navigate, routes } from "../router";

const formatDate = (dateValue) => {
  if (!dateValue) {
    return "기록 없음";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "기록 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

function Portfolio() {
  const [submission, setSubmission] = useState(null);
  const [draft, setDraft] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadPortfolio = async () => {
      try {
        const latestResult = await getLatestPortfolioDraft();

        if (!latestResult.submission) {
          if (isMounted) {
            setSubmission(null);
            setDraft(null);
          }
          return;
        }

        if (isMounted) {
          setSubmission(latestResult.submission);
        }

        const result = latestResult.portfolioDraft
          ? latestResult
          : await saveLatestPortfolioDraft();

        if (isMounted) {
          setSubmission(result.submission);
          setDraft(result.portfolioDraft);
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

    loadPortfolio();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="portfolio-page">
      <style>{styles}</style>
      <Header />
      <section className="portfolio-content">
        <div className="portfolio-heading">
          <div>
            <span className="portfolio-badge">Portfolio Case Study</span>
            <h1>포트폴리오</h1>
            <p>제출 결과물을 단순 요약이 아니라 프로젝트 케이스 스터디 형태로 재구성합니다.</p>
          </div>
          {submission && (
            <aside className="portfolio-status">
              <span>최근 업데이트</span>
              <strong>{formatDate(submission.submittedAt)}</strong>
              <button type="button" className="cm-button cm-button-secondary cm-button-compact" onClick={() => navigate(routes.upload)}>
                결과물 수정
              </button>
            </aside>
          )}
        </div>

        {isLoading ? (
          <EmptyState title="포트폴리오 정보를 불러오는 중입니다." text="잠시만 기다려 주세요." />
        ) : !submission ? (
          <EmptyState
            title="아직 포트폴리오로 만들 제출물이 없습니다."
            text={message || "미션을 수행하고 결과물을 제출하면 프로젝트 케이스 스터디가 자동으로 구성됩니다."}
            actionLabel="결과물 제출하기"
            onAction={() => navigate(routes.upload)}
          />
        ) : message ? (
          <EmptyState
            title="포트폴리오 반영 전 다시 제출이 필요합니다."
            text={message}
            actionLabel="결과물 다시 제출하기"
            onAction={() => navigate(`${routes.upload}?missionId=${submission.missionId}`)}
          />
        ) : (
          <div className="portfolio-case">
            <section className="portfolio-hero-panel">
              <div>
                <span>Project</span>
                <h2>{draft.title}</h2>
                <p>{draft.subtitle}</p>
              </div>
              <div className="portfolio-artifact">
                <span>제출 산출물</span>
                {submission.submittedUrl ? (
                  <a href={submission.submittedUrl} target="_blank" rel="noreferrer">
                    링크 열기
                  </a>
                ) : submission.submittedFileData ? (
                  <a href={submission.submittedFileData} download={submission.submittedFileName}>
                    파일 다운로드
                  </a>
                ) : (
                  <strong>{draft.artifact}</strong>
                )}
                <small>{draft.artifact}</small>
              </div>
            </section>

            <section className="portfolio-story">
              <StoryBlock number="01" title="문제 정의" text={draft.problem} />
              <StoryBlock
                number="02"
                title="접근 방식"
                text="수행 과정을 단계별로 나누고, 결과물이 실제로 활용될 수 있도록 정리했습니다."
              />
              <StoryBlock number="03" title="결과" text={draft.outcome} />
            </section>

            <section className="portfolio-process">
              <div className="section-title">
                <span>Process</span>
                <h3>수행 과정</h3>
              </div>
              <ol>
                {draft.approach.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </section>

            <section className="portfolio-side-grid">
              <div className="portfolio-card portfolio-skill-card">
                <span>핵심 역량</span>
                <div className="skill-list">
                  {draft.skills.map((skill) => (
                    <strong key={skill}>{skill}</strong>
                  ))}
                </div>
              </div>
              <div className="portfolio-card">
                <span>포트폴리오 문장</span>
                <p>{draft.interviewPitch}</p>
              </div>
            </section>

            <section className="portfolio-learning">
              <div className="section-title">
                <span>Learning</span>
                <h3>배운 점</h3>
              </div>
              <div className="learning-grid">
                {draft.learningItems.map((item, index) => (
                  <article key={item}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <p>{item}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="portfolio-proof">
              <div className="section-title">
                <span>Proof Points</span>
                <h3>면접에서 말할 수 있는 포인트</h3>
              </div>
              <div className="proof-grid">
                {draft.portfolioPoints.map((point) => (
                  <article key={point}>
                    <strong>포인트</strong>
                    <p>{point}</p>
                  </article>
                ))}
              </div>
            </section>

            <div className="portfolio-actions">
              <button type="button" className="cm-button cm-button-secondary" onClick={() => navigate(routes.feedback)}>
                피드백 다시 보기
              </button>
              <button type="button" className="cm-button cm-button-primary" onClick={() => navigate(routes.mission)}>
                다른 미션 찾기
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function StoryBlock({ number, title, text }) {
  return (
    <article>
      <span>{number}</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  );
}

function EmptyState({ title, text, actionLabel, onAction }) {
  return (
    <div className="cm-empty-state portfolio-empty">
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
.portfolio-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 12% 8%, rgba(37, 99, 235, 0.14), transparent 28%),
    linear-gradient(135deg, #f8fafc 0%, #eef6ff 48%, #f8fbff 100%);
  color: #0f172a;
  font-family: Arial, sans-serif;
}

.portfolio-content {
  width: min(1120px, calc(100% - clamp(32px, 6vw, 96px)));
  margin: 0 auto;
  padding: clamp(38px, 6vw, 78px) 0 96px;
}

.portfolio-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 320px);
  gap: 18px;
  align-items: end;
  margin-bottom: 18px;
}

.portfolio-badge {
  display: inline-flex;
  margin-bottom: 14px;
  padding: 8px 13px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
  font-size: 13px;
  font-weight: 800;
}

.portfolio-heading h1 {
  margin: 0 0 14px;
  font-size: clamp(32px, 5vw, 48px);
  line-height: 1.15;
}

.portfolio-heading p {
  max-width: 760px;
  margin: 0;
  color: #475569;
  font-size: 17px;
  line-height: 1.7;
}

.portfolio-status,
.portfolio-hero-panel,
.portfolio-story article,
.portfolio-process,
.portfolio-card,
.portfolio-proof {
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.08);
}

.portfolio-status {
  display: grid;
  gap: 9px;
  padding: 18px;
  border-radius: 18px;
}

.portfolio-status span,
.portfolio-hero-panel span,
.portfolio-card > span,
.section-title span,
.portfolio-artifact span {
  color: #2563eb;
  font-size: 13px;
  font-weight: 900;
}

.portfolio-status strong {
  font-size: 24px;
}

.portfolio-case {
  display: grid;
  gap: 16px;
}

.portfolio-hero-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 320px);
  gap: 18px;
  padding: 28px;
  border-radius: 18px;
}

.portfolio-hero-panel h2 {
  margin: 10px 0 12px;
  font-size: clamp(28px, 4vw, 42px);
  line-height: 1.16;
  word-break: keep-all;
}

.portfolio-hero-panel p,
.portfolio-card p,
.portfolio-story p,
.portfolio-proof p {
  margin: 0;
  color: #475569;
  line-height: 1.7;
}

.portfolio-artifact {
  display: grid;
  gap: 10px;
  align-content: start;
  padding: 18px;
  border-radius: 16px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.portfolio-artifact a,
.portfolio-artifact strong {
  color: #1d4ed8;
  font-size: 18px;
  font-weight: 900;
  text-decoration: none;
}

.portfolio-artifact small {
  color: #475569;
  line-height: 1.5;
  word-break: break-all;
}

.portfolio-story {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.portfolio-story article {
  min-width: 0;
  display: grid;
  gap: 10px;
  padding: 20px;
  border-radius: 18px;
}

.portfolio-story article > span {
  color: #06b6d4;
  font-size: 13px;
  font-weight: 900;
}

.portfolio-story strong {
  font-size: 18px;
}

.portfolio-process,
.portfolio-learning,
.portfolio-proof {
  display: grid;
  gap: 16px;
  padding: 22px;
  border-radius: 18px;
}

.section-title h3 {
  margin: 8px 0 0;
  font-size: 22px;
}

.portfolio-process ol {
  display: grid;
  gap: 10px;
  margin: 0;
  padding-left: 22px;
  color: #475569;
  line-height: 1.7;
}

.portfolio-side-grid {
  display: grid;
  grid-template-columns: minmax(260px, 0.8fr) minmax(0, 1.2fr);
  gap: 14px;
}

.portfolio-card {
  min-width: 0;
  display: grid;
  gap: 14px;
  padding: 22px;
  border-radius: 18px;
}

.portfolio-skill-card {
  align-content: start;
}

.skill-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
  gap: 10px;
  width: 100%;
}

.skill-list strong {
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  padding: 9px 12px;
  border-radius: 12px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
  font-size: 14px;
  line-height: 1.35;
  text-align: center;
  word-break: keep-all;
}

.proof-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.learning-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.learning-grid article {
  min-width: 0;
  display: grid;
  gap: 9px;
  padding: 16px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.learning-grid span {
  color: #06b6d4;
  font-size: 13px;
  font-weight: 900;
}

.learning-grid p {
  margin: 0;
  color: #475569;
  line-height: 1.7;
}

.proof-grid article {
  min-width: 0;
  padding: 16px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.proof-grid strong {
  display: block;
  margin-bottom: 8px;
  color: #0f172a;
}

.portfolio-empty {
  max-width: 680px;
}

.portfolio-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 900px) {
  .portfolio-heading,
  .portfolio-hero-panel,
  .portfolio-story,
  .portfolio-side-grid,
  .learning-grid,
  .proof-grid {
    grid-template-columns: 1fr;
  }
}
`;

export default Portfolio;
