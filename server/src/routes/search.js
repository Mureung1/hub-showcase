import { Router } from 'express';
// 조회 전용 Search Key만 씀 — 인덱싱(쓰기)에 쓰는 Admin Key는 여기서 쓸 필요도 이유도 없음(최소 권한 원칙).
// FE는 이 라우트를 거쳐서만 Meilisearch에 닿을 수 있고, Meilisearch의 실제 host/key는
// FE에 절대 노출되지 않는다 — 목요일 강의의 "FE는 DB/외부 서비스에 직접 못 붙는다" 원칙 그대로.
import { meiliSearchClient } from '../config/meilisearch.js';

const router = Router();

// commands.js의 category 값과 동일하게 유지해야 함 ('unix' | 'git')
const VALID_CATEGORIES = ['unix', 'git'];

// GET /api/search?category=unix&q=ls 형태로 호출됨 (searchService.js의 fetch가 이 형태로 보냄)
router.get('/', async (req, res, next) => {
    // req.query: Express가 URL의 ?category=...&q=... 부분을 객체로 파싱해준 것
    const { category, q } = req.query;

    // 1단계: category 값 검증. category가 있는데 화이트리스트에 없는 값인 경우 여기서 바로
    // 400으로 거절하고, category가 없거나(undefined) 화이트리스트에 있는 값인 경우에만 통과시킨다.
    // 검증 없이 그대로 25번 줄의 filter 문자열에 끼워 넣으면 필터 인젝션 위험이 있다
    // (예: category에 따옴표나 Meilisearch 필터 문법을 넣어서 의도한 범위 제한을 우회하는 것 —
    // SQL 인젝션과 같은 계열, 대상만 Meilisearch의 필터 언어일 뿐).
    if (category && !VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: { message: '유효하지 않은 카테고리입니다.' } });
    }

    // 2단계: meiliSearchClient가 null인 경우(.env에 MEILISEARCH_HOST/SEARCH_KEY 누락) 여기서
    // 바로 500으로 알리고, null이 아닌 경우(정상 설정)에만 3단계로 내려가 실제 검색을 시도한다.
    // 이 체크가 없으면 아래 try 블록 안에서 알 수 없는 에러로 실패해서 원인 파악이 더 어려워진다.
    if (!meiliSearchClient) {
        return res.status(500).json({ error: { message: 'MeiliSearch 설정이 없습니다.' } });
    }

    // 3단계: 실제 검색. Day 2에서 정한 필드 스펙대로 name/summary만 검색 대상, category만 필터 대상.
    // 참고: q가 빈 문자열/기호만 있는 "의미 없는 검색어"인지에 대한 검증은 여기 없음 — 지금은
    // FE(CommandListPage.jsx의 isMeaningfulQuery)가 그런 요청 자체를 안 보내므로 이 API를 부르는
    // 클라이언트가 FE 하나뿐인 한 중복시킬 실익이 없음. 이 API를 다른 클라이언트가 직접 호출하게
    // 되면, 그때 이 라우트에도 같은 검증을 추가할 것.
    try {
        const index = meiliSearchClient.index('commands');
        const searchResult = await index.search(q || '', {
            // category가 없으면(undefined) 전체 카테고리에서 검색, 있으면 그 카테고리로 범위 제한
            filter: category ? `category = "${category}"` : undefined,
        });
        // FE(searchService.js)가 기대하는 형태인 { results: [...] }로 감싸서 응답
        res.json({ results: searchResult.hits });
    } catch (error) {
        // Meilisearch SDK 자체가 실패하면(연결 문제, 잘못된 인덱스 이름 등) 직접 처리하지 않고
        // index.js에 이미 있는 공통 에러 핸들러로 넘김 — 어떤 라우트든 에러 응답 형태가
        // { error: { message } }로 통일되게 하기 위함
        next(error);
    }
});

export default router;
