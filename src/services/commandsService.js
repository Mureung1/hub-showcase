// searchService.js와 같은 fetch 패턴 — 네트워크 실패/응답 실패를 구분해서 에러 메시지를 던지고,
// 호출부(CategoryHomePage/CommandDetailPage)는 이 함수들이 BE를 거쳐 Supabase에서 가져온다는
// 사실을 몰라도 되게 만드는 창구.
const API_BASE_URL = 'http://localhost:4000';

async function requestJson(path) {
    let response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`);
    } catch {
        throw new Error('서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.');
    }

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error('요청 중 서버에서 오류가 발생했습니다.');
    }

    return response.json();
}

// GET /api/commands — 전체 명령어 목록 (CategoryHomePage의 카테고리별 개수 계산에 씀)
export async function fetchCommands() {
    const data = await requestJson('/api/commands');
    return data.results;
}

// GET /api/commands/:id — 명령어 하나 상세 조회. 존재하지 않는 id면 404이고,
// 이 경우 에러를 던지지 않고 null을 돌려줘서 CommandDetailPage가 "찾을 수 없음" 화면을
// 지금처럼(에러가 아니라 정상적인 분기로) 처리할 수 있게 한다.
export async function fetchCommandById(id) {
    return requestJson(`/api/commands/${id}`);
}
