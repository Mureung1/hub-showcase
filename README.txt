덮어쓰기 방법

1. ZIP 압축을 프로젝트 최상위 폴더에 풉니다.
2. 같은 이름의 기존 파일을 덮어씁니다.

포함 파일
- server.ts
- src/components/OutfitsTab.tsx
- src/components/DynamicPixelCharacter.tsx

변경 사항
- 다시 추천 시 직전 상품 ID를 서버에서 실제로 제외합니다.
- Gemini가 같은 ID를 반환해도 서버가 다른 상품으로 강제 교체합니다.
- 로컬 추천도 상위 5개 후보 중 무작위 선택합니다.
- 대체 상품이 존재하는 모든 카테고리는 직전 상품과 달라집니다.
- 캐릭터가 이전과 동일하면 다시 랜덤 생성하고 key를 바꿔 새로 렌더링합니다.
