/**
 * 타임라인 프론트엔드.
 *
 * **DOM 조작은 전부 이 파일에 모은다** (CLAUDE.md 코드 컨벤션).
 * mock.js는 이벤트를 만들 뿐 화면을 모르고, 화면은 여기서만 바뀐다.
 *
 * 현재 범위: 진입 화면(① idle)의 동작.
 * SSE 이벤트 수신과 stage 분기는 8-3(#71)에서 이 파일에 이어 붙인다.
 */
(function () {
  "use strict";

  const form = document.getElementById("topic-form");
  const input = document.getElementById("topic-input");
  const examples = document.getElementById("starter");

  /**
   * 예시 주제 칩 → 입력창을 채운다.
   *
   * 칩마다 리스너를 다는 대신 상위에서 한 번 받는다(이벤트 위임).
   * 칩은 나중에 늘거나 줄 수 있고, `empty` 화면(8-7)도 같은 모양의 제안 칩을
   * 동적으로 만들어 붙일 예정이라 그때 리스너를 다시 달지 않아도 된다.
   */
  examples.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (chip === null) return;

    input.value = chip.dataset.topic;
    input.focus();
  });

  form.addEventListener("submit", (event) => {
    // 기본 동작(페이지 이동)을 막는다. 이 서비스는 한 페이지에서 상태만 바뀐다.
    event.preventDefault();

    const topic = input.value.trim();
    if (topic === "") return;

    // 실행 연결은 8-3(#71). 여기서는 진입 화면의 동작까지만 만든다.
  });
})();
