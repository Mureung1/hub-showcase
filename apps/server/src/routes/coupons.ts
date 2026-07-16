import { Router } from "express";
import { redeemCoupon } from "../db/queries";

export const couponsRouter = Router();

/**
 * POST /coupons/:code/redeem
 * 쿠폰 사용 처리 (모의 매장 단말). body: { orderAmount }
 * 없거나 이미 사용된 코드면 409.
 */
couponsRouter.post("/:code/redeem", async (req, res) => {
  try {
    const { code } = req.params;
    const orderAmount = Number(req.body?.orderAmount ?? 0);
    if (!Number.isFinite(orderAmount) || orderAmount < 0) {
      return res.status(400).json({ error: "orderAmount는 0 이상 숫자여야 합니다" });
    }
    const ok = await redeemCoupon(code, orderAmount);
    if (!ok) return res.status(409).json({ error: "없거나 이미 사용된 쿠폰입니다" });
    res.json({ ok: true, code, orderAmount });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "쿠폰 사용 처리 실패" });
  }
});
