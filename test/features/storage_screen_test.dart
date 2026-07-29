import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/core/widgets/quest_card.dart';
import 'package:one_step/core/widgets/stat_card.dart';
import 'package:one_step/core/widgets/state_views.dart';
import 'package:one_step/features/quest/widgets/goal_group_section.dart';
import 'package:one_step/features/storage/storage_screen.dart';
import 'package:one_step/features/storage/widgets/achievement_detail_sheet.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/models/goal.dart';
import 'package:one_step/models/quest.dart';
import 'package:one_step/models/quest_status.dart';

import '../helpers/pump_app.dart';

/// 보관함 화면 (2단계) — 완료돼 **보관된**(`archived == true`) 퀘스트를 오늘의 퀘스트와
/// **같은 폴더 그룹뷰**로 보여 준다. 다른 점은 완료 토글이 없는 보기 전용 카드다.
void main() {
  const uid = 'test-uid';

  Quest archived(
    String id, {
    required String title,
    String? goalId,
    int order = 0,
  }) => Quest(
    id: id,
    title: title,
    goalId: goalId,
    status: QuestStatus.done,
    archived: true,
    order: order,
  );

  testWidgets('보관된 퀘스트가 목표 폴더 그룹뷰로 보인다', (tester) async {
    await pumpScreen(
      tester,
      const StorageScreen(),
      user: const AppUser(uid: uid, streak: 4),
      goals: const [Goal(id: 'g1', text: '공모전 지원하기')],
      quests: [
        archived('q1', title: '공고 찾기', goalId: 'g1', order: 0),
        archived('q2', title: '지원서 쓰기', goalId: 'g1', order: 1),
      ],
    );
    await tester.pumpAndSettle();

    // 폴더(목표 라벨)로 묶이고, 기본 펼침이라 카드가 그 아래 붙는다.
    expect(find.byType(GoalGroupSection), findsOneWidget);
    expect(find.text('공모전 지원하기'), findsOneWidget);
    expect(find.text('공고 찾기'), findsOneWidget);
    expect(find.text('지원서 쓰기'), findsOneWidget);
  });

  // 완료 수 stat이 **보관된 퀘스트 개수를 실제로 세는지** 못 박는다. 서로 다른
  // 개수(2·3)를 돌려 상수 하드코딩 우회를 봉쇄한다. streak은 개수와 다르게 둬서
  // 라벨이 뒤바뀌어도(완료↔연속) 잡힌다.
  for (final (count, streak) in [(2, 7), (3, 5)]) {
    testWidgets('★ 완료 수 stat이 보관 퀘스트 $count개와 일치한다 (상수 우회 봉쇄)', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        const StorageScreen(),
        user: AppUser(uid: uid, streak: streak),
        quests: [
          for (var i = 0; i < count; i++)
            archived('q$i', title: '도전$i', order: i),
        ],
      );
      await tester.pumpAndSettle();

      // 라벨은 **stat 카드 안에서** 센다. 목표 폴더 헤더도 진행 표시로 '완료'를
      // 쓰기 때문에(`2/2 완료`) 화면 전체를 대상으로 하면 stat과 헤더가 섞인다.
      // 검증 의도(완료 stat 라벨이 정확히 하나)는 그대로다.
      expect(find.text('$count'), findsOneWidget);
      expect(
        find.descendant(of: find.byType(StatCard), matching: find.text('완료')),
        findsOneWidget,
      );
      // 스트릭 값은 단위까지 붙어 `7일`로 그려진다(정본 실측 · 홈·MY와 같다).
      expect(find.text('$streak일'), findsOneWidget);
      expect(find.text('연속 일수'), findsOneWidget);
    });
  }

  testWidgets('★ 보관함 카드에는 완료 토글이 없다 (보기 전용)', (tester) async {
    await pumpScreen(
      tester,
      const StorageScreen(),
      user: const AppUser(uid: uid),
      quests: [archived('q1', title: '끝낸 퀘스트')],
    );
    await tester.pumpAndSettle();

    // 카드는 보이지만 완료/완료 취소 토글은 없다(단방향 이동이라 되돌리지 않는다).
    expect(find.byType(QuestCard), findsOneWidget);
    expect(find.byTooltip('완료'), findsNothing);
    expect(find.byTooltip('완료 취소'), findsNothing);
    // 더보기(수정·삭제) 메뉴도 없다.
    expect(find.byTooltip('끝낸 퀘스트 더보기'), findsNothing);
  });

  testWidgets('★ 카드를 탭하면 상세 시트가 열리고 완료 당시 메모를 보여 준다', (tester) async {
    // 메모는 카드에는 안 뜨고 상세 시트에만 뜬다 — 그 텍스트가 보이면 "시트가 실제로
    // 그 퀘스트의 데이터로 열렸다"가 증명된다(단순 카드 렌더와 구별된다).
    await pumpScreen(
      tester,
      const StorageScreen(),
      user: const AppUser(uid: uid),
      quests: [
        Quest(
          id: 'q1',
          title: '끝낸 퀘스트',
          status: QuestStatus.done,
          archived: true,
          memo: '상세에서만 보이는 메모',
        ),
      ],
    );
    await tester.pumpAndSettle();

    // 탭 전에는 시트가 없다.
    expect(find.byType(AchievementDetailSheet), findsNothing);
    expect(find.text('상세에서만 보이는 메모'), findsNothing);

    await tester.tap(find.byType(QuestCard));
    await tester.pumpAndSettle();

    expect(find.byType(AchievementDetailSheet), findsOneWidget);
    expect(find.text('상세에서만 보이는 메모'), findsOneWidget);
  });

  testWidgets('보관된 퀘스트가 없으면 빈 상태를 보여 준다', (tester) async {
    await pumpScreen(
      tester,
      const StorageScreen(),
      user: const AppUser(uid: uid),
      // 완료됐지만 아직 보관되지 않은 퀘스트는 보관함에 뜨지 않는다.
      quests: const [
        Quest(id: 'q1', title: '완료했지만 보관 전', status: QuestStatus.done),
      ],
    );
    await tester.pumpAndSettle();

    expect(find.byType(EmptyView), findsOneWidget);
    expect(find.text('아직 끝낸 도전이 없어요'), findsOneWidget);
    // 보관 전 완료 퀘스트는 목록에 나타나지 않는다.
    expect(find.text('완료했지만 보관 전'), findsNothing);
    // 빈 상태에도 요약 stat(완료 0)은 보인다.
    expect(find.text('완료'), findsOneWidget);
  });

  testWidgets('로딩 중에는 스켈레톤을 보여 준다', (tester) async {
    // 보관함은 questListProvider로 로딩을 판단하므로 그 스트림을 영원히 로딩으로 둔다.
    await pumpScreen(
      tester,
      const StorageScreen(),
      user: const AppUser(uid: uid),
      extraOverrides: loadingForever(),
    );
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
