# AI Student Agent 구현 체크리스트

이 문서는 `PROJECT_SPEC.md`를 바탕으로 현재까지 구현된 사항과 앞으로 진행해야 할 남은 작업들을 정리한 체크리스트입니다.

## 1. 기반 인프라 및 UI 셋업 (완료)
| 작업명 (Task) | 설명 | 상태 | 비고 |
| --- | --- | --- | --- |
| 프로젝트 초기 세팅 및 DB 설계 | `Member`, `RawInformation`, `ActionItem` 도메인 엔티티 및 연관관계 설계 완료 | [x] | |
| 백엔드 인증 인프라 | `SecurityConfig`, `JwtProvider` 기반 Stateless JWT 인증 구현 | [x] | |
| 프론트엔드 기반 통합 | `design2`의 파스텔톤 UI 템플릿 병합, `Login`, `Dashboard` 라우팅 구현 | [x] | Vite 8/Node 26 호환성 해결 |
| 대시보드 API 연동 | 프론트엔드에 Action Items 리스트업을 위한 백엔드 연동 및 렌더링 검증 | [x] | |

## 2. 크롤러 및 데이터 수집 파이프라인 (진행 중)
| 작업명 (Task) | 설명 | 상태 | 비고 |
| --- | --- | --- | --- |
| 파이프라인 기초 공사 | Jsoup 세팅, 스케줄러 세팅, `CrawlerService` & `CrawlerController` (Mock Data) | [x] | 수동 실행 테스트 완료 |
| 학교/학과 공지 크롤러 | 공개 게시판 대상 실제 웹 크롤러 구현 | [ ] | |
| LMS (LearningX) 연동 | Canvas API 토큰 발급 확인 및 데이터 연동 (불가 시 Chrome Extension 대안) | [ ] | **(가장 시급한 확인 사항)** |
| 장학금 / 청년정책 연동 | 공공데이터포털 오픈 API 및 온통청년 API 신청/연동 | [ ] | API 승인 소요시간 존재 |

## 3. 정보 분석 및 AI (LLM) 엔진 (진행 중)
| 작업명 (Task) | 설명 | 상태 | 비고 |
| --- | --- | --- | --- |
| 정보 구조화 (Rule-based) | 위비티(Wevity) 공모전 키워드 기반 카테고리/마감일/우선순위 자동 계산 (Phase 9) | [x] | Mock LLM 구조 적용 완료 |
| 실제 LLM 파이프라인 연동 | OpenAI 또는 Gemini API를 연동하여 실제 텍스트 요약 및 구조화 진행 | [ ] | JSON 파싱 및 예외 처리 |
| Priority Engine 고도화 | 사용자 관심도, 남은 기한 등을 종합한 우선순위 산정 알고리즘 실체화 | [ ] | |

## 4. Conflict Resolution (일정 재배치) (예정)
| 작업명 (Task) | 설명 | 상태 | 비고 |
| --- | --- | --- | --- |
| Irreversibility 룰 도입 | 장학금(High), 과제(Medium), 동아리(Low) 등 되돌릴 수 없는 정도 모델링 | [ ] | |
| 재배치 시나리오 자동 생성 | 여러 일정이 겹칠 때 LLM을 활용한 재배치 시나리오(JSON) 도출 프롬프트 작성 | [ ] | |
| 재배치 제안 UI 구현 | 대시보드 내 일정 충돌 시 경고 카드 및 재배치 제안 노출 | [ ] | |

## 5. 행동(Action) 및 사용자 학습 (예정)
| 작업명 (Task) | 설명 | 상태 | 비고 |
| --- | --- | --- | --- |
| Today's Brief 생성 | 오늘의 핵심 할 일 요약 리포트 백엔드 생성 및 프론트 노출 | [ ] | |
| Google Calendar 연동 | 추천 수락 시 사용자의 구글 캘린더에 일정 자동 삽입 액션 구현 | [ ] | |
| Learn Engine | 사용자의 추천 수락/거부 로그를 기반으로 다음 우선순위에 반영 (개인화) | [ ] | |
| 배포 및 최종 테스트 | Vercel (Front) / AWS (Back) 실서버 배포 및 통합 테스트 | [ ] | |
