// 서버(비식별 연구 데이터) 동기화 상태·IO를 한 곳에 모은다.
// 교차 상태(추천 결과·피드백·보정오차)는 컴포넌트가 payload로 조립해 넘긴다 —
// 훅은 서버 IO와 동의/메시지/카운트 상태만 소유해 결합을 낮춘다.
import { useEffect, useRef, useState } from "react";
import { deleteResults, getAnonId, getHealth, listResults, saveResult as saveResultToServer } from "../lib/api";

export function useServerSync() {
  const [serverConsent, setServerConsent] = useState(false);
  const [serverMsg, setServerMsg] = useState("");
  const [serverCount, setServerCount] = useState(null);
  // 진행 중인 서버 작업("save" | "list" | "delete" | null).
  // Render 무료 티어 콜드스타트가 실측 15초라, 이게 없으면 누른 뒤 화면이 아무 반응 없이 멈춘 것처럼 보이고
  // 버튼이 계속 눌려 중복 저장이 생긴다.
  const [serverPending, setServerPending] = useState(null);
  const pendingRef = useRef(null);

  // 앱 진입 시 백엔드를 한 번 깨워 둔다(워밍업). 실패는 무시 — 이 호출은 화면에 아무것도 바꾸지 않는다.
  // 사용자가 결과 화면까지 오는 사이에 슬립이 풀려서, 실제 저장 시점의 대기가 짧아진다.
  useEffect(() => {
    getHealth().catch(() => {});
  }, []);

  // 서버 IO 공통 래퍼: 중복 실행 차단 + pending 표시 + 실패 메시지.
  async function runServerAction(kind, action, failMsg) {
    if (pendingRef.current) {
      return;
    }
    pendingRef.current = kind;
    setServerPending(kind);
    try {
      await action();
    } catch {
      setServerMsg(failMsg);
    } finally {
      pendingRef.current = null;
      setServerPending(null);
    }
  }

  async function saveToServer(payload) {
    if (!serverConsent) {
      return;
    }
    await runServerAction(
      "save",
      async () => {
        await saveResultToServer({ consent: true, anonId: getAnonId(), ...payload });
        const rows = await listResults(getAnonId());
        setServerCount(rows.length);
        setServerMsg("서버에 익명 요약을 저장했습니다.");
      },
      "서버 연결 실패 — 앱은 계속 사용할 수 있습니다(로컬 저장은 유지).",
    );
  }

  async function listFromServer() {
    await runServerAction(
      "list",
      async () => {
        const rows = await listResults(getAnonId());
        setServerCount(rows.length);
        setServerMsg(`서버에 내 익명 기록 ${rows.length}개가 있습니다.`);
      },
      "서버 연결 실패 — 조회할 수 없습니다.",
    );
  }

  async function deleteFromServer() {
    await runServerAction(
      "delete",
      async () => {
        const res = await deleteResults(getAnonId());
        setServerCount(0);
        setServerMsg(`서버에서 내 익명 기록 ${res.removed}개를 삭제했습니다.`);
      },
      "서버 연결 실패 — 삭제할 수 없습니다.",
    );
  }

  return {
    serverConsent,
    setServerConsent,
    serverMsg,
    serverCount,
    serverPending,
    saveToServer,
    listFromServer,
    deleteFromServer,
  };
}
