import { FormEvent, useMemo, useState } from "react";

type Category = "카페" | "배달" | "쇼핑" | "교통" | "식비" | "기타";
type MissionStatus = "완료" | "진행 중";

type SpendRecord = {
  id: number;
  category: Category;
  note: string;
  amount?: string;
  relatedToMission: boolean;
};

const categories: Category[] = ["카페", "배달", "쇼핑", "교통", "식비", "기타"];

const initialRecords: SpendRecord[] = [
  {
    id: 1,
    category: "카페",
    note: "오전 커피는 마셨고 오후 카페는 참기",
    amount: "4500",
    relatedToMission: true,
  },
  {
    id: 2,
    category: "교통",
    note: "지하철 이용",
    relatedToMission: false,
  },
];

const myProfile = {
  name: "나",
  avatar: "나",
  mission: "카페는 한 번만",
  status: "진행 중" as MissionStatus,
  streak: 5,
  level: 3,
  weeklyDone: 4,
  goal: "제주 여행",
  goalProgress: 42,
};

const friendProfile = {
  name: "지우",
  avatar: "지",
  mission: "소비 전 30초 생각하기",
  status: "완료" as MissionStatus,
  streak: 6,
  level: 4,
  weeklyDone: 5,
  goal: "비상금 만들기",
  goalProgress: 51,
};

function App() {
  const [records, setRecords] = useState<SpendRecord[]>(initialRecords);
  const [selectedCategory, setSelectedCategory] = useState<Category>("카페");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [relatedToMission, setRelatedToMission] = useState(true);
  const [missionDone, setMissionDone] = useState(false);

  const recommendedMission = useMemo(() => {
    const cafeCount = records.filter((record) => record.category === "카페").length;
    const deliveryCount = records.filter((record) => record.category === "배달").length;

    if (deliveryCount >= 2) {
      return {
        title: "배달 대신 집밥 먹기",
        reason: "최근 배달 기록이 보여서 오늘은 가벼운 절약 미션을 추천해요.",
      };
    }

    if (cafeCount >= 1) {
      return {
        title: "카페는 한 번만",
        reason: "오늘 카페 기록이 있어요. 오후에는 한 번 쉬어가는 미션이 좋아 보여요.",
      };
    }

    return {
      title: "소비 전 30초 생각하기",
      reason: "오늘 기록이 아직 가벼워요. 부담 없는 습관 미션으로 시작해요.",
    };
  }, [records]);

  const missionStatus: MissionStatus = missionDone ? "완료" : myProfile.status;
  const myStreak = missionDone ? myProfile.streak + 1 : myProfile.streak;
  const groupProgress = missionDone ? 4 : 3;

  const addRecord = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!note.trim()) return;

    setRecords((current) => [
      {
        id: Date.now(),
        category: selectedCategory,
        note: note.trim(),
        amount: amount.trim() || undefined,
        relatedToMission,
      },
      ...current,
    ]);
    setNote("");
    setAmount("");
    setRelatedToMission(true);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MoneyMate</strong>
            <small>AI 금융 습관 MVP</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="주요 메뉴">
          {["홈", "내 기록", "오늘 미션", "친구 비교", "공동 미션", "목표"].map((item) => (
            <button className={item === "친구 비교" ? "nav-item active" : "nav-item"} key={item}>
              <span>{navIcon(item)}</span>
              {item}
            </button>
          ))}
        </nav>

        <div className="sidebar-card">
          <span className="eyebrow">공유 원칙</span>
          <p>친구에게는 금액이 아니라 미션 완료와 스트릭만 보여줘요.</p>
        </div>
      </aside>

      <main className="dashboard">
        <header className="topbar">
          <div>
            <p className="eyebrow">작동형 웹 MVP</p>
            <h1>친구와 함께 돈 습관 만들기</h1>
            <p>나만 보는 기록을 바탕으로 미션을 받고, 친구와는 습관 진행만 비교해요.</p>
          </div>
          <div className="user-chip">
            <span className="avatar small">나</span>
            <span>demo@moneymate.ai</span>
          </div>
        </header>

        <section className="content-grid">
          <section className="panel record-panel" aria-labelledby="record-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Private Ledger</p>
                <h2 id="record-title">나만 보는 기록</h2>
              </div>
              <span className="privacy-badge">비공개</span>
            </div>

            <form className="record-form" onSubmit={addRecord}>
              <label>
                카테고리
                <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value as Category)}>
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label>
                메모
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="예: 오후 카페는 참기"
                />
              </label>

              <label>
                금액 선택 입력
                <input
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="예: 4500"
                />
              </label>

              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={relatedToMission}
                  onChange={(event) => setRelatedToMission(event.target.checked)}
                />
                오늘 미션과 연결
              </label>

              <button type="submit" className="secondary-button">기록 추가</button>
            </form>

            <div className="record-list">
              {records.slice(0, 4).map((record) => (
                <article className="record-item" key={record.id}>
                  <span className="category-dot">{record.category}</span>
                  <div>
                    <strong>{record.note}</strong>
                    <p>{record.relatedToMission ? "미션 관련 기록" : "개인 기록"} · 친구에게 공유 안 함</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel compare-panel" aria-labelledby="compare-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Friend Compare</p>
                <h2 id="compare-title">지우와 습관 비교</h2>
              </div>
              <span className="privacy-badge safe">금액 미공유</span>
            </div>

            <div className="shared-status">
              <div>
                <strong>함께 스트릭 {Math.min(myStreak, friendProfile.streak)}일째</strong>
                <p>공동 미션 {groupProgress} / 5 완료</p>
              </div>
              <div className="shared-progress" aria-label={`공동 미션 ${groupProgress}/5 완료`}>
                <span style={{ width: `${(groupProgress / 5) * 100}%` }} />
              </div>
            </div>

            <div className="profile-compare">
              <ProfileCard
                avatar={myProfile.avatar}
                name={myProfile.name}
                mission={recommendedMission.title}
                status={missionStatus}
                streak={myStreak}
                level={myProfile.level}
                weeklyDone={missionDone ? myProfile.weeklyDone + 1 : myProfile.weeklyDone}
                goal={myProfile.goal}
                goalProgress={missionDone ? myProfile.goalProgress + 3 : myProfile.goalProgress}
              />

              <div className="versus">
                <span>함께</span>
                <strong>VS</strong>
                <small>습관만 비교</small>
              </div>

              <ProfileCard {...friendProfile} />
            </div>

            <div className="actions">
              <button className="primary-button" onClick={() => setMissionDone(true)}>
                오늘 미션 완료
              </button>
              <button className="secondary-button">응원 보내기</button>
              <button className="ghost-button">같이 미션하기</button>
            </div>

            <div className="timeline">
              <h3>오늘의 흐름</h3>
              <TimelineItem title="지우님이 미션을 완료했어요" text="소비 전 30초 생각하기 · 스트릭 6일" />
              <TimelineItem title={missionDone ? "내가 오늘 미션을 완료했어요" : "내 미션이 아직 진행 중이에요"} text={`${recommendedMission.title} · ${missionDone ? "친구 피드에 완료로 표시" : "금액 없이 상태만 표시"}`} />
              <TimelineItem title={`공동 미션이 ${groupProgress * 20}% 진행 중이에요`} text="이번 주 배달 2회 줄이기" />
            </div>
          </section>

          <aside className="right-column">
            <section className="panel mission-card">
              <p className="eyebrow">Today Mission</p>
              <h2>{recommendedMission.title}</h2>
              <p>{recommendedMission.reason}</p>
              <button className="primary-button full" onClick={() => setMissionDone(true)}>
                완료하기
              </button>
            </section>

            <section className="panel ai-card">
              <p className="eyebrow">MoneyMate AI</p>
              <h2>다음 행동 추천</h2>
              <p>
                지우님은 오늘 먼저 완료했어요. 지금은 금액 기록보다 미션 완료 흐름을 이어가는 게 좋아요.
              </p>
              <div className="agent-steps">
                <span>기록 확인</span>
                <span>친구 상태 확인</span>
                <span>미션 추천</span>
              </div>
            </section>

            <section className="panel goal-card">
              <p className="eyebrow">Goal</p>
              <div className="goal-row">
                <h2>제주 여행</h2>
                <strong>{missionDone ? 45 : 42}%</strong>
              </div>
              <div className="goal-bar">
                <span style={{ width: `${missionDone ? 45 : 42}%` }} />
              </div>
              <p>작은 미션을 완료할 때마다 목표가 조금씩 가까워져요.</p>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}

function ProfileCard({
  avatar,
  name,
  mission,
  status,
  streak,
  level,
  weeklyDone,
  goal,
  goalProgress,
}: {
  avatar: string;
  name: string;
  mission: string;
  status: MissionStatus;
  streak: number;
  level: number;
  weeklyDone: number;
  goal: string;
  goalProgress: number;
}) {
  return (
    <article className="profile-card">
      <div className="profile-top">
        <span className="avatar">{avatar}</span>
        <div>
          <h3>{name}</h3>
          <p>{status}</p>
        </div>
      </div>

      <div className="mission-line">
        <span>오늘 미션</span>
        <strong>{mission}</strong>
      </div>

      <div className="metric-grid">
        <Metric label="스트릭" value={`${streak}일`} />
        <Metric label="레벨" value={`Lv.${level}`} />
        <Metric label="이번 주" value={`${weeklyDone}개`} />
      </div>

      <div className="goal-mini">
        <div>
          <span>{goal}</span>
          <strong>{goalProgress}%</strong>
        </div>
        <div className="goal-bar">
          <span style={{ width: `${goalProgress}%` }} />
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TimelineItem({ title, text }: { title: string; text: string }) {
  return (
    <article className="timeline-item">
      <span className="timeline-dot" />
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </article>
  );
}

function navIcon(item: string) {
  const icons: Record<string, string> = {
    홈: "⌂",
    "내 기록": "□",
    "오늘 미션": "✓",
    "친구 비교": "◇",
    "공동 미션": "◌",
    목표: "◎",
  };
  return icons[item] ?? "•";
}

export default App;
