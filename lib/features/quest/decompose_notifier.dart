import 'package:flutter_riverpod/flutter_riverpod.dart';

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

  @override
  bool operator ==(Object other) =>
      other is DecomposeState &&
      other.source == source &&
      other.goalText == goalText &&
      other.isRegenerating == isRegenerating &&
      other.isSaving == isSaving &&
      _listEquals(other.drafts, drafts);

  @override
  int get hashCode => Object.hash(
    source,
    goalText,
    isRegenerating,
    isSaving,
    Object.hashAll(drafts),
  );

  @override
  String toString() =>
      'DecomposeState(source: ${source.name}, goalText: "$goalText", '
      'drafts: ${drafts.length}, isRegenerating: $isRegenerating, '
      'isSaving: $isSaving)';
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
      final drafts = await ref.read(questDecomposerProvider).decompose(goalText);
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

  /// drafts/source/goalText/isSaving은 유지하고 [isRegenerating]만 교체한 새 상태.
  DecomposeState _withRegenerating(DecomposeState s, bool value) =>
      DecomposeState(
        drafts: s.drafts,
        source: s.source,
        goalText: s.goalText,
        isRegenerating: value,
        isSaving: s.isSaving,
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
      final fresh = await ref
          .read(questDecomposerProvider)
          .decompose(current.goalText);
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

  // ===== 확정 등록 (분해 결과를 실제 quests 컬렉션에 저장) =====
  //
  // plan.md 핵심 흐름(분해 → **등록** → 완료 → 보상)의 연결고리. 편집이 끝난 초안
  // 목록을 확정해 원본 목표(Goal)와 함께 저장한다. 재생성과 정책이 다르다: 재생성은
  // 실패 시 기존 결과를 "유지"하고, 등록은 성공 시 상태를 null로 "리셋"한다(화면 pop
  // 후 재진입이 깨끗하도록). 실패 시엔 편집 결과를 그대로 보존한다.

  /// drafts/source/goalText/isRegenerating은 유지하고 [isSaving]만 교체한 새 상태.
  DecomposeState _withSaving(DecomposeState s, bool value) => DecomposeState(
    drafts: s.drafts,
    source: s.source,
    goalText: s.goalText,
    isRegenerating: s.isRegenerating,
    isSaving: value,
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

  /// source/goalText/isRegenerating/isSaving을 유지한 채 drafts만 교체한 새 상태를 만든다.
  DecomposeState _withDrafts(DecomposeState s, List<QuestDraft> drafts) =>
      DecomposeState(
        drafts: drafts,
        source: s.source,
        goalText: s.goalText,
        isRegenerating: s.isRegenerating,
        isSaving: s.isSaving,
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
