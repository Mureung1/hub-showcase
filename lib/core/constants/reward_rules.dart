import '../../models/difficulty.dart';

/// 난이도별 보상. 정본: `docs/plan.md` 기능 B.
///
/// 쉬움 코인3/XP5 · 보통 코인5/XP10 · 어려움 코인10/XP20
class Reward {
  const Reward({required this.coin, required this.xp});

  final int coin;
  final int xp;

  static const zero = Reward(coin: 0, xp: 0);

  Reward operator +(Reward other) =>
      Reward(coin: coin + other.coin, xp: xp + other.xp);

  @override
  bool operator ==(Object other) =>
      other is Reward && other.coin == coin && other.xp == xp;

  @override
  int get hashCode => Object.hash(coin, xp);

  @override
  String toString() => 'Reward(coin: $coin, xp: $xp)';
}

/// 난이도 → 기본 보상.
const Map<Difficulty, Reward> kBaseRewards = {
  Difficulty.easy: Reward(coin: 3, xp: 5),
  Difficulty.normal: Reward(coin: 5, xp: 10),
  Difficulty.hard: Reward(coin: 10, xp: 20),
};

/// 사진·메모 인증 시 추가 지급되는 보너스 (3주차).
const Reward kVerificationBonus = Reward(coin: 3, xp: 3);

/// 난이도별 기본 보상을 돌려준다.
///
/// [Difficulty]가 enum이라 알 수 없는 값이 여기까지 올 수 없다.
/// 문자열 단계에서의 방어는 [Difficulty.fromNameOrDefault]가 담당한다.
Reward rewardFor(Difficulty difficulty) =>
    kBaseRewards[difficulty] ?? Reward.zero;
