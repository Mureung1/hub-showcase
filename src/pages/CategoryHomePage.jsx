import { Link } from 'react-router-dom';
import { commands } from '../data/commands';

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
            </header>

            <div className="category-select-grid">
                {CATEGORIES.map(({ key, icon, title, desc }) => {
                    const count = commands.filter((command) => command.category === key).length;
                    return (
                        <Link key={key} to={`/${key}`} className="category-select-card">
                            <span className="category-select-icon">{icon}</span>
                            <h2 className="category-select-title">{title}</h2>
                            <p className="category-select-desc">{desc}</p>
                            <span className="category-select-count">{count}개 명령어</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

export default CategoryHomePage;
