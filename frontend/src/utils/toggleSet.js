// Set 에 든 id 를 켜고 끈다.
// 펼침/접힘 상태를 2단계와 결과 화면 양쪽에서 같은 방식으로 다룬다.
export function toggleInSet(setState, id) {
  setState((prev) => {
    const next = new Set(prev);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  });
}
