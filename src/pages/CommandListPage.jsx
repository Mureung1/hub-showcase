import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CATEGORY_LABELS } from '../data/commands';
// import CommandCard from '../components/CommandCard';
// import { compareByRelevance } from '../utils/commandSort';
import { isMeaningfulQuery } from '../utils/isMeaningfulQuery';
import { searchCommands } from '../services/searchService';
import { fetchCommands } from '../services/commandsService';
import SearchBar from '../components/SearchBar';
import SearchResultList from '../components/SearchResultList';
import CommandBrowseList from '../components/CommandBrowseList';

// 전체 흐름: 사용자가 SearchBar에 타이핑 → query state 변경 → normalizedQuery 재계산
// → useEffect가 (category, normalizedQuery) 변경을 감지 → BE(/api/search)에 실제 요청
// → 성공하면 results, 실패하면 error, 그 사이엔 isLoading이 true
// → 이 네 개 state를 SearchResultList에 그대로 내려주면 그쪽에서 로딩/에러/결과없음/결과 4가지로 렌더링
function CommandListPage() {
    const { category } = useParams();
    const [query, setQuery] = useState(''); // SearchBar의 input과 그대로 바인딩되는 원본 텍스트
    const [results, setResults] = useState([]); // 검색 성공 시 BE가 돌려준 명령어 배열
    const [isLoading, setIsLoading] = useState(false); // 요청이 진행 중인 동안만 true
    const [error, setError] = useState(null); // 요청 실패 시 사용자에게 보여줄 메시지, 성공하면 다시 null

    // 검색어가 없을 때(#36 알파벳 인덱스 브라우징용) 카테고리 전체 목록. 검색 state와는
    // 목적이 달라 따로 둔다 — searchCommands는 검색어가 있을 때만 호출되는 반면, 이건
    // category가 바뀔 때 한 번만 전체를 받아오면 되는 별개의 데이터 흐름이다.
    const [allCommands, setAllCommands] = useState([]);
    const [isLoadingAll, setIsLoadingAll] = useState(true);
    const [errorAll, setErrorAll] = useState(null);

    /*const categoryCommands = useMemo(
        () => commands.filter((command) => command.category === category),
        [category]
    );*/

    // query를 매 렌더링마다 trim+소문자 변환한 파생값. state로 따로 안 두는 이유:
    // query가 바뀔 때마다 자동으로 다시 계산되면 되는 값이라, 별도 state로 관리하면
    // "query 바뀜 → normalizedQuery도 수동으로 갱신"하는 동기화 코드가 하나 더 생길 뿐임.
    //
    // 선언 위치가 중요함: 바로 아래 useEffect의 의존성 배열 [category, normalizedQuery]는
    // 컴포넌트가 렌더링되는 "지금 이 순간" 평가된다(효과 실행 시점이 아니라). 그래서 만약
    // normalizedQuery 선언을 useEffect보다 아래에 뒀다면, 의존성 배열이 평가되는 시점에
    // 아직 선언되지 않은 변수를 참조하게 돼서 "Cannot access before initialization" 에러가 남.
    const normalizedQuery = query.trim().toLowerCase();

    // 검색어가 비어있거나(""), 기호/숫자만 있어 의미 있는 문자(영문/한글)가 하나도 없으면
    // "검색어 없음"과 동일하게 취급한다. 이 판단은 FE에서만 하고 BE(server/src/routes/search.js)엔
    // 중복시키지 않음 — 지금은 이 API를 부르는 클라이언트가 이 FE 하나뿐이라 실익이 없고,
    // 나중에 다른 클라이언트가 이 API를 직접 호출하게 되면 그때 BE에도 같은 검증을 추가할 것
    // (server/src/routes/search.js에 같은 취지의 주석을 남겨둠).
    const hasMeaningfulQuery = normalizedQuery !== '' && isMeaningfulQuery(normalizedQuery);

    // 이 컴포넌트의 핵심 루틴: category나 검색어가 바뀔 때마다 BE에 검색을 새로 요청한다.
    useEffect(() => {
        // 1단계: 검색어가 없거나(빈 문자열/기호만) 의미가 없으면 아무 요청도 보내지 않고 바로 끝내고,
        // 의미 있는 검색어일 때만 아래 2~5단계(로딩→요청→응답 처리)로 이어진다.
        if (!hasMeaningfulQuery) {
            // results/isLoading/error를 여기서 굳이 초기화하지 않는 이유:
            // 검색어가 빈 상태에서는 아래 return문이 SearchResultList 대신 CommandBrowseList를
            // 렌더링해서 이 세 값을 애초에 참조하지 않는다. 즉 값이 남아있어도 화면에는
            // 영향이 없어서, 굳이 리렌더를 유발할 필요가 없다.
            // setResults([]);
            // setIsLoading(false);
            // setError(null);
            return;
        }

        // 경쟁 상태(race condition) 방지: 이 effect가 다시 실행되거나(검색어가 더 바뀜) 컴포넌트가
        // unmount되면 cleanup에서 ignore를 true로 바꾼다. 느린 이전 요청이 나중에 응답으로 와도
        // ignore가 true면 그 결과를 state에 반영하지 않아, 최신 검색어의 결과를 옛 응답이 덮어쓰는 걸 막는다.
        let ignore = false;

        // 2단계: 검색어가 있으면 로딩 상태로 전환하고, 혹시 이전 요청에서 남아있을 에러를 지운다.
        // 이 두 setState는 실제 요청(fetch)을 시작하기 "직전"에, effect 본문에서 곧바로 실행돼야
        // 화면에 "검색 중입니다..."가 뜬다 — .then/.catch 콜백 안에 넣으면 이미 늦다.
        // (React의 최신 lint 규칙은 effect 본문의 동기 setState를 기본적으로 경고하지만,
        //  이 경우는 콜백을 기다릴 수 없는 의도된 예외라 아래처럼 규칙을 꺼둔다.)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoading(true);
        setError(null);

        // 3단계: 실제 검색 요청. category/normalizedQuery는 위쪽 클로저에서 그대로 캡처해서 씀.
        searchCommands(category, normalizedQuery)
            // 4-a단계(성공): BE가 돌려준 배열을 그대로 results에 반영 → SearchResultList가 다시 그려짐
            .then((data) => { if (!ignore) setResults(data); })
            // 4-b단계(실패): err.message를 그대로 노출 — searchService.js가 "서버에 연결할 수
            // 없습니다"(네트워크 자체가 안 됨)와 "서버에서 오류가 발생했습니다"(응답은 왔지만 실패)를
            // 서로 다른 Error로 던지므로, 여기서 하나의 문구로 뭉뚱그리지 않고 그 메시지를 그대로 씀
            .catch((err) => { if (!ignore) setError(err.message); })
            // 5단계: 성공하든 실패하든 로딩 상태는 끝났으니 항상 꺼준다
            .finally(() => { if (!ignore) setIsLoading(false); });

        return () => {
            ignore = true;
        };
    }, [category, normalizedQuery, hasMeaningfulQuery]);

    // 검색어와 무관하게, category가 바뀔 때마다 전체 목록을 한 번 받아온다(#36 알파벳 인덱스용).
    // 검색 useEffect와 분리해둔 이유: 저건 매 검색어 변경마다 재요청해야 하고, 이건 category
    // 하나에 한 번만 요청하면 되는 서로 다른 트리거를 가진 별개의 데이터 흐름이기 때문.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoadingAll(true);
        setErrorAll(null);

        fetchCommands()
            .then((data) => setAllCommands(data.filter((command) => command.category === category)))
            .catch((err) => setErrorAll(err.message))
            .finally(() => setIsLoadingAll(false));
    }, [category]);

    /*const result = useMemo(() => {
        if (!normalizedQuery) return [];
        if (!/[a-z가-힣]/i.test(normalizedQuery)) return [];

        return categoryCommands
            .filter(
                (command) =>
                    command.name.toLowerCase().includes(normalizedQuery) ||
                    command.summary.toLowerCase().includes(normalizedQuery)
            )
            .sort((a, b) => compareByRelevance(a, b, normalizedQuery));
    }, [categoryCommands, normalizedQuery]);*/

    // URL의 category가 CATEGORY_LABELS에 있는 값('unix'/'git')인 경우 그 한글 라벨이 들어오고,
    // 없는 값(오타난 URL 등)인 경우 undefined가 되어 아래 조건문으로 빠진다.
    const categoryLabel = CATEGORY_LABELS[category];

    // categoryLabel이 없는 경우(=존재하지 않는 카테고리) 여기서 에러 화면만 보여주고 끝내고,
    // 있는 경우에만 아래로 내려가 실제 검색 화면(SearchBar/SearchResultList)을 그린다.
    if (!categoryLabel) {
        return (
            <div className="app-shell">
                <Link to="/" className="back-link">
                    ← 카테고리 선택으로
                </Link>
                <div className="detail-container not-found">
                    <p className="terminal-error">-bash: cd: {category}: 에러: 존재하지 않는 카테고리입니다</p>
                </div>
            </div>
        );
    }

    return (
        <div className="app-shell">
            <Link to="/" className="back-link">
                ← 카테고리 선택으로
            </Link>

            <header className="app-header">
                <span className="app-badge">📘 CS 실습 사전</span>
                <h1 className="app-title">
                    {categoryLabel}
                    <span className="cursor-blink" aria-hidden="true">▌</span>
                </h1>
            </header>

            <SearchBar category={category} value={query} onChange={setQuery} />

            {!hasMeaningfulQuery ? (
                <CommandBrowseList commands={allCommands} isLoading={isLoadingAll} error={errorAll} />
            ) : (
                <SearchResultList
                    query={query}
                    isLoading={isLoading}
                    error={error}
                    results={results}
                />
            )}
        </div>
    );
}

export default CommandListPage;
