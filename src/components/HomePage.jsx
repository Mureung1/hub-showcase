import { useState, useEffect } from "react";
import TaskCard from "./TaskCard";
import EmptyState from "./EmptyState";
import { apiFetch } from "../lib/api";
import "./HomePage.css";

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
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/tasks").then(({ data }) => {
      setTasks(data);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">홈</h1>
        </div>
        <p>불러오는 중...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
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
      <StatsRow tasks={tasks} />
      <div className="task-grid">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

export default HomePage;
