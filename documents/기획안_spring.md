# 최종 기획안

# **플레이스픽 AI — Spring Boot 기반 네이버 검색 API 연계 실시간 모임 장소 의사결정 플랫폼**

## 0. 최종 방향

기존 기획의 핵심은 그대로 유지한다. 서비스는 사용자의 모임 조건을 AI가 해석하고, 네이버 지역 검색·블로그 검색 결과를 바탕으로 장소 후보를 추천하는 구조다. 기존 기획에서도 플레이스픽 AI는 “사용자의 모임 조건을 AI가 해석하고, 네이버 지역·블로그 검색 결과를 기반으로 장소 후보를 추천하며, 공유 링크에서 발생하는 투표·클릭·피드백 이벤트를 실시간으로 처리하는 백엔드 중심 AI 서비스”로 정의되어 있었다. 

다만 최종 구현 기술은 **Spring Boot 중심**으로 수정한다. 즉, 이 프로젝트는 단순한 AI 추천 서비스가 아니라 **Java/Spring 백엔드 역량을 보여주는 포트폴리오형 서비스**로 설계한다.

## 서비스 한 줄 소개

**플레이스픽 AI는 사용자의 모임 조건을 LLM API가 해석하고, 네이버 지역·블로그 검색 결과를 기반으로 장소 후보를 추천하며, Spring Boot 기반 비동기 파이프라인과 실시간 이벤트 처리로 여러 사람의 장소 합의를 돕는 AI 백엔드 서비스다.**

---

# 1. 기획 기준과 의도

## 1-1. 기획 기준

| 기준            | 최종 기획 기준                                                              |
| ------------- | --------------------------------------------------------------------- |
| 네이버 관련성       | 네이버 지역 검색과 블로그 검색을 핵심 데이터 소스로 사용한다.                                   |
| AI 기반성        | LLM API로 조건 추출, 검색 문맥 요약, 추천 이유 생성을 수행한다.                             |
| GPU 학습 없음     | 자체 모델 학습 없이 LLM API, 규칙 기반 점수화, Redis 캐싱으로 구현한다.                      |
| Spring 백엔드 역량 | Spring Boot, JPA, Redis Streams, SSE, Actuator, Testcontainers를 활용한다. |
| 대용량 처리 방향     | 네이버 API를 많이 호출하는 방식이 아니라, 내부 추천 작업·투표·클릭 이벤트를 스트림으로 처리한다.             |
| 실시간성          | 추천 진행 상태는 SSE로, 공유방 투표 결과는 SSE 또는 WebSocket으로 전달한다.                   |
| 비용 현실성        | MVP에서는 지도, 길찾기, 예약, 결제, 자체 AI 학습을 제외한다.                               |

NAVER API HUB는 검색, 쇼핑, 트렌드 등 다양한 네이버 API를 하나의 키로 연동하고 운영할 수 있도록 제공하며, 사용량·권한·비용을 통합 관리할 수 있다고 안내한다. 따라서 본 프로젝트는 네이버 API를 외부 의존성으로 사용하되, Spring 백엔드에서 호출량과 캐시를 제어하는 구조로 설계한다. ([NAVER CLOUD PLATFORM][1])

## 1-2. 최종 기획 의도

이 프로젝트의 목적은 단순히 “좋은 맛집을 추천하는 것”이 아니다.

정확한 기획 의도는 다음이다.

> **여러 사람이 약속 장소를 정할 때 발생하는 검색, 비교, 공유, 의견 수렴, 최종 합의 과정을 AI와 Spring 기반 이벤트 처리 백엔드로 줄이는 것**

기존 검토에서도 이 서비스의 본질은 “맛집 추천”이 아니라, 여러 사람이 약속 장소를 정할 때 발생하는 검색·비교·공유·합의 과정을 줄이는 것으로 정리되었다. 특히 추천 작업은 시간이 걸릴 수 있으므로 비동기 처리가 필요하고, 외부 API 호출은 제한이 있으므로 rate limit과 cache가 필요하며, 친구들의 투표는 실시간으로 반영해야 하므로 event stream이 필요하다고 정리되어 있었다. 

---

# 2. 문제 발견

## 2-1. 관찰에서 출발한 문제

모임 장소를 정할 때 사용자는 보통 다음 과정을 반복한다.

```text
1. 네이버에서 “강남역 맛집”, “성수역 조용한 카페”, “홍대 회식 장소” 등을 검색한다.
2. 네이버 플레이스, 블로그, 지도, 후기 글을 여러 개 확인한다.
3. 위치, 가격, 분위기, 인원 수용 가능성, 웨이팅 가능성을 비교한다.
4. 단체 채팅방에 후보를 공유한다.
5. 친구들의 의견을 듣고 다시 검색한다.
6. 결국 가장 무난해 보이는 곳을 감으로 고른다.
```

이 과정에서 핵심 불편은 **정보 부족이 아니라 정보 과잉과 의사결정 피로**다. 기존 기획안에서도 사용자는 장소 정보가 부족해서 힘든 것이 아니라, 많은 후보와 흩어진 판단 기준 때문에 힘들다고 정리했다. 

## 2-2. 사용자가 직접 확인해야 하는 것

| 확인 항목 | 사용자가 느끼는 불편                    |
| ----- | ------------------------------ |
| 위치    | 역에서 가까운지 직접 확인해야 한다.           |
| 분위기   | 조용한지, 대화하기 좋은지 블로그 후기를 읽어야 한다. |
| 예산    | 가격대가 모임 조건과 맞는지 여러 글을 비교해야 한다. |
| 인원    | 4명, 5명, 단체 방문이 가능한지 확인해야 한다.   |
| 웨이팅   | 금요일 저녁이나 주말에 혼잡할지 직접 판단해야 한다.  |
| 공유    | 단체방에 보낼 후보와 이유를 다시 정리해야 한다.    |
| 합의    | 친구들의 의견을 모아 최종 장소를 다시 골라야 한다.  |

## 2-3. 발견한 핵심 니즈

사용자는 단순히 장소를 많이 추천받고 싶은 것이 아니다.

사용자의 핵심 니즈는 다음이다.

> **“우리 모임 조건에 맞는 장소를 빠르게 3개 정도로 줄이고, 왜 괜찮은지 설명을 받고, 친구들과 쉽게 합의하고 싶다.”**

---

# 3. 문제 정의

## 문제 정의 한 문장

**모임 장소를 정해야 하는 사용자는 여러 사람의 위치, 예산, 인원, 분위기, 선호 조건을 동시에 고려해야 하는 상황에서 네이버 검색 결과와 블로그 후기를 직접 비교하고 단체방 의견까지 조율해야 해서 최종 장소를 결정하는 데 시간과 피로를 느낀다.**

## 문제 구성

| 구분      | 내용                                                                           |
| ------- | ---------------------------------------------------------------------------- |
| 누가      | 친구, 연인, 동료와 만날 장소를 정해야 하는 20~30대 사용자                                         |
| 어떤 상황에서 | 친구 모임, 데이트, 회식, 스터디, 소개팅 장소를 정할 때                                            |
| 무슨 불편을  | 네이버 검색 결과와 블로그 후기를 직접 비교하고, 단체방 의견까지 조율해야 하는 불편                              |
| 왜 문제인가  | 후보는 많지만 최종 결정을 내리기 어렵고, 장소 선택 실패에 대한 부담이 있기 때문                               |
| 해결 방향   | AI가 조건을 추출하고, 네이버 검색 결과 기반으로 후보를 압축하며, 공유 링크에서 투표와 피드백을 받아 실시간으로 합의 과정을 돕는다. |

---

# 4. 타깃 사용자

## 4-1. 핵심 사용자

| 항목    | 내용                              |
| ----- | ------------------------------- |
| 1차 타깃 | 20~30대 약속 장소 결정자                |
| 사용 상황 | 친구 모임, 데이트, 회식, 스터디, 소개팅        |
| 사용 시점 | 단체 채팅방에서 “어디 갈까?”가 길어지는 순간      |
| 핵심 불편 | 후보 비교, 후기 확인, 단체방 공유, 최종 합의     |
| 기대 결과 | 후보 3개, 추천 이유, 주의점, 공유 링크, 투표 결과 |

## 4-2. 대표 페르소나

| 항목 | 내용                                               |
| -- | ------------------------------------------------ |
| 이름 | 지민                                               |
| 나이 | 27세                                              |
| 상황 | 금요일 저녁에 친구 4명과 강남역에서 만나기로 함                      |
| 조건 | 강남역 근처, 4명, 1인 2만 원대, 조용하고 대화하기 좋은 음식점           |
| 불편 | 검색 결과와 블로그 글을 여러 개 비교하기 귀찮고, 친구들에게 후보를 설명하기 번거로움 |
| 기대 | AI가 후보 3개를 골라주고, 친구들이 링크에서 바로 투표해 최종 장소를 정했으면 함  |

---

# 5. 사용자 시나리오

지민은 금요일 저녁에 친구 4명과 강남역에서 만나기로 했다. 네이버에서 “강남역 맛집”, “강남역 조용한 음식점”, “강남역 4명 모임 장소”를 검색해 보지만 후보가 너무 많고, 블로그 후기를 하나씩 읽으며 분위기와 가격대를 비교하는 과정이 번거롭다.

지민은 플레이스픽 AI에 다음과 같이 입력한다.

```text
강남역에서 친구 4명이 갈 만한 조용한 음식점 추천해줘.
1인 2만 원대였으면 좋겠고, 너무 시끄러운 곳은 싫어.
```

Spring Boot API 서버는 이 요청을 바로 처리하지 않고 먼저 **추천 작업 Job**을 생성한다.

```text
추천 작업 ID: rec_001
상태: PENDING
```

이후 Spring Worker가 Redis Streams에서 추천 작업 이벤트를 소비해 비동기로 처리한다.

```text
조건 분석 중
네이버 지역 검색 중
블로그 문맥 분석 중
후보 점수 계산 중
추천 문장 생성 중
완료
```

지민의 화면에는 Spring MVC의 SSE 엔드포인트를 통해 추천 진행 상태가 실시간으로 표시된다. Spring Framework의 `SseEmitter`는 Server-Sent Events 전송을 위한 `ResponseBodyEmitter` 특화 구현이며, 객체를 SSE `data` 라인 형태로 보낼 수 있다. ([Home][2])

추천이 완료되면 서비스는 후보 3개를 보여준다.

```text
1위 A식당
2위 B식당
3위 C식당
```

지민은 공유 링크를 친구들에게 보낸다. 친구들은 링크에 들어와 후보별로 좋아요, 별로예요, 의견을 남긴다.

```text
친구 1: A식당 좋음
친구 2: B식당이 더 가까움
친구 3: C식당은 웨이팅 있을 것 같음
```

서비스는 이 투표와 피드백을 이벤트로 수집한다.

```text
vote.submitted
place.clicked
share.opened
feedback.submitted
```

그리고 실시간으로 후보 점수를 다시 계산한다.

```text
A식당: 87점
B식당: 84점 → 친구 투표 반영 후 89점
C식당: 78점
```

최종적으로 서비스는 단체 합의에 가장 적합한 장소를 다시 추천한다.

```text
최종 추천: B식당
이유: 친구 2명이 선호했고, 접근성과 가격 조건이 가장 안정적입니다.
```

---

# 6. 핵심 기능 도출

## 6-1. 사용자 기능

| 기능                  | 설명                               | 필요 이유                |
| ------------------- | -------------------------------- | -------------------- |
| 자연어 조건 입력           | 사용자가 모임 조건을 문장으로 입력              | 복잡한 필터 없이 빠르게 진입     |
| AI 조건 추출            | 지역, 인원, 장소 유형, 예산, 분위기, 회피 조건 추출 | 검색 쿼리 생성과 점수화의 기준    |
| 네이버 지역 검색 기반 후보 수집  | 실제 네이버 지역 검색 결과에서 장소 후보 확보       | AI가 장소를 상상하지 않도록 제한  |
| 네이버 블로그 검색 기반 문맥 요약 | 분위기, 웨이팅, 가성비, 단체 가능성 등 문맥 추출    | 사용자가 직접 후기를 읽는 부담 감소 |
| 조건 기반 점수화           | 사용자 조건에 맞춰 후보별 점수 계산             | 추천 이유를 납득 가능하게 만듦    |
| 후보 3개 추천            | 최종 후보를 3개로 압축                    | 선택 피로 감소             |
| 추천 이유·주의점 생성        | 각 후보의 장점과 리스크 설명                 | 사용자의 신뢰 확보           |
| 공유 링크 생성            | 친구들에게 후보를 공유                     | 단체 의사결정으로 연결         |
| 공유방 투표              | 친구들이 후보별 의견 제출                   | 실시간 합의 기능 구현         |
| 최종 합의 장소 재추천        | 투표와 조건을 반영해 최종 순위 조정             | 개인 추천에서 단체 결정으로 확장   |

기존 기획에서도 플레이스픽 AI는 기존 네이버 검색과 달리 검색 결과 목록을 그대로 보여주는 것이 아니라 후보 3개로 압축하고, 블로그 문맥을 요약하며, 사용자가 직접 작성해야 하는 단체방 공유 문장을 자동 생성하는 차별점을 갖는다고 정리했다. 

## 6-2. Spring 백엔드 고도화 기능

| 기능                 | Spring 구현 방식                                   | 보여줄 수 있는 역량      |
| ------------------ | ---------------------------------------------- | ---------------- |
| 추천 작업 Job 처리       | Spring Web MVC + JPA로 `recommendation_jobs` 저장 | 비동기 처리 설계        |
| Redis Streams 기반 큐 | Spring Data Redis Streams                      | 이벤트 기반 아키텍처      |
| Worker 분리          | Spring Bean Consumer 또는 별도 Worker 모듈           | 확장 가능한 서버 구조     |
| Redis 캐싱           | Spring Cache + Redis                           | 성능 최적화           |
| API 호출량 제한         | Redis Counter + Spring Interceptor/Filter      | 외부 API 보호, 비용 제어 |
| SSE 추천 진행 상태       | Spring MVC `SseEmitter`                        | 실시간 서버 푸시        |
| 공유방 투표 이벤트 처리      | REST API + Redis Streams 이벤트 발행                | 실시간 협업 기능        |
| 이벤트 로그 저장          | JPA로 `event_logs` 저장                           | 데이터 수집 설계        |
| 실시간 통계 대시보드        | Aggregator Worker + PostgreSQL 집계              | 운영·관측 역량         |
| Retry / DLQ        | Retry Stream, DLQ Stream, 상태 테이블               | 장애 대응            |
| 부하 테스트             | k6 + Mock Naver API + Mock LLM API             | 대용량 처리 검증        |

기존 최종안에서도 추천 작업 Job 처리, Redis Streams 기반 큐, Redis 캐싱, API 호출량 제한, SSE, 이벤트 로그, 대시보드, Retry/DLQ, Mock API 기반 부하 테스트가 백엔드 고도화 기능으로 정리되어 있었다. 

---

# 7. 우선순위와 MVP

## MVP 목표

**사용자가 모임 조건을 자연어로 입력하면, AI가 조건을 추출하고 네이버 지역·블로그 검색 결과를 바탕으로 후보 3개를 추천하며, 공유 링크에서 친구들이 후보에 투표할 수 있게 한다.**

## MVP 핵심 기능 3개

### MVP 1순위. 자연어 조건 입력 및 AI 조건 추출

입력 예시:

```text
토요일 오후에 성수역에서 친구 3명이 갈 카페 추천해줘.
오래 앉아있을 수 있고 너무 시끄럽지 않았으면 좋겠어.
```

출력 예시:

```json
{
  "location": "성수역",
  "people_count": 3,
  "place_type": "카페",
  "purpose": "친구 모임",
  "preferences": ["오래 앉기 좋음", "조용함"],
  "avoid": ["시끄러운 곳"]
}
```

Spring 구현 기준:

```text
Controller: RecommendationController
Service: ConditionExtractionService
Client: LlmClient
DTO: RecommendationCreateRequest, ExtractedConditionResponse
```

### MVP 2순위. 네이버 지역·블로그 검색 기반 후보 수집

조건 추출 결과를 바탕으로 네이버 지역 검색에서 장소 후보를 가져오고, 블로그 검색으로 분위기 문맥을 확인한다.

네이버 지역 검색은 네이버 지역 서비스에 등록된 업체 및 기관 검색 결과를 XML 또는 JSON 형식으로 반환하는 RESTful API이며, 검색 API의 하루 호출 한도는 25,000회로 안내되어 있다. ([네이버 개발자][3]) 네이버 블로그 검색도 네이버 검색의 블로그 검색 결과를 XML 또는 JSON으로 반환하며, 검색 API의 하루 호출 한도는 25,000회로 안내되어 있다. ([네이버 개발자][4])

Spring 구현 기준:

```text
Client: NaverLocalSearchClient, NaverBlogSearchClient
HTTP Client: RestClient 또는 WebClient
Cache: Redis
Entity: PlaceCandidate, BlogContext
```

외부 REST API 호출은 Spring의 `RestClient` 또는 `WebClient`를 사용한다. Spring Framework 공식 문서는 REST 클라이언트로 `RestClient`, `WebClient`, `RestTemplate` 등을 설명하며, 비동기·스트리밍 시나리오에는 WebClient를 고려할 수 있다고 안내한다. ([Home][5])

### MVP 3순위. 후보 3개 추천 및 공유방 투표

수집한 후보를 조건별로 점수화하고 최종 3개를 추천한다. 이후 사용자는 공유 링크를 친구들에게 보내고, 친구들은 후보별로 투표한다.

Spring 구현 기준:

```text
Service: RecommendationScoringService
Service: RecommendationResultService
Service: DecisionRoomService
Controller: DecisionRoomController
Entity: RecommendationResult, DecisionRoom, PlaceVote
```

기존 기획에서도 MVP는 “자연어 조건 입력 → AI 조건 추출”, “네이버 지역·블로그 검색 기반 후보 3개 추천”, “공유 링크에서 친구들이 후보 투표” 세 가지로 좁히는 것이 적절하다고 정리되어 있었다. 

---

# 8. AI 설계

## 8-1. AI가 하는 일

| 단계        | AI 역할                                         |
| --------- | --------------------------------------------- |
| 조건 추출     | 사용자의 자연어 입력에서 지역, 인원, 예산, 목적, 분위기, 회피 조건 추출   |
| 검색 쿼리 생성  | “강남역 조용한 음식점”, “강남역 4인 모임 음식점”처럼 검색어 생성       |
| 블로그 문맥 요약 | 블로그 검색 결과 제목·요약에서 분위기, 웨이팅, 가성비, 단체 가능성 신호 추출 |
| 추천 이유 생성  | 점수화 결과를 사람이 이해하기 쉬운 문장으로 설명                   |
| 공유 문장 생성  | 단체방에 보낼 수 있는 짧은 요약 생성                         |

## 8-2. AI가 하지 않는 일

| 금지 항목          | 이유                    |
| -------------- | --------------------- |
| 존재하지 않는 장소 생성  | AI 환각 방지              |
| 확인하지 못한 가격 단정  | 검색 결과만으로 정확한 가격 확정 불가 |
| 실제 예약 가능 여부 단정 | 예약 연동을 MVP에서 제외       |
| 실제 혼잡도 단정      | 실시간 웨이팅 데이터 없음        |
| 자체 추천 모델 학습    | GPU 학습 없이 구현해야 함      |

추천은 반드시 **네이버 검색 결과에 존재하는 후보 안에서만** 수행한다. 기존 기획에서도 일반 LLM 챗봇과 달리 LLM이 장소를 상상해서 추천하지 않고, 네이버 검색 결과에 있는 후보만 추천해야 한다고 정리되어 있었다. 

---

# 9. 추천 점수 설계

## 9-1. 기본 점수표

| 평가 항목     | 판단 방식                                  | 기본 배점 |
| --------- | -------------------------------------- | ----: |
| 지역 적합성    | 사용자가 입력한 지역과 주소·장소명이 맞는가               |    25 |
| 장소 유형 적합성 | 카페, 음식점, 술집 등 조건과 일치하는가                |    15 |
| 목적 적합성    | 데이트, 친구 모임, 회식, 스터디 목적과 맞는가            |    20 |
| 분위기 적합성   | 블로그 문맥에서 조용함, 대화 가능성, 감성적 분위기 등이 확인되는가 |    25 |
| 예산 적합성    | 가격 관련 문맥이 사용자 예산과 충돌하지 않는가             |    10 |
| 근거 신뢰도    | 여러 검색 결과에서 유사 표현이 반복되는가                |     5 |
| 리스크 감점    | 웨이팅, 시끌벅적함, 협소함, 가격 부담 등               | -15까지 |

## 9-2. 추천 문장 원칙

금지 표현:

```text
무조건 만족합니다.
실제로 조용합니다.
웨이팅이 없습니다.
예약 가능합니다.
가격은 정확히 2만 원입니다.
```

허용 표현:

```text
검색 문맥상 조용한 분위기와 관련된 표현이 반복됩니다.
금요일 저녁에는 혼잡 가능성이 있어 방문 전 확인이 필요합니다.
예산 조건과 크게 충돌하지 않는 후보로 판단됩니다.
```

이 원칙은 Spring 서비스 레이어에서도 검증 규칙으로 둘 수 있다.

```text
RecommendationReasonPolicy
- 단정 표현 필터링
- “검색 문맥상”, “가능성”, “확인 필요” 표현 강제
- 확인 불가 정보는 caution 필드로 분리
```

---

# 10. Spring Boot 시스템 설계

## 10-1. 최종 아키텍처

```text
[Client: Next.js / React]
  ├─ 자연어 추천 요청
  ├─ 추천 진행 상태 SSE 구독
  ├─ 추천 결과 확인
  ├─ 공유 링크 생성
  └─ 투표·클릭·피드백 이벤트 전송

[Spring Boot API Server]
  ├─ Spring Web MVC REST API
  ├─ 요청 검증
  ├─ 사용자별 Rate Limit Interceptor
  ├─ Recommendation Job 생성
  ├─ Redis Streams 이벤트 발행
  ├─ 추천 결과 조회 API
  ├─ 공유방 생성 API
  └─ SseEmitter 기반 SSE Endpoint

[Spring Worker]
  ├─ Redis Streams Consumer
  ├─ LLM 조건 추출
  ├─ 네이버 지역 검색 호출
  ├─ 네이버 블로그 검색 호출
  ├─ 후보 중복 제거
  ├─ 조건 기반 점수화
  ├─ 추천 이유 생성
  ├─ 결과 저장
  ├─ 실패 시 Retry
  └─ 반복 실패 시 DLQ 이동

[Redis]
  ├─ Streams: recommendation-events
  ├─ Cache: 검색 결과 / 블로그 문맥 / 추천 결과
  ├─ Rate Limit Counter
  └─ SSE 진행 상태 저장 또는 Pub/Sub

[PostgreSQL]
  ├─ recommendation_jobs
  ├─ place_candidates
  ├─ blog_contexts
  ├─ recommendation_results
  ├─ decision_rooms
  ├─ place_votes
  ├─ event_logs
  └─ api_quota_usages

[Monitoring]
  ├─ Spring Boot Actuator
  ├─ Micrometer
  ├─ Prometheus
  ├─ Grafana
  └─ OpenTelemetry

[Test]
  ├─ JUnit 5
  ├─ Testcontainers
  ├─ WireMock 또는 MockWebServer
  └─ k6
```

Spring Data Redis는 Redis Streams의 레코드 추가와 소비 기능을 지원하며, Redis Streams는 로그 구조처럼 동작하는 스트림 데이터 구조다. ([Home][6]) Redis 공식 문서도 Redis Stream을 append-only log처럼 동작하면서 consumer group 같은 복잡한 소비 전략을 제공하는 자료구조로 설명한다. ([Redis][7])

## 10-2. Spring 모듈 구성

처음부터 마이크로서비스로 나누지 않는다. 포트폴리오 완성도를 위해 **모듈형 모놀리식 Spring Boot**로 시작한다.

```text
placepick-api
 ├─ recommendation
 ├─ place
 ├─ decisionroom
 ├─ event
 ├─ naver
 ├─ llm
 ├─ ratelimit
 ├─ monitoring
 └─ common
```

추후 고도화 시 다음처럼 분리할 수 있다.

```text
placepick-api-server
placepick-worker
placepick-aggregator
placepick-mock-api
```

## 10-3. 추천 처리 흐름

```text
1. 사용자가 자연어 추천 요청
2. RecommendationController가 요청 검증
3. RecommendationApplicationService가 recommendation_job 저장
4. RecommendationEventPublisher가 Redis Streams에 recommendation.requested 발행
5. API 서버는 jobId를 즉시 반환
6. RecommendationWorker가 Redis Streams에서 이벤트 소비
7. LlmClient로 조건 추출
8. NaverLocalSearchClient로 장소 후보 수집
9. NaverBlogSearchClient로 블로그 문맥 수집
10. RecommendationScoringService가 점수화
11. LlmClient가 추천 이유와 공유 문장 생성
12. RecommendationResultRepository가 결과 저장
13. ProgressEventService가 SSE로 진행 상태 전송
14. 사용자는 공유방 생성
15. 친구들은 투표 제출
16. VoteEventConsumer가 투표 이벤트를 반영해 최종 점수 재계산
```

---

# 11. Spring 기술 스택

| 영역                  | 최종 기술                                                      |
| ------------------- | ---------------------------------------------------------- |
| Language            | Java 21                                                    |
| Backend Framework   | Spring Boot                                                |
| Web                 | Spring Web MVC                                             |
| External API Client | RestClient 또는 WebClient                                    |
| ORM                 | Spring Data JPA                                            |
| Query               | QueryDSL 또는 JPA Specification                              |
| DB                  | PostgreSQL                                                 |
| Cache               | Spring Cache + Redis                                       |
| Event Queue         | Spring Data Redis Streams                                  |
| Real-time Progress  | SseEmitter                                                 |
| Real-time Vote 확장   | Spring WebSocket / STOMP                                   |
| Rate Limit          | Redis Counter + HandlerInterceptor 또는 OncePerRequestFilter |
| Monitoring          | Spring Boot Actuator + Micrometer + Prometheus + Grafana   |
| Tracing             | OpenTelemetry                                              |
| Test                | JUnit 5 + Testcontainers                                   |
| Load Test           | k6                                                         |
| Local Infra         | Docker Compose                                             |
| External Data       | NAVER API HUB Search API: 지역 검색, 블로그 검색                    |
| AI                  | 사용 가능한 LLM API                                             |

Spring Boot Actuator는 Micrometer 기반 메트릭과 연동되며, Spring Boot 문서도 메트릭 기능에서 Micrometer 역량을 참고하도록 안내한다. ([Home][8]) Micrometer의 Prometheus 문서에 따르면 Spring Boot 애플리케이션에서는 Actuator가 있을 때 Prometheus actuator endpoint가 자동 구성될 수 있다. ([docs.micrometer.io][9])

Testcontainers는 Docker 컨테이너 안에서 실행되는 외부 서비스를 테스트에 사용할 수 있게 하며, JUnit과 통합되어 테스트 시작 전에 컨테이너를 띄울 수 있다고 Spring Boot 문서가 설명한다. ([Home][10])

---

# 12. API 설계

## 12-1. 추천 요청 생성

```http
POST /api/v1/recommendations
```

요청:

```json
{
  "query": "강남역에서 친구 4명이 갈 조용한 음식점 추천해줘. 1인 2만 원대였으면 좋겠어.",
  "sessionId": "anonymous_001"
}
```

응답:

```json
{
  "jobId": "rec_001",
  "status": "PENDING"
}
```

Spring 구성:

```text
RecommendationController#createRecommendation()
RecommendationCreateRequest
RecommendationCreateResponse
RecommendationApplicationService#createJob()
RecommendationEventPublisher#publishRequested()
```

## 12-2. 추천 진행 상태 구독

```http
GET /api/v1/recommendations/{jobId}/events
```

SSE 응답 예시:

```text
event: progress
data: {"step":"CONDITION_EXTRACTED","message":"조건 분석이 완료되었습니다.","progress":20}

event: progress
data: {"step":"LOCAL_SEARCH_DONE","message":"장소 후보를 찾았습니다.","progress":45}

event: progress
data: {"step":"BLOG_CONTEXT_DONE","message":"블로그 문맥 분석이 완료되었습니다.","progress":70}

event: progress
data: {"step":"SCORING_DONE","message":"후보 점수 계산이 완료되었습니다.","progress":85}

event: completed
data: {"step":"COMPLETED","message":"추천 결과가 완성되었습니다.","progress":100}
```

Spring 구성:

```text
RecommendationProgressController#subscribe()
SseEmitterRegistry
ProgressEventService
```

## 12-3. 추천 결과 조회

```http
GET /api/v1/recommendations/{jobId}
```

응답:

```json
{
  "jobId": "rec_001",
  "status": "COMPLETED",
  "results": [
    {
      "rank": 1,
      "placeId": "place_001",
      "placeName": "A식당",
      "score": 87,
      "reason": "조용함과 대화하기 좋음 관련 문맥이 반복되어 친구 모임에 적합합니다.",
      "caution": "금요일 저녁에는 혼잡할 수 있어 방문 전 확인이 필요합니다.",
      "naverLink": "네이버 상세 링크"
    }
  ]
}
```

## 12-4. 공유방 생성

```http
POST /api/v1/recommendations/{jobId}/rooms
```

응답:

```json
{
  "roomId": "room_001",
  "shareUrl": "https://placepick.app/rooms/room_001"
}
```

## 12-5. 투표 제출

```http
POST /api/v1/rooms/{roomId}/votes
```

요청:

```json
{
  "placeId": "place_001",
  "vote": "LIKE",
  "reason": "조용해 보여서 좋음",
  "voterId": "anonymous_friend_001"
}
```

응답:

```json
{
  "roomId": "room_001",
  "placeId": "place_001",
  "vote": "LIKE",
  "updatedScore": 91
}
```

## 12-6. 이벤트 수집

```http
POST /api/v1/events
```

요청:

```json
{
  "eventType": "place.clicked",
  "jobId": "rec_001",
  "roomId": "room_001",
  "sessionId": "anonymous_001",
  "payload": {
    "placeId": "place_001",
    "rank": 1
  }
}
```

---

# 13. 데이터베이스 설계

## 13-1. `recommendation_jobs`

| 컬럼                     | 설명                                     |
| ---------------------- | -------------------------------------- |
| `id`                   | 추천 작업 ID                               |
| `session_id`           | 익명 사용자 세션                              |
| `raw_query`            | 사용자 원문 입력                              |
| `structured_condition` | LLM이 추출한 조건 JSON                       |
| `status`               | PENDING, PROCESSING, COMPLETED, FAILED |
| `created_at`           | 생성 시각                                  |
| `completed_at`         | 완료 시각                                  |

JPA Entity:

```text
RecommendationJob
- id
- sessionId
- rawQuery
- structuredCondition
- status
- createdAt
- completedAt
```

## 13-2. `place_candidates`

| 컬럼                 | 설명          |
| ------------------ | ----------- |
| `id`               | 후보 장소 ID    |
| `job_id`           | 추천 작업 ID    |
| `source`           | NAVER_LOCAL |
| `title`            | 장소명         |
| `category`         | 카테고리        |
| `address`          | 주소          |
| `road_address`     | 도로명 주소      |
| `naver_link`       | 네이버 상세 링크   |
| `mapx`             | 좌표값         |
| `mapy`             | 좌표값         |
| `raw_payload_hash` | 중복 제거용 해시   |

## 13-3. `blog_contexts`

| 컬럼                   | 설명           |
| -------------------- | ------------ |
| `id`                 | 문맥 ID        |
| `place_candidate_id` | 후보 장소 ID     |
| `positive_keywords`  | 긍정 키워드 JSON  |
| `risk_keywords`      | 리스크 키워드 JSON |
| `summary`            | 블로그 문맥 요약    |
| `source_count`       | 참고한 검색 결과 수  |

## 13-4. `recommendation_results`

| 컬럼                   | 설명       |
| -------------------- | -------- |
| `id`                 | 추천 결과 ID |
| `job_id`             | 추천 작업 ID |
| `place_candidate_id` | 장소 후보 ID |
| `rank`               | 추천 순위    |
| `score`              | 적합도 점수   |
| `reason`             | 추천 이유    |
| `caution`            | 주의점      |
| `share_text`         | 공유 문장    |

## 13-5. `decision_rooms`

| 컬럼           | 설명           |
| ------------ | ------------ |
| `id`         | 공유방 ID       |
| `job_id`     | 추천 작업 ID     |
| `status`     | OPEN, CLOSED |
| `created_at` | 생성 시각        |
| `closed_at`  | 종료 시각        |

## 13-6. `place_votes`

| 컬럼           | 설명            |
| ------------ | ------------- |
| `id`         | 투표 ID         |
| `room_id`    | 공유방 ID        |
| `place_id`   | 후보 장소 ID      |
| `voter_id`   | 익명 투표자 ID     |
| `vote_type`  | LIKE, DISLIKE |
| `reason`     | 투표 이유         |
| `created_at` | 투표 시각         |

## 13-7. `event_logs`

| 컬럼                | 설명          |
| ----------------- | ----------- |
| `id`              | 이벤트 ID      |
| `event_type`      | 이벤트 종류      |
| `job_id`          | 추천 작업 ID    |
| `room_id`         | 공유방 ID      |
| `session_id`      | 익명 세션 ID    |
| `payload`         | 이벤트 상세 JSON |
| `idempotency_key` | 중복 처리 방지 키  |
| `created_at`      | 발생 시각       |

## 13-8. `api_quota_usages`

| 컬럼            | 설명                                    |
| ------------- | ------------------------------------- |
| `provider`    | NAVER, LLM                            |
| `api_name`    | localSearch, blogSearch, generateText |
| `usage_date`  | 기준 날짜                                 |
| `used_count`  | 사용량                                   |
| `limit_count` | 제한량                                   |

---

# 14. Redis Streams 이벤트 설계

## 14-1. Stream 구성

```text
Stream: recommendation-events
Consumer Group: recommendation-workers

Stream: user-events
Consumer Group: event-aggregators

Stream: dead-letter-events
Consumer Group: dlq-workers
```

## 14-2. 추천 작업 이벤트

```json
{
  "eventId": "evt_001",
  "eventType": "recommendation.requested",
  "jobId": "rec_001",
  "sessionId": "anonymous_001",
  "payload": {
    "query": "강남역에서 친구 4명이 갈 조용한 음식점 추천해줘"
  },
  "createdAt": "2026-07-09T20:10:00+09:00"
}
```

## 14-3. 사용자 행동 이벤트

```json
{
  "eventId": "evt_002",
  "eventType": "vote.submitted",
  "roomId": "room_001",
  "jobId": "rec_001",
  "sessionId": "anonymous_friend_001",
  "payload": {
    "placeId": "place_001",
    "vote": "LIKE",
    "reason": "조용해 보여서 좋음"
  },
  "idempotencyKey": "room_001:anonymous_friend_001:place_001"
}
```

## 14-4. 이벤트 종류

| 이벤트명                       | 발생 시점         | 활용           |
| -------------------------- | ------------- | ------------ |
| `recommendation.requested` | 사용자가 추천 요청    | 요청량 분석       |
| `condition.extracted`      | AI 조건 추출 완료   | 조건 추출 성공률 분석 |
| `naver.local.called`       | 네이버 지역 검색 호출  | API 사용량 관리   |
| `naver.blog.called`        | 네이버 블로그 검색 호출 | API 사용량 관리   |
| `recommendation.completed` | 추천 완료         | 처리 시간 분석     |
| `recommendation.failed`    | 추천 실패         | 장애 분석        |
| `share.created`            | 공유 링크 생성      | 공유 전환 분석     |
| `share.opened`             | 친구가 공유 링크 접속  | 참여율 분석       |
| `place.clicked`            | 장소 상세 링크 클릭   | 추천 품질 분석     |
| `vote.submitted`           | 친구가 후보에 투표    | 실시간 합의 반영    |
| `feedback.submitted`       | 만족/불만 피드백 제출  | 추천 개선 지표     |

대용량 처리는 네이버 API를 대량 호출하는 방식이 아니라 내부 이벤트를 스트림으로 처리하는 방식으로 보여준다. 기존 검토에서도 대용량성을 보여주려면 클릭, 공유, 피드백, 투표, 추천 요청, API 호출 로그를 이벤트 데이터로 다뤄야 한다고 정리되어 있었다. 

---

# 15. 캐싱과 호출량 제어

## 15-1. 캐싱 대상

| 캐시 대상     | Redis Key 예시                     |    TTL |
| --------- | -------------------------------- | -----: |
| 지역 검색 결과  | `local:강남역:음식점`                  | 6~24시간 |
| 블로그 문맥 요약 | `blog-context:A식당:강남역`           |   1~7일 |
| 조건 추출 결과  | `condition-hash:{hash}`          |    1시간 |
| 추천 결과     | `recommendation:{conditionHash}` |  1~6시간 |
| 인기 지역 집계  | `trending:areas:10m`             |   1~5분 |

## 15-2. 호출량 관리

검색 1회당 호출량은 제한한다.

| 작업                  | 호출 수 |
| ------------------- | ---: |
| 지역 검색 쿼리 3개         |   3회 |
| 상위 후보 5개에 대한 블로그 검색 |   5회 |
| 총 호출 수              | 약 8회 |

하루 100명이 1인당 3번 검색한다고 가정하면 다음과 같다.

```text
100명 × 3회 검색 × 8 API 호출 = 하루 2,400회
```

기존 기획에서도 검색 1회당 지역 검색 3회와 후보 5개에 대한 블로그 검색 5회, 총 약 8회 호출로 제한하는 방식이 제안되어 있었다. 

## 15-3. Spring Rate Limiter 정책

```text
사용자별 제한:
rate:user:{sessionId}:minute
분당 5회

네이버 검색 API 일별 제한:
rate:naver-search:{yyyy-MM-dd}
일 최대 25,000회 기준으로 관리

LLM API 제한:
rate:llm:{yyyy-MM-dd}
예산 또는 토큰 사용량 기준으로 관리
```

Spring 구현 방식:

```text
RateLimitInterceptor
RateLimitService
RedisRateLimitRepository
ApiQuotaUsageRepository
```

처리 흐름:

```text
1. API 요청 진입
2. RateLimitInterceptor가 sessionId 기준 요청량 확인
3. 외부 API 호출 전 Redis quota counter 확인
4. 한도 이내면 호출
5. 한도 초과 또는 임계치 근접 시 캐시 우선 반환
6. 캐시도 없으면 제한 안내 응답
```

---

# 16. 비용 및 범위 정책

## 16-1. MVP에서 사용하는 것

| 항목          | 사용 여부 | 판단                         |
| ----------- | ----- | -------------------------- |
| LLM API     | 사용    | 이미 사용 가능한 API 전제           |
| 네이버 지역 검색   | 사용    | 검색 API 무료 한도 내 사용          |
| 네이버 블로그 검색  | 사용    | 검색 API 무료 한도 내 사용          |
| Spring Boot | 사용    | 메인 백엔드                     |
| PostgreSQL  | 사용    | 추천 작업·결과·이벤트 저장            |
| Redis       | 사용    | Streams, Cache, Rate Limit |
| 지도 화면       | 미사용   | MVP 제외                     |
| 길찾기         | 미사용   | MVP 제외                     |
| 자체 AI 학습    | 미사용   | GPU 불필요                    |
| 로그인         | 미사용   | 익명 세션 기반                   |
| 결제          | 미사용   | MVP 제외                     |

## 16-2. 지도·길찾기를 제외하는 이유

기존 기획에서도 MVP에서는 지도 화면, 길찾기, 실시간 이동 시간 계산을 제외하고 네이버 지역 검색 결과의 장소명·주소·링크를 활용하는 방식이 안전하다고 정리되어 있었다. 

최종 Spring 버전에서도 이 판단을 유지한다. 지도 기능은 사용자 경험에는 좋지만, 본 프로젝트의 포트폴리오 핵심은 다음이다.

```text
Spring Boot API 설계
Redis Streams 비동기 파이프라인
SSE 실시간 진행 상태
Redis 캐싱
Rate Limiting
JPA 기반 데이터 모델링
이벤트 로그 수집
관측성
부하 테스트
```

---

# 17. Spring 패키지 구조

```text
com.placepick
 ├── recommendation
 │    ├── api
 │    ├── application
 │    ├── domain
 │    ├── infra
 │    └── worker
 │
 ├── place
 │    ├── domain
 │    ├── application
 │    └── infra
 │
 ├── naver
 │    ├── client
 │    ├── dto
 │    └── config
 │
 ├── llm
 │    ├── client
 │    ├── prompt
 │    └── dto
 │
 ├── decisionroom
 │    ├── api
 │    ├── application
 │    ├── domain
 │    └── infra
 │
 ├── event
 │    ├── producer
 │    ├── consumer
 │    ├── domain
 │    └── infra
 │
 ├── ratelimit
 │    ├── interceptor
 │    ├── application
 │    └── infra
 │
 ├── monitoring
 │    └── metric
 │
 └── common
      ├── exception
      ├── response
      ├── config
      └── util
```

## 패키지별 책임

| 패키지              | 책임                             |
| ---------------- | ------------------------------ |
| `recommendation` | 추천 요청, Job 생성, 점수화, 추천 결과 관리   |
| `place`          | 장소 후보, 블로그 문맥, 중복 제거           |
| `naver`          | 네이버 지역·블로그 검색 API 호출           |
| `llm`            | 조건 추출, 문맥 요약, 추천 이유 생성         |
| `decisionroom`   | 공유방, 투표, 최종 합의 결과              |
| `event`          | Redis Streams 발행·소비, 이벤트 로그 저장 |
| `ratelimit`      | 사용자별·API별 호출량 제한               |
| `monitoring`     | 커스텀 메트릭, 큐 지연, 캐시 히트율          |
| `common`         | 공통 예외, 응답 포맷, 설정               |

---

# 18. 장애 대응 설계

## 18-1. 실패 상황과 대응

| 실패 상황               | 대응                        |
| ------------------- | ------------------------- |
| 네이버 API 타임아웃        | 최대 2회 재시도 후 fallback      |
| LLM API 실패          | 템플릿 기반 추천 문장 생성           |
| 블로그 검색 실패           | 지역 검색 후보만으로 추천            |
| Redis Streams 처리 실패 | retry stream으로 이동         |
| 반복 실패               | dead-letter-events로 이동    |
| 중복 이벤트              | idempotency key로 중복 처리 방지 |
| API 한도 초과           | 캐시 결과 반환 또는 제한 안내         |
| SSE 연결 끊김           | 클라이언트 재연결 시 현재 job 상태 재전송 |

## 18-2. 상태값

```text
PENDING
PROCESSING
CONDITION_EXTRACTED
LOCAL_SEARCH_DONE
BLOG_CONTEXT_DONE
SCORING_DONE
LLM_GENERATION_DONE
COMPLETED
FAILED
```

## 18-3. 실패 이벤트 예시

```json
{
  "eventType": "recommendation.failed",
  "jobId": "rec_001",
  "reason": "NAVER_API_TIMEOUT",
  "retryCount": 2,
  "fallbackUsed": true
}
```

---

# 19. 모니터링과 관측성

## 19-1. 수집할 메트릭

| 메트릭                               | 의미           |
| --------------------------------- | ------------ |
| `recommendation_requests_total`   | 전체 추천 요청 수   |
| `recommendation_completed_total`  | 완료된 추천 수     |
| `recommendation_failed_total`     | 실패한 추천 수     |
| `recommendation_duration_seconds` | 추천 생성 시간     |
| `naver_api_calls_total`           | 네이버 API 호출 수 |
| `naver_api_errors_total`          | 네이버 API 실패 수 |
| `llm_api_calls_total`             | LLM API 호출 수 |
| `cache_hit_total`                 | 캐시 히트 수      |
| `cache_miss_total`                | 캐시 미스 수      |
| `redis_stream_pending_total`      | 처리 대기 이벤트 수  |
| `worker_retry_total`              | 재시도 횟수       |
| `dlq_events_total`                | DLQ 적재 이벤트 수 |

## 19-2. Grafana 대시보드

```text
1. 분당 추천 요청 수
2. 추천 성공률
3. 추천 생성 시간 p50 / p95 / p99
4. 네이버 API 호출량
5. LLM API 호출량
6. 캐시 히트율
7. Redis Streams pending count
8. 실패 이벤트 목록
9. 인기 검색 지역 TOP 10
10. 공유방 투표 참여율
```

기존 최종안에서도 포트폴리오 강조점은 단순 CRUD나 API 연동이 아니라, 추천 요청을 Job으로 등록하고 Redis Streams 기반 비동기 파이프라인, Redis Cache, Rate Limiter, Prometheus/Grafana, k6 테스트로 성능과 안정성을 검증하는 구조라고 정리되어 있었다. 

---

# 20. 테스트와 부하 테스트

## 20-1. 테스트 전략

| 테스트        | 도구                                | 목적                           |
| ---------- | --------------------------------- | ---------------------------- |
| 단위 테스트     | JUnit 5                           | 점수화 로직, 조건 파싱 로직 검증          |
| 통합 테스트     | Spring Boot Test + Testcontainers | PostgreSQL, Redis 연동 검증      |
| 외부 API 테스트 | WireMock 또는 MockWebServer         | 네이버 API, LLM API 실패·지연 상황 검증 |
| 이벤트 테스트    | Redis Testcontainer               | Stream 발행·소비·ACK 검증          |
| 부하 테스트     | k6                                | 추천 요청 생성 API, Worker 처리량 검증  |

Spring Boot의 Testcontainers 문서는 Docker 컨테이너로 실제 백엔드 서비스를 띄워 통합 테스트를 작성할 수 있다고 설명한다. ([Home][10])

## 20-2. 부하 테스트 원칙

실제 네이버 API에 부하 테스트를 걸지 않는다.

대신 다음 구조로 테스트한다.

```text
k6
 → Spring Boot API Server
 → Redis Streams
 → Spring Worker
 → Mock Naver API
 → Mock LLM API
 → PostgreSQL
 → Redis Cache
```

## 20-3. 테스트 시나리오

```text
시나리오 1. 추천 요청 생성 부하
- 동시 사용자 100명, 500명, 1,000명
- POST /api/v1/recommendations p95 측정
- job 생성 성공률 측정

시나리오 2. Worker 처리량 비교
- 추천 작업 10,000개 생성
- Worker 1개, 3개, 5개로 확장
- 처리량, queue pending, 실패율 비교

시나리오 3. 캐시 적용 전후 비교
- 동일 검색어 반복 요청
- 네이버 API 호출 감소율
- LLM API 호출 감소율
- 추천 완료 시간 개선율 측정
```

---

# 21. 성공 지표

## 21-1. 서비스 지표

| 지표                 |            목표 |
| ------------------ | ------------: |
| 첫 추천 결과 생성 시간      |        30초 이내 |
| 후보 3개 중 하나를 클릭한 비율 |        40% 이상 |
| 공유 링크 생성률          |        30% 이상 |
| 공유방 투표 참여율         |        40% 이상 |
| 최종 장소 선택률          |        30% 이상 |
| 추천 만족도             | 5점 만점 중 4점 이상 |
| 재검색 비율             |        50% 이하 |

## 21-2. Spring 백엔드 지표

| 지표                          |                목표 |
| --------------------------- | ----------------: |
| 추천 요청 생성 API p95 응답 시간      |          200ms 이하 |
| 추천 작업 평균 완료 시간              |             5초 이내 |
| 추천 작업 p95 완료 시간             |            10초 이내 |
| Redis 캐시 히트율                |            50% 이상 |
| 네이버 API 호출 감소율              | 캐시 적용 전 대비 40% 이상 |
| 추천 실패율                      |             3% 이하 |
| Redis Streams pending count |        지속 증가하지 않음 |
| DLQ 적재율                     |             1% 이하 |

---

# 22. 개발 범위

## 22-1. 1차 MVP 개발 범위

| 기능               | Spring 구현 내용                                    |
| ---------------- | ----------------------------------------------- |
| 자연어 입력           | `RecommendationController`                      |
| 조건 추출            | `LlmClient`, `ConditionExtractionService`       |
| 추천 Job 생성        | `RecommendationJob` Entity, JPA Repository      |
| Redis Streams 발행 | `RecommendationEventPublisher`                  |
| Worker 처리        | `RecommendationWorker`                          |
| 네이버 지역 검색        | `NaverLocalSearchClient`                        |
| 네이버 블로그 검색       | `NaverBlogSearchClient`                         |
| 후보 중복 제거         | `PlaceCandidateDeduplicationService`            |
| 점수화              | `RecommendationScoringService`                  |
| 추천 결과 저장         | `RecommendationResultRepository`                |
| SSE 진행 상태        | `SseEmitterRegistry`, `ProgressEventService`    |
| 공유방 생성           | `DecisionRoomController`, `DecisionRoomService` |
| 투표 기능            | `PlaceVote` Entity, `VoteService`               |
| 투표 반영 재계산        | `VoteScoreRecalculationService`                 |

## 22-2. 2차 고도화 개발 범위

| 기능          | Spring 구현 내용                     |
| ----------- | -------------------------------- |
| Redis 캐싱    | Spring Cache + Redis             |
| API 호출량 제한  | Redis Counter + Interceptor      |
| 이벤트 로그 저장   | `EventLog` Entity                |
| 실시간 통계 대시보드 | Aggregator Worker + API          |
| Retry / DLQ | retry stream, dead-letter stream |
| 모니터링        | Actuator + Micrometer            |
| 트레이싱        | OpenTelemetry                    |
| 부하 테스트      | k6 + Mock API                    |
| 통합 테스트      | Testcontainers                   |

## 22-3. MVP에서 제외할 기능

| 제외 기능        | 제외 이유                         |
| ------------ | ----------------------------- |
| 지도 화면 표시     | 비용·구현 범위 증가                   |
| 길찾기·이동 시간 계산 | Maps/Directions API 호출량 관리 필요 |
| 실시간 위치 추적    | 개인정보 부담 큼                     |
| 예약 연동        | 외부 제휴 필요                      |
| 결제           | 현재 문제와 직접 관련 낮음               |
| 로그인 기반 개인화   | MVP 검증 후 확장 가능                |
| 네이버 리뷰 크롤링   | 약관·권한 이슈 가능                   |
| 자체 AI 모델 학습  | GPU 학습이 필요하므로 조건과 불일치         |

---

# 23. 포트폴리오에서 강조할 점

포트폴리오에서는 다음 문장으로 설명한다.

> **플레이스픽 AI는 Spring Boot 기반의 네이버 검색 API 연계 AI 장소 의사결정 서비스입니다. 추천 요청을 동기 처리하지 않고 Job으로 등록한 뒤 Redis Streams 기반 비동기 파이프라인에서 LLM 조건 추출, 네이버 지역·블로그 검색, 후보 점수화, 추천 문장 생성을 처리합니다. 추천 진행 상태는 SseEmitter 기반 SSE로 전달하고, 공유방 투표·클릭·피드백 이벤트는 Redis Streams와 PostgreSQL에 저장해 실시간 집계합니다. Redis Cache와 Rate Limiter로 외부 API 호출량을 제어하고, Spring Boot Actuator, Micrometer, Prometheus, Grafana, k6 테스트로 성능과 안정성을 검증합니다.**

이 설명은 다음 백엔드 역량을 명확히 보여준다.

```text
Spring Boot REST API 설계
JPA 기반 도메인 모델링
Redis Streams 기반 이벤트 처리
비동기 Worker 설계
SSE 실시간 진행 상태 전송
Redis Cache와 Rate Limiter
외부 API 장애 대응
Idempotency와 DLQ
이벤트 로그 수집
관측성
부하 테스트
```

---

# 24. 최종 한 문장

**플레이스픽 AI는 Spring Boot, Redis Streams, PostgreSQL, 네이버 지역·블로그 검색 API, LLM API를 활용해 모임 장소 후보를 추천하고, 공유방 투표와 사용자 이벤트를 실시간으로 처리해 여러 사람의 장소 결정 과정을 줄여주는 GPU 학습 없는 이벤트 기반 AI 백엔드 플랫폼이다.**

[1]: https://www.ncloud.com/product/applicationService/naverApiHub?utm_source=chatgpt.com "NAVER API HUB - NAVER Cloud Platform 네이버 클라우드 ..."
[2]: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/servlet/mvc/method/annotation/SseEmitter.html?utm_source=chatgpt.com "SseEmitter (Spring Framework 7.0.8 API)"
[3]: https://developers.naver.com/docs/serviceapi/search/local/local.md?utm_source=chatgpt.com "검색 > 지역 - Search API - 네이버 개발자 센터"
[4]: https://developers.naver.com/docs/serviceapi/search/blog/blog.md?utm_source=chatgpt.com "검색 > 블로그 - Search API - 네이버 개발자 센터"
[5]: https://docs.spring.io/spring-framework/reference/integration/rest-clients.html?utm_source=chatgpt.com "REST Clients :: Spring Framework"
[6]: https://docs.spring.io/spring-data/redis/reference/redis/redis-streams.html?utm_source=chatgpt.com "Redis Streams"
[7]: https://redis.io/docs/latest/develop/data-types/streams/?utm_source=chatgpt.com "Redis Streams | Docs"
[8]: https://docs.spring.io/spring-boot/reference/actuator/metrics.html?utm_source=chatgpt.com "Metrics :: Spring Boot"
[9]: https://docs.micrometer.io/micrometer/reference/implementations/prometheus.html?utm_source=chatgpt.com "Micrometer Prometheus"
[10]: https://docs.spring.io/spring-boot/reference/testing/testcontainers.html?utm_source=chatgpt.com "Testcontainers :: Spring Boot"
