import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/error/app_failure.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/quest_card.dart';
import '../../core/widgets/state_views.dart';
import '../../models/quest_status.dart';
import '../../providers/providers.dart';
import '../shell/tab_scroll_registry.dart';

/// 퀘스트 목록 화면.
///
/// checklist 1주차:
/// - 퀘스트가 0개일 때 빈 상태 안내가 표시된다
/// - 여러 개일 때 스크롤되고 각 항목에 제목·난이도가 보인다
/// - **로딩·오류 상태가 각각 구분되어 표시된다** (스켈레톤 vs 에러 뷰)
class QuestListScreen extends ConsumerStatefulWidget {
  const QuestListScreen({super.key});

  @override
  ConsumerState<QuestListScreen> createState() => _QuestListScreenState();
}

class _QuestListScreenState extends ConsumerState<QuestListScreen>
    with TabScrollRegistration {
  @override
  int get tabIndex => 1;

  Future<void> _toggleDone(String questId, bool done) async {
    try {
      // sessionProvider는 로그인 완료된 uid를 보장한다.
      // currentUidProvider를 read하면 AsyncLoading이라 uid가 null로 나온다.
      final uid = await ref.read(sessionProvider.future);
      await ref
          .read(questRepositoryProvider)
          .setStatus(
            uid,
            questId,
            done ? QuestStatus.done : QuestStatus.todo,
          );
    } on AppFailure catch (failure) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(failure.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final questsAsync = ref.watch(questListProvider);

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/quest/new'),
        icon: const Icon(Symbols.add),
        label: const Text('퀘스트 등록'),
      ),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenH,
                AppSpacing.md,
                AppSpacing.screenH,
                AppSpacing.sm,
              ),
              child: Text('오늘의 퀘스트', style: theme.textTheme.headlineLarge),
            ),
            // AI 분해 진입점. 블루(=AI) 아웃라인 버튼. 수동 등록 FAB와 공존한다
            // (plan.md 기능 B: "AI 분해 결과 또는 직접 입력").
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenH,
                0,
                AppSpacing.screenH,
                AppSpacing.sm,
              ),
              child: OutlinedButton.icon(
                onPressed: () => context.go('/quest/split'),
                icon: const Icon(Symbols.auto_awesome),
                label: const Text('AI로 목표 나누기'),
              ),
            ),
            Expanded(
              child: questsAsync.when(
                // 로딩: 스켈레톤 카드 3장.
                loading: () => ListView(
                  padding: AppSpacing.screenPadding,
                  children: const [
                    SkeletonBox(height: 120),
                    AppSpacing.gapSm,
                    SkeletonBox(height: 120),
                    AppSpacing.gapSm,
                    SkeletonBox(height: 120),
                  ],
                ),
                // 오류: 빈 상태와 시각적으로 확실히 다르다(에러 색 + 경고 아이콘 + 재시도).
                error: (error, _) => ErrorView(
                  message: error is AppFailure
                      ? error.message
                      : '퀘스트를 불러오지 못했어요.',
                  onRetry: () => ref.invalidate(questListProvider),
                ),
                data: (quests) {
                  if (quests.isEmpty) {
                    return EmptyView(
                      title: '아직 퀘스트가 없어요',
                      message: '큰 목표를 작은 퀘스트로 쪼개면\n오늘 당장 시작할 수 있어요.',
                      emoji: '🪺',
                      actionLabel: '퀘스트 등록하기',
                      onAction: () => context.go('/quest/new'),
                    );
                  }

                  return ListView.separated(
                    controller: scrollController,
                    padding: AppSpacing.screenPadding,
                    itemCount: quests.length,
                    separatorBuilder: (_, _) => AppSpacing.gapSm,
                    itemBuilder: (context, index) {
                      final quest = quests[index];
                      return QuestCard(
                        quest: quest,
                        onToggleDone: (done) => _toggleDone(quest.id, done),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
