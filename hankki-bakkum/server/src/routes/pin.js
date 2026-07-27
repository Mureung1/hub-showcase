import express from "express";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PIN_RULE = /^\d{6}$/; // 숫자 6자리만

/**
 * POST /api/pin/set
 * 사장님이 식사권 사용 확인용 PIN 6자리를 설정한다.
 *
 * 원칙(4주차 계획): PIN은 비밀번호다 → 평문 저장 절대 금지, 반드시 해싱.
 * 완료 확인 API와 같은 원리로 검증은 전부 server에서 한다.
 *
 * 흐름:
 *  1. 형식 검사 (숫자 6자리)
 *  2. 해당 사용자가 사장님(owner)인지 확인
 *  3. bcrypt 해싱해서 pin_hash에 저장
 */
router.post("/api/pin/set", async (req, res) => {
    const { userId, pin } = req.body;

    if (!userId || !pin) {
        return res.status(400).json({ error: "필요한 정보가 빠졌어요." });
    }

    // 1. 형식 검사
    if (!PIN_RULE.test(pin)) {
        return res.status(400).json({ error: "PIN은 숫자 6자리로 입력해 주세요." });
    }

    // 2. 사장님인지 확인 (학생은 PIN이 필요 없음)
    const { data: user, error: uErr } = await supabase
        .from("users")
        .select("id, role")
        .eq("id", userId)
        .single();

    if (uErr || !user) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }
    if (user.role !== "owner") {
        return res.status(403).json({ error: "사장님만 PIN을 설정할 수 있어요." });
    }

    // 3. 해싱 후 저장 (평문은 어디에도 남기지 않는다)
    const pinHash = await bcrypt.hash(pin, 10);

    const { error: upErr } = await supabase
        .from("users")
        .update({ pin_hash: pinHash })
        .eq("id", userId);

    if (upErr) {
        console.error("PIN 저장 실패:", upErr);
        return res.status(500).json({ error: "PIN 저장에 실패했습니다." });
    }

    // 해시는 응답에 절대 담지 않는다
    return res.json({ done: true });
});

/**
 * GET /api/pin/status?userId=...
 * PIN을 설정했는지 여부만 알려준다. 해시값은 내보내지 않는다.
 */
router.get("/api/pin/status", async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: "userId가 필요합니다." });
    }

    const { data: user, error } = await supabase
        .from("users")
        .select("id, role, pin_hash")
        .eq("id", userId)
        .single();

    if (error || !user) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    return res.json({
        isOwner: user.role === "owner",
        hasPin: Boolean(user.pin_hash), // 있다/없다만
    });
});

export default router;