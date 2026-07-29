const GAP_MS = 30 * 60 * 1000; // 30분 이상 비면 새 episode로 나눈다
const DAY_MS = 24 * 60 * 60 * 1000; // Daily Tide Window: 24시간 지나면 History로

// 메시지 배열을 시간 간격 기준으로 episode(대화 구간)로 묶는다.
// now는 테스트에서 "지금"을 고정할 수 있도록 둔 선택 인자.
export function groupMessagesIntoEpisodes(messages, now = new Date()) {
  if (!messages || messages.length === 0) return [];

  const sorted = [...messages].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  const groups = [];
  let lastTime = null;

  for (const m of sorted) {
    const t = new Date(m.created_at).getTime();
    if (lastTime === null || t - lastTime > GAP_MS) {
      groups.push([]);
    }
    groups[groups.length - 1].push(m);
    lastTime = t;
  }

  const nowMs = now.getTime();

  return groups
    .map((group) => {
      const first = group[0];
      const last = group[group.length - 1];
      const firstUser = group.find((m) => m.role === 'user') || first;
      const submergedMsg = group.find((m) => m.submerged);

      return {
        id: first.id,
        time: formatRange(first.created_at, last.created_at),
        topic:
          firstUser.content.length > 24
            ? `${firstUser.content.slice(0, 24)}…`
            : firstUser.content,
        preview: firstUser.content,
        submerged: Boolean(submergedMsg),
        summary: submergedMsg ? submergedMsg.summary : null,
        tab: nowMs - new Date(last.created_at).getTime() < DAY_MS ? 'recent' : 'history',
        messages: group,
      };
    })
    .reverse();
}

function formatRange(startIso, endIso) {
  const opts = { hour: 'numeric', minute: '2-digit' };
  const start = new Date(startIso).toLocaleTimeString('en-US', opts);
  const end = new Date(endIso).toLocaleTimeString('en-US', opts);
  return start === end ? start : `${start} – ${end}`;
}
