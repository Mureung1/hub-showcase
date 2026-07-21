import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/reward_rules.dart';
import 'package:one_step/models/achievement.dart';

/// 성취 기록 모델 (3주차-B).
///
/// 파싱 정책은 `Quest.fromJson`과 같다 — **관대하게** 읽는다.
/// 기록 하나가 깨져 있다고 보관함(4주차)이 통째로 죽으면 안 되기 때문이다.
void main() {
  group('JSON 왕복', () {
    test('모든 필드가 손실 없이 복원된다', () {
      final original = Achievement(
        id: 'a1',
        questId: 'q1',
        questTitle: '지원서 초안 쓰기',
        coin: 8,
        xp: 13,
        memo: '카페에서 2시간 썼다',
        verified: true,
        completedAt: DateTime.utc(2026, 7, 14, 18),
      );

      final restored = Achievement.fromJson('a1', original.toJson());

      expect(restored, original);
      expect(restored.toJson(), original.toJson());
    });

    test('메모 없는 기록(건너뛰기)도 왕복한다', () {
      const original = Achievement(
        id: 'a1',
        questId: 'q1',
        questTitle: '메모 없이 완료',
        coin: 5,
        xp: 10,
      );

      final restored = Achievement.fromJson('a1', original.toJson());

      expect(restored, original);
      expect(restored.memo, isNull);
      expect(restored.verified, isFalse);
    });

    test('memo가 null이면 키를 남기지 않는다', () {
      const record = Achievement(id: 'a1', questId: 'q1', questTitle: 'x');

      expect(record.toJson().containsKey('memo'), isFalse);
      expect(record.toJson().containsKey('completedAt'), isFalse);
    });

    test('hasPhoto가 손실 없이 왕복하고 기본값은 false다', () {
      const withPhoto = Achievement(
        id: 'a1',
        questId: 'q1',
        questTitle: '사진 인증',
        coin: 8,
        xp: 13,
        verified: true,
        hasPhoto: true,
      );

      final restored = Achievement.fromJson('a1', withPhoto.toJson());
      expect(restored.hasPhoto, isTrue);
      expect(restored, withPhoto);

      // 기본값(사진 없음)도 명시적으로 false로 직렬화된다.
      const noPhoto = Achievement(id: 'a2', questId: 'q2', questTitle: 'x');
      expect(noPhoto.hasPhoto, isFalse);
      expect(noPhoto.toJson()['hasPhoto'], false);
    });

    test('reward 게터가 지급액을 그대로 돌려준다', () {
      const record = Achievement(
        id: 'a1',
        questId: 'q1',
        questTitle: 'x',
        coin: 8,
        xp: 13,
      );

      expect(record.reward, const Reward(coin: 8, xp: 13));
    });
  });

  group('관대 파싱 — 깨진 기록도 화면을 죽이지 않는다', () {
    test('필드가 전부 없어도 기본값으로 읽힌다', () {
      final record = Achievement.fromJson('a1', {});

      expect(record.id, 'a1');
      expect(record.questId, '');
      expect(record.questTitle, '');
      expect(record.coin, 0);
      expect(record.xp, 0);
      expect(record.memo, isNull);
      expect(record.verified, isFalse);
      expect(record.completedAt, isNull);
    });

    test('json이 null이어도 크래시하지 않는다', () {
      expect(Achievement.fromJson('a1', null).id, 'a1');
    });

    test('coin·xp가 문자열이어도 int로 변환된다', () {
      final record = Achievement.fromJson('a1', {'coin': '8', 'xp': '13'});

      expect(record.coin, 8);
      expect(record.xp, 13);
    });

    test('coin이 이상한 값이면 0으로 떨어진다', () {
      final record = Achievement.fromJson('a1', {'coin': '숫자아님'});

      expect(record.coin, 0);
    });

    test('verified가 문자열 "true"여도 bool로 변환된다', () {
      final record = Achievement.fromJson('a1', {'verified': 'true'});

      expect(record.verified, isTrue);
    });

    test('공백뿐인 메모는 null로 읽힌다', () {
      final record = Achievement.fromJson('a1', {'memo': '   '});

      expect(record.memo, isNull);
    });

    test('completedAt은 ISO 문자열로도 읽힌다', () {
      final record = Achievement.fromJson('a1', {
        'completedAt': '2026-07-14T18:00:00.000Z',
      });

      expect(record.completedAt, DateTime.utc(2026, 7, 14, 18));
    });

    test('★ verified는 memo 유무로 유추하지 않고 저장값을 따른다', () {
      // 사진 인증(Storage 도입 후)은 메모 없이도 성립한다.
      // 여기서 유추해 버리면 그때 기록이 전부 미인증으로 뒤집힌다.
      final record = Achievement.fromJson('a1', {'verified': true});

      expect(record.memo, isNull);
      expect(record.verified, isTrue);
    });
  });

  group('id 검증 — 여기서만 예외를 던진다', () {
    test('id가 비어 있으면 FormatException', () {
      expect(() => Achievement.fromJson('', {}), throwsFormatException);
    });

    test('id가 공백뿐이어도 FormatException', () {
      expect(() => Achievement.fromJson('   ', {}), throwsFormatException);
    });

    test('tryParse는 예외 대신 null을 준다', () {
      expect(Achievement.tryParse('', {}), isNull);
      expect(Achievement.tryParse('a1', {}), isNotNull);
    });

    test('제목이 없어도 기록은 살린다 (Quest와 다른 지점)', () {
      // 제목 없는 퀘스트는 의미가 없지만, 제목이 유실된 기록에도
      // "언제 얼마를 받았다"는 정보는 남아 지표에 쓸모가 있다.
      final record = Achievement.fromJson('a1', {'coin': 5, 'xp': 10});

      expect(record.questTitle, '');
      expect(record.coin, 5);
    });
  });

  test('== / hashCode가 값 기준으로 동작한다', () {
    const a = Achievement(
      id: 'a1',
      questId: 'q1',
      questTitle: 'x',
      coin: 5,
      xp: 10,
    );
    const same = Achievement(
      id: 'a1',
      questId: 'q1',
      questTitle: 'x',
      coin: 5,
      xp: 10,
    );
    const different = Achievement(
      id: 'a1',
      questId: 'q1',
      questTitle: 'x',
      coin: 8,
      xp: 13,
    );

    expect(a, same);
    expect(a.hashCode, same.hashCode);
    expect(a, isNot(different));
  });
}
