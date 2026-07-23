import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import Header from "../components/layout/Header";
import { getSession } from "../features/auth/authStorage";
import {
  getMissionProgress,
  saveMissionProgress,
} from "../features/career/missionProgressApi";
import { getMySubmissions } from "../features/career/submissionApi";
import { getMissionById } from "../data/mockMissions";
import { navigate, routes } from "../router";

function MissionDetail() {
  const { missionId = "" } = useParams();
  const session = getSession();
  const userId = session?.id || "";
  const mission = getMissionById(missionId);
  const [checkedItems, setCheckedItems] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (!userId || !mission) {
      return;
    }

    let isMounted = true;

    const loadMissionState = async () => {
      try {
        const [progress, submissions] = await Promise.all([
          getMissionProgress(mission.id),
          getMySubmissions(),
        ]);
        const hasSubmitted = submissions.some(
          (submission) => submission.missionId === mission.id
        );

        if (!isMounted) {
          return;
        }

        setIsSubmitted(hasSubmitted);

        if (hasSubmitted) {
          setCheckedItems(mission.checklist);
        } else {
          setCheckedItems(progress?.checkedItems || []);
        }
      } catch {
        if (isMounted) {
          setIsSubmitted(false);
          setCheckedItems([]);
          setSaveMessage("진행 상태를 불러오지 못했습니다.");
        }
      }
    };

    loadMissionState();

    return () => {
      isMounted = false;
    };
  }, [userId, mission]);

  const progressRate = mission
    ? Math.round((checkedItems.length / mission.checklist.length) * 100)
    : 0;

  const toggleChecklist = async (item) => {
    if (isSubmitted) {
      return;
    }

    const nextItems = checkedItems.includes(item)
      ? checkedItems.filter((checkedItem) => checkedItem !== item)
      : [...checkedItems, item];

    setCheckedItems(nextItems);
    setSaveMessage("");

    try {
      await saveMissionProgress({
        missionId: mission.id,
        missionTitle: mission.title,
        missionSummary: mission.summary,
        checkedItems: nextItems,
        checklistItems: mission.checklist,
      });
      setSaveMessage("진행 상태가 저장되었습니다.");
    } catch {
      setCheckedItems(checkedItems);
      setSaveMessage("진행 상태 저장에 실패했습니다.");
    }
  };

  if (!session) {
    return (
      <main className="mission-detail-page">
        <style>{styles}</style>
        <Header />
        <section className="mission-detail-content">
          <div className="cm-empty-state mission-detail-empty">
            <span className="mission-detail-badge">Mission Detail</span>
            <h1>로그인이 필요합니다</h1>
            <p>미션을 수행하고 진행 상태를 저장하려면 먼저 로그인해 주세요.</p>
            <button type="button" className="cm-button cm-button-primary cm-button-start" onClick={() => navigate(routes.login)}>
              로그인으로 이동
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!mission) {
    return (
      <main className="mission-detail-page">
        <style>{styles}</style>
        <Header />
        <section className="mission-detail-content">
          <div className="cm-empty-state mission-detail-empty">
            <span className="mission-detail-badge">Mission Detail</span>
            <h1>미션을 찾을 수 없습니다</h1>
            <p>추천 목록에서 다시 미션을 선택해 주세요.</p>
            <button type="button" className="cm-button cm-button-primary cm-button-start" onClick={() => navigate(routes.mission)}>
              미션 추천으로 이동
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mission-detail-page">
      <style>{styles}</style>
      <Header />
      <section className="mission-detail-content">
        <div className="mission-detail-heading">
          <div>
            <span className="mission-detail-badge">Mission Detail</span>
            <h1>{mission.title}</h1>
            <p>{mission.summary}</p>
          </div>
          <aside className={isSubmitted ? "mission-detail-status completed" : "mission-detail-status"}>
            <span>{isSubmitted ? "제출 상태" : "진행률"}</span>
            <strong>{progressRate}%</strong>
            {isSubmitted && <small>미션 완료</small>}
            <div className="mission-detail-track">
              <i style={{ width: `${progressRate}%` }} />
            </div>
          </aside>
        </div>

        <div className="mission-detail-grid">
          <section className="mission-detail-card mission-detail-main">
            <div className="mission-detail-meta">
              <span>{mission.difficulty}</span>
              <span>{mission.duration}</span>
              <span>{mission.deliverable}</span>
            </div>
            <h2>수행 가이드</h2>
            <ol className="mission-detail-guide">
              {mission.guide.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </section>

          <section className="mission-detail-card">
            <h2>단계별 체크리스트</h2>
            <div className="mission-detail-checks">
              {mission.checklist.map((item) => (
                <label key={item} className={isSubmitted ? "locked" : ""}>
                  <input
                    type="checkbox"
                    checked={checkedItems.includes(item)}
                    disabled={isSubmitted}
                    onChange={() => toggleChecklist(item)}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
            {saveMessage && <p className="mission-detail-save-message">{saveMessage}</p>}
          </section>

          <section className="mission-detail-card">
            <h2>필요 역량</h2>
            <div className="mission-detail-chip-list">
              {mission.skills.map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          </section>

          <section className="mission-detail-card">
            <h2>참고 자료</h2>
            <ul className="mission-detail-links">
              {mission.references.map((reference) => (
                <li key={reference}>{reference}</li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mission-detail-actions">
          <button type="button" className="cm-button cm-button-secondary" onClick={() => navigate(routes.mission)}>
            목록으로 돌아가기
          </button>
          <button
            type="button"
            className={isSubmitted ? "cm-button cm-button-success" : "cm-button cm-button-primary"}
            onClick={() =>
              navigate(isSubmitted ? routes.feedback : `${routes.upload}?missionId=${mission.id}`)
            }
          >
            {isSubmitted ? "피드백 보기" : "결과물 업로드"}
          </button>
        </div>
      </section>
    </main>
  );
}

const styles = `
.mission-detail-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 12% 8%, rgba(37, 99, 235, 0.16), transparent 28%),
    linear-gradient(135deg, #f8fafc 0%, #eef6ff 48%, #f8fbff 100%);
  color: #0f172a;
  font-family: Arial, sans-serif;
}

.mission-detail-content {
  width: min(1120px, calc(100% - clamp(32px, 6vw, 96px)));
  margin: 0 auto;
  padding: clamp(38px, 6vw, 78px) 0 96px;
}

.mission-detail-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 280px);
  gap: 18px;
  align-items: end;
  margin-bottom: 18px;
}

.mission-detail-badge {
  display: inline-flex;
  margin-bottom: 14px;
  padding: 8px 13px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
  font-size: 13px;
  font-weight: 800;
}

.mission-detail-heading h1,
.mission-detail-empty h1 {
  margin: 0 0 14px;
  font-size: clamp(30px, 5vw, 46px);
  line-height: 1.15;
  word-break: keep-all;
}

.mission-detail-heading p,
.mission-detail-empty p {
  max-width: 760px;
  margin: 0;
  color: #475569;
  font-size: 17px;
  line-height: 1.7;
}

.mission-detail-status,
.mission-detail-card,
.mission-detail-empty {
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.08);
}

.mission-detail-status {
  display: grid;
  gap: 10px;
  padding: 18px;
  border-radius: 18px;
}

.mission-detail-status.completed {
  border-color: rgba(34, 197, 94, 0.34);
  background: linear-gradient(180deg, rgba(240, 253, 244, 0.92), rgba(255, 255, 255, 0.82));
}

.mission-detail-status span,
.mission-detail-status small {
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
}

.mission-detail-status.completed small {
  color: #15803d;
}

.mission-detail-status strong {
  font-size: 34px;
}

.mission-detail-track {
  height: 9px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.mission-detail-track i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #2563eb, #06b6d4);
}

.mission-detail-status.completed .mission-detail-track i {
  background: linear-gradient(90deg, #22c55e, #06b6d4);
}

.mission-detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: 16px;
}

.mission-detail-card {
  min-width: 0;
  padding: 22px;
  border-radius: 18px;
}

.mission-detail-main {
  grid-row: span 2;
}

.mission-detail-card h2 {
  margin: 0 0 16px;
  font-size: 20px;
}

.mission-detail-meta,
.mission-detail-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}

.mission-detail-meta span,
.mission-detail-chip-list span {
  padding: 7px 10px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 800;
}

.mission-detail-guide {
  display: grid;
  gap: 12px;
  margin: 0;
  padding-left: 22px;
  color: #475569;
  line-height: 1.65;
}

.mission-detail-checks {
  display: grid;
  gap: 10px;
}

.mission-detail-checks label {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  color: #334155;
  line-height: 1.5;
  cursor: pointer;
}

.mission-detail-checks label.locked {
  color: #15803d;
  cursor: default;
}

.mission-detail-checks input {
  margin-top: 3px;
  accent-color: #22c55e;
}

.mission-detail-save-message {
  margin: 14px 0 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.mission-detail-links {
  display: grid;
  gap: 10px;
  margin: 0;
  padding-left: 18px;
  color: #475569;
  line-height: 1.55;
}

.mission-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 18px;
}

.mission-detail-empty {
  max-width: 720px;
}

@media (max-width: 860px) {
  .mission-detail-heading,
  .mission-detail-grid {
    grid-template-columns: 1fr;
  }

  .mission-detail-main {
    grid-row: auto;
  }

  .mission-detail-actions {
    justify-content: flex-start;
  }
}
`;

export default MissionDetail;
