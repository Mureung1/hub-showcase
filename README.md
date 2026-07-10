# 🛒 ThingDong (띵동) - 위치 기반 자취생 공동구매 플랫폼

대학생 및 1인 가구 자취생 밀집 지역을 위한 위치(지도 핀) 기반 소용량 공동구매 분할 플랫폼 프로젝트입니다.

---

## 📝 프로젝트 문서 바로가기

- [과제 마스터클래스 1일차 기획서 (Wiki)](<https://github.com/trudy-0/hub/wiki/Project%E2%80%90Plan:-%EB%9D%B5%EB%8F%99(ThingDong)-%EA%B8%B0%ED%9A%8D%EC%84%9C>)
- [Task 계획 및 백로그](https://app.notion.com/p/ThingDong-Task-399d79d01a098090bd8ef664d93c3d2f?source=copy_link)

---

## 🚀 서비스 핵심 요약

### ❌ 문제 정의 (Pain Point)

- **보관 공간 및 소비 속도의 한계:** 대용량 생필품이나 신선 식품 구매 시 단가는 저렴해지지만, 1인 가구 자취생은 원룸 내 적재 공간이 부족하고 소비 기한 내에 쓰지 못해 폐기 비용이 발생하는 딜레마가 있습니다.
- **기존 커뮤니티의 비정형성:** 당근마켓이나 에브리타임 등은 텍스트 대화에만 의존하여 신청, 승인, 정산, 픽업 프로세스를 방장이 수동 관리해야 하고, 노쇼(No-Show) 발생 시 대책이 없습니다.

### 🎯 해결책 및 핵심 기능 (Core Features)

- **JPA 연관 관계 기반 참여 매칭 시스템:** 다대다(N:M) 관계를 교차 엔티티(`UserGroupPurchase`)로 해소하고, 마감 임박 시 동시 신청 경쟁을 방지하기 위해 백엔드단에서 **비관적 락(Pessimistic Lock)**을 적용하여 정합성을 보장합니다.
- **5단계 실시간 상태 트래킹 시스템:** `모집 중(RECRUITING)` ➡️ `모집 완료(COMPLETED)` ➡️ `구매 및 배송(ORDERED)` ➡️ `픽업 대기(WAITING_PICKUP)` ➡️ `공구 종료(FINISHED)`로 이어지는 정형화된 파이프라인과 라이트 정산 가이드를 제공합니다.
- **지도 기반 픽업 위치 지정 (Pin Pointing):** 지도 API를 연동하여 소분 및 대면 픽업을 진행할 정확한 위도/경도 좌표를 명시하고 도보 거리를 계산합니다.

---

## 🛠️ 백엔드 아키텍처 및 기술 스택 (Tech Stack)

- **Frontend:** Next.js (Client 계층)
- **Backend:** Spring Boot, Spring Data JPA, Spring Security (JWT 인증)
- **Database:** MySQL (영속성 저장소)
- **Infrastructure (Advanced):** Redis (분산 락/캐시 후보), Firebase Cloud Messaging (푸시 알림), OpenAI API (상품 URL 기반 AI 추천 기능)
