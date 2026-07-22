# CSV 내보내기/가져오기 — 3개 환경 수동 테스트 절차

PRD v2.0 §2의 수용 기준을 실제로 확인하는 절차서. 코드 위치는 아래 4개 파일이 전부다.

| 파일 | 역할 |
|---|---|
| [src/utils/platform.js](../src/utils/platform.js) | `getPlatform()` — `'web' \| 'mobile-web' \| 'apk'`. **모든 플랫폼 분기는 이 함수 하나가 기준** |
| [src/lib/fileExport.js](../src/lib/fileExport.js) | `saveTextFile()` — 환경별 저장(브라우저 blob 다운로드 / Capacitor Filesystem + Share) + UTF-8 BOM |
| [src/lib/dataBackup.js](../src/lib/dataBackup.js) | 신체정보+식단 백업 CSV의 생성/파싱/반영. 게스트·로그인 계정 공통 |
| [src/components/DataBackupPanel.jsx](../src/components/DataBackupPanel.jsx) | MY 탭 UI(내보내기/가져오기 버튼, 중복 날짜 다이얼로그, 토스트) |

테스트용 샘플 파일은 아래로 만든다(생성물은 `.gitignore` 처리돼 있다):

```bash
node scripts/generate-sample-csv.mjs                                   # 정상 1,000행 → scripts/sample-1000.csv
node scripts/generate-sample-csv.mjs 1000 scripts/sample-broken.csv --broken   # 50행을 일부러 깨뜨린 1,000행
```

---

## 공통 준비

1. 신체정보를 입력하고 식단을 2~3건 기록해 둔다(내보낼 데이터가 있어야 한다).
2. MY 탭 하단의 **"데이터 내보내기 / 가져오기 (CSV)"** 카드에서 테스트한다.
3. 게스트·로그인 계정 **둘 다** 한 번씩 돌린다 — 저장소가 다르다(localStorage vs Supabase).

---

## 1. PC 브라우저 (`getPlatform() === 'web'`)

| # | 절차 | 기대 결과 |
|---|---|---|
| 1 | MY 탭 → **데이터 내보내기(CSV)** | 하단에 초록 토스트: `신체정보, 식단 N일치 · 다운로드 폴더에 저장되었습니다. (mealog_YYYY-MM-DD.csv)` |
| 2 | 다운로드 폴더 확인 | `mealog_YYYY-MM-DD.csv` 존재 |
| 3 | 그 파일을 **엑셀로 열기** | 한글(음식명)이 깨지지 않음 ← UTF-8 BOM 확인 |
| 4 | (선택) 헥스 뷰어로 파일 첫 3바이트 확인 | `EF BB BF` |
| 5 | **데이터 가져오기(CSV)** → 방금 그 파일 선택 | 이미 그 날짜에 기록이 있으므로 **덮어쓰기/건너뛰기 다이얼로그**가 뜸 |
| 6 | **덮어쓰기** 선택 | 토스트: `N건 가져옴` (실패 0건). 식단 탭 수치가 그대로 |
| 7 | 5번을 다시 하고 **건너뛰기** 선택 | 토스트에 `M일 건너뜀` 포함, 데이터 변화 없음 |
| 8 | 아무 텍스트 파일(`.csv`로 확장자만 바꾼 것) 가져오기 | 빨간 토스트 `지원하지 않는 파일 형식입니다...` + 카드 안에 **올바른 형식 예시** 표시 |
| 9 | `scripts/sample-broken.csv` 가져오기 | 토스트: `950건 가져옴, 50건 실패` (행 단위 실패는 건너뜀) |
| 10 | `scripts/sample-1000.csv` 가져오기 시간 측정 | **3초 이내** (파싱 자체는 ~3ms, 나머지는 저장소 쓰기) |

## 2. 모바일 브라우저 (`getPlatform() === 'mobile-web'`)

배포 URL을 스마트폰 크롬으로 연다.

| # | 절차 | 기대 결과 |
|---|---|---|
| 1 | MY 탭 → **데이터 내보내기(CSV)** | 토스트: `... · 다운로드 폴더에 저장되었습니다.` (PC와 문구가 다름 — 파일명 없이 짧게) |
| 2 | **내 파일 > 다운로드** 확인 | `mealog_YYYY-MM-DD.csv` 존재 |
| 3 | **데이터 가져오기(CSV)** → 1번 파일 선택 | 파일 선택기가 정상 동작, 이후 PC와 동일 |
| 4 | 중복 날짜 다이얼로그 | 화면 하단에서 올라오는 시트로 표시, 버튼 터치 가능 |

## 3. APK (`getPlatform() === 'apk'`)

`npm run app:sync` → Android Studio에서 실기기에 설치. (원격 URL 방식이므로 **웹 변경분이 배포되어 있어야** 앱에도 반영된다 — `docs/apk-build-guide.md` 참고.)

| # | 절차 | 기대 결과 |
|---|---|---|
| 1 | MY 탭 → **데이터 내보내기(CSV)** | 토스트: `... · Documents 폴더에 저장되었습니다. (mealog_….csv)` + 토스트 안에 **[공유하기]** 버튼 |
| 2 | **[공유하기]** 탭 | 안드로이드 공유 시트가 뜸 (Drive/메일 등으로 보낼 수 있음) |
| 3 | **내 파일 > 내장 저장공간 > Documents** | `mealog_YYYY-MM-DD.csv` 존재 |
| 4 | 저장 실패 기기라면 | 토스트가 `앱 임시 폴더에 저장했어요. 공유하기로 원하는 위치에 옮겨주세요.`로 폴백 — **무반응으로 끝나지 않음** |
| 5 | **데이터 가져오기(CSV)** → 파일 선택기에서 3번 파일 | Capacitor 기본 브릿지가 파일 선택기를 띄움, 가져오기 성공 토스트 |

---

## 트러블슈팅

| 증상 | 먼저 볼 곳 |
|---|---|
| 엑셀에서 한글 깨짐 | 파일 첫 3바이트가 `EF BB BF`인지 — `fileExport.js`의 `UTF8_BOM`이 `withBom` 옵션으로 꺼져 있지 않은지 확인 |
| APK에서 저장이 안 됨 | `AndroidManifest.xml`의 `WRITE_EXTERNAL_STORAGE`(maxSdkVersion 29) + `npm run app:sync`로 플러그인이 동기화됐는지(`@capacitor/filesystem`, `@capacitor/share`) |
| APK에서 공유 시트가 안 뜸 | `AndroidManifest.xml`의 `FileProvider` + `res/xml/file_paths.xml` |
| 무반응(토스트 없음) | `App.jsx`가 `ToastProvider`로 감싸고 있는지 — `useToast()`는 Provider 밖에서 no-op으로 폴백한다 |
| 가져왔는데 화면이 그대로 | `DataBackupPanel`의 `refetchProfile()`/`refetchTodayMeals()` 호출부 |

---

## 형식이 둘이라는 점 (2026-07-22 버그 수정)

이 앱에는 내보내기 진입점이 **둘**이고 형식도 다르다. 한때 가져오기가 그중 하나만 읽을 수 있어서
"내보낸 파일을 다시 못 읽는" 버그가 있었다(자세한 경위: [fix-csv-roundtrip-프롬프트.md](fix-csv-roundtrip-프롬프트.md)).

| 내보내기 | 형식 | 파일명 |
|---|---|---|
| MY 탭 "데이터 내보내기(CSV)" | `[profile]` / `[meals]` 섹션 (신체정보 포함) | `mealog_YYYY-MM-DD.csv` |
| 달력 탭 "기간별 기록 내보내기" | 평면 표 (`recommended_*`/`compliant` 포함, 신체정보 없음) | `mealog_<시작>_to_<종료>.csv` |

지금은 **가져오기 하나가 두 형식을 자동 인식**한다. 판별은 파일 **내용**으로만 하므로 파일명을 바꿔도
읽힌다. 형식 정의(컬럼 상수·직렬화·파싱)는 전부 [src/lib/backupFormat.js](../src/lib/backupFormat.js)
한 곳에 있고, 내보내는 쪽(`dataBackup.js`, `csv.js`)이 같은 상수를 참조한다.

### 회귀 방지

```bash
npm run check:csv    # 두 형식 각각 내보내기→파싱 왕복 + 컬럼 순서 변경·깨진 행·거부 케이스
```

이 검사는 **실제 앱의 직렬화 함수와 컬럼 상수를 그대로 import**한다. 테스트가 형식을 따로 재현하면
앱만 바뀌었을 때 테스트는 통과하는데 앱은 깨지므로, 그 함정을 구조적으로 막았다.

샘플 파일은 두 형식 모두 만들 수 있다:

```bash
node scripts/generate-sample-csv.mjs 1000 scripts/s.csv                    # 섹션 형식
node scripts/generate-sample-csv.mjs 1000 scripts/s-flat.csv --format=flat # 평면 형식
node scripts/generate-sample-csv.mjs 1000 scripts/s-broken.csv --broken    # 50행 고의 손상
```

실측(1,000행): 섹션 5.0ms / 평면 9.7ms — 수용 기준 3초에 크게 못 미친다.
