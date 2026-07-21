import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

// server 전용 Supabase 클라이언트 (service_role 키 — server .env에만 둘 것, client 노출 금지)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/requests/:id/confirm
 * 완료 확인 — 오늘의 핵심. client가 못 하는 "여러 사람 확인 세기 + 판단"을 여기서 한다.
 *
 * body: { userId }  ← 확인 버튼을 누른 사람
 *
 * 흐름:
 *  1. 요청이 '완료대기' 상태인지 확인
 *  2. 누른 사람이 이 거래 당사자(사장님 또는 헬퍼)인지 확인
 *  3. confirmations에 확인 1행 추가 (unique로 중복 차단)
 *  4. 확인이 2건 됐는지 센다
 *  5. 2건이면 → status '완료' 전환 + tickets 발급 (요청당 1줄, total_count=수량)
 */
router.post("/api/requests/:id/confirm", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId가 필요합니다." });
  }

  // 1. 요청 조회 + 상태 확인
  const { data: request, error: reqErr } = await supabase
    .from("requests")
    .select("*")
    .eq("id", id)
    .single();

  if (reqErr || !request) {
    return res.status(404).json({ error: "요청을 찾을 수 없습니다." });
  }
  if (request.status !== "완료대기") {
    return res.status(409).json({ error: "완료대기 상태에서만 확인할 수 있습니다." });
  }

  // 2. 당사자 확인 (사장님이거나 매칭된 헬퍼여야 함)
  const isParty = userId === request.owner_id || userId === request.helper_id;
  if (!isParty) {
    return res.status(403).json({ error: "이 거래의 당사자만 확인할 수 있습니다." });
  }

  // 3. confirmations에 확인 기록 추가
  //    이미 확인한 사람이면 unique 제약(23505)에 걸리는데, 그건 정상이라 무시하고 진행
  const { error: insErr } = await supabase
    .from("confirmations")
    .insert({ request_id: id, user_id: userId });

  if (insErr && insErr.code !== "23505") {
    return res.status(500).json({ error: "확인 처리 중 문제가 발생했습니다." });
  }

  // 4. 이 요청의 확인 개수 세기
  const { count, error: cntErr } = await supabase
    .from("confirmations")
    .select("*", { count: "exact", head: true })
    .eq("request_id", id);

  if (cntErr) {
    return res.status(500).json({ error: "확인 개수 확인 중 문제가 발생했습니다." });
  }

  // 5. 2건 미만이면 아직 완료 아님 — 상대방 대기
  if (count < 2) {
    return res.json({ status: "완료대기", confirmed: count, done: false });
  }

  // 5. 2건이면 완료 전환
  //    status 조건을 '완료대기'로 함께 걸어, 동시 요청이 와도 완료 전환은 한 번만 일어나게 한다
  const { data: updated, error: updErr } = await supabase
    .from("requests")
    .update({ status: "완료" })
    .eq("id", id)
    .eq("status", "완료대기")
    .select();

  if (updErr) {
    return res.status(500).json({ error: "완료 전환 중 문제가 발생했습니다." });
  }

  // updated가 비어있으면 = 다른 요청이 먼저 완료 처리함 → 티켓 중복 발급 방지 위해 종료
  if (!updated || updated.length === 0) {
    return res.json({ status: "완료", done: true, note: "이미 완료 처리됨" });
  }

  // 티켓 발급 — 요청당 1줄, total_count에 발급 수량 (CLAUDE.md: 잔여 = 발급 − 사용기록)
  const rewardCount = request.reward_count ?? 0;
  const { error: tErr } = await supabase.from("tickets").insert({
    request_id: id,
    owner_id: request.owner_id,     // 발급한 가게(사장님)
    student_id: request.helper_id,  // 받는 사람(헬퍼=학생)
    menu_name: request.title,       // 티켓 표시용 — 요청 제목 사용
    total_count: rewardCount,       // 발급 수량
  });

  if (tErr) {
    // 완료는 됐는데 티켓 발급이 실패한 상황 — 로그로 남기고 클라이언트에 알림
    console.error("티켓 발급 실패:", tErr);
    return res.status(500).json({ error: "완료됐지만 식사권 발급에 실패했습니다. 관리자에게 문의하세요." });
  }

  return res.json({ status: "완료", done: true, ticketsIssued: rewardCount });
});

export default router;