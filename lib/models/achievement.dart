import '../core/constants/reward_rules.dart';
import '../core/utils/json_utils.dart';

/// 완료·인증 이력 한 건 (`users/{uid}/achievements/{id}`).
///
/// 퀘스트 문서가 아니라 **별도 기록**으로 남기는 이유:
/// - 퀘스트는 지워질 수 있고 제목도 바뀔 수 있다. 그때 "무엇을 해냈는지"가 함께
///   사라지면 4주차 「성취 보관함」이 텅 빈다. 그래서 [questTitle]을 **그 시점의
///   값으로 복사해** 둔다(정규화보다 스냅샷이 맞는 자리다).
/// - 「완료율」·「인증률」 같은 지표는 현재 상태(status)가 아니라 **사건의 누적**이라야
///   계산된다. 완료 → 해제 → 재완료를 겪은 퀘스트도 기록은 지급 시점 1건만 남는다.
///
/// 기록은 **보상이 실제 지급된 순간에만** 생성된다(재완료는 남기지 않는다).
/// 그래서 `achievements`의 개수 = 지급 횟수이고, 코인·XP 합계와 잔액이 일치한다.
///
/// 파싱 정책은 [Quest.fromJson]과 같다 — **관대하게** 읽는다. 저장된 기록 하나가
/// 깨져 있다고 보관함 전체가 죽으면 안 되기 때문이다.
/// (AI 응답이 아니라 우리가 쓴 문서라 난이도 왜곡 같은 위험도 없다.)
class Achievement {
  const Achievement({
    required this.id,
    required this.questId,
    required this.questTitle,
    this.coin = 0,
    this.xp = 0,
    this.memo,
    this.verified = false,
    this.hasPhoto = false,
    this.completedAt,
  });

  /// 저장된 문서를 읽는다. `id`가 없을 때만 [FormatException].
  ///
  /// [Quest]와 달리 제목이 비어도 예외를 던지지 않는다 — 제목 없는 퀘스트는
  /// 의미가 없지만, 제목이 유실된 기록에도 "언제 얼마를 받았다"는 정보는 남아
  /// 지표와 보관함에 여전히 쓸모가 있다.
  factory Achievement.fromJson(String id, Map<String, dynamic>? json) {
    if (id.trim().isEmpty) {
      throw const FormatException('필수 필드 누락: id');
    }
    final data = json ?? const <String, dynamic>{};
    return Achievement(
      id: id.trim(),
      questId: asString(data['questId']),
      questTitle: asString(data['questTitle']),
      coin: asInt(data['coin']),
      xp: asInt(data['xp']),
      memo: asNullableString(data['memo']),
      // verified를 memo 유무로 유추하지 않고 저장된 값을 그대로 믿는다.
      // 사진 인증이 붙으면 memo 없이도 인증이 성립하기 때문이다(3주차).
      verified: asBool(data['verified']),
      // 이 완료에 인증 사진이 딸렸는가. 이미지 바이트 자체는 여기 없고
      // `users/{uid}/proofs/{questId}` 문서에 base64로 따로 있다(문서 비대화 방지).
      hasPhoto: asBool(data['hasPhoto']),
      completedAt: asDateTime(data['completedAt']),
    );
  }

  /// 파싱 실패 시 `null`. 목록에서 불량 문서만 걸러낼 때 쓴다.
  static Achievement? tryParse(String id, Map<String, dynamic>? json) {
    try {
      return Achievement.fromJson(id, json);
    } on FormatException {
      return null;
    }
  }

  final String id;

  /// 어느 퀘스트를 완료한 기록인가 (`quests/{questId}`).
  /// 퀘스트가 삭제되면 끊어진 참조가 되지만, 기록 자체는 계속 유효하다.
  final String questId;

  /// **완료 시점의** 퀘스트 제목 스냅샷. 원본이 바뀌거나 지워져도 남는다.
  final String questTitle;

  /// 이 완료로 실제 지급된 코인 (인증 보너스 **포함**).
  final int coin;

  /// 이 완료로 실제 지급된 XP (인증 보너스 **포함**).
  final int xp;

  /// 사용자가 남긴 인증 메모. 건너뛰었으면 `null`.
  final String? memo;

  /// 인증(메모·사진)이 성립해 보너스를 받았는가.
  final bool verified;

  /// 이 완료에 인증 **사진**이 딸렸는가. 이미지 바이트는 별도 proof 문서에 있고,
  /// 여기엔 "있었다"는 플래그만 둔다(보관함 목록에서 사진 유무 뱃지 등에 쓴다).
  final bool hasPhoto;

  final DateTime? completedAt;

  /// 지급된 보상. 화면에서 [RewardChip]에 그대로 넘길 수 있다.
  Reward get reward => Reward(coin: coin, xp: xp);

  Map<String, dynamic> toJson() => {
    'questId': questId,
    'questTitle': questTitle,
    'coin': coin,
    'xp': xp,
    'verified': verified,
    'hasPhoto': hasPhoto,
    // null 키는 생략한다 (Quest.toJson과 동일한 패턴).
    if (memo != null) 'memo': memo,
    if (completedAt != null) 'completedAt': completedAt!.toIso8601String(),
  };

  @override
  bool operator ==(Object other) =>
      other is Achievement &&
      other.id == id &&
      other.questId == questId &&
      other.questTitle == questTitle &&
      other.coin == coin &&
      other.xp == xp &&
      other.memo == memo &&
      other.verified == verified &&
      other.hasPhoto == hasPhoto &&
      other.completedAt == completedAt;

  @override
  int get hashCode => Object.hash(
    id,
    questId,
    questTitle,
    coin,
    xp,
    memo,
    verified,
    hasPhoto,
    completedAt,
  );

  @override
  String toString() =>
      'Achievement($id, "$questTitle", +$coin/+$xp'
      '${verified ? ', verified' : ''})';
}
