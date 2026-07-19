import { useCallback, useEffect, useRef, useState } from "react";
import { resendConfirmation } from "./authService";

/**
 * 인증 메일 재발송 + 연타 방지 쿨다운 (SPEC-AUTH-001 6장).
 * 발송 직후 지정 시간(기본 30초) 동안 버튼을 비활성화한다. 로그인 화면의 미인증 안내와
 * verify-email 안내 페이지가 함께 사용한다.
 */
const COOLDOWN_SECONDS = 30;

type ResendPhase = "idle" | "sending" | "sent" | "error";

export function useResendCooldown() {
  const [phase, setPhase] = useState<ResendPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const startCooldown = useCallback(() => {
    setCooldownLeft(COOLDOWN_SECONDS);
    clearTimer();
    timerRef.current = window.setInterval(() => {
      setCooldownLeft((left) => {
        if (left <= 1) {
          clearTimer();
          return 0;
        }
        return left - 1;
      });
    }, 1000);
  }, [clearTimer]);

  const resend = useCallback(
    async (email: string) => {
      if (cooldownLeft > 0 || phase === "sending") return;
      setPhase("sending");
      setMessage(null);
      const result = await resendConfirmation(email);
      if (result.ok) {
        setPhase("sent");
        setMessage("인증 메일을 다시 보냈습니다. 메일함을 확인해주세요.");
        startCooldown();
      } else {
        setPhase("error");
        setMessage(result.error.message);
      }
    },
    [cooldownLeft, phase, startCooldown],
  );

  return {
    resend,
    cooldownLeft,
    isSending: phase === "sending",
    isDisabled: cooldownLeft > 0 || phase === "sending",
    message,
    phase,
  };
}
