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
