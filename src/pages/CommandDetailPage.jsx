import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CATEGORY_LABELS } from '../data/commands';
import { fetchCommandById } from '../services/commandsService';
import { fetchScenarios } from '../services/scenariosService';
import CopyButton from '../components/CopyButton';

function CommandDetailPage() {
    const { id } = useParams();
    const [command, setCommand] = useState(null); // BE(/api/commands/:id)가 내려준 명령어 하나, 없으면(404) null
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null); // 네트워크/서버 오류 메시지 — "존재하지 않는 id"(404)와는 다른 경우
    const [relatedScenarios, setRelatedScenarios] = useState([]); // 이 명령어가 속한 시나리오들("관련 상황" 섹션용)

    useEffect(() => {
        // id가 바뀔 때마다(다른 명령어 상세로 이동) 이전 요청의 결과(command/error)가 남아있으면
        // 안 되니 로딩 상태로 되돌리고 에러를 지운 뒤 새로 요청한다. CommandListPage.jsx와 동일한
        // 이유로 이 줄만 lint 규칙(react-hooks/set-state-in-effect)을 꺼둔다.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoading(true);
        setError(null);

        fetchCommandById(id)
            .then((data) => setCommand(data))
            .catch((err) => setError(err.message))
            .finally(() => setIsLoading(false));

        // "관련 상황"은 부가 정보라, 이 fetch가 실패해도 상세 페이지 자체(위 error)는 영향받지
        // 않게 별도로 처리한다 — 실패하면 그냥 빈 배열로 두고 섹션이 안 보일 뿐이다(graceful degradation,
        // 대문 화면의 BE 다운 시 개수만 실패 표시하는 것과 같은 원칙).
        fetchScenarios()
            .then((scenarios) => setRelatedScenarios(scenarios.filter((s) => s.command_ids.includes(id))))
            .catch(() => setRelatedScenarios([]));
    }, [id]);

    if (isLoading) {
        return (
            <div className="app-shell">
                <Link to="/" className="back-link">
                    ← 카테고리 선택으로
                </Link>
                <p className="terminal-hint">불러오는 중입니다...</p>
            </div>
        );
    }

    // error(네트워크/서버 오류)와 command === null(존재하지 않는 id, 404)은 서로 다른 원인이지만,
    // 사용자에게 보여줄 화면은 둘 다 "이 명령어를 볼 수 없다"는 같은 형태라 메시지만 갈라서 재사용한다.
    if (error || !command) {
        return (
            <div className="app-shell">
                <Link to="/" className="back-link">
                    ← 카테고리 선택으로
                </Link>
                <div className="detail-container not-found">
                    <p className="terminal-error">
                        {error ?? `-bash: ${id}: 에러: 찾을 수 없는 명령어입니다`}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="app-shell">
            <Link to={`/${command.category}`} className="back-link">
                ← {CATEGORY_LABELS[command.category]} 목록으로
            </Link>

            <div className="detail-container">
                <div className="detail-header">
                    <h1 className="detail-name">
                        {command.name}
                        <span className="cursor-blink" aria-hidden="true">▌</span>
                    </h1>
                </div>
                <p className="detail-summary">{command.summary}</p>

                <section className="detail-section">
                    <h2 className="detail-section-title">설명</h2>
                    <p className="detail-desc">{command.description}</p>
                </section>

                {command.options.length > 0 && (
                    <section className="detail-section">
                        <h2 className="detail-section-title">주요 옵션</h2>
                        <ul className="option-list">
                            {command.options.map((option) => (
                                <li key={option.flag} className="option-item">
                                    <code className="option-flag">{option.flag}</code>
                                    <span className="option-desc">{option.desc}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {command.examples.length > 0 && (
                    <section className="detail-section">
                        <h2 className="detail-section-title">터미널 예시</h2>
                        <div className="example-list">
                            {command.examples.map((example) => (
                                <div key={example.command} className="example-block">
                                    <div className="example-command-row">
                                        <code className="example-command">{example.command}</code>
                                        <CopyButton text={example.command} />
                                    </div>
                                    <p className="example-desc">{example.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {relatedScenarios.length > 0 && (
                    <section className="detail-section">
                        <h2 className="detail-section-title">관련 상황</h2>
                        <div className="scenario-badge-list">
                            {relatedScenarios.map((scenario) => (
                                <Link key={scenario.id} to={`/scenarios/${scenario.id}`} className="scenario-badge">
                                    {scenario.title}
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

export default CommandDetailPage;
