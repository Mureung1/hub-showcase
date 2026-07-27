import CommandCard from './CommandCard';
import AlphabetIndex from './AlphabetIndex';
import { groupCommandsByLetter } from '../utils/commandIndex';

// 검색어가 없을 때(=SearchResultList 대신) 렌더링되는 "사전식 전체 목록 브라우징" 화면.
// SearchResultList와 마찬가지로 단일 책임 원칙에 따라 이 컴포넌트는 받은 commands를
// 그룹핑/렌더링만 하고, fetch는 CommandListPage 책임으로 남겨둔다.
function CommandBrowseList({ commands, isLoading, error }) {
    if (isLoading) {
        return <p className="terminal-hint">불러오는 중입니다...</p>;
    }

    if (error) {
        return <p className="terminal-error">{error}</p>;
    }

    const groups = groupCommandsByLetter(commands);
    const availableLetters = new Set(groups.map((group) => group.letter));

    return (
        <>
            <AlphabetIndex availableLetters={availableLetters} />

            {groups.map((group) => (
                <section key={group.letter} className="command-index-section">
                    <h2 id={`letter-${group.letter}`} className="command-index-heading">
                        {group.letter}
                    </h2>
                    <div className="command-list">
                        {group.commands.map((command) => (
                            <CommandCard key={command.id} command={command} />
                        ))}
                    </div>
                </section>
            ))}
        </>
    );
}

export default CommandBrowseList;
