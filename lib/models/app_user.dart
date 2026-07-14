import '../core/constants/growth_rules.dart';
import '../core/utils/json_utils.dart';

/// 사용자. 레벨 · XP · 코인 · 환생 · 장착 아이템.
///
/// **[AppUser.fromJson]은 절대 예외를 던지지 않는다.** 이건 의도된 설계다:
/// 사용자 문서가 어떤 이유로든 깨져 있어도 홈 화면이 죽으면 안 되기 때문이다.
/// 값이 없거나 타입이 틀리면 신규 사용자 기본값(Lv.1 / XP 0 / 코인 0)으로 떨어진다.
///
/// 반대로 [Quest]는 `id`·`title`이 없으면 예외를 던진다. 제목 없는 퀘스트는
/// 존재 의미가 없고, 2주차에 AI가 뱉은 불량 항목을 걸러내야 하기 때문이다.
class AppUser {
  const AppUser({
    required this.uid,
    this.xp = 0,
    this.level = 1,
    this.coin = 0,
    this.rebirth = 0,
    this.equipped = const {},
    this.createdAt,
  });

  /// 신규 사용자 기본값. Firestore에 문서가 아직 없을 때 이 값으로 렌더한다.
  factory AppUser.initial(String uid) => AppUser(uid: uid);

  /// 어떤 입력에도 예외를 던지지 않는다.
  factory AppUser.fromJson(String uid, Map<String, dynamic>? json) {
    final data = json ?? const <String, dynamic>{};
    return AppUser(
      uid: uid,
      xp: asInt(data['xp']),
      // 레벨의 하한은 1이다. 0이나 음수가 저장돼 있어도 1로 올린다.
      level: asInt(data['level'], fallback: 1).clamp(1, kMaxLevel),
      coin: asInt(data['coin']),
      rebirth: asInt(data['rebirth']),
      equipped: asStringMap(data['equipped']),
      createdAt: asDateTime(data['createdAt']),
    );
  }

  final String uid;
  final int xp;
  final int level;
  final int coin;
  final int rebirth;

  /// 슬롯 → 아이템 ID (예: `{'background': 'arcane_library'}`).
  final Map<String, String> equipped;

  final DateTime? createdAt;

  /// 현재 진화 단계.
  CharacterStage get stage => stageOf(level);

  /// 다음 레벨까지 필요한 XP.
  int get xpForNextLevel => stage.xpPerLevel;

  /// 레벨 진행률 0.0 ~ 1.0.
  double get levelProgress {
    if (level >= kMaxLevel) return 1;
    final need = xpForNextLevel;
    if (need <= 0) return 0;
    return (xp / need).clamp(0.0, 1.0);
  }

  /// 환생 가능 여부.
  bool get canRebirth => level >= kMaxLevel;

  Map<String, dynamic> toJson() => {
    'xp': xp,
    'level': level,
    'coin': coin,
    'rebirth': rebirth,
    'equipped': equipped,
    if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
  };

  AppUser copyWith({
    int? xp,
    int? level,
    int? coin,
    int? rebirth,
    Map<String, String>? equipped,
    DateTime? createdAt,
  }) {
    return AppUser(
      uid: uid,
      xp: xp ?? this.xp,
      level: level ?? this.level,
      coin: coin ?? this.coin,
      rebirth: rebirth ?? this.rebirth,
      equipped: equipped ?? this.equipped,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      other is AppUser &&
      other.uid == uid &&
      other.xp == xp &&
      other.level == level &&
      other.coin == coin &&
      other.rebirth == rebirth &&
      other.createdAt == createdAt &&
      _mapEquals(other.equipped, equipped);

  @override
  int get hashCode =>
      Object.hash(uid, xp, level, coin, rebirth, createdAt, equipped.length);

  @override
  String toString() =>
      'AppUser($uid, Lv.$level, XP $xp, coin $coin, rebirth $rebirth)';
}

bool _mapEquals(Map<String, String> a, Map<String, String> b) {
  if (a.length != b.length) return false;
  for (final entry in a.entries) {
    if (b[entry.key] != entry.value) return false;
  }
  return true;
}
