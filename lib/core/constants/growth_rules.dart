/// 캐릭터 성장 규칙. `docs/prototype/script.js`의 `stageOf`를 포팅했다.
///
/// 캐릭터는 도트아트 자산([CharacterStage.asset])으로 렌더하고, 자산을 못 읽으면
/// [CharacterStage.emoji]로 떨어진다(`docs/checklist.md`의 렌더 PASS 조건).
library;

/// 진화 단계. 레벨 구간마다 이름·자산·레벨업에 필요한 XP가 다르다.
class CharacterStage {
  const CharacterStage({
    required this.name,
    required this.emoji,
    required this.asset,
    required this.xpPerLevel,
  });

  /// 단계명 (알 · 참새 · 매 · 독수리 …).
  final String name;

  /// **자산 로드 실패 시의 대체 표시.** 도트아트가 들어온 뒤에도 지우지 않는다 —
  /// checklist가 "자산 로드 실패 시 대체 표시(이모지)가 나온다"를 PASS 조건으로
  /// 요구하므로 이 필드가 그 조건의 유일한 근거다.
  final String emoji;

  /// 도트아트 자산 경로. 파일명이 `번호_계열_슬러그` 꼴이라 [name]·[emoji]에서
  /// 유도할 수 없어 명시 필드로 둔다.
  final String asset;

  /// 이 단계에서 레벨 하나를 올리는 데 필요한 XP.
  final int xpPerLevel;

  @override
  bool operator ==(Object other) =>
      other is CharacterStage &&
      other.name == name &&
      other.emoji == emoji &&
      other.asset == asset &&
      other.xpPerLevel == xpPerLevel;

  @override
  int get hashCode => Object.hash(name, emoji, asset, xpPerLevel);

  @override
  String toString() => 'CharacterStage($name, Lv당 $xpPerLevel XP)';
}

/// 환생 가능 레벨. 여기 도달하면 XP가 더 쌓이지 않는다.
const int kMaxLevel = 50;

/// 캐릭터 계열. 환생을 거듭하면 새 → 용 → 피닉스로 바뀐다("환생 = 계열 해금").
enum CharacterFamily { bird, dragon, phoenix }

/// 용 계열이 열리는 환생 횟수.
const int kDragonRebirth = 3;

/// 피닉스 계열이 열리는 환생 횟수.
const int kPhoenixRebirth = 6;

/// 환생 횟수 → 계열. **구간을 유지한다**(0–2=새, 3–5=용, 6+=피닉스).
///
/// 순수 함수로 둔 이유는 `stageOf`·저장소·화면이 모두 같은 임계로 계열을 판정해야
/// 하기 때문이다. 임계가 갈리면 캐릭터 이모지와 해금 안내가 어긋난다.
CharacterFamily characterFamily(int rebirth) {
  if (rebirth >= kPhoenixRebirth) return CharacterFamily.phoenix;
  if (rebirth >= kDragonRebirth) return CharacterFamily.dragon;
  return CharacterFamily.bird;
}

/// 계열 표시 이름 (해금 안내·연출 문구용).
String characterFamilyLabel(CharacterFamily family) => switch (family) {
  CharacterFamily.bird => '새',
  CharacterFamily.dragon => '용',
  CharacterFamily.phoenix => '피닉스',
};

/// 이번 환생([newRebirth])이 **새 계열을 처음 여는** 순간인지.
///
/// 정확히 [kDragonRebirth]·[kPhoenixRebirth]에 도달했을 때만 true다. 그 외 환생은
/// 계열이 유지되므로 해금 강조를 하지 않는다.
CharacterFamily? unlockedFamily(int newRebirth) {
  if (newRebirth == kPhoenixRebirth) return CharacterFamily.phoenix;
  if (newRebirth == kDragonRebirth) return CharacterFamily.dragon;
  return null;
}

/// 레벨 구간 인덱스(0~4). **계열과 무관하게 레벨만으로 결정된다.**
///
/// 이 인덱스가 [_xpPerLevelByStage]와 계열별 이름·이모지 테이블을 함께 가리킨다.
/// xpPerLevel을 인덱스로만 뽑으므로 계열이 바뀌어도 레벨업 계산은 불변이다.
int _stageIndexOf(int level) {
  if (level <= 9) return 0;
  if (level <= 19) return 1;
  if (level <= 29) return 2;
  if (level <= 44) return 3;
  return 4;
}

/// 레벨 구간별 필요 XP. **계열 불변** — 이게 `applyXpGain` 무회귀의 근거다.
const List<int> _xpPerLevelByStage = [5, 10, 20, 40, 80];

/// 계열 × 단계(3×5)의 이름·자산·폴백 이모지 테이블.
///
/// 자산 파일은 `assets/characters/01~15`가 **이 표의 순서와 정확히 1:1**이다
/// (01–05 새 · 06–10 용 · 11–15 피닉스). 순서가 곧 계약이므로 표를 재배열하면
/// 경로도 함께 옮겨야 한다. `test/core/pixel_asset_test.dart`가 15개 경로의
/// 실재 여부와 번들 선언을 모두 검증한다.
const Map<CharacterFamily, List<({String name, String emoji, String asset})>>
_familyStages = {
  CharacterFamily.bird: [
    (name: '알', emoji: '🥚', asset: '$_characters/01_bird_egg.png'),
    (name: '참새', emoji: '🐤', asset: '$_characters/02_bird_sparrow.png'),
    (name: '매', emoji: '🕊️', asset: '$_characters/03_bird_hawk.png'),
    (name: '독수리', emoji: '🦅', asset: '$_characters/04_bird_eagle.png'),
    (
      name: '이펙트 독수리',
      emoji: '🦅',
      asset: '$_characters/05_bird_effect_eagle.png',
    ),
  ],
  CharacterFamily.dragon: [
    (name: '용의 알', emoji: '🥚', asset: '$_characters/06_dragon_egg.png'),
    (
      name: '새끼 용',
      emoji: '🦎',
      asset: '$_characters/07_dragon_hatchling.png',
    ),
    (name: '어린 용', emoji: '🐲', asset: '$_characters/08_dragon_young.png'),
    (name: '성룡', emoji: '🐉', asset: '$_characters/09_dragon_adult.png'),
    (name: '화려한 용', emoji: '🐉', asset: '$_characters/10_dragon_radiant.png'),
  ],
  CharacterFamily.phoenix: [
    (name: '피닉스의 알', emoji: '🥚', asset: '$_characters/11_phoenix_egg.png'),
    (name: '잿빛 피닉스', emoji: '🐣', asset: '$_characters/12_phoenix_ash.png'),
    (name: '불꽃 피닉스', emoji: '🔥', asset: '$_characters/13_phoenix_flame.png'),
    (name: '황금 피닉스', emoji: '🦚', asset: '$_characters/14_phoenix_golden.png'),
    (
      name: '만개한 피닉스',
      emoji: '🔥',
      asset: '$_characters/15_phoenix_bloomed.png',
    ),
  ],
};

/// 캐릭터 자산 디렉터리. 15줄에 같은 접두를 반복해 오타를 만들지 않는다.
const String _characters = 'assets/characters';

/// 레벨(+ 환생 횟수) → 진화 단계.
///
/// **[rebirth] 기본값은 0이다.** 그래서 `applyXpGain` 내부의 `stageOf(lv)` 호출은
/// 무변경으로 정확하다 — 거기서 필요한 건 xpPerLevel뿐이고, xpPerLevel은 레벨
/// 구간(=인덱스)만으로 결정돼 계열과 무관하기 때문이다. 계열(rebirth)로 갈리는 건
/// 이름·자산·이모지뿐이다.
CharacterStage stageOf(int level, {int rebirth = 0}) {
  final index = _stageIndexOf(level);
  final family = characterFamily(rebirth);
  final entry = _familyStages[family]![index];
  return CharacterStage(
    name: entry.name,
    emoji: entry.emoji,
    asset: entry.asset,
    xpPerLevel: _xpPerLevelByStage[index],
  );
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
