import TaskCard from "./TaskCard";
import EmptyState from "./EmptyState";
import "./HomePage.css";

// mock: useState 없이 상수로 고정 (등록 폼 연동 전까지는 이 배열만 바뀜)
const MOCK_TASKS = [
  {
    id: 1,
    title: "확률과통계 3장 문제풀이",
    type: "과제",
    status: "waiting",
    startTime: "20:00",
  },
  {
    id: 2,
    title: "졸업논문 초안 작성",
    type: "리포트",
    status: "active",
    level: 1,
    skipCount: 1,
  },
  {
    id: 3,
    title: "조별과제 PPT 취합",
    type: "조별과제",
    status: "active",
    level: 3,
    skipCount: 4,
  },
  {
    id: 4,
    title: "알고리즘 발표 준비",
    type: "발표",
    status: "done",
  },
  {
    id: 5,
    title: "영어 프레젠테이션 대본",
    type: "발표",
    status: "active",
    level: 4,
    skipCount: 6,
  },
];

// content-as-data: 칩 하나 = 라벨 + 계산 방식
const STAT_DEFS = [
  {
    key: "active",
    label: "진행 중",
    calc: (tasks) =>
      tasks.filter((t) => t.status === "waiting" || t.status === "active")
        .length,
  },
  {
    key: "done",
    label: "완료",
    calc: (tasks) => tasks.filter((t) => t.status === "done").length,
  },
  {
    key: "streak",
    label: "스트릭",
    calc: () => 0, // TODO: 실제 스트릭 계산은 나중 이슈에서
    format: (value) => `🔥 ${value}`,
  },
];

function StatsRow({ tasks }) {
  return (
    <div className="stats-row">
      {STAT_DEFS.map((def) => {
        const value = def.calc(tasks);
        return (
          <div className="stat-chip" key={def.key}>
            {def.label}
            <strong>{def.format ? def.format(value) : value}</strong>
          </div>
        );
      })}
    </div>
  );
}

function HomePage() {
  if (MOCK_TASKS.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">홈</h1>
          <p className="page-sub">
            등록된 할일이 여기 모여요. 미룰수록 압력 게이지가 차오릅니다.
          </p>
        </div>
        <EmptyState
          message="아직 등록된 할일이 없어요."
          actionLabel="할일 등록하러 가기"
        />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">홈</h1>
        <p className="page-sub">등록된 할일과 지금 상태예요.</p>
      </div>
      <StatsRow tasks={MOCK_TASKS} />
      <div className="task-grid">
        {MOCK_TASKS.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

export default HomePage;
