import { memberName } from './members';

// 절대 인원수가 아니라 팀원 대비 비율로 0~4단계 계산 (CLAUDE.md "회의시간 매칭 - 상세 설계")
export function getHeatLevel(count, totalMembers) {
  if (count === 0 || totalMembers === 0) return 0;
  const ratio = count / totalMembers;
  if (ratio >= 1) return 4;
  if (ratio >= 0.75) return 3;
  if (ratio >= 0.5) return 2;
  return 1;
}

// [{member_id, slot_date, slot_hour}, ...] -> Map("date_hour" -> {count, names})
export function buildSlotStats(rows, members) {
  const map = new Map();

  rows.forEach((row) => {
    const key = `${row.slot_date}_${row.slot_hour}`;
    const name = memberName(members, Number(row.member_id));
    const entry = map.get(key);
    if (entry) {
      entry.count += 1;
      entry.names.push(name);
    } else {
      map.set(key, { count: 1, names: [name] });
    }
  });

  return map;
}

// slotStats(현재 보고 있는 주)에서 겹치는 인원이 많은 시간대 상위 N개.
// 인원수가 같으면 이른 날짜 → 이른 시간 순으로 우선.
export function getTopRecommendedSlots(slotStats, limit = 3) {
  const entries = [];

  slotStats.forEach((stat, key) => {
    const [date, hourStr] = key.split('_');
    entries.push({ key, date, hour: Number(hourStr), count: stat.count, names: stat.names });
  });

  entries.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.hour - b.hour;
  });

  return entries.slice(0, limit);
}
