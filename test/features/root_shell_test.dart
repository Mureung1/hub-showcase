import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/theme/app_theme.dart';
import 'package:one_step/core/widgets/gradient_button.dart';
import 'package:one_step/core/widgets/quest_card.dart';
import 'package:one_step/features/quest/quest_create_screen.dart';
import 'package:one_step/features/quest/quest_list_screen.dart';
import 'package:one_step/features/shop/shop_screen.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/models/quest.dart';
import 'package:one_step/providers/providers.dart';
import 'package:one_step/repositories/memory/fake_auth_repository.dart';
import 'package:one_step/repositories/memory/in_memory_goal_repository.dart';
import 'package:one_step/repositories/memory/in_memory_quest_repository.dart';
import 'package:one_step/repositories/memory/in_memory_user_repository.dart';
import 'package:one_step/router.dart';

/// checklist 1주차 · 하단 내비게이션 구성
/// - 흰 탭바 + 활성 탭 그린 표시
/// - 각 탭 전환 시 화면이 올바르게 바뀌고 **현재 탭 상태가 유지된다**
/// - **탭 재선택 시** 스크롤 초기화 또는 **루트 복귀**가 의도대로 동작한다
///
/// 이 세 항목은 그동안 에뮬레이터 육안 확인뿐이었다. 리팩터링하다 조용히 깨질 수 있으므로
/// 자동 증거를 만든다.
void main() {
  const uid = 'test-uid';

  /// 실제 라우터(5탭 StatefulShellRoute)로 앱 전체를 띄운다.
  Future<InMemoryQuestRepository> pumpApp(
    WidgetTester tester, {
    List<Quest> quests = const [],
  }) async {
    final questRepo = InMemoryQuestRepository(seed: quests);
    final userRepo = InMemoryUserRepository(seed: AppUser.initial(uid));
    // 직접 등록이 목표(폴더) 단위가 되면서 등록 화면이 goalRepository를 쓴다.
    final goalRepo = InMemoryGoalRepository();
    addTearDown(questRepo.dispose);
    addTearDown(userRepo.dispose);
    addTearDown(goalRepo.dispose);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(
            FakeAuthRepository(initialUid: uid),
          ),
          userRepositoryProvider.overrideWithValue(userRepo),
          questRepositoryProvider.overrideWithValue(questRepo),
          goalRepositoryProvider.overrideWithValue(goalRepo),
        ],
        child: MaterialApp.router(
          theme: AppTheme.light,
          // 테스트마다 새 라우터. 전역 인스턴스를 재사용하면 앞 테스트의
          // 탭/스택 상태가 다음 테스트로 샌다.
          routerConfig: createRouter(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    return questRepo;
  }

  /// 하단 탭바의 탭을 누른다.
  Future<void> tapTab(WidgetTester tester, String label) async {
    await tester.tap(find.descendant(
      of: find.byType(NavigationBar),
      matching: find.text(label),
    ));
    await tester.pumpAndSettle();
  }

  testWidgets('5개 탭이 모두 렌더되고 홈이 기본 선택이다', (tester) async {
    await pumpApp(tester);

    final bar = tester.widget<NavigationBar>(find.byType(NavigationBar));
    expect(bar.destinations, hasLength(5));
    expect(bar.selectedIndex, 0);

    for (final label in ['홈', '퀘스트', '상점', '보관함', 'MY']) {
      expect(
        find.descendant(
          of: find.byType(NavigationBar),
          matching: find.text(label),
        ),
        findsOneWidget,
        reason: '$label 탭이 없다',
      );
    }
  });

  testWidgets('탭을 누르면 화면이 바뀐다', (tester) async {
    await pumpApp(tester);

    // 홈
    expect(find.text('오늘도 한 걸음.'), findsOneWidget);

    await tapTab(tester, '퀘스트');
    expect(find.byType(QuestListScreen), findsOneWidget);
    expect(
      tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
      1,
    );

    await tapTab(tester, '상점');
    expect(find.byType(ShopScreen), findsOneWidget);
    expect(
      tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
      2,
    );
  });

  testWidgets('탭을 오가도 각 탭의 하위 화면 상태가 유지된다', (tester) async {
    await pumpApp(tester);

    // 퀘스트 탭 → 등록 화면으로 진입
    await tapTab(tester, '퀘스트');
    await tester.tap(find.widgetWithText(FloatingActionButton, '퀘스트 등록'));
    await tester.pumpAndSettle();
    expect(find.byType(QuestCreateScreen), findsOneWidget);

    // 목표명을 입력해 둔다 (이 상태가 살아남아야 한다). 첫 TextField가 목표명이다.
    await tester.enterText(find.byType(TextField).first, '작성 중인 목표');
    await tester.pumpAndSettle();

    // 홈으로 갔다가 다시 퀘스트 탭으로 돌아온다
    await tapTab(tester, '홈');
    expect(find.byType(QuestCreateScreen), findsNothing);

    await tapTab(tester, '퀘스트');
    await tester.pumpAndSettle();

    // 등록 화면이 그대로 있고, 입력한 내용까지 살아 있다.
    // (StatefulShellRoute가 탭마다 별도 Navigator를 유지하기 때문)
    expect(find.byType(QuestCreateScreen), findsOneWidget);
    expect(find.text('작성 중인 목표'), findsOneWidget);
  });

  testWidgets('★ 같은 탭을 다시 누르면 그 탭의 루트로 돌아온다', (tester) async {
    await pumpApp(tester);

    // 퀘스트 탭 → 등록 화면(하위 라우트)으로 진입
    await tapTab(tester, '퀘스트');
    await tester.tap(find.widgetWithText(FloatingActionButton, '퀘스트 등록'));
    await tester.pumpAndSettle();
    expect(find.byType(QuestCreateScreen), findsOneWidget);
    expect(find.byType(QuestListScreen), findsNothing);

    // 이미 선택된 퀘스트 탭을 **다시** 누른다.
    await tapTab(tester, '퀘스트');

    // 하위 화면이 닫히고 탭 루트(목록)로 복귀한다.
    expect(find.byType(QuestCreateScreen), findsNothing);
    expect(find.byType(QuestListScreen), findsOneWidget);
  });

  testWidgets('등록을 마치면 화면이 닫히고 목록으로 돌아온다', (tester) async {
    // 위젯 테스트에서 화면을 home:으로만 띄우면 pop 분기가 실행되지 않는다
    // (canPop()이 false라서). 실제 라우터 위에서만 이 경로를 검증할 수 있다.
    final repo = await pumpApp(tester);

    await tapTab(tester, '퀘스트');
    await tester.tap(find.widgetWithText(FloatingActionButton, '퀘스트 등록'));
    await tester.pumpAndSettle();

    // 목표명(첫 필드) + 하위 퀘스트 1개(둘째 필드)를 입력한다. 신규 등록은
    // 목표를 강제하므로 목표명이 비면 등록 버튼이 눌리지 않는다.
    await tester.enterText(find.byType(TextField).first, '공모전 지원 준비');
    await tester.enterText(find.byType(TextField).at(1), '지원서 초안 쓰기');
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(GradientButton, '등록하기'));
    await tester.pumpAndSettle();

    // 화면이 닫히고 목록으로 돌아왔다.
    expect(find.byType(QuestCreateScreen), findsNothing);
    expect(find.byType(QuestListScreen), findsOneWidget);

    // 그리고 목록에 즉시 반영됐다.
    expect(find.text('지원서 초안 쓰기'), findsOneWidget);

    final quests = await repo.fetchQuests(uid);
    expect(quests.single.title, '지원서 초안 쓰기');
    expect(quests.single.difficulty, Difficulty.normal);
    // 목표(폴더)로 묶여 저장된다 — goalId가 붙는다(낱개 등록이 아니다).
    expect(quests.single.goalId, isNotNull);
  });

  testWidgets('홈의 진행 중 퀘스트 카드를 탭하면 오늘의 퀘스트 탭으로 이동한다', (tester) async {
    // 홈 미리보기 카드는 완료 토글 없이 보기 전용이라, 탭하면 전체 목록을
    // 관리할 수 있는 퀘스트 탭으로 넘어가야 한다(개별 상세가 아니라).
    await pumpApp(
      tester,
      quests: const [
        Quest(id: 'q1', title: '지원서 초안 쓰기', difficulty: Difficulty.normal, order: 0),
      ],
    );

    // 홈에서 시작 — 목록 화면은 아직 없다.
    expect(find.text('오늘도 한 걸음.'), findsOneWidget);
    expect(find.byType(QuestListScreen), findsNothing);

    // 미리보기 카드는 캐릭터 카드·버튼 아래라 뷰포트 밖일 수 있다. 스크롤로 올린다.
    final card = find.widgetWithText(QuestCard, '지원서 초안 쓰기');
    await tester.scrollUntilVisible(card, 200, scrollable: find.byType(Scrollable).first);
    await tester.pumpAndSettle();

    // 홈의 미리보기 카드(퀘스트 탭 진입 버튼이 아니라 카드 자체)를 탭한다.
    await tester.tap(card);
    await tester.pumpAndSettle();

    // 오늘의 퀘스트 탭으로 전환됐다.
    expect(find.byType(QuestListScreen), findsOneWidget);
    expect(
      tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
      1,
    );
  });
}
