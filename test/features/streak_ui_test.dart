import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/reward_rules.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/core/widgets/stat_card.dart';
import 'package:one_step/core/widgets/state_views.dart';
import 'package:one_step/features/home/home_screen.dart';
import 'package:one_step/features/home/widgets/streak_bonus_dialog.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/providers/providers.dart';
import 'package:one_step/repositories/memory/in_memory_user_repository.dart';

import '../helpers/pump_app.dart';

/// 출석 스트릭이 화면에 반영되는가 (홈).
///
/// 리디자인으로 스트릭이 **캐릭터 카드 안의 pill**에서 **홈 통계 카드**로 옮겨졌다.
/// 표시 형태도 `3일 연속`(한 덩어리)에서 라벨 '연속' + 값 `3일`로 갈렸다.
void main() {
  const uid = 'test-uid';
  // KST 2026-07-21 정오.
  final now = DateTime.utc(2026, 7, 21, 3);
  DateTime clock() => now;

  /// 홈은 리디자인으로 세로가 길어졌다. 통계 카드가 기본 뷰포트(800×600) 안에
  /// 들어오긴 하지만, 뒤따르는 단언들이 화면 아래쪽까지 보게 되므로 높이를 넉넉히
  /// 잡아 한 프레임에 다 담는다(폭은 그대로).
  void useTallViewport(WidgetTester tester) {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(800, 1600);
    addTearDown(tester.view.reset);
  }

  /// 연속 출석 통계 카드 안의 값. 카드 밖의 같은 숫자(코인·레벨)와 섞이지 않게
  /// 라벨로 자리를 좁힌다.
  Finder streakValue(String text) => find.descendant(
    of: find.widgetWithText(StatCard, '연속'),
    matching: find.text(text),
  );

  testWidgets('앱을 열면 출석이 기록되고 연속 일수가 통계 카드에 보인다', (tester) async {
    useTallViewport(tester);
    await pumpScreen(
      tester,
      const HomeScreen(),
      user: AppUser(uid: uid, attendanceDate: '2026-07-20', streak: 2),
      clock: clock,
    );
    await tester.pumpAndSettle();

    // 어제 출석 + 오늘 접속 = 3일 연속.
    expect(streakValue('3일'), findsOneWidget);
  });

  testWidgets('출석 기록이 없는 신규 사용자는 첫 방문이 1일로 기록돼 뜬다', (tester) async {
    // 예전에는 스트릭이 캐릭터 카드 안의 **배지**여서 0이면 통째로 감췄고, 이
    // 테스트도 "0일 연속이 새지 않는다"만 봤다. 통계 카드는 2칸 격자라 늘 자리를
    // 지키므로 감출 수가 없다 — 대신 **무엇이 뜨는지**를 못 박는다.
    useTallViewport(tester);
    final repo = await pumpScreen(tester, const HomeScreen(), clock: clock);
    await tester.pumpAndSettle();

    // 첫 방문도 하루로 친다. 0이 아니어야 하고, 화면이 지어낸 값도 아니어야 한다.
    expect(streakValue('1일'), findsOneWidget);
    expect(streakValue('0일'), findsNothing);

    // 화면이 세는 게 아니라 저장소가 기록한 값이 흘러온 것이다.
    expect((await repo.users!.fetchUser(uid)).streak, 1);
  });

  testWidgets('7일 연속이면 축하 다이얼로그가 뜨고 잔액에 전액 반영된다', (tester) async {
    useTallViewport(tester);
    await pumpScreen(
      tester,
      const HomeScreen(),
      user: AppUser(
        uid: uid,
        coin: 10,
        attendanceDate: '2026-07-20',
        streak: 6,
        // 오늘 퀘스트로 이미 상한을 채운 상태여도 보너스는 온전히 나간다.
        dailyCoinDate: '2026-07-21',
        dailyCoinEarned: kDailyCoinCap,
      ),
      clock: clock,
    );
    await tester.pumpAndSettle();

    expect(find.byType(StreakBonusDialog), findsOneWidget);

    // 다이얼로그 **안**만 본다 — 뒤의 캐릭터 카드 수치와 섞이면 검증이 무의미해진다.
    Finder inDialog(Finder matching) =>
        find.descendant(of: find.byType(StreakBonusDialog), matching: matching);

    expect(inDialog(find.text('7일 연속!')), findsOneWidget);
    expect(inDialog(find.text('+15')), findsOneWidget);
    expect(inDialog(find.text('XP +25')), findsOneWidget);
    // 다이얼로그 뒤 통계 카드에도 같은 일수가 반영돼 있다.
    expect(streakValue('7일'), findsOneWidget);
  });

  testWidgets('14일 연속이면 다이얼로그가 실제 일수(14일)와 2주치 보상을 말한다', (tester) async {
    await pumpScreen(
      tester,
      const HomeScreen(),
      user: AppUser(
        uid: uid,
        coin: 10,
        attendanceDate: '2026-07-20',
        streak: 13,
        dailyCoinDate: '2026-07-21',
        dailyCoinEarned: kDailyCoinCap,
      ),
      clock: clock,
    );
    await tester.pumpAndSettle();

    Finder inDialog(Finder matching) =>
        find.descendant(of: find.byType(StreakBonusDialog), matching: matching);

    expect(inDialog(find.text('14일 연속!')), findsOneWidget);
    // 주기 상수(7)를 화면이 다시 하드코딩하면 여기서 걸린다.
    expect(inDialog(find.textContaining('7일')), findsNothing);
    expect(inDialog(find.text('+30')), findsOneWidget);
    expect(inDialog(find.text('XP +50')), findsOneWidget);
  });

  testWidgets('7일이 아니면 축하 다이얼로그가 뜨지 않는다', (tester) async {
    await pumpScreen(
      tester,
      const HomeScreen(),
      user: AppUser(uid: uid, attendanceDate: '2026-07-20', streak: 3),
      clock: clock,
    );
    await tester.pumpAndSettle();

    expect(find.byType(StreakBonusDialog), findsNothing);
  });

  testWidgets('축하를 닫고 탭을 오갔다 홈으로 돌아와도 다시 뜨지 않는다', (tester) async {
    final tab = ValueNotifier(0);
    addTearDown(tab.dispose);

    await pumpScreen(
      tester,
      _TabSwitcher(tab: tab),
      user: AppUser(
        uid: uid,
        attendanceDate: '2026-07-20',
        streak: 6,
      ),
      clock: clock,
    );
    await tester.pumpAndSettle();
    expect(find.byType(StreakBonusDialog), findsOneWidget);

    // 사용자가 확인을 눌러 닫는다.
    await tester.tap(find.text('좋아요'));
    await tester.pumpAndSettle();
    expect(find.byType(StreakBonusDialog), findsNothing);

    // 다른 탭에 갔다가 홈으로 복귀 — 홈 State가 새로 만들어져도 재표시는 없다.
    tab.value = 1;
    await tester.pumpAndSettle();
    tab.value = 0;
    await tester.pumpAndSettle();

    expect(find.byType(HomeScreen), findsOneWidget);
    expect(find.byType(StreakBonusDialog), findsNothing);
  });

  testWidgets('같은 날 재접속은 연속 일수를 늘리지 않는다 (앱 재실행 멱등)', (tester) async {
    useTallViewport(tester);
    await pumpScreen(
      tester,
      const HomeScreen(),
      user: AppUser(uid: uid, streak: 4, attendanceDate: '2026-07-21'),
      clock: clock,
    );
    await tester.pumpAndSettle();

    expect(streakValue('4일'), findsOneWidget);
    expect(streakValue('5일'), findsNothing);
    expect(find.byType(StreakBonusDialog), findsNothing);
  });

  testWidgets('출석 기록이 실패해도 홈은 정상 렌더된다 (부가 기능이 앱을 막지 않는다)', (
    tester,
  ) async {
    // 사용자 문서를 못 읽는 상황은 오류 화면이 맞다. 여기서 보려는 건
    // "출석 쓰기만 실패"이므로 recordAttendance만 던지는 저장소를 끼운다.
    final failing = _AttendanceFailingUserRepository(
      seed: AppUser(uid: uid, streak: 4, attendanceDate: '2026-07-20'),
    );
    addTearDown(failing.dispose);

    useTallViewport(tester);
    await pumpScreen(
      tester,
      const HomeScreen(),
      clock: clock,
      extraOverrides: [userRepositoryProvider.overrideWithValue(failing)],
    );
    await tester.pumpAndSettle();

    // 오류 화면이 아니라 평소 홈이 그대로 뜬다. 스트릭은 마지막 저장값이다.
    expect(find.byType(ErrorView), findsNothing);
    expect(find.text('오늘도 한 걸음.'), findsOneWidget);
    expect(streakValue('4일'), findsOneWidget);
  });
}

/// 탭 전환을 흉내 낸다 — 홈이 트리에서 빠졌다가 다시 붙는다.
class _TabSwitcher extends StatelessWidget {
  const _TabSwitcher({required this.tab});

  final ValueNotifier<int> tab;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<int>(
      valueListenable: tab,
      builder: (context, value, _) =>
          value == 0 ? const HomeScreen() : const Scaffold(body: Text('다른 탭')),
    );
  }
}

/// 읽기는 정상인데 **출석 쓰기만** 실패하는 저장소.
class _AttendanceFailingUserRepository extends InMemoryUserRepository {
  _AttendanceFailingUserRepository({super.seed});

  @override
  Future<AttendanceResult> recordAttendance(String uid) async {
    throw const NetworkFailure();
  }
}
