# DESIGN.md

## 규칙의 위치

디자인 규칙(색·타이포그래피·간격·radius·카드/버튼/입력창 스타일)은 스킬로 관리한다. **실제 토큰과 컴포넌트 규칙은 아래 파일이 유일한 기준(single source of truth)이며, 이 문서에는 값을 중복 기록하지 않는다.**

→ `.claude/skills/briefy-ui/SKILL.md`

색상·간격 등을 변경할 때는 스킬 파일만 수정한다.

## 디자인 방향

- **컨셉**: 레드 스포츠카에서 추출한 고광택 오토모티브 톤 — 속도감, 정밀함, 대비
- **기본 원칙**: 밝은 메탈릭 배경(쿨 그레이) 위에 라이트 카드. 레드는 전면이 아니라 포인트로만 사용
- **Briefy 적용 매핑**:
  - 레드(primary) → 입력창 전송 버튼, D-day 임박 뱃지, 마감 강조, 선택 상태
  - 다크 서피스(차콜) → 브리핑 헤더 영역 정도로 제한
  - 일반 브리핑 카드(일정/루틴/식단/메모) → 라이트 카드 + 그레이 메타데이터 칩
- **타이포**: Inter + Pretendard, 주요 타이틀은 heavy weight, 보조 텍스트는 muted gray

## 레퍼런스

- 원본 레퍼런스: 레드 스포츠카 이미지 <!-- TODO: Pinterest/캡처 링크 붙이기 -->
- 톤 추출 → 껍데기 제작 → 다듬기 과정을 거쳐 스킬로 확정 (2026-07)

## 와이어프레임 (레이아웃 기준)

화면 구조는 로우파이 와이어프레임을 따른다. 스킬은 톤(색·스타일)을, 와이어프레임은 레이아웃(배치·구성)을 담당한다.

| 화면 | 파일 |
| --- | --- |
| S1 브리핑 홈 | `docs/wireframes/S1-briefing-home.png` |
| S2-b 확인 카드 | `docs/wireframes/S2b-confirm-card.png` |
| S2-c 되묻기 선택지 | `docs/wireframes/S2c-clarify-options.png` |
| S3 조회 결과 | `docs/wireframes/S3-query-result.png` |

원본 편집: [Figma — Briefy Wireframes](https://www.figma.com/design/H4hlQh64gK4kV5avrwgOpB)

## 이력

- 2026-07: 초기 디자인 방향 확정 (briefy-ui 스킬 v1)