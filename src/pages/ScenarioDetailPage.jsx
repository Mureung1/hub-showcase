import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchScenarioById } from '../services/scenariosService';
import { fetchCommands } from '../services/commandsService';

// CommandDetailPage.jsx의 ClipboardIcon/CheckIcon과 같은 스타일(feather-icon류, currentColor 스트로크)
// — 텍스트 화살표(↓)보다 이 앱의 기존 아이콘 톤에 맞춰 자연스럽게 보이도록.
function ChevronDownIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

function ScenarioDetailPage() {
    const { id } = useParams();
    const [scenario, setScenario] = useState(null); // BE(/api/scenarios/:id)가 내려준 시나리오 하나, 없으면(404) null
    const [commands, setCommands] = useState([]); // command_ids를 이름/요약으로 풀어서 보여주기 위한 전체 명령어 목록
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // id가 바뀔 때마다(다른 시나리오 상세로 이동) 이전 결과가 남아있으면 안 되므로
        // 로딩 상태로 되돌리고 에러를 지운 뒤 새로 요청한다. CommandDetailPage.jsx와 동일한 이유로
        // 이 줄만 lint 규칙(react-hooks/set-state-in-effect)을 꺼둔다.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoading(true);
        setError(null);

        Promise.all([fetchScenarioById(id), fetchCommands()])
            .then(([scenarioData, commandsData]) => {
                setScenario(scenarioData);
                setCommands(commandsData);
            })
            .catch((err) => setError(err.message))
            .finally(() => setIsLoading(false));
    }, [id]);

    if (isLoading) {
        return (
            <div className="app-shell">
                <Link to="/scenarios" className="back-link">
                    ← 상황별 목록으로
                </Link>
                <p className="terminal-hint">불러오는 중입니다...</p>
            </div>
        );
    }

    // error(네트워크/서버 오류)와 scenario === null(존재하지 않는 id, 404)은 서로 다른 원인이지만,
    // 사용자에게 보여줄 화면은 둘 다 "이 시나리오를 볼 수 없다"는 같은 형태라 메시지만 갈라서 재사용한다.
    if (error || !scenario) {
        return (
            <div className="app-shell">
                <Link to="/scenarios" className="back-link">
                    ← 상황별 목록으로
                </Link>
                <div className="detail-container not-found">
                    <p className="terminal-error">
                        {error ?? `-bash: ${id}: 에러: 찾을 수 없는 시나리오입니다`}
                    </p>
                </div>
            </div>
        );
    }

    // command_ids 순서를 그대로 유지하며 전체 명령어 목록에서 매칭되는 것만 골라낸다.
    // (marshaling 대상이 삭제/변경된 경우를 대비해 못 찾은 id는 조용히 건너뛴다)
    const steps = scenario.command_ids
        .map((commandId) => commands.find((command) => command.id === commandId))
        .filter(Boolean);

    return (
        <div className="app-shell">
            <Link to="/scenarios" className="back-link">
                ← 상황별 목록으로
            </Link>

            <div className="detail-container">
                <div className="detail-header">
                    <h1 className="detail-name">
                        {scenario.title}
                        <span className="cursor-blink" aria-hidden="true">▌</span>
                    </h1>
                </div>
                <p className="detail-summary">{scenario.description}</p>

                <section className="detail-section">
                    <h2 className="detail-section-title">순서대로 필요한 명령어</h2>
                    <div className="scenario-list">
                        {steps.map((command, index) => (
                            <div key={command.id} className="scenario-step-group">
                                {/* 첫 스텝 위에는 화살표가 필요 없어서 index > 0일 때만 렌더 */}
                                {index > 0 && (
                                    <div className="scenario-step-arrow">
                                        <ChevronDownIcon />
                                    </div>
                                )}
                                <Link to={`/commands/${command.id}`} className="scenario-step">
                                    <span className="scenario-step-index">{index + 1}</span>
                                    <span>
                                        <span className="scenario-step-name">{command.name}</span>
                                        <p className="scenario-step-summary">{command.summary}</p>
                                    </span>
                                </Link>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}

export default ScenarioDetailPage;
