import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { commands, CATEGORY_LABELS } from '../data/commands';
import CommandCard from '../components/CommandCard';

function CommandListPage() {
    const { category } = useParams();
    const [query, setQuery] = useState('');

    const categoryCommands = useMemo(
        () => commands.filter((command) => command.category === category),
        [category]
    );

    const normalizedQuery = query.trim().toLowerCase();

    const filteredCommands = useMemo(() => {
        if (!normalizedQuery) return [];

        return categoryCommands.filter(
            (command) =>
                command.name.toLowerCase().includes(normalizedQuery) ||
                command.summary.toLowerCase().includes(normalizedQuery) ||
                command.description.toLowerCase().includes(normalizedQuery)
        );
    }, [categoryCommands, normalizedQuery]);

    const categoryLabel = CATEGORY_LABELS[category];

    if (!categoryLabel) {
        return (
            <div className="app-shell">
                <Link to="/" className="back-link">
                    ← 카테고리 선택으로
                </Link>
                <div className="detail-container not-found">
                    <p className="detail-desc">"{category}"는 존재하지 않는 카테고리입니다.</p>
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
                    <span className="cursor-blink">▌</span>
                </h1>
            </header>

            <div className="toolbar">
                <div className="search-row">
                    <span className="search-prompt">
                        <span className="prompt-user">student@cs-dict</span>
                        <span className="prompt-symbol">:</span>
                        <span className="prompt-path">~/{category}</span>
                        <span className="prompt-symbol">$</span>
                    </span>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="검색할 명령어 이름이나 설명을 입력하세요"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        aria-label="명령어 검색"
                        autoFocus
                    />
                </div>
            </div>

            {normalizedQuery === '' && (
                <p className="terminal-hint">명령어 이름이나 설명을 입력해 검색하세요.</p>
            )}

            {normalizedQuery !== '' && filteredCommands.length === 0 && (
                <p className="terminal-error">-bash: {query}: command not found</p>
            )}

            {normalizedQuery !== '' && filteredCommands.length > 0 && (
                <div className="command-grid">
                    {filteredCommands.map((command) => (
                        <CommandCard key={command.id} command={command} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default CommandListPage;
