import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { commands, CATEGORY_LABELS } from '../data/commands';

function ClipboardIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="2" width="6" height="4" rx="1" />
            <path d="M9 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-4" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function CommandDetailPage() {
    const { id } = useParams();
    const command = commands.find((item) => item.id === id);
    const [copiedCommand, setCopiedCommand] = useState(null);

    const handleCopy = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedCommand(text);
            setTimeout(() => setCopiedCommand(null), 1500);
        } catch {
            // 클립보드 접근 실패 시 조용히 무시 (권한 없는 환경 등)
        }
    };

    if (!command) {
        return (
            <div className="app-shell">
                <Link to="/" className="back-link">
                    ← 카테고리 선택으로
                </Link>
                <div className="detail-container not-found">
                    <p className="terminal-error">-bash: {id}: 에러: 찾을 수 없는 명령어입니다</p>
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
                                        <button
                                            type="button"
                                            className={`copy-button${copiedCommand === example.command ? ' copied' : ''}`}
                                            onClick={() => handleCopy(example.command)}
                                            aria-label={`${example.command} 명령어 복사`}
                                        >
                                            {copiedCommand === example.command ? <CheckIcon /> : <ClipboardIcon />}
                                        </button>
                                    </div>
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
