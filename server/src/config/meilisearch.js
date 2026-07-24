// server/src/config/supabase.js와 같은 패턴: 이 프로젝트에서 외부 서비스 클라이언트는
// "환경변수가 있으면 실제 클라이언트, 없으면 null"로 만들어서, .env 설정이 안 된 채로 서버가
// 떠도 당장 죽지는 않고(다른 기능은 그대로 쓸 수 있음) 실제로 이 클라이언트를 쓰려는 시점에만
// (search.js의 `if (!meiliSearchClient)` 체크처럼) 문제를 드러내게 만든다.
import { Meilisearch } from 'meilisearch';

// 두 클라이언트가 같은 host(Meilisearch Cloud 프로젝트 주소)를 쓰되, API 키만 서로 다르다.
const host = process.env.MEILISEARCH_HOST;

// Admin Key: 인덱스 생성, 검색 가능/필터 가능 필드 설정, 문서 추가/수정 같은 "쓰기" 권한이 있는 키.
// 이 클라이언트는 indexCommands.js(데이터를 올리는 관리자용 스크립트) 안에서만 쓰인다 —
// 요청을 처리하는 라우트(search.js)에서는 절대 이걸 쓰지 않는다: 만약 라우트가 이 키를 쓰다가
// 키가 새어나가면 누구든 인덱스를 통째로 지우거나 조작할 수 있게 되기 때문.
// host와 ADMIN_KEY가 둘 다 있는 경우엔 실제 클라이언트를 만들고,
// 둘 중 하나라도 없는 경우엔 null이 되어 이 클라이언트를 쓰려는 곳에서 바로 티가 난다.
export const meiliAdminClient = host && process.env.MEILISEARCH_ADMIN_KEY ? new Meilisearch({
    host,
    apiKey: process.env.MEILISEARCH_ADMIN_KEY
}) : null;

// Search Key: 검색(조회)만 할 수 있고 인덱스를 바꿀 권한은 없는, 상대적으로 안전한 키.
// 실제 사용자 요청을 처리하는 routes/search.js가 이 클라이언트를 쓴다 — 요청 하나하나가
// 외부 입력(사용자가 보낸 category/q)에 의해 좌우되는 경로라, 혹시 뭔가 잘못돼도
// "검색만 가능하고 쓰기는 불가능한" 이 키로는 데이터가 훼손될 수 없다(최소 권한 원칙).
// host와 SEARCH_KEY가 둘 다 있는 경우엔 실제 클라이언트를 만들고,
// 둘 중 하나라도 없는 경우엔 null이 되어 search.js의 500 응답으로 이어진다.
export const meiliSearchClient = host && process.env.MEILISEARCH_SEARCH_KEY ? new Meilisearch({
    host,
    apiKey: process.env.MEILISEARCH_SEARCH_KEY
}) : null;
