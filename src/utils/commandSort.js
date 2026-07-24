// 검색 우선순위(이름 일치 > 요약 일치) 로직은 Meilisearch API로 이전됐다 —
// server/src/scripts/indexCommands.js의 updateSearchableAttributes/updateRankingRules 설정이
// 이 파일의 역할을 대신한다. 실제 검색 경로(searchService.js → /api/search)에서는
// 아래 함수들이 더 이상 호출되지 않아 통째로 주석 처리해 남겨둔다.

// const GIT_PREFIX = 'git ';

// function getSubcommandName(command) {
//     const name = command.name.toLowerCase();
//     return command.category === 'git' ? name.slice(GIT_PREFIX.length) : name;
// }

// // 0 = name(또는 git 접두사 제외 부분)이 검색어로 시작
// // 1 = name에 검색어가 포함(시작은 아님)
// // 2 = name에는 없고 summary/description에만 포함
// export function getMatchRank(command, normalizedQuery) {
//     const subName = getSubcommandName(command);

//     if (subName.startsWith(normalizedQuery)) {
//         return 0;
//     }
//     if (subName.includes(normalizedQuery)) {
//         return 1;
//     }
//     return 2;
// }

// export function compareByRelevance(a, b, normalizedQuery) {
//     const rankDiff = getMatchRank(a, normalizedQuery) - getMatchRank(b, normalizedQuery);
//     if (rankDiff !== 0) return rankDiff;
//     return a.name.localeCompare(b.name);
// }
