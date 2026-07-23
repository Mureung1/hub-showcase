// commandSort.js가 주석 처리되어 대상 함수(getMatchRank/compareByRelevance)가 더 이상
// export되지 않으므로, 이 테스트 전체를 함께 주석 처리해 남겨둔다.
// 다만 테스트가 하나도 없는 파일은 vitest가 "No test suite found"로 실행 자체를 실패
// 처리하므로, 아래 skip 스텁 하나만 살려서 npm test가 정상 통과하게 한다.
import { it } from 'vitest';
it.skip('[커버리지 이관] commandSort.js 주석 처리로 대상 함수 없음 — 전체 내용은 아래 주석 참고', () => {});

// import { describe, it, expect } from 'vitest';
// import { getMatchRank, compareByRelevance } from './commandSort.js';
// 
// describe('getMatchRank', () => {
//   describe('정상 케이스', () => {
//     it('unix 명령어: 이름이 검색어로 시작하면 0을 반환한다', () => {
//       const command = { category: 'unix', name: 'mkdir' };
//       expect(getMatchRank(command, 'mk')).toBe(0);
//     });
// 
//     it('unix 명령어: 이름에 검색어가 포함되지만 시작은 아니면 1을 반환한다', () => {
//       const command = { category: 'unix', name: 'chmod' };
//       expect(getMatchRank(command, 'mod')).toBe(1);
//     });
// 
//     it('unix 명령어: 이름에 검색어가 전혀 없으면 2를 반환한다', () => {
//       const command = { category: 'unix', name: 'ls' };
//       expect(getMatchRank(command, 'xyz')).toBe(2);
//     });
// 
//     it('git 명령어: "git " 접두사를 제거한 하위 명령어가 검색어로 시작하면 0을 반환한다', () => {
//       const command = { category: 'git', name: 'git commit' };
//       expect(getMatchRank(command, 'commit')).toBe(0);
//     });
// 
//     it('git 명령어: 하위 명령어에 검색어가 포함되지만 시작은 아니면 1을 반환한다', () => {
//       const command = { category: 'git', name: 'git checkout' };
//       expect(getMatchRank(command, 'heck')).toBe(1);
//     });
// 
//     it('git 명령어: 하위 명령어에 검색어가 전혀 없으면 2를 반환한다', () => {
//       const command = { category: 'git', name: 'git branch' };
//       expect(getMatchRank(command, 'xyz')).toBe(2);
//     });
//   });
// 
//   describe('빈 값 / 경계값 케이스', () => {
//     it('검색어가 이름과 완전히 같아도 0을 반환한다 (완전 일치도 startsWith에 포함됨)', () => {
//       const command = { category: 'unix', name: 'ls' };
//       expect(getMatchRank(command, 'ls')).toBe(0);
//     });
// 
//     it('검색어가 빈 문자열이면 모든 명령어가 0을 반환한다 (String.startsWith("")는 항상 true)', () => {
//       const command = { category: 'unix', name: 'ls' };
//       expect(getMatchRank(command, '')).toBe(0);
//     });
// 
//     it('git 명령어인데 name이 "git " 접두사보다 짧으면 하위 이름이 빈 문자열이 된다', () => {
//       // 'git'.slice(4) === '' (문자열 길이 3 < 4)
//       const command = { category: 'git', name: 'git' };
//       expect(getMatchRank(command, 'x')).toBe(2); // ''.startsWith('x') === false, ''.includes('x') === false
//       expect(getMatchRank(command, '')).toBe(0); // ''.startsWith('') === true
//     });
// 
//     it('명령어 이름의 대소문자는 무시된다 (내부에서 toLowerCase 처리)', () => {
//       const command = { category: 'unix', name: 'LS' };
//       expect(getMatchRank(command, 'ls')).toBe(0);
//     });
//   });
// 
//   describe('실패 / 오용 케이스 (현재 동작을 있는 그대로 문서화)', () => {
//     it('검색어가 소문자로 정규화되지 않은 채 들어오면 매치에 실패한다 (query 정규화는 호출부 책임)', () => {
//       const command = { category: 'unix', name: 'ls' };
//       expect(getMatchRank(command, 'LS')).toBe(2); // 'ls'.startsWith('LS') === false
//     });
// 
//     it('category가 "unix"/"git"이 아닌 값이면 git 접두사 제거 없이 그대로 처리된다', () => {
//       const command = { category: 'unknown', name: 'foo' };
//       expect(getMatchRank(command, 'foo')).toBe(0);
//     });
// 
//     it('command.name이 없으면 TypeError를 던진다', () => {
//       const command = { category: 'unix' };
//       expect(() => getMatchRank(command, 'x')).toThrow(TypeError);
//     });
// 
//     it('normalizedQuery가 undefined면 문자열 "undefined"와 비교되어 매치 실패로 이어진다', () => {
//       const command = { category: 'unix', name: 'ls' };
//       // 'ls'.startsWith(undefined) → 'ls'.startsWith('undefined') === false
//       // 'ls'.includes(undefined) → 'ls'.includes('undefined') === false
//       expect(getMatchRank(command, undefined)).toBe(2);
//     });
//   });
// });
// 
// describe('compareByRelevance', () => {
//   describe('정상 케이스', () => {
//     it('a가 b보다 매치 랭크가 좋으면 음수를 반환한다 (a가 앞으로 정렬)', () => {
//       const a = { category: 'unix', name: 'ls' }; // 'l'로 시작 → rank 0
//       const b = { category: 'unix', name: 'chmod' }; // 'l' 미포함 → rank 2
//       expect(compareByRelevance(a, b, 'l')).toBeLessThan(0);
//     });
// 
//     it('a가 b보다 매치 랭크가 나쁘면 양수를 반환한다 (a가 뒤로 정렬)', () => {
//       const a = { category: 'unix', name: 'chmod' };
//       const b = { category: 'unix', name: 'ls' };
//       expect(compareByRelevance(a, b, 'l')).toBeGreaterThan(0);
//     });
// 
//     it('랭크가 같으면 이름 알파벳 순으로 정렬한다', () => {
//       const a = { category: 'unix', name: 'cd' }; // 'c'로 시작 → rank 0
//       const b = { category: 'unix', name: 'chmod' }; // 'c'로 시작 → rank 0
//       expect(compareByRelevance(a, b, 'c')).toBeLessThan(0); // 'cd' < 'chmod'
//     });
//   });
// 
//   describe('빈 값 / 경계값 케이스', () => {
//     it('랭크와 이름이 완전히 같으면 0을 반환한다', () => {
//       const a = { category: 'unix', name: 'ls' };
//       const b = { category: 'unix', name: 'ls' };
//       expect(compareByRelevance(a, b, 'l')).toBe(0);
//     });
// 
//     it('랭크 차이가 2 이상 나면 그 차이값을 그대로 반환한다 (-1/0/1로 정규화하지 않음)', () => {
//       const a = { category: 'unix', name: 'ls' }; // rank 0
//       const b = { category: 'unix', name: 'chmod' }; // rank 2
//       expect(compareByRelevance(a, b, 'l')).toBe(-2);
//     });
// 
//     it('랭크가 같을 때 tie-break은 git 접두사를 제거하지 않은 원본 name 전체로 비교한다', () => {
//       // 둘 다 'c'로 시작(하위 명령어 기준 rank 0)이지만, tie-break은 subName이 아니라 a.name/b.name을 그대로 씀
//       const a = { category: 'git', name: 'git commit' };
//       const b = { category: 'git', name: 'git checkout' };
//       // 'git commit'.localeCompare('git checkout') > 0 ("commit"의 'o'가 "checkout"의 'h'보다 뒤)
//       expect(compareByRelevance(a, b, 'c')).toBeGreaterThan(0);
//     });
//   });
// 
//   describe('실패 / 오용 케이스 (현재 동작을 있는 그대로 문서화)', () => {
//     it('a.name이 없으면 (getMatchRank 계산 단계에서) TypeError를 던진다', () => {
//       const a = { category: 'unix' };
//       const b = { category: 'unix', name: 'ls' };
//       expect(() => compareByRelevance(a, b, 'l')).toThrow(TypeError);
//     });
// 
//     it('normalizedQuery가 undefined면 둘 다 rank 2로 동일해져서 이름순 tie-break으로 넘어간다', () => {
//       const a = { category: 'unix', name: 'ls' };
//       const b = { category: 'unix', name: 'mkdir' };
//       expect(compareByRelevance(a, b, undefined)).toBe(a.name.localeCompare(b.name));
//     });
//   });
// });
