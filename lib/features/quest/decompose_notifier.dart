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
  });

  final List<QuestDraft> drafts;
  final DecomposeSource source;
  final String goalText;

  @override
  bool operator ==(Object other) =>
      other is DecomposeState &&
      other.source == source &&
      other.goalText == goalText &&
      _listEquals(other.drafts, drafts);

  @override
  int get hashCode => Object.hash(source, goalText, Object.hashAll(drafts));

  @override
  String toString() =>
      'DecomposeState(source: ${source.name}, goalText: "$goalText", '
      'drafts: ${drafts.length})';
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

  // ===== 편집 (저장 전 순수 메모리 조작) =====
  //
  // 편집은 확정 저장이 아니다. [DecomposeState]는 불변이므로 매번 새 인스턴스를
  // 만들고, source/goalText는 항상 보존한다([_withDrafts]). 현재 상태가 없으면
  // (아직 분해 전) 조용히 무시한다 — 크래시 없이.

  /// source/goalText를 유지한 채 drafts만 교체한 새 상태를 만든다.
  DecomposeState _withDrafts(DecomposeState s, List<QuestDraft> drafts) =>
      DecomposeState(drafts: drafts, source: s.source, goalText: s.goalText);

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
