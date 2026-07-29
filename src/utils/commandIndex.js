// 카테고리 전체 목록을 알파벳순으로 브라우징하는 "사전식 인덱스" 기능(#36)에서 쓰는 유틸.
// git 명령어는 name에 "git " 접두사가 그대로 들어있어(예: "git commit"), 접두사를 떼지 않고
// 정렬하면 21개 전부 "G" 밑에 몰리므로, 정렬/그룹핑 기준은 항상 접두사를 뗀 이름을 쓴다.
const GIT_PREFIX = 'git ';

export function getSortName(command) {
    return command.category === 'git' && command.name.startsWith(GIT_PREFIX)
        ? command.name.slice(GIT_PREFIX.length)
        : command.name;
}

// 정렬 기준 이름의 첫 글자를 대문자 인덱스 키로. 알파벳이 아닌 문자로 시작하는 이름은
// 지금 데이터셋(unix/git 명령어)엔 없지만, 방어적으로 대문자로만 변환해 그대로 키로 쓴다.
export function getIndexLetter(command) {
    return getSortName(command).charAt(0).toUpperCase();
}

// commands를 첫 글자 기준으로 먼저 그룹핑(reduce)한 뒤, 그룹 키와 그룹 내부를 각각 정렬한다.
// 이전엔 "전체를 먼저 정렬해두면 같은 글자가 이웃해 있다"는 전제로 순회하며 묶었는데,
// 그 전제(정렬이 그룹핑보다 먼저 일어나야 함)가 코드에 안 보이게 숨어있어서 안전하지 않았다.
// reduce로 먼저 묶으면 입력 순서와 무관하게 항상 올바르게 그룹핑되고, 정렬은 그 다음
// 각자의 역할(그룹 순서/그룹 내부 순서)에만 집중한다.
// 결과: [{ letter: 'C', commands: [...] }, ...] — 항목이 없는 글자는 그룹 자체가 생기지 않는다
// (인덱스 바에서 해당 글자를 비활성화하는 것과 짝을 이루는 설계 — 없는 섹션을 만들 필요가 없음).
export function groupCommandsByLetter(commands) {
    const byLetter = commands.reduce((groups, command) => {
        const letter = getIndexLetter(command);
        const group = groups.get(letter) ?? [];
        group.push(command);
        groups.set(letter, group);
        return groups;
    }, new Map());

    return [...byLetter.entries()]
        .sort(([letterA], [letterB]) => letterA.localeCompare(letterB))
        .map(([letter, group]) => ({
            letter,
            commands: group.sort((a, b) => getSortName(a).localeCompare(getSortName(b))),
        }));
}
