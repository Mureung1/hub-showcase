import '../core/constants/decompose_limits.dart';
import 'quest.dart';

/// 직접 등록한(= `goalId`가 없는) 퀘스트 그룹의 라벨.
const String kDirectQuestGroupLabel = '직접 등록한 퀘스트';

/// 목표 문서를 찾지 못했을 때 쓰는 폴백 라벨.
///
/// 퀘스트에 `goalId`는 있는데 `goals/{goalId}` 문서가 없거나 깨진 경우다
/// (문서 삭제·부분 저장 실패·구버전 데이터). 이때 **퀘스트를 숨기지 않는다** —
/// 목표 문서 하나 때문에 퀘스트가 목록에서 사라지면 사용자는 데이터를 잃은 걸로 본다.
const String kUnknownGoalLabel = '목표';

/// 목록에 그릴 퀘스트 하나 + 재분해 계보에서의 깊이.
///
/// 원본(재분해된 적 없거나 재분해의 출발점)은 0, 그 자식은 1, 자식의 자식은 2다.
class QuestNode {
  const QuestNode({required this.quest, required this.depth});

  final Quest quest;

  /// `parentQuestId` 체인의 길이. 화면 들여쓰기와 재분해 가드가 이 값을 쓴다.
  final int depth;

  /// 재분해로 생겨난 자식인가.
  bool get isChild => depth > 0;

  /// **이 퀘스트를 더 재분해할 수 있는가.**
  ///
  /// [Quest]에는 `redecomposeCount`가 없다(그건 저장 전 초안 세션 전용 값이다).
  /// 저장된 퀘스트의 깊이는 `parentQuestId` 체인이 유일한 근거이므로 여기서 판정한다.
  /// 기준은 초안 쪽과 같은 [kMaxRedecomposeCount] — 원본(0)→자식(1)까지는 나눌 수
  /// 있고 **자식의 자식(2)은 더 나눌 수 없다.** 무한 중첩은 목록 표시가 감당하지 못한다.
  bool get canRedecompose => depth < kMaxRedecomposeCount;

  @override
  String toString() => 'QuestNode(${quest.id}, d$depth)';
}

/// 퀘스트 목록을 **재분해 계보 순서**로 펼친다 — 자식은 부모 바로 뒤에 오고,
/// 각 항목의 깊이를 함께 낸다.
///
/// [groupQuestsByGoal]과 같은 이유로 순수 함수다: "자식이 어디에 붙나",
/// "부모를 못 찾는 자식은 어떻게 되나", "순환 참조면 목록이 멈추나" 같은 규칙을
/// 위젯 테스트로만 확인하게 두지 않는다.
///
/// 규칙:
/// - **입력 순서를 존중한다.** 저장소가 이미 `order`→`createdAt`으로 정렬해 준 것을
///   뒤집지 않고, 부모-자식 관계만 재배치한다.
/// - **고아 자식(부모를 못 찾는 자식)도 숨기지 않는다.** 깊이 0의 뿌리로 올려 보여
///   준다. 목표 문서를 못 찾아도 퀘스트를 숨기지 않는([kUnknownGoalLabel]) 것과 같은
///   원칙 — 데이터를 잃은 것처럼 보이면 안 된다.
/// - **순환 참조에도 멈추지 않는다.** 이미 낸 항목은 다시 내지 않고, 순환 때문에
///   한 번도 못 나온 항목은 마지막에 뿌리로 낸다(누락 0).
/// 이 퀘스트가 계보의 **뿌리**인가 (= 유효한 부모가 목록에 없는가).
///
/// 자기 자신을 부모로 가리키거나(오염된 문서), 부모가 이 목록에 없으면(삭제·다른
/// 목표로 이동) 뿌리로 취급한다 — 어느 쪽이든 숨기지 않는다.
/// [arrangeQuestTree]와 [_childrenByParent]가 같은 판정을 공유한다.
bool _isRoot(Quest quest, Map<String, Quest> byId) {
  final parentId = quest.parentQuestId;
  return parentId == null ||
      parentId == quest.id ||
      !byId.containsKey(parentId);
}

/// 부모 ID → 그 자식들(입력 순서 유지). LinkedHashMap이라 삽입 순서가 그대로다.
///
/// 계보의 유일한 근거는 `parentQuestId`다. [arrangeQuestTree]의 화면 정렬과
/// [descendantIds]의 삭제 계보가 **같은 맵**을 쓰므로, 고아·순환 방어가 두 곳에서
/// 갈라지지 않는다(한쪽만 고쳐 어긋나는 사고를 막는다).
Map<String, List<Quest>> _childrenByParent(List<Quest> quests) {
  final byId = {for (final quest in quests) quest.id: quest};
  final childrenOf = <String, List<Quest>>{};
  for (final quest in quests) {
    if (_isRoot(quest, byId)) continue;
    childrenOf.putIfAbsent(quest.parentQuestId!, () => []).add(quest);
  }
  return childrenOf;
}

List<QuestNode> arrangeQuestTree(List<Quest> quests) {
  if (quests.isEmpty) return const [];

  final byId = {for (final quest in quests) quest.id: quest};

  // 부모 → 자식들, 그리고 뿌리들. 계보 판정은 [_isRoot] 한 곳에서 온다.
  final childrenOf = _childrenByParent(quests);
  final roots = [
    for (final quest in quests)
      if (_isRoot(quest, byId)) quest,
  ];

  final result = <QuestNode>[];
  final emitted = <String>{};

  void emit(Quest quest, int depth) {
    // 같은 항목을 두 번 내지 않는다(순환·중복 ID 방어).
    if (!emitted.add(quest.id)) return;
    result.add(QuestNode(quest: quest, depth: depth));
    for (final child in childrenOf[quest.id] ?? const <Quest>[]) {
      emit(child, depth + 1);
    }
  }

  for (final root in roots) {
    emit(root, 0);
  }

  // 순환 고리에 갇혀 뿌리를 못 가진 항목들. 여기까지 오면 데이터가 이미 이상하지만,
  // 그렇다고 목록에서 사라지게 두지는 않는다.
  for (final quest in quests) {
    emit(quest, 0);
  }

  return List.unmodifiable(result);
}

/// [rootId]에서 재분해로 뻗어 나온 **하위 퀘스트 전체의 ID**(자식·자식의 자식…).
/// **rootId 자신은 포함하지 않는다** — 삭제 대상 집합은 화면이
/// `{rootId, ...descendantIds(...)}`로 합친다.
///
/// 왜 순수 함수인가: 재분해 원본을 지울 때 "함께 사라질 하위 퀘스트가 몇 개인가"는
/// 삭제 경고 문구의 N이자 실제로 지울 문서 집합이다. 이 계산이 틀리면 자식이 고아로
/// 남거나(부모만 지워짐) 엉뚱한 퀘스트가 지워진다 — UI 테스트로만 확인하게 두지
/// 않는다([arrangeQuestTree]와 같은 이유).
///
/// 계보의 근거·방어는 [arrangeQuestTree]와 같은 [_childrenByParent]에서 물려받는다.
/// 순환 참조(a→b→a)나 자기 참조가 있어도 [visited]가 같은 항목을 두 번 밟지 않아
/// 멈춘다. 뿌리를 시작부터 [visited]에 넣어 두므로 순환이 rootId로 되돌아와도
/// 결과에 rootId가 섞이지 않는다.
Set<String> descendantIds(List<Quest> quests, String rootId) {
  final childrenOf = _childrenByParent(quests);
  final result = <String>{};
  final visited = <String>{rootId};
  final stack = <String>[rootId];

  while (stack.isNotEmpty) {
    final current = stack.removeLast();
    for (final child in childrenOf[current] ?? const <Quest>[]) {
      if (visited.add(child.id)) {
        result.add(child.id);
        stack.add(child.id);
      }
    }
  }

  return result;
}

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

  /// 재분해 계보를 반영해 정렬한 목록 (부모 바로 뒤에 자식, 깊이 포함).
  ///
  /// 저장 순서([quests])를 건드리지 않고 **화면에 그릴 순서**만 여기서 만든다.
  /// 규칙과 방어(고아 자식·순환)는 전부 [arrangeQuestTree]에 있다.
  List<QuestNode> get nodes => arrangeQuestTree(quests);

  /// 접힘 상태를 기억할 때 쓰는 키. `goalId`가 null인 그룹도 키가 필요하다.
  ///
  /// 실제 goalId와 충돌하지 않도록 Firestore 문서 ID에 쓸 수 없는 문자를 넣었다.
  String get key => goalId ?? '/direct';

  int get total => quests.length;

  /// 완료한 퀘스트 수.
  ///
  /// ⚠️ **재분해한 원본(stuck)은 여기 들어가지 않는다.** 자식을 전부 끝내도 원본이
  /// 멈춤인 한 그룹은 100%가 되지 않는다. 사용자가 원본을 직접 완료 체크하면 해소된다.
  /// **자동 완료 처리는 일부러 하지 않는다** — 완료는 보상 지급 트랜잭션
  /// (`completeQuest`)을 타는 경로라, 자식 완료를 근거로 부모를 자동 완료시키면
  /// 사용자가 누르지 않은 지급이 발생한다. 그건 보상 정책 변경이므로 별개 결정이다.
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
