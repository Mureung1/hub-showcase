# QA.md

> IRIS 로컬 검증, 운영 smoke test, 데모 전 확인 절차를 정리한 문서입니다.

---

# 1. Local Admin API Integration

## Test Data

Verified date:

- 2026-07-23

Discord:

- guildId: `1524226987332206632`
- notification channel: `공지알림`
- note: MVP는 카테고리별 채널을 나누지 않고 하나의 공통 알림 채널을 사용한다.

Notice site:

- siteName: `경북대학교 컴퓨터학부`
- url: `https://computer.knu.ac.kr/bbs/board.php?bo_table=sub6_1_a&lang=kor`

Selectors:

- listSelector: `.basic_tbl_head tbody > tr`
- titleSelector: `.bo_tit a`
- linkSelector: `.bo_tit a`
- dateSelector: `.td_datetime`
- categorySelector: `.bo_cate_link`
- categoryListSelector: `#bo_cate_ul a`

Expected result:

- 테스트 크롤링 성공
- 최근 공지 preview 1개 이상 표시
- 감지 카테고리 1개 이상 표시
- Discord 채널 목록 조회 성공
- 공통 알림 채널 1개 선택 후 모든 카테고리에 같은 `channelId` 저장
- 설정 저장 후 새로고침 시 기존 설정 조회 성공
- 기존 설정에서 카테고리만 수정하면 `PATCH /notice-config/categories` 호출
- 사이트 정보 또는 selector 재테스트 후 저장하면 `PUT /notice-config` 호출
- 설정 삭제 UI로 삭제하면 사이트 등록 단계로 복귀

Notes:

- 외부 사이트 DOM이 바뀌면 selector가 깨질 수 있다.
- 테스트 전 기존 설정이 있으면 DELETE API로 초기화한다.

---

# 2. Local Manual Test

MySQL 실행 여부 확인:

```bash
docker ps
```

MySQL이 실행 중이 아니면 로컬 MySQL 시작:

```bash
docker compose up -d
```

Backend 개발 서버 시작:

```bash
cd backend
npm run dev
```

다른 터미널에서 Frontend 개발 서버 시작:

```bash
cd frontend
npm run dev
```

Backend health 확인:

```bash
curl -s "http://localhost:3000/api/health" | jq
```

테스트 guild의 Discord 채널 확인:

```bash
curl -s "http://localhost:3000/api/admin/1524226987332206632/discord/channels" | jq
```

새 테스트 전 기존 공지 설정 초기화:

```bash
curl -s -X DELETE "http://localhost:3000/api/admin/1524226987332206632/notice-config" | jq
```

저장된 공지 설정 확인:

```bash
curl -s "http://localhost:3000/api/admin/1524226987332206632/notice-config" | jq
```

공지 scheduler 1회 실행:

```bash
cd backend
npm run scheduler:notice:run-once:dev
```

- 첫 수집이면 공지를 저장만 하고 Discord 알림은 보내지 않는다.
- 이후 실행에서는 새로 저장된 공지만 공통 알림 채널의 역할 mention과 키워드 DM 대상이 된다.

관리자 페이지:

```text
http://localhost:5173/admin/1524226987332206632
```

브라우저 수동 확인 목록:

- 빈 입력으로 테스트 크롤링을 실행하면 입력 안내 메시지가 표시된다.
- 테스트 크롤링 전 `카테고리 설정` 탭을 클릭하면 이동 제한 안내가 표시된다.
- 테스트 크롤링 성공 후 최근 공지는 `YYYY.MM.DD · 공지 바로가기` 형식으로 표시된다.
- 신규 설정 저장은 `POST /api/admin/{guildId}/notice-config`를 호출한다.
- 새로고침 후 기존 설정이 있으면 카테고리 설정 단계로 진입한다.
- 기존 설정에서 카테고리만 수정하면 `PATCH /api/admin/{guildId}/notice-config/categories`를 호출한다.
- 사이트 정보 또는 selector를 수정하고 테스트 크롤링을 다시 실행한 뒤 저장하면 `PUT /api/admin/{guildId}/notice-config`를 호출한다.
- 사이드바의 설정 삭제 UI로 삭제하면 `DELETE /api/admin/{guildId}/notice-config`를 호출하고 사이트 등록 단계로 복귀한다.

---

# 3. Production Smoke Test

배포 후 실제 Discord와 관리자 페이지 흐름은 필요할 때 수동으로 확인한다.

이 확인은 운영 DB와 Discord 서버에 테스트 데이터가 생길 수 있으므로 테스트 서버에서 진행하고, 끝난 뒤 관리자 페이지의 설정 삭제로 정리한다.

확인 순서:

1. Frontend landing 접속
2. Discord `/setup` 실행
3. 관리자 페이지 링크 접속
4. 경북대학교 컴퓨터학부 selector로 테스트 크롤링
5. 공통 알림 채널과 카테고리 역할 저장
6. `/guide` 안내 확인
7. `/subscribe` 구독과 역할 부여 확인
8. `/keyword` 키워드 추가, 삭제 확인
9. Scheduler run-once 실행
10. 공통 알림 채널 메시지 확인
11. `DM으로 저장`, `요약 보기`, `알림 삭제` 버튼 확인
12. 키워드 DM 알림 확인

Scheduler 1회 실행:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend npm run scheduler:notice:run-once
```

운영 container의 `scheduler:notice:run-once`는 빌드된 `dist` 파일을 실행한다.
첫 수집이면 공지를 저장만 하고 Discord 알림은 보내지 않는다. 이후 실행에서는 새로 감지된 공지만 알림 대상이 된다.

운영 DB에서 최근 공지 확인:

```sql
SET NAMES utf8mb4;
SELECT id, title FROM notices ORDER BY id DESC LIMIT 10;
```

공지 알림 재테스트용 삭제:

```sql
DELETE FROM notices WHERE id = 삭제할공지ID;
SELECT id, title FROM notices ORDER BY id DESC LIMIT 10;
```

---

# 4. Demo Checklist

데모 촬영 전 확인:

- 데모용 Discord 서버 준비
- IRIS Bot 초대 가능 여부 확인
- `/setup`, `/subscribe`, `/keyword`, `/guide` 명령어 확인
- 관리자 페이지 접속 확인
- 경북대학교 컴퓨터학부 URL과 selector 준비
- 설정 저장 직후 초기 수집 확인
- 공지 채널 알림 확인
- `DM으로 저장`, `요약 보기`, `알림 삭제` 버튼 확인
- 키워드 DM 알림 확인
- 설정 삭제 또는 Bot 제거 후 데이터 정리 방식 확인

데모 권장 흐름:

1. 랜딩 페이지에서 서비스 목적 확인
2. Discord Bot 초대
3. `/setup`으로 관리자 페이지 이동
4. 공지 사이트와 selector 입력
5. 테스트 크롤링 결과 확인
6. 알림 채널과 카테고리 역할 저장
7. `/subscribe`로 카테고리 구독
8. `/keyword`로 키워드 추가
9. 공지 알림과 DM 저장 버튼 시연
10. `/guide`로 권한, DM, Bot 제거 안내 확인
