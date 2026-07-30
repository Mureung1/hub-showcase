# 데이터 흐름과 기술 구조 영상 컷

사용자가 제공한 데이터 흐름 이미지를 중심으로 구성한 1920×1080 정지 이미지다.

## 결과물

- Figma: [04 · Data Flow](https://www.figma.com/design/D2Zlcjyy5ThP80AU0YqVAx?node-id=36-20)
- 최종 영상: [`n091-park-changhyun-project-introduction.mp4`](../../project-introduction-video/n091-park-changhyun-project-introduction.mp4)

## 표현 내용

- React 화면과 Express 서버 사이의 재료 요청·응답
- Express와 Supabase 사이의 재료 CRUD 및 보유 재료 조회
- 추천 결과 캐시 조회·저장
- Express와 Gemini 사이의 레시피 생성 요청·결과

원본 이미지의 상·하단 여백은 Figma 이미지 프레임에서 자연스럽게 잘라 다이어그램 글자 크기를 확보했다. 원본 내용과 비율은 유지했다.

## 영상 적용

전체 컷을 먼저 보여준 뒤 CapCut에서 화면을 확대하거나 설명 요소를 올려 다음 순서로 안내한다.

1. React에서 사용자 요청 발생
2. Express에서 API와 추천 정책 처리
3. Supabase에서 재료 및 추천 캐시 조회
4. Gemini에서 레시피 생성
5. 검증된 결과를 React 화면으로 반환
