// 서버(비식별 연구 데이터) 동기화 상태·IO를 한 곳에 모은다.
// 교차 상태(추천 결과·피드백·보정오차)는 컴포넌트가 payload로 조립해 넘긴다 —
// 훅은 서버 IO와 동의/메시지/카운트 상태만 소유해 결합을 낮춘다.
import { useState } from "react";
import { deleteResults, getAnonId, listResults, saveResult as saveResultToServer } from "../lib/api";

export function useServerSync() {
  const [serverConsent, setServerConsent] = useState(false);
  const [serverMsg, setServerMsg] = useState("");
  const [serverCount, setServerCount] = useState(null);

  async function saveToServer(payload) {
    if (!serverConsent) {
      return;
    }
    try {
      await saveResultToServer({ consent: true, anonId: getAnonId(), ...payload });
      const rows = await listResults(getAnonId());
      setServerCount(rows.length);
      setServerMsg("서버에 익명 요약을 저장했습니다.");
    } catch {
      setServerMsg("서버 연결 실패 — 앱은 계속 사용할 수 있습니다(로컬 저장은 유지).");
    }
  }

  async function listFromServer() {
    try {
      const rows = await listResults(getAnonId());
      setServerCount(rows.length);
      setServerMsg(`서버에 내 익명 기록 ${rows.length}개가 있습니다.`);
    } catch {
      setServerMsg("서버 연결 실패 — 조회할 수 없습니다.");
    }
  }

  async function deleteFromServer() {
    try {
      const res = await deleteResults(getAnonId());
      setServerCount(0);
      setServerMsg(`서버에서 내 익명 기록 ${res.removed}개를 삭제했습니다.`);
    } catch {
      setServerMsg("서버 연결 실패 — 삭제할 수 없습니다.");
    }
  }

  return {
    serverConsent,
    setServerConsent,
    serverMsg,
    serverCount,
    saveToServer,
    listFromServer,
    deleteFromServer,
  };
}
