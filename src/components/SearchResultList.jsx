import CommandCard from './CommandCard';

// CommandListPage가 들고 있는 검색 관련 state(query/results/isLoading/error)를
// props로만 받아서 "지금 이 4가지 상태 중 뭘 보여줄지"만 판단하는 컴포넌트.
// 이 컴포넌트 자신은 state를 하나도 갖지 않고, fetch도 직접 하지 않는다(단일 책임 원칙) —
// 데이터를 어떻게 가져오는지는 CommandListPage/searchService 쪽 책임, 여기는 "보여주기"만 담당.
// 검색어가 없는 경우(#36부터는 CommandBrowseList가 대신 렌더링됨)는 CommandListPage가
// 애초에 이 컴포넌트를 렌더링하지 않으므로, 여기서는 "검색어가 있다"는 게 항상 보장된다.
//
// 화면에 뜰 수 있는 경우의 수는 사실상 4가지고, 아래 JSX는 그중 정확히 하나만 뜨게 만드는 게 핵심이다:
//   ① 로딩 중 → "검색 중입니다..."
//   ② 에러 → 에러 메시지
//   ③ 결과 0개(로딩도 에러도 아님) → "찾을 수 없는 명령어입니다"
//   ④ 결과 있음 → 카드 목록
function SearchResultList({ query, isLoading, error, results})
{
    return (
        <>
            {/* ① 로딩 중 */}
            {isLoading && <p className="terminal-hint">검색 중입니다...</p>}

            {/* ③ 결과 0개. isLoading이거나 error가 있는 경우엔 이 문구를 띄우지 않고,
                로딩도 에러도 아닌데 results가 0개인 경우에만(=진짜 "결과 없음" 성공 응답) 띄운다.
                이 두 조건이 없으면, 로딩 중이거나 에러가 난 상황에서도 "이전 검색의 results가
                마침 0개였다"는 이유만으로 이 문구가 로딩/에러 문구와 동시에 두 줄로 겹쳐 뜬다
                (feature-verify 검증 중 발견한 버그). */}
            {!isLoading && !error && results.length === 0 && (
                <p className="terminal-error">-bash: {query}: 에러: 찾을 수 없는 명령어입니다.</p>
            )}

            {/* ② 에러 — error는 null이 기본값이라 falsy 체크만으로 있을 때만 렌더링됨 */}
            {error && <p className="terminal-error">{error}</p>}

            {/* ④ 결과 있음 — command.id를 key로 써서 목록이 재정렬/변경돼도 React가 각 카드를 올바르게 추적함 */}
            {results.length > 0 && (
                <div className="command-list">
                    {results.map((command) => (
                        <CommandCard key={command.id} command={command} />
                    ))}
                </div>
            )}
        </>
    );
}

export default SearchResultList;
