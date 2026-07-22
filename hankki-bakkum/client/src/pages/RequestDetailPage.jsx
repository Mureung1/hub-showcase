import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { confirmRequest } from "../lib/api";
import StepBar from "../components/StepBar";
import { STATUS } from "../lib/status";
import "./RequestDetailPage.css";

/**
 * ④ 요청 상세 — 신뢰 장치 집합 (기획서 5-2절)
 *  - 진행 스텝바 / 기대 예시 고정 노출 / 수정 1회 룰박스 / 식권 티켓
 *  - 지원하기(학생) → 모집중→진행중  [client 직접]
 *  - 결과물 제출(헬퍼) → 진행중→완료대기  [client 직접, 단순 전환]
 *  - 완료 확인(양측) → server가 2건 검증 후 완료 전환 + 티켓 발급  [server 경유]
 */
export default function RequestDetailPage() {
  const { id } = useParams();
  const { user, profile } = useAuth();

  const [request, setRequest] = useState(null);
  const [owner, setOwner] = useState(null);
  const [helper, setHelper] = useState(null);
  const [myConfirmed, setMyConfirmed] = useState(false); // 내가 이미 확인했는지
  const [confirmCount, setConfirmCount] = useState(0);    // 총 확인 수
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false); // 지원/제출/확인 공용 처리중 플래그
  const [error, setError] = useState("");

  async function loadRequest() {
    setLoading(true);
    setError("");

    const { data: req, error: reqErr } = await supabase
      .from("requests")
      .select("*")
      .eq("id", id)
      .single();

    if (reqErr || !req) {
      setError("요청글을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      setLoading(false);
      return;
    }
    setRequest(req);

    // 사장님·헬퍼 프로필
    const ids = [req.owner_id, req.helper_id].filter(Boolean);
    if (ids.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, nickname, role")
        .in("id", ids);
      setOwner(users?.find((u) => u.id === req.owner_id) ?? null);
      setHelper(users?.find((u) => u.id === req.helper_id) ?? null);
    }

    // 완료 확인 현황 조회 (완료대기 이상에서만 의미 있음)
    const { data: confs } = await supabase
      .from("confirmations")
      .select("user_id")
      .eq("request_id", id);
    setConfirmCount(confs?.length ?? 0);
    setMyConfirmed(!!confs?.some((c) => c.user_id === user?.id));

    setLoading(false);
  }

  useEffect(() => {
    loadRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── 지원하기 (학생) — 모집중→진행중 [client 직접] ──
  async function handleApply() {
    if (!user) return;
    setBusy(true);
    setError("");
    const { data, error: updErr } = await supabase
      .from("requests")
      .update({ helper_id: user.id, status: STATUS.IN_PROGRESS })
      .eq("id", id)
      .eq("status", STATUS.RECRUITING)
      .is("helper_id", null)
      .select();
    setBusy(false);
    if (updErr) return setError("지원 처리 중 문제가 생겼어요. 다시 시도해 주세요.");
    if (!data || data.length === 0) {
      setError("아쉽지만 방금 다른 헬퍼님과 매칭됐어요.");
      return loadRequest();
    }
    loadRequest();
  }

  // ── 결과물 제출 (헬퍼) — 진행중→완료대기 [client 직접, 단순 전환] ──
  async function handleSubmitWork() {
    if (!user) return;
    setBusy(true);
    setError("");
    const { data, error: updErr } = await supabase
      .from("requests")
      .update({ status: STATUS.PENDING_DONE })
      .eq("id", id)
      .eq("status", STATUS.IN_PROGRESS)
      .eq("helper_id", user.id)
      .select();
    setBusy(false);
    if (updErr || !data || data.length === 0) {
      return setError("결과물 제출에 실패했어요. 다시 시도해 주세요.");
    }
    loadRequest();
  }

  // ── 완료 확인 (양측) — server가 판단 [server 경유] ──
  async function handleConfirm() {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      await confirmRequest(id, user.id); // server 호출 — 직접 DB 수정 아님
      await loadRequest(); // 결과(완료됐는지/대기인지)를 다시 읽어와 화면 갱신
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="detail-page detail-page--empty">불러오는 중이에요…</div>;
  if (!request) return <div className="detail-page detail-page--empty">{error}</div>;

  const isOwner = user?.id === request.owner_id;
  const isMatchedHelper = user?.id === request.helper_id;

  const canApply =
    profile?.role === "student" && !isOwner && request.status === STATUS.RECRUITING;
  const canSubmitWork =
    isMatchedHelper && request.status === STATUS.IN_PROGRESS;
  const canConfirm =
    (isOwner || isMatchedHelper) &&
    request.status === STATUS.PENDING_DONE &&
    !myConfirmed;

  return (
    <div className="detail-page">
      <section className="card">
        <StepBar status={request.status} />
      </section>

      <section className="card">
        <div className="detail-tags">
          {request.tag && <span className="chip chip--primary">{request.tag}</span>}
          {request.region && <span className="chip chip--muted">{request.region}</span>}
        </div>
        <h1 className="detail-title">{request.title}</h1>
        <p className="detail-meta">
          {owner ? `${owner.nickname} 사장님` : "사장님"}
          {request.due_date && ` · 완료 희망일 ${request.due_date}`}
        </p>
        <p className="detail-content">{request.content}</p>
      </section>

      <section className="card">
        <h2 className="card-title">🖼️ 기대하는 결과물</h2>
        {request.example_image_url ? (
          <img className="detail-example-img" src={request.example_image_url} alt="기대 결과물 예시" />
        ) : (
          <div className="detail-example-placeholder">예시 이미지 준비 중</div>
        )}
        {request.example_note && <p className="detail-example-note">{request.example_note}</p>}
        <div className="rulebox">
          <strong>✏️ 수정 요청 1회 포함</strong>
          <p>결과물 확인 후 수정은 <em>1회까지</em> 요청할 수 있어요. 범위를 미리 정해두면 다툼이 확 줄어요. 그래서 기본 규칙이에요.</p>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">🎟️ 보상</h2>
        <div className="ticket">
          <div className="stub">{request.reward_count ?? 0}장</div>
          <div className="body">
            식사권 {request.reward_count ?? 0}장
            {request.reward_menu && ` · ${request.reward_menu}`}
            <br />
            두 사람 모두 확인하면 식사권이 지급돼요
          </div>
        </div>
      </section>

      {request.status !== STATUS.RECRUITING && helper && (
        <section className="card">
          <h2 className="card-title">🤝 매칭된 헬퍼</h2>
          <div className="helper-row">
            <div className="avatar">🧑‍🎨</div>
            <div>
              <p className="helper-name">{helper.nickname} 헬퍼님</p>
              <p className="helper-sub">
                {isMatchedHelper ? "내가 진행 중인 요청이에요" : "작업이 진행되고 있어요"}
              </p>
            </div>
            <span className="chip chip--ok">매칭완료</span>
          </div>
        </section>
      )}

      {/* 완료대기 — 양측 확인 현황 안내 */}
      {request.status === STATUS.PENDING_DONE && (
        <section className="card">
          <h2 className="card-title">✅ 완료 확인</h2>
          <p className="detail-content" style={{ marginBottom: 12 }}>
            두 사람 모두 확인하면 식사권이 지급돼요. (현재 {confirmCount} / 2 확인)
          </p>
          {myConfirmed && (
            <p className="detail-meta">내 확인은 완료됐어요. 상대방 확인을 기다리는 중이에요.</p>
          )}
        </section>
      )}

      {error && <p className="detail-error">{error}</p>}

      {/* 상태·역할에 따라 버튼 하나만 노출 */}
      {canApply && (
        <button className="btn-primary" onClick={handleApply} disabled={busy}>
          {busy ? "지원 중이에요…" : "이 요청에 지원하기"}
        </button>
      )}
      {canSubmitWork && (
        <button className="btn-primary" onClick={handleSubmitWork} disabled={busy}>
          {busy ? "제출 중이에요…" : "결과물 제출하기"}
        </button>
      )}
      {canConfirm && (
        <button className="btn-primary" onClick={handleConfirm} disabled={busy}>
          {busy ? "확인 중이에요…" : "완료 확인하기"}
        </button>
      )}
    </div>
  );
}