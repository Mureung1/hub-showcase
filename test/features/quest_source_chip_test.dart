import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/theme/app_theme.dart';
import 'package:one_step/core/widgets/difficulty_pill.dart';
import 'package:one_step/core/widgets/quest_card.dart';
import 'package:one_step/core/widgets/quest_source_chip.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/models/quest.dart';
import 'package:one_step/models/quest_source.dart';

/// 퀘스트 출처 칩 — AI 분해로 생긴 퀘스트와 직접 등록한 퀘스트를 구분한다.
///
/// 판단 근거는 **[QuestSource]다**(goalId가 아니다). 직접 등록이 목표(폴더)
/// 단위가 되며 직접 등록 퀘스트도 goalId를 갖게 돼, goalId-추론은 직접 등록을
/// AI로 오표기한다(회귀 A). 칩은 명시 출처 신호로 판정한다.
Future<void> _pumpChip(
  WidgetTester tester,
  QuestSource source, {
  ThemeData? theme,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: theme ?? AppTheme.light,
      home: Scaffold(body: Center(child: QuestSourceChip(source: source))),
    ),
  );
}

void main() {
  testWidgets('출처가 AI면 AI 칩이 뜬다', (tester) async {
    await _pumpChip(tester, QuestSource.ai);

    expect(find.text('AI'), findsOneWidget);
    expect(find.text('직접'), findsNothing);
  });

  testWidgets('출처가 manual이면 직접 칩이 뜬다', (tester) async {
    await _pumpChip(tester, QuestSource.manual);

    expect(find.text('직접'), findsOneWidget);
    expect(find.text('AI'), findsNothing);
  });

  testWidgets('AI 칩과 직접 칩은 서로 다른 색을 쓴다', (tester) async {
    Color backgroundOf(WidgetTester tester) {
      final container = tester.widget<Container>(
        find.descendant(
          of: find.byType(QuestSourceChip),
          matching: find.byType(Container),
        ),
      );
      return ((container.decoration! as BoxDecoration).color)!;
    }

    await _pumpChip(tester, QuestSource.ai);
    final aiBackground = backgroundOf(tester);

    await _pumpChip(tester, QuestSource.manual);
    final manualBackground = backgroundOf(tester);

    expect(aiBackground, isNot(manualBackground));
  });

  testWidgets('다크 테마에서도 전경과 배경이 붙지 않는다', (tester) async {
    // 라이트와 같은 옅은 틴트를 다크에 그대로 쓰면 파란 글자가 어두운 카드에
    // 묻힌다. 색 계산이 밝기별로 갈리는지 확인한다.
    await _pumpChip(tester, QuestSource.ai, theme: AppTheme.dark);

    final text = tester.widget<Text>(find.text('AI'));
    final container = tester.widget<Container>(
      find.descendant(
        of: find.byType(QuestSourceChip),
        matching: find.byType(Container),
      ),
    );
    final background =
        ((container.decoration! as BoxDecoration).color)!;
    final foreground = text.style!.color!;

    expect(foreground, isNot(background));
    // 전경이 배경보다 확실히 밝아야 읽힌다.
    expect(
      foreground.computeLuminance(),
      greaterThan(background.computeLuminance() + 0.2),
    );
  });

  group('좁은 폭에서 카드가 넘치지 않는다 (회귀 방어)', () {
    // 난이도 pill 옆에 출처 칩이 하나 더 붙으면서 카드 상단의 가로 여유가 줄었다.
    // 그래서 `Row`가 아니라 `Wrap`을 쓴다.
    //
    // ⚠️ **아래 폭 320·240 케이스만으로는 Row/Wrap을 구분하지 못한다.** 실측해 보니
    // 두 칩을 담은 Row는 가용 폭 176px(또는 텍스트 배율 2.0) 아래에서야 넘치는데,
    // 카드 폭 240이면 안쪽 열이 168px이라 아슬아슬하게 통과한다. Row로 되돌려 놓고
    // 돌려 봐도 초록불이 뜬다 — 그래서 이 두 케이스는 "실제 단말 폭에서 카드가
    // 멀쩡한가"라는 일반 스모크일 뿐이고, Wrap 결정 자체는 아래 구조 테스트가 지킨다.
    //
    // 오버플로는 렌더 단계에서 FlutterError로 보고되므로 `takeException()`에 잡힌다.
    Future<void> pumpCardAt(WidgetTester tester, double width) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: Center(
              child: SizedBox(
                width: width,
                child: QuestCard(
                  quest: Quest(
                    id: 'q1',
                    title: '공모전 지원서 초안을 작성하고 지도교수님께 검토를 요청드린 뒤 '
                        '피드백을 반영해서 최종본까지 정리하기',
                    // 라벨이 가장 긴 난이도 + 출처 칩 조합이 최악의 경우다.
                    difficulty: Difficulty.hard,
                    goalId: 'goal-1',
                  ),
                  // 완료 버튼까지 붙여 가로 폭을 실제 화면과 같게 만든다.
                  onToggleDone: (_) {},
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    for (final width in [320.0, 240.0]) {
      testWidgets('폭 ${width.toInt()}에서 오버플로가 없다', (tester) async {
        await pumpCardAt(tester, width);

        expect(tester.takeException(), isNull);
        // 넘치지 않았을 뿐 아니라 두 칩이 실제로 그려져 있어야 한다
        // (칩이 사라져서 안 넘친 것과 구분한다).
        expect(find.byType(QuestSourceChip), findsOneWidget);
        expect(find.text('AI'), findsOneWidget);
      });
    }

    testWidgets('난이도 pill과 출처 칩은 줄바꿈 가능한 Wrap 안에 함께 있다', (tester) async {
      // Row로 되돌리는 회귀를 실제로 잡는 것은 이 테스트다.
      //
      // 구조를 단언하는 이유: "넘치는가"로는 잡히지 않는다(위 주석 참고). 두 칩이
      // 한 줄에 갇히면 좁은 폭·큰 글씨에서 넘친다는 사실은 실측으로 확인했다 —
      // Row(pill+chip)는 가용 폭 128에서 넘치고 Wrap은 같은 폭에서 멀쩡했다.
      // 지켜야 할 성질이 "줄바꿈할 수 있어야 한다"이므로 그것을 직접 못 박는다.
      await pumpCardAt(tester, 320);

      final wrap = tester.widget<Wrap>(
        find.descendant(
          of: find.byType(QuestCard),
          matching: find.byType(Wrap),
        ),
      );

      expect(wrap.children.whereType<DifficultyPill>(), hasLength(1));
      expect(wrap.children.whereType<QuestSourceChip>(), hasLength(1));
    });
  });

  group('회귀 A — 카드 출처는 goalId가 아니라 source로 판정한다', () {
    // 직접 등록이 목표(폴더) 단위가 되며 직접 등록 퀘스트도 goalId를 갖는다.
    // 카드가 goalId로 출처를 추론하면 직접 등록이 "✨AI"로 오표기된다(A0-2 위반).
    // 카드는 quest.effectiveSource로 판정해야 한다.
    Future<void> pumpCard(WidgetTester tester, Quest quest) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: Center(
              child: QuestCard(quest: quest, onToggleDone: (_) {}),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('★ goalId를 가진 직접 등록 퀘스트는 카드에서 "직접" 칩으로 표시된다', (
      tester,
    ) async {
      // 핵심 회귀: goalId가 있어도 source=manual이면 "직접"이어야 한다.
      // 출처를 goalId-only로 되돌리면(goalId 있음 → AI) 이 단언이 깨진다.
      await pumpCard(
        tester,
        const Quest(
          id: 'q1',
          title: '직접 등록했지만 목표(폴더)에 묶인 퀘스트',
          goalId: 'g1',
          source: QuestSource.manual,
        ),
      );

      expect(find.text('직접'), findsOneWidget);
      expect(find.text('AI'), findsNothing);
    });

    testWidgets('AI 분해 퀘스트(goalId + source ai)는 카드에서 "AI" 칩으로 표시된다', (
      tester,
    ) async {
      // A0-2 유지: AI 분해는 여전히 AI로 보인다.
      await pumpCard(
        tester,
        const Quest(
          id: 'q1',
          title: 'AI가 나눈 퀘스트',
          goalId: 'g1',
          source: QuestSource.ai,
        ),
      );

      expect(find.text('AI'), findsOneWidget);
      expect(find.text('직접'), findsNothing);
    });

    testWidgets('구 문서 하위호환: source 없고 goalId 있으면 카드에서 "AI"로 표시된다', (
      tester,
    ) async {
      // source 필드 도입 전 저장된 AI 분해 데이터. effectiveSource가 goalId로
      // 폴백해 계속 AI로 보여야 한다(마이그레이션 없이 하위호환).
      await pumpCard(
        tester,
        const Quest(id: 'q1', title: '구 AI 데이터', goalId: 'g1'),
      );

      expect(find.text('AI'), findsOneWidget);
      expect(find.text('직접'), findsNothing);
    });
  });
}
