export function isMeaningfulQuery(query) {
    return /[a-z가-힣]/i.test(query);
}
