import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/growth_rules.dart';
import 'package:one_step/core/constants/reward_rules.dart';
import 'package:one_step/features/home/home_screen.dart';
import 'package:one_step/features/home/widgets/character_card.dart';
import 'package:one_step/features/home/widgets/evolve_dialog.dart';
import 'package:one_step/features/home/widgets/level_up_dialog.dart';
import 'package:one_step/features/home/widgets/rebirth_dialog.dart';
import 'package:one_step/features/home/widgets/streak_bonus_dialog.dart';
import 'package:one_step/features/quest/quest_create_screen.dart';
import 'package:one_step/features/quest/quest_split_screen.dart';
import 'package:one_step/features/quest/widgets/goal_complete_dialog.dart';
import 'package:one_step/features/quest/widgets/quest_complete_dialog.dart';
import 'package:one_step/features/quest/widgets/quest_delete_dialog.dart';
import 'package:one_step/features/quest/widgets/quest_edit_dialog.dart';
import 'package:one_step/features/shop/shop_screen.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/models/quest.dart';
import 'package:one_step/models/quest_draft.dart';
import 'package:one_step/providers/providers.dart';
import 'package:one_step/repositories/decompose/fake_quest_decomposer.dart';
import 'package:one_step/repositories/quest_decomposer.dart';

import '../helpers/pump_app.dart';

/// 화면 하나를 주어진 글꼴 배율로 띄우는 시나리오.
///
/// **화면이 실제로 그려졌음을 보여 주는 Finder**를 돌려준다. 그 Finder가 아무것도
/// 못 찾으면(오류 화면·빈 화면으로 떨어졌으면) 그 조합은 결함을 검사한 것이 아니므로
/// 통과로 인정하지 않는다.
typedef Scenario = Future<Finder> Function(WidgetTester tester, TextScaler ts);

/// 시나리오 하나 — 무엇을 띄우고, 그것이 **다이얼로그 라우트인지**.
///
/// 다이얼로그는 추가 단언을 받는다(`Dialog`가 실제 라우트로 떠 있는지). 화면과
/// 섞어 두면 "다이얼로그를 띄웠다고 생각했는데 사실 `Scaffold` 본문에 박아 둔"
/// 예전 실수가 다시 조용히 지나간다.
class Case {
  const Case(this.run, {this.dialog = false});

  final Scenario run;
  final bool dialog;
}

/// 실단말 논리 크기. 폭만 바꾸고 세로를 넉넉히 잡던 예전 방식은 **세로 오버플로를
/// 원리적으로 발생 불가**하게 만들었다(아래 `main` 주석 참고).
class Device {
  const Device(this.label, this.width, this.height);

  final String label;
  final double width;
  final double height;

  Size get size => Size(width, height);
}

/// checklist E-4 · **접근성 글꼴 배율 레이아웃 관통 회귀 테스트.**
///
/// E-4 최종 QA에서 실증된 레이아웃 결함 6건은 원인이 하나다 — 고정폭 `Row`(또는
/// 고정 높이 그리드 셀)에 유연 위젯이 없어서, 시스템 글꼴 배율을 키우면 텍스트만
/// 커지고 접힐 곳이 없어 부모 폭·높이를 넘는다. 결함마다 테스트를 따로 두면 **다음에
/// 같은 유형이 새로 생겼을 때 아무도 못 잡는다.** 그래서 개별 검증 대신
/// **화면 × 배율 × 단말을 순회하며 오버플로 예외가 하나도 없음**을 단언한다.
///
/// 덮는 결함(E-4 실측):
/// - D-1 분해 로딩 `Row` (배율 1.3 / 폭 360부터)
/// - D-2 완료 다이얼로그 인증 보너스 `Row` (배율 2.0 · 모든 폭)
/// - D-3 완료 다이얼로그 `RewardChip(large: true)` (배율 2.0 · 모든 폭)
/// - D-4 직접 등록 「예상 보상」 `Row(spaceBetween)` (배율 1.6 / 폭 360부터)
/// - D-5 상점 상품 카드 세로 오버플로 (배율 1.6부터 · 폭 무관)
/// - D-6 홈 캐릭터 카드 레벨 행 · 코인 pill (배율 2.0 + 좁은 폭 + **큰 값**)
///
/// **E-5에서 세 가지를 고쳐 실제 기하를 보게 했다.** 그전까지 이 테스트는 통과하면서도
/// 배포를 막았어야 할 결함 37건을 놓쳤다.
/// 1. **다이얼로그를 실제 `showXxxDialog` 라우트로 띄운다.** 예전에는
///    `Scaffold(body: XxxDialog(...))`라 `Dialog`의 높이 제약(화면 높이 −
///    `insetPadding` − `viewInsets`)이 **아예 적용되지 않았다** — 본문이 아무리
///    길어도 `Scaffold` 본문에서 그냥 늘어났다.
/// 2. **세로를 실단말 크기로 잡는다.** 예전에는 2400 고정이라 세로 오버플로가
///    **원리적으로 발생 불가**했다.
/// 3. **실제 서체를 로드한다.** flutter_test 기본 폰트(Ahem)는 글리프 폭이 1em
///    정사각이라 한글 문장의 가로 측정이 실제의 약 2배로 나온다 — 그 상태의
///    "통과"는 실제보다 가혹한 조건을 통과한 것이지만, 반대로 **폭이 남아도는
///    자리에서는 줄바꿈이 실제와 달라져** 세로 높이가 어긋난다.
///
/// **자명 통과 방지 장치.**
/// 1. 각 케이스는 화면이 실제로 그려졌는지(`visible`)를 먼저 확인한다 — 오류 화면이나
///    빈 화면으로 떨어지면 오버플로가 날 일이 없어 조용히 통과한다.
/// 2. 다이얼로그 케이스는 `Dialog`가 라우트로 떠 있는지를 함께 단언한다.
/// 3. 값이 **크다**. D-6은 `coin 1234`·`Lv.12`에서만 재현되고, D-2는
///    `verified: true`에서만 재현된다. 기본값으로만 돌리면 결함을 못 잡는다.
void main() {
  // rootBundle이 테스트 자산 번들(build/unit_test_assets)을 보게 한다 — 아래
  // setUpAll이 그 번들에서 실제 서체 파일을 읽는다.
  TestWidgetsFlutterBinding.ensureInitialized();

  /// 앱이 실제로 쓰는 두 서체를 테스트 런타임에 등록한다.
  ///
  /// **이게 없으면 이 테스트의 모든 가로·세로 측정이 허구다.** flutter_test의 기본
  /// 폰트는 모든 글리프가 1em 정사각이라 '퀘스트를 삭제할까요?' 한 줄이 실제
  /// Pretendard보다 두 배 가까이 넓게 잡히고, 그 결과 줄바꿈 위치와 전체 높이가
  /// 실제 단말과 다르다. 배포 판정을 이 숫자로 하려면 서체부터 실물이어야 한다.
  setUpAll(() async {
    for (final font in const {
      'Pretendard': 'assets/fonts/PretendardVariable.ttf',
      'Sora': 'assets/fonts/Sora-Variable.ttf',
    }.entries) {
      final loader = FontLoader(font.key)..addFont(rootBundle.load(font.value));
      await loader.load();
    }
  });

  /// 안드로이드 "글꼴 크게" 단계들. 1.0 = 기본, 1.3 = 한 단계, 2.0 = 최대.
  ///
  /// **1.0이 들어 있는 이유**: 최솟값을 1.3으로 두면 **아무 설정도 안 한 사용자에게
  /// 보이는 결함**을 이 테스트가 원리적으로 못 잡는다. 실제로 환생 축하의 등급 칩이
  /// 배율 1.0 · 320dp에서 넘치고 있었는데 72건 전부 통과했다.
  ///
  /// **1.4가 들어 있는 이유**: [RewardShowcase]의 보상 배율 상한이 1.3에 있다. 상한
  /// 아래(1.3)와 한참 위(1.6·2.0)만 표본으로 삼으면 **경계를 막 넘은 첫 프레임을
  /// 아무도 그려 보지 않는다.** 분기 경계는 표본 사이에 두지 않는다.
  const scales = <double>[1.0, 1.3, 1.4, 1.6, 2.0];

  /// 소형·표준·대형 실단말의 **논리 폭과 높이**.
  ///
  /// 세로를 함께 잡는 것이 요점이다. 예전에는 세로가 2400 고정이라 다이얼로그가
  /// 아무리 길어져도 화면에 다 들어갔고, "버튼이 화면 밖으로 밀린다"는 이번 결함이
  /// 통째로 사각지대였다.
  const devices = <Device>[
    Device('소형', 320, 568),
    Device('표준', 360, 640),
    Device('대형', 411, 731),
  ];

  /// 큰 값 사용자 — D-6 재현 조건(코인 1,234 · Lv.12 · 스트릭 두 자리).
  const bigUser = AppUser(
    uid: 'test-uid',
    level: 12,
    xp: 9,
    coin: 1234,
    streak: 12,
  );

  /// 인증 보너스가 붙은 어려움 퀘스트의 실지급액 — 완료 다이얼로그의 최대 폭 조건.
  final verifiedHardReward = rewardFor(Difficulty.hard) + kVerificationBonus;

  /// 남은 오버플로 예외를 **전부** 걷어 온다.
  ///
  /// `takeException()`은 한 번에 하나만 돌려주므로, 한 프레임에 여러 곳이 터졌을 때
  /// 첫 개만 보고 넘어가면 나머지가 teardown에서 다시 터진다.
  List<Object> drainExceptions(WidgetTester tester) {
    final found = <Object>[];
    while (true) {
      final error = tester.takeException();
      if (error == null) return found;
      found.add(error as Object);
    }
  }

  /// 목록 화면에서 대상이 아직 화면 밖이면 **스크롤해 데려온다.**
  ///
  /// 세로를 실단말 크기로 좁힌 뒤 생긴 필수 절차다. `ListView`는 화면 밖 자식을
  /// **아예 만들지 않으므로**, 배율 2.0 · 568dp에서는 「예상 보상」 줄이 존재조차
  /// 하지 않는다 — 스크롤하지 않으면 (a) "화면이 그려졌는가" 가드가 실제 결함이
  /// 아니라 뷰포트 때문에 실패하고, 더 나쁘게는 (b) **그 줄의 레이아웃이 한 번도
  /// 계산되지 않아** D-1·D-4 같은 결함을 검사하지 못한 채 지나간다.
  ///
  /// `pumpAndSettle`이 아니라 `pump`로 도는 [WidgetTester.scrollUntilVisible]을
  /// 쓴다 — 로딩 인디케이터가 도는 프레임에서도 멈추지 않는다.
  /// 이미 만들어져 있더라도 화면 밖이면 **탭이 빗나간다**(`tester.tap`은 경고만
  /// 남기고 엉뚱한 자리를 누른다). 그래서 목록을 끌어 자식을 만든 뒤,
  /// `ensureVisible`로 뷰포트 안까지 데려온다.
  Future<void> scrollTo(WidgetTester tester, Finder target) async {
    if (target.evaluate().isEmpty) {
      await tester.scrollUntilVisible(
        target,
        120,
        scrollable: find.byType(Scrollable).first,
      );
    }
    // `.first` — 상점의 「구매」처럼 같은 문구가 여러 칸에 나오는 화면에서는
    // `ensureVisible`이 단일 요소를 요구해 터진다. 하나만 보이면 그 줄은 그려진다.
    await tester.ensureVisible(target.first);
    await tester.pump();
  }

  /// 빈 호스트 화면을 띄우고 **그 화면의 context로** 실제 `showXxxDialog`를 부른다.
  ///
  /// 다이얼로그는 별도 라우트라, 이렇게 띄워야 `Dialog`의 `insetPadding`·화면 높이
  /// 제약·`viewInsets`가 실제와 같이 걸린다. `Scaffold(body: XxxDialog(...))`는
  /// 겉보기만 같고 **높이 제약이 하나도 없는 다른 상황**이다.
  Future<Finder> openDialog(
    WidgetTester tester,
    TextScaler ts,
    void Function(BuildContext context) show,
    Finder visible, {
    List<Quest> quests = const [],
  }) async {
    const hostKey = ValueKey('dialog-host');
    await pumpScreen(
      tester,
      const Scaffold(body: SizedBox.shrink(key: hostKey)),
      quests: quests,
      user: bigUser,
      textScaler: ts,
    );
    await tester.pump();

    show(tester.element(find.byKey(hostKey)));
    await tester.pumpAndSettle();

    return visible;
  }

  final scenarios = <String, Case>{
    '홈 (캐릭터 카드 · 코인 1,234 · Lv.12)': Case((tester, ts) async {
      await pumpScreen(
        tester,
        const HomeScreen(),
        user: bigUser,
        textScaler: ts,
      );
      await tester.pumpAndSettle();
      return find.byType(CharacterCard);
    }),

    'AI 분해 로딩': Case((tester, ts) async {
      await pumpScreen(
        tester,
        const QuestSplitScreen(),
        textScaler: ts,
        extraOverrides: [
          questDecomposerProvider.overrideWithValue(_NeverDecomposer()),
        ],
      );
      await tester.pump();
      // 목표를 입력하고 분해를 시작시켜 **로딩 프레임에 머무르게** 한다
      // (분해기가 영원히 응답하지 않으므로 상태가 로딩에서 넘어가지 않는다).
      await tester.enterText(find.byType(TextField), '공모전 지원하기');
      await tester.pump();
      // 좁은 세로(배율 2.0 · 568dp)에서는 분해 버튼이 화면 아래로 밀린다.
      // 그대로 탭하면 빗나가 로딩이 시작조차 하지 않는다.
      await scrollTo(tester, find.text('분해하기'));
      await tester.tap(find.text('분해하기'));
      // 로딩 인디케이터가 계속 도므로 pumpAndSettle은 쓸 수 없다.
      await tester.pump();

      final loading = find.text('AI가 목표를 나누고 있어요');
      await scrollTo(tester, loading);
      return loading;
    }),

    // 결과 확인 화면(Figma 리디자인)에서 **한 줄에 여러 요소가 나란히 놓이는 두 자리**를
    // 덮는다: ① 초안 카드의 태그 행(난이도 pill + 보상 칩 + 🔄 + ✕), ② 하단 액션 줄
    // (「다시 나누기」 + 「등록하기」 그라디언트 버튼 각 반쪽 폭).
    // 둘 다 배율을 키우면 텍스트만 커지는 자리라, 접힐 곳(Wrap/Flexible)이 없으면 넘친다.
    'AI 분해 결과 (카드 태그 행 + 하단 액션 줄)': Case((tester, ts) async {
      await pumpScreen(
        tester,
        const QuestSplitScreen(),
        textScaler: ts,
        extraOverrides: [
          questDecomposerProvider.overrideWithValue(
            // 템플릿 폴백 경로 = 폴백 배너 + 가장 긴 라벨(「다시 AI로 나누기」)까지
            // 한 프레임에 그린다. 짧은 라벨만 검사하면 최악 조건을 지나친다.
            FakeQuestDecomposer(scenario: FakeDecomposeScenario.timeout),
          ),
        ],
      );
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), '공모전 지원하기');
      await tester.pump();
      // 좁은 세로(배율 2.0 · 568dp)에서는 분해 버튼이 화면 아래로 밀린다.
      // 그대로 탭하면 빗나가 로딩이 시작조차 하지 않는다.
      await scrollTo(tester, find.text('분해하기'));
      await tester.tap(find.text('분해하기'));
      await tester.pumpAndSettle();

      final banner = find.textContaining('추천 퀘스트로 준비했어요');
      await scrollTo(tester, banner);
      return banner;
    }),

    '직접 등록 (예상 보상)': Case((tester, ts) async {
      await pumpScreen(tester, const QuestCreateScreen(), textScaler: ts);
      await tester.pumpAndSettle();

      // D-4의 자리는 화면 아래쪽이라 좁은 세로에서는 스크롤해야 그려진다.
      final preview = find.text('예상 보상');
      await scrollTo(tester, preview);
      return preview;
    }),

    '상점 (상품 카드 그리드)': Case((tester, ts) async {
      await pumpScreen(
        tester,
        const ShopScreen(),
        user: bigUser,
        textScaler: ts,
      );
      await tester.pumpAndSettle();

      final buy = find.text('구매');
      await scrollTo(tester, buy);
      return buy;
    }),

    // ── 다이얼로그 9종. 전부 **실제 라우트**로 띄운다.
    // 공통 셸([AppDialogShell])이 본문을 스크롤로 감싸므로 세로가 모자라면 잘리는
    // 대신 스크롤돼야 한다. 그 계약이 깨지면 여기서 오버플로로 드러난다.
    '퀘스트 완료 다이얼로그 (인증 보너스 + 상한 절삭)': Case(
      (tester, ts) => openDialog(
        tester,
        ts,
        (context) => showQuestCompleteDialog(
          context,
          questTitle: '공모전 공고 3개 찾아보기',
          reward: verifiedHardReward,
          verified: true,
          cutCoin: 4,
        ),
        find.text('퀘스트 완료!'),
      ),
      dialog: true,
    ),

    '연속 출석 보너스 다이얼로그': Case(
      (tester, ts) => openDialog(
        tester,
        ts,
        (context) => showStreakBonusDialog(
          context,
          streak: 14,
          bonus: const Reward(coin: 20, xp: 20),
        ),
        find.text('14일 연속!'),
      ),
      dialog: true,
    ),

    '레벨업 다이얼로그 (두 자리 레벨)': Case(
      (tester, ts) => openDialog(
        tester,
        ts,
        // 두 자리 → 두 자리가 `Lv.{from} → Lv.{to}` 줄의 최대 폭 조건이다.
        (context) => showLevelUpDialog(context, fromLevel: 12, toLevel: 13),
        find.text('레벨 업!'),
      ),
      dialog: true,
    ),

    '진화 다이얼로그': Case(
      (tester, ts) => openDialog(
        tester,
        ts,
        (context) => showEvolveDialog(
          context,
          fromStage: stageOf(29),
          toStage: stageOf(30),
        ),
        find.textContaining('진화했어요'),
      ),
      dialog: true,
    ),

    '목표 완수 다이얼로그 (긴 목표명)': Case(
      (tester, ts) => openDialog(
        tester,
        ts,
        (context) => showGoalCompleteDialog(
          context,
          goalLabel: '교내 창업 경진대회 지원해서 본선까지 올라가기',
        ),
        find.text('목표를 이루었어요!'),
      ),
      dialog: true,
    ),

    '환생 축하 다이얼로그 (계열 해금 + 최장 등급명)': Case(
      (tester, ts) => openDialog(
        tester,
        ts,
        // 환생 3회 = 용 계열 해금 배너가 함께 뜨고(가장 긴 본문), 등급명도
        // 'Master Scholar'로 가장 길다 — 이 다이얼로그의 최악 조건이다.
        (context) =>
            showRebirthCelebrationDialog(context, newRebirth: kDragonRebirth),
        find.text('환생했어요!'),
      ),
      dialog: true,
    ),

    '환생 확인 다이얼로그': Case(
      (tester, ts) =>
          openDialog(tester, ts, showRebirthConfirmDialog, find.text('환생할까요?')),
      dialog: true,
    ),

    '퀘스트 삭제 확인 (하위 퀘스트 포함)': Case(
      (tester, ts) => openDialog(
        tester,
        ts,
        // 하위 퀘스트가 있으면 경고 문구가 두 줄로 길어진다(최악 조건).
        (context) => showQuestDeleteDialog(
          context,
          questTitle: '공모전 공고 3개 찾아보고 표로 정리하기',
          childCount: 3,
        ),
        find.text('퀘스트를 삭제할까요?'),
      ),
      dialog: true,
    ),

    '퀘스트 수정 다이얼로그 (제목 + 난이도 + 예상 보상)': Case(
      (tester, ts) => openDialog(
        tester,
        ts,
        (context) => showQuestEditDialog(
          context,
          quest: const Quest(
            id: 'q1',
            title: '공모전 공고 3개 찾아보고 표로 정리하기',
            difficulty: Difficulty.hard,
          ),
        ),
        find.text('퀘스트 수정'),
      ),
      dialog: true,
    ),
  };

  for (final entry in scenarios.entries) {
    final screen = entry.key;
    final testCase = entry.value;

    for (final scale in scales) {
      for (final device in devices) {
        testWidgets('$screen — 배율 $scale · ${device.label} '
            '${device.width.toInt()}×${device.height.toInt()}', (tester) async {
          tester.view.devicePixelRatio = 1.0;
          tester.view.physicalSize = device.size;
          addTearDown(tester.view.reset);

          final visible = await testCase.run(tester, TextScaler.linear(scale));

          final errors = drainExceptions(tester);
          expect(
            errors,
            isEmpty,
            reason:
                '[$screen] 배율 $scale · ${device.width.toInt()}×'
                '${device.height.toInt()} 에서 레이아웃이 넘쳤다.\n'
                '고정폭 Row에 유연 위젯(Flexible/Wrap)이 없거나, 다이얼로그 본문이 '
                '스크롤되지 않으면 글꼴 배율을 키운 사용자에게 콘텐츠가 잘린다 '
                '(다이얼로그는 잘리는 자리가 하필 확인/취소 버튼이다).\n'
                '${errors.join('\n')}',
          );

          expect(
            visible,
            findsWidgets,
            reason:
                '[$screen] 배율 $scale · ${device.width.toInt()}×'
                '${device.height.toInt()} 에서 화면이 그려지지 않았다 '
                '— 이 조합은 결함을 검사하지 못한 것이므로 통과로 볼 수 없다.',
          );

          if (testCase.dialog) {
            expect(
              find.byType(Dialog),
              findsOneWidget,
              reason:
                  '[$screen] 다이얼로그가 **라우트로** 떠 있지 않다. 이 단언이 없으면 '
                  '`Scaffold(body: XxxDialog(...))`처럼 높이 제약이 하나도 걸리지 '
                  '않는 상황을 검사하고도 통과한다(E-5 이전의 실제 사고).',
            );
          }
        });
      }
    }
  }
}

/// 영원히 응답하지 않는 분해기 — 로딩 상태를 프레임에 고정한다.
///
/// 지연(delay)을 쓰면 테스트 종료 시 타이머가 남아 실패한다. 완료되지 않는 Future는
/// 정리할 것이 없다(`pump_app.dart`의 `loadingForever`와 같은 처방).
class _NeverDecomposer implements QuestDecomposer {
  @override
  Future<List<QuestDraft>> decompose(String goal) =>
      Completer<List<QuestDraft>>().future;

  @override
  Future<List<QuestDraft>> redecompose({
    required String goalText,
    required QuestDraft item,
  }) => Completer<List<QuestDraft>>().future;
}
