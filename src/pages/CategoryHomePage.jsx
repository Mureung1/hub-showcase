import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchCommands } from '../services/commandsService';

// ScenarioDetailPage.jsx의 ChevronDownIcon과 같은 스타일(feather-icon류, currentColor 스트로크) —
// 텍스트 화살표(→)보다 이 앱의 기존 아이콘 톤에 맞춰 자연스럽게 보이도록.
function ArrowRightIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
        </svg>
    );
}

// 컬러풀한 이모지(🖥️/🔀) 대신 이 앱의 다른 아이콘과 같은 모노톤 SVG로 —
// 유닉스는 터미널 프롬프트(">_" 커서)를, git은 로고를 그대로 복제하지 않고
// "브랜치"라는 개념을 형상화하는 흔한 아이콘 형태(노드+선)를 모방한다.
function TerminalCursorIcon() {
    return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M6 9l3 3-3 3" />
            <line x1="12" y1="15" x2="16" y2="15" />
        </svg>
    );
}

// git 공식 로고 자체를 그대로 복제하지 않고, 그 실루엣(회전된 다이아몬드 프레임 안에
// 두 노드가 곡선으로 연결된 브랜치 형태)만 모티브로 가져온 단순화된 버전.
function GitLogoIcon() {
    return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="5" y="5" width="14" height="14" rx="2" transform="rotate(45 12 12)" />
            <circle cx="9" cy="9" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="15" cy="15" r="1.6" fill="currentColor" stroke="none" />
            <path d="M9 9v2a3 3 0 0 0 3 3h1" />
        </svg>
    );
}

const CATEGORIES = [
    {
        key: 'unix',
        Icon: TerminalCursorIcon,
        title: 'Unix 명령어 목록',
        desc: '파일/디렉터리 조작, 검색, 권한, 프로세스 관리 등 유닉스 실습 기본 명령어',
    },
    {
        key: 'git',
        Icon: GitLogoIcon,
        title: 'Git 명령어 목록',
        desc: '버전 관리, 브랜치, 원격 저장소 협업에 필요한 git 기본 명령어',
    },
];

function CategoryHomePage() {
    const [commands, setCommands] = useState([]); // BE(/api/commands)가 내려준 명령어 전체 배열, 카테고리별 개수 계산에만 씀
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // 마운트 시 한 번만 실행되는 effect라 isLoading/error를 여기서 다시 초기화할 필요는 없음
        // (useState 초기값이 이미 true/null) — 바로 요청만 보낸다.
        fetchCommands()
            .then((data) => setCommands(data))
            .catch((err) => setError(err.message))
            .finally(() => setIsLoading(false));
    }, []);

    return (
        <div className="app-shell">
            <header className="app-header">
                <span className="app-badge">CS 실습 사전</span>
                <h1 className="app-title">
                    유닉스 &amp; Git 명령어 사전
                    <span className="cursor-blink" aria-hidden="true">▌</span>
                </h1>
                <p className="app-desc">
                    실습 중 헷갈리는 명령어를 찾아보세요. 먼저 카테고리를 선택하면 검색창과 목록이 나타납니다.
                </p>
                <p className="app-tagline">
                    방대한 매뉴얼을 뒤지는 대신, 실습에 진짜 필요한 명령어만 골라 담았습니다.
                </p>
            </header>

            {/* 카테고리(unix/git)가 아니라 실습 상황을 가로지르는 교차 그룹이라, 카테고리
                그리드에 세 번째 카드로 끼워넣지 않고 별도 진입점으로 둔다. */}
            <p className="scenario-app-desc">
                <Link to="/scenarios" className="scenario-entry-link">
                    상황별로 찾아보기
                    <ArrowRightIcon />
                </Link>
            </p>

            {/* 카테고리 카드/링크는 라우팅일 뿐 BE 없이도 동작하므로, 개수 fetch가 로딩 중이거나
                실패하더라도 그리드 자체는 항상 그린다 — 실패해도 못 보여줄 건 "개수" 하나뿐이다. */}
            <div className="category-select-grid">
                {CATEGORIES.map(({ key, Icon, title, desc }) => {
                    const count = commands.filter((command) => command.category === key).length;
                    return (
                        <Link key={key} to={`/${key}`} className="category-select-card">
                            <span className="category-select-icon">
                                <Icon />
                            </span>
                            <h2 className="category-select-title">{title}</h2>
                            <p className="category-select-desc">{desc}</p>
                            <span className="category-select-count">
                                {isLoading ? '개수 확인 중...' : error ? '개수 정보 없음' : `${count}개 명령어`}
                            </span>
                        </Link>
                    );
                })}
            </div>

            {error && (
                <p className="terminal-hint">
                    명령어 개수를 불러오지 못했습니다. 카테고리 이동은 그대로 이용할 수 있습니다.
                </p>
            )}
        </div>
    );
}

export default CategoryHomePage;
