# CLAUDE.md

이 문서는 탑히어(가명) 프로젝트의 개발 환경/구조에 대한 맥락을 정리한 문서다. 서비스 내용은 [기획서](docs/wiki/기획서.md), 화면 흐름은 [화면구조.md](docs/wiki/화면구조.md), API 설계는 [api-design.md](docs/wiki/api-design.md) 참고.

## 개발 환경

- **Frontend**: React 18 + Vite (프로젝트 루트, 기존 구성 유지)
- **Backend**: Express (`server/` 디렉토리, 신규 추가)
- 본격 개발은 2주차부터 시작하지만, 환경 구성은 1주차에 미리 잡아둔다.

## 디렉토리 구조

```
hub/
├── src/                     # 프론트엔드 (React, 기존)
│   ├── components/          # 공통 UI 컴포넌트
│   ├── features/            # 화면구조.md 상태별 기능 단위
│   │   ├── school-search/   # 상태 1 — 학교 검색
│   │   ├── condition-input/ # 상태 2 — 조건 입력
│   │   ├── region-map/      # 상태 3 — 슬라이더 + 지도 폴리곤 + TOP5
│   │   └── region-drawer/   # 상세 드로어
│   ├── api/                 # 백엔드 호출 client (axios 인스턴스, endpoint 함수)
│   ├── hooks/
│   ├── store/                # 전역 상태 (zustand)
│   └── main.jsx
├── server/                  # 백엔드 (Express, 신규)
│   ├── src/
│   │   ├── routes/          # /api/v1/regions 등 라우터
│   │   ├── services/        # 지역 점수화 엔진 로직 (가중합 계산)
│   │   ├── data/            # 배치로 산출한 행정동 원점수 DB, 행정동 경계 GeoJSON
│   │   ├── scripts/         # 공공데이터 수집/재계산 배치 스크립트
│   │   └── app.js
│   ├── package.json         # 프론트와 별도 관리 (모노레포 워크스페이스 아님)
│   └── .env                 # 공공데이터 API 키 등 (gitignore 대상)
├── docs/
├── prototype/
└── public/
```

- 프론트/백엔드는 각자 `package.json`을 갖는 별도 Node 프로젝트로 분리한다(워크스페이스 미사용).
- 개발 시 `npm run dev`(vite, 5173)와 `server`에서 `npm run dev`(express, 4000)를 각각 띄운다.

## 라이브러리

### Frontend (추가 설치 필요)

| 라이브러리 | 용도 |
|---|---|
| 카카오 지도 JS SDK (script 태그로 로드, npm 패키지 아님) | 지도 렌더링 + 행정동 폴리곤 채색 + TOP5 마커 |
| zustand | 좌측 슬라이더 ↔ 우측 지도가 실시간으로 같은 상태를 공유해야 해서 채택 (props drilling 방지) |
| axios | 백엔드 API(`/api/v1/regions/score` 등) 호출 |

### Backend (신규 설치)

| 라이브러리 | 용도 |
|---|---|
| express | 서버 프레임워크 |
| cors | 프론트(5173) ↔ 백엔드(4000) 간 CORS 허용 |
| dotenv | 공공데이터 API 키 등 환경변수 관리 |
| axios | 공공데이터 Open API(부동산원·서울 열린데이터광장·경찰청 등) 호출 |
| better-sqlite3 | 행정동별 원점수 저장. 데이터가 작고(행정동 수백 개) 갱신 빈도가 낮아 별도 DB 서버 없이 파일 기반으로 충분 |
| node-cron | 공공데이터 주기적 재수집·재계산 배치 스케줄링 |

## 개발 전에 결정한 것

1. **포트**: 프론트 5173(Vite 기본), 백엔드 4000. `vite.config.js`에 `/api` 프록시 설정해서 프론트 코드에서는 상대경로로만 호출.
2. **API 키 관리**: 공공데이터 API 키는 `server/.env`, 카카오 지도 JS 키는 프론트에서 `VITE_KAKAO_MAP_KEY`로 `.env`에 보관(클라이언트에 노출되는 키이므로 카카오 개발자 콘솔에서 도메인 제한 필수). 둘 다 `.gitignore`에 추가하고 `.env.example`만 커밋.
3. **행정동 경계 데이터**: GeoJSON으로 `server/src/data/`에 저장 (출처: 통계청 SGIS 또는 국가공간정보포털). 프론트는 좌표 계산 없이 백엔드가 내려주는 폴리곤만 그린다.
4. **점수 계산 방식**: 원점수(통학·월세·치안·편의·교통)는 배치 스크립트로 미리 계산해 DB에 저장하고, API는 요청 시 가중합만 실시간 계산한다. 슬라이더 조작마다 원점수까지 재계산하면 느리기 때문 ([api-design.md](docs/wiki/api-design.md) 참고).
5. **인증**: 초기 버전은 로그인 없이 전체 API를 공개로 운영한다
6. **에러 응답 포맷 통일**: `{ "error": { "code": "...", "message": "..." } }` 형태로 백엔드 전 라우터에 공통 적용.
7. **AI/LLM 미사용 원칙**: 추천 점수 계산 로직에는 AI를 쓰지 않는다 (기획서 1.3 참고). 이 원칙은 백엔드 `services/` 구현 시에도 유지한다.
