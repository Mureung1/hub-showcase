import { Router } from "express";
import type { CampaignPatchRequest, CampaignPatchResponse, CampaignStatus } from "shared";
import { updateCampaign } from "../db/queries";

export const campaignsRouter = Router();

const ALLOWED_STATUS: CampaignStatus[] = ["draft", "approved", "sent", "scheduled"];

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
