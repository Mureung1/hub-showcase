import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/models/app_user.dart';

/// checklist 1주차 · 사용자 데이터 모델
/// - "JSON ↔ 모델 직렬화/역직렬화가 왕복 손실 없이 동작한다"
/// - "필드 누락·타입 불일치 시 파싱이 예외를 던지거나 기본값으로 안전 처리한다"
/// - "데이터가 비어 있는 신규 사용자도 기본값(Lv.1, XP 0, 코인 0)으로 정상 렌더된다"
void main() {
  group('신규 사용자 기본값', () {
    test('빈 문서를 읽으면 Lv.1 / XP 0 / 코인 0', () {
      final user = AppUser.fromJson('uid-1', {});

      expect(user.level, 1);
      expect(user.xp, 0);
      expect(user.coin, 0);
      expect(user.rebirth, 0);
      expect(user.equipped, isEmpty);
    });

    test('문서가 아예 없어도(null) 기본값으로 떨어진다', () {
      final user = AppUser.fromJson('uid-1', null);

      expect(user.level, 1);
      expect(user.xp, 0);
      expect(user.coin, 0);
    });

    test('AppUser.initial도 같은 기본값이다', () {
      expect(AppUser.initial('uid-1'), AppUser.fromJson('uid-1', {}));
    });

    test('신규 사용자는 알(🥚) 단계에서 시작한다', () {
      final user = AppUser.initial('uid-1');

      expect(user.stage.name, '알');
      expect(user.stage.emoji, '🥚');
      expect(user.xpForNextLevel, 5);
      expect(user.levelProgress, 0);
    });
  });

  group('JSON 왕복', () {
    test('toJson → fromJson 이 손실 없이 복원된다', () {
      final original = AppUser(
        uid: 'uid-1',
        xp: 7,
        level: 12,
        coin: 120,
        rebirth: 3,
        equipped: const {'background': 'arcane_library', 'aura': 'focus'},
        createdAt: DateTime.utc(2026, 7, 14, 9, 30),
      );

      final restored = AppUser.fromJson('uid-1', original.toJson());

      expect(restored, original);
      expect(restored.toJson(), original.toJson());
    });
  });

  group('타입 불일치 · 이상값 안전 처리', () {
    test('숫자가 문자열로 저장돼 있어도 int로 강제 변환된다', () {
      final user = AppUser.fromJson('uid-1', {
        'coin': '120',
        'xp': '7',
        'level': '12',
      });

      expect(user.coin, 120);
      expect(user.xp, 7);
      expect(user.level, 12);
    });

    test('double로 저장된 값도 int로 변환된다', () {
      final user = AppUser.fromJson('uid-1', {'coin': 12.9});

      expect(user.coin, 12);
    });

    test('equipped가 null이면 빈 맵이다', () {
      final user = AppUser.fromJson('uid-1', {'equipped': null});

      expect(user.equipped, isEmpty);
    });

    test('레벨 0·음수는 최소 레벨 1로 올라온다', () {
      expect(AppUser.fromJson('uid-1', {'level': 0}).level, 1);
      expect(AppUser.fromJson('uid-1', {'level': -5}).level, 1);
    });

    test('어떤 쓰레기 값이 와도 예외를 던지지 않는다', () {
      // 홈 화면은 문서가 깨져 있어도 죽으면 안 된다.
      final garbage = <String, dynamic>{
        'xp': ['배열'],
        'level': {'중첩': '맵'},
        'coin': true,
        'rebirth': 'not-a-number',
        'equipped': 42,
        'createdAt': '날짜가 아님',
      };

      expect(() => AppUser.fromJson('uid-1', garbage), returnsNormally);

      final user = AppUser.fromJson('uid-1', garbage);
      expect(user.level, 1);
      expect(user.coin, 0);
      expect(user.createdAt, isNull);
    });
  });

  group('레벨 진행률', () {
    test('참새 단계(Lv.12)는 레벨당 10 XP가 필요하다', () {
      final user = AppUser(uid: 'u', level: 12, xp: 4);

      expect(user.stage.name, '참새');
      expect(user.xpForNextLevel, 10);
      expect(user.levelProgress, closeTo(0.4, 0.001));
    });

    test('XP가 필요치를 넘어도 진행률은 1.0을 넘지 않는다', () {
      final user = AppUser(uid: 'u', level: 1, xp: 999);

      expect(user.levelProgress, 1.0);
    });

    test('최대 레벨에서 환생이 가능해진다', () {
      expect(AppUser(uid: 'u', level: 49).canRebirth, isFalse);
      expect(AppUser(uid: 'u', level: 50).canRebirth, isTrue);
    });
  });
}
