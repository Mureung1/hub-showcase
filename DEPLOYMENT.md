# UniRadar Deployment Foundation

현재 저장소는 외부에 공개하지 않는 것이 기본값이다. 개발 서버와 API 서버는 `127.0.0.1`에만 바인딩되며, `SERVE_CLIENT=false`이면 Express는 Vite 빌드를 제공하지 않는다.

## Prepared Structure

- Vite가 `dist` production 빌드를 생성한다.
- Express가 `SERVE_CLIENT=true`일 때 `dist`와 `/api/*`를 한 포트에서 제공한다.
- `ALLOWED_ORIGINS`에 등록된 브라우저 출처만 API를 호출할 수 있다.
- 기본 보안 헤더와 `/api/analyze` IP 단위 요청 제한을 적용한다.
- Dockerfile은 frontend build와 production server를 하나의 이미지로 만든다.
- API 키는 이미지에 포함하지 않고 배포 환경의 secret으로 전달한다.

## Local Production Test

외부에 공개하지 않고 단일 포트 production 구조만 확인하려면 PowerShell에서 실행한다.

```powershell
npm run build
$env:NODE_ENV="production"
$env:HOST="127.0.0.1"
$env:PORT="4173"
$env:SERVE_CLIENT="true"
$env:PUBLIC_URL="http://127.0.0.1:4173"
$env:ALLOWED_ORIGINS="http://127.0.0.1:4173"
npm start
```

확인 주소:

- 앱: `http://127.0.0.1:4173/`
- health: `http://127.0.0.1:4173/api/health`

PowerShell 창을 닫으면 테스트 서버도 종료된다. 위 설정은 `127.0.0.1`만 사용하므로 같은 컴퓨터 밖에서는 접근할 수 없다.

## Future Hosting Environment

실제 호스팅 플랫폼에서는 다음 값을 secret 또는 runtime environment로 설정한다.

```text
NODE_ENV=production
HOST=0.0.0.0
PORT=3001
SERVE_CLIENT=true
PUBLIC_URL=https://서비스도메인
ALLOWED_ORIGINS=https://서비스도메인
TRUST_PROXY=true
ANALYZE_RATE_LIMIT_ENABLED=true
ANALYZE_RATE_LIMIT_MAX=10
ANALYZE_RATE_LIMIT_WINDOW_MS=60000
```

`PORT`와 `TRUST_PROXY`는 호스팅 플랫폼 규칙에 맞게 조정한다. API 키는 `.env` 파일을 이미지에 복사하지 말고 플랫폼의 secret 저장소에서 주입한다.

## Docker

이미지만 만들고 로컬에서 확인할 수 있다. 실제 registry push나 배포는 아직 수행하지 않는다.

```powershell
docker build -t uniradar-local .
docker run --rm -p 127.0.0.1:4173:3001 --env-file .env uniradar-local
```

`.env`에는 비밀키가 들어갈 수 있으므로 Docker image와 Git에 포함하지 않는다.

## Domain Candidates

브랜드 유지와 용도 전달을 기준으로 한 후보:

1. `uniradar.kr` - 국내 대학생 대상 서비스라는 인상이 가장 명확함
2. `tryuniradar.com` - 제품 이름을 유지하면서 초기 서비스에 자연스러움
3. `uniradar.app` - 웹 애플리케이션 성격이 명확함
4. `uniradarapp.com` - `.com`을 유지하고 싶은 경우 이해하기 쉬움
5. `uniradarhub.com` - 장학금·공모전·지원사업을 모으는 허브 성격을 강조함

도메인 등록 상태는 실시간으로 바뀐다. 결제 직전 `.com`과 `.app`은 ICANN Lookup, `.kr`은 KISA WHOIS 또는 등록 대행사에서 다시 확인한다.

## Public Launch Blockers

현재는 아래 항목이 없으므로 인터넷에 공개하지 않는다.

- 로그인과 사용자별 권한
- 사용자별 Gemini 사용량 제한과 비용 상한
- 영구 저장소 기반 rate limit
- 개인정보 처리방침과 이용약관
- 운영 로그, 오류 모니터링과 알림
- 백업과 데이터 삭제 정책
- HTTPS와 실제 도메인 설정 검증

현재 IP rate limit은 단일 서버 메모리에만 저장된다. 여러 서버 인스턴스를 사용할 때는 Redis 같은 공유 저장소 기반 제한으로 교체해야 한다.
