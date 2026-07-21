/// 캐릭터 성장 규칙. `docs/prototype/script.js`의 `stageOf`를 포팅했다.
///
/// 도트아트 자산이 나오기 전까지 캐릭터는 **이모지 목업**으로 렌더한다
/// (one-step-design `screens.md`: "임의 이미지 대신 이모지 플레이스홀더를 사용한다").
library;

/// 진화 단계. 레벨 구간마다 이름·이모지·레벨업에 필요한 XP가 다르다.
class CharacterStage {
  const CharacterStage({
    required this.name,
    required this.emoji,
    required this.xpPerLevel,
  });

  /// 단계명 (알 · 참새 · 매 · 독수리 …).
  final String name;

  /// 도트아트 자산 완성 전까지 쓰는 플레이스홀더.
  final String emoji;

  /// 이 단계에서 레벨 하나를 올리는 데 필요한 XP.
  final int xpPerLevel;

  @override
  bool operator ==(Object other) =>
      other is CharacterStage &&
      other.name == name &&
      other.emoji == emoji &&
      other.xpPerLevel == xpPerLevel;

  @override
  int get hashCode => Object.hash(name, emoji, xpPerLevel);

  @override
  String toString() => 'CharacterStage($name, Lv당 $xpPerLevel XP)';
}

/// 환생 가능 레벨. 여기 도달하면 XP가 더 쌓이지 않는다.
const int kMaxLevel = 50;

/// 레벨 → 진화 단계.
CharacterStage stageOf(int level) {
  if (level <= 9) {
    return const CharacterStage(name: '알', emoji: '🥚', xpPerLevel: 5);
  }
  if (level <= 19) {
    return const CharacterStage(name: '참새', emoji: '🐤', xpPerLevel: 10);
  }
  if (level <= 29) {
    return const CharacterStage(name: '매', emoji: '🕊️', xpPerLevel: 20);
  }
  if (level <= 44) {
    return const CharacterStage(name: '독수리', emoji: '🦅', xpPerLevel: 40);
  }
  return const CharacterStage(name: '이펙트 독수리', emoji: '🦅', xpPerLevel: 80);
}

/// XP를 더한 뒤의 (레벨, 레벨 내 XP)를 계산한다.
///
/// 왜 순수 함수로 빼는가: 레벨업 계산은 저장소마다(Firestore·InMemory) 똑같아야
/// 하고, 다단계 상승·진화 경계·MAX 상한이라는 세 가지 함정을 한 곳에서만 다뤄야
/// 두 구현이 어긋나지 않는다.
///
/// - **다단계 상승**: 한 번에 큰 XP가 들어오면 레벨이 여러 칸 오를 수 있으므로
///   while로 임계를 넘는 만큼 반복해서 올린다(if 한 번으로는 부족하다).
/// - **진화 경계**: 레벨당 필요 XP(`xpPerLevel`)는 단계마다 다르다. 매 반복에서
///   `stageOf(lv)`를 다시 읽으므로, 알(5)에서 참새(10)로 넘어가는 순간부터는
///   새 단계의 임계가 적용된다 — 경계에서 남은 XP가 정확히 이월된다.
/// - **MAX 상한**: `kMaxLevel`에 도달하면 XP가 더 쌓이지 않는다(growth_rules 주석
///   "여기 도달하면 XP가 더 쌓이지 않는다"). 도달 시 레벨 내 XP를 0으로 고정한다.
({int level, int xp}) applyXpGain({
  required int level,
  required int xp,
  required int gained,
}) {
  // 저장된 값이 이상해도(레벨 범위 밖·음수 XP 등) 계산이 폭주하지 않게 방어한다.
  var lv = level.clamp(1, kMaxLevel);
  // 음수 gained는 보상 취소가 아니라 오염이므로 XP를 깎지 않고 0으로 무시한다.
  var x = xp + (gained < 0 ? 0 : gained);

  // 현재 단계의 임계를 넘는 동안 레벨을 올리고 그만큼 XP를 덜어낸다.
  while (lv < kMaxLevel && x >= stageOf(lv).xpPerLevel) {
    x -= stageOf(lv).xpPerLevel;
    lv++;
  }

  // MAX에 닿으면 남은 XP는 버린다(더 쌓이지 않는다는 규칙). levelProgress는
  // MAX에서 이미 1을 반환하므로 표시상 손해도 없다.
  if (lv >= kMaxLevel) {
    lv = kMaxLevel;
    x = 0;
  }

  return (level: lv, xp: x);
}

/// 환생 등급 타이틀.
String rebirthTitle(int rebirth) {
  const titles = [
    'Novice',
    'Apprentice',
    'Adept',
    'Master Scholar',
    'Grand Scholar',
    'Sage',
    'Archmage',
  ];
  final index = rebirth.clamp(0, titles.length - 1);
  return titles[index];
}
