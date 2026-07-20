import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import StepBar from "../components/StepBar";
import { STATUS } from "../lib/status";
import "./RequestDetailPage.css";

/**
 * ④ 요청 상세 — 신뢰 장치 집합 (기획서 5-2절)
 *  - 진행 스텝바 (상태값이 채팅을 대체)
 *  - 기대 결과물 예시 고정 노출 + 수정 1회 룰박스
 *  - 보상은 항상 식권 티켓으로 표기
 *  - 지원하기(학생 전용) → helper_id 기록 + 모집중→진행중
 *  - 사장님 화면: 매칭된 헬퍼 정보 표시
 *
 * ✅ role 값은 실제 DB 기준: 'owner'(사장님) | 'student'(학생 헬퍼)
 * ⚠️ 화요일(7/21) 예정: 결과물 제출 → 완료 확인은 server API 경유로 이 페이지에 추가.
 */
export default function RequestDetailPage() {
  const { id } = useParams();
  const { user, profile } = useAuth();

  const [request, setRequest] = useState(null);
  const [owner, setOwner] = useState(null);
  const [helper, setHelper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
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

    // 사장님·헬퍼 프로필 (fkey 조인 이름에 의존하지 않도록 개별 조회)
    const ids = [req.owner_id, req.helper_id].filter(Boolean);
    if (ids.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, nickname, role")
        .in("id", ids);
      setOwner(users?.find((u) => u.id === req.owner_id) ?? null);
      setHelper(users?.find((u) => u.id === req.helper_id) ?? null);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ─── 지원하기 (학생 전용) ───
  // status='모집중' 조건을 update에 함께 걸어 두 학생이 동시에 눌러도 한 명만 매칭됨
  async function handleApply() {
    if (!user) return;
    setApplying(true);
    setError("");

    const { data, error: updErr } = await supabase
      .from("requests")
      .update({ helper_id: user.id, status: STATUS.IN_PROGRESS })
      .eq("id", id)
      .eq("status", STATUS.RECRUITING)
      .is("helper_id", null)
      .select();

    setApplying(false);

    if (updErr) {
      setError("지원 처리 중 문제가 생겼어요. 다시 시도해 주세요.");
      return;
    }
    if (!data || data.length === 0) {
      // 조건 불일치 = 그 사이 다른 헬퍼가 먼저 매칭됨
      setError("아쉽지만 방금 다른 헬퍼님과 매칭됐어요.");
      await loadRequest();
      return;
    }
    await loadRequest();
  }

  if (loading) return <div className="detail-page detail-page--empty">불러오는 중이에요…</div>;
  if (!request) return <div className="detail-page detail-page--empty">{error}</div>;

  const isOwner = user?.id === request.owner_id;
  const isMatchedHelper = user?.id === request.helper_id;
  const canApply =
    profile?.role === "student" &&
    !isOwner &&
    request.status === STATUS.RECRUITING;

  return (
    <div className="detail-page">
      {/* 진행 스텝바 — 항상 최상단 고정 노출 */}
      <section className="card">
        <StepBar status={request.status} />
      </section>

      {/* 요청 본문 */}
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

      {/* 기대 결과물 예시 — 고정 노출 (분쟁 예방 장치, 접기 금지) */}
      <section className="card">
        <h2 className="card-title">🖼️ 기대하는 결과물</h2>
        {request.example_image_url ? (
          <img
            className="detail-example-img"
            src={request.example_image_url}
            alt="기대 결과물 예시"
          />
        ) : (
          <div className="detail-example-placeholder">예시 이미지 준비 중</div>
        )}
        {request.example_note && (
          <p className="detail-example-note">{request.example_note}</p>
        )}

        {/* 수정 1회 룰박스 */}
        <div className="rulebox">
          <strong>✏️ 수정 요청 1회 포함</strong>
          <p>
            결과물 확인 후 수정은 <em>1회까지</em> 요청할 수 있어요. 범위를 미리
            정해두면 다툼이 확 줄어요. 그래서 기본 규칙이에요.
          </p>
        </div>
      </section>

      {/* 보상 — 항상 티켓으로 (기존 Ticket 컴포넌트가 있으면 그걸로 교체) */}
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

      {/* 매칭 정보 — 사장님에게는 헬퍼, 헬퍼에게는 진행 안내 */}
      {request.status !== STATUS.RECRUITING && helper && (
        <section className="card">
          <h2 className="card-title">🤝 매칭된 헬퍼</h2>
          <div className="helper-row">
            <div className="avatar">🧑‍🎨</div>
            <div>
              <p className="helper-name">{helper.nickname} 헬퍼님</p>
              <p className="helper-sub">
                {isMatchedHelper
                  ? "내가 진행 중인 요청이에요"
                  : "작업이 진행되고 있어요"}
              </p>
            </div>
            <span className="chip chip--ok">매칭완료</span>
          </div>
        </section>
      )}

      {error && <p className="detail-error">{error}</p>}

      {/* 주요 액션 — 화면당 1개 */}
      {canApply && (
        <button
          className="btn-primary"
          onClick={handleApply}
          disabled={applying}
        >
          {applying ? "지원 중이에요…" : "이 요청에 지원하기"}
        </button>
      )}

      {/*
        TODO(화 7/21): 여기에 상태별 액션 추가 — 반드시 server API(lib/api.js) 경유
        - 진행중 + 헬퍼      → [결과물 제출] (status → 완료대기)
        - 완료대기 + 양측     → [완료 확인] 버튼 2개 → server가 confirmations 2건 검증 후 완료·지급
      */}
    </div>
  );
}