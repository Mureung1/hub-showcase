import { useState } from "react";
import {
  createGuestSession,
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
  const [issuedKey, setIssuedKey] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const activate = (key) => {
    storeActiveKey(key);
    setGuestKey(key);
  };

  const createGuest = async () => {
    setStatus("loading");
    setError("");
    try {
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

  const useAnonymous = () => {
    window.sessionStorage.removeItem(ACTIVE_GUEST_KEY);
    setGuestKey("");
    setIssuedKey("");
    setError("");
    setStatus("idle");
  };

  return {
    mode: guestKey ? "guest" : "anonymous",
    guestKey,
    issuedKey,
    status,
    error,
    createGuest,
    recoverGuest,
    useAnonymous
  };
}
