const startBtn = document.getElementById('start-btn');
const goalInput = document.getElementById('goal-input');
const statusEl = document.getElementById('status');

startBtn.addEventListener('click', async () => {
  const goal = goalInput.value.trim();
  if (!goal) {
    statusEl.textContent = '하고 싶은 일을 입력해주세요.';
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.url || !/hometax\.go\.kr/.test(tab.url)) {
    statusEl.textContent = '홈택스(hometax.go.kr) 탭에서 실행해주세요.';
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'START_GUIDE', goal });
    statusEl.textContent = 'AI가 화면을 분석하고 있어요. 홈택스 화면을 확인하세요.';
  } catch (err) {
    statusEl.textContent = '페이지를 새로고침한 뒤 다시 시도해주세요.';
  }
});
