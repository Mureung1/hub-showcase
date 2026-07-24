// import { Link } from 'react-router-dom';

function SearchBar({ category, value, onChange }) {
    return (
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
                    placeholder="검색할 명령어 이름을 입력해 보세요"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    aria-label="명령어 검색"
                    autoFocus
                />
            </div>
        </div>
    );
}

export default SearchBar;
