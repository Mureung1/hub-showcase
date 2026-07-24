import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchScenarios } from '../services/scenariosService';

function ScenarioHomePage() {
    const [scenarios, setScenarios] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchScenarios()
            .then((data) => setScenarios(data))
            .catch((err) => setError(err.message))
            .finally(() => setIsLoading(false));
    }, []);

    return (
        <div className="app-shell">
            <Link to="/" className="back-link">
                ← 카테고리 선택으로
            </Link>

            <header className="app-header">
                <h1 className="app-title">
                    상황별 명령어 찾기
                    <span className="cursor-blink" aria-hidden="true">▌</span>
                </h1>
                <p className="app-desc">
                    "이 상황이면 이 명령어들이 필요하다" — 실습 시나리오별로 명령어를 모아봤습니다.
                </p>
            </header>

            {isLoading && <p className="terminal-hint">불러오는 중입니다...</p>}

            {error && (
                <p className="terminal-error">
                    시나리오 목록을 불러오지 못했습니다: {error}
                </p>
            )}

            {!isLoading && !error && (
                <div className="category-select-grid">
                    {scenarios.map(({ id, title, description, command_ids }) => (
                        <Link key={id} to={`/scenarios/${id}`} className="category-select-card">
                            <h2 className="category-select-title">{title}</h2>
                            <p className="category-select-desc">{description}</p>
                            <span className="category-select-count">{command_ids.length}개 명령어</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ScenarioHomePage;
