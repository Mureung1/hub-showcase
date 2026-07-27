import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/analytics/analytics_logger.dart';
import '../../core/constants/decompose_limits.dart';
import '../../core/error/app_failure.dart';
import '../../models/analytics_event.dart';
import '../../models/difficulty.dart';
import '../../models/quest_draft.dart';
import '../../models/quest_source.dart';
import '../../providers/providers.dart';
import '../../repositories/decompose/quest_templates.dart';

/// 분해 결과가 AI에서 왔는지 폴백 템플릿에서 왔는지.
/// checklist #13: "폴백 발생 사실이 사용자 또는 로그로 구분 가능".
enum DecomposeSource { ai, template }

/// **이미 저장된 퀘스트**를 재분해할 때의 대상 (4주차 B-5).
///
/// ⚠️ [DecomposeNotifier.redecomposeOne]과 혼동하지 말 것. 그쪽은 **저장 전 초안**을
/// 화면 안에서 쪼개 그 자리에 갈아끼우는 편집이고, 이쪽은 **Firestore에 이미 있는
/// 퀘스트**를 원본으로 두고 자식을 새로 저장하는 흐름이다. 원본은 지우지 않는다 —
/// 성공 지표 「재분해 복귀율」의 분모가 그 원본(stuck)이기 때문이다.
class RedecomposeTarget {
  const RedecomposeTarget({
    required this.questId,
    required this.questTitle,
    required this.difficulty,
    this.goalId,
    this.goalText,
  });

  /// 원본 퀘스트 ID. 저장되는 자식의 `parentQuestId`가 된다.
  final String questId;

  final String questTitle;

  /// 원본 퀘스트의 난이도. AI에 넘길 항목([QuestDraft])을 복원하는 데 쓴다.
  final Difficulty difficulty;

  /// 원본 퀘스트의 `goalId`. 자식이 **같은 목표 폴더에 남도록** 그대로 물려준다.
  /// 직접 등록한 퀘스트면 null.
  final String? goalId;

  /// 원본 큰 목표의 텍스트(있으면). 프롬프트 맥락으로 넘긴다 —
  /// "공모전 지원하기"라는 맥락 없이 "지원서 초안 쓰기"만 던지면 엉뚱한 결과가 나온다
  /// (`goal_repository.dart` 주석).
  final String? goalText;

  /// AI에 넘길 맥락. 목표를 모르면(직접 등록) 퀘스트 제목 자체가 맥락이 된다.
  String get contextText => goalText ?? questTitle;

  /// 재분해 요청에 실을 항목. 저장된 퀘스트를 초안 형태로 되돌린 것뿐이라
  /// `redecomposeCount`(초안 세션 전용 값)는 쓰지 않는다.
  QuestDraft get item =>
      QuestDraft(localId: questId, title: questTitle, difficulty: difficulty);

  @override
  bool operator ==(Object other) =>
      other is RedecomposeTarget &&
      other.questId == questId &&
      other.questTitle == questTitle &&
      other.difficulty == difficulty &&
      other.goalId == goalId &&
      other.goalText == goalText;

  @override
  int get hashCode =>
      Object.hash(questId, questTitle, difficulty, goalId, goalText);

  @override
  String toString() => 'RedecomposeTarget($questId, "$questTitle")';
}

/// 분해 화면이 들고 있는 상태(저장 전 초안 목록 + 출처 + 원본 목표).
class DecomposeState {
  const DecomposeState({
    required this.drafts,
    required this.source,
    required this.goalText,
    this.isRegenerating = false,
    this.isSaving = false,
    this.regeneratingItemId,
    this.justSplitIds = const {},
    this.target,
  });

  final List<QuestDraft> drafts;
  final DecomposeSource source;
  final String goalText;

  /// 전체 재생성이 진행 중인지. **기존 결과를 화면에 계속 보여주면서**(전체 로딩으로
  /// 숨기지 않고) "다시 나누는 중"임을 표시하기 위한 플래그. 기본 false라 기존 호출부
  /// (decompose·_fallback·편집)는 그대로 유효하다.
  final bool isRegenerating;

  /// 확정 등록(저장)이 진행 중인지. isRegenerating과 같은 이유로 결과 카드는 계속
  /// 보여주면서 등록 버튼만 스피너로 바꾸기 위한 플래그다. 중복 탭 방지의 근거이기도
  /// 하다(저장 중 재호출은 무시). 기본 false라 기존 호출부는 그대로 유효하다.
  final bool isSaving;

  /// **개별 항목 재분해가 진행 중인 draft의 localId.** null이면 진행 중인 항목이 없다.
  ///
  /// 전체 플래그(isRegenerating/isSaving)와 달리 **어느 항목인지**까지 담는 이유:
  /// 재분해는 항목 단위라 그 카드에만 스피너를 돌려야 하고(전체가 아니라), 진행 중
  /// 다른 재분해 요청을 무시하는 single-flight의 근거이기도 하다. 기본 null이라 기존
  /// 호출부는 그대로 유효하다.
  final String? regeneratingItemId;

  /// **방금 개별 재분해로 갓 생겨난 하위 초안들의 localId 집합.** 화면이 이 항목에
  /// "방금 나눔" 칩을 띄워 "뭐가 새로 생겼는지"를 알린다(#6). 저장·전송되지 않는
  /// 순수 화면 하이라이트 상태다.
  ///
  /// **정책: 성공한 [redecomposeOne]만 세팅하고, 그 외 모든 전이(편집·저장·전체
  /// 재생성·재분해 시작·실패)는 비운다.** 그래서 헬퍼(_withX)들은 이 필드를 넘기지
  /// 않아 기본 `{}`로 리셋된다 — 다음 조작이 일어나면 하이라이트가 사라진다.
  /// 기본 `const {}`라 기존 호출부는 그대로 유효하다.
  final Set<String> justSplitIds;

  /// **이 세션이 「이미 저장된 퀘스트」의 재분해인가.** null이면 큰 목표 분해다.
  ///
  /// 이 값 하나가 등록([confirm]) 경로를 가른다: 재분해면 새 목표를 만들지 않고
  /// 원본의 `goalId`를 물려받으며 `parentQuestId`를 심는다. 상태 전이 헬퍼들이
  /// 이 값을 반드시 보존해야 하는 이유이기도 하다 — 중간에 잃으면 자식이
  /// 계보 없는 퀘스트로 저장돼 「재분해 복귀율」을 계산할 수 없다.
  final RedecomposeTarget? target;

  /// 재분해 모드인가.
  bool get isRedecompose => target != null;

  @override
  bool operator ==(Object other) =>
      other is DecomposeState &&
      other.source == source &&
      other.goalText == goalText &&
      other.target == target &&
      other.isRegenerating == isRegenerating &&
      other.isSaving == isSaving &&
      other.regeneratingItemId == regeneratingItemId &&
      setEquals(other.justSplitIds, justSplitIds) &&
      _listEquals(other.drafts, drafts);

  @override
  int get hashCode => Object.hash(
    source,
    goalText,
    target,
    isRegenerating,
    isSaving,
    regeneratingItemId,
    Object.hashAll(drafts),
    // 집합은 순서 무관이라 unordered 해시로 조합한다(==의 setEquals와 정합).
    Object.hashAllUnordered(justSplitIds),
  );

  @override
  String toString() =>
      'DecomposeState(source: ${source.name}, goalText: "$goalText", '
      'drafts: ${drafts.length}, isRegenerating: $isRegenerating, '
      'isSaving: $isSaving, regeneratingItemId: $regeneratingItemId, '
      'justSplitIds: ${justSplitIds.length}, target: $target)';
}

/// 리스트 요소 비교(길이 + 각 요소 ==). QuestDraft가 ==를 구현하므로 값 비교가 된다.
bool _listEquals(List<QuestDraft> a, List<QuestDraft> b) {
  if (identical(a, b)) return true;
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i] != b[i]) return false;
  }
  return true;
}

/// 목표를 분해하고, 실패/빈결과면 템플릿으로 폴백한다.
///
/// 폴백을 여기서 하는 이유: 엔진(QuestDecomposer)은 "AI가 성공/실패했나"만
/// 정직하게 throw하고, "실패 시 무엇으로 대체하나"는 이 상위 계층이 정한다(관심사 분리).
/// plan.md 기능 A: AI 실패나 지연 시 대표 도전 유형 템플릿을 제공한다.
class DecomposeNotifier extends AsyncNotifier<DecomposeState?> {
  @override
  Future<DecomposeState?> build() async => null; // 초기: 아직 분해 안 함

  Future<void> decompose(String goalText) async {
    state = const AsyncValue.loading();
    try {
      // #4 최대 5개 캡: 실제 LLM이 초과해도 앞에서 잘라 방어한다(템플릿은 이미 ≤5라
      // order 0..4가 그대로 유지되어 재번호가 필요 없다).
      final drafts = (await ref.read(questDecomposerProvider).decompose(goalText))
          .take(kMaxDecomposeDrafts)
          .toList();
      if (drafts.isEmpty) {
        // 성공했지만 0개 = 보여줄 게 없다 → 폴백.
        state = AsyncValue.data(_fallback(goalText));
      } else {
        state = AsyncValue.data(
          DecomposeState(
            drafts: drafts,
            source: DecomposeSource.ai,
            goalText: goalText,
          ),
        );
      }
    } on AppFailure {
      // AI 실패 → 템플릿 폴백. 크래시 없이 사용자의 도전은 시작될 수 있다.
      // sealed 베이스라 하위 5종 전부 잡힌다. AppFailure가 아닌 예외는
      // 엔진 계약 위반이므로 일부러 잡지 않고 드러나게 둔다.
      state = AsyncValue.data(_fallback(goalText));
    }
  }

  DecomposeState _fallback(String goalText) => DecomposeState(
    drafts: templateFor(goalText),
    source: DecomposeSource.template,
    goalText: goalText,
  );

  // ===== 저장된 퀘스트 재분해 (4주차 B-5) =====
  //
  // ⚠️ [redecomposeOne](저장 전 초안 쪼개기)과 **다른 흐름**이다. 여기서는 이미
  // Firestore에 있는 퀘스트가 원본이고, 결과는 그 원본의 **자식으로 새로 저장**된다.
  // 원본은 건드리지 않는다(상태도 stuck 그대로). 화면은 같은 [QuestSplitScreen]을
  // 재사용하므로 편집·재생성·폴백 방어가 그대로 따라온다.

  /// 저장된 퀘스트 하나를 더 작은 퀘스트들로 나눈다. 결과는 아직 저장되지 않는다 —
  /// 사용자가 확인·수정한 뒤 [confirm]에서 자식으로 등록된다.
  ///
  /// 개수 상한은 큰 목표 분해(5개)가 아니라 [kMaxRedecomposeDrafts](3개)다.
  /// 이미 한 번 쪼개진 항목을 또 잘게 나누면 목록이 순식간에 불어난다.
  ///
  /// 실패·빈 결과면 [decompose]와 같은 정책으로 템플릿 폴백한다 — 여기서 아무것도
  /// 안 주면 "막혔는데 도와주지도 않는" 화면이 된다. 폴백이든 AI든 **저장된 원본은
  /// 이 시점에 전혀 건드리지 않는다**(등록 전까지 쓰기가 없다).
  Future<void> redecomposeQuest(RedecomposeTarget target) async {
    state = const AsyncValue.loading();
    try {
      final drafts =
          (await ref
                  .read(questDecomposerProvider)
                  .redecompose(goalText: target.contextText, item: target.item))
              .take(kMaxRedecomposeDrafts)
              .toList();
      state = AsyncValue.data(
        drafts.isEmpty
            ? _redecomposeFallback(target)
            : DecomposeState(
                drafts: drafts,
                source: DecomposeSource.ai,
                goalText: target.contextText,
                target: target,
              ),
      );
    } on AppFailure {
      state = AsyncValue.data(_redecomposeFallback(target));
    }
  }

  /// 재분해 폴백. 템플릿도 3개까지만 쓴다(AI 성공 경로와 같은 상한).
  DecomposeState _redecomposeFallback(RedecomposeTarget target) =>
      DecomposeState(
        drafts: [
          for (final (i, d) in templateFor(
            target.questTitle,
          ).take(kMaxRedecomposeDrafts).indexed)
            d.copyWith(order: i),
        ],
        source: DecomposeSource.template,
        goalText: target.contextText,
        target: target,
      );

  /// 화면 상태를 초기(null)로 되돌린다.
  ///
  /// 큰 목표 분해로 **새로 들어왔을 때** 직전 재분해 세션이 남아 있으면,
  /// 사용자가 그 결과를 그대로 등록해 엉뚱한 퀘스트의 자식이 만들어진다.
  /// 화면이 진입 시 모드가 어긋나면 이걸 부른다.
  void reset() => state = const AsyncValue.data(null);

  // ===== 전체 재생성 (같은 목표로 다시 나누기) =====
  //
  // **첫 분해(decompose)와 정책이 다르다.** decompose는 실패 시 템플릿으로 폴백한다
  // (보여줄 게 없으니 뭐라도 준다). regenerateAll은 실패 시 **기존 결과를 그대로
  // 유지**한다 — 사용자가 이미 편집한 목록을 실패 때문에 날리면 안 되기 때문이다.
  // 템플릿으로 덮지도 않는다.

  /// drafts/source/goalText/isSaving/regeneratingItemId는 유지하고 [isRegenerating]만 교체한 새 상태.
  DecomposeState _withRegenerating(DecomposeState s, bool value) =>
      DecomposeState(
        drafts: s.drafts,
        source: s.source,
        goalText: s.goalText,
        isRegenerating: value,
        isSaving: s.isSaving,
        regeneratingItemId: s.regeneratingItemId,
        target: s.target,
      );

  /// 같은 목표로 전체 재생성. **실패/빈결과 시 기존 결과를 보존**한다(템플릿으로 덮지 않음).
  ///
  /// 반환: 성공 true / 실패(기존 유지) false → 화면이 스낵바로 안내한다.
  /// checklist #18: "재생성 실패 시 기존 결과가 보존된다(데이터 유실 없음)".
  Future<bool> regenerateAll() async {
    final current = state.valueOrNull;
    if (current == null) return false; // 분해 전 → 재생성할 게 없다.
    if (current.isRegenerating) return false; // 중복요청 방지.

    // 기존 결과를 유지한 채 재생성 표시만 켠다(전체 로딩으로 카드를 숨기지 않는다).
    state = AsyncValue.data(_withRegenerating(current, true));
    try {
      // 재분해 세션이면 같은 원본을 다시 나눈다(개수 상한도 3개 그대로). 여기서
      // decompose를 부르면 원본 퀘스트가 아니라 목표 전체가 5개로 다시 쪼개져
      // "이 퀘스트를 더 작게"라는 의도가 사라진다.
      final target = current.target;
      final fresh = target != null
          ? (await ref
                    .read(questDecomposerProvider)
                    .redecompose(
                      goalText: target.contextText,
                      item: target.item,
                    ))
                .take(kMaxRedecomposeDrafts)
                .toList()
          // #4 최대 5개 캡: 첫 분해와 동일 정책(실제 LLM 초과 방어).
          : (await ref
                    .read(questDecomposerProvider)
                    .decompose(current.goalText))
                .take(kMaxDecomposeDrafts)
                .toList();
      if (fresh.isEmpty) {
        // 새 결과가 비었다 = 보여줄 게 없다 → 기존 유지(덮지 않음).
        state = AsyncValue.data(_withRegenerating(current, false));
        return false;
      }
      // 성공: 기존 편집을 새 결과로 대체한다 — 이게 "전체 재생성"의 의도(do-over).
      state = AsyncValue.data(
        DecomposeState(
          drafts: fresh,
          source: DecomposeSource.ai,
          goalText: current.goalText,
          // 재분해 세션이면 원본 계보를 유지한다(잃으면 자식이 고아로 저장된다).
          target: current.target,
        ),
      );
      return true;
    } on AppFailure {
      // 실패 → 기존 결과 그대로. 사용자의 편집을 지킨다. 템플릿 폴백은 하지 않는다.
      state = AsyncValue.data(_withRegenerating(current, false));
      return false;
    }
  }

  // ===== 개별 항목 재분해 (초안 하나를 더 작게 쪼개기) =====
  //
  // 전체 재생성(regenerateAll)과 취지는 같으나 **1→여러**다: 카드 하나를 더 작은
  // 하위 퀘스트 여러 개로 나눠 **그 자리에 교체**한다. 실패 정책도 같다 — 실패/빈결과
  // 시 원본 항목을 그대로 보존한다(데이터 유실 없음). 다른 점은 진행 표시가 전체가
  // 아니라 **항목 단위**([regeneratingItemId])라, 그 카드에만 스피너가 돈다는 것.

  /// source/goalText/isRegenerating/isSaving/drafts는 유지하고 [regeneratingItemId]만
  /// 교체한 새 상태. (진행 중 표시를 특정 카드에 켜고 끄기 위한 헬퍼.)
  DecomposeState _withRegeneratingItem(DecomposeState s, String? itemId) =>
      DecomposeState(
        drafts: s.drafts,
        source: s.source,
        goalText: s.goalText,
        isRegenerating: s.isRegenerating,
        isSaving: s.isSaving,
        regeneratingItemId: itemId,
        target: s.target,
      );

  /// 초안 하나([localId])를 더 작은 하위 퀘스트들로 재분해해 **그 자리에 교체**한다.
  ///
  /// 원본 목표(goalText) 맥락을 함께 넘겨 엔진이 맥락을 잃지 않게 한다. 성공하면
  /// 대상 항목이 하위 초안 여러 개로 splice되고 전체 order가 0..m으로 재번호된다.
  /// 반환: 성공 true / 실패·빈결과·불가 false → 화면이 실패면 스낵바로 안내한다.
  /// checklist 163행 "개별 항목 재분해가 해당 항목만 새 결과로 교체한다".
  Future<bool> redecomposeOne(String localId) async {
    final current = state.valueOrNull;
    if (current == null) return false; // 분해 전 → 재분해할 게 없다.
    if (current.regeneratingItemId != null) return false; // single-flight: 진행 중이면 무시.

    // 대상 항목 위치를 찾는다. 없으면(이미 삭제 등) 변화 없이 false.
    final index = current.drafts.indexWhere((d) => d.localId == localId);
    if (index < 0) return false;
    final target = current.drafts[index];

    // #3 깊이 가드: 한 계보에서 재쪼개기는 최대 2번(depth2 손자는 더 못 쪼갠다).
    // 화면도 🔄를 숨기지만, 상태 변경 없이 여기서 한 번 더 방어한다(불변).
    if (target.redecomposeCount >= kMaxRedecomposeCount) return false;

    // 기존 목록을 유지한 채 그 항목만 "재분해 중"으로 표시한다(그 카드만 스피너).
    state = AsyncValue.data(_withRegeneratingItem(current, localId));
    try {
      // #3 최대 3개 캡: 실제 LLM이 초과해도 앞에서 잘라 방어한다.
      final sub = (await ref
              .read(questDecomposerProvider)
              .redecompose(goalText: current.goalText, item: target))
          .take(kMaxRedecomposeDrafts)
          .toList();
      if (sub.isEmpty) {
        // 빈 결과 = 더 쪼갤 게 없다 → 원본 항목 보존(교체하지 않음), 플래그 해제.
        state = AsyncValue.data(_withRegeneratingItem(current, null));
        return false;
      }

      // 성공: 대상 index를 하위 초안들로 splice(교체)한다. 하위 초안의 localId는
      // '${localId}::r$i'로 재부여한다 — 원본이 제거되므로 충돌하지 않고, 재분해에서
      // 나온 자식임이 id에 드러난다. copyWith는 localId를 못 바꾸므로 새 인스턴스로
      // 재구성한다. order는 임시 0으로 두고 아래에서 전체를 0..m으로 다시 매긴다.
      // #3 자식은 부모보다 depth가 1 깊다(redecomposeCount+1) — 계보 2번 제한의 근거.
      final spliced = <QuestDraft>[
        ...current.drafts.sublist(0, index),
        for (var i = 0; i < sub.length; i++)
          QuestDraft(
            localId: '$localId::r$i',
            title: sub[i].title,
            difficulty: sub[i].difficulty,
            order: 0, // 임시 — 바로 아래에서 전체 재번호.
            redecomposeCount: target.redecomposeCount + 1,
          ),
        ...current.drafts.sublist(index + 1),
      ];
      // 전체 order를 0..m 연속으로 재번호한다(remove의 재인덱싱 방식과 동일 — 구멍 없음).
      final reindexed = [
        for (var i = 0; i < spliced.length; i++) spliced[i].copyWith(order: i),
      ];
      // #6 방금 생겨난 하위 초안들의 localId 집합. splice에서 부여한 '::r$i'와 동일
      // 규칙이라 화면이 이 항목들에 "방금 나눔" 칩을 붙일 수 있다. 이 경로에서만
      // justSplitIds를 세팅한다 — 헬퍼(_withX)를 거치지 않고 직접 구성해야 하는 이유.
      final justSplitIds = {for (var i = 0; i < sub.length; i++) '$localId::r$i'};
      state = AsyncValue.data(
        DecomposeState(
          drafts: reindexed,
          source: current.source,
          goalText: current.goalText,
          isRegenerating: current.isRegenerating,
          isSaving: current.isSaving,
          regeneratingItemId: null, // 재분해 완료 → 플래그 해제.
          justSplitIds: justSplitIds,
          target: current.target,
        ),
      );
      return true;
    } on AppFailure {
      // 실패 → 원본 항목 보존(교체하지 않음). 플래그만 해제한다(데이터 유실 없음).
      state = AsyncValue.data(_withRegeneratingItem(current, null));
      return false;
    }
  }

  // ===== 확정 등록 (분해 결과를 실제 quests 컬렉션에 저장) =====
  //
  // plan.md 핵심 흐름(분해 → **등록** → 완료 → 보상)의 연결고리. 편집이 끝난 초안
  // 목록을 확정해 원본 목표(Goal)와 함께 저장한다. 재생성과 정책이 다르다: 재생성은
  // 실패 시 기존 결과를 "유지"하고, 등록은 성공 시 상태를 null로 "리셋"한다(화면 pop
  // 후 재진입이 깨끗하도록). 실패 시엔 편집 결과를 그대로 보존한다.

  /// drafts/source/goalText/isRegenerating/regeneratingItemId는 유지하고 [isSaving]만 교체한 새 상태.
  DecomposeState _withSaving(DecomposeState s, bool value) => DecomposeState(
    drafts: s.drafts,
    source: s.source,
    goalText: s.goalText,
    isRegenerating: s.isRegenerating,
    isSaving: value,
    regeneratingItemId: s.regeneratingItemId,
    target: s.target,
  );

  /// 편집이 끝난 초안 목록을 확정 등록한다.
  ///
  /// 흐름: 원본 목표(Goal) 저장 → 그 goalId로 quests 일괄 저장(원자적 batch).
  /// 반환: 성공 true(상태 null 리셋) / 실패·불가 false(편집 결과 보존).
  /// 화면은 true면 목록으로 pop, false면 실패 스낵바로 안내한다.
  ///
  /// **원자성/orphan goal**: quests는 batch라 원자적이다 — 전부 저장되거나 전부
  /// 실패한다(부분 저장 없음). 다만 goal 저장이 성공하고 quests 저장이 실패하면
  /// 참조되지 않는 **orphan goal**이 하나 남는다. 이는 무해하다: 어떤 quest도 이
  /// goal을 가리키지 않으므로 불일치가 아니라 그저 죽은 데이터다. Firestore
  /// 교차 컬렉션 트랜잭션은 과하므로 롤백하지 않는다(의도적 YAGNI).
  Future<bool> confirm() async {
    final current = state.valueOrNull;
    if (current == null || current.drafts.isEmpty) return false; // 등록할 게 없다.
    if (current.isSaving) return false; // 중복 탭 방지 — 요청은 한 번만.

    // 기존 결과를 유지한 채 저장 표시만 켠다(전체 로딩으로 카드를 숨기지 않는다).
    state = AsyncValue.data(_withSaving(current, true));
    try {
      final uid = await ref.read(sessionProvider.future);
      final target = current.target;

      if (target != null) {
        // 재분해 등록: 새 목표를 만들지 않는다. 원본의 goalId를 그대로 물려줘
        // 자식이 **같은 목표 폴더에 남고**, parentQuestId로 계보를 남긴다.
        // 원본 퀘스트는 손대지 않는다 — stuck 그대로 두는 게 「재분해 복귀율」의
        // 분모다. 실패하면 아래 catch로 빠지고 아무것도 저장되지 않는다(batch).
        await ref
            .read(questRepositoryProvider)
            .createQuests(
              uid,
              current.drafts,
              goalId: target.goalId,
              parentQuestId: target.questId,
              // 재분해 자식도 AI 분해 산물이다(출처 칩 = AI).
              source: QuestSource.ai,
            );
        // 재분해 등록 계측 — batch 성공 뒤(트랜잭션 밖). parentQuestId가 달린
        // 등록이라 questRegistered가 아니라 questRedecomposed다(「재분해 복귀율」 분자).
        ref.logEvent(
          uid,
          AnalyticsEvent.questRedecomposed(
            at: DateTime.now(),
            parentQuestId: target.questId,
            count: current.drafts.length,
          ),
        );
        state = const AsyncValue.data(null);
        return true;
      }

      // 원본 목표를 먼저 저장하고, 그 goalId를 퀘스트에 심는다(개별 재분해 맥락용).
      final goal = await ref
          .read(goalRepositoryProvider)
          .createGoal(uid, current.goalText);
      await ref
          .read(questRepositoryProvider)
          .createQuests(
            uid,
            current.drafts,
            goalId: goal.id,
            // AI 도전 분해 산물이므로 출처는 AI(카드 출처 칩 = ✨AI).
            source: QuestSource.ai,
          );
      // AI 분해 등록 계측 — batch 성공 뒤(트랜잭션 밖). 재분해가 아닌 신규 등록이다.
      ref.logEvent(
        uid,
        AnalyticsEvent.questRegistered(
          at: DateTime.now(),
          count: current.drafts.length,
          source: 'ai',
        ),
      );
      // 성공: 상태를 초기(null)로 리셋한다 — 화면 pop 후 재진입이 깨끗하도록.
      state = const AsyncValue.data(null);
      return true;
    } on AppFailure {
      // 실패 → 편집 결과를 그대로 보존한다(날리지 않음). 저장 표시만 끈다.
      state = AsyncValue.data(_withSaving(current, false));
      return false;
    }
  }

  // ===== 편집 (저장 전 순수 메모리 조작) =====
  //
  // 편집은 확정 저장이 아니다. [DecomposeState]는 불변이므로 매번 새 인스턴스를
  // 만들고, source/goalText는 항상 보존한다([_withDrafts]). 현재 상태가 없으면
  // (아직 분해 전) 조용히 무시한다 — 크래시 없이.

  /// source/goalText/isRegenerating/isSaving/regeneratingItemId를 유지한 채 drafts만 교체한 새 상태를 만든다.
  DecomposeState _withDrafts(DecomposeState s, List<QuestDraft> drafts) =>
      DecomposeState(
        drafts: drafts,
        source: s.source,
        goalText: s.goalText,
        isRegenerating: s.isRegenerating,
        isSaving: s.isSaving,
        regeneratingItemId: s.regeneratingItemId,
        target: s.target,
      );

  /// 특정 초안의 제목을 바꾼다. 빈 제목/공백만이면 무시한다(이전 값 유지).
  /// checklist #15: "빈 제목으로 수정 시 저장이 막히거나 이전 값이 유지된다".
  void editTitle(String localId, String newTitle) {
    final trimmed = newTitle.trim();
    if (trimmed.isEmpty) return; // 빈 제목 거부
    final current = state.valueOrNull;
    if (current == null) return;
    final updated = [
      for (final d in current.drafts)
        d.localId == localId ? d.copyWith(title: trimmed) : d,
    ];
    state = AsyncValue.data(_withDrafts(current, updated));
  }

  /// 특정 초안을 삭제한다. 남은 항목의 order를 0부터 다시 매긴다(구멍 없음).
  /// checklist #16: "삭제 후 남은 항목의 순서/인덱스가 깨지지 않는다".
  void remove(String localId) {
    final current = state.valueOrNull;
    if (current == null) return;
    final kept = current.drafts.where((d) => d.localId != localId).toList();
    final reindexed = [
      for (var i = 0; i < kept.length; i++) kept[i].copyWith(order: i),
    ];
    state = AsyncValue.data(_withDrafts(current, reindexed));
  }

  /// 특정 초안의 난이도를 바꾼다. 예상 보상(RewardChip)은 draft.reward가
  /// difficulty에서 파생되므로 카드가 자동 갱신된다.
  /// checklist #17: "난이도 변경 시 예상 보상 표시도 함께 갱신된다".
  void changeDifficulty(String localId, Difficulty difficulty) {
    final current = state.valueOrNull;
    if (current == null) return;
    final updated = [
      for (final d in current.drafts)
        d.localId == localId ? d.copyWith(difficulty: difficulty) : d,
    ];
    state = AsyncValue.data(_withDrafts(current, updated));
  }
}

final decomposeNotifierProvider =
    AsyncNotifierProvider<DecomposeNotifier, DecomposeState?>(
      DecomposeNotifier.new,
    );
