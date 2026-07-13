# 알바노트 보안 규칙

## 1. 기본 원칙

알바노트는 Supabase Auth, Supabase Postgres, Express API를 사용하므로 API Key와 환경 변수 관리가 중요하다. 개발 중 생성되는 민감정보는 GitHub에 올라가지 않도록 관리한다.

## 2. GitHub에 올리면 안 되는 것

다음 파일과 값은 GitHub에 커밋하지 않는다.

- 실제 `.env` 파일
- `.env.local`, `.env.development`, `.env.production` 등 실제 환경 변수 파일
- Supabase URL과 실제 API Key
- Supabase Service Role Key
- JWT Secret
- DB 비밀번호
- 개인 인증서, private key, `.pem`, `.key` 파일
- 로컬 테스트용 계정 비밀번호
- 외부 서비스 토큰
- 운영 환경 설정값

## 3. GitHub에 올려도 되는 것

다음 파일은 예시 용도로만 관리할 수 있다.

- `.env.example`
- 문서화된 환경 변수 이름
- 실제 값이 비어 있거나 더미 값인 설정 예시

`.env.example`에는 실제 키를 넣지 않는다.

## 4. .gitignore 관리 규칙

민감정보가 들어갈 가능성이 있는 새 파일이나 폴더를 만들 때는 먼저 `.gitignore`에 제외 규칙을 추가한다.

예시:

```txt
.env
.env.*
!.env.example
*.pem
*.key
secrets/
```

새로운 외부 서비스 연동으로 API Key, token, secret 파일이 생기면 구현 전에 `.gitignore`에 해당 파일 패턴을 추가한다.

## 5. 환경 변수 작성 규칙

Frontend와 Backend는 환경 변수 노출 범위가 다르다.

### Frontend

- Vite에서 사용하는 공개 환경 변수만 `VITE_` 접두사를 붙인다.
- 브라우저에 노출되면 안 되는 값은 절대 `VITE_` 변수로 만들지 않는다.
- Supabase anon key처럼 공개 클라이언트에서 사용할 수 있는 값만 넣는다.

### Backend

- Service Role Key, DB 비밀번호, JWT Secret 같은 민감정보는 Backend 환경 변수에만 둔다.
- Backend 코드에서는 환경 변수를 `common/config` 같은 공통 설정 모듈에서만 읽는다.
- 기능 코드에서 `process.env`를 직접 반복해서 사용하지 않는다.

## 6. Supabase Key 기준

- `SUPABASE_ANON_KEY`: Frontend에서 사용할 수 있지만 권한은 RLS로 제한해야 한다.
- `SUPABASE_SERVICE_ROLE_KEY`: Backend 전용이다. Frontend 코드, 문서 예시, 브라우저 환경 변수에 넣지 않는다.
- Supabase RLS(Row Level Security)를 기준으로 사용자별 데이터 접근을 제한한다.

## 7. 커밋 전 확인

커밋 전 다음을 확인한다.

- 실제 `.env` 파일이 포함되지 않았는가
- API Key나 Secret이 코드에 하드코딩되지 않았는가
- `.env.example`에 실제 값이 들어가지 않았는가
- 새로 만든 민감 파일 패턴이 `.gitignore`에 반영되었는가
- 로그나 테스트 데이터에 개인정보가 들어가지 않았는가

## 8. 실수로 Secret을 커밋한 경우

실제 Secret이 커밋되었다면 파일 삭제만으로 끝내지 않는다.

1. 노출된 Key를 즉시 폐기하거나 재발급한다.
2. Git 히스토리에서 제거가 필요한지 확인한다.
3. 관련 환경 변수와 배포 설정을 새 값으로 교체한다.
4. 같은 유형의 파일이 다시 올라가지 않도록 `.gitignore`를 보강한다.
