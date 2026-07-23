import '../models/analytics_event.dart';

/// 성공 지표 이벤트 로그 저장소.
///
/// 저장소 3종(quest·user·goal)과 **같은 패턴**이다(추상 인터페이스 + Firestore/
/// InMemory 2구현 + "기본값은 던진다" provider). 다른 점은 실패 정책이다:
///
/// **[log] 실패는 위로 던지지 않는다.** 계측은 부가 기능이라, 로그 저장 실패가
/// 완료·등록 같은 핵심 동작을 롤백시키면 안 된다. 그래서 구현은 실패를 삼킨다
/// (호출부도 트랜잭션과 분리해 성공한 뒤에만 부른다 — `core/analytics/analytics_logger.dart`).
///
/// [fetchEvents]는 지표 산출·테스트용 조회라 실패를 그대로 드러낸다(log와 반대).
abstract interface class AnalyticsRepository {
  /// 이벤트 1건을 기록한다. **어떤 실패도 던지지 않는다**(best-effort).
  Future<void> log(String uid, AnalyticsEvent event);

  /// 저장된 이벤트를 시각 순으로 돌려준다(산출·테스트용). 깨진 문서는 걸러진다.
  Future<List<AnalyticsEvent>> fetchEvents(String uid);
}
