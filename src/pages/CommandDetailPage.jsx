import { Link, useParams } from 'react-router-dom';
import { commands, CATEGORY_LABELS } from '../data/commands';

function CommandDetailPage() {
    const { id } = useParams();
    const command = commands.find((item) => item.id === id);

    if (!command) {
        return (
            <div className="app-shell">
                <Link to="/" className="back-link">
                    ← 카테고리 선택으로
                </Link>
                <div className="detail-container not-found">
                    <p className="detail-desc">"{id}"에 해당하는 명령어를 찾을 수 없습니다.</p>
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
                        <span className="cursor-blink">▌</span>
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
                                    <code className="example-command">{example.command}</code>
                                    <p className="example-desc">{example.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

export default CommandDetailPage;
