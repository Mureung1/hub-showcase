import { Router } from "express";
import type {
  CampaignPatchRequest,
  CampaignPatchResponse,
  CampaignStatus,
  SendCampaignRequest,
  SendCampaignResponse,
} from "shared";
import {
  updateCampaign,
  getCampaignById,
  getStoreById,
  getCustomers,
  issueCoupon,
} from "../db/queries";
import { planAdSend } from "../legal/filter";
import { sendSms } from "../sms/solapi";

export const campaignsRouter = Router();

const ALLOWED_STATUS: CampaignStatus[] = ["draft", "approved", "sent", "scheduled"];

/** 캠페인 쿠폰 코드 생성 (발송 시 발급). */
function newCouponCode(): string {
  return "WP" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

/**
 * PATCH /campaigns/:id
 * 승인/수정/반려 — status·edited_copy·channels 를 부분 갱신한다.
 * body: { status?, editedCopy?, channels? } (CampaignPatchRequest)
 */
campaignsRouter.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = (req.body ?? {}) as CampaignPatchRequest;

    const patch: { status?: string; edited_copy?: string; channels?: string[] } = {};
    if (body.status !== undefined) {
      if (!ALLOWED_STATUS.includes(body.status)) {
        return res.status(400).json({ error: `허용되지 않는 status: ${body.status}` });
      }
      patch.status = body.status;
    }
    if (body.editedCopy !== undefined) patch.edited_copy = body.editedCopy;
    if (body.channels !== undefined) patch.channels = body.channels;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "변경할 필드가 없습니다 (status·editedCopy·channels)" });
    }

    const updated = await updateCampaign(id, patch);
    const resp: CampaignPatchResponse = {
      campaignId: updated.id,
      status: updated.status as CampaignStatus,
    };
    res.json(resp);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "캠페인 갱신 실패" });
  }
});

/**
 * POST /campaigns/:id/send
 * 서버 법적 필터(동의·(광고)·야간) 통과 후 Solapi 실발송 — 야간이면 예약(scheduled) 저장.
 * body: { channels, assumeNight? } (SendCampaignRequest)
 *
 * ⚠️ 실발송 대상은 본인(SOLAPI_TEST_TO) 번호뿐. 더미 단골(가짜 번호)엔 발송하지 않는다.
 *    recipients는 '동의 단골 수'(표시·통계용)이고 실제 문자는 테스트 번호 1건만 나간다.
 */
campaignsRouter.post("/:id/send", async (req, res) => {
  try {
    const { id } = req.params;
    const body = (req.body ?? {}) as SendCampaignRequest;
    const channels = body.channels ?? [];

    const campaign = await getCampaignById(id);
    if (!campaign) return res.status(404).json({ error: "캠페인을 찾을 수 없습니다" });

    // SNS 전용(광고 문자 아님) → 법적 필터/문자 대상 아님
    if (!channels.includes("dangol")) {
      await updateCampaign(id, { status: "sent", channels });
      const resp: SendCampaignResponse = { status: "sent", recipients: 0, couponCode: null };
      return res.json(resp);
    }

    // 광고(단골) 문자 — 서버가 법적 필터를 강제 (구조 원칙 2)
    const store = await getStoreById(campaign.store_id);
    const copy = campaign.edited_copy ?? campaign.proposal?.copy ?? "";
    const customers = await getCustomers(campaign.store_id);
    const plan = planAdSend({
      copy,
      storeName: store.name,
      recipients: customers,
      assumeNight: body.assumeNight,
    });

    // 야간이면 발송하지 않고 예약 전환
    if (plan.action === "schedule") {
      await updateCampaign(id, { status: "scheduled", channels });
      const resp: SendCampaignResponse = {
        status: "scheduled",
        recipients: plan.recipients.length,
        couponCode: null,
      };
      return res.json(resp);
    }

    // 발송: 쿠폰 발급 → 본인(테스트) 번호로 실발송(또는 dry-run)
    const code = newCouponCode();
    await issueCoupon(id, code);
    const testTo = process.env.SOLAPI_TEST_TO ?? process.env.SOLAPI_SENDER ?? "";
    await sendSms(testTo, `${plan.body}\n쿠폰코드 ${code}`);
    await updateCampaign(id, { status: "sent", channels });

    const resp: SendCampaignResponse = {
      status: "sent",
      recipients: plan.recipients.length, // 동의 단골 수(표시용). 실발송은 테스트 번호 1건.
      couponCode: code,
    };
    res.json(resp);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "발송 실패" });
  }
});
