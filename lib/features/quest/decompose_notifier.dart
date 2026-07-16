import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/decompose_limits.dart';
import '../../core/error/app_failure.dart';
import '../../models/difficulty.dart';
import '../../models/quest_draft.dart';
import '../../providers/providers.dart';
import '../../repositories/decompose/quest_templates.dart';

/// 분해 결과가 AI에서 왔는지 폴백 템플릿에서 왔는지.
/// checklist #13: "폴백 발생 사실이 사용자 또는 로그로 구분 가능".
enum DecomposeSource { ai, template }

/// 분해 화면이 들고 있는 상태(저장 전 초안 목록 + 출처 + 원본 목표).
class DecomposeState {
  const DecomposeState({
    required this.drafts,
    required this.source,
    required this.goalText,
    this.isRegenerating = false,
    this.isSaving = false,
    this.regeneratingItemId,
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

  @override
  bool operator ==(Object other) =>
      other is DecomposeState &&
      other.source == source &&
      other.goalText == goalText &&
      other.isRegenerating == isRegenerating &&
      other.isSaving == isSaving &&
      other.regeneratingItemId == regeneratingItemId &&
      _listEquals(other.drafts, drafts);

  @override
  int get hashCode => Object.hash(
    source,
    goalText,
    isRegenerating,
    isSaving,
    regeneratingItemId,
    Object.hashAll(drafts),
  );

  @override
  String toString() =>
      'DecomposeState(source: ${source.name}, goalText: "$goalText", '
      'drafts: ${drafts.length}, isRegenerating: $isRegenerating, '
      'isSaving: $isSaving, regeneratingItemId: $regeneratingItemId)';
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
      // #4 최대 5개 캡: 첫 분해와 동일 정책(실제 LLM 초과 방어).
      final fresh = (await ref
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
      state = AsyncValue.data(
        _withRegeneratingItem(_withDrafts(current, reindexed), null),
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
      // 원본 목표를 먼저 저장하고, 그 goalId를 퀘스트에 심는다(개별 재분해 맥락용).
      final goal = await ref
          .read(goalRepositoryProvider)
          .createGoal(uid, current.goalText);
      await ref
          .read(questRepositoryProvider)
          .createQuests(uid, current.drafts, goalId: goal.id);
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
