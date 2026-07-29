import { useState, useEffect } from "react";
import TaxiLoader from "./TaxiLoader";
import { API_BASE } from "./apiBase";
import { describeCostByAmount, estimateCost } from "./describeCost";

const AVATAR_COLORS = ["#C8102E", "#2F8F5B", "#C98A1F", "#5B6472"];

function formatMessageTime(iso) {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
}

function GroupChatScreen({ candidate, onBack, onComplete, onUpdateCandidate, onLeave }) {
  const groupId = candidate?.groupId ?? null;
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(!!groupId);
  const [leaving, setLeaving] = useState(false);
  const [respondError, setRespondError] = useState(null);
  const [boarding, setBoarding] = useState(false);
  // '이전'으로 나갔다가 돌아와도 이 화면 상태가 초기화되지 않도록, App.jsx의 candidate 객체에 백업해둔 값에서 복원함
  const [boardingResult, setBoardingResultState] = useState(candidate?.boardingResult ?? null);
  const [boardingError, setBoardingError] = useState(null);

  function setBoardingResult(value) {
    setBoardingResultState(value);
    onUpdateCandidate?.({ boardingResult: value });
  }
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  const myRequestId = candidate?.myRequestId;

  useEffect(() => {
    if (!groupId) return;

    function loadMembers() {
      fetch(`${API_BASE}/api/requests/group/${groupId}`)
        .then((res) => res.json())
        .then(setMembers)
        .catch(() => {})
        .finally(() => setLoading(false));
    }

    loadMembers();
    const interval = setInterval(loadMembers, 5000);
    return () => clearInterval(interval);
  }, [groupId]);

  useEffect(() => {
    if (!myRequestId) return;

    function sendHeartbeat() {
      fetch(`${API_BASE}/api/requests/${myRequestId}/heartbeat`, { method: "POST" }).catch(() => {});
    }

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(interval);
  }, [myRequestId]);

  useEffect(() => {
    if (!groupId) return;

    function loadMessages() {
      fetch(`${API_BASE}/api/requests/group/${groupId}/messages`)
        .then((res) => res.json())
        .then(setMessages)
        .catch(() => {});
    }

    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [groupId]);

  async function handleSend() {
    const text = messageText.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/requests/group/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: myRequestId, text }),
      });
      const body = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, body]);
        setMessageText("");
      }
    } finally {
      setSending(false);
    }
  }

  const me = members.find((m) => m.id === myRequestId);
  const matchedMembers = members.filter((m) => m.status === "matched");

  // 실시간 폴링으로 알게 된 인원수를 App.jsx의 candidate에도 반영해, '이전'으로 돌아가도 최신 값이 보이게 함
  useEffect(() => {
    if (matchedMembers.length > 0) {
      onUpdateCandidate?.({ groupCount: matchedMembers.length });
    }
  }, [matchedMembers.length]);

  const pendingOthers = members.filter((m) => m.status === "pending" && m.id !== myRequestId);
  const iAmPending = me?.status === "pending";

  const count = matchedMembers.length || candidate?.groupCount || 1;
  const isFull = count >= 4;
  const myConsent = me?.consent ?? false;
  const consentCount = matchedMembers.filter((m) => m.consent).length;
  const allConsented = count > 0 && consentCount === count;
  const canBoard = isFull || allConsented;
  const cost = estimateCost(count, candidate?.cityHub);
  const costInfo = describeCostByAmount(cost);

  async function handleConsent() {
    if (myConsent) return;
    try {
      await fetch(`${API_BASE}/api/requests/${myRequestId}/consent`, { method: "POST" });
      setMembers((prev) => prev.map((m) => (m.id === myRequestId ? { ...m, consent: true } : m)));
    } catch {}
  }

  async function respond(requestId, accept) {
    setRespondError(null);
    try {
      const res = await fetch(`${API_BASE}/api/requests/${requestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      });
      const body = await res.json();
      if (!res.ok) {
        setRespondError(body.error ?? "처리하지 못했어요.");
        return;
      }
      setMembers((prev) => {
        const updatedIds = new Set(body.members.map((m) => m.id));
        const kept = prev.filter((m) => !updatedIds.has(m.id));
        return [...kept, ...body.members];
      });
    } catch {
      setRespondError("처리하지 못했어요. 서버가 켜져 있는지 확인해주세요.");
    }
  }

  async function handleLeave() {
    if (leaving || !myRequestId) return;
    setLeaving(true);
    try {
      await fetch(`${API_BASE}/api/requests/${myRequestId}/leave`, { method: "POST" });
    } finally {
      onLeave?.();
    }
  }

  async function handleBoard() {
    if (boarding) return;
    setBoarding(true);
    setBoardingError(null);
    try {
      const res = await fetch(`${API_BASE}/api/requests/${myRequestId}/board`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) {
        setBoardingError(body.error ?? "탑승 확인에 실패했어요.");
        return;
      }
      setBoardingResult(body);
    } catch {
      setBoardingError("탑승 확인에 실패했어요. 서버가 켜져 있는지 확인해주세요.");
    } finally {
      setBoarding(false);
    }
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <TaxiLoader label="동행자 정보를 불러오는 중..." />
      </div>
    );
  }

  return (
    <div style={{ padding: "0 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{ alignSelf: "flex-start", border: "none", background: "none", color: "#8A7A76", fontSize: 13, padding: "14px 0 0", cursor: "pointer" }}
          >
            ‹ 이전
          </button>
        )}
        <button
          onClick={handleLeave}
          disabled={leaving}
          style={{ border: "none", background: "none", color: "#C8102E", fontSize: 13, padding: "14px 0 0", cursor: leaving ? "default" : "pointer" }}
        >
          {leaving ? "나가는 중..." : "방 나가기"}
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0" }}>
        <div style={{ display: "flex" }}>
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                border: "2px solid #FBF5F1",
                marginLeft: i === 0 ? 0 : -10,
              }}
            />
          ))}
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 999,
            background: isFull ? "#E6F5EC" : "#FCE4E2",
            color: isFull ? "#2F8F5B" : "#8C0E22",
          }}
        >
          {count}/4명 모임
        </span>
      </div>

      <h1 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 4px" }}>
        {iAmPending ? "수락을 기다리는 중이에요" : isFull || allConsented ? "그룹이 확정됐어요" : "동행자를 모으는 중이에요"}
      </h1>

      {iAmPending && (
        <p style={{ fontSize: 12, color: "#8A7A76", margin: "0 0 16px" }}>
          다른 동행자가 신청을 확인하면 알려드릴게요. 그동안 채팅으로 먼저 인사해보세요!
        </p>
      )}

      {respondError && (
        <p style={{ fontSize: 12, color: "#C8102E", margin: "0 0 10px" }}>{respondError}</p>
      )}

      {!iAmPending && pendingOthers.map((p) => (
        <div key={p.id} style={{ background: "#fff", border: "1px solid rgba(36,21,18,0.08)", borderRadius: 14, padding: 14, marginBottom: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 6 }}>
            새로운 동행 신청이 왔어요
            {p.activity?.isActive && (
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2F8F5B", display: "inline-block" }} />
            )}
          </p>
          {p.activity && (
            <p style={{ fontSize: 11, color: p.activity.isActive ? "#2F8F5B" : "#8A7A76", margin: "0 0 10px" }}>{p.activity.label}</p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => respond(p.id, true)}
              className="btn-primary"
              style={{ flex: 1, padding: 10, background: "#C8102E", color: "#fff", border: "none", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              수락
            </button>
            <button
              onClick={() => respond(p.id, false)}
              style={{ flex: 1, padding: 10, background: "#fff", color: "#8A7A76", border: "1px solid rgba(36,21,18,0.12)", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              거절
            </button>
          </div>
        </div>
      ))}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {messages.length === 0 && (
          <p style={{ fontSize: 12, color: "#8A7A76", textAlign: "center", margin: "12px 0" }}>
            아직 메시지가 없어요. 먼저 인사해보세요!
          </p>
        )}
        {messages.map((m) => {
          const fromMe = m.request_id === myRequestId;
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: fromMe ? "flex-end" : "flex-start" }}>
              <div
                style={{
                  background: fromMe ? "#C8102E" : "#EFE7E3",
                  color: fromMe ? "#fff" : "#241512",
                  padding: "8px 14px",
                  borderRadius: 16,
                  fontSize: 13,
                  maxWidth: "75%",
                  textAlign: "left",
                }}
              >
                {m.text}
              </div>
              <span style={{ fontSize: 10, color: "#8A7A76", margin: "2px 4px 0" }}>{formatMessageTime(m.created_at)}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="메시지를 입력하세요"
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 999,
            border: "1px solid rgba(36,21,18,0.12)",
            fontSize: 13,
            boxSizing: "border-box",
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !messageText.trim()}
          style={{
            padding: "10px 16px",
            borderRadius: 999,
            border: "none",
            background: "#C8102E",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            cursor: sending || !messageText.trim() ? "default" : "pointer",
            opacity: sending || !messageText.trim() ? 0.6 : 1,
          }}
        >
          전송
        </button>
      </div>

      {!iAmPending && !isFull && !allConsented && (
        <div style={{ background: "#FCE4E2", borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px" }}>정원이 다 차지 않았어요</p>
          <button
            onClick={handleConsent}
            disabled={myConsent}
            className="btn-primary"
            style={{
              width: "100%",
              padding: 12,
              background: myConsent ? "#EFE7E3" : "#C8102E",
              color: myConsent ? "#8A7A76" : "#fff",
              border: "none",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              cursor: myConsent ? "default" : "pointer",
            }}
          >
            {myConsent ? `동의 완료, 기다리는 중 (${consentCount}/${count})` : `동의하고 출발 확정 (${consentCount}/${count})`}
          </button>
        </div>
      )}

      <div style={{ border: "1px solid #C8102E", borderRadius: 14, padding: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 28 }}>{costInfo.icon}</span>
        <div>
          <p style={{ fontSize: 12, color: "#8A7A76", margin: "0 0 4px" }}>
            예상 요금 (1인당) · {canBoard ? "확정 인원 기준" : "지금 인원 기준"}
          </p>
          <p style={{ fontSize: 20, fontWeight: 800, color: "#C8102E", margin: 0 }}>{cost.toLocaleString()}원</p>
          <p style={{ fontSize: 11, color: "#8A7A76", margin: "2px 0 0" }}>{costInfo.label} 정도예요</p>
        </div>
      </div>

      {iAmPending && (
        <p style={{ fontSize: 12, color: "#8A7A76", textAlign: "center", margin: "0 0 10px" }}>
          수락되면 탑승 확인을 진행할 수 있어요.
        </p>
      )}

      {!iAmPending && boardingError && (
        <p style={{ fontSize: 12, color: "#C8102E", margin: "0 0 10px", textAlign: "center" }}>{boardingError}</p>
      )}

      {!iAmPending && boardingResult && (
        <p
          style={{
            fontSize: 13,
            fontWeight: 700,
            textAlign: "center",
            margin: "0 0 10px",
            color: boardingResult.status === "late" ? "#8C0E22" : "#2F8F5B",
          }}
        >
          {boardingResult.status === "late"
            ? `탑승 확인이 ${boardingResult.minutesLate}분 늦게 됐어요`
            : "정상 탑승 확인됐어요"}
        </p>
      )}

      {!iAmPending && (boardingResult ? (
        <button
          onClick={onComplete}
          className="btn-primary"
          style={{
            width: "100%",
            padding: 15,
            borderRadius: 999,
            fontSize: 15,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            background: "#C8102E",
            color: "#fff",
            marginTop: "auto",
          }}
        >
          다음으로
        </button>
      ) : (
        <button
          onClick={handleBoard}
          disabled={!canBoard || boarding}
          className="btn-primary"
          style={{
            width: "100%",
            padding: 15,
            borderRadius: 999,
            fontSize: 15,
            fontWeight: 700,
            border: "none",
            cursor: canBoard && !boarding ? "pointer" : "default",
            background: canBoard ? "#C8102E" : "#EFE7E3",
            color: canBoard ? "#fff" : "#8A7A76",
            marginTop: "auto",
          }}
        >
          {boarding ? "확인 중..." : "탑승 확인"}
        </button>
      ))}
    </div>
  );
}

export default GroupChatScreen;
