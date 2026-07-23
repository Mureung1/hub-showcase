import '../../core/error/app_failure.dart';
import '../../models/analytics_event.dart';
import '../analytics_repository.dart';

/// Firebase 없이 도는 이벤트 로그 저장소.
class InMemoryAnalyticsRepository implements AnalyticsRepository {
  InMemoryAnalyticsRepository({this.failWith});

  /// 지정하면 **[fetchEvents]만** 이 실패를 던진다.
  /// [log]는 계측 격리 원칙상 failWith가 있어도 던지지 않는다(아래 주석 참고).
  final AppFailure? failWith;

  final Map<String, List<AnalyticsEvent>> _events = {};
  int _seq = 0;

  /// 테스트 전용 조회구(오래된 순).
  List<AnalyticsEvent> eventsOf(String uid) =>
      List.unmodifiable(_events[uid] ?? const []);

  @override
  Future<void> log(String uid, AnalyticsEvent event) async {
    // ⚠️ 계측은 부가 기능이라 **어떤 경우에도 던지지 않는다.**
    // failWith가 주어져도 여기서 예외를 내지 않는 것은 버그가 아니라 계약이다 —
    // 로그 저장소가 고장 나도 완료·등록은 성공해야 하고, 그걸 고정하는 회귀
    // 테스트가 바로 "log가 실패를 위로 던지지 않는다"이다.
    if (failWith != null) return;
    // 쓸 때 id가 비어 있으면(발생 지점에서 만든 이벤트) 여기서 부여한다
    // (Firestore가 doc().add로 ID를 만드는 것에 대응).
    final stored = event.id.isEmpty
        ? event.copyWith(id: 'evt-${++_seq}')
        : event;
    (_events[uid] ??= <AnalyticsEvent>[]).add(stored);
  }

  @override
  Future<List<AnalyticsEvent>> fetchEvents(String uid) async {
    // 조회는 산출·테스트용이라 실패를 드러낸다(log와 반대 정책).
    if (failWith != null) throw failWith!;
    return List.unmodifiable(_events[uid] ?? const []);
  }
}
