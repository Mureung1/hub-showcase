import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/analytics/metrics.dart';
import 'package:one_step/models/analytics_event.dart';

/// KST 경계 계산은 UTC 기준이라, 테스트 시각을 **UTC로 고정**해 머신 타임존에
/// 흔들리지 않게 한다. UTC 00:00 = KST 09:00이라 날짜 키가 같은 날로 잡힌다.
AnalyticsEvent _ev(
  AnalyticsEventType type, {
  DateTime? at,
  int? count,
  String? source,
}) => AnalyticsEvent(
  type: type,
  at: at ?? DateTime.utc(2026, 7, 21),
  params: {'count': ?count, 'source': ?source},
);

void main() {
  group('빈 입력 — 죽지 않고 0/false', () {
    test('이벤트가 없으면 모든 지표가 0/false', () {
      final m = computeMetrics(const []);
      expect(m.challengeStartRate, 0);
      expect(m.redecomposeRecoveryRate, 0);
      expect(m.retainedOnDay7, isFalse);
    });
  });

  group('도전 시작률 = Σ완료 / Σ등록(count)', () {
    test('등록 5개 중 1개 완료 → 0.2 (분모는 count의 합, 분자는 완료 이벤트 수)', () {
      // ★ 뮤테이션 방어: 분모를 "등록 이벤트 수(1)"로 바꾸면 1.0이 되어 0.2와
      //   다르다. 분자·분모를 뒤집으면 5.0→clamp 1.0이 되어 역시 다르다.
      final events = [
        _ev(AnalyticsEventType.questRegistered, count: 5, source: 'ai'),
        _ev(AnalyticsEventType.questCompleted),
      ];
      expect(challengeStartRate(events), closeTo(0.2, 1e-9));
    });

    test('여러 등록 이벤트의 count가 합산된다 (2 + 3 = 5)', () {
      final events = [
        _ev(AnalyticsEventType.questRegistered, count: 2, source: 'manual'),
        _ev(AnalyticsEventType.questRegistered, count: 3, source: 'ai'),
        _ev(AnalyticsEventType.questCompleted),
        _ev(AnalyticsEventType.questCompleted),
        _ev(AnalyticsEventType.questCompleted),
      ];
      // 완료 3 / 등록 5 = 0.6.
      expect(challengeStartRate(events), closeTo(0.6, 1e-9));
    });

    test('count 파라미터가 없는 등록은 1건으로 센다', () {
      final events = [
        _ev(AnalyticsEventType.questRegistered), // count 없음 → 1
        _ev(AnalyticsEventType.questCompleted),
      ];
      expect(challengeStartRate(events), 1.0);
    });

    test('등록이 0이면 0 (0으로 나누지 않는다)', () {
      final events = [
        _ev(AnalyticsEventType.questCompleted),
        _ev(AnalyticsEventType.questCompleted),
      ];
      expect(challengeStartRate(events), 0);
    });

    test('완료가 등록을 넘어도 1.0으로 clamp된다 (오염 로그 방어)', () {
      final events = [
        _ev(AnalyticsEventType.questRegistered, count: 1, source: 'ai'),
        _ev(AnalyticsEventType.questCompleted),
        _ev(AnalyticsEventType.questCompleted),
      ];
      expect(challengeStartRate(events), 1.0);
    });

    test('순서가 뒤섞여도 결과는 같다 (집계라 순서 무관)', () {
      final events = [
        _ev(AnalyticsEventType.questCompleted),
        _ev(AnalyticsEventType.questRegistered, count: 4, source: 'ai'),
        _ev(AnalyticsEventType.questCompleted),
      ];
      expect(challengeStartRate(events), closeTo(0.5, 1e-9));
    });
  });

  group('재분해 복귀율 = 재분해 / 멈춤', () {
    test('멈춤 4건 중 1건 재분해 → 0.25', () {
      // ★ 뮤테이션 방어: 분자·분모를 뒤집으면 4.0→clamp 1.0이 되어 0.25와 다르다.
      final events = [
        _ev(AnalyticsEventType.questStuck),
        _ev(AnalyticsEventType.questStuck),
        _ev(AnalyticsEventType.questStuck),
        _ev(AnalyticsEventType.questStuck),
        _ev(AnalyticsEventType.questRedecomposed),
      ];
      expect(redecomposeRecoveryRate(events), closeTo(0.25, 1e-9));
    });

    test('멈춤이 0이면 0 (재분해만 있어도 0으로 나누지 않는다)', () {
      final events = [_ev(AnalyticsEventType.questRedecomposed)];
      expect(redecomposeRecoveryRate(events), 0);
    });

    test('재분해가 멈춤을 넘어도 1.0으로 clamp된다', () {
      final events = [
        _ev(AnalyticsEventType.questStuck),
        _ev(AnalyticsEventType.questRedecomposed),
        _ev(AnalyticsEventType.questRedecomposed),
      ];
      expect(redecomposeRecoveryRate(events), 1.0);
    });

    test('완료·등록 이벤트가 섞여 있어도 멈춤/재분해만 센다', () {
      final events = [
        _ev(AnalyticsEventType.questStuck),
        _ev(AnalyticsEventType.questStuck),
        _ev(AnalyticsEventType.questRedecomposed),
        _ev(AnalyticsEventType.questCompleted),
        _ev(AnalyticsEventType.questRegistered, count: 9, source: 'ai'),
      ];
      // 재분해 1 / 멈춤 2 = 0.5. 다른 타입은 무시.
      expect(redecomposeRecoveryRate(events), closeTo(0.5, 1e-9));
    });
  });

  group('7일 리텐션 = 가입 7일째 접속 여부', () {
    test('signup이 없으면 false', () {
      final events = [
        _ev(AnalyticsEventType.appOpen, at: DateTime.utc(2026, 7, 28)),
      ];
      expect(retainedOnDay7(events), isFalse);
    });

    test('가입 후 정확히 7일째 appOpen이 있으면 true', () {
      final events = [
        _ev(AnalyticsEventType.signup, at: DateTime.utc(2026, 7, 21)),
        _ev(AnalyticsEventType.appOpen, at: DateTime.utc(2026, 7, 28)),
      ];
      expect(retainedOnDay7(events), isTrue);
    });

    test('6일째·8일째만 있으면 false (정확히 7일째여야 한다)', () {
      // ★ 뮤테이션 방어: 오프셋을 6이나 8, 또는 >=7로 바꾸면 이 케이스가 깨진다.
      final events = [
        _ev(AnalyticsEventType.signup, at: DateTime.utc(2026, 7, 21)),
        _ev(AnalyticsEventType.appOpen, at: DateTime.utc(2026, 7, 27)), // day6
        _ev(AnalyticsEventType.appOpen, at: DateTime.utc(2026, 7, 29)), // day8
      ];
      expect(retainedOnDay7(events), isFalse);
    });

    test('가입 당일 접속만 있으면 false', () {
      final events = [
        _ev(AnalyticsEventType.signup, at: DateTime.utc(2026, 7, 21)),
        _ev(AnalyticsEventType.appOpen, at: DateTime.utc(2026, 7, 21)),
      ];
      expect(retainedOnDay7(events), isFalse);
    });

    test('signup이 여러 개면 가장 이른 날을 기준으로 한다', () {
      // 이른 signup(7/21) 기준 7일째 = 7/28. 늦은 signup(7/25) 기준이면 8/1이라
      // 7/28이 걸리지 않는다 → "가장 이른" 판정이 아니면 false가 되어 실패한다.
      final events = [
        _ev(AnalyticsEventType.signup, at: DateTime.utc(2026, 7, 25)),
        _ev(AnalyticsEventType.signup, at: DateTime.utc(2026, 7, 21)),
        _ev(AnalyticsEventType.appOpen, at: DateTime.utc(2026, 7, 28)),
      ];
      expect(retainedOnDay7(events), isTrue);
    });

    test('순서가 뒤섞여도 결과가 같다', () {
      final events = [
        _ev(AnalyticsEventType.appOpen, at: DateTime.utc(2026, 7, 28)),
        _ev(AnalyticsEventType.appOpen, at: DateTime.utc(2026, 7, 22)),
        _ev(AnalyticsEventType.signup, at: DateTime.utc(2026, 7, 21)),
      ];
      expect(retainedOnDay7(events), isTrue);
    });
  });

  group('computeMetrics — 세 지표 동시 산출', () {
    test('실제 흐름 하나를 넣으면 세 값이 함께 나온다', () {
      final events = [
        _ev(AnalyticsEventType.signup, at: DateTime.utc(2026, 7, 21)),
        _ev(AnalyticsEventType.questRegistered, count: 4, source: 'ai'),
        _ev(AnalyticsEventType.questCompleted),
        _ev(AnalyticsEventType.questStuck),
        _ev(AnalyticsEventType.questRedecomposed),
        _ev(AnalyticsEventType.appOpen, at: DateTime.utc(2026, 7, 28)),
      ];
      final m = computeMetrics(events);
      expect(m.challengeStartRate, closeTo(0.25, 1e-9)); // 1/4
      expect(m.redecomposeRecoveryRate, 1.0); // 1/1
      expect(m.retainedOnDay7, isTrue);
    });
  });
}
