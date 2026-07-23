import { useEffect, useState } from "react";
import MainPage from "./components/MainPage";
import RoomPage from "./components/RoomPage";
import { getTempUserId } from "./lib/tempUser";

// Express 서버 주소. 나중에 .env(VITE_API_BASE_URL)로 옮기면 됨.
const API_BASE_URL = "http://localhost:4000";

/**
 * ✅ meetings(모임 목록), myMeetings(내 모임), 생성/신청/신청취소/삭제 — 전부 실제
 * Express API로 연결되어 있습니다. 아직 mock인 것: 채팅 메시지/참가자 목록(실시간 통신
 * API가 없음), 음소거 버튼(로컬 UI 상태일 뿐이라 원래도 API가 필요 없음).
 *
 * - 내가 개설한 모임(isHost: true)은 "내 모임"에서 삭제하기 버튼으로 완전히 제거 가능,
 *   신청해서 참가한 모임은 "신청 취소"로 내 모임에서만 빠짐.
 * - 시작 시간 10분 전이 되면(또는 이미 시작했으면) 두 경우 모두 "입장하기" 버튼으로 바뀜
 *   (이 판단 자체는 MyMeetingsModal이 클라이언트 시계로 계산함).
 * - "입장하기"를 누르면 그 모임의 실제 시작 시각(startTimestamp)과 진행 시간(durationSeconds)을
 *   그대로 RoomPage에 넘긴다. 카운트다운 계산 자체는 RoomPage가 실시간 시계(Date.now()) 기준으로
 *   매초 다시 계산하므로, 시작 시간 전에 일찍 입장해도 타이머가 미리 줄어들지 않고 전체 진행
 *   시간에서 멈춰있다가 실제 시작 시각이 되는 순간부터 줄어든다. RoomPage에 key={roomMeeting.id}를
 *   줘서 모임이 바뀔 때마다 완전히 새로 마운트되게 했다(모임마다 독립된 room처럼 동작). 실제
 *   라우터 도입 시 이 부분이 /room/:meetingId로 대체됨.
 * - 시작 시간 + 진행 시간이 지나면 해당 모임은 "내 모임"에서 자동으로 사라진다 — 서버(GET
 *   /meetings/mine)가 매 요청마다 계산해서 걸러주고, 클라이언트는 30초마다 다시 불러와 반영한다.
 *   Room 화면 자체는 별도로 5분(GRACE_PERIOD_SECONDS)의 유예 시간을 두고 있어서, 이미 입장해
 *   있던 사람은 그 방에서 5분 더 머무를 수 있다(배경이 불 꺼진 이미지로 바뀜).
 */

// ---- 더미 데이터 (Room 화면 확인용 — 실시간 통신 API가 아직 없어 mock 유지) ----
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

// "1시간"/"30분" 같은 라벨을 총 초(seconds)로 변환 (Room 입장 시 타이머 계산용)
function durationToSeconds(hourLabel, minuteLabel) {
  const hour = parseInt(hourLabel, 10) || 0;
  const minute = parseInt(minuteLabel, 10) || 0;
  return hour * 3600 + minute * 60;
}

/** "HH:MM" 문자열을 오늘 날짜의 Date 객체로 변환 (Room 입장 시 타이머 계산용) */
function todayAt(hhmm) {
  const [h, m] = (hhmm || "0:0").split(":").map((n) => parseInt(n, 10) || 0);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

/** fetch 응답이 실패면 서버가 보낸 에러 메시지를 뽑아 에러로 던진다 */
async function throwIfNotOk(res) {
  if (!res.ok) {
    let message = `요청 실패 (status ${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // 응답 본문이 JSON이 아닐 수도 있음 — 기본 메시지 사용
    }
    throw new Error(message);
  }
}

export default function App() {
  // 화면 전환 상태 (나중에 react-router 같은 라우터로 대체 가능)
  const [view, setView] = useState("main"); // "main" | "room"
  const [messages, setMessages] = useState(DUMMY_MESSAGES);
  const [isMuted, setIsMuted] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [myMeetings, setMyMeetings] = useState([]);
  // 지금 입장해 있는 모임 (모임마다 room이 별개로 존재하도록, key로 강제 재마운트시킬 때 사용)
  const [roomMeeting, setRoomMeeting] = useState(null); // { id, title, startTimestamp, durationSeconds } | null

  // ---- 서버 조회 함수들 (여러 곳에서 재사용) ----

  const fetchMeetings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/meetings`, {
        headers: { "x-user-id": getTempUserId() },
      });
      await throwIfNotOk(res);
      setMeetings(await res.json());
    } catch (err) {
      console.error("모임 목록 조회 실패:", err.message);
    }
  };

  const fetchMyMeetings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/meetings/mine`, {
        headers: { "x-user-id": getTempUserId() },
      });
      await throwIfNotOk(res);
      setMyMeetings(await res.json());
    } catch (err) {
      console.error("내 모임 조회 실패:", err.message);
    }
  };

  // 마운트 시 최초 조회
  useEffect(() => {
    fetchMeetings();
    fetchMyMeetings();
  }, []);

  // 내 모임은 "시작+진행시간 지나면 사라짐"을 서버가 매 요청마다 계산해주므로,
  // 주기적으로 다시 불러와야 그 변화가 화면에 반영된다.
  useEffect(() => {
    const interval = setInterval(fetchMyMeetings, 30000);
    return () => clearInterval(interval);
  }, []);

  // "모임 만들기" → POST /meetings. 성공하면 두 목록을 다시 불러와 최신 상태로 맞춘다.
  // (내가 만든 모임은 서버가 자동으로 host로 등록해주기 때문에, GET /meetings에는
  // 자동으로 안 뜨고 GET /meetings/mine에만 나타난다.)
  const handleCreateMeeting = async (values) => {
    try {
      const res = await fetch(`${API_BASE_URL}/meetings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": getTempUserId(),
        },
        body: JSON.stringify(values),
      });
      await throwIfNotOk(res);
      await fetchMyMeetings();
    } catch (err) {
      console.error("모임 생성 실패:", err.message);
      alert(`모임 생성에 실패했습니다: ${err.message}`);
    }
  };

  // 모임 목록에서 "신청하기" → POST /meetings/:id/apply
  const handleApplyMeeting = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/meetings/${id}/apply`, {
        method: "POST",
        headers: { "x-user-id": getTempUserId() },
      });
      await throwIfNotOk(res);
      await Promise.all([fetchMeetings(), fetchMyMeetings()]);
    } catch (err) {
      console.error("신청 실패:", err.message);
      alert(`신청에 실패했습니다: ${err.message}`);
    }
  };

  // 신청 취소 (모임 목록의 "취소" 버튼 / 내 모임의 "신청 취소" 버튼 공용) → DELETE /meetings/:id/apply
  const handleCancelApply = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/meetings/${id}/apply`, {
        method: "DELETE",
        headers: { "x-user-id": getTempUserId() },
      });
      await throwIfNotOk(res);
      await Promise.all([fetchMeetings(), fetchMyMeetings()]);
    } catch (err) {
      console.error("신청 취소 실패:", err.message);
      alert(`신청 취소에 실패했습니다: ${err.message}`);
    }
  };

  // 모임 삭제 (내가 개설한 모임에서만 노출) → DELETE /meetings/:id
  const handleDeleteMeeting = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/meetings/${id}`, {
        method: "DELETE",
        headers: { "x-user-id": getTempUserId() },
      });
      await throwIfNotOk(res);
      await Promise.all([fetchMeetings(), fetchMyMeetings()]);
    } catch (err) {
      console.error("모임 삭제 실패:", err.message);
      alert(`모임 삭제에 실패했습니다: ${err.message}`);
    }
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

  // 방을 나가면, 혹시 그사이 모임이 끝나서 서버에서 걸러졌을 수 있으니 내 모임도 다시 조회
  const handleExitRoom = () => {
    setView("main");
    setRoomMeeting(null);
    fetchMyMeetings();
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
          onRefreshMeetings={fetchMeetings}
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
