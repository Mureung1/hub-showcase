import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/reward_rules.dart';
import 'package:one_step/models/difficulty.dart';

/// 난이도 파싱과 보상표. 보상 수치의 정본은 `docs/plan.md` 기능 B.
void main() {
  group('보상표 (plan.md)', () {
    test('쉬움 코인3/XP5 · 보통 코인5/XP10 · 어려움 코인10/XP20', () {
      expect(rewardFor(Difficulty.easy), const Reward(coin: 3, xp: 5));
      expect(rewardFor(Difficulty.normal), const Reward(coin: 5, xp: 10));
      expect(rewardFor(Difficulty.hard), const Reward(coin: 10, xp: 20));
    });

    test('난이도가 오를수록 보상이 커진다', () {
      expect(
        rewardFor(Difficulty.easy).coin,
        lessThan(rewardFor(Difficulty.normal).coin),
      );
      expect(
        rewardFor(Difficulty.normal).coin,
        lessThan(rewardFor(Difficulty.hard).coin),
      );
    });

    test('보상은 더할 수 있다 (인증 보너스 합산용)', () {
      final total = rewardFor(Difficulty.normal) + kVerificationBonus;

      expect(total, const Reward(coin: 8, xp: 13));
    });
  });

  group('엄격 파싱 — fromName', () {
    test('정확한 이름만 통과한다', () {
      expect(Difficulty.fromName('easy'), Difficulty.easy);
      expect(Difficulty.fromName('normal'), Difficulty.normal);
      expect(Difficulty.fromName('hard'), Difficulty.hard);
    });

    test('대소문자·공백은 관대하게 처리한다', () {
      expect(Difficulty.fromName('  EASY '), Difficulty.easy);
    });

    test('모르는 값은 null — 2주차에 AI 불량 응답을 거부하는 근거', () {
      expect(Difficulty.fromName('매우어려움'), isNull);
      expect(Difficulty.fromName(''), isNull);
      expect(Difficulty.fromName(null), isNull);
    });
  });

  group('관대한 파싱 — fromNameOrDefault', () {
    test('모르는 값은 보통(normal)으로 떨어진다', () {
      expect(Difficulty.fromNameOrDefault('이상한값'), Difficulty.normal);
      expect(Difficulty.fromNameOrDefault(null), Difficulty.normal);
    });

    test('아는 값은 그대로 통과한다', () {
      expect(Difficulty.fromNameOrDefault('hard'), Difficulty.hard);
    });
  });

  test('직렬화 값은 항상 소문자 영문이다', () {
    expect(Difficulty.easy.name, 'easy');
    expect(Difficulty.normal.name, 'normal');
    expect(Difficulty.hard.name, 'hard');
  });

  test('표시 라벨은 한글이다', () {
    expect(Difficulty.easy.label, '쉬움');
    expect(Difficulty.normal.label, '보통');
    expect(Difficulty.hard.label, '어려움');
  });
}
