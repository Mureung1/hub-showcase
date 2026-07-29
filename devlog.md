# 개발 일지

세션 중 발견한 트러블슈팅·기술적 결정 기록. 배포 준비 자체의 체크리스트는 [checklist.md](checklist.md) 참고 — 여기는 "왜 이렇게 했는지"와 "다음에 또 마주칠 수 있는 문제"만 남긴다.

## 2026-07-28 (화)

### 서비스 첫 배포 (Vercel + Render)

- **FE**: `https://hub-pyo3.vercel.app`, **BE**: `https://hub-20ox.onrender.com`, 배포 브랜치는 `main`이 아니라 `N179_표정한`
- FE↔BE 연결은 Vercel Rewrite 대신 **직접 요청 + CORS** 방식 (`VITE_API_BASE_URL` + `ALLOWED_ORIGIN`)

**막혔던 것들과 해결:**
- Vercel에서 저장소 선택 시 원본 조직 저장소(private)를 잘못 골라 Pro 요금제를 요구함 → 본인 포크(`pyojung/hub`)로 다시 선택
- Vercel 빌드가 `vite: command not found`로 실패 → Install/Build/Output Command가 placeholder 상태로 비어있었음, 명시적으로 채워야 함
- Vercel 배포가 "GitHub could not associate the committer with a GitHub user"로 차단 → 커밋 작성자 이메일이 GitHub 계정에 **비공개**로 등록되어 있으면 발생. 로컬 git 커밋 이메일을 GitHub 제공 noreply 주소(`{userId}+{username}@users.noreply.github.com`)로 바꾸면 확실히 해결됨 (이메일을 public으로 바꾸는 것보다 안전)
- React Router 경로(`/home` 등)를 새로고침하면 Vercel이 404 반환 → SPA는 모든 경로를 `index.html`로 돌리는 `vercel.json` rewrite가 필요
- 배포 후 다른 사람이 접속하면 로그인 요구 → Vercel **Deployment Protection**의 "Vercel Authentication(Require Log In)"이 기본으로 켜져 있었음, 대시보드에서 꺼야 공개됨
- Render 무료 플랜은 일정 시간 요청 없으면 서버가 잠들고, 깨어날 때 최대 50초+ 지연됨 → 데모/시연 직전엔 미리 접속해서 깨워두기

**아직 안 한 것:** GitHub Actions 기반 CI(lint/build/test 자동검사)는 이번 주 범위에 없어서 구축 안 함. Docker/GHCR 배포도 안 함(불필요).

### 레시피 추가/수정

- **초간단 우동**(`gan-udon`): 유튜브 자동생성 자막(스크립트 패널)에서 재료·조리순서를 추출해 반영. 자막 없는 영상도 있고("자막 사용 불가" 표시), 있어도 패널이 안 열리는 경우가 있어서 재생하면서 스크롤 캡처로 수동 추출함
- **강레오 닭가슴살 스테이크**: 기존에 있던 재료(마늘 포함)가 실제 영상과 안 맞아서 설명란 기준으로 정정. "몇 분 굽는다"가 아니라 색 변화로 뒤집는 타입의 레시피라 조리순서는 대략적으로만 기록
- 레시피별 커스텀 `tip` 필드 추가 — Supabase `recipes` 테이블에 `tip` 컬럼(text, nullable) 신설 필요 (`ALTER TABLE recipes ADD COLUMN tip text;`), `server/routes/recipes.js`·`scripts/seedRecipes.js`·`RecipeDetailPage.jsx` 매핑 추가

### 냉장고 재료 매칭 버그

- `src/data/fridgeIngredients.js`는 재료명이 `matchNames` 배열에 **정확히 일치**해야 매칭됨(대소문자·괄호 하나도 안 봐줌) — `getRecipesByOwnedIngredients`가 `matchNames.includes(ingredient.name)`으로 정확 문자열 비교를 함
- 그래서 레시피에 새 재료를 넣을 때마다 `fridgeIngredients.js`에 해당 칩(또는 별칭)이 있는지 항상 확인해야 함. 이번에 멸치·유부·버터·허브·쯔유·미림·미원·오코노미야끼소스·김가루 칩 추가, 올리브오일/백후추처럼 표기만 다른 건 기존 칩에 별칭 추가
- **실제로 걸렸던 버그**: 재료명에 `닭가슴살(껍질 포함)`처럼 설명을 괄호로 붙였더니 `닭가슴살` 칩과 매칭이 깨짐 → 이름은 순수하게 두고 설명은 `amount` 필드로 옮길 것

### 모바일 반응형 버그 3종

1. **헤더 검색 버튼**: 모바일에서 데스크톱과 같은 넓은 텍스트 pill을 그대로 써서 화면 우측에 어색하게 큼직 → `sm:` 기준으로 모바일은 아이콘만, 데스크톱은 텍스트+아이콘
2. **홈 화면 스크롤 시 카드 배지가 헤더 위로 삐져나옴**: `sticky` 헤더와 `MenuCard`의 찜하기 배지가 둘 다 `z-10`이라 DOM 순서상 나중에 나오는 카드가 헤더를 덮어씀 → 헤더 wrapper를 `z-20`으로 올림
3. **레시피 상세 제목이 찜하기 버튼과 겹침**: 제목+메타정보가 `text-center`로 가운데 정렬되는데 찜하기 버튼은 `absolute right-0`이라, 제목이 길면 버튼 영역까지 침범 → 제목 컨테이너에 `px-10` 추가해서 버튼 자리 확보

### 이미지 에셋 관련 팁

- **PIL의 `Image.getbbox()`는 RGBA 이미지에서 부정확할 수 있음** — 완전 투명 픽셀도 RGB 값이 0이 아니면 "non-zero"로 잡혀서 bbox가 실제 그림보다 훨씬 크게 나올 수 있다. **알파 채널만 따로 분리해서(`im.split()[-1]`) numpy로 정확히 threshold 확인**해야 진짜 그림 영역을 찾을 수 있음 (마스코트 이미지에서 이걸로 한 번 잘못 잘랐다가 다시 잘라냄)
- 마스코트 이미지(`src/assets/마스코트-끼니.png`)는 원래 1024x1024 캔버스에 실제 그림이 좌측 32%·하단 23%만큼 투명 여백을 두고 치우쳐 있었음 → 여백 잘라내고 균일한 12px 패딩만 남겨서 재저장. 이후 CSS에서 임시방편(negative margin 등)으로 맞추던 코드도 제거함
- 헤더 크기는 모바일/데스크톱을 반응형으로 분리(`sm:` 접두사)하는 게 맞음 — 한 쪽에 맞추면 다른 쪽이 깨짐

## 2026-07-29 (수) — 작업 과정 기록 (오류 → Agent 요청 → 검토·적용 → 성공 확인)

목요일 워크플로우 정리용 기록. 화요일 배포 트러블슈팅 6건 + 수요일 검증 작업을 이 형식으로 정리.

**1. Vercel 저장소 선택 오류**
- 오류: Vercel New Project에서 원본 조직 저장소(private)가 잡혀 Pro 요금제 결제를 요구함
- 요청: "배포는 됐는데 링크 들어가니 로그인하라고 뜬다" 등 화면 캡처를 보여주며 원인 확인 요청
- 검토·적용: Agent가 스크린샷에서 "Importing from GitHub: connect-AIAgentChallenge-26-1/hub"를 보고 원본 조직 저장소가 선택된 것을 지적 → 본인 포크(`pyojung/hub`)로 다시 선택
- 성공 확인: Hobby 요금제로 그대로 진행 가능해짐(결제 요구 사라짐)

**2. Vercel 빌드 실패 (`vite: command not found`)**
- 오류: 빌드 로그에 `sh: line 1: vite: command not found`, exit code 127
- 요청: 빌드 로그 캡처 전달
- 검토·적용: Agent가 로그에서 install 단계 자체가 없었던 것을 지적, Install/Build/Output Command를 placeholder가 아니라 명시적으로 채우도록 안내
- 성공 확인: 재배포 로그에서 "added N packages" install 단계가 실제로 실행되고 빌드 성공(Ready)

**3. 커밋 작성자 GitHub 미인식**
- 오류: "The Deployment was blocked because GitHub could not associate the committer with a GitHub user"
- 요청: 에러 메시지 그대로 전달, "이거 왜 이래?"
- 검토·적용: Agent가 커밋 이메일이 GitHub 계정에 비공개(Private) 등록된 게 원인이라고 판단 → 이메일 인증(Verified) 확인까지 했지만 재시도해도 계속 막힘 → GitHub 제공 noreply 주소로 커밋 이메일을 바꾸고 새 커밋 생성
- 성공 확인: 같은 커밋으로 재시도 시 차단 없이 정상 빌드·배포됨

**4. SPA 라우팅 새로고침 시 404**
- 오류: 배포된 사이트에서 `/home` 등 React Router 경로를 직접 열거나 새로고침하면 Vercel이 404 반환
- 요청: "레시피 검색이 자리를 차지해서 이상하게 보이더라" 확인 중 발견 → 직접 재현해서 보고
- 검토·적용: Agent가 Vercel이 SPA 클라이언트 라우팅을 모르고 파일을 못 찾는 문제로 진단, 모든 경로를 `index.html`로 돌리는 `vercel.json` rewrite 추가
- 성공 확인: `/home` 직접 접속 시 404 없이 정상 렌더링 확인

**5. 배포 사이트 접속 시 로그인 요구**
- 오류: 다른 사람이 배포 링크로 들어가면 Vercel 로그인을 요구함
- 요청: "저 링크로 다른 사람이 들어가보니까 로그인하라고 뜨는데 그럼 배포가 안된거아냐?"
- 검토·적용: Agent가 Deployment Protection의 "Vercel Authentication(Require Log In)"이 기본으로 켜져 있는 것을 확인, 껐음(확인 문구 입력은 안전장치로 막혀서 최종 실행은 직접 함)
- 성공 확인: 로그인 없이 배포 주소 접속 가능해짐

**6. 냉장고 재료 매칭 안 됨**
- 오류: 새로 추가한 재료(닭가슴살(껍질 포함) 등)가 냉장고에서 체크해도 "없는 재료"로 표시됨
- 요청: "그 레시피 고치면 거기에 맞는 재료도 자동으로 냉장고에서 선택할 수 있게 해야될거 같은데?"
- 검토·적용: Agent가 `getRecipesByOwnedIngredients`의 정확 문자열 비교 로직을 확인, 냉장고에 없는 재료 칩 9개 추가 + 이름에 붙은 부가설명(`(껍질 포함)`)을 `amount` 필드로 이동
- 성공 확인: 냉장고에서 체크한 재료가 레시피 상세의 "있는 재료"로 정확히 표시됨

**7. 배포 환경 엣지 케이스 검증 (수요일, 오늘)**
- 오류: 없음(사전 점검 목적) — 다만 검증 중 찜하기가 새로고침 후 사라지는 것처럼 보이는 현상 발견
- 요청: 없음, Agent가 미션 문서 기준으로 자체 점검(빈 데이터/잘못된 입력/서버 오류 화면/새로고침 유지)
- 검토·적용: 찜하기 현상은 Agent의 자동화 클릭(accessibility ref 기반)이 실제 버튼을 정확히 못 눌러서 생긴 테스트 오류였음을 좌표 클릭으로 재현해 확인 — 앱 코드 자체는 문제없음으로 결론
- 성공 확인: 재료 0개 선택 시 경고창, 잘못된 레시피 URL 시 안내 화면, 냉장고 선택·찜하기 새로고침 유지, 네이버 검색 실패 시 대체 링크 안내까지 전부 정상 동작 확인
