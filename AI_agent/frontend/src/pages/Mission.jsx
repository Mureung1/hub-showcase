import { useEffect, useMemo, useState } from "react";

import Header from "../components/layout/Header";
import { getSession, getUser } from "../features/auth/authStorage";
import { getMyAnalysis } from "../features/career/analysisApi";
import { getRecommendedMissions } from "../features/career/missionApi";
import { getMySpec } from "../features/career/specApi";
import { getMySubmissions } from "../features/career/submissionApi";
import { getMissionDetailPath, navigate, routes } from "../router";

const trackLabels = {
  it: "IT/개발",
  data: "데이터",
  business: "경영/기획",
  media: "미디어/콘텐츠",
  design: "디자인/UX",
  education: "교육",
  health: "보건/의료",
  engineering: "공학/R&D",
  science: "자연과학",
  social: "사회/행정",
  humanities: "인문",
};

function Mission() {
  const session = getSession();
  const user = getUser();
  const userId = session?.id || "";
  const userMajor = user?.major || "";
  const [targetRole, setTargetRole] = useState("");
  const [inferredTrack, setInferredTrack] = useState("business");
  const [missions, setMissions] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(session));
  const [message, setMessage] = useState("");
  const [submittedMissionIds, setSubmittedMissionIds] = useState([]);
  const submittedMissionIdSet = useMemo(
    () => new Set(submittedMissionIds),
    [submittedMissionIds]
  );

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isMounted = true;

    const loadMissionData = async () => {
      try {
        const [savedSpec, savedAnalysis, submissions] = await Promise.all([
          getMySpec(),
          getMyAnalysis(),
          getMySubmissions(),
        ]);

        const nextTargetRole = savedAnalysis?.targetRole || savedSpec?.targetRole || "";
        const recommendations = await getRecommendedMissions({
          major: userMajor,
          targetRole: nextTargetRole,
          skills: savedSpec?.skills,
        });

        if (isMounted) {
          setTargetRole(nextTargetRole);
          setInferredTrack(recommendations.inferredTrack);
          setMissions(recommendations.missions);
          setSubmittedMissionIds(submissions.map((submission) => submission.missionId));
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error.message);
          setMissions([]);
          setSubmittedMissionIds([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadMissionData();

    return () => {
      isMounted = false;
    };
  }, [userId, userMajor]);

  if (!session) {
    return (
      <main className="mission-page">
        <style>{styles}</style>
        <Header />
        <section className="mission-content">
          <div className="cm-empty-state mission-empty">
            <span className="mission-badge">Career Mission</span>
            <h1>미션 추천</h1>
            <p>로그인하고 전공, 스펙, 목표 직무를 등록하면 맞춤 미션을 확인할 수 있습니다.</p>
            <button type="button" className="cm-button cm-button-primary cm-button-start" onClick={() => navigate(routes.login)}>
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
                ? `${user?.major || "등록 전공"}과 ${targetRole} 목표를 함께 보고 포트폴리오로 연결하기 좋은 미션을 추천합니다.`
                : "목표 직무가 아직 없어 전공과 현재 스펙을 기준으로 시작하기 좋은 미션을 보여줍니다."}
            </p>
          </div>
          <div className="mission-summary">
            <span>추천 기준</span>
            <strong>{targetRole || user?.major || "미등록"}</strong>
            <small>{trackLabels[inferredTrack] || "일반 직무"} 기반 추천</small>
            <button type="button" className="cm-button cm-button-secondary cm-button-compact" onClick={() => navigate(routes.specs)}>
              스펙 수정
            </button>
          </div>
        </div>

        {!targetRole && (
          <div className="mission-notice">
            <strong>더 정확한 추천을 위해 목표 직무를 등록해 주세요.</strong>
            <span>스펙 등록 화면에서 목표 직무와 보유 역량을 저장하면 추천 기준이 더 구체화됩니다.</span>
          </div>
        )}

        {isLoading ? (
          <div className="cm-empty-state mission-empty">
            <strong>추천 미션을 불러오는 중입니다.</strong>
            <p>등록된 스펙과 분석 결과를 기준으로 맞춤 미션을 계산하고 있습니다.</p>
          </div>
        ) : message ? (
          <div className="cm-empty-state mission-empty">
            <strong>추천 미션을 불러오지 못했습니다.</strong>
            <p>{message}</p>
          </div>
        ) : (
          <div className="mission-grid">
            {missions.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                isSubmitted={submittedMissionIdSet.has(mission.id)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function MissionCard({ mission, isSubmitted }) {
  return (
    <article className={isSubmitted ? "mission-card mission-card-complete" : "mission-card"}>
      <div className="mission-card-top">
        <span>{mission.difficulty}</span>
        <span>{mission.duration}</span>
        {isSubmitted && <span className="mission-complete-chip">제출 완료</span>}
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
        className={
          isSubmitted
            ? "cm-button cm-button-success cm-button-start"
            : "cm-button cm-button-primary cm-button-start"
        }
        onClick={() =>
          navigate(isSubmitted ? routes.feedback : getMissionDetailPath(mission.id))
        }
      >
        {isSubmitted ? "미션 완료" : "미션 시작"}
      </button>
    </article>
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

.mission-summary small {
  color: #475569;
  font-size: 13px;
  font-weight: 800;
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

.mission-card-complete {
  border-color: rgba(34, 197, 94, 0.32);
  background: linear-gradient(180deg, rgba(240, 253, 244, 0.88), rgba(255, 255, 255, 0.82));
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

.mission-card-top .mission-complete-chip {
  background: #dcfce7;
  color: #15803d;
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

.mission-empty {
  max-width: 720px;
}

@media (max-width: 820px) {
  .mission-heading,
  .mission-grid {
    grid-template-columns: 1fr;
  }
}
`;

export default Mission;
