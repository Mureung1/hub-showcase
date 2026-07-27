import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/core/widgets/state_views.dart';
import 'package:one_step/features/profile/profile_screen.dart';
import 'package:one_step/models/achievement.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/models/quest.dart';
import 'package:one_step/models/quest_status.dart';

import '../helpers/pump_app.dart';

/// MY(프로필) 화면 — 통계(완료 수·연속·가입일) + 설정(OAuth 자리).
///
/// 완료 수는 **성취 기록**([achievementsProvider]) 개수다(보관함과 같은 소스).
/// OAuth는 자리만 열어 두고 실제 연동·로그아웃은 구현하지 않는다.
void main() {
  const uid = 'test-uid';

  Achievement done(int i) =>
      Achievement(id: 'a$i', questId: 'q$i', questTitle: '도전$i', coin: 5, xp: 10);

  // ── 완료 수: 성취 개수와 일치 (상수 하드코딩 우회 봉쇄) ──
  //
  // 서로 다른 개수(2·3)를 돌려 "완료 수를 상수로 박으면 실패"를 강제한다. streak은
  // 개수와 다른 값으로 둬서 라벨이 뒤바뀌어도(완료↔연속) 잡힌다.
  for (final (count, streak) in [(2, 7), (3, 5)]) {
    testWidgets('★ 완료 수 stat이 성취 $count개와 일치한다 (상수 우회 봉쇄)', (tester) async {
      await pumpScreen(
        tester,
        const ProfileScreen(),
        user: AppUser(uid: uid, streak: streak),
        achievements: [for (var i = 0; i < count; i++) done(i)],
      );
      await tester.pumpAndSettle();

      expect(find.text('$count'), findsOneWidget);
      expect(find.text('완료한 도전'), findsOneWidget);
      expect(find.text('$streak'), findsOneWidget);
      expect(find.text('연속 출석'), findsOneWidget);
    });
  }

  testWidgets('★ 완료 수가 achievements 스트림과 연동된다 (기록 늘면 수 증가)', (tester) async {
    // 성취 1건 + 아직 완료 안 한 퀘스트 1개로 시작 → "1".
    final repo = await pumpScreen(
      tester,
      const ProfileScreen(),
      user: const AppUser(uid: uid),
      achievements: [done(0)],
      quests: const [Quest(id: 'qp', title: '진행 중', status: QuestStatus.todo)],
    );
    await tester.pumpAndSettle();
    expect(find.text('1'), findsOneWidget);

    // 퀘스트를 완료하면 성취가 1건 추가돼 스트림이 갱신된다 → "2".
    await repo.completeQuest(uid, 'qp');
    await tester.pumpAndSettle();

    expect(find.text('2'), findsOneWidget);
    expect(find.text('1'), findsNothing);
  });

  testWidgets('스트릭 0이면 "아직 없음"으로 표시된다', (tester) async {
    await pumpScreen(
      tester,
      const ProfileScreen(),
      user: const AppUser(uid: uid, streak: 0),
    );
    await tester.pumpAndSettle();

    expect(find.text('아직 없음'), findsOneWidget);
    expect(find.text('연속 출석'), findsOneWidget);
  });

  testWidgets('가입일이 KST(UTC+9) 기준으로 표시된다', (tester) async {
    // UTC 20:00 → KST 다음 날 05:00. 날짜가 하루 넘어가야 KST 오프셋이 증명된다.
    await pumpScreen(
      tester,
      const ProfileScreen(),
      user: AppUser(uid: uid, createdAt: DateTime.utc(2026, 3, 1, 20)),
    );
    await tester.pumpAndSettle();

    expect(find.text('가입일'), findsOneWidget);
    expect(find.text('2026년 3월 2일'), findsOneWidget);
    // UTC 그대로(3월 1일)로 찍으면 안 된다.
    expect(find.text('2026년 3월 1일'), findsNothing);
  });

  testWidgets('가입일(createdAt)이 null이면 가입일 행을 생략한다', (tester) async {
    await pumpScreen(
      tester,
      const ProfileScreen(),
      user: const AppUser(uid: uid),
    );
    await tester.pumpAndSettle();

    expect(find.text('가입일'), findsNothing);
    // 나머지 통계는 그대로 보인다.
    expect(find.text('완료한 도전'), findsOneWidget);
  });

  testWidgets('성취가 0건이어도(빈 상태) 완료 0을 정상 렌더한다', (tester) async {
    await pumpScreen(
      tester,
      const ProfileScreen(),
      user: const AppUser(uid: uid),
      achievements: const [],
    );
    await tester.pumpAndSettle();

    // 빈 상태는 EmptyView가 아니라 "0"으로 — 신규 사용자도 정상 화면이어야 한다.
    expect(find.text('0'), findsOneWidget);
    expect(find.text('완료한 도전'), findsOneWidget);
    expect(find.byType(ErrorView), findsNothing);
  });

  testWidgets('통계 로딩 중에는 스켈레톤을 보여 준다', (tester) async {
    await pumpScreen(
      tester,
      const ProfileScreen(),
      user: const AppUser(uid: uid),
      extraOverrides: loadingForever(),
    );
    await tester.pump();

    expect(find.byType(SkeletonBox), findsWidgets);
    // 로딩 중에는 통계 본문(수치·라벨)이 아직 없다.
    expect(find.text('완료한 도전'), findsNothing);
  });

  testWidgets('통계 조회 실패면 오류 화면 + 다시 시도가 뜬다', (tester) async {
    await pumpScreen(
      tester,
      const ProfileScreen(),
      user: const AppUser(uid: uid),
      failWith: const NetworkFailure(),
    );
    await tester.pumpAndSettle();

    expect(find.byType(ErrorView), findsOneWidget);
    expect(find.text('다시 시도'), findsOneWidget);
  });

  testWidgets('★ 계정 연동은 "준비 중"으로 뜨고 탭하면 안내한다 (OAuth 자리만)', (tester) async {
    await pumpScreen(
      tester,
      const ProfileScreen(),
      user: const AppUser(uid: uid),
    );
    await tester.pumpAndSettle();

    expect(find.text('Google 계정 연동'), findsOneWidget);
    expect(find.text('준비 중'), findsOneWidget);

    await tester.tap(find.text('Google 계정 연동'));
    await tester.pump(); // 스낵바 등장

    expect(find.text('계정 연동은 곧 지원돼요.'), findsOneWidget);
  });

  testWidgets('★ 로그아웃 버튼이 없다 (익명 로그아웃 = 데이터 유실, 회귀 방어)', (tester) async {
    await pumpScreen(
      tester,
      const ProfileScreen(),
      user: const AppUser(uid: uid),
    );
    await tester.pumpAndSettle();

    // 익명 계정이라 로그아웃하면 진행상황이 통째로 날아간다. OAuth 연동 전까지
    // 로그아웃 UI를 두지 않는다 — 실수로 다시 생기면 이 단언이 잡는다.
    expect(find.textContaining('로그아웃'), findsNothing);
    expect(find.textContaining('로그인'), findsNothing);
  });
}
