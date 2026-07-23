import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/models/analytics_event.dart';
import 'package:one_step/repositories/memory/in_memory_analytics_repository.dart';

void main() {
  group('InMemoryAnalyticsRepository', () {
    test('log → fetchEvents 왕복. 쓴 이벤트가 그대로 나온다', () async {
      final repo = InMemoryAnalyticsRepository();
      final at = DateTime(2026, 7, 21);

      await repo.log('u', AnalyticsEvent.signup(at: at));
      await repo.log(
        'u',
        AnalyticsEvent.questRegistered(at: at, count: 3, source: 'ai'),
      );

      final events = await repo.fetchEvents('u');
      expect(events, hasLength(2));
      expect(events[0].type, AnalyticsEventType.signup);
      expect(events[1].type, AnalyticsEventType.questRegistered);
      // 쓸 때 비어 있던 id가 저장 시 부여된다(Firestore doc().add 대응).
      expect(events.every((e) => e.id.isNotEmpty), isTrue);
    });

    test('이벤트는 사용자별로 분리된다', () async {
      final repo = InMemoryAnalyticsRepository();
      await repo.log('u1', AnalyticsEvent.signup(at: DateTime(2026, 7, 21)));

      expect(await repo.fetchEvents('u1'), hasLength(1));
      expect(await repo.fetchEvents('u2'), isEmpty);
    });

    test('이벤트가 없으면 빈 목록 (죽지 않는다)', () async {
      final repo = InMemoryAnalyticsRepository();
      expect(await repo.fetchEvents('없는uid'), isEmpty);
    });

    test('★ log는 실패 주입이 있어도 예외를 위로 던지지 않는다 (핵심 경로 격리)', () async {
      // 계측이 부가 기능이라는 계약. 로그 저장소가 고장 나도 완료·등록은 성공해야 한다.
      final repo = InMemoryAnalyticsRepository(failWith: const NetworkFailure());

      // 던지면 이 await에서 실패한다.
      await repo.log('u', AnalyticsEvent.signup(at: DateTime(2026, 7, 21)));
    });

    test('fetchEvents는 반대로 실패를 드러낸다 (산출·테스트용 조회)', () async {
      final repo = InMemoryAnalyticsRepository(failWith: const NetworkFailure());

      await expectLater(
        repo.fetchEvents('u'),
        throwsA(isA<NetworkFailure>()),
      );
    });
  });
}
