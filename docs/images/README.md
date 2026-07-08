# 기획서 이미지 (화면 목업 스크린샷)

`docs/plan.md`의 **화면 설계 (UI 목업)** 섹션은 이 폴더의 PNG를 임베드한다.
목업 소스는 [`../../mockups/`](../../mockups/)의 자가완결형 HTML이다.

## 필요한 파일

| 파일명 | 목업 소스 | 권장 캡처 폭 |
|--------|-----------|-------------|
| `discord-alert.png` | `mockups/discord-alert.html` | 약 700px |
| `ai-review.png` | `mockups/ai-review.html` | 약 820px |
| `journal.png` | `mockups/journal.html` | 약 1000px |

## 캡처 방법

1. 목업 HTML을 브라우저에서 연다 (둘 중 편한 방법).
   - **직접 열기**: `mockups/discord-alert.html` 파일을 더블클릭 (자가완결형이라 서버 불필요).
   - **dev 서버**: `npm run dev` 후 `http://localhost:5173/mockups/discord-alert.html` 접속.
2. 브라우저 창 폭을 위 권장 폭에 맞추고, 콘텐츠 영역을 캡처한다.
   - 여백까지 깔끔히 담으려면 개발자도구(F12) → 요소 선택 → "노드 스크린샷" 기능을 써도 좋다.
3. 위 표의 파일명 그대로 이 폴더(`docs/images/`)에 저장한다.
4. 저장하면 `docs/plan.md`의 임베드가 자동으로 렌더링된다 (GitHub/에디터에서 확인).

> 라이트/다크 중 라이트 모드 기준으로 디자인돼 있다. 다크로 캡처하려면 OS/브라우저 테마를 바꾼 뒤 캡처하면 된다(목업이 시스템 테마를 따른다).
