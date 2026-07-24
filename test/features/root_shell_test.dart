import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/theme/app_theme.dart';
import 'package:one_step/features/quest/quest_create_screen.dart';
import 'package:one_step/features/quest/quest_list_screen.dart';
import 'package:one_step/features/shop/shop_screen.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/models/quest.dart';
import 'package:one_step/providers/providers.dart';
import 'package:one_step/repositories/memory/fake_auth_repository.dart';
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
    addTearDown(questRepo.dispose);
    addTearDown(userRepo.dispose);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(
            FakeAuthRepository(initialUid: uid),
          ),
          userRepositoryProvider.overrideWithValue(userRepo),
          questRepositoryProvider.overrideWithValue(questRepo),
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

    // 제목을 입력해 둔다 (이 상태가 살아남아야 한다)
    await tester.enterText(find.byType(TextFormField), '작성 중인 퀘스트');
    await tester.pumpAndSettle();

    // 홈으로 갔다가 다시 퀘스트 탭으로 돌아온다
    await tapTab(tester, '홈');
    expect(find.byType(QuestCreateScreen), findsNothing);

    await tapTab(tester, '퀘스트');
    await tester.pumpAndSettle();

    // 등록 화면이 그대로 있고, 입력한 내용까지 살아 있다.
    // (StatefulShellRoute가 탭마다 별도 Navigator를 유지하기 때문)
    expect(find.byType(QuestCreateScreen), findsOneWidget);
    expect(find.text('작성 중인 퀘스트'), findsOneWidget);
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

    await tester.enterText(find.byType(TextFormField), '지원서 초안 쓰기');
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '등록하기'));
    await tester.pumpAndSettle();

    // 화면이 닫히고 목록으로 돌아왔다.
    expect(find.byType(QuestCreateScreen), findsNothing);
    expect(find.byType(QuestListScreen), findsOneWidget);

    // 그리고 목록에 즉시 반영됐다.
    expect(find.text('지원서 초안 쓰기'), findsOneWidget);

    final quests = await repo.fetchQuests(uid);
    expect(quests.single.title, '지원서 초안 쓰기');
    expect(quests.single.difficulty, Difficulty.normal);
  });
}
