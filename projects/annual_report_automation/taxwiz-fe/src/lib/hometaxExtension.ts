// taxwiz-fe(웹앱) ↔ hometax guide-extension(크롬 확장) 사이의 통신 유틸.
// 확장은 미배포(unpacked 로드 전용)라 대부분의 사용자에게는 없다 — 그래서 모든 호출은
// "설치돼 있으면 실행, 없으면 조용히 실패" 패턴이다. 실패 이유(reason)는 UI 문구 분기용일 뿐,
// 사용자에게 왜 안 되는지 구구절절 설명하지 않는다.

export interface HometaxAvailability {
  available: boolean;
  reason?: 'no-chrome-api' | 'not-installed' | 'timeout' | 'error';
}

export type StartGuideResult = { ok: true } | { ok: false; reason: HometaxAvailability['reason'] };

const EXTENSION_ID = import.meta.env.VITE_HOMETAX_EXTENSION_ID as string | undefined;
const PING_TIMEOUT_MS = 800;

function hasChromeMessaging(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime && typeof chrome.runtime.sendMessage === 'function';
}

/** 확장이 설치돼 있고 이 origin을 허용하는지 가볍게 확인한다 (PING/PONG). */
export function checkHometaxExtension(): Promise<HometaxAvailability> {
  if (!EXTENSION_ID || !hasChromeMessaging()) {
    return Promise.resolve({ available: false, reason: 'no-chrome-api' });
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ available: false, reason: 'timeout' }), PING_TIMEOUT_MS);
    try {
      chrome.runtime.sendMessage(EXTENSION_ID, { type: 'PING' }, (resp) => {
        clearTimeout(timer);
        if (chrome.runtime.lastError || !resp?.ok) {
          resolve({ available: false, reason: 'not-installed' });
        } else {
          resolve({ available: true });
        }
      });
    } catch {
      clearTimeout(timer);
      resolve({ available: false, reason: 'error' });
    }
  });
}

/** 확장에게 goal을 넘겨 홈택스 가이드를 자동으로 시작시킨다. 확장이 없으면 그냥 실패를 돌려준다. */
export async function startHometaxGuide(goal: string): Promise<StartGuideResult> {
  const availability = await checkHometaxExtension();
  if (!availability.available) return { ok: false, reason: availability.reason };

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(EXTENSION_ID as string, { type: 'START_GUIDE_EXTERNAL', goal }, (resp) => {
      if (chrome.runtime.lastError || !resp?.ok) {
        resolve({ ok: false, reason: 'error' });
      } else {
        resolve({ ok: true });
      }
    });
  });
}
