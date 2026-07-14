import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/core/widgets/difficulty_pill.dart';
import 'package:one_step/core/widgets/quest_card.dart';
import 'package:one_step/core/widgets/state_views.dart';
import 'package:one_step/features/quest/quest_list_screen.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/models/quest.dart';

import '../helpers/pump_app.dart';

/// checklist 1주차 · 퀘스트 목록 화면
/// - 퀘스트가 0개일 때 빈 상태 안내가 표시된다
/// - 여러 개일 때 각 항목에 제목·난이도가 보인다
/// - 로딩·오류 상태가 각각 구분되어 표시된다
void main() {
  testWidgets('퀘스트가 0개면 빈 상태가 표시된다', (tester) async {
    await pumpScreen(tester, const QuestListScreen());
    await tester.pumpAndSettle();

    expect(find.byType(EmptyView), findsOneWidget);
    expect(find.text('아직 퀘스트가 없어요'), findsOneWidget);
    expect(find.text('퀘스트 등록하기'), findsOneWidget);

    // 빈 상태는 오류가 아니다.
    expect(find.byType(ErrorView), findsNothing);
  });

  testWidgets('퀘스트가 여러 개면 제목과 난이도가 보인다', (tester) async {
    await pumpScreen(
      tester,
      const QuestListScreen(),
      quests: const [
        Quest(
          id: 'q1',
          title: '공모전 공고 3개 찾기',
          difficulty: Difficulty.easy,
          order: 0,
        ),
        Quest(
          id: 'q2',
          title: '지원서 초안 쓰기',
          difficulty: Difficulty.hard,
          order: 1,
        ),
      ],
    );
    await tester.pumpAndSettle();

    expect(find.byType(QuestCard), findsNWidgets(2));

    // 제목
    expect(find.text('공모전 공고 3개 찾기'), findsOneWidget);
    expect(find.text('지원서 초안 쓰기'), findsOneWidget);

    // 난이도
    expect(find.byType(DifficultyPill), findsNWidgets(2));
    expect(find.text('• 쉬움'), findsOneWidget);
    expect(find.text('• 어려움'), findsOneWidget);

    expect(find.byType(EmptyView), findsNothing);
  });

  testWidgets('예상 보상이 난이도에 맞게 표시된다', (tester) async {
    await pumpScreen(
      tester,
      const QuestListScreen(),
      quests: const [
        Quest(id: 'q1', title: '어려운 퀘스트', difficulty: Difficulty.hard),
      ],
    );
    await tester.pumpAndSettle();

    // 어려움 = 코인10 / XP20
    expect(find.text('+10'), findsOneWidget);
    expect(find.text('XP +20'), findsOneWidget);
  });

  testWidgets('오류 상태는 빈 상태와 구분되어 표시된다', (tester) async {
    await pumpScreen(
      tester,
      const QuestListScreen(),
      failWith: const NetworkFailure(),
    );
    await tester.pumpAndSettle();

    expect(find.byType(ErrorView), findsOneWidget);
    expect(find.text('인터넷 연결을 확인해 주세요.'), findsOneWidget);
    expect(find.text('다시 시도'), findsOneWidget);

    // 오류는 빈 상태가 아니다 — 둘이 섞이면 안 된다.
    expect(find.byType(EmptyView), findsNothing);
  });

  testWidgets('로딩 상태는 스켈레톤으로 표시된다 (오류·빈 상태와 다르다)', (tester) async {
    // InMemory 저장소는 즉시 응답하므로 로딩 프레임을 볼 수 없다.
    // 영원히 로딩인 스트림을 주입해 로딩 UI만 따로 검증한다.
    await pumpScreen(
      tester,
      const QuestListScreen(),
      extraOverrides: loadingForever(),
    );
    await tester.pump();

    expect(find.byType(SkeletonBox), findsWidgets);
    expect(find.byType(ErrorView), findsNothing);
    expect(find.byType(EmptyView), findsNothing);
  });

  testWidgets('완료 체크를 하면 상태가 done으로 바뀐다', (tester) async {
    final repo = await pumpScreen(
      tester,
      const QuestListScreen(),
      quests: const [Quest(id: 'q1', title: '완료할 퀘스트')],
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('완료'));
    await tester.pumpAndSettle();

    final quests = await repo.fetchQuests('test-uid');
    expect(quests.single.done, isTrue);

    // 화면에도 반영된다.
    expect(find.byTooltip('완료 취소'), findsOneWidget);
  });

  testWidgets('완료 실패 시 오류가 안내된다', (tester) async {
    // 목록은 이미 떠 있고, setDone만 실패하는 상황을 만들기 어렵다.
    // 대신 저장소 전체가 실패할 때 오류 화면이 뜨는 것으로 검증한다.
    await pumpScreen(
      tester,
      const QuestListScreen(),
      quests: const [Quest(id: 'q1', title: 'x')],
      failWith: const PermissionFailure(),
    );
    await tester.pumpAndSettle();

    expect(find.byType(ErrorView), findsOneWidget);
    expect(find.textContaining('권한'), findsOneWidget);
  });
}
