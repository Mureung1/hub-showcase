# Chrome 확장 빌드와 설치

Chrome 확장은 개발·검수용 폴더와 배포용 ZIP을 같은 소스에서 만든다. ZIP을 만들기 전에 수동으로 파일을 복사하지 않는다.

## 공개 환경 설정

저장소 루트의 `.env.local`에 다음 공개 설정을 넣는다. Supabase publishable key는 브라우저에 공개할 수 있는 키만 사용하며 service role 또는 secret key를 넣지 않는다.

```dotenv
VITE_EXTENSION_API_ORIGIN=https://아맞다-API-주소
VITE_SUPABASE_URL=https://프로젝트.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_공개키
```

환경 파일이 없으면 빌드 검증을 위해 API `http://localhost:3001`, Supabase `http://127.0.0.1:54321`과 비밀이 아닌 placeholder 공개 키를 사용한다. 이 기본 ZIP은 빌드 구조 확인용이다. 로컬 Supabase에서 실제 로그인과 저장을 확인하려면 `.env.local`에 로컬 프로젝트의 실제 공개 키를 넣어 다시 빌드한다.

셸이나 CI에 같은 이름의 환경 변수가 있으면 `.env.local`보다 우선한다. 운영 확장은 다음처럼 안정 API 주소를 주입해 만든다.

```powershell
$env:VITE_EXTENSION_API_ORIGIN='https://hub-ppre1udes-projects.vercel.app'
npm run package:extension
```

## 개발용 폴더 설치

```bash
npm run build:extension
```

1. Chrome에서 `chrome://extensions`를 연다.
2. 오른쪽 위 `개발자 모드`를 켠다.
3. `압축해제된 확장 프로그램을 로드합니다`를 누른다.
4. `dist/chrome-extension/` 폴더를 선택한다.

코드를 바꾼 뒤에는 같은 명령으로 다시 빌드하고 확장 카드의 새로고침 버튼을 누른다.

## Google 로그인 허용 URL

확장을 설치한 뒤 확장 서비스 워커 검사 화면에서 다음 값을 확인한다.

```js
chrome.identity.getRedirectURL('auth');
```

출력되는 `https://<확장-ID>.chromiumapp.org/auth` 주소를 Supabase Dashboard의 Authentication URL Configuration에 Redirect URL로 등록한다. 로컬 압축 해제 설치와 운영 배포의 확장 ID가 다르면 각각 등록한다.

## 배포용 ZIP

```bash
npm run package:extension
```

명령은 확장을 다시 빌드한 뒤 다음 파일을 만든다.

```text
release/amadda-chrome-extension.zip
```

ZIP 최상단에는 `manifest.json`, `background.js`, `memo.html`, 자산 폴더가 바로 들어간다. Chrome Web Store에는 이 ZIP을 업로드한다. 로컬 Chrome 검수에서는 ZIP을 직접 선택하지 않고, 위의 `dist/chrome-extension/` 폴더를 압축 해제 방식으로 불러온다.
