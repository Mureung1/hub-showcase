import '../core/utils/json_utils.dart';

/// 성공 지표 산출을 위한 **이벤트 로그 한 건** (`users/{uid}/events/{id}`).
///
/// `docs/plan.md`의 지표 3개(도전 시작률·재분해 복귀율·7일 리텐션)를 나중에
/// **로그만으로 계산**할 수 있게 하려고 쌓는다. 화면(지표 대시보드)은 만들지
/// 않는다 — "산출 가능하다"는 순수 함수([core/analytics/metrics.dart])와 테스트로
/// 증명한다.
///
/// 파싱 정책은 [Achievement]·[Quest.fromJson]과 같은 **관대한 읽기**다. 저장된
/// 이벤트 하나가 깨져 있다고 지표 계산이 통째로 죽으면 안 되기 때문이다. 다만
/// 이벤트는 **타입과 시각이 없으면 의미가 없어**(어떤 지표에도 못 들어간다) 그
/// 둘은 필수로 두고, 깨진 문서는 [tryParse]가 목록에서 걸러낸다
/// (`firestore_goal_repository._parse`와 같은 "목록은 관대, 단건은 엄격" 규칙).
class AnalyticsEvent {
  const AnalyticsEvent({
    required this.type,
    required this.at,
    this.id = '',
    this.params = const <String, dynamic>{},
  });

  /// 저장된 이벤트 문서를 읽는다.
  ///
  /// `id`가 비었거나, 타입을 알 수 없거나, `at`이 없으면 [FormatException].
  /// 타입·시각이 없는 이벤트는 어떤 지표에도 기여할 수 없어 버리는 게 맞다.
  factory AnalyticsEvent.fromJson(String id, Map<String, dynamic>? json) {
    if (id.trim().isEmpty) {
      throw const FormatException('필수 필드 누락: id');
    }
    final data = json ?? const <String, dynamic>{};
    final type = AnalyticsEventType.fromName(asString(data['type']));
    if (type == null) {
      throw FormatException('알 수 없는 이벤트 타입: ${data['type']}');
    }
    final at = asDateTime(data['at']);
    if (at == null) {
      throw const FormatException('필수 필드 누락: at');
    }
    final rawParams = data['params'];
    final params = rawParams is Map
        ? <String, dynamic>{
            for (final entry in rawParams.entries)
              entry.key.toString(): entry.value,
          }
        : <String, dynamic>{};
    return AnalyticsEvent(id: id.trim(), type: type, at: at, params: params);
  }

  /// 파싱 실패 시 `null`. 목록에서 불량 문서만 걸러낼 때 쓴다(관대한 목록 읽기).
  static AnalyticsEvent? tryParse(String id, Map<String, dynamic>? json) {
    try {
      return AnalyticsEvent.fromJson(id, json);
    } on FormatException {
      return null;
    }
  }

  // ── 발생 지점별 편의 생성자 ──
  //
  // params 키(문자열)를 여기 한 곳에만 두어, 발생 지점 코드가 오타로 갈라지지
  // 않게 한다. 지표 계산 자체는 타입·시각만 쓰고 params는 쓰지 않지만(부가 정보),
  // 디버깅·확장을 위해 스냅샷 값으로 함께 남긴다(Achievement의 스냅샷 원칙).

  /// `users/{uid}` 문서가 **최초로 생성**될 때 1회.
  factory AnalyticsEvent.signup({required DateTime at}) =>
      AnalyticsEvent(type: AnalyticsEventType.signup, at: at);

  /// 세션 시작 시, **KST 날짜당 1회**.
  factory AnalyticsEvent.appOpen({
    required DateTime at,
    required String dateKey,
  }) => AnalyticsEvent(
    type: AnalyticsEventType.appOpen,
    at: at,
    params: {'dateKey': dateKey},
  );

  /// 퀘스트 신규 등록(재분해 자식 등록은 제외 — 그건 [questRedecomposed]).
  /// [source]는 `ai`(분해 등록) 또는 `manual`(직접 등록).
  factory AnalyticsEvent.questRegistered({
    required DateTime at,
    required int count,
    required String source,
  }) => AnalyticsEvent(
    type: AnalyticsEventType.questRegistered,
    at: at,
    params: {'count': count, 'source': source},
  );

  /// 완료로 **실제 보상이 지급된** 순간(재완료는 로그하지 않는다).
  factory AnalyticsEvent.questCompleted({
    required DateTime at,
    required String questId,
  }) => AnalyticsEvent(
    type: AnalyticsEventType.questCompleted,
    at: at,
    params: {'questId': questId},
  );

  /// 퀘스트를 `stuck`(멈춤)으로 표시한 순간. 「재분해 복귀율」의 분모.
  factory AnalyticsEvent.questStuck({
    required DateTime at,
    required String questId,
  }) => AnalyticsEvent(
    type: AnalyticsEventType.questStuck,
    at: at,
    params: {'questId': questId},
  );

  /// 멈춘 퀘스트를 재분해해 자식을 등록한 순간. 「재분해 복귀율」의 분자.
  factory AnalyticsEvent.questRedecomposed({
    required DateTime at,
    required String parentQuestId,
    required int count,
  }) => AnalyticsEvent(
    type: AnalyticsEventType.questRedecomposed,
    at: at,
    params: {'parentQuestId': parentQuestId, 'count': count},
  );

  /// 문서 ID. 로그를 **쓸 때는 빈 문자열**이고(Firestore가 ID를 부여한다),
  /// 읽어 올 때만 실제 값이 채워진다.
  final String id;

  final AnalyticsEventType type;

  /// 이벤트 발생 시각. Firestore 저장 시 서버 타임스탬프로 확정된다
  /// (`goal.createdAt`과 같은 패턴). 경계에서 `Timestamp → DateTime`으로 정규화된다.
  final DateTime at;

  /// 부가 파라미터(스냅샷). 지표 계산에는 쓰이지 않는다.
  final Map<String, dynamic> params;

  AnalyticsEvent copyWith({
    String? id,
    AnalyticsEventType? type,
    DateTime? at,
    Map<String, dynamic>? params,
  }) => AnalyticsEvent(
    id: id ?? this.id,
    type: type ?? this.type,
    at: at ?? this.at,
    params: params ?? this.params,
  );

  Map<String, dynamic> toJson() => {
    'type': type.name,
    'at': at.toIso8601String(),
    'params': params,
  };

  @override
  String toString() => 'AnalyticsEvent(${type.name}, $at, $params)';
}

/// 로그로 남기는 이벤트 6종 (최소 세트).
///
/// 저장·전송되는 값은 enum 이름 그대로다(`signup`, `appOpen`, `questRegistered` …).
enum AnalyticsEventType {
  /// 사용자 문서 최초 생성.
  signup,

  /// 세션 시작(KST 날짜당 1회).
  appOpen,

  /// 퀘스트 신규 등록(재분해 자식 제외).
  questRegistered,

  /// 완료 보상 실제 지급.
  questCompleted,

  /// 멈춤 표시.
  questStuck,

  /// 재분해 자식 등록.
  questRedecomposed;

  /// 엄격 파싱 — 모르는 값이면 `null`.
  ///
  /// 이름은 camelCase라 소문자 정규화를 하지 않는다(`appOpen`이 `appopen`으로
  /// 뭉개지면 매칭이 깨진다). 앞뒤 공백만 정리한다.
  static AnalyticsEventType? fromName(String? value) {
    if (value == null) return null;
    final v = value.trim();
    for (final type in AnalyticsEventType.values) {
      if (type.name == v) return type;
    }
    return null;
  }
}
