import { LEVEL_META } from "../lib/levelMeta";
import journeyLv0 from "../assets/backgrounds/journey_lv0_clear.png";
import journeyLv1 from "../assets/backgrounds/journey_lv1_partly_cloudy.png";
import journeyLv2 from "../assets/backgrounds/journey_lv2_cloudy.png";
import journeyLv3 from "../assets/backgrounds/journey_lv3_rain.png";
import journeyLv4 from "../assets/backgrounds/journey_lv4_storm.png";
import nagbotLv0 from "../assets/characters/nagbot_lv0.png";
import nagbotLv1 from "../assets/characters/nagbot_lv1.png";
import nagbotLv2 from "../assets/characters/nagbot_lv2.png";
import nagbotLv3 from "../assets/characters/nagbot_lv3.png";
import nagbotLv4 from "../assets/characters/nagbot_lv4.png";
import "./JourneyHero.css";

const JOURNEY_ASSETS = {
  0: { background: journeyLv0, character: nagbotLv0 },
  1: { background: journeyLv1, character: nagbotLv1 },
  2: { background: journeyLv2, character: nagbotLv2 },
  3: { background: journeyLv3, character: nagbotLv3 },
  4: { background: journeyLv4, character: nagbotLv4 },
};

const JOURNEY_STATUS = {
  0: "오늘도 한 걸음부터 시작해 볼까요?",
  1: "가볍게 시작할 수 있는 첫 행동을 준비했어요.",
  2: "막히는 이유를 살펴보고 더 작게 시작해 봐요.",
  3: "목표를 다시 확인하고 지금 한 걸음 시작해요.",
  4: "더 미루기 전에 지금 바로 시작할 차례예요.",
};

function normalizeJourneyLevel(value) {
  return Number.isInteger(value) && value >= 0 && value <= 4 ? value : 0;
}

function JourneyHero({ task = null, microTask = null, onStart = null }) {
  const level = normalizeJourneyLevel(task?.level);
  const assets = JOURNEY_ASSETS[level];
  const levelLabel =
    level === 0 ? `Lv0 · ${LEVEL_META[0].label}` : LEVEL_META[level].label;
  const [levelName, levelDescription] = levelLabel.split(" · ");
  const resolvedMicroTask =
    typeof microTask === "string" && microTask.trim().length > 0
      ? microTask.trim()
      : null;
  const titleId = task ? `journey-hero-title-${task.id}` : "journey-hero-empty";

  return (
    <section
      className={`journey-hero${task ? "" : " journey-hero-empty"}`}
      data-level={level}
      aria-labelledby={titleId}
      style={{ "--journey-hero-bg": `url("${assets.background}")` }}
    >
      <div className="journey-hero-inner">
        <div className="journey-hero-copy">
          <div className="journey-hero-heading-row">
            <p className="journey-hero-eyebrow">오늘의 여정</p>
            <span className="journey-hero-level">
              <strong>{levelName}</strong>
              {levelDescription ? ` · ${levelDescription}` : null}
            </span>
          </div>
          <h2 id={titleId} className="journey-hero-title">
            {task ? task.title : "아직 시작할 여정이 없어요."}
          </h2>
          <p className="journey-hero-status">
            {task
              ? JOURNEY_STATUS[level]
              : "아래 목록에서 시작할 할 일을 기다리고 있어요."}
          </p>

          {task && (
            <div className="journey-hero-action">
              <span className="journey-hero-action-label">
                {resolvedMicroTask
                  ? "이전에 제안한 첫 행동"
                  : "첫 행동 안내"}
              </span>
              <p>
                {resolvedMicroTask ??
                  "아직 제안된 첫 행동이 없어요. 개입 알림에서 함께 정해요."}
              </p>
              {resolvedMicroTask && (
                <small>
                  현재 브라우저 화면에서만 참고되며 Focus에는 자동으로
                  이어지지 않아요.
                </small>
              )}
            </div>
          )}
        </div>

        <div className="journey-hero-character-wrap">
          <img
            className={`journey-hero-character journey-hero-character-lv${level}`}
            src={assets.character}
            alt=""
            aria-hidden="true"
          />
        </div>

        {task && (
          <button
            type="button"
            className="btn btn-primary journey-hero-cta"
            onClick={onStart}
          >
            할 일 바로 시작하기
          </button>
        )}
      </div>
    </section>
  );
}

export default JourneyHero;
