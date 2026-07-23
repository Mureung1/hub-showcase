import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/features/quest/decompose_notifier.dart';
import 'package:one_step/features/quest/quest_create_screen.dart';
import 'package:one_step/features/quest/quest_list_screen.dart';
import 'package:one_step/models/analytics_event.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/models/quest.dart';
import 'package:one_step/providers/providers.dart';
import 'package:one_step/repositories/analytics_repository.dart';
import 'package:one_step/repositories/decompose/fake_quest_decomposer.dart';
import 'package:one_step/repositories/memory/fake_auth_repository.dart';
import 'package:one_step/repositories/memory/in_memory_analytics_repository.dart';
import 'package:one_step/repositories/memory/in_memory_goal_repository.dart';
import 'package:one_step/repositories/memory/in_memory_quest_repository.dart';
import 'package:one_step/repositories/memory/in_memory_user_repository.dart';

import '../../helpers/pump_app.dart';

/// log가 **실제로 예외를 던지는** 계측 저장소.
///
/// InMemory(failWith)는 log를 삼키므로 "저장소가 던져도 기능이 산다"를 검증할 수
/// 없다. 이 더블은 log가 실패를 던져도 완료·등록이 성공하는지를 고정한다
/// (호출부의 best-effort 격리가 유일한 방어선).
class _ThrowingAnalyticsRepository implements AnalyticsRepository {
  @override
  Future<void> log(String uid, AnalyticsEvent event) async =>
      throw const NetworkFailure();

  @override
  Future<List<AnalyticsEvent>> fetchEvents(String uid) async =>
      throw const NetworkFailure();
}

int _countType(List<AnalyticsEvent> events, AnalyticsEventType type) =>
    events.where((e) => e.type == type).length;

void main() {
  const uid = 'test-uid';

  group('signup — ensureUser 최초 생성 시 1회 (session provider)', () {
    ProviderContainer makeContainer({
      required InMemoryUserRepository users,
      required InMemoryAnalyticsRepository analytics,
    }) {
      final container = ProviderContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(
            FakeAuthRepository(initialUid: uid),
          ),
          userRepositoryProvider.overrideWithValue(users),
          analyticsRepositoryProvider.overrideWithValue(analytics),
        ],
      );
      addTearDown(container.dispose);
      return container;
    }

    test('★ 신규 사용자(문서 없음)면 signup 1건이 남는다', () async {
      final users = InMemoryUserRepository(); // seed 없음 = 신규
      final analytics = InMemoryAnalyticsRepository();
      addTearDown(users.dispose);
      final container = makeContainer(users: users, analytics: analytics);

      await container.read(sessionProvider.future);
      // 로그는 fire-and-forget이라 마이크로태스크가 돌 시간을 준다.
      await Future<void>.delayed(Duration.zero);

      expect(_countType(analytics.eventsOf(uid), AnalyticsEventType.signup), 1);
    });

    test('★ 이미 문서가 있으면 signup을 남기지 않는다', () async {
      final users = InMemoryUserRepository(seed: AppUser.initial(uid));
      final analytics = InMemoryAnalyticsRepository();
      addTearDown(users.dispose);
      final container = makeContainer(users: users, analytics: analytics);

      await container.read(sessionProvider.future);
      await Future<void>.delayed(Duration.zero);

      expect(_countType(analytics.eventsOf(uid), AnalyticsEventType.signup), 0);
    });
  });

  group('appOpen — KST 날짜당 1회 (attendance provider, isNewDay 재사용)', () {
    test('★ 첫 접속엔 남고, 같은 날 재접속엔 중복되지 않는다', () async {
      DateTime clock() => DateTime.utc(2026, 7, 21, 3); // KST 정오, 고정
      final users = InMemoryUserRepository(
        seed: AppUser.initial(uid),
        clock: clock,
      );
      final analytics = InMemoryAnalyticsRepository();
      addTearDown(users.dispose);

      final container = ProviderContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(
            FakeAuthRepository(initialUid: uid),
          ),
          userRepositoryProvider.overrideWithValue(users),
          analyticsRepositoryProvider.overrideWithValue(analytics),
          clockProvider.overrideWithValue(clock),
        ],
      );
      addTearDown(container.dispose);

      // 첫 접속 → isNewDay=true → appOpen 1건.
      await container.read(attendanceProvider.future);
      await Future<void>.delayed(Duration.zero);
      expect(
        _countType(analytics.eventsOf(uid), AnalyticsEventType.appOpen),
        1,
      );

      // 같은 날 재접속(같은 clock) → isNewDay=false → 로그 없음.
      container.invalidate(attendanceProvider);
      await container.read(attendanceProvider.future);
      await Future<void>.delayed(Duration.zero);
      expect(
        _countType(analytics.eventsOf(uid), AnalyticsEventType.appOpen),
        1,
        reason: '같은 날 재접속은 중복 로그를 만들지 않는다',
      );
    });
  });

  group('등록·재분해 — decompose_notifier.confirm (batch 밖 · 성공 경로)', () {
    ({
      ProviderContainer container,
      InMemoryQuestRepository questRepo,
      InMemoryAnalyticsRepository analytics,
    })
    makeSetup({AnalyticsRepository? analyticsOverride}) {
      final questRepo = InMemoryQuestRepository();
      final goalRepo = InMemoryGoalRepository();
      final userRepo = InMemoryUserRepository(seed: AppUser.initial(uid));
      final analytics = InMemoryAnalyticsRepository();
      addTearDown(questRepo.dispose);
      addTearDown(goalRepo.dispose);
      addTearDown(userRepo.dispose);

      final container = ProviderContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(
            FakeAuthRepository(initialUid: uid),
          ),
          userRepositoryProvider.overrideWithValue(userRepo),
          questRepositoryProvider.overrideWithValue(questRepo),
          goalRepositoryProvider.overrideWithValue(goalRepo),
          questDecomposerProvider.overrideWithValue(
            FakeQuestDecomposer(scenario: FakeDecomposeScenario.success),
          ),
          analyticsRepositoryProvider.overrideWithValue(
            analyticsOverride ?? analytics,
          ),
        ],
      );
      addTearDown(container.dispose);
      return (container: container, questRepo: questRepo, analytics: analytics);
    }

    test('★ AI 분해 등록 성공 → questRegistered(source=ai) 1건, count=드래프트 수', () async {
      final s = makeSetup();
      final notifier = s.container.read(decomposeNotifierProvider.notifier);
      await s.container.read(decomposeNotifierProvider.future);
      await notifier.decompose('공모전 지원하기');
      final draftCount =
          s.container.read(decomposeNotifierProvider).value!.drafts.length;

      final ok = await notifier.confirm();
      await Future<void>.delayed(Duration.zero);

      expect(ok, isTrue);
      final registered = s.analytics
          .eventsOf(uid)
          .where((e) => e.type == AnalyticsEventType.questRegistered)
          .toList();
      expect(registered, hasLength(1));
      expect(registered.single.params['source'], 'ai');
      expect(registered.single.params['count'], draftCount);
      // 재분해가 아니므로 questRedecomposed는 없다.
      expect(
        _countType(s.analytics.eventsOf(uid), AnalyticsEventType.questRedecomposed),
        0,
      );
    });

    test('★ 재분해 등록 성공 → questRedecomposed 1건, questRegistered는 없다', () async {
      final s = makeSetup();
      final notifier = s.container.read(decomposeNotifierProvider.notifier);
      await s.container.read(decomposeNotifierProvider.future);

      await notifier.redecomposeQuest(
        const RedecomposeTarget(
          questId: 'parent-1',
          questTitle: '막힌 퀘스트',
          difficulty: Difficulty.normal,
          goalId: 'g1',
        ),
      );
      final ok = await notifier.confirm();
      await Future<void>.delayed(Duration.zero);

      expect(ok, isTrue);
      final redec = s.analytics
          .eventsOf(uid)
          .where((e) => e.type == AnalyticsEventType.questRedecomposed)
          .toList();
      expect(redec, hasLength(1));
      expect(redec.single.params['parentQuestId'], 'parent-1');
      // 재분해는 신규 등록으로 세지 않는다(「도전 시작률」 분모 오염 방지).
      expect(
        _countType(s.analytics.eventsOf(uid), AnalyticsEventType.questRegistered),
        0,
      );
    });

    test('★★ 회귀 방어: 로그 저장소가 던져도 등록은 성공하고 퀘스트가 저장된다', () async {
      // 최대 회귀 위험 — 로그가 batch 밖 best-effort라 실패해도 등록을 막지 않는다.
      final s = makeSetup(analyticsOverride: _ThrowingAnalyticsRepository());
      final notifier = s.container.read(decomposeNotifierProvider.notifier);
      await s.container.read(decomposeNotifierProvider.future);
      await notifier.decompose('공모전 지원하기');

      final ok = await notifier.confirm();
      await Future<void>.delayed(Duration.zero);

      expect(ok, isTrue, reason: '로그 실패가 등록을 롤백시키면 안 된다');
      expect(await s.questRepo.fetchQuests(uid), isNotEmpty);
    });
  });

  group('완료·멈춤·직접등록 — 화면 계층 (트랜잭션 밖 · 성공 경로)', () {
    /// pump_app에 계측 저장소를 주입하고 그 인스턴스를 돌려준다.
    Future<(InMemoryQuestRepository, InMemoryAnalyticsRepository)> pumpWith(
      WidgetTester tester,
      Widget screen, {
      List<Quest> quests = const [],
      AppUser? user,
    }) async {
      final analytics = InMemoryAnalyticsRepository();
      final repo = await pumpScreen(
        tester,
        screen,
        quests: quests,
        user: user,
        extraOverrides: [
          analyticsRepositoryProvider.overrideWithValue(analytics),
        ],
      );
      return (repo, analytics);
    }

    testWidgets('★ 완료 지급 성공 → questCompleted 1건', (tester) async {
      final (_, analytics) = await pumpWith(
        tester,
        const QuestListScreen(),
        quests: const [
          Quest(id: 'q1', title: '완료할 퀘스트', difficulty: Difficulty.normal),
        ],
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byTooltip('완료'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('건너뛰기'));
      await tester.pumpAndSettle();

      final completed = analytics
          .eventsOf('test-uid')
          .where((e) => e.type == AnalyticsEventType.questCompleted)
          .toList();
      expect(completed, hasLength(1));
      expect(completed.single.params['questId'], 'q1');
    });

    testWidgets('★ 재완료(이미 지급된 퀘스트)는 questCompleted를 남기지 않는다', (tester) async {
      // rewardedAt이 이미 있는 퀘스트를 완료 → reward==null → 로그 없음.
      final (_, analytics) = await pumpWith(
        tester,
        const QuestListScreen(),
        quests: [
          Quest(
            id: 'q1',
            title: '예전에 완료',
            difficulty: Difficulty.hard,
            rewardedAt: DateTime(2026, 1, 1),
          ),
        ],
      );
      await tester.pumpAndSettle();

      // 이미 보상받은 퀘스트라 메모 시트 없이 바로 완료된다.
      await tester.tap(find.byTooltip('완료'));
      await tester.pumpAndSettle();

      expect(
        _countType(
          analytics.eventsOf('test-uid'),
          AnalyticsEventType.questCompleted,
        ),
        0,
        reason: '재완료는 지급이 없어 계측하지 않는다',
      );
    });

    testWidgets('★ 멈춤 표시 → questStuck 1건', (tester) async {
      final (_, analytics) = await pumpWith(
        tester,
        const QuestListScreen(),
        quests: const [Quest(id: 'q1', title: '막힐 퀘스트')],
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byTooltip('막힐 퀘스트 더보기'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('여기서 막혔어요'));
      await tester.pumpAndSettle();

      final stuck = analytics
          .eventsOf('test-uid')
          .where((e) => e.type == AnalyticsEventType.questStuck)
          .toList();
      expect(stuck, hasLength(1));
      expect(stuck.single.params['questId'], 'q1');
    });

    testWidgets('★ 직접 등록 → questRegistered(source=manual) 1건', (tester) async {
      final (_, analytics) = await pumpWith(
        tester,
        const QuestCreateScreen(),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField), '직접 만든 퀘스트');
      await tester.pumpAndSettle();
      await tester.tap(find.text('등록하기'));
      await tester.pumpAndSettle();

      final registered = analytics
          .eventsOf('test-uid')
          .where((e) => e.type == AnalyticsEventType.questRegistered)
          .toList();
      expect(registered, hasLength(1));
      expect(registered.single.params['source'], 'manual');
      expect(registered.single.params['count'], 1);
    });
  });
}
