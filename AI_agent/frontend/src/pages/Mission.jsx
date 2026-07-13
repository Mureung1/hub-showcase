import Header from "../components/layout/Header";
import { getSession } from "../features/auth/authStorage";
import { getCareerAnalysis, getCareerSpec } from "../features/career/careerStorage";
import { getRecommendedMissions } from "../data/mockMissions";
import { getMissionDetailPath, navigate, routes } from "../router";

function Mission() {
  const session = getSession();
  const spec = getCareerSpec(session?.id);
  const analysis = getCareerAnalysis(session?.id);
  const targetRole = analysis?.targetRole || spec?.targetRole || "";
  const missions = getRecommendedMissions(targetRole);

  if (!session) {
    return (
      <main className="mission-page">
        <style>{styles}</style>
        <Header />
        <section className="mission-content">
          <div className="mission-empty">
            <span className="mission-badge">Career Mission</span>
            <h1>미션 추천</h1>
            <p>로그인 후 스펙과 목표 직무를 등록하면 맞춤 미션을 확인할 수 있습니다.</p>
            <button type="button" className="mission-primary" onClick={() => navigate(routes.login)}>
              로그인으로 이동
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mission-page">
      <style>{styles}</style>
      <Header />
      <section className="mission-content">
        <div className="mission-heading">
          <div>
            <span className="mission-badge">Mission Recommendation</span>
            <h1>추천 미션</h1>
            <p>
              {targetRole
                ? `${targetRole} 목표에 맞춰 포트폴리오로 연결하기 좋은 실무형 미션을 추천합니다.`
                : "목표 직무가 아직 없어 기본 프론트엔드 미션을 먼저 보여줍니다."}
            </p>
          </div>
          <div className="mission-summary">
            <span>목표 직무</span>
            <strong>{targetRole || "미등록"}</strong>
            <button type="button" onClick={() => navigate(routes.specs)}>
              스펙 수정
            </button>
          </div>
        </div>

        {!targetRole && (
          <div className="mission-notice">
            <strong>더 정확한 추천을 위해 목표 직무를 등록해 주세요.</strong>
            <span>스펙 등록 화면에서 목표 직무와 보유 역량을 저장하면 추천 기준이 바뀝니다.</span>
          </div>
        )}

        <div className="mission-grid">
          {missions.map((mission) => (
            <article key={mission.id} className="mission-card">
              <div className="mission-card-top">
                <span>{mission.difficulty}</span>
                <span>{mission.duration}</span>
              </div>
              <h2>{mission.title}</h2>
              <p>{mission.summary}</p>
              <div className="mission-chip-list" aria-label="필요 역량">
                {mission.skills.map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>
              <div className="mission-deliverable">
                <span>제출 결과물</span>
                <strong>{mission.deliverable}</strong>
              </div>
              <button
                type="button"
                className="mission-primary"
                onClick={() => navigate(getMissionDetailPath(mission.id))}
              >
                미션 시작
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

const styles = `
.mission-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 12% 8%, rgba(37, 99, 235, 0.16), transparent 28%),
    linear-gradient(135deg, #f8fafc 0%, #eef6ff 48%, #f8fbff 100%);
  color: #0f172a;
  font-family: Arial, sans-serif;
}

.mission-content {
  width: min(1120px, calc(100% - clamp(32px, 6vw, 96px)));
  margin: 0 auto;
  padding: clamp(38px, 6vw, 78px) 0 96px;
}

.mission-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 300px);
  gap: 18px;
  align-items: end;
  margin-bottom: 18px;
}

.mission-badge {
  display: inline-flex;
  margin-bottom: 14px;
  padding: 8px 13px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
  font-size: 13px;
  font-weight: 800;
}

.mission-heading h1,
.mission-empty h1 {
  margin: 0 0 14px;
  font-size: clamp(32px, 5vw, 48px);
  line-height: 1.15;
  word-break: keep-all;
}

.mission-heading p,
.mission-empty p {
  max-width: 760px;
  margin: 0;
  color: #475569;
  font-size: 17px;
  line-height: 1.7;
}

.mission-summary,
.mission-empty,
.mission-notice,
.mission-card {
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.08);
}

.mission-summary {
  display: grid;
  gap: 9px;
  padding: 18px;
  border-radius: 18px;
}

.mission-summary span,
.mission-deliverable span {
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
}

.mission-summary strong {
  font-size: 19px;
}

.mission-summary button {
  min-height: 38px;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  background: #ffffff;
  color: #1d4ed8;
  font-weight: 800;
  cursor: pointer;
}

.mission-notice {
  display: grid;
  gap: 6px;
  margin-bottom: 18px;
  padding: 18px;
  border-radius: 16px;
}

.mission-notice span {
  color: #475569;
  line-height: 1.6;
}

.mission-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.mission-card {
  min-width: 0;
  display: grid;
  gap: 14px;
  padding: 22px;
  border-radius: 18px;
}

.mission-card-top {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mission-card-top span,
.mission-chip-list span {
  padding: 7px 10px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 800;
}

.mission-card h2 {
  margin: 0;
  font-size: 21px;
  line-height: 1.35;
  word-break: keep-all;
}

.mission-card p {
  margin: 0;
  color: #475569;
  line-height: 1.65;
}

.mission-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mission-deliverable {
  display: grid;
  gap: 6px;
  padding: 14px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.mission-deliverable strong {
  color: #0f172a;
  line-height: 1.45;
}

.mission-primary {
  justify-self: start;
  min-height: 42px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #2563eb, #06b6d4);
  color: #ffffff;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 14px 26px rgba(37, 99, 235, 0.28);
}

.mission-primary:hover {
  background: linear-gradient(135deg, #1d4ed8, #0891b2);
}

.mission-empty {
  max-width: 720px;
  display: grid;
  gap: 16px;
  padding: 24px;
  border-radius: 18px;
}

@media (max-width: 820px) {
  .mission-heading,
  .mission-grid {
    grid-template-columns: 1fr;
  }
}
`;

export default Mission;
