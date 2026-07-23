import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/models/analytics_event.dart';

void main() {
  group('AnalyticsEventType.fromName', () {
    test('알려진 이름은 정확히 파싱된다', () {
      expect(AnalyticsEventType.fromName('signup'), AnalyticsEventType.signup);
      expect(AnalyticsEventType.fromName('appOpen'), AnalyticsEventType.appOpen);
      expect(
        AnalyticsEventType.fromName('questRegistered'),
        AnalyticsEventType.questRegistered,
      );
      expect(
        AnalyticsEventType.fromName('questRedecomposed'),
        AnalyticsEventType.questRedecomposed,
      );
    });

    test('앞뒤 공백은 정리하고 파싱한다', () {
      expect(
        AnalyticsEventType.fromName('  questStuck '),
        AnalyticsEventType.questStuck,
      );
    });

    test('미지값·null·대소문자 어긋남은 null (엄격)', () {
      // camelCase라 소문자 정규화를 하지 않는다 — 'appopen'은 매칭되면 안 된다.
      expect(AnalyticsEventType.fromName('appopen'), isNull);
      expect(AnalyticsEventType.fromName('unknown'), isNull);
      expect(AnalyticsEventType.fromName(''), isNull);
      expect(AnalyticsEventType.fromName(null), isNull);
    });
  });

  group('AnalyticsEvent 직렬화 왕복', () {
    test('toJson → fromJson으로 타입·시각·params가 보존된다', () {
      final at = DateTime.utc(2026, 7, 21, 3, 4, 5, 6);
      final event = AnalyticsEvent.questRegistered(
        at: at,
        count: 5,
        source: 'ai',
      );

      final restored = AnalyticsEvent.fromJson('evt-1', event.toJson());

      expect(restored.id, 'evt-1');
      expect(restored.type, AnalyticsEventType.questRegistered);
      expect(restored.at, at);
      expect(restored.params['count'], 5);
      expect(restored.params['source'], 'ai');
    });

    test('편의 생성자들의 params 키가 정확하다', () {
      final at = DateTime(2026, 7, 21);
      expect(AnalyticsEvent.signup(at: at).type, AnalyticsEventType.signup);
      expect(
        AnalyticsEvent.appOpen(at: at, dateKey: '2026-07-21').params['dateKey'],
        '2026-07-21',
      );
      expect(
        AnalyticsEvent.questCompleted(at: at, questId: 'q1').params['questId'],
        'q1',
      );
      expect(
        AnalyticsEvent.questStuck(at: at, questId: 'q9').params['questId'],
        'q9',
      );
      final redec = AnalyticsEvent.questRedecomposed(
        at: at,
        parentQuestId: 'p1',
        count: 3,
      );
      expect(redec.params['parentQuestId'], 'p1');
      expect(redec.params['count'], 3);
    });
  });

  group('AnalyticsEvent.fromJson — 관대한 목록 읽기용 엄격 단건', () {
    test('id가 비면 FormatException', () {
      expect(
        () => AnalyticsEvent.fromJson('  ', {
          'type': 'signup',
          'at': '2026-07-21T00:00:00.000',
        }),
        throwsFormatException,
      );
    });

    test('타입을 알 수 없으면 FormatException (지표에 못 들어가는 문서)', () {
      expect(
        () => AnalyticsEvent.fromJson('e', {
          'type': '알수없음',
          'at': '2026-07-21T00:00:00.000',
        }),
        throwsFormatException,
      );
    });

    test('at이 없으면 FormatException', () {
      expect(
        () => AnalyticsEvent.fromJson('e', {'type': 'signup'}),
        throwsFormatException,
      );
    });

    test('params가 없거나 Map이 아니면 빈 맵으로 관대 처리한다', () {
      final e = AnalyticsEvent.fromJson('e', {
        'type': 'appOpen',
        'at': '2026-07-21T00:00:00.000',
        'params': '깨진값',
      });
      expect(e.params, isEmpty);
      expect(e.type, AnalyticsEventType.appOpen);
    });
  });

  group('AnalyticsEvent.tryParse', () {
    test('정상 문서는 인스턴스, 깨진 문서는 null (목록에서 걸러진다)', () {
      final ok = AnalyticsEvent.tryParse('e1', {
        'type': 'questStuck',
        'at': '2026-07-21T00:00:00.000',
        'params': {'questId': 'q1'},
      });
      expect(ok, isNotNull);
      expect(ok!.type, AnalyticsEventType.questStuck);

      // 타입 미상 → null.
      expect(
        AnalyticsEvent.tryParse('e2', {'type': 'xxx', 'at': '2026-07-21'}),
        isNull,
      );
      // at 없음 → null.
      expect(AnalyticsEvent.tryParse('e3', {'type': 'signup'}), isNull);
    });
  });
}
