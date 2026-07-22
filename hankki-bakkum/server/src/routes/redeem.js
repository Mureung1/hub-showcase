import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/tickets/:id/redeem
 * 식사권 1장 사용 차감 — 대면 확인 방식.
 *
 * 학생이 지갑에서 "사용하기" → 확인 화면에서 사장님이 눈앞에서 [확인] 버튼 → 1장 차감.
 * (결제 없는 대면 거래라 사장님이 옆에 있다는 것을 전제. 계정 검증 대신 대면으로 담보)
 * → 다음 단계 개선: 사장님 PIN 6자리 입력으로 신원 확인 강화 (users에 pin 컬럼 필요)
 *
 * 규칙(CLAUDE.md): 잔여 = 발급(total_count) − 사용기록 수. 되돌리기 불가(insert only).
 * server가 "잔여 남았나"를 세서 판단한다 (client 조작 방지).
 *
 * 흐름:
 *  1. 티켓 조회
 *  2. 사용된 기록 수를 세서 잔여 계산
 *  3. 잔여가 있으면 redemptions에 1줄 추가, 없으면 거부
 */
router.post("/api/tickets/:id/redeem", async (req, res) => {
    const { id } = req.params; // ticket_id

    // 1. 티켓 조회
    const { data: ticket, error: tErr } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", id)
        .single();

    if (tErr || !ticket) {
        return res.status(404).json({ error: "식사권을 찾을 수 없습니다." });
    }

    // 2. 이미 사용된 기록 수 세기 → 잔여 계산
    const { count, error: cErr } = await supabase
        .from("ticket_redemptions")
        .select("*", { count: "exact", head: true })
        .eq("ticket_id", id);

    if (cErr) {
        return res.status(500).json({ error: "사용 기록 확인 중 문제가 발생했습니다." });
    }

    const used = count ?? 0;
    const remaining = (ticket.total_count ?? 0) - used;

    if (remaining <= 0) {
        return res.status(409).json({ error: "이미 모두 사용한 식사권이에요.", remaining: 0 });
    }

    // 3. 사용 기록 1줄 추가 (insert only — 되돌리기 없음)
    const { error: insErr } = await supabase
        .from("ticket_redemptions")
        .insert({ ticket_id: id });

    if (insErr) {
        console.error("차감 실패:", insErr);
        return res.status(500).json({ error: "사용 처리에 실패했습니다." });
    }

    return res.json({ done: true, remaining: remaining - 1 });
});

export default router;