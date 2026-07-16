import { Router } from "express";
import { z } from "zod";
import { ApiError } from "../errors/apiError.js";
import type { OnsiteStatusOperations } from "../services/onsiteStatusService.js";

const lookupTokenSchema = z.string().min(32).max(128);

export function createOnsiteStatusRouter(service: OnsiteStatusOperations): Router {
  const router = Router();
  router.get("/:lookupToken", async (request, response) => {
    const lookupToken = lookupTokenSchema.parse(request.params.lookupToken);
    const status = await service.getByLookupToken(lookupToken);
    if (!status) {
      throw new ApiError(404, "STATUS_LINK_INVALID", "종료되었거나 유효하지 않은 링크입니다.");
    }
    response.json(status);
  });
  return router;
}
