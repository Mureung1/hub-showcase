// 백그라운드 서비스 워커 — 콘텐츠 스크립트와 로컬 프록시 서버(hometax-guide-extension/server) 사이를 중계한다.
// 이 스크립트는 Claude API 키를 직접 다루지 않는다 (프록시 서버에만 존재).

const PROXY_URL = 'http://localhost:4000';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'NEXT_STEP') {
    fetch(`${PROXY_URL}/api/next-step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal: message.goal,
        currentUrl: message.currentUrl,
        resultRowCount: message.resultRowCount,
        elements: message.elements,
        history: message.history,
      }),
    })
      .then((res) => res.json())
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));

    return true; // 비동기 sendResponse를 위해 채널을 열어둔다.
  }
});
