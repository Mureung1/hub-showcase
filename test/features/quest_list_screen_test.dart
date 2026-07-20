import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/reward_rules.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/core/widgets/difficulty_pill.dart';
import 'package:one_step/core/widgets/quest_card.dart';
import 'package:one_step/core/widgets/state_views.dart';
import 'package:one_step/features/quest/quest_list_screen.dart';
import 'package:one_step/features/quest/widgets/quest_complete_dialog.dart';
import 'package:one_step/features/quest/widgets/quest_memo_sheet.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/models/quest.dart';
import 'package:one_step/models/quest_status.dart';
import 'package:one_step/providers/providers.dart';
import 'package:one_step/repositories/memory/in_memory_quest_repository.dart';
import 'package:one_step/repositories/memory/in_memory_user_repository.dart';

import '../helpers/pump_app.dart';

/// 목록 조회는 정상이고 **완료(지급)만** 실패하는 저장소.
///
/// `failWith`는 모든 호출을 실패시키므로 "목록은 떠 있는데 완료만 실패" 상황을
/// 만들 수 없다. 그 한 메서드만 갈아끼운다.
class _FailingCompleteQuestRepository extends InMemoryQuestRepository {
  _FailingCompleteQuestRepository({super.seed, super.users});

  @override
  Future<Reward?> completeQuest(
    String uid,
    String questId, {
    String? memo,
  }) async {
    throw const NetworkFailure();
  }
}

/// 완료 체크 → **인증 메모 시트** → 건너뛰기 (3주차-B 이후의 기본 완료 경로).
///
/// 완료는 이제 항상 시트를 거친다. 메모 없이 완료하는 대부분의 테스트가
/// 같은 두 단계를 반복하므로 헬퍼로 묶었다.
Future<void> completeSkippingMemo(WidgetTester tester) async {
  await tester.tap(find.byTooltip('완료'));
  await tester.pumpAndSettle();
  await tester.tap(find.text('건너뛰기'));
  await tester.pumpAndSettle();
}

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

    await completeSkippingMemo(tester);

    final quests = await repo.fetchQuests('test-uid');
    expect(quests.single.done, isTrue);

    // 화면에도 반영된다.
    expect(find.byTooltip('완료 취소'), findsOneWidget);
  });

  group('완료 → 트랜잭션 보상 지급 → 완료 연출 (3주차 핵심 보상 루프)', () {
    testWidgets('완료하면 지급된 코인·XP가 연출에 정확히 표시된다', (tester) async {
      final repo = await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(id: 'q1', title: '지원서 초안 쓰기', difficulty: Difficulty.hard),
        ],
      );
      await tester.pumpAndSettle();

      await completeSkippingMemo(tester);

      // 축하 연출이 뜨고, 어려움 보상(코인10 / XP20)이 그대로 보인다.
      expect(find.byType(QuestCompleteDialog), findsOneWidget);
      expect(find.text('퀘스트 완료!'), findsOneWidget);
      expect(find.text('지원서 초안 쓰기'), findsWidgets);
      expect(find.text('+10'), findsWidgets);
      expect(find.text('XP +20'), findsWidgets);

      // 잔액에도 실제로 반영된다(홈의 watchUser가 이 값을 흘린다).
      final user = await repo.users!.fetchUser('test-uid');
      expect(user.coin, 10);
      expect(user.xp, 20);
    });

    testWidgets('연출을 닫으면 퀘스트가 완료 상태로 남는다', (tester) async {
      final repo = await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(id: 'q1', title: '완료할 퀘스트', difficulty: Difficulty.easy),
        ],
      );
      await tester.pumpAndSettle();

      await completeSkippingMemo(tester);
      await tester.tap(find.text('좋아요'));
      await tester.pumpAndSettle();

      expect(find.byType(QuestCompleteDialog), findsNothing);
      expect(find.byTooltip('완료 취소'), findsOneWidget);

      final quest = (await repo.fetchQuests('test-uid')).single;
      expect(quest.done, isTrue);
      expect(quest.completedAt, isNotNull);
    });

    testWidgets('★ 처리 중 중복 탭은 무시된다 (연출도 지급도 한 번뿐)', (tester) async {
      final repo = await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(id: 'q1', title: '중복 탭 대상', difficulty: Difficulty.normal),
        ],
      );
      await tester.pumpAndSettle();

      // 첫 탭이 끝나기 전에 연달아 누른다. _completing이 두 번째부터를 막는다.
      final toggle = find.byTooltip('완료');
      await tester.tap(toggle);
      await tester.tap(toggle, warnIfMissed: false);
      await tester.pumpAndSettle();

      // 시트도 한 장만 뜬다 — 두 번째 탭이 통과했다면 시트가 겹쳐 쌓인다.
      expect(find.text('건너뛰기'), findsOneWidget);

      // 시트 안에서도 연타를 막는다(pop이 두 번 불리면 화면까지 닫힌다).
      final skip = find.text('건너뛰기');
      await tester.tap(skip);
      await tester.tap(skip, warnIfMissed: false);
      await tester.pumpAndSettle();

      // 연출은 한 장만 뜬다 — 다이얼로그가 겹쳐 뜨면 코인을 두 번 받은 것처럼 보인다.
      expect(find.byType(QuestCompleteDialog), findsOneWidget);

      final user = await repo.users!.fetchUser('test-uid');
      expect(user.coin, 5);
      expect(user.xp, 10);
    });

    testWidgets('★ 이미 보상을 받은 퀘스트를 다시 완료하면 연출이 뜨지 않는다', (tester) async {
      // rewardedAt이 이미 있는 = 예전에 지급된 퀘스트.
      // (완료 해제 상태라 completedAt은 비어 있지만, 지급 이력은 남아 있다.)
      final repo = await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: [
          Quest(
            id: 'q1',
            title: '예전에 완료했던 퀘스트',
            difficulty: Difficulty.hard,
            status: QuestStatus.todo,
            rewardedAt: DateTime(2026, 1, 1),
          ),
        ],
      );
      await tester.pumpAndSettle();

      await completeSkippingMemo(tester);

      // 상태는 done이 되지만 축하는 없다(받지 않은 보상을 축하하면 안 된다).
      expect(find.byType(QuestCompleteDialog), findsNothing);
      expect(find.byTooltip('완료 취소'), findsOneWidget);

      final user = await repo.users!.fetchUser('test-uid');
      expect(user.coin, 0);
      expect(user.xp, 0);
    });

    testWidgets('★ 지급이 실패하면 스낵바가 뜨고 상태·잔액이 그대로다', (tester) async {
      // 목록 조회는 성공하고 completeQuest만 실패하는 상황.
      final users = InMemoryUserRepository(seed: AppUser.initial('test-uid'));
      final failing = _FailingCompleteQuestRepository(
        seed: const [Quest(id: 'q1', title: '실패할 완료', difficulty: Difficulty.easy)],
        users: users,
      );
      addTearDown(users.dispose);
      addTearDown(failing.dispose);

      await pumpScreen(
        tester,
        const QuestListScreen(),
        extraOverrides: [
          questRepositoryProvider.overrideWithValue(failing),
          userRepositoryProvider.overrideWithValue(users),
        ],
      );
      await tester.pumpAndSettle();

      await completeSkippingMemo(tester);

      // 오류는 스낵바로 알린다. 축하 연출은 뜨지 않는다.
      expect(find.text('인터넷 연결을 확인해 주세요.'), findsOneWidget);
      expect(find.byType(QuestCompleteDialog), findsNothing);

      // 트랜잭션이 커밋되지 않았으므로 상태도 잔액도 그대로다.
      final quest = (await failing.fetchQuests('test-uid')).single;
      expect(quest.done, isFalse);
      final user = await users.fetchUser('test-uid');
      expect(user.coin, 0);

      // 진행 표시도 해제돼 다시 시도할 수 있다.
      expect(find.byTooltip('완료'), findsOneWidget);
    });

    testWidgets('완료 해제는 보상 지급 없이 상태만 되돌린다', (tester) async {
      final repo = await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: [
          Quest(
            id: 'q1',
            title: '완료된 퀘스트',
            difficulty: Difficulty.easy,
            status: QuestStatus.done,
            completedAt: DateTime(2026, 1, 1),
          ),
        ],
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byTooltip('완료 취소'));
      await tester.pumpAndSettle();

      expect(find.byType(QuestCompleteDialog), findsNothing);
      expect(find.byTooltip('완료'), findsOneWidget);

      final user = await repo.users!.fetchUser('test-uid');
      expect(user.coin, 0);
    });
  });

  group('메모 인증 → 보너스 (3주차-B)', () {
    testWidgets('완료를 체크하면 먼저 메모 시트가 뜬다', (tester) async {
      await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [Quest(id: 'q1', title: '인증할 퀘스트')],
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byTooltip('완료'));
      await tester.pumpAndSettle();

      expect(find.byType(QuestMemoSheet), findsOneWidget);
      expect(find.text('오늘 어땠나요?'), findsOneWidget);
      expect(find.text('건너뛰기'), findsOneWidget);
      expect(find.text('완료하기'), findsOneWidget);

      // 시트 단계에서는 아직 아무 보상도 지급되지 않았다.
      expect(find.byType(QuestCompleteDialog), findsNothing);
    });

    testWidgets('건너뛰면 기본 보상만 지급된다 (보너스 문구 없음)', (tester) async {
      final repo = await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(id: 'q1', title: '메모 없이 완료', difficulty: Difficulty.normal),
        ],
      );
      await tester.pumpAndSettle();

      await completeSkippingMemo(tester);

      // 보통 = 코인5 / XP10. 보너스는 붙지 않는다.
      expect(find.byType(QuestCompleteDialog), findsOneWidget);
      expect(find.textContaining('메모 인증 보너스'), findsNothing);

      final user = await repo.users!.fetchUser('test-uid');
      expect(user.coin, 5);
      expect(user.xp, 10);

      final quest = (await repo.fetchQuests('test-uid')).single;
      expect(quest.memo, isNull);
    });

    testWidgets('★ 메모를 쓰고 완료하면 보너스가 합산 지급되고 연출에 표시된다', (tester) async {
      final repo = await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(id: 'q1', title: '메모 인증 퀘스트', difficulty: Difficulty.normal),
        ],
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byTooltip('완료'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), '공고 3개 찾아서 정리했다');
      await tester.tap(find.text('완료하기'));
      await tester.pumpAndSettle();

      // 보통(5/10) + 인증 보너스(3/3) = 8/13.
      expect(find.byType(QuestCompleteDialog), findsOneWidget);
      expect(find.text('+8'), findsWidgets);
      expect(find.text('XP +13'), findsWidgets);
      // 총액만 보여 주면 왜 8인지 알 수 없다. 보너스 사실을 밝힌다.
      expect(find.textContaining('메모 인증 보너스'), findsOneWidget);

      final user = await repo.users!.fetchUser('test-uid');
      expect(user.coin, 8);
      expect(user.xp, 13);

      // 메모는 퀘스트에도 남는다(앱을 다시 켜도 유지된다).
      final quest = (await repo.fetchQuests('test-uid')).single;
      expect(quest.memo, '공고 3개 찾아서 정리했다');
      expect(quest.isVerified, isTrue);

      // 성취 기록도 1건 남는다.
      final records = repo.achievementsOf('test-uid');
      expect(records, hasLength(1));
      expect(records.single.verified, isTrue);
      expect(records.single.coin, 8);
    });

    testWidgets('★ 시트를 취소하면 완료 자체가 진행되지 않는다', (tester) async {
      // 실수로 체크한 경우다. 보상은 rewardedAt 때문에 되돌릴 수 없으므로
      // "취소 = 아무 일도 없었음"이 반드시 보장돼야 한다.
      final repo = await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(id: 'q1', title: '실수로 체크', difficulty: Difficulty.hard),
        ],
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byTooltip('완료'));
      await tester.pumpAndSettle();

      // 시트 바깥(barrier)을 눌러 닫는다 = 취소.
      await tester.tapAt(const Offset(10, 10));
      await tester.pumpAndSettle();

      expect(find.byType(QuestMemoSheet), findsNothing);
      expect(find.byType(QuestCompleteDialog), findsNothing);

      // 상태·잔액 모두 그대로다.
      final quest = (await repo.fetchQuests('test-uid')).single;
      expect(quest.done, isFalse);
      expect(quest.isRewarded, isFalse);

      final user = await repo.users!.fetchUser('test-uid');
      expect(user.coin, 0);
      expect(user.xp, 0);

      // 기록도 남지 않는다.
      expect(repo.achievementsOf('test-uid'), isEmpty);

      // 진행 표시가 풀려 다시 완료할 수 있다.
      expect(find.byTooltip('완료'), findsOneWidget);
    });

    testWidgets('완료 해제에는 메모 시트를 묻지 않는다', (tester) async {
      await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: [
          Quest(
            id: 'q1',
            title: '완료된 퀘스트',
            status: QuestStatus.done,
            completedAt: DateTime(2026, 1, 1),
          ),
        ],
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byTooltip('완료 취소'));
      await tester.pumpAndSettle();

      expect(find.byType(QuestMemoSheet), findsNothing);
    });
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
