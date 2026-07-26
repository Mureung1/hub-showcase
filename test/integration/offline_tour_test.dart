import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/core/theme/app_theme.dart';
import 'package:one_step/core/widgets/state_views.dart';
import 'package:one_step/features/home/home_screen.dart';
import 'package:one_step/features/profile/profile_screen.dart';
import 'package:one_step/features/quest/quest_list_screen.dart';
import 'package:one_step/features/shop/shop_screen.dart';
import 'package:one_step/features/storage/storage_screen.dart';
import 'package:one_step/providers/providers.dart';
import 'package:one_step/repositories/memory/fake_auth_repository.dart';
import 'package:one_step/repositories/memory/in_memory_goal_repository.dart';
import 'package:one_step/repositories/memory/in_memory_quest_repository.dart';
import 'package:one_step/repositories/memory/in_memory_user_repository.dart';
import 'package:one_step/router.dart';

/// checklist E-3 — **"네트워크 단절 상황에서 앱이 크래시하지 않는다".**
///
/// 지금까지 단절 검증은 조각조각이었다(분해 SocketException · 완료 롤백 · 구매 실패).
/// 그 조각들은 "이 기능이 실패했을 때"를 보지만, 이 파일이 보는 것은 **"앱 전체가
/// 단절 상태에서 안 죽는가"** 하나다. 그래서 저장소 3종이 전부 [NetworkFailure]를
/// 던지는 상태로 **실제 라우터(5탭 StatefulShellRoute)** 위에 앱을 띄우고 5탭을
/// 전부 돌면서 ① 예외가 프레임워크로 새어나오지 않는지 ② 각 탭이 사용자에게
/// 뭐라도 설명하는지를 본다(`user_flow_test.dart`의 라우터 하네스와 같은 방식).
void main() {
  const uid = 'test-uid';

  /// 저장소 3종이 전부 실패하는 상태로 앱을 띄운다.
  ///
  /// 인증(FakeAuthRepository)만 살려 둔다 — uid조차 없으면 "단절"이 아니라
  /// "로그인 불가"라는 다른 상황이 되고, 화면 대부분이 아예 진입하지 못한다.
  Future<void> pumpOfflineApp(WidgetTester tester) async {
    // user_flow_test와 같은 처방: 기본 800x600에선 탭바·본문이 서로 가린다.
    tester.view.physicalSize = const Size(1200, 2600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    const offline = NetworkFailure();
    final userRepo = InMemoryUserRepository(failWith: offline);
    final questRepo = InMemoryQuestRepository(failWith: offline, users: userRepo);
    final goalRepo = InMemoryGoalRepository(failWith: offline);
    addTearDown(userRepo.dispose);
    addTearDown(questRepo.dispose);
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
          routerConfig: createRouter(),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> tapTab(WidgetTester tester, String label) async {
    await tester.tap(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text(label),
      ),
    );
    await tester.pumpAndSettle();
  }

  /// 화면 안의 오류 안내만 센다. 5탭은 `IndexedStack`으로 함께 살아 있으므로
  /// 전역 `find.byType(ErrorView)`는 다른 탭의 것까지 잡을 수 있다 — 탭마다
  /// 자기 화면 밑에서 찾는다.
  Finder errorIn(Type screen) => find.descendant(
    of: find.byType(screen),
    matching: find.byType(ErrorView),
  );

  testWidgets('단절 상태에서 홈·퀘스트·상점·보관함 4탭이 크래시 없이 오류 안내를 그린다', (
    tester,
  ) async {
    await pumpOfflineApp(tester);

    // 첫 화면(홈)부터 이미 세션이 실패한 상태다.
    expect(tester.takeException(), isNull, reason: '앱을 띄우는 것만으로 예외가 새면 안 된다.');

    /// (탭 라벨, 화면 타입). 홈은 기본 탭이라 탭을 누르지 않고 그대로 본다.
    const tour = <(String?, Type)>[
      (null, HomeScreen),
      ('퀘스트', QuestListScreen),
      ('상점', ShopScreen),
      ('보관함', StorageScreen),
    ];

    for (final (label, screen) in tour) {
      if (label != null) await tapTab(tester, label);

      // ① 예외가 새어나오지 않는다.
      expect(
        tester.takeException(),
        isNull,
        reason: '$screen 탭에서 예외가 프레임워크로 새어나왔다.',
      );

      // ② 화면이 살아 있고, 오류를 사람 말로 설명한다.
      expect(find.byType(screen), findsOneWidget);
      expect(errorIn(screen), findsOneWidget, reason: '$screen이 오류 안내를 그리지 않았다.');
      expect(
        find.descendant(
          of: find.byType(screen),
          matching: find.text('인터넷 연결을 확인해 주세요.'),
        ),
        findsOneWidget,
        reason: '$screen이 예외 문자열 대신 사용자 문구를 보여야 한다.',
      );

      // ③ 되돌릴 길이 있다 — 재시도 버튼.
      expect(
        find.descendant(
          of: find.byType(screen),
          matching: find.text('다시 시도'),
        ),
        findsOneWidget,
      );

      // ④ 빈 상태로 위장하지 않는다(데이터가 없는 게 아니라 못 읽은 것이다).
      expect(
        find.descendant(of: find.byType(screen), matching: find.byType(EmptyView)),
        findsNothing,
      );
    }
  });

  testWidgets('MY 탭은 통계만 오류로 접히고 설정은 그대로 닿는다 (의도된 설계)', (tester) async {
    // ⚠️ 여기만 다른 이유: `profile_screen.dart`가 "네트워크가 죽어도 설정(계정 연동
    //    자리)은 닿게 둔다"고 명시한 **의도된 설계**다. 헤더·설정은 async 데이터에
    //    의존하지 않으므로 항상 그리고, 통계 영역만 자체적으로 오류를 처리한다.
    //    오류 화면을 강요하는 단언을 쓰면 이 설계를 깨는 방향으로 코드를 끌고 간다.
    await pumpOfflineApp(tester);
    await tapTab(tester, 'MY');

    expect(tester.takeException(), isNull);
    expect(find.byType(ProfileScreen), findsOneWidget);

    // 헤더·설정은 살아 있다.
    expect(find.text('MY'), findsWidgets);
    expect(find.text('Google 계정 연동'), findsOneWidget);

    // 통계 자리에만 오류가 접힌다.
    expect(errorIn(ProfileScreen), findsOneWidget);
    expect(find.text('인터넷 연결을 확인해 주세요.'), findsOneWidget);

    // 설정은 실제로 **누를 수 있다** — 단절돼도 계정 연동 자리에 닿는다는 게 요점이다.
    await tester.tap(find.text('Google 계정 연동'));
    await tester.pumpAndSettle();
    expect(find.text('계정 연동은 곧 지원돼요.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('단절 상태에서 5탭을 왕복해도 예외가 새지 않는다', (tester) async {
    // 한 번 훑고 끝나는 게 아니라 **오갈 때**도 안전해야 한다. IndexedStack이 이미
    // 만들어 둔 탭으로 되돌아가면 provider 구독이 되살아나 실패가 다시 흐른다.
    await pumpOfflineApp(tester);

    const labels = ['퀘스트', '상점', '보관함', 'MY', '홈', '상점', '퀘스트', '홈'];
    for (final label in labels) {
      await tapTab(tester, label);
      expect(tester.takeException(), isNull, reason: '$label 탭 이동에서 예외가 샜다.');
    }

    // 마지막은 홈 — 여전히 오류 안내가 떠 있고 앱은 살아 있다.
    expect(find.byType(HomeScreen), findsOneWidget);
    expect(errorIn(HomeScreen), findsOneWidget);
    // 탭바도 그대로라 사용자는 계속 앱을 조작할 수 있다.
    expect(find.byType(NavigationBar), findsOneWidget);
  });
}
