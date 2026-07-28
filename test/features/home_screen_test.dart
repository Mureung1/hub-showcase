import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/growth_rules.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/core/widgets/coin_pill.dart';
import 'package:one_step/core/widgets/quest_card.dart';
import 'package:one_step/core/widgets/stat_card.dart';
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
  /// 홈은 리디자인으로 세로가 길어졌다 — 상단 바 + 히어로 195 + 이름 + XP + 통계
  /// 카드 + **세로로 쌓인** 액션 2개 + 섹션 헤더 + 미리보기 3장.
  ///
  /// 기본 테스트 뷰포트(800×600)에서는 액션 버튼부터 아래가 화면 밖이라 탭이 닿지
  /// 않고 미리보기 카드도 지어지지 않는다. **폭은 그대로 두고**(좁은 폭 레이아웃
  /// 검증력을 잃지 않는다) 높이만 넉넉히 잡아 화면 전체를 한 프레임에 담는다.
  void useTallViewport(WidgetTester tester) {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(800, 1600);
    addTearDown(tester.view.reset);
  }

  /// 코인 잔액은 두 곳에 나온다 — 상단 바의 [CoinPill]과 통계 카드. 같은 값이라
  /// `find.text`만으로는 "어느 쪽이 맞게 그려졌는지"를 말할 수 없어 자리를 좁힌다.
  Finder inCoinPill(String text) =>
      find.descendant(of: find.byType(CoinPill), matching: find.text(text));

  Finder inStat(String label, String value) => find.descendant(
    of: find.widgetWithText(StatCard, label),
    matching: find.text(value),
  );

  testWidgets('신규 사용자는 Lv.1 / XP 0 / 코인 0으로 렌더된다', (tester) async {
    useTallViewport(tester);
    await pumpScreen(tester, const HomeScreen());
    await tester.pumpAndSettle();

    expect(find.byType(CharacterCard), findsOneWidget);

    // 진화 단계 이름과 레벨 pill(리디자인 뒤 두 위젯으로 갈렸다)
    expect(find.text('알'), findsOneWidget);
    expect(find.text('Lv.1'), findsOneWidget);
    // XP (알 단계는 레벨당 5 XP)
    expect(find.text('0 / 5 XP'), findsOneWidget);
    // 코인 — 상단 바와 통계 카드 양쪽에 같은 값이 나온다.
    expect(inCoinPill('0'), findsOneWidget);
    expect(inStat('코인', '0'), findsOneWidget);
  });

  testWidgets('저장된 값이 그대로 표시된다', (tester) async {
    useTallViewport(tester);
    await pumpScreen(
      tester,
      const HomeScreen(),
      user: const AppUser(uid: 'test-uid', level: 12, xp: 4, coin: 1240),
    );
    await tester.pumpAndSettle();

    // Lv.12는 참새 단계, 레벨당 10 XP
    expect(find.text('참새'), findsOneWidget);
    expect(find.text('Lv.12'), findsOneWidget);
    expect(find.text('4 / 10 XP'), findsOneWidget);
    // 천 단위 구분 — 상단 바와 통계 카드 둘 다.
    expect(inCoinPill('1,240'), findsOneWidget);
    expect(inStat('코인', '1,240'), findsOneWidget);
    // 연속 일수는 홈이 출석을 기록하며 바뀌는 값이라 여기서 단정하지 않는다
    // (`streak_ui_test`가 시계를 고정해 놓고 그 계약을 따로 지킨다). 여기서는
    // 수치(Sora)와 단위(한글)가 한 문단으로 붙어 나오는 것만 확인한다.
    expect(inStat('연속', '1일'), findsOneWidget);
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
    useTallViewport(tester);
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
    // 리디자인 뒤 평평한 중립 `FilledButton`이다(주 버튼만 그라디언트를 갖는다).
    // 홈의 유일한 FilledButton이라 타입으로 집힌다.
    Finder rebirthButton() => find.byType(FilledButton);

    testWidgets('Lv.50 미만이면 비활성이고 열리는 조건을 말한다', (tester) async {
      useTallViewport(tester);
      await pumpScreen(
        tester,
        const HomeScreen(),
        user: const AppUser(uid: 'test-uid', level: 12),
      );
      await tester.pumpAndSettle();

      // 현재 레벨을 되뇌는 대신 **언제 열리는지**를 알린다.
      expect(find.text('환생 (Lv.$kMaxLevel 도달 시)'), findsOneWidget);
      final button = tester.widget<FilledButton>(rebirthButton());
      expect(button.onPressed, isNull, reason: 'Lv.50 미만은 눌리면 안 된다');
    });

    testWidgets('Lv.50이면 활성이다', (tester) async {
      useTallViewport(tester);
      await pumpScreen(
        tester,
        const HomeScreen(),
        user: const AppUser(uid: 'test-uid', level: kMaxLevel),
      );
      await tester.pumpAndSettle();

      // 열리면 조건 안내가 사라지고 행동만 남는다.
      expect(find.text('환생'), findsOneWidget);
      final button = tester.widget<FilledButton>(rebirthButton());
      expect(button.onPressed, isNotNull, reason: 'Lv.50이면 눌려야 한다');
    });

    testWidgets('탭 → 확인 다이얼로그 → 환생 실행 → 연출, 레벨이 1로 리셋된다', (tester) async {
      useTallViewport(tester);
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
      useTallViewport(tester);
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
      useTallViewport(tester);
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
    useTallViewport(tester);
    await pumpScreen(
      tester,
      const HomeScreen(),
      user: const AppUser(uid: 'test-uid', level: 12, rebirth: 3),
    );
    await tester.pumpAndSettle();

    // 등급 타이틀(rebirthTitle(3) = 'Master Scholar')과 계열 이모지가 반영된다.
    expect(find.textContaining('환생 3'), findsOneWidget);
    // 용 계열 Lv.12는 '새끼 용'.
    expect(find.text('새끼 용'), findsOneWidget);
    expect(find.text('Lv.12'), findsOneWidget);
  });

  testWidgets('★ 환생 표식이 좁은 폭에서도 넘치지 않는다 (긴 등급 타이틀)', (tester) async {
    // 'Master Scholar'는 등급 타이틀 중 가장 길다. 예전에는 이 조합에서 뱃지의
    // 고정폭 Row가 폭 375dp를 24px 넘겼다 — 환생 1회 이상에서만 렌더돼 E-4
    // 배율 표본에 걸리지 않았던 결함이다.
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(320, 2400);
    addTearDown(tester.view.reset);

    await pumpScreen(
      tester,
      const HomeScreen(),
      user: const AppUser(uid: 'test-uid', level: 12, rebirth: 3),
      textScaler: const TextScaler.linear(1.6),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('환생 3'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  // 미리보기는 본문 **맨 아래**라, 리디자인으로 위쪽이 길어진 지금은 기본 뷰포트
  // (800×600)에서 아예 지어지지 않는다(`ListView`가 뷰포트+캐시 밖 자식을 만들지
  // 않는다). 그래서 [useTallViewport]로 높이만 키운다 — **폭은 800 그대로**라
  // 좁은 폭 레이아웃 검증력은 그대로 남는다.
  group('진행 중인 퀘스트 미리보기 — 최신 등록순 3개', () {
    testWidgets('미완료가 4개여도 3개만, 최신 등록순으로 보인다', (tester) async {
      useTallViewport(tester);
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
      useTallViewport(tester);
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
      useTallViewport(tester);
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
      useTallViewport(tester);
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
      useTallViewport(tester);
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
