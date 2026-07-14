import '../core/constants/reward_rules.dart';
import '../core/utils/json_utils.dart';
import 'difficulty.dart';
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
    this.createdAt,
    this.completedAt,
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
      createdAt: asDateTime(data['createdAt']),
      completedAt: asDateTime(data['completedAt']),
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

  final DateTime? createdAt;
  final DateTime? completedAt;

  /// 완료 여부. 3상태로 바꾸기 전 호출부들이 계속 동작하도록 남긴 편의 게터.
  bool get done => status == QuestStatus.done;

  /// 사용자가 막혀서 멈춘 퀘스트인가. 재분해 대상.
  bool get isStuck => status == QuestStatus.stuck;

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
    if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
    if (completedAt != null) 'completedAt': completedAt!.toIso8601String(),
  };

  Quest copyWith({
    String? title,
    Difficulty? difficulty,
    QuestStatus? status,
    DateTime? deadline,
    int? order,
    String? goalId,
    String? parentQuestId,
    DateTime? createdAt,
    DateTime? completedAt,
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
      createdAt: createdAt ?? this.createdAt,
      completedAt: completedAt ?? this.completedAt,
    );
  }

  /// 상태를 바꾼다. 완료를 해제하면 완료 시각도 함께 지운다.
  ///
  /// `copyWith(completedAt: null)`은 null 병합 때문에 기존 값을 지우지 못하므로
  /// 이 메서드로만 상태를 전이시킨다.
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
      createdAt: createdAt,
      completedAt: next == QuestStatus.done
          ? (completedAt ?? this.completedAt ?? DateTime.now())
          : null,
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
      other.createdAt == createdAt &&
      other.completedAt == completedAt;

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
    createdAt,
    completedAt,
  );

  @override
  String toString() =>
      'Quest($id, "$title", ${difficulty.name}, ${status.name})';
}
