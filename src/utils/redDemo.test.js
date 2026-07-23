// commandSort.js가 주석 처리되어 getMatchRank를 더 이상 export하지 않으므로,
// 이 테스트가 대상으로 삼던 함수 자체가 없다. 원래도 "나중에 삭제할 데모 파일"로
// 표시돼 있었던 파일이라 삭제 대신 통째로 주석 처리해 남겨둔다.
// 다만 테스트가 하나도 없는 파일은 vitest가 "No test suite found"로 실행 자체를 실패
// 처리하므로, 아래 skip 스텁 하나만 살려서 npm test가 정상 통과하게 한다.
import { it } from 'vitest';
it.skip('[데모] commandSort.js 주석 처리로 대상 함수 없음 — 전체 내용은 아래 주석 참고', () => {});

// import { describe, it, expect } from 'vitest';
// import { getMatchRank } from './commandSort.js';

// describe('[데모] 일부러 실패시키는 테스트 (Red 확인용, 나중에 삭제할 파일)', () => {
//   it('실제로는 0이 나오는데, 일부러 1을 기대해서 Red를 확인한다', () => {
//     const command = { category: 'unix', name: 'ls' };
//     expect(getMatchRank(command, 'ls')).toBe(1); // 진짜 결과는 0 — 일부러 틀린 기대값
//   });
// });
