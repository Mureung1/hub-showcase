import { useEffect, useRef, useState } from "react";
import {
  createGuestSession,
  deleteGuestSession,
  recoverGuestSession
} from "../api/guestSessionApi";

const ACTIVE_GUEST_KEY = "active-guest-recovery-key";

function readActiveKey() {
  try {
    return window.sessionStorage.getItem(ACTIVE_GUEST_KEY) || "";
  } catch {
    return "";
  }
}

function storeActiveKey(key) {
  window.sessionStorage.setItem(ACTIVE_GUEST_KEY, key);
}

export default function useGuestAccess() {
  const [guestKey, setGuestKey] = useState(readActiveKey);
  const [anonymousAiKey, setAnonymousAiKey] = useState("");
  const anonymousAiKeyRef = useRef("");
  const [issuedKey, setIssuedKey] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const activate = (key) => {
    storeActiveKey(key);
    setGuestKey(key);
  };

  const clearAnonymousAiKey = () => {
    anonymousAiKeyRef.current = "";
    setAnonymousAiKey("");
  };

  const deleteAnonymousSession = async ({ keepalive = false } = {}) => {
    const key = anonymousAiKeyRef.current;
    clearAnonymousAiKey();
    if (!key) return;

    try {
      await deleteGuestSession(key, { keepalive });
    } catch {
      // Expiration cleanup remains the server-side fallback.
    }
  };

  useEffect(() => {
    const handlePageHide = (event) => {
      if (event.persisted) return;
      const key = anonymousAiKeyRef.current;
      if (!key) return;
      clearAnonymousAiKey();
      void deleteGuestSession(key, { keepalive: true }).catch(() => {});
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, []);

  const createGuest = async () => {
    setStatus("loading");
    setError("");
    try {
      await deleteAnonymousSession();
      const data = await createGuestSession();
      setIssuedKey(data.recoveryKey);
      activate(data.recoveryKey);
      setStatus("ready");
      return true;
    } catch {
      setError("게스트 키를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setStatus("error");
      return false;
    }
  };

  const recoverGuest = async (key) => {
    setStatus("loading");
    setError("");
    try {
      await deleteAnonymousSession();
      await recoverGuestSession(key);
      setIssuedKey("");
      activate(key.trim().toUpperCase());
      setStatus("ready");
      return true;
    } catch {
      setError("키가 올바르지 않거나 보관 기간이 지났습니다.");
      setStatus("error");
      return false;
    }
  };

  const startAnonymous = async () => {
    setStatus("loading");
    setError("");
    window.sessionStorage.removeItem(ACTIVE_GUEST_KEY);
    setGuestKey("");
    setIssuedKey("");
    await deleteAnonymousSession();

    try {
      const data = await createGuestSession();
      anonymousAiKeyRef.current = data.recoveryKey;
      setAnonymousAiKey(data.recoveryKey);
      setStatus("ready");
      return true;
    } catch {
      setError("익명 AI 대화를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setStatus("error");
      return false;
    }
  };

  const leaveGuest = () => {
    window.sessionStorage.removeItem(ACTIVE_GUEST_KEY);
    setGuestKey("");
    setIssuedKey("");
    setError("");
    setStatus("idle");
  };

  const endAnonymous = async () => {
    await deleteAnonymousSession();
    setError("");
    setStatus("idle");
  };

  return {
    mode: guestKey ? "guest" : "anonymous",
    guestKey,
    aiGuestKey: guestKey || anonymousAiKey,
    issuedKey,
    status,
    error,
    createGuest,
    recoverGuest,
    startAnonymous,
    endAnonymous,
    leaveGuest
  };
}
