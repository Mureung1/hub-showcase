import 'quest.dart';

/// 직접 등록한(= `goalId`가 없는) 퀘스트 그룹의 라벨.
const String kDirectQuestGroupLabel = '직접 등록한 퀘스트';

/// 목표 문서를 찾지 못했을 때 쓰는 폴백 라벨.
///
/// 퀘스트에 `goalId`는 있는데 `goals/{goalId}` 문서가 없거나 깨진 경우다
/// (문서 삭제·부분 저장 실패·구버전 데이터). 이때 **퀘스트를 숨기지 않는다** —
/// 목표 문서 하나 때문에 퀘스트가 목록에서 사라지면 사용자는 데이터를 잃은 걸로 본다.
const String kUnknownGoalLabel = '목표';

/// 큰 목표(폴더) 하나와 거기서 나온 퀘스트들.
class QuestGroup {
  const QuestGroup({
    required this.goalId,
    required this.label,
    required this.quests,
  });

  /// 원본 목표 ID. 직접 등록 그룹은 `null`.
  final String? goalId;

  /// 화면에 그릴 폴더 이름.
  final String label;

  /// 이 목표에서 나온 퀘스트들. 입력 순서(= 저장소 정렬)를 그대로 유지한다.
  final List<Quest> quests;

  /// 접힘 상태를 기억할 때 쓰는 키. `goalId`가 null인 그룹도 키가 필요하다.
  ///
  /// 실제 goalId와 충돌하지 않도록 Firestore 문서 ID에 쓸 수 없는 문자를 넣었다.
  String get key => goalId ?? '/direct';

  int get total => quests.length;

  int get doneCount => quests.where((q) => q.done).length;

  /// 전부 완료됐는가. 빈 그룹은 false(완료로 볼 대상이 없다).
  bool get isAllDone => quests.isNotEmpty && doneCount == total;

  /// 진행률 0.0 ~ 1.0. 빈 그룹은 0.
  double get progress => total == 0 ? 0 : doneCount / total;

  @override
  String toString() => 'QuestGroup($label, $doneCount/$total)';
}

/// 퀘스트를 **큰 목표 단위**로 묶는다.
///
/// 왜 순수 함수로 빼는가: 화면 안에서 묶으면 "그룹 순서가 왜 이렇게 나오나",
/// "목표가 지워졌을 때 퀘스트가 사라지나" 같은 규칙을 위젯 테스트로만 확인하게 된다.
/// 규칙 자체는 UI와 무관하니 여기서 결정하고 여기서 검증한다
/// (`growth_rules.dart`의 `applyXpGain`과 같은 이유).
///
/// [goalTexts]는 `goalId → 목표 텍스트` 맵이다. 없는 키는 [kUnknownGoalLabel]로 떨어진다.
///
/// 규칙 세 가지:
/// - **그룹 순서 = 그룹 내 첫 퀘스트의 위치.** 저장소가 이미 `order`→`createdAt`으로
///   정렬해 준 것을 다시 뒤집지 않는다. 목표 생성 시각으로 정렬하면 "방금 완료한
///   퀘스트의 폴더가 갑자기 위로 올라가는" 식으로 목록이 튄다.
/// - **직접 등록 그룹은 항상 맨 아래.** 개수가 들쭉날쭉한 잡동사니 묶음이라
///   위에 있으면 AI로 쪼갠 목표들을 밀어낸다.
/// - **그룹 내부 순서는 입력 순서 유지.** 마이크로 퀘스트는 순서가 곧 실행 경로다.
List<QuestGroup> groupQuestsByGoal(
  List<Quest> quests,
  Map<String, String> goalTexts,
) {
  // LinkedHashMap이라 삽입 순서 = 첫 퀘스트가 나타난 순서가 그대로 그룹 순서가 된다.
  final byGoal = <String, List<Quest>>{};
  final direct = <Quest>[];

  for (final quest in quests) {
    final goalId = quest.goalId;
    if (goalId == null) {
      direct.add(quest);
    } else {
      byGoal.putIfAbsent(goalId, () => []).add(quest);
    }
  }

  final groups = [
    for (final entry in byGoal.entries)
      QuestGroup(
        goalId: entry.key,
        label: goalTexts[entry.key] ?? kUnknownGoalLabel,
        quests: List.unmodifiable(entry.value),
      ),
  ];

  if (direct.isNotEmpty) {
    groups.add(
      QuestGroup(
        goalId: null,
        label: kDirectQuestGroupLabel,
        quests: List.unmodifiable(direct),
      ),
    );
  }

  return List.unmodifiable(groups);
}
