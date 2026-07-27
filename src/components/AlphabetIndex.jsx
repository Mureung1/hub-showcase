const ALPHABET = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

// availableLetters: 이 카테고리에 실제로 존재하는 글자 집합(Set). 26자를 항상 다 보여주되,
// 데이터에 없는 글자는 클릭 불가(회색) 처리 — 사전식 인덱스는 "이 글자엔 없다"는 것도
// 알파벳 순서 그대로 보여줘야 사용자가 체계를 헷갈리지 않는다(중간에 글자가 빠지면 오해 소지).
//
// 점프는 순수 HTML 앵커(href="#letter-X" ↔ 목록 쪽 id="letter-X")로 동작 — 별도 스크롤 로직 없음.
function AlphabetIndex({ availableLetters }) {
    return (
        <nav className="alphabet-index" aria-label="알파벳 인덱스">
            {ALPHABET.map((letter) => {
                const isAvailable = availableLetters.has(letter);
                return isAvailable ? (
                    <a key={letter} href={`#letter-${letter}`} className="alphabet-index-letter">
                        {letter}
                    </a>
                ) : (
                    <span
                        key={letter}
                        className="alphabet-index-letter alphabet-index-letter--disabled"
                        aria-hidden="true"
                    >
                        {letter}
                    </span>
                );
            })}
        </nav>
    );
}

export default AlphabetIndex;
