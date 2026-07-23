import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchCommands } from '../services/commandsService';

const CATEGORIES = [
    {
        key: 'unix',
        icon: '🖥️',
        title: 'Unix 명령어 목록',
        desc: '파일/디렉터리 조작, 검색, 권한, 프로세스 관리 등 유닉스 실습 기본 명령어',
    },
    {
        key: 'git',
        icon: '🔀',
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
                <span className="app-badge">📘 CS 실습 사전</span>
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

            {/* 카테고리 카드/링크는 라우팅일 뿐 BE 없이도 동작하므로, 개수 fetch가 로딩 중이거나
                실패하더라도 그리드 자체는 항상 그린다 — 실패해도 못 보여줄 건 "개수" 하나뿐이다. */}
            <div className="category-select-grid">
                {CATEGORIES.map(({ key, icon, title, desc }) => {
                    const count = commands.filter((command) => command.category === key).length;
                    return (
                        <Link key={key} to={`/${key}`} className="category-select-card">
                            <span className="category-select-icon">{icon}</span>
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
