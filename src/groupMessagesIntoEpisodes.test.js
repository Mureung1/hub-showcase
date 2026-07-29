import { test, expect } from 'vitest';
import { groupMessagesIntoEpisodes } from './groupMessagesIntoEpisodes';

// 스펙:
// | 입력 | 기대 결과 | 이유 |
// |---|---|---|
// | 빈 배열 | 빈 배열 | 대화 자체가 없음 |
// | 30분 이내 메시지 2개 | episode 1개 | 같은 대화로 본다 |
// | 30분 넘게 떨어진 메시지 2개 | episode 2개 | 다른 대화로 나뉜다 |
// | 여러 episode | 최신이 배열 맨 앞 | 최근 대화부터 보여줘야 함 |
// | 24시간 이내/이후 | recent / history | Daily Tide Window 구분 |
// | 그룹에 잠긴 메시지 포함 | episode도 submerged: true | 하나라도 잠기면 카드 자체를 잠근다 |

const NOW = new Date('2026-07-28T12:00:00');

test('메시지가 없으면 빈 배열', () => {
  expect(groupMessagesIntoEpisodes([], NOW)).toEqual([]);
});

test('시간 간격이 30분 이내면 하나의 episode로 묶인다', () => {
  const messages = [
    { id: 1, role: 'user', content: '안녕', created_at: '2026-07-28T09:00:00', submerged: false },
    { id: 2, role: 'ai', content: '안녕하세요', created_at: '2026-07-28T09:05:00', submerged: false },
  ];
  const episodes = groupMessagesIntoEpisodes(messages, NOW);
  expect(episodes.length).toBe(1);
  expect(episodes[0].messages.length).toBe(2);
});

test('시간 간격이 30분 넘으면 다른 episode로 나뉜다', () => {
  const messages = [
    { id: 1, role: 'user', content: '첫 대화', created_at: '2026-07-28T09:00:00', submerged: false },
    { id: 2, role: 'user', content: '두번째 대화', created_at: '2026-07-28T10:00:00', submerged: false },
  ];
  const episodes = groupMessagesIntoEpisodes(messages, NOW);
  expect(episodes.length).toBe(2);
});

test('최신 episode가 배열 맨 앞에 온다', () => {
  const messages = [
    { id: 1, role: 'user', content: '오래된 대화', created_at: '2026-07-28T08:00:00', submerged: false },
    { id: 2, role: 'user', content: '최근 대화', created_at: '2026-07-28T11:00:00', submerged: false },
  ];
  const episodes = groupMessagesIntoEpisodes(messages, NOW);
  expect(episodes[0].topic).toBe('최근 대화');
});

test('24시간 이내 마지막 메시지면 recent, 넘으면 history', () => {
  const messages = [
    { id: 1, role: 'user', content: '어제 대화', created_at: '2026-07-26T09:00:00', submerged: false },
    { id: 2, role: 'user', content: '방금 대화', created_at: '2026-07-28T11:50:00', submerged: false },
  ];
  const episodes = groupMessagesIntoEpisodes(messages, NOW);
  const recentEp = episodes.find((e) => e.topic === '방금 대화');
  const historyEp = episodes.find((e) => e.topic === '어제 대화');
  expect(recentEp.tab).toBe('recent');
  expect(historyEp.tab).toBe('history');
});

test('그룹 안에 잠긴 메시지가 있으면 episode도 submerged: true', () => {
  const messages = [
    {
      id: 1,
      role: 'user',
      content: '잠긴 대화',
      created_at: '2026-07-28T09:00:00',
      submerged: true,
      summary: '9:00 AM, later than usual',
    },
  ];
  const episodes = groupMessagesIntoEpisodes(messages, NOW);
  expect(episodes[0].submerged).toBe(true);
  expect(episodes[0].summary).toBe('9:00 AM, later than usual');
});
