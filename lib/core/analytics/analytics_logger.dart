import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/analytics_event.dart';
import '../../providers/providers.dart';
import '../../repositories/analytics_repository.dart';

/// 계측 로그 호출의 **단일 경계.**
///
/// 완료·등록은 트랜잭션/batch다. 로그를 그 안에 넣으면 로그 실패가 지급을
/// 되돌리거나(롤백), 지급이 실패했는데 로그만 남아(오염) 지표가 어긋난다. 그래서
/// **성공한 뒤** 화면/notifier 계층에서 이 확장으로 따로 부른다:
///
/// - 완료 → `quest_list_screen._toggleDone`의 지급 성공 경로
/// - 등록 → `quest_create_screen._submit` / `decompose_notifier.confirm`
/// - 멈춤 → `quest_list_screen._setStatus`
/// - 재분해 → `decompose_notifier.confirm`(등록 성공 후)
/// - 가입/접속 → `providers.dart`(session/attendance, 자체 헬퍼로 처리)
///
/// **어떤 실패도 삼킨다.** 로그 저장 실패는 물론, 테스트에서
/// `analyticsRepositoryProvider`를 override하지 않아 나는 `UnimplementedError`까지
/// 여기서 막는다 — 계측이 없다고 화면 동작이 깨지면 안 되기 때문이다. 덕분에 기존
/// 화면 테스트는 이 provider를 주입하지 않아도 그대로 통과한다.
void _fireAndForget(
  AnalyticsRepository Function() readRepo,
  String uid,
  AnalyticsEvent event,
) {
  try {
    final future = readRepo().log(uid, event);
    // 비동기 거부도 삼킨다(unawaited 미처리 예외가 테스트를 깨지 않도록).
    unawaited(future.catchError((Object _) {}));
  } catch (_) {
    // 동기 실패(provider override 누락 등)도 삼킨다.
  }
}

/// 화면(ConsumerState 등)에서 이벤트를 흘려보낸다.
extension AnalyticsWidgetRefX on WidgetRef {
  void logEvent(String uid, AnalyticsEvent event) =>
      _fireAndForget(() => read(analyticsRepositoryProvider), uid, event);
}

/// notifier(AsyncNotifier 등)에서 이벤트를 흘려보낸다.
extension AnalyticsRefX on Ref {
  void logEvent(String uid, AnalyticsEvent event) =>
      _fireAndForget(() => read(analyticsRepositoryProvider), uid, event);
}
