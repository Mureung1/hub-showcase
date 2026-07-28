import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/core/widgets/difficulty_pill.dart';
import 'package:one_step/core/widgets/gradient_button.dart';
import 'package:one_step/core/widgets/quest_card.dart';
import 'package:one_step/core/widgets/quest_source_chip.dart';
import 'package:one_step/core/widgets/state_views.dart';
import 'package:one_step/features/quest/widgets/ai_promo_card.dart';
import 'package:one_step/features/home/widgets/evolve_dialog.dart';
import 'package:one_step/features/home/widgets/level_up_dialog.dart';
import 'package:one_step/features/quest/quest_list_screen.dart';
import 'package:one_step/features/quest/widgets/goal_complete_dialog.dart';
import 'package:one_step/features/quest/widgets/goal_group_section.dart';
import 'package:one_step/features/quest/widgets/quest_complete_dialog.dart';
import 'package:one_step/features/quest/widgets/quest_edit_dialog.dart';
import 'package:one_step/features/quest/widgets/quest_memo_sheet.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/models/goal.dart';
import 'package:one_step/models/quest.dart';
import 'package:one_step/models/quest_group.dart';
import 'package:one_step/models/quest_status.dart';
import 'package:one_step/providers/providers.dart';
import 'package:one_step/repositories/quest_repository.dart';
import 'package:one_step/repositories/memory/in_memory_goal_repository.dart';
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
  Future<CompleteResult?> completeQuest(
    String uid,
    String questId, {
    String? memo,
    String? photoBase64,
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

/// 특정 제목의 카드에 있는 완료 버튼을 눌러 **메모를 건너뛰고** 완료한다.
///
/// 같은 화면에 완료 버튼이 여럿일 때(폴더 안 여러 퀘스트) `find.byTooltip('완료')`는
/// 모호하다. 카드를 제목으로 특정한 뒤 그 안의 토글만 누른다. 완료 연출은 닫지 않는다
/// (연출 검증은 호출부의 몫).
Future<void> completeByTitle(WidgetTester tester, String title) async {
  final card = find.ancestor(
    of: find.text(title),
    matching: find.byType(QuestCard),
  );
  await tester.tap(find.descendant(of: card, matching: find.byTooltip('완료')));
  await tester.pumpAndSettle();
  await tester.tap(find.text('건너뛰기'));
  await tester.pumpAndSettle();
}

/// 세로가 넉넉한 뷰포트로 바꾼다.
///
/// 기본 800×600은 **목록 상단(AppBar + AI 프로모 카드)이 자리를 차지한 뒤** 카드
/// 두세 장이면 아래쪽이 화면 밖으로 나가거나 FAB에 가려 탭이 빗나간다. 검증하려는
/// 것은 완료·그룹 동작이지 좁은 화면의 스크롤이 아니므로 화면을 키운다.
void useTallViewport(WidgetTester tester) {
  tester.view.physicalSize = const Size(1200, 2600);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

/// 전부 완료된 그룹은 **기본으로 접혀 있다**(A0 그룹뷰 규칙).
///
/// 이미 `done`인 퀘스트만 심고 시작하는 테스트(완료 해제 계열)는 카드가 처음부터
/// 접힌 폴더 안에 있으므로, 헤더를 눌러 펼친 뒤에 카드를 만져야 한다.
/// 검증 대상(해제 동작 자체)은 그대로다.
Future<void> expandGroup(
  WidgetTester tester, [
  String label = kDirectQuestGroupLabel,
]) async {
  await tester.tap(find.text(label));
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

  testWidgets('완료 체크를 하면 done + 보관함으로 이동한다 (오늘 목록에서 사라짐)', (tester) async {
    final repo = await pumpScreen(
      tester,
      const QuestListScreen(),
      quests: const [Quest(id: 'q1', title: '완료할 퀘스트')],
    );
    await tester.pumpAndSettle();

    await completeSkippingMemo(tester);
    // 완료 연출을 닫는다.
    await tester.tap(find.text('좋아요'));
    await tester.pumpAndSettle();

    // 저장소: done + archived(직접 등록은 완료 즉시 낱개 이동).
    final quests = await repo.fetchQuests('test-uid');
    expect(quests.single.done, isTrue);
    expect(quests.single.archived, isTrue);

    // 화면: 오늘의 퀘스트에서 사라진다(= 보관함으로 이동). 하나뿐이라 빈 상태.
    expect(find.byType(QuestCard), findsNothing);
    expect(find.byType(EmptyView), findsOneWidget);
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
      // XP 20은 알 단계 5/레벨이라 Lv1→Lv5로 오르고 레벨 내 잔여 XP는 0이다
      // (user.xp는 총 XP가 아니라 레벨 내 잔여 XP다 — 4주차 레벨업 반영).
      final user = await repo.users!.fetchUser('test-uid');
      expect(user.coin, 10);
      expect(user.level, 5);
      expect(user.xp, 0);
    });

    testWidgets('연출을 닫으면 퀘스트가 완료된 채 보관함으로 옮겨진다', (tester) async {
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
      // 완료 = 이동: 오늘의 퀘스트에서 카드가 사라진다.
      expect(find.byType(QuestCard), findsNothing);

      final quest = (await repo.fetchQuests('test-uid')).single;
      expect(quest.done, isTrue);
      expect(quest.completedAt, isNotNull);
      expect(quest.archived, isTrue);
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
      // XP 10 → 알 단계 5/레벨이라 Lv3, 레벨 내 잔여 XP 0.
      expect(user.level, 3);
      expect(user.xp, 0);
    });

    testWidgets('★ 이미 보상받은 퀘스트를 다시 완료하면 메모 시트 없이 바로 안내된다', (tester) async {
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

      // 시트를 통하지 않고 완료 탭만 한다(건너뛰기 헬퍼를 쓰지 않는다).
      await tester.tap(find.byTooltip('완료'));
      await tester.pumpAndSettle();

      // 이미 보상받은 퀘스트라 "오늘 어땠나요?" 메모 시트가 아예 안 뜬다.
      expect(find.text('오늘 어땠나요?'), findsNothing);

      // 무반응이 아니라 "이미 완료한 퀘스트예요"로 이유를 알린다.
      expect(find.text('이미 완료한 퀘스트예요'), findsOneWidget);
      // 축하는 없다(이미 받은 보상을 다시 축하하면 안 된다).
      expect(find.byType(QuestCompleteDialog), findsNothing);

      // ★ 회귀 방지: 그래도 완료 처리는 되어야 한다 — done으로 바뀌고, 완료 = 이동이라
      //   보관함으로 옮겨져 오늘 목록에서 사라진다(카드가 없다).
      final quest = (await repo.fetchQuests('test-uid')).single;
      expect(quest.done, isTrue);
      expect(quest.archived, isTrue);
      expect(find.byTooltip('완료 취소'), findsNothing);

      // completeQuest는 호출되지만 rewardedAt 가드가 재지급을 막으므로 잔액은 그대로다.
      final user = await repo.users!.fetchUser('test-uid');
      expect(user.coin, 0);
      expect(user.xp, 0);
    });

    testWidgets('★ 완료 해제(done→todo)에는 "이미 완료" 안내가 뜨지 않는다', (tester) async {
      // 완료 해제도 reward == null 경로지만, 원래 지급이 없는 동작이다.
      // 여기에 안내를 띄우면 오탐이다 — done 여부로 갈라야 한다(#0-1).
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
      await expandGroup(tester);

      await tester.tap(find.byTooltip('완료 취소'));
      await tester.pumpAndSettle();

      // 상태만 되돌아가고, 안내 스낵바도 축하도 뜨지 않는다.
      expect(find.byType(QuestCompleteDialog), findsNothing);
      expect(find.text('이미 완료한 퀘스트예요'), findsNothing);
      expect(find.byTooltip('완료'), findsOneWidget);

      final quest = (await repo.fetchQuests('test-uid')).single;
      expect(quest.done, isFalse);
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
      await expandGroup(tester);

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
      expect(find.textContaining('인증 보너스'), findsNothing);

      // 보통 = 코인5 / XP10. XP는 레벨업으로 소비된다(user.xp는 총 XP가 아니라
      // 레벨 내 잔여 XP): applyXpGain(Lv1,0,+10) → Lv3, 잔여 0 (알 단계 5/lv).
      final user = await repo.users!.fetchUser('test-uid');
      expect(user.coin, 5);
      expect(user.level, 3);
      expect(user.xp, 0);

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
      expect(find.textContaining('인증 보너스'), findsOneWidget);

      // 코인은 8 누적. XP 13은 레벨업으로 소비된다(잔여 XP만 user.xp에 남음):
      // applyXpGain(Lv1,0,+13) → Lv3, 잔여 3 (알 단계 5/lv).
      final user = await repo.users!.fetchUser('test-uid');
      expect(user.coin, 8);
      expect(user.level, 3);
      expect(user.xp, 3);

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
      await expandGroup(tester);

      await tester.tap(find.byTooltip('완료 취소'));
      await tester.pumpAndSettle();

      expect(find.byType(QuestMemoSheet), findsNothing);
    });
  });

  group('완료 → 레벨업 → 진화 순차 연출 (4주차)', () {
    // 완료 연출을 닫으면 레벨업이, 레벨업을 닫으면 진화가 이어 뜬다.
    // 각 연출은 앞 연출을 닫아야 나타나므로 '좋아요'가 한 번에 하나만 존재한다.

    testWidgets('★ 레벨업이 있으면 완료 연출을 닫은 뒤 레벨업 연출이 뜬다', (tester) async {
      // 쉬움 5XP → 알 단계(5/레벨)에서 Lv1 → Lv2. 진화(단계 전환)는 아니다.
      final repo = await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(id: 'q1', title: '레벨업 퀘스트', difficulty: Difficulty.easy),
        ],
      );
      await tester.pumpAndSettle();

      await completeSkippingMemo(tester);

      // 아직 완료 연출만 떠 있다 — 레벨업은 그 다음 단계다.
      expect(find.byType(QuestCompleteDialog), findsOneWidget);
      expect(find.byType(LevelUpDialog), findsNothing);

      await tester.tap(find.text('좋아요'));
      await tester.pumpAndSettle();

      // 완료 연출이 닫히고 레벨업 연출이 이어진다.
      expect(find.byType(QuestCompleteDialog), findsNothing);
      expect(find.byType(LevelUpDialog), findsOneWidget);
      expect(find.text('Lv.1'), findsOneWidget);
      expect(find.text('Lv.2'), findsOneWidget);
      // 같은 단계 안이라 진화 연출은 뜨지 않는다.
      expect(find.byType(EvolveDialog), findsNothing);

      // 레벨업 연출을 닫으면 아무 연출도 남지 않는다(진화 없음).
      await tester.tap(find.text('좋아요'));
      await tester.pumpAndSettle();
      expect(find.byType(LevelUpDialog), findsNothing);
      expect(find.byType(EvolveDialog), findsNothing);

      // 저장소에도 레벨업이 반영된다(재실행 후에도 유지).
      final user = await repo.users!.fetchUser('test-uid');
      expect(user.level, 2);
    });

    testWidgets('★ 레벨업 + 진화가 함께면 완료 → 레벨업 → 진화 순으로 뜬다', (tester) async {
      // Lv9(알) → 쉬움 5XP → Lv10(참새). 레벨업이면서 진화 경계를 넘는다.
      final repo = await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(id: 'q1', title: '진화 퀘스트', difficulty: Difficulty.easy),
        ],
        user: const AppUser(uid: 'test-uid', level: 9, xp: 0),
      );
      await tester.pumpAndSettle();

      await completeSkippingMemo(tester);

      // 1) 완료 연출.
      expect(find.byType(QuestCompleteDialog), findsOneWidget);
      await tester.tap(find.text('좋아요'));
      await tester.pumpAndSettle();

      // 2) 레벨업 연출(Lv.9 → Lv.10). 진화는 아직 안 뜬다.
      expect(find.byType(LevelUpDialog), findsOneWidget);
      expect(find.text('Lv.9'), findsOneWidget);
      expect(find.text('Lv.10'), findsOneWidget);
      expect(find.byType(EvolveDialog), findsNothing);
      await tester.tap(find.text('좋아요'));
      await tester.pumpAndSettle();

      // 3) 진화 연출(알 → 참새).
      expect(find.byType(LevelUpDialog), findsNothing);
      expect(find.byType(EvolveDialog), findsOneWidget);
      expect(find.textContaining('참새'), findsWidgets);

      await tester.tap(find.text('좋아요'));
      await tester.pumpAndSettle();
      expect(find.byType(EvolveDialog), findsNothing);

      final user = await repo.users!.fetchUser('test-uid');
      expect(user.level, 10);
      expect(user.stage.name, '참새');
    });

    testWidgets('★ 레벨업이 없으면 완료 연출만 뜨고 성장 연출은 없다', (tester) async {
      // 참새(Lv10, 10 XP/레벨) xp0 + 쉬움 5XP → 5 < 10이라 레벨이 그대로다.
      await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(id: 'q1', title: '성장 없는 완료', difficulty: Difficulty.easy),
        ],
        user: const AppUser(uid: 'test-uid', level: 10, xp: 0),
      );
      await tester.pumpAndSettle();

      await completeSkippingMemo(tester);
      await tester.tap(find.text('좋아요'));
      await tester.pumpAndSettle();

      // 완료 연출을 닫으면 아무 성장 연출도 이어지지 않는다.
      expect(find.byType(LevelUpDialog), findsNothing);
      expect(find.byType(EvolveDialog), findsNothing);
    });

    testWidgets('재완료(이미 지급)는 어떤 연출도 띄우지 않는다', (tester) async {
      await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: [
          Quest(
            id: 'q1',
            title: '예전에 완료',
            difficulty: Difficulty.easy,
            status: QuestStatus.todo,
            rewardedAt: DateTime(2026, 1, 1),
          ),
        ],
        user: const AppUser(uid: 'test-uid', level: 9, xp: 0),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byTooltip('완료'));
      await tester.pumpAndSettle();

      expect(find.byType(QuestCompleteDialog), findsNothing);
      expect(find.byType(LevelUpDialog), findsNothing);
      expect(find.byType(EvolveDialog), findsNothing);
      expect(find.text('이미 완료한 퀘스트예요'), findsOneWidget);
    });
  });

  group('큰 목표 단위 그룹뷰 (A0)', () {
    const goals = [
      Goal(id: 'g1', text: '공모전 지원하기'),
      Goal(id: 'g2', text: '토익 900점'),
    ];
    const grouped = [
      Quest(id: 'q1', title: '공고 3개 찾기', goalId: 'g1', order: 0),
      Quest(id: 'q2', title: '지원서 초안 쓰기', goalId: 'g1', order: 1),
      Quest(id: 'q3', title: '단어장 사기', goalId: 'g2', order: 2),
      Quest(id: 'q4', title: '직접 만든 퀘스트', order: 3),
    ];

    testWidgets('퀘스트가 목표 라벨 폴더로 묶여 보인다', (tester) async {
      useTallViewport(tester);
      await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: grouped,
        goals: goals,
      );
      await tester.pumpAndSettle();

      // 목표별 폴더가 생기고, 기본은 펼침이라 카드가 그 아래 붙는다.
      expect(find.byType(GoalGroupSection), findsWidgets);
      expect(find.text('공모전 지원하기'), findsOneWidget);
      expect(find.text('공고 3개 찾기'), findsOneWidget);
      expect(find.text('지원서 초안 쓰기'), findsOneWidget);
      expect(find.text('토익 900점'), findsOneWidget);

      // 직접 등록 폴더는 항상 맨 아래라 스크롤해야 보인다.
      await tester.scrollUntilVisible(
        find.text(kDirectQuestGroupLabel),
        200,
        scrollable: find.byType(Scrollable).last,
      );
      await tester.pumpAndSettle();
      expect(find.text(kDirectQuestGroupLabel), findsOneWidget);
      expect(find.text('직접 만든 퀘스트'), findsOneWidget);
    });

    testWidgets('헤더에 진행률이 표시된다', (tester) async {
      await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(
            id: 'q1',
            title: '완료한 퀘스트',
            goalId: 'g1',
            status: QuestStatus.done,
          ),
          Quest(id: 'q2', title: '남은 퀘스트', goalId: 'g1', order: 1),
          Quest(id: 'q3', title: '남은 퀘스트2', goalId: 'g1', order: 2),
        ],
        goals: goals,
      );
      await tester.pumpAndSettle();

      expect(find.text('1/3'), findsOneWidget);
    });

    testWidgets('헤더를 누르면 접히고 다시 누르면 펼쳐진다', (tester) async {
      await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(id: 'q1', title: '공고 3개 찾기', goalId: 'g1'),
        ],
        goals: goals,
      );
      await tester.pumpAndSettle();

      expect(find.byType(QuestCard), findsOneWidget);

      await tester.tap(find.text('공모전 지원하기'));
      await tester.pumpAndSettle();

      // 접히면 카드가 사라지지만 헤더는 남는다(퀘스트가 지워진 게 아니다).
      expect(find.byType(QuestCard), findsNothing);
      expect(find.text('공모전 지원하기'), findsOneWidget);

      await tester.tap(find.text('공모전 지원하기'));
      await tester.pumpAndSettle();

      expect(find.byType(QuestCard), findsOneWidget);
      expect(find.text('공고 3개 찾기'), findsOneWidget);
    });

    testWidgets('전부 완료된 그룹은 기본으로 접혀 있다', (tester) async {
      await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(
            id: 'q1',
            title: '끝난 퀘스트',
            goalId: 'g1',
            status: QuestStatus.done,
          ),
          Quest(id: 'q2', title: '진행 중 퀘스트', goalId: 'g2', order: 1),
        ],
        goals: goals,
      );
      await tester.pumpAndSettle();

      // 끝난 목표는 접히고, 진행 중인 목표는 펼쳐진다.
      expect(find.text('끝난 퀘스트'), findsNothing);
      expect(find.text('진행 중 퀘스트'), findsOneWidget);

      // 접혔어도 폴더 자체는 보인다 — 다시 펼칠 수 있다.
      await tester.tap(find.text('공모전 지원하기'));
      await tester.pumpAndSettle();
      expect(find.text('끝난 퀘스트'), findsOneWidget);
    });

    testWidgets('★ 목표 저장소가 실패해도 퀘스트는 폴백 라벨로 그대로 보인다', (tester) async {
      // 목표는 라벨용 부가 정보다. 그것 때문에 퀘스트 목록이 오류 화면이 되면
      // 사용자는 퀘스트를 잃은 걸로 본다.
      final failingGoals = InMemoryGoalRepository(
        failWith: const NetworkFailure(),
      );
      addTearDown(failingGoals.dispose);

      await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(id: 'q1', title: '공고 3개 찾기', goalId: 'g1'),
        ],
        extraOverrides: [
          goalRepositoryProvider.overrideWithValue(failingGoals),
        ],
      );
      await tester.pumpAndSettle();

      expect(find.byType(ErrorView), findsNothing);
      expect(find.byType(QuestCard), findsOneWidget);
      expect(find.text('공고 3개 찾기'), findsOneWidget);
      // 라벨만 폴백으로 떨어진다. 2개인 이유: 폴더 헤더의 종류 라벨(Figma `24:162`의
      // 목표명 위에 붙는 '목표')이 [kUnknownGoalLabel]과 문자열이 같아서, 폴백일 때만
      // 같은 글자가 위아래로 겹쳐 보인다. 정상 목표일 때는 목표명이 따로 뜬다.
      expect(find.text(kUnknownGoalLabel), findsNWidgets(2));
    });

    testWidgets('★ AI 진입점은 목록 맨 위 프로모 카드다 (2대 핵심 기능의 입구)', (tester) async {
      await pumpScreen(tester, const QuestListScreen());
      await tester.pumpAndSettle();

      // 카드가 "무엇을 해 주는지"를 먼저 말하고, 그 아래 버튼이 문을 연다.
      expect(find.byType(AiPromoCard), findsOneWidget);
      expect(
        find.text('큰 목표를 입력하면 오늘 시작할 수 있는 작은 퀘스트로 나눠드려요.'),
        findsOneWidget,
      );

      // 진입 버튼은 그라디언트 채움이다 — 아웃라인(보조 위계)이면 안 된다.
      final button = tester.widget<GradientButton>(
        find.descendant(
          of: find.byType(AiPromoCard),
          matching: find.byType(GradientButton),
        ),
      );
      expect(button.label, '분해하기');
      expect(button.onPressed, isNotNull);
      // ★ 색 역할: AI 진입점은 🔵 블루다. 그린(주요 행동)으로 바꾸면 수동 등록
      //   FAB와 역할이 겹쳐 "AI에게 맡기기 / 직접 쓰기"가 색으로 안 갈린다.
      expect(button.style, same(GradientButtonStyle.ai));
      expect(
        find.ancestor(
          of: find.text('분해하기'),
          matching: find.byWidgetPredicate((w) => w is OutlinedButton),
        ),
        findsNothing,
      );
    });

    testWidgets('목록 카드에도 출처 칩(AI / 직접)이 보인다', (tester) async {
      // 폴더로 나뉜 목록에서도 카드 자체가 출처를 말해야 한다 —
      // 홈 미리보기에는 폴더가 없어 카드만으로 구분돼야 하고, 그 카드는
      // 두 화면이 공유하는 같은 위젯이다.
      await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(id: 'q1', title: '공고 3개 찾기', goalId: 'g1'),
          Quest(id: 'q2', title: '직접 만든 퀘스트', order: 1),
        ],
        goals: goals,
      );
      await tester.pumpAndSettle();

      expect(find.byType(QuestSourceChip), findsNWidgets(2));
      // 상단 프로모의 'AI 도전 분해' 라벨과 겹치지 않는다 — find.text는 완전 일치다.
      expect(find.text('AI'), findsOneWidget);
      expect(find.text('직접'), findsOneWidget);
    });
  });

  group('퀘스트 수정·삭제 — 더보기 메뉴 (B-5b)', () {
    /// 카드 `⋮` 메뉴를 열고 특정 항목을 누른다.
    Future<void> openMenu(WidgetTester tester, String questTitle) async {
      await tester.tap(find.byTooltip('$questTitle 더보기'));
      await tester.pumpAndSettle();
    }

    testWidgets('미완료 카드 메뉴에 수정·삭제가 보인다', (tester) async {
      await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [Quest(id: 'q1', title: '수정할 퀘스트')],
      );
      await tester.pumpAndSettle();

      await openMenu(tester, '수정할 퀘스트');

      expect(find.text('제목·난이도 수정'), findsOneWidget);
      expect(find.text('삭제'), findsOneWidget);
    });

    testWidgets('★ 완료 카드에는 더보기 메뉴가 없다 (수정·삭제 진입 불가 — 회귀 방어)', (
      tester,
    ) async {
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
      // 완료 그룹은 기본 접힘이라 카드를 펼쳐 렌더시킨 뒤 확인한다.
      await expandGroup(tester);

      // 완료 카드엔 ⋮ 자체가 없다 → 수정·삭제로 갈 문이 없다.
      // (재완료로 난이도를 올려 추가 보상을 노리는 유효화 차단.)
      expect(find.byTooltip('완료된 퀘스트 더보기'), findsNothing);
    });

    testWidgets('★ 제목·난이도를 바꿔 저장하면 updateQuest로 반영된다', (tester) async {
      final repo = await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(id: 'q1', title: '원래 제목', difficulty: Difficulty.easy),
        ],
      );
      await tester.pumpAndSettle();

      await openMenu(tester, '원래 제목');
      await tester.tap(find.text('제목·난이도 수정'));
      await tester.pumpAndSettle();

      expect(find.byType(QuestEditDialog), findsOneWidget);

      await tester.enterText(find.byType(TextFormField), '바뀐 제목');
      await tester.tap(find.text('어려움'));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(FilledButton, '저장'));
      await tester.pumpAndSettle();

      // 저장소에 반영된다(앱 재실행 동치).
      final saved = (await repo.fetchQuests('test-uid')).single;
      expect(saved.title, '바뀐 제목');
      expect(saved.difficulty, Difficulty.hard);
      // 화면에도 반영.
      expect(find.text('바뀐 제목'), findsOneWidget);
    });

    testWidgets('난이도를 바꾸면 예상 보상 미리보기가 갱신된다', (tester) async {
      await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(id: 'q1', title: '미리보기 퀘스트', difficulty: Difficulty.easy),
        ],
      );
      await tester.pumpAndSettle();

      await openMenu(tester, '미리보기 퀘스트');
      await tester.tap(find.text('제목·난이도 수정'));
      await tester.pumpAndSettle();

      // 쉬움 = 코인3 / XP5 (다이얼로그 미리보기 + 카드 둘 다 보인다).
      expect(find.text('+3'), findsWidgets);
      expect(find.text('XP +5'), findsWidgets);

      // 어려움으로 바꾸면 다이얼로그 미리보기가 10/20으로 갱신된다.
      await tester.tap(find.text('어려움'));
      await tester.pumpAndSettle();
      expect(find.text('+10'), findsWidgets);
      expect(find.text('XP +20'), findsWidgets);
    });

    testWidgets('제목을 비우면 저장 버튼이 비활성이고 저장소는 그대로다', (tester) async {
      final repo = await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [Quest(id: 'q1', title: '지울 제목')],
      );
      await tester.pumpAndSettle();

      await openMenu(tester, '지울 제목');
      await tester.tap(find.text('제목·난이도 수정'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField), '   ');
      await tester.pumpAndSettle();

      final saveButton = tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, '저장'),
      );
      expect(saveButton.onPressed, isNull);

      // 강제로 취소하고 저장소가 그대로인지 확인.
      await tester.tap(find.widgetWithText(TextButton, '취소'));
      await tester.pumpAndSettle();
      expect((await repo.fetchQuests('test-uid')).single.title, '지울 제목');
    });

    testWidgets('자식 없는 퀘스트 삭제는 일반 확인 후 단건만 지운다', (tester) async {
      final repo = await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(id: 'q1', title: '혼자 퀘스트', order: 0),
          Quest(id: 'q2', title: '남을 퀘스트', order: 1),
        ],
      );
      await tester.pumpAndSettle();

      await openMenu(tester, '혼자 퀘스트');
      await tester.tap(find.text('삭제'));
      await tester.pumpAndSettle();

      // 자식이 없으면 하위 삭제 경고 문구가 없다.
      expect(find.textContaining('하위 퀘스트'), findsNothing);

      await tester.tap(find.widgetWithText(FilledButton, '삭제'));
      await tester.pumpAndSettle();

      expect((await repo.fetchQuests('test-uid')).map((q) => q.id), ['q2']);
    });

    testWidgets('★ 자식 있는 부모 삭제 시 경고에 자식 수가 뜨고, 확인하면 계보가 모두 사라진다', (
      tester,
    ) async {
      final repo = await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(
            id: 'p',
            title: '재분해 원본',
            goalId: 'g1',
            status: QuestStatus.stuck,
            order: 0,
          ),
          Quest(
            id: 'c1',
            title: '자식1',
            goalId: 'g1',
            parentQuestId: 'p',
            order: 1,
          ),
          Quest(
            id: 'c2',
            title: '자식2',
            goalId: 'g1',
            parentQuestId: 'p',
            order: 2,
          ),
        ],
        goals: const [Goal(id: 'g1', text: '공모전 지원하기')],
      );
      await tester.pumpAndSettle();

      await openMenu(tester, '재분해 원본');
      await tester.tap(find.text('삭제'));
      await tester.pumpAndSettle();

      // 경고가 하위 2개도 함께 삭제된다고 밝힌다.
      expect(find.textContaining('하위 퀘스트 2개'), findsOneWidget);

      await tester.tap(find.widgetWithText(FilledButton, '삭제'));
      await tester.pumpAndSettle();

      // 부모·자식 모두 사라진다.
      expect(await repo.fetchQuests('test-uid'), isEmpty);
    });

    testWidgets('★ 삭제를 취소하면 아무것도 지워지지 않는다', (tester) async {
      final repo = await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(
            id: 'p',
            title: '원본',
            goalId: 'g1',
            status: QuestStatus.stuck,
            order: 0,
          ),
          Quest(
            id: 'c1',
            title: '자식',
            goalId: 'g1',
            parentQuestId: 'p',
            order: 1,
          ),
        ],
        goals: const [Goal(id: 'g1', text: '목표')],
      );
      await tester.pumpAndSettle();

      await openMenu(tester, '원본');
      await tester.tap(find.text('삭제'));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(TextButton, '취소'));
      await tester.pumpAndSettle();

      // 부모·자식 모두 그대로다.
      final remaining = await repo.fetchQuests('test-uid');
      expect(remaining.map((q) => q.id).toSet(), {'p', 'c1'});
    });
  });

  group('완료 = 보관함으로 이동 (2단계)', () {
    // 레벨/진화 연출이 끼어들지 않도록 독수리(Lv30, 40 XP/레벨) 사용자로 둔다 —
    // 쉬움·보통 몇 개론 레벨이 오르지 않아 완료 연출만 검증에 남는다.
    const eagle = AppUser(uid: 'test-uid', level: 30, xp: 0);

    testWidgets('★ 목표의 마지막 퀘스트를 완료하면 폴더째 이동하고 완수 연출이 뜬다', (tester) async {
      useTallViewport(tester);
      final repo = await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(id: 'q1', title: '공고 찾기', goalId: 'g1', order: 0),
          Quest(id: 'q2', title: '지원서 쓰기', goalId: 'g1', order: 1),
        ],
        goals: const [Goal(id: 'g1', text: '공모전 지원하기')],
        user: eagle,
      );
      await tester.pumpAndSettle();

      // 첫 퀘스트 완료 → 폴더는 아직 남는다(목표 미완).
      await completeByTitle(tester, '공고 찾기');
      await tester.tap(find.text('좋아요')); // 완료 연출 닫기
      await tester.pumpAndSettle();

      expect(find.byType(GoalCompleteDialog), findsNothing);
      expect(find.byType(GoalGroupSection), findsOneWidget);
      expect(find.text('1/2'), findsOneWidget);
      // q1은 done이지만 아직 이동하지 않는다(폴더는 통째로만 이동).
      final afterFirst = await repo.fetchQuests('test-uid');
      expect(afterFirst.firstWhere((q) => q.id == 'q1').archived, isFalse);

      // 마지막 퀘스트 완료 → 목표 전부 완료 → 폴더째 이동 + 완수 연출.
      await completeByTitle(tester, '지원서 쓰기');
      await tester.tap(find.text('좋아요')); // 완료 연출 닫기
      await tester.pumpAndSettle();

      expect(find.byType(GoalCompleteDialog), findsOneWidget);
      // 연출에 완수한 목표명이 비친다.
      expect(find.text('공모전 지원하기'), findsWidgets);

      await tester.tap(find.text('좋아요')); // 완수 연출 닫기
      await tester.pumpAndSettle();

      // 오늘의 퀘스트에서 폴더가 통째로 사라진다.
      expect(find.byType(GoalGroupSection), findsNothing);
      expect(find.byType(EmptyView), findsOneWidget);

      // 저장소: 두 퀘스트 모두 done + archived.
      final all = await repo.fetchQuests('test-uid');
      expect(all, hasLength(2));
      expect(all.every((q) => q.done && q.archived), isTrue);
    });

    testWidgets('★ 목표의 일부만 완료하면 이동하지 않고 폴더에 남는다 (뮤테이션 방어)', (tester) async {
      // "목표 전부 완료" 판정을 "일부 완료"로 느슨히 하면 이 테스트가 깨진다 —
      // 한 개만 끝냈는데 폴더가 사라지고 완수 연출이 뜰 것이다.
      final repo = await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(id: 'q1', title: '공고 찾기', goalId: 'g1', order: 0),
          Quest(id: 'q2', title: '지원서 쓰기', goalId: 'g1', order: 1),
        ],
        goals: const [Goal(id: 'g1', text: '공모전 지원하기')],
        user: eagle,
      );
      await tester.pumpAndSettle();

      await completeByTitle(tester, '공고 찾기');
      await tester.tap(find.text('좋아요'));
      await tester.pumpAndSettle();

      // 완수 연출은 없고, 폴더는 그대로 남는다.
      expect(find.byType(GoalCompleteDialog), findsNothing);
      expect(find.byType(GoalGroupSection), findsOneWidget);

      // 아무 퀘스트도 이동하지 않았다(목표는 통째로만 이동).
      final all = await repo.fetchQuests('test-uid');
      expect(all.any((q) => q.archived), isFalse);
    });

    testWidgets('★ 직접 등록은 완료 즉시 낱개로 이동하고 나머지는 남는다', (tester) async {
      final repo = await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(id: 'q1', title: '완료할 직접', order: 0),
          Quest(id: 'q2', title: '남을 직접', order: 1),
        ],
        user: eagle,
      );
      await tester.pumpAndSettle();

      await completeByTitle(tester, '완료할 직접');
      await tester.tap(find.text('좋아요'));
      await tester.pumpAndSettle();

      // 완수 연출은 없다(직접 등록 낱개 이동엔 연출이 없다).
      expect(find.byType(GoalCompleteDialog), findsNothing);
      // q1만 이동, q2는 오늘 목록에 남는다.
      expect(find.text('완료할 직접'), findsNothing);
      expect(find.text('남을 직접'), findsOneWidget);

      final all = await repo.fetchQuests('test-uid');
      expect(all.firstWhere((q) => q.id == 'q1').archived, isTrue);
      expect(all.firstWhere((q) => q.id == 'q2').archived, isFalse);
    });

    testWidgets('★ 재분해 목표: 자식을 다 끝내면 원본이 보상 없이 자동완료되고 폴더째 이동한다', (
      tester,
    ) async {
      // 카드 3장(원본+자식2)이 한 화면에 다 들어가도록 세로 여유를 준다 —
      // 기본 800x600에선 하단 카드의 완료 버튼이 FAB에 가려 탭이 빗나간다.
      useTallViewport(tester);

      // 뮤테이션 방어의 핵심: 자동완료가 completeQuest(지급)를 타면 원본(p, normal)에
      // 코인 5·성취 1건이 더 붙어 아래 잔액/기록 단언이 깨진다. setStatus여야만 통과한다.
      final repo = await pumpScreen(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(id: 'p', title: '재분해 원본', goalId: 'g1',
              status: QuestStatus.stuck, order: 0),
          Quest(id: 'c1', title: '자식1', goalId: 'g1',
              parentQuestId: 'p', difficulty: Difficulty.easy, order: 1),
          Quest(id: 'c2', title: '자식2', goalId: 'g1',
              parentQuestId: 'p', difficulty: Difficulty.easy, order: 2),
        ],
        goals: const [Goal(id: 'g1', text: '공모전 지원하기')],
        user: eagle,
      );
      await tester.pumpAndSettle();

      await completeByTitle(tester, '자식1');
      await tester.tap(find.text('좋아요'));
      await tester.pumpAndSettle();

      // 아직 원본이 안 끝났으니 이동/자동완료 없음.
      expect(find.byType(GoalCompleteDialog), findsNothing);
      final mid = await repo.fetchQuests('test-uid');
      expect(mid.firstWhere((q) => q.id == 'p').done, isFalse);

      await completeByTitle(tester, '자식2');
      await tester.tap(find.text('좋아요'));
      await tester.pumpAndSettle();

      // 원본이 자동완료되며 목표 전체가 이동 → 완수 연출.
      expect(find.byType(GoalCompleteDialog), findsOneWidget);
      await tester.tap(find.text('좋아요'));
      await tester.pumpAndSettle();

      final all = await repo.fetchQuests('test-uid');
      final p = all.firstWhere((q) => q.id == 'p');
      // 원본은 done + archived.
      expect(p.done, isTrue);
      expect(p.archived, isTrue);
      // ★ 자동완료는 **보상 없이** setStatus로만 처리된다.
      expect(p.rewardedAt, isNull);
      // 세 퀘스트 모두 보관.
      expect(all.every((q) => q.archived), isTrue);

      // 잔액: 자식 2개(쉬움 코인3)만 = 6. 원본이 지급을 탔다면 11이 된다.
      final user = await repo.users!.fetchUser('test-uid');
      expect(user.coin, 6);
      // 성취 기록도 자식 2건뿐(원본 자동완료는 기록을 남기지 않는다).
      expect(repo.achievementsOf('test-uid'), hasLength(2));
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
