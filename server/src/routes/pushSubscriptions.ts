import { Router } from "express";
import { prisma } from "../db/client.js";

const router = Router();

// 브라우저가 pushManager.subscribe()로 만든 구독 객체를 저장한다(#32).
// endpoint가 브라우저/디바이스별 유일 키이므로, 같은 endpoint면 새로 만들지 않고
// p256dh/auth만 최신값으로 갱신한다(재구독·키 회전 시나리오 대응).
router.post("/", async (req, res) => {
  const { endpoint, keys } = req.body;

  if (
    typeof endpoint !== "string" ||
    !endpoint ||
    typeof keys?.p256dh !== "string" ||
    !keys.p256dh ||
    typeof keys?.auth !== "string" ||
    !keys.auth
  ) {
    res.status(400).json({
      error: {
        code: "invalid_body",
        message: "endpoint, keys.p256dh, keys.auth는 모두 필수입니다.",
      },
    });
    return;
  }

  try {
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { p256dh: keys.p256dh, auth: keys.auth },
    });

    res.json({ data: subscription });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: { code: "internal_error", message: "구독 정보를 저장하지 못했습니다." },
    });
  }
});

export default router;
