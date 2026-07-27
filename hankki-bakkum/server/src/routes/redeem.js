import express from "express";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/tickets/:id/redeem
 * 식사권 1장 사용 차감 — 사장님 PIN 확인 방식.
 *
 * 학생이 지갑에서 "사용하기" → 확인 화면에서 사장님이 눈앞에서 PIN 6자리 입력 → 1장 차감.
 * (대면만으로는 신원이 담보되지 않아 PIN으로 강화. 대조는 반드시 server에서 — 완료 확인과 같은 원리)
 *
 * 규칙(CLAUDE.md): 잔여 = 발급(total_count) − 사용기록 수. 되돌리기 불가(insert only).
 * server가 "잔여 남았나"를 세서 판단한다 (client 조작 방지).
 *
 * 흐름:
 *  1. 티켓 조회
 *  2. 티켓의 사장님(owner_id) PIN 대조 — 틀리면 차감 전에 끝
 *  3. 사용된 기록 수를 세서 잔여 계산
 *  4. 잔여가 있으면 redemptions에 1줄 추가, 없으면 거부
 */
router.post("/api/tickets/:id/redeem", async (req, res) => {
    const { id } = req.params; // ticket_id
    const { pin } = req.body;

    // 1. 티켓 조회
    const { data: ticket, error: tErr } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", id)
        .single();

    if (tErr || !ticket) {
        return res.status(404).json({ error: "식사권을 찾을 수 없습니다." });
    }

    // 2. 사장님 PIN 대조 — 차감보다 먼저 막는다
    if (!pin) {
        return res.status(400).json({ error: "사장님 PIN을 입력해 주세요." });
    }

    const { data: owner, error: oErr } = await supabase
        .from("users")
        .select("pin_hash")
        .eq("id", ticket.owner_id)
        .single();

    if (oErr || !owner) {
        return res.status(404).json({ error: "사장님 정보를 찾을 수 없습니다." });
    }

    if (!owner.pin_hash) {
        return res.status(409).json({
            error: "사장님이 아직 PIN을 설정하지 않았어요. 설정 후 다시 시도해 주세요.",
            needPin: true,
        });
    }

    // 해시를 되돌리는 게 아니라, 들어온 평문을 같은 방식으로 해싱해 비교한다
    const pinOk = await bcrypt.compare(pin, owner.pin_hash);
    if (!pinOk) {
        return res.status(401).json({ error: "PIN이 일치하지 않아요." });
    }

    // 3. 이미 사용된 기록 수 세기 → 잔여 계산
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

    // 4. 사용 기록 1줄 추가 (insert only — 되돌리기 없음)
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