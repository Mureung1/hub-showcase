import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/growth_rules.dart';
import 'package:one_step/core/constants/reward_rules.dart';
import 'package:one_step/core/theme/app_theme.dart';
import 'package:one_step/core/widgets/pixel_art.dart';
import 'package:one_step/features/home/widgets/evolve_dialog.dart';
import 'package:one_step/features/home/widgets/level_up_dialog.dart';
import 'package:one_step/features/quest/widgets/quest_complete_dialog.dart';

/// 4주차 성장 연출 위젯들(완료 카운트업·레벨업·진화)의 단독 검증.
///
/// 연출은 순수 표시용이라 여기서는 "무엇을 보여 주는가"만 본다 — 실지급은
/// 저장소 테스트(in_memory_quest_repository_test.dart)가 이미 못 박았다.
void main() {
  Widget host(Widget child) => MaterialApp(theme: AppTheme.light, home: child);

  group('QuestCompleteDialog — 카운트업 연출', () {
    testWidgets('카운트업이 끝나면 실지급액이 정확히 표시된다', (tester) async {
      await tester.pumpWidget(
        host(
          const QuestCompleteDialog(
            questTitle: '퀘스트',
            reward: Reward(coin: 10, xp: 20),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('+10'), findsOneWidget);
      expect(find.text('XP +20'), findsOneWidget);
    });

    testWidgets('★ 진행 중 본문을 탭하면 카운트업을 끝값으로 건너뛴다 (연출 생략)', (tester) async {
      await tester.pumpWidget(
        host(
          const QuestCompleteDialog(
            questTitle: '퀘스트',
            reward: Reward(coin: 10, xp: 20),
          ),
        ),
      );
      // 첫 프레임 직후 — 카운트업이 아직 끝값에 닿지 않았다.
      await tester.pump();
      expect(find.text('+10'), findsNothing);

      // 본문을 탭하면 애니메이션이 끝 상태로 점프한다.
      await tester.tap(find.byType(QuestCompleteDialog));
      await tester.pump();

      // 보상은 이미 지급됐으므로(연출은 표시용) 건너뛰어도 최종 지급액이 그대로 뜬다.
      expect(find.text('+10'), findsOneWidget);
      expect(find.text('XP +20'), findsOneWidget);
    });

    testWidgets('절삭돼도 표시값은 저장소가 준 실지급액이다', (tester) async {
      await tester.pumpWidget(
        host(
          const QuestCompleteDialog(
            questTitle: '퀘스트',
            reward: Reward(coin: 2, xp: 20),
            cutCoin: 8,
          ),
        ),
      );
      await tester.pumpAndSettle();

      // 난이도표 금액(10)이 아니라 실제 지급된 2가 뜬다.
      expect(find.text('+2'), findsOneWidget);
      expect(find.textContaining('8코인은 지급되지 않았어요'), findsOneWidget);
    });
  });

  group('LevelUpDialog', () {
    testWidgets('Lv.from → Lv.to가 표시된다', (tester) async {
      await tester.pumpWidget(
        host(const LevelUpDialog(fromLevel: 3, toLevel: 5)),
      );
      await tester.pumpAndSettle();

      expect(find.text('레벨 업!'), findsOneWidget);
      expect(find.text('Lv.3'), findsOneWidget);
      expect(find.text('Lv.5'), findsOneWidget);
    });

    testWidgets('다단계 상승도 from→to 한 쌍으로 자연스럽게 표현된다', (tester) async {
      await tester.pumpWidget(
        host(const LevelUpDialog(fromLevel: 1, toLevel: 6)),
      );
      await tester.pumpAndSettle();

      expect(find.text('Lv.1'), findsOneWidget);
      expect(find.text('Lv.6'), findsOneWidget);
    });
  });

  group('EvolveDialog', () {
    /// 특정 단계의 캐릭터가 그려졌는지. 단계마다 자산 경로가 달라 이게 "그 단계가
    /// 보인다"의 관찰 가능한 형태다(자산 도입 전 `find.text(stage.emoji)`가 하던 역할).
    Finder stageArt(CharacterStage stage) => find.byWidgetPredicate(
      (w) => w is PixelArt && w.asset == stage.asset,
      description: 'PixelArt(${stage.name})',
    );

    testWidgets('★ 이전 → 새 단계 캐릭터와 진화 문구가 표시된다', (tester) async {
      // Lv9 알 → Lv10 참새.
      final from = stageOf(9);
      final to = stageOf(10);
      await tester.pumpWidget(
        host(EvolveDialog(fromStage: from, toStage: to)),
      );
      await tester.pumpAndSettle();

      // 전환 한 쌍이 정확히 하나씩. 두 단계의 자산이 다르다는 것도 함께 지킨다.
      expect(from.asset, isNot(to.asset));
      expect(stageArt(from), findsOneWidget);
      expect(stageArt(to), findsOneWidget);
      // "참새로 진화했어요!" — 새 단계 이름이 제목에 들어간다.
      expect(find.textContaining('진화했어요'), findsOneWidget);
      expect(find.textContaining('참새'), findsWidgets);
    });

    testWidgets('받침에 맞는 조사가 붙는다 (독수리 → 로)', (tester) async {
      // 독수리는 받침이 없어 '독수리로'가 자연스럽다.
      final from = stageOf(19); // 참새
      final to = stageOf(20); // 매
      await tester.pumpWidget(
        host(EvolveDialog(fromStage: from, toStage: to)),
      );
      await tester.pumpAndSettle();

      expect(find.text('매로 진화했어요!'), findsOneWidget);
    });
  });
}
