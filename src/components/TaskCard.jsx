import { useEffect, useState } from "react";
import { LEVEL_META } from "../lib/levelMeta";
import { REASON_OPTIONS } from "../lib/taskOptions";
import { getTaskDeadlinePresentation } from "../lib/taskDeadline";
import { formatNextNudgeCountdown } from "../lib/nextNudgeCountdown";
import nagbotFaceLv0 from "../assets/characters/nagbot_face_lv0.png";
import nagbotFaceLv1 from "../assets/characters/nagbot_face_lv1.png";
import nagbotFaceLv2 from "../assets/characters/nagbot_face_lv2.png";
import nagbotFaceLv3 from "../assets/characters/nagbot_face_lv3.png";
import nagbotFaceLv4 from "../assets/characters/nagbot_face_lv4.png";
import "./TaskCard.css";

// normalizedLevel(0~4로 이미 안전하게 clamp된 값, 아래 TaskCard 본문 참고)을 그대로
// 키로 쓴다 — 0은 "level 없음/유효하지 않음" fallback으로도 자연스럽게 재사용된다.
const FACE_BY_LEVEL = {
  0: nagbotFaceLv0,
  1: nagbotFaceLv1,
  2: nagbotFaceLv2,
  3: nagbotFaceLv3,
  4: nagbotFaceLv4,
};

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const SYSTEM_REASON_SENTENCES = {
  overwhelm: "막막해서 못 시작해서 미루고 있어요.",
  dislike: "할 일 자체가 하기 싫어서 미루고 있어요.",
  temptation: "다른 유혹에 끌려서 미루고 있어요.",
};

function toKstDayOrdinal(timestamp) {
  return Math.floor((timestamp + KST_OFFSET_MS) / DAY_MS);
}

function formatScheduledTime(value, now) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "시각 미정";

  const nowDate = new Date(now);
  const nowTimestamp = Number.isNaN(nowDate.getTime())
    ? Date.now()
    : nowDate.getTime();
  const shifted = new Date(date.getTime() + KST_OFFSET_MS);
  const hours = shifted.getUTCHours();
  const minutes = String(shifted.getUTCMinutes()).padStart(2, "0");
  const period = hours < 12 ? "오전" : "오후";
  const displayHour = hours % 12 || 12;
  const dayDifference =
    toKstDayOrdinal(date.getTime()) - toKstDayOrdinal(nowTimestamp);
  const dateLabel =
    dayDifference === 0
      ? "오늘"
      : dayDifference === 1
        ? "내일"
        : `${shifted.getUTCMonth() + 1}월 ${shifted.getUTCDate()}일`;
  return `${dateLabel} ${period} ${displayHour}:${minutes}`;
}

function getReasonDescription(task) {
  if (SYSTEM_REASON_SENTENCES[task.reason]) {
    return SYSTEM_REASON_SENTENCES[task.reason];
  }

  if (task.reason === "custom") {
    return task.customReasonText?.trim() || "기타 이유";
  }

  const knownLabel = REASON_OPTIONS.find(
    ({ value }) => value === task.reason,
  )?.label;
  if (knownLabel) return knownLabel;
  return typeof task.reason === "string" && task.reason.trim()
    ? task.reason.trim()
    : "이유 미확인";
}

function TaskDetails({ task, now }) {
  return (
    <div className="task-details">
      <div className="task-summary">
        <span>{task.type}</span>
        <span className="task-summary-divider" aria-hidden="true">
          ·
        </span>
        <span>{formatScheduledTime(task.startTime, now)}</span>
      </div>
      <p className="task-reason">{getReasonDescription(task)}</p>
    </div>
  );
}

function DeadlineBadge({ deadline }) {
  if (!deadline) return null;

  return (
    <span
      className={`task-deadline task-deadline-${deadline.kind}`}
      aria-label={`마감 ${deadline.desktopLabel}`}
    >
      <span className="task-deadline-desktop">{deadline.desktopLabel}</span>
      <span className="task-deadline-mobile">{deadline.mobileLabel}</span>
    </span>
  );
}

function CardHeader({
  statusLabel,
  levelLabel = null,
  level = null,
  deadline = null,
  title,
  onDelete,
}) {
  const [levelName, levelDescription] = levelLabel?.split(" · ") ?? [];

  return (
    <div className="task-card-header">
      <div className="task-card-header-info">
        <div className="task-badges">
          <span className="task-status-badge">{statusLabel}</span>
          {levelLabel ? (
            <span className="task-level-badge" data-level={level}>
              <strong>{levelName}</strong>
              {levelDescription ? ` · ${levelDescription}` : null}
            </span>
          ) : null}
        </div>
        <DeadlineBadge deadline={deadline} />
      </div>
      <DeleteButton title={title} onDelete={onDelete} />
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
      <path d="M10 11v6"></path>
      <path d="M14 11v6"></path>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
    </svg>
  );
}

function DeleteButton({ title, onDelete }) {
  function handleClick(e) {
    e.stopPropagation(); // 카드 자체의 onClick(포커스 진입 등)이 함께 발동하지 않도록
    if (window.confirm(`"${title}"을(를) 삭제할까요?`)) {
      onDelete();
    }
  }

  return (
    <button
      className="task-delete-btn"
      onClick={handleClick}
      aria-label={`${title} 삭제`}
    >
      <TrashIcon />
    </button>
  );
}

// Lv별 얼굴 아이콘 — 원(배경)과 얼굴 이미지를 별도 레이어로 둔다. 원 레이어에는
// overflow:hidden을 적용하지 않으므로(애초에 이미지가 없어 자를 대상도 없음) 얼굴
// 이미지를 살짝 위로 올려도 안테나 끝이 잘리지 않는다. 얼굴은 보조 정보(장식)이므로
// alt=""+aria-hidden 처리하고, 레벨 텍스트는 기존 Lv 배지가 이미 전달한다.
function TaskFace({ level }) {
  const src = FACE_BY_LEVEL[level] ?? FACE_BY_LEVEL[0];
  return (
    <span className="task-face">
      <span className="task-face-circle" aria-hidden="true" />
      <img className="task-face-img" src={src} alt="" aria-hidden="true" />
    </span>
  );
}

// 다음 알림까지 남은 시간 표시 — 우선순위: 집중 중 > 이 task의 모달이 열려 있음 >
// 다른 task의 모달이 열려 있어 이 task 타이머도 함께 멈춰 있음(현재 구조상 모달이
// 열리면 모든 활성 task 타이머가 일시정지된다) > 정상 카운트다운 > 데이터 없음(기본 문구).
// 실제 초 단위 갱신은 이 컴포넌트 안에서만 자체 setInterval로 처리해, 부모(HomePage)를
// 매초 리렌더시키지 않는다.
function NextNudgeStatus({ isFocused, isThisTaskModalTarget, isNudgeModalOpen, nextNudgeAt }) {
  const [now, setNow] = useState(() => Date.now());
  const showsCountdown =
    !isFocused && !isNudgeModalOpen && typeof nextNudgeAt === "number";

  useEffect(() => {
    if (!showsCountdown) return undefined;
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [showsCountdown]);

  let label;
  if (isFocused) {
    label = "집중 중에는 알림이 멈춰요";
  } else if (isThisTaskModalTarget) {
    label = "알림 확인 중";
  } else if (isNudgeModalOpen) {
    label = "다른 알림 확인 중";
  } else if (showsCountdown) {
    label = formatNextNudgeCountdown(nextNudgeAt - now);
  } else {
    label = "다음 알림 · 자동 예약";
  }

  return (
    <div className="next-nudge-note">
      <span className="next-nudge-dot" aria-hidden="true"></span>
      {label}
    </div>
  );
}

function TaskCard({
  task,
  onClick,
  onDelete,
  now,
  isNudgeModalOpen = false,
  isThisTaskModalTarget = false,
  isFocused = false,
  nextNudgeAt = null,
}) {
  const deadline = getTaskDeadlinePresentation(task.deadline, now);

  if (task.status === "done") {
    return (
      <article className="task-card done">
        <CardHeader
          statusLabel="완료"
          title={task.title}
          onDelete={onDelete}
        />
        <h3 className="task-title">{task.title}</h3>
        <p className="task-done-type">{task.type}</p>
      </article>
    );
  }

  if (task.status === "waiting") {
    return (
      <article className="task-card task-card-waiting">
        <CardHeader
          statusLabel="시작 예정"
          deadline={deadline}
          title={task.title}
          onDelete={onDelete}
        />
        <h3 className="task-title">{task.title}</h3>
        <TaskDetails task={task} now={now} />
      </article>
    );
  }

  // 계약 밖 status는 기존 active형 fallback을 유지해 화면과 시작 동작이 사라지지 않게 한다.
  const meta = LEVEL_META[task.level] ?? LEVEL_META[0];
  const normalizedLevel =
    Number.isInteger(task.level) && task.level >= 0 && task.level <= 4
      ? task.level
      : 0;
  const statusLabel = task.status === "active" ? "진행 중" : "기타 상태";

  return (
    <article className="task-card task-card-active">
      <CardHeader
        statusLabel={statusLabel}
        levelLabel={meta.label}
        level={normalizedLevel}
        deadline={deadline}
        title={task.title}
        onDelete={onDelete}
      />
      <div className="task-title-row">
        <TaskFace level={normalizedLevel} />
        <h3 className="task-title">{task.title}</h3>
      </div>
      <TaskDetails task={task} now={now} />
      <div className="pressure-track">
        <div
          className={`pressure-fill pressure-fill-lv${normalizedLevel}`}
          style={{ width: `${(normalizedLevel / 4) * 100}%` }}
          role="progressbar"
          aria-label={`개입 레벨 ${normalizedLevel}`}
          aria-valuemin="0"
          aria-valuemax="4"
          aria-valuenow={normalizedLevel}
        ></div>
      </div>
      <div className="task-card-actions">
        <NextNudgeStatus
          isFocused={isFocused}
          isThisTaskModalTarget={isThisTaskModalTarget}
          isNudgeModalOpen={isNudgeModalOpen}
          nextNudgeAt={nextNudgeAt}
        />
        <button className="task-start-btn" type="button" onClick={onClick}>
          지금 시작
        </button>
      </div>
    </article>
  );
}

export default TaskCard;
