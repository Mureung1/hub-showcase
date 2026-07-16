import '../core/constants/reward_rules.dart';
import 'difficulty.dart';
import 'quest.dart';
import 'quest_status.dart';

/// **확정 전 초안 퀘스트.** AI가 분해해 준 결과이며, 아직 Firestore에 저장되지 않았다.
///
/// `docs/plan.md` 시나리오가 두 단계를 명확히 나눈다:
/// > 3. 사용자는 AI가 만든 결과를 **확인하고** 수정·삭제·다시 분해한다.
/// > 4. **확정한** 퀘스트는 오늘의 퀘스트 목록에 **등록된다.**
///
/// 즉 수정·삭제·재생성은 **저장 전**에 일어난다. [Quest]는 `id`가 필수라
/// "아직 저장 안 된 것"을 표현할 수 없으므로 별도 타입이 필요하다.
class QuestDraft {
  const QuestDraft({
    required this.localId,
    required this.title,
    required this.difficulty,
    this.order = 0,
    this.redecomposeCount = 0,
  });

  /// 화면에서 항목을 식별하기 위한 임시 ID. Firestore ID가 아니다.
  final String localId;

  final String title;
  final Difficulty difficulty;
  final int order;

  /// **이 초안 계보가 개별 쪼개기(🔄)로 재분해된 횟수(depth).**
  ///
  /// 원본 초안은 0, 한 번 쪼개져 나온 자식은 1, 그 자식이 또 쪼개져 나온 손자는 2다.
  /// #3 정책상 `kMaxRedecomposeCount`(2)에 도달하면 더는 쪼갤 수 없다 —
  /// [DecomposeNotifier]가 가드하고 화면은 🔄 버튼을 숨긴다. AI 응답([parseStrict])이나
  /// 저장([toQuest])과는 무관한 **저장 전 편집 세션 안에서만 쓰는 값**이라 기본 0이다.
  final int redecomposeCount;

  Reward get reward => rewardFor(difficulty);

  /// **AI 응답 한 항목을 엄격하게 검증한다. 조금이라도 이상하면 거부한다.**
  ///
  /// [Quest.fromJson]과 정반대 정책이다. 이유:
  /// - 저장된 문서는 관대하게 읽어야 한다(깨졌다고 화면이 죽으면 안 됨).
  /// - **AI 응답은 엄격하게 걸러야 한다.** 난이도가 곧 보상 등급(코인 3/5/10)이라,
  ///   AI가 `"매우어려움"`을 뱉었을 때 조용히 `normal`로 떨어뜨리면
  ///   **사용자가 받아야 할 보상이 왜곡된다.** 그런 항목은 버리는 게 맞다.
  ///
  /// checklist 2주차: "스키마 검증기가 **필수 필드 누락·잘못된 난이도 값을 거부**한다"
  ///
  /// 반환 `null` = 이 항목은 버린다.
  static QuestDraft? parseStrict(
    Object? raw, {
    required String localId,
    required int order,
  }) {
    if (raw is! Map) return null;

    // 제목: 없거나 공백뿐이면 거부.
    final rawTitle = raw['title'];
    if (rawTitle is! String) return null;
    final title = rawTitle.trim();
    if (title.isEmpty) return null;

    // 난이도: 엄격 파싱. 모르는 값이면 **거부**(조용한 normal 폴백 금지).
    final rawDifficulty = raw['difficulty'];
    if (rawDifficulty is! String) return null;
    final difficulty = Difficulty.fromName(rawDifficulty);
    if (difficulty == null) return null;

    return QuestDraft(
      localId: localId,
      title: title,
      difficulty: difficulty,
      order: order,
    );
  }

  /// AI 응답의 퀘스트 배열을 파싱한다. **불량 항목은 조용히 버리고 나머지는 살린다.**
  ///
  /// checklist 2주차: "필수 필드 누락 응답을 감지해 **해당 항목을 제외**하거나 폴백 처리한다"
  static List<QuestDraft> parseList(Object? rawList) {
    if (rawList is! List) return const [];

    final drafts = <QuestDraft>[];
    for (final raw in rawList) {
      final draft = parseStrict(
        raw,
        localId: 'draft-${drafts.length}',
        // order는 살아남은 항목 기준으로 다시 매긴다.
        // 버려진 항목 때문에 순서에 구멍이 나면 안 된다.
        order: drafts.length,
      );
      if (draft != null) drafts.add(draft);
    }
    return drafts;
  }

  /// 확정 시 저장 가능한 [Quest]로 바꾼다.
  ///
  /// [id]는 Firestore가 부여한다. [order]는 기존 퀘스트 뒤에 붙도록 저장소가 오프셋을 더한다.
  Quest toQuest({required String id, required String? goalId, int? order}) {
    return Quest(
      id: id,
      title: title,
      difficulty: difficulty,
      status: QuestStatus.todo,
      order: order ?? this.order,
      goalId: goalId,
      createdAt: DateTime.now(),
    );
  }

  QuestDraft copyWith({
    String? title,
    Difficulty? difficulty,
    int? order,
    int? redecomposeCount,
  }) {
    return QuestDraft(
      localId: localId,
      title: title ?? this.title,
      difficulty: difficulty ?? this.difficulty,
      order: order ?? this.order,
      // 재번호(copyWith(order:))는 계보 depth를 건드리지 않아야 하므로 기본 보존.
      redecomposeCount: redecomposeCount ?? this.redecomposeCount,
    );
  }

  @override
  bool operator ==(Object other) =>
      other is QuestDraft &&
      other.localId == localId &&
      other.title == title &&
      other.difficulty == difficulty &&
      other.order == order &&
      other.redecomposeCount == redecomposeCount;

  @override
  int get hashCode =>
      Object.hash(localId, title, difficulty, order, redecomposeCount);

  @override
  String toString() =>
      'QuestDraft($localId, "$title", ${difficulty.name}, r$redecomposeCount)';
}
