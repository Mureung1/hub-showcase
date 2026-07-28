import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/reward_rules.dart';
import 'package:one_step/features/home/home_screen.dart';
import 'package:one_step/features/home/widgets/character_card.dart';
import 'package:one_step/features/home/widgets/streak_bonus_dialog.dart';
import 'package:one_step/features/quest/quest_create_screen.dart';
import 'package:one_step/features/quest/quest_split_screen.dart';
import 'package:one_step/features/quest/widgets/quest_complete_dialog.dart';
import 'package:one_step/features/shop/shop_screen.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/models/difficulty.dart';
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

/// checklist E-4 · **접근성 글꼴 배율 레이아웃 관통 회귀 테스트.**
///
/// E-4 최종 QA에서 실증된 레이아웃 결함 6건은 원인이 하나다 — 고정폭 `Row`(또는
/// 고정 높이 그리드 셀)에 유연 위젯이 없어서, 시스템 글꼴 배율을 키우면 텍스트만
/// 커지고 접힐 곳이 없어 부모 폭·높이를 넘는다. 결함마다 테스트를 따로 두면 **다음에
/// 같은 유형이 새로 생겼을 때 아무도 못 잡는다.** 그래서 개별 검증 대신
/// **화면 × 배율 × 폭을 순회하며 오버플로 예외가 하나도 없음**을 단언한다.
///
/// 덮는 결함(E-4 실측):
/// - D-1 분해 로딩 `Row` (배율 1.3 / 폭 360부터)
/// - D-2 완료 다이얼로그 인증 보너스 `Row` (배율 2.0 · 모든 폭)
/// - D-3 완료 다이얼로그 `RewardChip(large: true)` (배율 2.0 · 모든 폭)
/// - D-4 직접 등록 「예상 보상」 `Row(spaceBetween)` (배율 1.6 / 폭 360부터)
/// - D-5 상점 상품 카드 세로 오버플로 (배율 1.6부터 · 폭 무관)
/// - D-6 홈 캐릭터 카드 레벨 행 · 코인 pill (배율 2.0 + 좁은 폭 + **큰 값**)
///
/// **자명 통과 방지 장치 두 가지가 들어 있다.**
/// 1. 각 케이스는 화면이 실제로 그려졌는지(`expectVisible`)를 먼저 확인한다 —
///    오류 화면이나 빈 화면으로 떨어지면 오버플로가 날 일이 없어 조용히 통과한다.
/// 2. 값이 **크다**. D-6은 `coin 1234`·`Lv.12`에서만 재현되고, D-2는
///    `verified: true`에서만 재현된다. 기본값으로만 돌리면 결함을 못 잡는다.
void main() {
  /// 안드로이드 "글꼴 크게" 단계들. 1.3 = 한 단계, 2.0 = 최대.
  ///
  /// **1.4가 들어 있는 이유**: [RewardShowcase]의 보상 배율 상한이 1.3에 있다. 상한
  /// 아래(1.3)와 한참 위(1.6·2.0)만 표본으로 삼으면 **경계를 막 넘은 첫 프레임을
  /// 아무도 그려 보지 않는다.** 분기 경계는 표본 사이에 두지 않는다.
  const scales = <double>[1.3, 1.4, 1.6, 2.0];

  /// 소형(320) · 표준(360) · 대형(411) 단말 논리 폭.
  const widths = <double>[320.0, 360.0, 411.0];

  /// 세로는 넉넉히 준다. 이 테스트가 잡으려는 건 **가로 오버플로와 그리드 셀 내부의
  /// 세로 오버플로**이고, 둘 다 화면 높이와 무관하다. 화면을 짧게 잡으면 스크롤이
  /// 필요한 화면들이 무관한 세로 오버플로를 내며 신호를 가린다.
  const viewportHeight = 2400.0;

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

  final scenarios = <String, Scenario>{
    '홈 (캐릭터 카드 · 코인 1,234 · Lv.12)': (tester, ts) async {
      await pumpScreen(
        tester,
        const HomeScreen(),
        user: bigUser,
        textScaler: ts,
      );
      await tester.pumpAndSettle();
      return find.byType(CharacterCard);
    },

    'AI 분해 로딩': (tester, ts) async {
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
      await tester.tap(find.text('분해하기'));
      // 로딩 인디케이터가 계속 도므로 pumpAndSettle은 쓸 수 없다.
      await tester.pump();
      return find.text('AI가 목표를 나누고 있어요');
    },

    // 결과 확인 화면(Figma 리디자인)에서 **한 줄에 여러 요소가 나란히 놓이는 두 자리**를
    // 덮는다: ① 초안 카드의 태그 행(난이도 pill + 보상 칩 + 🔄 + ✕), ② 하단 액션 줄
    // (「다시 나누기」 + 「등록하기」 그라디언트 버튼 각 반쪽 폭).
    // 둘 다 배율을 키우면 텍스트만 커지는 자리라, 접힐 곳(Wrap/Flexible)이 없으면 넘친다.
    'AI 분해 결과 (카드 태그 행 + 하단 액션 줄)': (tester, ts) async {
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
      await tester.tap(find.text('분해하기'));
      await tester.pumpAndSettle();
      return find.textContaining('추천 퀘스트로 준비했어요');
    },

    '퀘스트 완료 다이얼로그 (인증 보너스 + 상한 절삭)': (tester, ts) async {
      await pumpScreen(
        tester,
        Scaffold(
          body: QuestCompleteDialog(
            questTitle: '공모전 공고 3개 찾아보기',
            reward: verifiedHardReward,
            verified: true,
            cutCoin: 4,
          ),
        ),
        textScaler: ts,
      );
      await tester.pumpAndSettle();
      return find.text('퀘스트 완료!');
    },

    '연속 출석 보너스 다이얼로그': (tester, ts) async {
      await pumpScreen(
        tester,
        const Scaffold(
          body: StreakBonusDialog(streak: 14, bonus: Reward(coin: 20, xp: 20)),
        ),
        textScaler: ts,
      );
      await tester.pumpAndSettle();
      return find.text('14일 연속!');
    },

    '직접 등록 (예상 보상)': (tester, ts) async {
      await pumpScreen(tester, const QuestCreateScreen(), textScaler: ts);
      await tester.pumpAndSettle();
      return find.text('예상 보상');
    },

    '상점 (상품 카드 그리드)': (tester, ts) async {
      await pumpScreen(
        tester,
        const ShopScreen(),
        user: bigUser,
        textScaler: ts,
      );
      await tester.pumpAndSettle();
      return find.text('구매');
    },
  };

  for (final entry in scenarios.entries) {
    final screen = entry.key;
    final scenario = entry.value;

    for (final scale in scales) {
      for (final width in widths) {
        testWidgets('$screen — 배율 $scale · 폭 ${width.toInt()}dp', (
          tester,
        ) async {
          tester.view.devicePixelRatio = 1.0;
          tester.view.physicalSize = Size(width, viewportHeight);
          addTearDown(tester.view.reset);

          final visible = await scenario(tester, TextScaler.linear(scale));

          final errors = drainExceptions(tester);
          expect(
            errors,
            isEmpty,
            reason:
                '[$screen] 배율 $scale · 폭 ${width.toInt()}dp 에서 레이아웃이 넘쳤다.\n'
                '고정폭 Row에 유연 위젯(Flexible/Wrap)이 없거나 그리드 셀 높이가 '
                '고정이면 글꼴 배율을 키운 사용자에게 콘텐츠가 잘린다.\n'
                '${errors.join('\n')}',
          );

          expect(
            visible,
            findsWidgets,
            reason:
                '[$screen] 배율 $scale · 폭 ${width.toInt()}dp 에서 화면이 그려지지 않았다 '
                '— 이 조합은 결함을 검사하지 못한 것이므로 통과로 볼 수 없다.',
          );
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
