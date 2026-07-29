// commandsService.js와 동일한 이유로 환경변수 오버라이드 지원 (배포 시 BE 주소가 localhost가 아님)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// 경로 문자열을 호출부에 흩어놓지 않고 한 곳에 모아둔다 — BE 라우트가 바뀌어도
// 이 한 줄만 고치면 되게 하기 위함(피드백 시간에 나온 지적).
const SEARCH_PATH = '/api/search';

// 지금은 로컬 배열을 필터링하지만, 나중엔 이 안을 fetch(Meilisearch 엔드포인트)로 교체한다.
// 호출부(searchCommands(category, query) → Promise<Command[]>)는 그대로 유지된다.
/*export function searchCommands(category, query) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const normalizedQuery = query.trim().toLowerCase();

            if (!normalizedQuery || !/[a-z가-힣]/i.test(normalizedQuery)) {
                resolve([]);
                return;
            }

            const results = commands
                .filter((command) => command.category === category)
                .filter(
                    (command) =>
                        command.name.toLowerCase().includes(normalizedQuery) ||
                        command.summary.toLowerCase().includes(normalizedQuery)
                )
                .sort((a, b) => compareByRelevance(a, b, normalizedQuery));

            resolve(results);
        }, MOCK_DELAY_MS);
    });
}*/

// CommandListPage 입장에서는 이 함수가 "검색 데이터를 어디서/어떻게 가져오는지"를 몰라도 되게 만드는 창구.
// 실제로 이 함수 내부는 mock(위의 주석 처리된 버전)에서 진짜 fetch로 통째로 바뀌었지만,
// 호출부(category, query를 받아 Promise<Command[]>를 돌려줌)는 하나도 안 바뀌었다 —
// 그래서 CommandListPage.jsx는 이 교체를 몰라도 그대로 동작한다(구현을 감추는 이점).
export async function searchCommands(category, query) {
    // BE가 req.query로 파싱할 수 있게 쿼리스트링(?category=...&q=...) 형태로 직렬화
    const params = new URLSearchParams({ category, q: query });

    // 1단계: 실제 네트워크 요청. fetch가 성공한 경우엔 "서버까지 도달했다"는 뜻일 뿐이고,
    // 서버가 응답 내용까지 성공적으로 처리했는지는 아직 모른다(그건 2단계에서 따로 확인).
    // fetch 자체가 실패한 경우(요청이 서버에 도달조차 못한 경우)엔 아래 catch로 빠진다.
    let response;
    try {
        response = await fetch(`${API_BASE_URL}${SEARCH_PATH}?${params}`);
    } catch {
        // 이 catch로 들어온다는 건 fetch가 응답 자체를 못 받았다는 뜻 —
        // 서버가 꺼져있거나, CORS가 막혔거나, 네트워크가 끊긴 경우. "서버가 뭐라고 답했는지"와는
        // 다른 카테고리의 실패라서 아래(2단계)와 다른 메시지를 던진다.
        throw new Error('서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.');
    }

    // 2단계: 서버가 응답하긴 했지만 HTTP 상태코드가 실패(4xx/5xx)인 경우엔 여기서 에러를 던지고,
    // 성공(2xx)인 경우에만 3단계로 내려가 실제 데이터를 꺼낸다.
    // 예: search.js에서 category가 화이트리스트에 없어 400을 준 경우, 또는 Meilisearch 쪽 문제로 500.
    if (!response.ok) {
        throw new Error('검색 요청 중 서버에서 오류가 발생했습니다.');
    }

    // 3단계: 진짜 성공 — BE가 { results: [...] } 형태로 응답하므로 그 배열만 꺼내서 돌려준다.
    const data = await response.json();
    return data.results;
}
