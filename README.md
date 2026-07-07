# 챌린지로그 (ChallengeLog)

> 매일의 기록을 분석해 더 나은 내일을 제안하는 AI 기록 에이전트

대학생이 하루 한 장, 랜덤 주제로 부담 없이 기록하는 습관을 만들고, 소규모 친구 방을 통해 비교 없이 함께 꾸준함을 이어가는 서비스입니다.

자세한 기획 내용은 [Wiki - 기획서](../../wiki) 참고.

---

## 📌 문제 정의

- 혼자 기록하는 습관은 며칠 하다 흐지부지되기 쉬움
- 기존 SNS는 전체 공개라 비교와 피로를 유발함
- → **"함께 하되 비교하지 않는"** 기록 방식이 필요함

## ✨ 핵심 기능 (MVP)

| 기능 | 설명 |
|---|---|
| 오늘의 랜덤 챌린지 | 매일 오전 7시 새로운 주제 제공 |
| 사진 기록 | 앱 내 카메라 촬영 + 한 줄 메모, 하루 1회 |
| 캘린더 | 기록한 날짜에 썸네일 표시, 월별 열람 |
| 알림 | 매일 오전 7시 푸시 알림 |
| **소규모 친구 방** | 3~6명 클로즈드 그룹, 완료 여부만 공유 (비교 없음) — 이번 MVP 핵심 |
| AI 데일리 케어 | 기록 분위기에 맞춘 응원/제안 메시지 |

## 🛠 기술 스택

**Frontend/App**: Flutter · Dart · Riverpod · go_router · dio
**Backend**: Java · Spring Boot · Spring Security · Spring Data JPA · JWT · Gradle
**Database**: PostgreSQL
**Storage**: AWS S3 / Supabase Storage
**Push**: Firebase Cloud Messaging (FCM) · flutter_local_notifications
**Infra**: Docker · GitHub Actions · Swagger/OpenAPI

## 📂 프로젝트 구조 (예정)

```
challengelog/
├── app/                  # Flutter 클라이언트
│   ├── lib/
│   │   ├── features/     # challenge, record, calendar, room, ai_care
│   │   ├── core/
│   │   └── main.dart
├── server/                # Spring Boot 백엔드
│   ├── src/main/java/...
│   │   ├── domain/        # challenge, record, room, member, aicare
│   │   ├── global/        # config, security, exception
│   │   └── ...
├── docs/                  # 기획서, API 명세, 회의록
├── CLAUDE.md              # 클로드 코드용 개발 규칙
└── README.md
```

## 🚀 실행 방법

```bash
# Backend
cd server
./gradlew bootRun

# Frontend
cd app
flutter pub get
flutter run
```


## 📄 개발 규칙

Claude Code를 포함한 협업자는 작업 전 [CLAUDE.md](./CLAUDE.md)의 원칙을 먼저 확인합니다.

