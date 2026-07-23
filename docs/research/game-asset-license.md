# PtoP 게임 에셋 라이선스 기록

## 목적

게임형 작업실에 사용하는 이미지의 출처와 사용 범위를 기록한다. 무료라는 표현만으로 사용 가능하다고 판단하지 않고, 공식 원문과 라이선스를 확인한 에셋만 Repository에 포함한다.

확인일: 2026-07-23

## 사용 원칙

- 공식 제작자 페이지와 라이선스 원문을 확인한다.
- 상업적 사용, 수정, 크레딧, 재배포 조건을 구분한다.
- 공개 Repository에는 서비스 실행에 필요한 runtime 파일만 포함한다.
- 구매 ZIP, Aseprite 원본, 사용하지 않는 전체 에셋 시트는 포함하지 않는다.
- 크롭, 색상 변경, WebP 변환 등 수정 내용을 기록한다.
- 출처가 2차 배포 사이트뿐인 에셋은 사용하지 않는다.

## 에셋 후보

### Pixel Life: Office Essentials

| 항목 | 내용 |
| --- | --- |
| 제작자 | Chris Perich |
| 공식 원문 | https://christianperich.itch.io/pixel-life-office-essentials |
| 규격 | 32×32 top-down |
| 제공 형식 | PNG, spritesheet, Aseprite |
| 페이지 표기 라이선스 | CC BY 4.0 |
| 상업적 사용 | 가능 |
| 수정 | 가능 |
| 페이지 추가 제한 | standalone 파일의 재판매 또는 재배포 금지 |
| PtoP 용도 | 작업실 책상, 컴퓨터, 의자, 수납, 장식 |
| 상태 | 기준 에셋 후보 |

#### 적용 기준

- 서비스에 실제로 사용하는 타일만 별도 runtime 시트로 구성한다.
- 원본 RAR, ZIP, Aseprite 파일은 공개 Repository에 포함하지 않는다.
- README 또는 서비스 크레딧에 제작자와 공식 원문을 표시한다.
- 제작자 페이지의 CC BY 표기와 추가 제한이 함께 존재하므로 더 엄격한 재배포 제한을 따른다.

### Tiny Top Down Pack

| 항목 | 내용 |
| --- | --- |
| 제작자 | Screaming Brain Studios |
| 공식 원문 | https://opengameart.org/content/tiny-top-down-pack |
| 규격 | 32×32 top-down |
| 제공 형식 | PNG, Tiled TSX, example map |
| 라이선스 | CC0 |
| 상업적 사용 | 가능 |
| 수정 | 가능 |
| 크레딧 | 선택 |
| PtoP 용도 | Pixel Life에 부족한 바닥, 벽, 문 보완 |
| 상태 | 보조 에셋 후보 |

#### 적용 기준

- Pixel Life와 시각적으로 어울리는 색상만 선택한다.
- 색상을 수정하면 변경 사실을 기록한다.
- 크레딧이 필수는 아니지만 에셋 문서와 README에는 출처를 남긴다.

### 기존 Poppy 이미지

| 항목 | 내용 |
| --- | --- |
| 위치 | `apps/web/public/assets/mascot/` |
| 규격 | 3D 렌더 스타일 |
| PtoP 용도 | 랜딩, NPC 대화 초상화, 완료 안내 |
| 맵 내부 사용 | 사용하지 않음 |
| 상태 | 프로젝트 제공 자산 |

#### 적용 기준

- 작업실의 top-down 픽셀 그래픽 안에 직접 배치하지 않는다.
- 맵 내부 Poppy는 별도의 픽셀 스프라이트를 사용한다.
- 외부 서비스 배포 전 제작 과정과 사용 권한을 프로젝트 기록에 남긴다.

## 제외한 후보

### 출처가 불명확한 무료 캐릭터 재배포본

- 2차 다운로드 사이트만 확인되는 캐릭터 팩은 사용하지 않는다.
- `무료`, `free` 문구만 있고 공식 라이선스 원문이 없으면 제외한다.
- 원 제작자 페이지를 찾은 뒤에만 다시 검토한다.

### 참고 서비스의 에셋

참고 저장소:

- https://github.com/boostcampwm2025/web13-isj-dle

해당 저장소는 Tiled, Phaser, 에셋 폴더 구조를 참고하는 용도로만 사용한다. Repository 내부에 별도 에셋 라이선스와 출처가 명시되어 있지 않으므로 이미지 파일을 복사하지 않는다.

### LimeZu 무료 Modern Interiors

공식 무료판 안내:

- https://limezu.itch.io/moderninteriors/devlog/244045/free-version-overview-18042021-update

무료판은 공식 안내에서 비상업적 사용으로 제한한다. PtoP는 공개 배포와 향후 서비스화를 고려하므로 현재 후보에서 제외한다. 유료 라이선스를 구매하더라도 원본 파일을 공개 Repository에 포함할 수 있는지는 별도로 확인한다.

## Runtime 에셋 기록

### PtoP workspace2 사용자 제공 에셋

| 항목 | 내용 |
| --- | --- |
| 위치 | `apps/web/public/assets/workspace2/` |
| 파일 | `map1.png`, `map2.png`, `wide_map.png`, `art-tileset.png`, `furniture.png`, `women.png`, `man.png`, `poppy.png` |
| 출처 | PtoP 프로젝트에 제공된 이미지 파일 |
| 현재 사용 | `wide_map.png` 배경, `women.png` 플레이어, `poppy.png` NPC |
| 수정 사항 | 캐릭터 스프라이트의 체크무늬 배경을 브라우저 Canvas에서 런타임 투명화 |
| 라이선스 상태 | 생성 도구와 원본 라이선스 확인 필요 |

#### 공개 배포 전 확인

- [ ] 각 이미지의 생성 도구와 이용 약관을 확인했다.
- [ ] 생성 도구가 상업적 사용과 공개 Repository 배포를 허용하는지 확인했다.
- [ ] 확인 전에는 현재 파일을 최종 공개 서비스 에셋으로 확정하지 않는다.

### 기존 Office 8x8 Tileset 후보

| 항목 | 내용 |
| --- | --- |
| 공식 원문 | https://opengameart.org/content/office-8x8-tileset |
| 라이선스 | CC0 |
| 연결 위치 | `apps/web/public/assets/workspace/office-8x8/` |
| 사용 범위 | 작업실 바닥 타일, 컴퓨터, 식물, 화분, 칸막이, 기본 캐릭터 |
| 수정 사항 | 원본 PNG를 8×8 단위 runtime 이미지로 저장하고 Phaser에서 4배 스케일로 표시 |
| 크레딧 | 필수 아님. 출처 링크는 본 문서에 유지 |

이 에셋은 이전 기술 스파이크에서 Phaser preload와 코드 기반 맵 배치를 검증하는 데 사용했다. 현재 화면은 `workspace2` 에셋을 기준으로 동작하며, 외부 서비스의 이미지나 참고 저장소의 파일은 복사하지 않았다.

## Runtime 에셋 기록 양식

실제 파일을 추가할 때 아래 표에 한 행씩 기록한다.

| Runtime 파일 | 원본 에셋 | 수정 사항 | 사용 화면 | 크레딧 |
| --- | --- | --- | --- | --- |
| `workspace2/wide_map.png`, `women.png`, `poppy.png` | PtoP 프로젝트 제공 이미지 | 캐릭터 스프라이트 배경을 런타임 투명화 | 작업실 맵 | 생성 도구와 이용 약관 확인 필요 |
| `workspace/office-8x8/*` | Office 8x8 Tileset | 원본 8×8 PNG를 Phaser에서 4배 표시 | 작업실 맵 | CC0, 출처 링크 유지 |

## 공개 전 점검

- [ ] 모든 runtime 파일의 공식 원문을 확인했다.
- [ ] 라이선스 페이지를 확인한 날짜를 기록했다.
- [ ] 필수 크레딧을 README와 서비스 화면에 표시했다.
- [ ] 구매 원본과 사용하지 않는 전체 시트를 제외했다.
- [ ] 수정한 파일의 변경 내용을 기록했다.
- [ ] 출처를 확인할 수 없는 에셋이 남아 있지 않다.
