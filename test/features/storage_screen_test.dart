import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/core/widgets/reward_chip.dart';
import 'package:one_step/core/widgets/state_views.dart';
import 'package:one_step/features/storage/storage_screen.dart';
import 'package:one_step/models/achievement.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/providers/providers.dart';

import '../helpers/pump_app.dart';

/// 보관함 화면 — 성취 타임라인 · 요약 stat · 인증 뱃지 · 로딩/빈/오류.
void main() {
  const uid = 'test-uid';

  Achievement ach({
    required String id,
    required String title,
    int coin = 5,
    int xp = 10,
    String? memo,
    bool hasPhoto = false,
    bool verified = false,
    DateTime? at,
  }) => Achievement(
    id: id,
    questId: 'q-$id',
    questTitle: title,
    coin: coin,
    xp: xp,
    memo: memo,
    verified: verified,
    hasPhoto: hasPhoto,
    completedAt: at ?? DateTime.utc(2026, 7, 20),
  );

  testWidgets('완료 기록이 최신순 타임라인으로 표시된다', (tester) async {
    await pumpScreen(
      tester,
      const StorageScreen(),
      user: const AppUser(uid: uid, streak: 4),
      achievements: [
        ach(id: 'a', title: '가장 오래됨', at: DateTime.utc(2026, 7, 10)),
        ach(id: 'b', title: '가장 최신', at: DateTime.utc(2026, 7, 20)),
      ],
    );
    await tester.pumpAndSettle();

    expect(find.text('가장 최신'), findsOneWidget);
    expect(find.text('가장 오래됨'), findsOneWidget);

    // 최신이 오래된 것보다 위에 있어야 한다(y좌표 비교).
    final newest = tester.getCenter(find.text('가장 최신')).dy;
    final oldest = tester.getCenter(find.text('가장 오래됨')).dy;
    expect(newest, lessThan(oldest));

    // 코인·XP는 RewardChip으로 표시된다.
    expect(find.byType(RewardChip), findsNWidgets(2));
  });

  // 완료 수 stat이 **기록 개수를 실제로 세는지** 못 박는다. 한 케이스(예: 3건)만
  // 보면 `completedCount = 3` 같은 상수 하드코딩으로 우회된다. 서로 다른 개수를
  // 두 번 돌려(2건·5건) 상수 우회를 봉쇄한다. 코인은 8로 둬서 RewardChip('+8')이
  // 개수 숫자와 충돌하지 않게 한다.
  for (final (count, streak) in [(2, 7), (5, 3)]) {
    testWidgets('★ 완료 수 stat이 기록 $count개와 일치한다 (상수 우회 봉쇄·뮤테이션 방어)', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        const StorageScreen(),
        user: AppUser(uid: uid, streak: streak),
        achievements: [
          for (var i = 0; i < count; i++)
            ach(
              id: 'a$i',
              title: '도전$i',
              coin: 8,
              at: DateTime.utc(2026, 7, 20 - i),
            ),
        ],
      );
      await tester.pumpAndSettle();

      // 완료 stat = count, 연속 stat = streak. 둘을 서로 다르게 둬서 라벨이
      // 뒤바뀌어도(완료↔연속) 잡힌다.
      expect(find.text('$count'), findsOneWidget);
      expect(find.text('완료'), findsOneWidget);
      expect(find.text('$streak'), findsOneWidget);
      expect(find.text('연속 일수'), findsOneWidget);
    });
  }

  testWidgets('인증 뱃지 — 메모/사진이 있으면 각각 뜬다', (tester) async {
    await pumpScreen(
      tester,
      const StorageScreen(),
      user: const AppUser(uid: uid),
      achievements: [
        ach(
          id: 'a',
          title: '메모+사진',
          memo: '카페에서 2시간',
          hasPhoto: true,
          verified: true,
        ),
      ],
    );
    await tester.pumpAndSettle();

    expect(find.text('메모'), findsOneWidget);
    expect(find.text('사진'), findsOneWidget);
  });

  testWidgets('메모·사진이 없으면 인증 뱃지도 없다', (tester) async {
    await pumpScreen(
      tester,
      const StorageScreen(),
      user: const AppUser(uid: uid),
      achievements: [ach(id: 'a', title: '인증 없이 완료')],
    );
    await tester.pumpAndSettle();

    expect(find.text('메모'), findsNothing);
    expect(find.text('사진'), findsNothing);
  });

  testWidgets('완료 기록이 없으면 빈 상태를 보여 준다', (tester) async {
    await pumpScreen(
      tester,
      const StorageScreen(),
      user: const AppUser(uid: uid),
      // achievements 없음.
    );
    await tester.pumpAndSettle();

    expect(find.byType(EmptyView), findsOneWidget);
    expect(find.text('아직 완료한 도전이 없어요'), findsOneWidget);
    // 빈 상태에도 요약 stat(완료 0)은 보인다.
    expect(find.text('완료'), findsOneWidget);
  });

  testWidgets('로딩 중에는 스켈레톤을 보여 준다', (tester) async {
    // 보관함은 achievementsProvider로 로딩을 판단하므로 그 스트림을 영원히
    // 로딩 상태로 둔다(InMemory는 즉시 응답해 로딩 프레임을 관찰할 수 없다).
    await pumpScreen(
      tester,
      const StorageScreen(),
      user: const AppUser(uid: uid),
      extraOverrides: [
        achievementsProvider.overrideWith(
          (ref) => Completer<List<Achievement>>().future.asStream(),
        ),
      ],
    );
    // pumpAndSettle 대신 한 프레임만 — 스트림이 영원히 로딩이라 settle이 끝나지 않는다.
    await tester.pump();

    expect(find.byType(SkeletonBox), findsWidgets);
    expect(find.byType(EmptyView), findsNothing);
  });

  testWidgets('조회 실패면 오류 화면 + 다시 시도가 뜬다', (tester) async {
    await pumpScreen(
      tester,
      const StorageScreen(),
      user: const AppUser(uid: uid),
      failWith: const NetworkFailure(),
    );
    await tester.pumpAndSettle();

    expect(find.byType(ErrorView), findsOneWidget);
    expect(find.text('다시 시도'), findsOneWidget);
  });
}
