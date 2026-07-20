import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/reward_rules.dart';
import 'package:one_step/models/difficulty.dart';

/// checklist 3주차 — "보상 계산 로직이 난이도별로 정확하다".
///
/// 이 숫자는 `docs/plan.md`가 정본이다. 값이 바뀌면 기획 문서와 함께 바뀌어야 하고,
/// 조용히 바뀌면 안 된다. 그래서 표를 그대로 테스트로 박아 둔다.
void main() {
  group('rewardFor — 난이도별 보상 (docs/plan.md 정본)', () {
    test('쉬움 = 코인 3 / XP 5', () {
      expect(rewardFor(Difficulty.easy), const Reward(coin: 3, xp: 5));
    });

    test('보통 = 코인 5 / XP 10', () {
      expect(rewardFor(Difficulty.normal), const Reward(coin: 5, xp: 10));
    });

    test('어려움 = 코인 10 / XP 20', () {
      expect(rewardFor(Difficulty.hard), const Reward(coin: 10, xp: 20));
    });

    test('모든 난이도에 보상이 정의돼 있다 (zero로 새는 난이도가 없다)', () {
      // 난이도가 추가됐는데 보상표에 넣는 걸 잊으면 그 난이도는 조용히 0을 준다.
      for (final difficulty in Difficulty.values) {
        expect(
          rewardFor(difficulty),
          isNot(Reward.zero),
          reason: '${difficulty.name}에 보상이 정의되지 않았다',
        );
      }
    });

    test('난이도가 올라갈수록 보상도 커진다', () {
      final easy = rewardFor(Difficulty.easy);
      final normal = rewardFor(Difficulty.normal);
      final hard = rewardFor(Difficulty.hard);

      expect(easy.coin, lessThan(normal.coin));
      expect(normal.coin, lessThan(hard.coin));
      expect(easy.xp, lessThan(normal.xp));
      expect(normal.xp, lessThan(hard.xp));
    });
  });

  group('Reward 값 타입', () {
    test('더하면 코인·XP가 각각 합산된다 (인증 보너스 누적에 쓴다)', () {
      const base = Reward(coin: 5, xp: 10);

      expect(base + kVerificationBonus, const Reward(coin: 8, xp: 13));
    });

    test('zero를 더해도 그대로다', () {
      const base = Reward(coin: 3, xp: 5);

      expect(base + Reward.zero, base);
    });

    test('값이 같으면 동등하다', () {
      expect(const Reward(coin: 3, xp: 5), const Reward(coin: 3, xp: 5));
      expect(
        const Reward(coin: 3, xp: 5).hashCode,
        const Reward(coin: 3, xp: 5).hashCode,
      );
    });
  });
}
