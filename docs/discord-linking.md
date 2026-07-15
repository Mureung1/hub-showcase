# Discord 계정 연동 설계 (연동 코드 방식)

> 웹에서 로그인한 사용자가 **스스로** 자기 Discord 계정·알림 채널을 연동하는 흐름의 설계 문서.
> 백엔드(DB 마이그레이션 + edge function + 봇 커맨드)까지 확정한 뒤 착수하기 위한 단일 참조.
> 스택·용어는 [CLAUDE.md](../CLAUDE.md), 화면 토큰은 [design.md](design.md), 진행 태스크는 [week2-plan.md](week2-plan.md) T4.

## 1. 목표 / 배경

**목표**: 로그인한 사용자가 웹 설정 화면에서 "연동 코드"를 발급받아, Discord에서 봇 커맨드로 그 코드를 입력하면, 봇이 그 사용자에게 자기 Discord 계정과 알림 채널을 연결한다. 이후 감시 알림이 그 채널로 도달한다.

**현재 상태 (연동의 실제)**:
- 연동은 [`scripts/link-discord.mjs`](../scripts/link-discord.mjs) 수동 스크립트뿐 — `.env`의 `DISCORD_USER_ID`/`DISCORD_NOTIFY_CHANNEL_ID`를 **service role**로 `discord_links`에 upsert. 웹 셀프 연동 UI·코드 없음.
- Edge Function은 단일 사용자 전제: [`_shared/db.ts`](../supabase/functions/_shared/db.ts)의 `getSingleUser()`가 **항상 `profiles` 첫 행**을 쓰고, 인터랙션의 실제 Discord user id를 **역조회하지 않는다**. `discord_links`는 사실상 `notify_channel_id` 저장소.
- `discord_links` 스키마([0001_schema.sql](../supabase/migrations/0001_schema.sql)): `user_id`(FK profiles, unique) · `discord_user_id`(text NOT NULL, unique) · `notify_channel_id`(text null) · `created_at`. RLS는 4개 정책 모두 `auth.uid() = user_id` (own-row) → 웹 authenticated 클라이언트로 자기 링크만 read/write 가능(연동에 적합).

**택한 방식**: **연동 코드(봇 커맨드)**. 이유 — 기존 봇 인프라 재사용, 봇 인터랙션에서 Discord user id와 채널 id를 **자연스럽게** 획득(둘 다 필요), OAuth용 신규 시크릿·리다이렉트 불필요, RLS 이미 적합. (OAuth 대안은 알림 채널을 못 얻어 별도 입력이 여전히 필요하고 설정이 무겁다.)

## 2. 데이터 모델

### 2.1 `handle_new_user` 트리거 (필수 선행)
웹 회원가입([LoginPage](../src/pages/LoginPage.jsx)의 `signUp`)은 `auth.users`만 만들고 `profiles` 행을 만들지 않는다. `discord_links`·`watchlists`·`conditions`가 모두 `profiles(id)`를 FK로 참조하므로, **profiles 자동 생성 트리거가 없으면 연동·관심종목·조건이 전부 깨진다.** 표준 Supabase 패턴으로 해결한다.

### 2.2 `discord_link_codes` (신규, 단명 임시 테이블)
`discord_links.discord_user_id`가 `NOT NULL`이라 **봇 입력 전 "대기 중 코드"를 discord_links에 못 넣는다.** 별도 임시 테이블에 코드를 두고, 봇이 검증하면 그때 `discord_links`에 upsert하고 코드는 삭제한다.

- `user_id` uuid FK profiles, `unique(user_id)` → 사용자당 활성 코드 1개(재발급 = upsert)
- `code` text `unique` → 봇이 코드로 사용자 식별
- `expires_at` timestamptz → 10분 만료
- RLS own-row(select/insert/update/delete `auth.uid() = user_id`). 봇은 service role로 우회 조회.

### 2.3 최종 `discord_links` (기존 스키마 그대로 사용)
봇 검증 성공 시 `{ user_id, discord_user_id, notify_channel_id }` upsert(onConflict `user_id`). 스키마 변경 없음.

## 3. 마이그레이션 — `supabase/migrations/0004_discord_link_and_profiles.sql` (신규)

> 번호: 0003=watchlists 존재. week2-plan이 T3(hold)용으로 "0004"를 언급했으나 파일 미생성 → 본 파일이 **0004 선점**, hold 마이그레이션은 **0005로 이동**(week2-plan §3 T3 갱신).

```sql
-- 1) 회원가입 시 profiles 자동 생성 (웹 signUp 대응)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) 대기 중 연동 코드 (봇 검증 전 임시, 단명)
create table discord_link_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  code text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table discord_link_codes enable row level security;

create policy "dlc_select_own" on discord_link_codes
  for select using (auth.uid() = user_id);
create policy "dlc_insert_own" on discord_link_codes
  for insert with check (auth.uid() = user_id);
create policy "dlc_update_own" on discord_link_codes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dlc_delete_own" on discord_link_codes
  for delete using (auth.uid() = user_id);
```

> 참고: 기존 계정(스크립트 생성)엔 이미 profiles 행이 있어 트리거의 `on conflict do nothing`로 안전. 트리거는 신규 가입분에만 실질 작동.

## 4. 봇 커맨드 `/연동`

### 4.1 등록 — [`scripts/register-discord-command.mjs`](../scripts/register-discord-command.mjs)
현재 `COMMAND_DEFINITION`(`/알림`) 하나만 POST한다. 커맨드를 배열로 바꿔 `/연동`을 추가하거나, 벌크 등록 엔드포인트(`PUT .../commands`)로 전환한다.

```js
const LINK_COMMAND = {
  name: "연동",
  description: "웹에서 발급한 코드로 이 Discord 계정을 Beacon에 연동합니다.",
  type: 1,
  options: [
    { type: 3, name: "코드", description: "웹 설정 화면에서 발급한 6자리 코드", required: true },
  ],
};
// 주의: 개별 POST는 같은 이름 재등록 시 덮어씀. 두 커맨드 모두 유지하려면
//   PUT https://discord.com/api/v10/applications/{appId}[/guilds/{guildId}]/commands
//   body: [COMMAND_DEFINITION, LINK_COMMAND] 로 벌크 등록 권장.
```

### 4.2 핸들러 — [`discord-interactions/index.ts`](../supabase/functions/discord-interactions/index.ts)
슬래시 커맨드 라우팅에 `name === "연동"` 분기 추가. service client(`getServiceClient()`)로:

1. 코드 = `interaction.data.options`에서 `코드` 값. `discordUserId = interaction.member.user.id`(길드) 또는 `interaction.user.id`(DM). `notifyChannelId = interaction.channel_id`.
2. `discord_link_codes`에서 `code`로 조회.
   - 없음 → ephemeral "코드가 올바르지 않아요. 웹에서 다시 발급해 주세요."
   - `expires_at < now()` → 만료 안내(+ 해당 행 삭제).
3. 유효 → `discord_links` upsert `{ user_id: row.user_id, discord_user_id: discordUserId, notify_channel_id: notifyChannelId }` (onConflict `user_id`). 성공 후 그 `discord_link_codes` 행 삭제. ephemeral "✅ 연동 완료! 이제 이 채널로 알림을 보낼게요."
4. `unique(discord_user_id)` 충돌(이 Discord 계정이 다른 사용자에 이미 연동) → "이미 다른 Beacon 계정에 연동된 Discord 계정이에요." (기존 연동 해제 안내.)

응답은 기존 [`_shared/discord.ts`](../supabase/functions/_shared/discord.ts)의 인터랙션 응답 헬퍼 + ephemeral 플래그(`flags: 64`) 사용. Ed25519 서명 검증(`verifyDiscordRequest`)은 기존 진입점 그대로 통과.

## 5. 웹 연동 UI — 신규 `SettingsPage`

- **라우트/네비**: `src/pages/SettingsPage.jsx`(+`.css`) 신규 → [App.jsx](../src/App.jsx) `ProtectedRoute` 하위 `/settings` 추가 → [AppLayout](../src/components/AppLayout.jsx) 네비에 "설정"(`settings` 아이콘, [Icon.jsx](../src/components/Icon.jsx)에 이미 추가됨) 항목.
- **동작(모두 authenticated 클라이언트, RLS own-row)**:
  1. 마운트 시 `supabase.auth.getUser()`로 `user_id` 확보, `discord_links` own-row 조회.
     - 연동됨 → 공용 `.status.done` "연동됨" + `notify_channel_id` 표시 + "연동 해제"(`discord_links` delete).
     - 미연동 → "Discord 연동하기" 버튼.
  2. **코드 발급**: 6자 랜덤 코드 생성(대문자+숫자, 혼동 문자 I/O/0/1 제외) → `discord_link_codes` upsert `{ user_id, code, expires_at: now()+10분 }` (onConflict `user_id`). 코드 + 복사 버튼 + 안내("Discord 채널에서 `/연동 코드` 입력 · 10분 유효") 표시.
  3. **반영 확인**: "연동 확인" 버튼으로 `discord_links` 재조회(봇 실행 후). (선택: 짧은 폴링.)
- **색·컴포넌트**: 공용 `.card`/`.btn.accent`/`.status`/`.badge` 재사용, `discord` 아이콘. 하드코딩 색 금지(design.md 토큰).
- **유도**: 로그인 직후 미연동이면 대시보드/설정로 유도(배너는 선택, 최소범위는 네비 진입점 + 로그인 폼 하단 안내 문구는 이미 존재).

## 6. 배포 절차 (실구현 후)

1. `supabase db push` (또는 마이그레이션 적용)로 `0004` 반영 → 트리거 + `discord_link_codes` 생성.
2. `supabase functions deploy discord-interactions` 재배포.
3. `node scripts/register-discord-command.mjs`로 `/연동` 커맨드 (재)등록 — 벌크 `PUT`이면 `/알림`도 함께.
4. 웹 배포(설정 화면 포함).
5. 검증: 설정에서 코드 발급 → Discord `/연동 코드` → "연동 완료" → `discord_links`에 `discord_user_id`+`notify_channel_id` 저장 → 설정 "연동됨" → 조건 충족 시 `monitor`가 그 채널로 알림.

> `market-data` 배포·`0003_watchlists`·`0005_alerts_and_hold`(관망+조건충족 이력, IA 재편으로 신설) 적용과 함께 처리 권장(같은 배포 사이클).

## 7. 미해결 결정거리

1. **다중 사용자 라우팅** — 회원가입으로 사용자가 여럿이 되면, `/알림`·버튼 핸들러와 `monitor`가 여전히 `getSingleUser()`(첫 profiles 행)를 써서 **엉뚱한 사용자에게 귀속**된다. 진짜 per-user로 가려면:
   - 인터랙션: `getSingleUser` → `discord_user_id`로 `discord_links` 역조회해 `user_id` 해석하는 헬퍼(`resolveUserByDiscordId`)로 교체.
   - `monitor`: 첫 사용자 대신 **사용자별 순회**(각자 조건·notify_channel).
   - 본 연동 문서 범위 밖(후속 태스크). 연동 코드 흐름 자체는 다중 사용자에서도 올바르게 특정 `user_id`에 연결됨 — 소비 측(알림)만 전환 필요.
2. **이메일 확인(Confirm email)** — Supabase Auth 설정 on이면 회원가입 후 즉시 세션이 없어 연동 전 로그인 단계가 하나 더 생긴다. 데모 편의상 off 권장(대시보드 설정). 코드는 두 경우 모두 처리(세션 있으면 진입, 없으면 확인메일 안내).
3. **코드 스펙** — 길이 6, 대문자+숫자(혼동 문자 제외), 만료 10분, 사용자당 1개(재발급 덮어씀). 조정 여지.
4. **만료 코드 청소** — `discord_link_codes`는 upsert로 사용자당 1행이라 누적은 제한적. 필요 시 pg_cron으로 만료 행 주기 삭제(선택).
5. **연동 해제 UX** — 웹에서 `discord_links` delete만으로 충분(봇 측 상태 없음). 재연동은 코드 재발급.

## 8. 대상 파일 (실구현 시)
- 신규: `supabase/migrations/0004_discord_link_and_profiles.sql`, `src/pages/SettingsPage.jsx`(+`.css`)
- 수정: [`discord-interactions/index.ts`](../supabase/functions/discord-interactions/index.ts), [`register-discord-command.mjs`](../scripts/register-discord-command.mjs), [`App.jsx`](../src/App.jsx), [`AppLayout.jsx`](../src/components/AppLayout.jsx)
- 재사용: `.card`/`.btn`/`.status`([index.css](../src/index.css)), [`Icon.jsx`](../src/components/Icon.jsx)(`settings`·`discord` 추가됨), [`_shared/db.ts`](../supabase/functions/_shared/db.ts)·[`_shared/discord.ts`](../supabase/functions/_shared/discord.ts)
