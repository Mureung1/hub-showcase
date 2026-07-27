import '../core/constants/reward_rules.dart';
import '../core/utils/json_utils.dart';
import 'difficulty.dart';
import 'quest_source.dart';
import 'quest_status.dart';

/// 저장된 퀘스트.
///
/// **파싱이 의도적으로 비대칭이다:**
/// - [AppUser]와 달리 `id`·`title`이 없으면 [FormatException]을 던진다.
///   제목 없는 퀘스트는 사용자에게 아무 의미가 없기 때문이다.
/// - 그 외 필드(난이도·상태·마감)는 값이 이상해도 안전한 기본값으로 떨어진다.
///   이미 저장된 문서가 깨져 있다고 목록 전체를 죽일 수는 없다.
///
/// ⚠️ **AI 응답 파싱에는 이 클래스를 쓰지 마라.** AI 응답에는 `id`가 없고,
/// 난이도가 오염돼도 조용히 `normal`로 떨어져 **보상 등급이 왜곡된다.**
/// AI 응답은 [QuestDraft.parseStrict]가 엄격하게 검증한다.
class Quest {
  const Quest({
    required this.id,
    required this.title,
    this.difficulty = Difficulty.normal,
    this.status = QuestStatus.todo,
    this.deadline,
    this.order = 0,
    this.goalId,
    this.parentQuestId,
    this.source,
    this.createdAt,
    this.completedAt,
    this.rewardedAt,
    this.memo,
    this.archived = false,
  });

  /// 저장된 문서를 읽는다. 필수 필드가 없으면 [FormatException].
  factory Quest.fromJson(String id, Map<String, dynamic>? json) {
    if (id.trim().isEmpty) {
      throw const FormatException('필수 필드 누락: id');
    }
    final data = json ?? const <String, dynamic>{};
    return Quest(
      id: id.trim(),
      title: requireString(data, 'title'),
      difficulty: Difficulty.fromNameOrDefault(asString(data['difficulty'])),
      status: _readStatus(data),
      deadline: asDateTime(data['deadline']),
      order: asInt(data['order']),
      goalId: asNullableString(data['goalId']),
      parentQuestId: asNullableString(data['parentQuestId']),
      // 출처는 **엄격 파싱**한다. 없거나(구 문서) 이상하면 null로 두고,
      // [effectiveSource]가 goalId 기반 하위호환 폴백을 적용한다.
      source: QuestSource.fromName(asNullableString(data['source'])),
      createdAt: asDateTime(data['createdAt']),
      completedAt: asDateTime(data['completedAt']),
      rewardedAt: asDateTime(data['rewardedAt']),
      memo: asNullableString(data['memo']),
      // 하위호환: 이 필드 도입 전 문서엔 값이 없어(null) `asBool`이 false로 떨어진다.
      // 관대 파싱 — 값이 이상해도 목록을 죽이지 않는다(나머지 필드와 같은 계약).
      archived: asBool(data['archived']),
    );
  }

  /// 상태 읽기 — **하위호환.**
  ///
  /// `status`가 도입되기 전에 저장된 문서는 `done: true/false`만 가지고 있다.
  /// 그 문서들도 그대로 읽혀야 하므로, `status`가 없으면 `done`으로 폴백한다.
  /// (마이그레이션 스크립트 없이 기존 데이터가 살아남는다)
  static QuestStatus _readStatus(Map<String, dynamic> data) {
    final explicit = QuestStatus.fromName(asString(data['status']));
    if (explicit != null) return explicit;
    return asBool(data['done']) ? QuestStatus.done : QuestStatus.todo;
  }

  /// 파싱 실패 시 `null`. 리스트에서 불량 문서만 걸러낼 때 쓴다.
  static Quest? tryParse(String id, Map<String, dynamic>? json) {
    try {
      return Quest.fromJson(id, json);
    } on FormatException {
      return null;
    }
  }

  final String id;
  final String title;
  final Difficulty difficulty;

  /// 미완료 · 완료 · 멈춤.
  final QuestStatus status;

  final DateTime? deadline;

  /// 목록 정렬 순서. AI 분해 결과의 실행 경로 순서이기도 하다.
  final int order;

  /// 어느 큰 목표에서 분해돼 나왔는지 (`goals/{goalId}`).
  ///
  /// 개별 항목을 재분해하려면 원본 목표의 맥락이 필요하다 —
  /// "공모전 지원하기"라는 맥락 없이 "지원서 초안 쓰기"만 AI에 던지면
  /// 엉뚱한 결과가 나온다. 직접 등록한 퀘스트는 `null`.
  final String? goalId;

  /// 재분해로 생겨난 자식이면 원본 퀘스트의 ID.
  ///
  /// 성공 지표 「재분해 복귀율」을 계산하는 근거다.
  final String? parentQuestId;

  /// **출처 — AI 분해로 생겼나, 직접 등록했나.** (`null` = 문서에 기록 없음)
  ///
  /// ⚠️ 직접 표시에 쓰지 말 것 — [effectiveSource]를 써라. 이 필드는 "문서에 명시된
  /// 값"만 담는다. 구 문서엔 값이 없어(null) 폴백이 필요하고, 그 폴백은
  /// [effectiveSource]가 goalId로 계산한다.
  ///
  /// **왜 goalId 추론 대신 별도 필드인가:** 직접 등록이 목표(폴더) 단위가 되면서
  /// 직접 등록 퀘스트도 goalId를 갖게 됐다. "goalId 있으면 AI"라는 옛 추론은 직접
  /// 등록을 AI로 오표기한다. 출처는 goalId와 별개의 사실이라 명시 신호로 분리했다.
  final QuestSource? source;

  final DateTime? createdAt;

  /// **언제 완료했나.** 완료를 해제하면 지워진다([withStatus] 참고).
  ///
  /// 이 값으로 "보상을 줬는지"를 판단하면 안 된다 — 완료 해제로 지워지므로
  /// 체크를 껐다 켜는 것만으로 보상이 재지급된다. 지급 여부는 [rewardedAt]이 안다.
  final DateTime? completedAt;

  /// **보상(코인·XP)을 지급한 시각.** 한번 세팅되면 **절대 지워지지 않는다.**
  ///
  /// [completedAt]과 분리한 이유: 한 필드가 "언제 완료했나"와 "보상 줬나"를 겸하면
  /// 둘의 수명이 충돌한다. 완료 해제는 완료 시각을 지워야 자연스럽지만, 지급 이력까지
  /// 지워지면 완료 → 해제 → 재완료로 코인을 무한 파밍할 수 있다.
  /// 그래서 의미를 쪼개, 재지급 가드는 **오직 이 필드**만 근거로 삼는다.
  ///
  /// ⚠️ 하위호환: 이 필드가 도입되기 전에 저장된 문서에는 값이 없다(null).
  /// 그런 퀘스트를 완료하면 "아직 미지급"으로 보고 보상이 한 번 지급된다.
  /// 데모 단계에선 수용 가능한 손실이라 마이그레이션 없이 그대로 둔다.
  final DateTime? rewardedAt;

  /// 완료할 때 사용자가 남긴 **인증 메모** (3주차-B).
  ///
  /// 이 값이 있으면 인증이 성립해 [kVerificationBonus]가 함께 지급됐다는 뜻이다.
  /// 단, 지급 여부의 판단은 여기가 아니라 [rewardedAt]이 한다 —
  /// 메모는 나중에 고쳐 쓸 수 있는 사용자 콘텐츠라 가드로 쓰기에 부적합하다.
  ///
  /// ⚠️ 빈 문자열은 파싱 단계에서 `null`로 정규화된다([asNullableString]).
  /// "공백만 입력했는데 인증으로 쳐 주는" 구멍을 모델 경계에서 미리 막는다.
  final String? memo;

  /// **보관함으로 옮겨졌는가** (2단계).
  ///
  /// "오늘의 퀘스트 = 할 일, 보관함 = 끝낸 일" 구조를 만드는 단 하나의 플래그다.
  /// 완료 즉시(직접 등록) 또는 목표 전체 완료 시(폴더 통째로) `true`가 되며,
  /// **되돌리지 않는다**(단방향). 새 화면·새 데이터 구조를 만들지 않고 이 플래그와
  /// 필터 분기만으로 오늘의 퀘스트/보관함을 가른다.
  final bool archived;

  /// 인증 메모를 남긴 퀘스트인가.
  bool get isVerified => memo != null;

  /// 보상을 이미 받은 퀘스트인가. 재지급 차단의 유일한 판단 기준.
  bool get isRewarded => rewardedAt != null;

  /// 완료 여부. 3상태로 바꾸기 전 호출부들이 계속 동작하도록 남긴 편의 게터.
  bool get done => status == QuestStatus.done;

  /// 사용자가 막혀서 멈춘 퀘스트인가. 재분해 대상.
  bool get isStuck => status == QuestStatus.stuck;

  /// **표시에 쓰는 실효 출처.** [source]가 명시돼 있으면 그 값, 없으면(구 문서)
  /// goalId로 폴백한다: goalId 있으면 AI, 없으면 직접.
  ///
  /// 하위호환의 유일한 정의처다 — 구 AI 분해 데이터(source 없음 + goalId 있음)가
  /// 계속 AI로 보이고, 구 낱개(source 없음 + goalId 없음)는 직접으로 보인다.
  QuestSource get effectiveSource =>
      source ?? (goalId != null ? QuestSource.ai : QuestSource.manual);

  /// AI 분해로 생긴 퀘스트인가([effectiveSource] 기준). 출처 칩이 읽는다.
  bool get isAiGenerated => effectiveSource == QuestSource.ai;

  /// 이 퀘스트를 완료하면 받는 기본 보상(인증 보너스 제외).
  Reward get reward => rewardFor(difficulty);

  Map<String, dynamic> toJson() => {
    'title': title,
    'difficulty': difficulty.name,
    'status': status.name,
    // `done`도 함께 쓴다: 구버전 앱이 읽어도 완료 여부를 알 수 있고,
    // Firestore 콘솔에서 눈으로 훑기도 쉽다.
    'done': done,
    'order': order,
    if (deadline != null) 'deadline': deadline!.toIso8601String(),
    if (goalId != null) 'goalId': goalId,
    if (parentQuestId != null) 'parentQuestId': parentQuestId,
    // 명시된 출처만 기록한다. null(구 문서/미지정)이면 키를 두지 않아, 읽을 때
    // effectiveSource가 goalId 폴백을 적용한다(archived·rewardedAt과 같은 원칙).
    if (source != null) 'source': source!.name,
    if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
    if (completedAt != null) 'completedAt': completedAt!.toIso8601String(),
    if (rewardedAt != null) 'rewardedAt': rewardedAt!.toIso8601String(),
    if (memo != null) 'memo': memo,
    // true일 때만 기록한다 — 기본값(false)은 필드를 아예 두지 않아, 기존 문서와
    // 스키마가 어긋나지 않고 하위호환 파싱(asBool 기본 false)과도 정확히 맞물린다.
    if (archived) 'archived': true,
  };

  Quest copyWith({
    String? title,
    Difficulty? difficulty,
    QuestStatus? status,
    DateTime? deadline,
    int? order,
    String? goalId,
    String? parentQuestId,
    QuestSource? source,
    DateTime? createdAt,
    DateTime? completedAt,
    DateTime? rewardedAt,
    String? memo,
    bool? archived,
  }) {
    return Quest(
      id: id,
      title: title ?? this.title,
      difficulty: difficulty ?? this.difficulty,
      status: status ?? this.status,
      deadline: deadline ?? this.deadline,
      order: order ?? this.order,
      goalId: goalId ?? this.goalId,
      parentQuestId: parentQuestId ?? this.parentQuestId,
      source: source ?? this.source,
      createdAt: createdAt ?? this.createdAt,
      completedAt: completedAt ?? this.completedAt,
      rewardedAt: rewardedAt ?? this.rewardedAt,
      memo: memo ?? this.memo,
      archived: archived ?? this.archived,
    );
  }

  /// 상태를 바꾼다. 완료를 해제하면 완료 시각도 함께 지운다.
  ///
  /// `copyWith(completedAt: null)`은 null 병합 때문에 기존 값을 지우지 못하므로
  /// 이 메서드로만 상태를 전이시킨다.
  ///
  /// ⚠️ **[rewardedAt]은 어떤 전이에서도 보존한다.** 완료를 해제해도 "이미 보상을
  /// 줬다"는 사실은 사라지지 않는다. 이게 완료 → 해제 → 재완료 파밍을 막는 지점이다.
  ///
  /// ⚠️ **[memo]도 같은 이유로 보존한다.** 사용자가 직접 쓴 글이라 완료를 잘못
  /// 해제했다는 이유로 사라지면 손실이 크다(되돌릴 방법이 없다).
  Quest withStatus(QuestStatus next, {DateTime? completedAt}) {
    return Quest(
      id: id,
      title: title,
      difficulty: difficulty,
      status: next,
      deadline: deadline,
      order: order,
      goalId: goalId,
      parentQuestId: parentQuestId,
      // 출처는 상태 전이와 무관한 불변 사실이라 보존한다.
      source: source,
      createdAt: createdAt,
      completedAt: next == QuestStatus.done
          ? (completedAt ?? this.completedAt ?? DateTime.now())
          : null,
      rewardedAt: rewardedAt,
      memo: memo,
      // 보관 여부는 상태 전이와 무관하게 보존한다(단방향 플래그).
      archived: archived,
    );
  }

  @override
  bool operator ==(Object other) =>
      other is Quest &&
      other.id == id &&
      other.title == title &&
      other.difficulty == difficulty &&
      other.status == status &&
      other.deadline == deadline &&
      other.order == order &&
      other.goalId == goalId &&
      other.parentQuestId == parentQuestId &&
      other.source == source &&
      other.createdAt == createdAt &&
      other.completedAt == completedAt &&
      other.rewardedAt == rewardedAt &&
      other.memo == memo &&
      other.archived == archived;

  @override
  int get hashCode => Object.hash(
    id,
    title,
    difficulty,
    status,
    deadline,
    order,
    goalId,
    parentQuestId,
    source,
    createdAt,
    completedAt,
    rewardedAt,
    memo,
    archived,
  );

  @override
  String toString() =>
      'Quest($id, "$title", ${difficulty.name}, ${status.name}'
      '${isRewarded ? ', rewarded' : ''}'
      '${isVerified ? ', verified' : ''}'
      '${archived ? ', archived' : ''})';
}
