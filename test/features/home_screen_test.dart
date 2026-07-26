import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/growth_rules.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/core/widgets/quest_card.dart';
import 'package:one_step/core/widgets/state_views.dart';
import 'package:one_step/features/home/home_screen.dart';
import 'package:one_step/features/home/widgets/character_card.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/models/quest.dart';
import 'package:one_step/models/quest_status.dart';

import '../helpers/pump_app.dart';

/// 등록 시각만 다른 미완료 퀘스트.
Quest _quest(String id, {DateTime? createdAt, QuestStatus? status}) => Quest(
  id: id,
  title: id,
  status: status ?? QuestStatus.todo,
  createdAt: createdAt,
);

/// checklist 1주차 · 홈/캐릭터 화면
/// - 레벨·XP·코인이 데이터 바인딩되어 실제 값이 출력된다
/// - 로딩 중 스켈레톤이 표시된다
/// - 신규 사용자도 기본값(Lv.1, XP 0, 코인 0)으로 정상 렌더된다
void main() {
  testWidgets('신규 사용자는 Lv.1 / XP 0 / 코인 0으로 렌더된다', (tester) async {
    await pumpScreen(tester, const HomeScreen());
    await tester.pumpAndSettle();

    expect(find.byType(CharacterCard), findsOneWidget);

    // 레벨과 진화 단계
    expect(find.text('Level 1 · 알'), findsOneWidget);
    // XP (알 단계는 레벨당 5 XP)
    expect(find.text('XP 0 / 5'), findsOneWidget);
    // 코인
    expect(find.text('0'), findsOneWidget);
  });

  testWidgets('저장된 값이 그대로 표시된다', (tester) async {
    await pumpScreen(
      tester,
      const HomeScreen(),
      user: const AppUser(uid: 'test-uid', level: 12, xp: 4, coin: 1240),
    );
    await tester.pumpAndSettle();

    // Lv.12는 참새 단계, 레벨당 10 XP
    expect(find.text('Level 12 · 참새'), findsOneWidget);
    expect(find.text('XP 4 / 10'), findsOneWidget);
    // 천 단위 구분
    expect(find.text('1,240'), findsOneWidget);
  });

  testWidgets('로딩 중에는 스켈레톤이 표시된다', (tester) async {
    // InMemory 저장소는 즉시 응답하므로 로딩 프레임을 볼 수 없다.
    // 영원히 로딩인 스트림을 주입해 로딩 UI만 따로 검증한다.
    await pumpScreen(
      tester,
      const HomeScreen(),
      extraOverrides: loadingForever(),
    );
    await tester.pump();

    expect(find.byType(SkeletonBox), findsWidgets);
    expect(find.byType(CharacterCard), findsNothing);
  });

  testWidgets('오류 시 오류 화면과 재시도가 표시된다', (tester) async {
    await pumpScreen(
      tester,
      const HomeScreen(),
      failWith: const NetworkFailure(),
    );
    await tester.pumpAndSettle();

    expect(find.byType(ErrorView), findsOneWidget);
    expect(find.text('다시 시도'), findsOneWidget);
  });

  group('환생 버튼', () {
    Finder rebirthButton() => find.byType(OutlinedButton);

    testWidgets('Lv.50 미만이면 비활성이다', (tester) async {
      await pumpScreen(
        tester,
        const HomeScreen(),
        user: const AppUser(uid: 'test-uid', level: 12),
      );
      await tester.pumpAndSettle();

      expect(find.text('환생 (Lv.12)'), findsOneWidget);
      final button = tester.widget<OutlinedButton>(rebirthButton());
      expect(button.onPressed, isNull, reason: 'Lv.50 미만은 눌리면 안 된다');
    });

    testWidgets('Lv.50이면 활성이다', (tester) async {
      await pumpScreen(
        tester,
        const HomeScreen(),
        user: const AppUser(uid: 'test-uid', level: kMaxLevel),
      );
      await tester.pumpAndSettle();

      final button = tester.widget<OutlinedButton>(rebirthButton());
      expect(button.onPressed, isNotNull, reason: 'Lv.50이면 눌려야 한다');
    });

    testWidgets('탭 → 확인 다이얼로그 → 환생 실행 → 연출, 레벨이 1로 리셋된다', (tester) async {
      final questRepo = await pumpScreen(
        tester,
        const HomeScreen(),
        user: const AppUser(uid: 'test-uid', level: kMaxLevel, coin: 500),
      );
      await tester.pumpAndSettle();

      // 탭 → 확인 다이얼로그.
      await tester.tap(rebirthButton());
      await tester.pumpAndSettle();
      expect(find.text('환생할까요?'), findsOneWidget);

      // 확인 → 환생 실행 → 연출.
      await tester.tap(find.text('환생하기'));
      await tester.pumpAndSettle();
      expect(find.text('환생했어요!'), findsOneWidget);

      // 저장소에 레벨1·rebirth+1·코인 유지가 반영됐다.
      final after = await questRepo.users!.fetchUser('test-uid');
      expect(after.level, 1);
      expect(after.rebirth, 1);
      expect(after.coin, 500, reason: '코인은 유지된다');
    });

    testWidgets('확인 다이얼로그에서 취소하면 환생하지 않는다', (tester) async {
      final questRepo = await pumpScreen(
        tester,
        const HomeScreen(),
        user: const AppUser(uid: 'test-uid', level: kMaxLevel),
      );
      await tester.pumpAndSettle();

      await tester.tap(rebirthButton());
      await tester.pumpAndSettle();
      await tester.tap(find.text('아직요'));
      await tester.pumpAndSettle();

      expect(find.text('환생했어요!'), findsNothing);
      final after = await questRepo.users!.fetchUser('test-uid');
      expect(after.level, kMaxLevel, reason: '취소했으니 리셋되지 않는다');
      expect(after.rebirth, 0);
    });

    testWidgets('환생 3회 도달 시 용 계열 해금이 강조된다', (tester) async {
      await pumpScreen(
        tester,
        const HomeScreen(),
        user: const AppUser(uid: 'test-uid', level: kMaxLevel, rebirth: 2),
      );
      await tester.pumpAndSettle();

      await tester.tap(rebirthButton());
      await tester.pumpAndSettle();
      await tester.tap(find.text('환생하기'));
      await tester.pumpAndSettle();

      expect(find.textContaining('용 계열이 열렸어요'), findsOneWidget);
    });
  });

  testWidgets('환생 표식은 rebirth>0일 때 카드에 등급으로 뜬다', (tester) async {
    await pumpScreen(
      tester,
      const HomeScreen(),
      user: const AppUser(uid: 'test-uid', level: 12, rebirth: 3),
    );
    await tester.pumpAndSettle();

    // 등급 타이틀(rebirthTitle(3) = 'Master Scholar')과 계열 이모지가 반영된다.
    expect(find.textContaining('환생 3'), findsOneWidget);
    // 용 계열 Lv.12는 '새끼 용'.
    expect(find.text('Level 12 · 새끼 용'), findsOneWidget);
  });

  // 화면 크기는 기본값(800x600) 그대로 쓴다.
  //
  // 세 번째 카드는 세로로 뷰포트(600) 아래에 놓이지만 단언은 그대로 성립한다.
  // `_PendingQuests`가 `ListView`의 **자식 하나**(Column)라, 그 자식이 뷰포트에
  // 걸리는 순간 Column 전체가 인플레이트되기 때문이다 — 카드 하나하나가 지연
  // 생성되는 구조가 아니다. 실측: 세 카드의 dy가 631 / 753 / 875로 모두 트리에 있다.
  //
  // 화면을 키우고 싶은 유혹이 있지만, 폭을 넓히면 좁은 폭 레이아웃 검증력이 같이
  // 떨어진다. 필요 없는 확대는 하지 않는다.
  group('진행 중인 퀘스트 미리보기 — 최신 등록순 3개', () {
    testWidgets('미완료가 4개여도 3개만, 최신 등록순으로 보인다', (tester) async {
      // 저장 순서와 등록 시각을 일부러 어긋나게 섞는다. 정렬 없이 앞에서 3개를
      // 자르는 구현이면 이 케이스가 통과하지 못한다.
      await pumpScreen(
        tester,
        const HomeScreen(),
        quests: [
          _quest('가장오래된', createdAt: DateTime(2026, 1, 1)),
          _quest('최신', createdAt: DateTime(2026, 5, 1)),
          _quest('중간', createdAt: DateTime(2026, 3, 1)),
          _quest('두번째최신', createdAt: DateTime(2026, 4, 1)),
        ],
      );
      await tester.pumpAndSettle();

      expect(find.byType(QuestCard), findsNWidgets(3));
      // 오래된 것이 잘린다.
      expect(find.text('가장오래된'), findsNothing);

      // 뽑힌 3개가 최신 → 과거 순으로 놓인다.
      final ys = [
        for (final title in ['최신', '두번째최신', '중간'])
          tester.getTopLeft(find.text(title)).dy,
      ];
      expect(ys[0], lessThan(ys[1]));
      expect(ys[1], lessThan(ys[2]));
    });

    testWidgets('createdAt이 null인 퀘스트가 맨 앞에 온다', (tester) async {
      // serverTimestamp가 아직 확정되지 않은 상태 = 방금 만든 퀘스트.
      await pumpScreen(
        tester,
        const HomeScreen(),
        quests: [
          _quest('예전것', createdAt: DateTime(2026, 1, 1)),
          _quest('방금만든것'),
          _quest('덜예전것', createdAt: DateTime(2026, 2, 1)),
        ],
      );
      await tester.pumpAndSettle();

      final justCreated = tester.getTopLeft(find.text('방금만든것')).dy;
      expect(justCreated, lessThan(tester.getTopLeft(find.text('덜예전것')).dy));
      expect(justCreated, lessThan(tester.getTopLeft(find.text('예전것')).dy));
    });

    testWidgets('완료된 퀘스트는 최신이어도 제외된다', (tester) async {
      await pumpScreen(
        tester,
        const HomeScreen(),
        quests: [
          _quest(
            '완료된최신',
            createdAt: DateTime(2026, 9, 1),
            status: QuestStatus.done,
          ),
          _quest('미완료', createdAt: DateTime(2026, 1, 1)),
        ],
      );
      await tester.pumpAndSettle();

      expect(find.byType(QuestCard), findsOneWidget);
      expect(find.text('완료된최신'), findsNothing);
      expect(find.text('미완료'), findsOneWidget);
    });

    testWidgets('미완료가 하나도 없으면 빈 상태가 뜬다', (tester) async {
      await pumpScreen(
        tester,
        const HomeScreen(),
        quests: [
          _quest('완료', createdAt: DateTime(2026, 1, 1), status: QuestStatus.done),
        ],
      );
      await tester.pumpAndSettle();

      expect(find.byType(QuestCard), findsNothing);
      expect(find.byType(EmptyView), findsOneWidget);
    });

    testWidgets('카드에 출처 칩이 함께 보인다', (tester) async {
      await pumpScreen(
        tester,
        const HomeScreen(),
        quests: [
          Quest(
            id: 'ai',
            title: 'AI가 쪼갠 퀘스트',
            goalId: 'goal-1',
            createdAt: DateTime(2026, 2, 1),
          ),
          Quest(
            id: 'manual',
            title: '직접 등록한 퀘스트',
            createdAt: DateTime(2026, 1, 1),
          ),
        ],
      );
      await tester.pumpAndSettle();

      expect(find.text('AI'), findsOneWidget);
      expect(find.text('직접'), findsOneWidget);
    });
  });
}
