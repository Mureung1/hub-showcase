# Asset Generation Workflow

## 키워드

- reference image
- prompt
- negative prompt
- transparent background
- sprite sheet
- desktop wallpaper
- icon kit
- reward object sheet
- visual FX sheet
- public assets
- image-rendering: pixelated

## 왜 공부하나

ChatGPT로 이미지를 생성해도 웹에서 쓰려면 파일명, 위치, 투명 배경, 크기, CSS 적용 규칙이 맞아야 한다.

## 폴더 위치

- docs/design-references
- docs/asset-prompts
- public/assets
- public/assets/background
- public/assets/lumi-manager.png

## 생성 순서

1. docs/design-references에 기준 이미지 저장
2. docs/asset-prompts에서 프롬프트 선택
3. ChatGPT 이미지 생성
4. 결과물을 public/assets 아래로 저장
5. HTML/CSS/React에서 상대 경로로 연결
6. 작은 크기에서 식별 가능한지 확인

## 에셋별 저장 기준

- 배경: public/assets/background/background.png
- 매니저: public/assets/lumi-manager.png
- 아이콘: public/assets/icons
- 보상: public/assets/rewards
- FX: public/assets/fx

## ChatGPT 질문 예시

- 이 프롬프트를 Windows XP 픽셀 배경 생성용으로 더 구체화해줘.
- 투명 배경 캐릭터 스프라이트를 만들려면 프롬프트에 무엇을 넣어야 해?
- 생성한 PNG를 React/Vite 프로젝트에서 관리하는 폴더 구조를 추천해줘.
