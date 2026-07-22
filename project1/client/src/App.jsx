import { useEffect, useState } from "react";
import MainPage from "./components/MainPage";
import RoomPage from "./components/RoomPage";

/**
 * ⚠️ 이 App.jsx는 mock(더미) 데이터만으로 전체 흐름을 실행/확인하기 위한 버전입니다.
 * 실제 API/DB 연동이나 라우터(react-router 등)는 아직 없습니다.
 *
 * - 내가 개설한 모임(isHost: true)은 "내 모임"에서 삭제하기 버튼으로 완전히 제거 가능,
 *   신청해서 참가한 모임은 "신청 취소"로 내 모임에서만 빠짐.
 * - 시작 시간 10분 전이 되면(또는 이미 시작했으면) 두 경우 모두 "입장하기" 버튼으로 바뀜.
 * - "입장하기"를 누르면 그 모임의 실제 시작 시각(startTimestamp)과 진행 시간(durationSeconds)을
 *   그대로 RoomPage에 넘긴다. 카운트다운 계산 자체는 RoomPage가 실시간 시계(Date.now()) 기준으로
 *   매초 다시 계산하므로, 시작 시간 전에 일찍 입장해도 타이머가 미리 줄어들지 않고 전체 진행
 *   시간에서 멈춰있다가 실제 시작 시각이 되는 순간부터 줄어든다. RoomPage에 key={roomMeeting.id}를
 *   줘서 모임이 바뀔 때마다 완전히 새로 마운트되게 했다(모임마다 독립된 room처럼 동작). 실제
 *   라우터 도입 시 이 부분이 /room/:meetingId로 대체됨.
 * - 시작 시간 + 진행 시간이 지나면(=Room 타이머가 0이 되는 시점) 해당 모임은 "내 모임"에서
 *   자동으로 사라진다. Room 화면 자체는 별도로 5분(GRACE_PERIOD_SECONDS)의 유예 시간을 두고
 *   있어서, 이미 입장해 있던 사람은 그 방에서 5분 더 머무를 수 있다(배경이 불 꺼진 이미지로 바뀜).
 *
 * 이후 API 연동 시 각 핸들러 안의 로컬 state 로직을 fetch 호출로 바꾸면 됩니다.
 */

// ---- 더미 데이터 (모임 목록 모달 확인용) ----
const INITIAL_MEETINGS = [
  {
    id: "m1",
    category: "reading",
    categoryLabel: "독서",
    title: "밤샘 독서 토론회: 모던 클래식",
    description:
      "오늘 밤, 따뜻한 모닥불 앞에서 고전 문학의 현대적 해석에 대해 자유롭게 이야기 나누실 분들을 찾습니다.",
    startTime: "20:00",
    durationHour: "1시간",
    durationMinute: "0분",
    currentCount: 3,
    capacity: 6,
  },
  {
    id: "m2",
    category: "hobby",
    categoryLabel: "취미",
    title: "기타 코드 정복: 어쿠스틱 밤",
    description: "초보자 환영! 기본적인 코드 몇 가지만 알아도 연주할 수 있는 캠핑송들을 함께 연습해봅시다.",
    startTime: "19:30",
    durationHour: "1시간",
    durationMinute: "30분",
    currentCount: 5,
    capacity: 8,
  },
  {
    id: "m3",
    category: "study",
    categoryLabel: "공부",
    title: "새벽 코딩 스쿼드: 알고리즘 챌린지",
    description: "매일 새벽 1시간, 알고리즘 문제를 풀고 서로의 코드를 리뷰하는 스터디입니다.",
    startTime: "06:00",
    durationHour: "1시간",
    durationMinute: "0분",
    currentCount: 2,
    capacity: 4,
  },
];

// ---- 더미 데이터 (내 모임 모달 확인용) ----
const INITIAL_MY_MEETINGS = [
  {
    id: "mine1",
    title: "밤새도록 고전 읽기 모임",
    description: "헤르만 헤세의 '데미안'을 함께 읽고 감상을 나눕니다.",
    isHost: true,
    startTime: "20:00",
    durationHour: "2시간",
    durationMinute: "30분",
    currentCount: 4,
    capacity: 6,
  },
  {
    id: "mine2",
    title: "초보자를 위한 수채화 교실",
    description: "함께 따뜻한 색감의 수채화를 그려보는 힐링 모임입니다.",
    isHost: false,
    startTime: "14:00",
    durationHour: "2시간",
    durationMinute: "0분",
    currentCount: 2,
    capacity: 4,
  },
  {
    id: "mine3",
    title: "새벽 공기 가르는 조깅 모임",
    description: "상쾌한 새벽 공기를 마시며 5km 가볍게 뛰어요.",
    isHost: false,
    startTime: "06:00",
    durationHour: "1시간",
    durationMinute: "0분",
    currentCount: 3,
    capacity: 4,
  },
];

// ---- 더미 데이터 (Room 화면 확인용) ----
const DUMMY_PARTICIPANTS = [
  { id: "p0", name: "나", isHost: true },
  { id: "p1", name: "김철수" },
  { id: "p2", name: "이영희" },
  { id: "p3", name: "박지민" },
  { id: "p4", name: "정우성" },
  { id: "p5", name: "최유나" },
];

const DUMMY_MESSAGES = [
  {
    id: "c1",
    sender: "김철수",
    time: "20:45",
    text: "다들 모닥불 소리 들리시나요? 너무 힐링되네요.",
  },
  {
    id: "c2",
    isMine: true,
    time: "20:46",
    text: "네! 픽셀 아트 스타일이라 더 감성적인 것 같아요.",
  },
  {
    id: "c3",
    sender: "이영희",
    time: "20:47",
    text: "오늘 주제는 '나만의 휴식'입니다. 한 분씩 이야기해볼까요?",
  },
  { id: "c4", isSystem: true, text: "정우성 님이 입장했습니다." },
];

// 모임 만들기의 카테고리 라벨 → 모임 목록 모달의 카테고리 키 매핑
const CATEGORY_KEY_MAP = { 독서: "reading", 취미: "hobby", 공부: "study", 기타: "etc" };

// "1시간"/"30분" 같은 라벨을 총 초(seconds)로 변환
function durationToSeconds(hourLabel, minuteLabel) {
  const hour = parseInt(hourLabel, 10) || 0;
  const minute = parseInt(minuteLabel, 10) || 0;
  return hour * 3600 + minute * 60;
}

/** "HH:MM" 문자열을 오늘 날짜의 Date 객체로 변환 */
function todayAt(hhmm) {
  const [h, m] = (hhmm || "0:0").split(":").map((n) => parseInt(n, 10) || 0);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

export default function App() {
  // 화면 전환 상태 (나중에 react-router 같은 라우터로 대체 가능)
  const [view, setView] = useState("main"); // "main" | "room"
  const [messages, setMessages] = useState(DUMMY_MESSAGES);
  const [isMuted, setIsMuted] = useState(false);
  const [meetings, setMeetings] = useState(INITIAL_MEETINGS);
  const [myMeetings, setMyMeetings] = useState(INITIAL_MY_MEETINGS);
  // 지금 입장해 있는 모임 (모임마다 room이 별개로 존재하도록, key로 강제 재마운트시킬 때 사용)
  const [roomMeeting, setRoomMeeting] = useState(null); // { id, title, totalSeconds } | null

  // 시작 시간 + 진행 시간이 지난 모임은 "내 모임"에서 자동으로 제거
  // (룸 페이지 자체는 별도 유예 시간을 두고 있어서, 이미 입장해 있는 사람은 영향받지 않음)
  useEffect(() => {
    const removeEndedMeetings = () => {
      const now = Date.now();
      setMyMeetings((prev) =>
        prev.filter((m) => {
          const endMs =
            todayAt(m.startTime).getTime() +
            durationToSeconds(m.durationHour, m.durationMinute) * 1000;
          return now < endMs;
        })
      );
    };
    removeEndedMeetings(); // 진입 시 한 번 즉시 확인
    const interval = setInterval(removeEndedMeetings, 30000); // 이후 30초마다 재확인
    return () => clearInterval(interval);
  }, []);

  // "모임 만들기"에서 입력한 값을 "내 모임"에만 추가 (내가 만든 모임은 모임 목록에는 노출하지 않음)
  const handleCreateMeeting = (values) => {
    const startHourNum = parseInt(values.startHour, 10) || 0;
    const startMinuteNum = parseInt(values.startMinute, 10) || 0;
    const startTime = `${String(startHourNum).padStart(2, "0")}:${String(
      startMinuteNum
    ).padStart(2, "0")}`;
    const capacityNum = parseInt(values.capacity, 10) || 4;
    const id = `meeting-${Date.now()}`;

    setMyMeetings((prev) => [
      {
        id,
        title: values.title || "이름 없는 모임",
        description: values.description || "",
        isHost: true, // 내가 직접 개설한 모임
        startTime,
        durationHour: values.durationHour,
        durationMinute: values.durationMinute,
        currentCount: 1,
        capacity: capacityNum,
      },
      ...prev,
    ]);
  };

  // 모임 목록에서 "신청하기" → 내 모임 목록에 실제로 반영 (정원 초과/중복 신청 방지)
  const handleApplyMeeting = (id) => {
    const target = meetings.find((m) => m.id === id);
    if (!target) return;
    if (myMeetings.some((m) => m.id === id)) return; // 이미 신청한 모임이면 무시
    if (target.currentCount >= target.capacity) return; // 정원이 다 찼으면 무시

    setMeetings((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, currentCount: m.currentCount + 1 } : m
      )
    );

    setMyMeetings((prev) => [
      {
        id: target.id,
        title: target.title,
        description: target.description,
        isHost: false, // 신청해서 참가하는 입장
        startTime: target.startTime,
        durationHour: target.durationHour,
        durationMinute: target.durationMinute,
        currentCount: target.currentCount + 1,
        capacity: target.capacity,
      },
      ...prev,
    ]);
  };

  // 신청 취소 (모임 목록의 "취소" 버튼 / 내 모임의 "신청 취소" 버튼 공용) — 내 모임에서만 제거
  const handleCancelApply = (id) => {
    setMyMeetings((prev) => prev.filter((m) => m.id !== id));
    setMeetings((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, currentCount: Math.max(0, m.currentCount - 1) }
          : m
      )
    );
  };

  // 모임 삭제 (내가 개설한 모임에서만 노출) — 모임 목록 + 내 모임 양쪽에서 완전히 제거
  const handleDeleteMeeting = (id) => {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    setMyMeetings((prev) => prev.filter((m) => m.id !== id));
  };

  // "입장하기" → 그 모임 전용 Room으로 이동 (실제 시작 시각 + 진행 시간을 그대로 넘긴다.
  // 타이머 계산 자체는 RoomPage가 실시간 시계 기준으로 처리한다.)
  const handleEnterMeeting = (id) => {
    const target = myMeetings.find((m) => m.id === id);
    if (!target) return;
    setRoomMeeting({
      id: target.id,
      title: target.title,
      startTimestamp: todayAt(target.startTime).getTime(),
      durationSeconds: durationToSeconds(target.durationHour, target.durationMinute),
    });
    setView("room");
  };

  const handleExitRoom = () => {
    setView("main");
    setRoomMeeting(null);
  };

  return (
    <div className="relative">
      {view === "main" ? (
        <MainPage
          meetings={meetings}
          myMeetings={myMeetings}
          onCreateMeeting={handleCreateMeeting}
          onApplyMeeting={handleApplyMeeting}
          onCancelApplyMeeting={handleCancelApply}
          onEnterMeeting={handleEnterMeeting}
          onCancelMeeting={handleCancelApply}
          onDeleteMeeting={handleDeleteMeeting}
          onRefreshMeetings={() => console.log("[preview] 새로고침")}
        />
      ) : (
        <RoomPage
          key={roomMeeting?.id} // 모임이 바뀔 때마다 완전히 새로 마운트되어 상태가 초기화됨
          participants={DUMMY_PARTICIPANTS}
          messages={messages}
          startTimestamp={roomMeeting?.startTimestamp ?? Date.now()}
          durationSeconds={roomMeeting?.durationSeconds ?? 0}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted((m) => !m)}
          onSendMessage={(text) =>
            setMessages((prev) => [
              ...prev,
              {
                id: `local-${Date.now()}`,
                isMine: true,
                time: new Date().toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                text,
              },
            ])
          }
          onExit={handleExitRoom}
        />
      )}
    </div>
  );
}
