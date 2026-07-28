import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/core/theme/app_theme.dart';
import 'package:one_step/core/widgets/quest_card.dart';
import 'package:one_step/core/widgets/state_views.dart';
import 'package:one_step/features/home/widgets/level_up_dialog.dart';
import 'package:one_step/features/quest/quest_list_screen.dart';
import 'package:one_step/features/quest/quest_split_screen.dart';
import 'package:one_step/features/quest/widgets/goal_group_section.dart';
import 'package:one_step/features/quest/widgets/quest_complete_dialog.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/providers/providers.dart';
import 'package:one_step/repositories/decompose/fake_quest_decomposer.dart';
import 'package:one_step/repositories/memory/fake_auth_repository.dart';
import 'package:one_step/repositories/memory/in_memory_goal_repository.dart';
import 'package:one_step/repositories/memory/in_memory_quest_repository.dart';
import 'package:one_step/repositories/memory/in_memory_user_repository.dart';
import 'package:one_step/repositories/quest_repository.dart';
import 'package:one_step/router.dart';

/// E-1 · 전체 사용자 흐름 통합 테스트.
///
/// 지금까지의 702건은 전부 **조각별**(위젯·저장소·순수함수)이다. 이 파일은
/// **실제 라우터(5탭 StatefulShellRoute) 위에서** 탭 이동·버튼 클릭으로 진짜
/// 사용자처럼 여러 계층을 끝에서 끝까지 관통한다. 새 lib 코드는 없고,
/// 이미 만든 것들이 실제로 이어지는지 증명하는 게 목적이다.
///
/// "화면이 안 죽는다"만 보지 않는다 — 각 단계마다 **상태 전이**(등록 후 목록 반영,
/// 완료 후 잔액·레벨 증가 등)를 저장소·화면 양쪽에서 못 박는다.
void main() {
  const uid = 'test-uid';

  /// InMemory 저장소 3종을 하나로 묶은 하네스.
  /// 완료→보상→레벨 관통을 저장소로 직접 확인할 수 있게 참조를 들고 있는다.
  /// [reuse]로 넘기면 앱 재실행(재-pump) 시 **같은 인스턴스**를 유지해 복원을 증명한다.
  Future<
      ({
        InMemoryQuestRepository questRepo,
        InMemoryUserRepository userRepo,
        InMemoryGoalRepository goalRepo,
      })> pumpApp(
    WidgetTester tester, {
    FakeDecomposeScenario scenario = FakeDecomposeScenario.success,
    ({
      InMemoryQuestRepository questRepo,
      InMemoryUserRepository userRepo,
      InMemoryGoalRepository goalRepo,
    })? reuse,
    InMemoryQuestRepository? questRepoOverride,
    InMemoryUserRepository? userRepoOverride,
  }) async {
    // 실제 라우터 위 흐름은 FAB·모달 시트·스낵바가 한 화면에 겹친다. 기본
    // 800x600에선 메모 시트의 「건너뛰기」가 하단 요소에 가려 탭이 빗나간다
    // (quest_list_screen_test의 1200x2600 확대와 같은 처방). 세로 여유를 준다.
    tester.view.physicalSize = const Size(1200, 2600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final userRepo = userRepoOverride ??
        reuse?.userRepo ??
        InMemoryUserRepository(seed: AppUser.initial(uid));
    final goalRepo = reuse?.goalRepo ?? InMemoryGoalRepository();
    final questRepo = questRepoOverride ??
        reuse?.questRepo ??
        InMemoryQuestRepository(users: userRepo);

    // pumpApp이 **직접 만든** 인스턴스만 정리한다. reuse는 최초 생성 때 등록됐고,
    // override는 테스트가 직접 addTearDown 한다 — 이중 dispose를 피한다.
    if (questRepoOverride == null && reuse == null) {
      addTearDown(questRepo.dispose);
    }
    if (userRepoOverride == null && reuse == null) {
      addTearDown(userRepo.dispose);
    }
    if (reuse == null) {
      addTearDown(goalRepo.dispose);
    }

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(
            FakeAuthRepository(initialUid: uid),
          ),
          userRepositoryProvider.overrideWithValue(userRepo),
          questRepositoryProvider.overrideWithValue(questRepo),
          goalRepositoryProvider.overrideWithValue(goalRepo),
          // root_shell엔 없는 주입. 이게 없으면 AI 분해 화면이 기본 throw 분해기로
          // 죽는다 — 통합 흐름의 첫 관통 지점이라 반드시 넣는다.
          questDecomposerProvider.overrideWithValue(
            FakeQuestDecomposer(scenario: scenario),
          ),
        ],
        // 테스트마다 새 라우터. 전역 인스턴스를 재사용하면 앞 테스트의 탭/스택이 샌다.
        child: MaterialApp.router(
          theme: AppTheme.light,
          routerConfig: createRouter(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    return (questRepo: questRepo, userRepo: userRepo, goalRepo: goalRepo);
  }

  /// 하단 탭바의 탭을 누른다.
  Future<void> tapTab(WidgetTester tester, String label) async {
    await tester.tap(find.descendant(
      of: find.byType(NavigationBar),
      matching: find.text(label),
    ));
    await tester.pumpAndSettle();
  }

  /// 제목으로 카드를 특정해 완료 버튼을 누르고 **메모 시트는 건너뛴다**.
  /// (완료 경로는 항상 메모 시트를 거친다 — quest_list_screen_test의 패턴.)
  /// 완료 연출은 닫지 않는다(연출 검증은 호출부의 몫).
  Future<void> completeByTitle(WidgetTester tester, String title) async {
    // 등록 직후 뜨는 "퀘스트를 등록했어요." 스낵바가 하단에 남아 있으면 뒤이어 여는
    // 메모 시트의 「건너뛰기」를 가려 탭이 빗나간다. 자동 해제(기본 4초)를 기다린다.
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();

    final card = find.ancestor(
      of: find.text(title),
      matching: find.byType(QuestCard),
    );
    // FAB나 하단 바에 가리지 않게 먼저 뷰포트로 올린다.
    await tester.ensureVisible(card);
    await tester.pumpAndSettle();
    await tester.tap(find.descendant(of: card, matching: find.byTooltip('완료')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('건너뛰기'));
    await tester.pumpAndSettle();
  }

  /// 목표 입력 → 분해 → (편집) → 결과를 만든 상태로 만든다.
  /// 분해 화면까지 진입해 분해하기까지 눌러 결과 카드를 띄운다.
  Future<void> enterSplitAndDecompose(WidgetTester tester, String goal) async {
    await tapTab(tester, '퀘스트');
    expect(find.byType(QuestListScreen), findsOneWidget);

    // 진입 버튼은 FilledButton.icon(하위 타입)이라 byType으로 안 잡힌다 — 라벨을 탭한다.
    await tester.tap(find.text('AI로 목표 나누기'));
    await tester.pumpAndSettle();
    expect(find.byType(QuestSplitScreen), findsOneWidget);

    await tester.enterText(find.byType(TextField), goal);
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, '분해하기'));
    await tester.pumpAndSettle();
  }

  testWidgets(
      '① 전체 흐름: 목표 입력 → AI 분해 → 수정 → 등록 → 완료 → 보상 → 레벨업 (한 테스트 관통)',
      (tester) async {
    final h = await pumpApp(tester);

    // 홈이 기본 탭이다.
    expect(find.text('오늘도 한 걸음.'), findsOneWidget);

    // 퀘스트 탭은 처음엔 비어 있다.
    await tapTab(tester, '퀘스트');
    expect(find.byType(EmptyView), findsOneWidget);

    // AI 분해 진입 → 목표 입력 → 분해(success).
    // 진입 버튼은 FilledButton.icon(하위 타입)이라 byType으로 안 잡힌다 — 라벨을 탭한다.
    await tester.tap(find.text('AI로 목표 나누기'));
    await tester.pumpAndSettle();
    expect(find.byType(QuestSplitScreen), findsOneWidget);

    await tester.enterText(find.byType(TextField), '공모전 지원하기');
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, '분해하기'));
    await tester.pumpAndSettle();

    // AI 성공 결과(공모전 템플릿 5개)가 뜬다.
    expect(find.textContaining('이렇게 나눠봤어요'), findsOneWidget);
    expect(find.text('공고 페이지 열어 지원 자격 확인하기'), findsOneWidget);

    // ── 수정(1회): 첫 항목(easy) 제목을 편집한다. 난이도는 그대로라 보상 등급이
    //    유지돼 뒤의 레벨업 경계 계산이 결정적이다.
    await tester.ensureVisible(find.text('공고 페이지 열어 지원 자격 확인하기'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('공고 페이지 열어 지원 자격 확인하기'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, '공고 확인하고 자격 체크');
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, '저장'));
    await tester.pumpAndSettle();

    // 편집이 화면에 반영된다(상태 전이 단언).
    expect(find.text('공고 확인하고 자격 체크'), findsOneWidget);
    expect(find.text('공고 페이지 열어 지원 자격 확인하기'), findsNothing);

    // ── 등록.
    await tester.tap(find.widgetWithText(FilledButton, '등록하기'));
    await tester.pumpAndSettle();

    // 분해 화면이 닫히고 목록으로 복귀한다.
    expect(find.byType(QuestSplitScreen), findsNothing);
    expect(find.byType(QuestListScreen), findsOneWidget);

    // 저장소 반영: 5개가 같은 goalId로 저장되고, 편집한 제목이 살아 있다.
    final saved = await h.questRepo.fetchQuests(uid);
    expect(saved, hasLength(5));
    expect(saved.every((q) => q.goalId != null), isTrue);
    final goalId = saved.first.goalId!;
    expect(saved.every((q) => q.goalId == goalId), isTrue);
    expect(saved.any((q) => q.title == '공고 확인하고 자격 체크'), isTrue);
    // 원본 목표 텍스트도 goal 저장소에 보존된다.
    expect((await h.goalRepo.fetchGoal(uid, goalId)).text, '공모전 지원하기');

    // 오늘의 퀘스트에 목표 폴더로 나타난다.
    expect(find.byType(GoalGroupSection), findsWidgets);
    expect(find.text('공모전 지원하기'), findsWidgets); // 폴더 라벨
    expect(find.text('공고 확인하고 자격 체크'), findsOneWidget);

    // 완료 전 잔액은 0, 레벨 1이다(뒤 증가의 기준선).
    final before = await h.userRepo.fetchUser(uid);
    expect(before.coin, 0);
    expect(before.level, 1);
    expect(before.xp, 0);

    // ── 완료(메모 건너뛰기): 편집한 첫 항목(easy).
    await completeByTitle(tester, '공고 확인하고 자격 체크');

    // 보상 다이얼로그에 easy 보상(코인3 / XP5)이 그대로 뜬다.
    expect(find.byType(QuestCompleteDialog), findsOneWidget);
    expect(find.text('+3'), findsWidgets);
    expect(find.text('XP +5'), findsWidgets);

    // 완료 연출을 닫으면 레벨업 연출이 이어진다(Lv1 → Lv2, 알 5XP/레벨 경계 관통).
    await tester.tap(find.text('좋아요'));
    await tester.pumpAndSettle();
    expect(find.byType(LevelUpDialog), findsOneWidget);
    expect(find.text('Lv.1'), findsOneWidget);
    expect(find.text('Lv.2'), findsOneWidget);
    await tester.tap(find.text('좋아요'));
    await tester.pumpAndSettle();

    // 완료 후 코인·XP·레벨이 저장소에 실제로 반영된다(핵심 관통 지점).
    final after = await h.userRepo.fetchUser(uid);
    expect(after.coin, 3);
    expect(after.level, 2);
    expect(after.xp, 0);

    // 퀘스트도 done으로 바뀐다(폴더는 미완이라 아직 보관 이동 전).
    final done = (await h.questRepo.fetchQuests(uid))
        .firstWhere((q) => q.title == '공고 확인하고 자격 체크');
    expect(done.done, isTrue);
    expect(done.rewardedAt, isNotNull);

    // 홈 탭에서도 성장이 보인다(다른 계층에서의 반영 확인).
    // 리디자인으로 이름(진화 단계)과 레벨 pill이 두 위젯으로 갈렸다.
    await tapTab(tester, '홈');
    expect(find.text('알'), findsOneWidget);
    expect(find.text('Lv.2'), findsOneWidget);
  });

  testWidgets('② 중간 실패 폴백: AI 분해 실패 → 템플릿 폴백으로 결과가 뜨고 등록까지 이어진다',
      (tester) async {
    // timeout = NetworkFailure. Notifier가 템플릿으로 폴백한다.
    final h = await pumpApp(tester, scenario: FakeDecomposeScenario.timeout);

    await enterSplitAndDecompose(tester, '자격증 공부하기');

    // 폴백 배너 + 대체 결과임을 밝히는 제목. 흐름은 끊기지 않는다.
    expect(
      find.text('AI 연결이 잠시 원활하지 않아 대표 템플릿으로 준비했어요. 아래에서 다시 AI로 나눠볼 수 있어요.'),
      findsOneWidget,
    );
    expect(find.textContaining('추천 퀘스트로 준비했어요'), findsOneWidget);
    // 폴백이어도 퀘스트는 나온다(등록 바가 뜬다).
    expect(find.widgetWithText(FilledButton, '등록하기'), findsOneWidget);

    // 폴백 결과도 그대로 등록으로 이어진다.
    await tester.tap(find.widgetWithText(FilledButton, '등록하기'));
    await tester.pumpAndSettle();

    expect(find.byType(QuestSplitScreen), findsNothing);
    expect(find.byType(QuestListScreen), findsOneWidget);

    // 폴백 퀘스트가 실제로 저장됐다(목표 폴더로 묶여서).
    final saved = await h.questRepo.fetchQuests(uid);
    expect(saved, isNotEmpty);
    expect(saved.every((q) => q.goalId != null), isTrue);
    expect(find.byType(GoalGroupSection), findsWidgets);
  });

  testWidgets('②-b 완료 시 네트워크 오류 → 스낵바 + 상태·잔액 롤백(흐름은 끊기지 않음)',
      (tester) async {
    // 목록 조회·등록은 정상, completeQuest만 실패하는 저장소를 라우터에 태운다.
    // (등록 흐름을 온전히 밟은 뒤 완료 실패의 롤백을 관통 확인한다.)
    // userRepo를 questRepo·provider가 **같은 인스턴스**로 공유하도록 둘 다 override 한다.
    final userRepo = InMemoryUserRepository(seed: AppUser.initial(uid));
    final failing = _FailingCompleteQuestRepository(users: userRepo);
    addTearDown(userRepo.dispose);
    addTearDown(failing.dispose);

    await pumpApp(
      tester,
      questRepoOverride: failing,
      userRepoOverride: userRepo,
    );

    // AI 분해 → 등록(정상 경로).
    await enterSplitAndDecompose(tester, '공모전 지원하기');
    await tester.tap(find.widgetWithText(FilledButton, '등록하기'));
    await tester.pumpAndSettle();
    expect(find.byType(QuestListScreen), findsOneWidget);

    // 완료 시도 → completeQuest가 NetworkFailure를 던진다.
    await completeByTitle(tester, '공고 페이지 열어 지원 자격 확인하기');

    // 오류는 스낵바로 알리고, 축하 연출은 뜨지 않는다.
    expect(find.text('인터넷 연결을 확인해 주세요.'), findsOneWidget);
    expect(find.byType(QuestCompleteDialog), findsNothing);

    // 트랜잭션 미커밋 → 상태·잔액 모두 그대로(롤백).
    final q = (await failing.fetchQuests(uid))
        .firstWhere((q) => q.title == '공고 페이지 열어 지원 자격 확인하기');
    expect(q.done, isFalse);
    expect(q.rewardedAt, isNull);
    final user = await userRepo.fetchUser(uid);
    expect(user.coin, 0);
    expect(user.level, 1);

    // 진행 표시가 풀려 다시 시도할 수 있다.
    expect(find.byTooltip('완료'), findsWidgets);
  });

  testWidgets('③ 재실행 후 복원: 같은 저장소 인스턴스를 유지한 채 위젯 트리만 다시 pump해도 등록 퀘스트가 남는다',
      (tester) async {
    // ⚠️ 한계: 위젯 테스트는 프로세스를 실제로 재시작할 수 없다. 여기서 검증하는 것은
    //    "저장소는 살리고 위젯 트리(ProviderScope·라우터)만 새로 pump"했을 때 목록이
    //    복원되는 **구조적 보장**이다. Firestore라면 앱 재시작 시 스트림 재구독으로
    //    같은 일이 일어난다 — InMemory로 그 구조를 증명한다(리터럴 재시작이 아니다).
    final h = await pumpApp(tester);

    // AI 분해 → 등록으로 퀘스트를 5개 심는다.
    await enterSplitAndDecompose(tester, '공모전 지원하기');
    await tester.tap(find.widgetWithText(FilledButton, '등록하기'));
    await tester.pumpAndSettle();
    expect(find.byType(QuestListScreen), findsOneWidget);

    final firstRun = await h.questRepo.fetchQuests(uid);
    expect(firstRun, hasLength(5));

    // ── "앱 재실행": 같은 저장소 인스턴스(h)를 유지한 채 새 ProviderScope+라우터로
    //    다시 pump한다. 새 라우터는 홈(/home)에서 시작한다.
    await pumpApp(tester, reuse: h);
    expect(find.text('오늘도 한 걸음.'), findsOneWidget);

    // 퀘스트 탭으로 가면 앞서 등록한 퀘스트가 그대로 복원돼 있다(빈 상태가 아니다).
    await tapTab(tester, '퀘스트');
    expect(find.byType(EmptyView), findsNothing);
    expect(find.byType(GoalGroupSection), findsWidgets);
    expect(find.text('공모전 지원하기'), findsWidgets);
    expect(find.text('공고 페이지 열어 지원 자격 확인하기'), findsOneWidget);

    // 저장소도 그대로 5개(재-pump로 유실되지 않았다).
    expect(await h.questRepo.fetchQuests(uid), hasLength(5));
  });
}

/// 목록 조회·등록은 정상이고 **완료(지급)만** 실패하는 저장소.
///
/// `failWith`는 모든 호출을 실패시켜 "등록은 되는데 완료만 실패"를 만들 수 없다.
/// 그 한 메서드만 갈아끼운다(quest_list_screen_test의 같은 이름 헬퍼와 취지 동일).
class _FailingCompleteQuestRepository extends InMemoryQuestRepository {
  _FailingCompleteQuestRepository({super.users});

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
