import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/theme/app_colors.dart';
import 'package:one_step/core/theme/app_theme.dart';
import 'package:one_step/core/theme/reward_colors.dart';
import 'package:one_step/core/widgets/difficulty_pill.dart';
import 'package:one_step/core/widgets/level_pill.dart';
import 'package:one_step/core/widgets/stat_card.dart';
import 'package:one_step/models/difficulty.dart';

/// checklist 1주차 — "다크/라이트 대비가 텍스트 가독성을 해치지 않는다".
///
/// "눈으로 보니 괜찮더라" 대신 WCAG 2.1 명암비를 계산해 판정한다.
/// 본문 텍스트 기준선은 AA 4.5:1.
///
/// ## 이 파일이 지키는 두 층
///
/// 1. **스킴 레벨** — `ColorScheme` 슬롯 쌍(아래 라이트/다크 group 5쌍). 원래 있던
///    가드다.
/// 2. **조합 레벨** — 위젯이 실제로 **골라 쓰는** 색 조합(그 아래 group들). 스킴이
///    멀쩡해도 위젯이 스킴을 우회하면 화면은 읽히지 않는다. 2026-07-29 다크 전수
///    조사에서 나온 결함이 전부 이 층이었고, 그때까지 감시 밖이었다.
///
/// ⚠️ **`before:` 주석이 붙은 항목은 실제로 무너졌던 자리다.** 그 수치가 이 가드의
/// 존재 이유이므로 지우지 말 것.
void main() {
  const minRatio = 4.5;

  /// 그래픽 요소·큰 글자 기준선(WCAG 1.4.11 / 1.4.3 large text).
  /// 아이콘·보더·채운 면의 경계처럼 **글줄이 아닌** 대상에 쓴다.
  const minGraphicRatio = 3.0;

  /// 보더 없이 **면색만으로** 위아래 층을 가를 때 필요한 최소 밝기 차(CIE L\*).
  ///
  /// 명암비로는 판정할 수 없다 — 서로 가까운 두 어두운 면은 비율이 1.1:1이라도
  /// 항상 "미달"로 보여 기준이 되지 못한다. L\* 차이가 층 구분의 실제 신호다.
  /// 라이트 정본(흰 면 `#ffffff` ↔ 안쪽 박스 `#eff4ff`)의 실측 차가 3.89이고,
  /// 다크에서 무너졌던 값이 2.84였다. 5는 그 사이를 가르되 정본 쪽 여유를 남긴 선이다.
  const minDeltaLStar = 5.0;

  /// WCAG 상대 휘도.
  double luminance(Color c) {
    double channel(double v) {
      return v <= 0.03928
          ? v / 12.92
          : math.pow((v + 0.055) / 1.055, 2.4).toDouble();
    }

    return 0.2126 * channel(c.r) +
        0.7152 * channel(c.g) +
        0.0722 * channel(c.b);
  }

  double contrast(Color a, Color b) {
    final la = luminance(a);
    final lb = luminance(b);
    final lighter = math.max(la, lb);
    final darker = math.min(la, lb);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /// 반투명 색을 뒤에 깔린 면 위에 **합성해 불투명 값으로 만든다.**
  ///
  /// ⚠️ 이걸 빼먹으면 가드가 거짓 실패한다. [luminance]는 알파를 보지 않으므로
  /// `primaryContainer@10%`(라이트 쉬움 pill 채움)를 그대로 재면 원색 `#22c55e`를
  /// 잰 셈이 되어 2.82:1이 나온다 — 실제 렌더는 흰 카드 위 `#e8f9ef`이고 5.88:1이다.
  Color composite(Color foreground, Color background) {
    final a = foreground.a;
    if (a >= 1) return foreground;
    double mix(double f, double b) => f * a + b * (1 - a);
    return Color.from(
      alpha: 1,
      red: mix(foreground.r, background.r),
      green: mix(foreground.g, background.g),
      blue: mix(foreground.b, background.b),
    );
  }

  /// CIE L\* (0=검정, 100=흰색). 면과 면의 **밝기 차**를 재는 데 쓴다.
  double lStar(Color c) {
    final y = luminance(c);
    return y > 0.008856
        ? 116 * math.pow(y, 1 / 3).toDouble() - 16
        : 903.3 * y;
  }

  void expectContrast(String label, Color fg, Color bg, double min) {
    final ratio = contrast(fg, bg);
    expect(
      ratio,
      greaterThanOrEqualTo(min),
      reason: '$label 명암비 ${ratio.toStringAsFixed(2)}:1 — 기준 $min:1 미달',
    );
  }

  void expectReadable(String label, Color fg, Color bg) =>
      expectContrast(label, fg, bg, minRatio);

  /// 두 면이 보더 없이 서로 갈라지는가.
  void expectDistinctSurface(String label, Color a, Color b) {
    final delta = (lStar(a) - lStar(b)).abs();
    expect(
      delta,
      greaterThanOrEqualTo(minDeltaLStar),
      reason:
          '$label 밝기차 ΔL* ${delta.toStringAsFixed(2)} — 기준 $minDeltaLStar 미달(두 면이 붙어 보인다)',
    );
  }

  /// 위젯이 고른 색을 읽어내기 위한 렌더 헬퍼.
  ///
  /// 조합 레벨 가드는 **값이 아니라 배선**을 지킨다 — 토큰이 맞아도 위젯이 다른
  /// 슬롯을 부르면 화면은 그대로 깨진다. 그래서 상수를 비교하지 않고 실제로 그려서
  /// 꺼낸다.
  Future<void> pumpIn(WidgetTester tester, ThemeData theme, Widget child) {
    return tester.pumpWidget(
      MaterialApp(theme: theme, home: Scaffold(body: Center(child: child))),
    );
  }

  /// 렌더된 위젯 트리에서 [Container]의 채움색을 꺼낸다.
  Color fillOf(WidgetTester tester, Finder finder) {
    final container = tester.widget<Container>(finder);
    return (container.decoration! as BoxDecoration).color!;
  }

  /// context를 요구하는 색 함수(`difficultyAccent` 등)를 부르기 위한 context.
  Future<BuildContext> contextIn(WidgetTester tester, ThemeData theme) async {
    late BuildContext captured;
    await tester.pumpWidget(
      MaterialApp(
        theme: theme,
        home: Builder(
          builder: (context) {
            captured = context;
            return const SizedBox.shrink();
          },
        ),
      ),
    );
    return captured;
  }

  group('라이트 테마', () {
    final scheme = AppTheme.light.colorScheme;
    final reward = AppTheme.light.reward;

    test('본문 텍스트 / 배경', () {
      expectReadable('onSurface/surface', scheme.onSurface, scheme.surface);
    });

    test('보조 텍스트 / 배경', () {
      expectReadable(
        'onSurfaceVariant/surface',
        scheme.onSurfaceVariant,
        scheme.surface,
      );
    });

    test('주요 버튼 텍스트 / 그린', () {
      expectReadable('onPrimary/primary', scheme.onPrimary, scheme.primary);
    });

    test('오류 텍스트 / 배경', () {
      expectReadable('error/surface', scheme.error, scheme.surface);
    });

    test('코인 텍스트 / 노랑', () {
      expectReadable('onCoin/coin', reward.onCoin, reward.coin);
    });
  });

  group('다크 테마', () {
    final scheme = AppTheme.dark.colorScheme;
    final reward = AppTheme.dark.reward;

    test('본문 텍스트 / 배경', () {
      expectReadable('onSurface/surface', scheme.onSurface, scheme.surface);
    });

    test('보조 텍스트 / 배경', () {
      expectReadable(
        'onSurfaceVariant/surface',
        scheme.onSurfaceVariant,
        scheme.surface,
      );
    });

    test('주요 버튼 텍스트 / 그린', () {
      expectReadable('onPrimary/primary', scheme.onPrimary, scheme.primary);
    });

    test('오류 텍스트 / 배경', () {
      expectReadable('error/surface', scheme.error, scheme.surface);
    });

    test('코인 텍스트 / 노랑', () {
      expectReadable('onCoin/coin', reward.onCoin, reward.coin);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 조합 레벨 가드 — 위젯이 실제로 골라 쓰는 색 (2026-07-29 다크 정비에서 추가)
  //
  // 라이트·다크를 **같은 하한으로** 함께 돌린다. 다크만 걸어 두면 다크를 고치다
  // 라이트를 깨뜨려도 아무도 모른다("라이트 렌더는 바뀌지 않는다"가 계약이다).
  // ───────────────────────────────────────────────────────────────────────

  for (final entry in {'라이트': AppTheme.light, '다크': AppTheme.dark}.entries) {
    final themeName = entry.key;
    final theme = entry.value;
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    group('[$themeName] 난이도 3종 — 난이도 = 보상 등급이라 셋 다 읽혀야 한다', () {
      // ① 난이도 pill 자체(채움 vs 글자). 본문 글줄이라 4.5:1.
      //    before(다크): pill이 라이트 전용 옅은 틴트로 하드코딩돼 있어 어두운
      //    카드 위에 흰 판이 떠 있었다(pill 자체 대비는 통과했지만 면이 갈라졌다).
      for (final difficulty in Difficulty.values) {
        testWidgets('pill ${difficulty.name} — 채움 vs 글자', (tester) async {
          await pumpIn(tester, theme, DifficultyPill(difficulty: difficulty));

          // 라이트 쉬움·보통 채움은 **반투명**이라 카드 면에 합성해 잰다.
          final background = composite(
            fillOf(tester, find.byType(Container)),
            scheme.surfaceContainerLowest,
          );
          final foreground = tester.widget<Text>(find.byType(Text)).style!.color!;

          expectContrast(
            '$themeName 난이도 pill(${difficulty.name})',
            foreground,
            background,
            minRatio,
          );
        });
      }

      // ② 카드 좌측 세로 accent 보더. 글자가 아닌 그래픽이라 3:1.
      // ③ 난이도 세그먼트 **선택 칸**의 채움 vs 트랙. 역시 그래픽이라 3:1.
      //
      // ⚠️ **다크에만 건다.** 라이트 값은 Figma 정본이 정한 것이고 이미 이 바를
      // 넘지 못한다 — accent 쉬움 2.28 · 보통 1.70, 세그먼트 채움/트랙 쉬움 2.07 ·
      // 보통 1.54. 정본을 바꾸는 것은 이 작업의 권한 밖이라(라이트 렌더 불변이
      // 계약이다) 라이트에 품질 바를 걸면 통과할 수 없는 가드가 된다.
      // 라이트는 대신 아래 '정본 그대로다' 블록이 **값 자체를 못 박아** 지킨다.
      //
      // before(다크): 두 자리 모두 라이트 상수를 그대로 써서 어려움이 사라졌다 —
      // accent #ba1a1a가 다크 카드 위 2.37:1, 세그먼트 채움이 트랙과 2.19:1이라
      // "어려움"과 "지금 어려움을 골랐다"가 눈에 보이지 않았다.
      if (isDark) {
        testWidgets('accent 3종 vs 카드 면', (tester) async {
          final context = await contextIn(tester, theme);
          for (final difficulty in Difficulty.values) {
            expectContrast(
              '$themeName accent(${difficulty.name})/카드',
              difficultyAccent(context, difficulty),
              scheme.surfaceContainerLowest,
              minGraphicRatio,
            );
          }
        });

        testWidgets('세그먼트 선택 칸 3종 — 채움 vs 트랙', (tester) async {
          final context = await contextIn(tester, theme);
          for (final difficulty in Difficulty.values) {
            expectContrast(
              '$themeName 세그먼트(${difficulty.name}) 채움/트랙',
              difficultyFill(context, difficulty).background,
              scheme.surfaceContainerLow,
              minGraphicRatio,
            );
          }
        });
      }

      // ③-b 세그먼트 선택 칸의 **채움 위 글자**는 라이트·다크 모두 본문 기준이다
      //     (이쪽은 라이트도 정본이 4.5:1을 넘게 골라 뒀다).
      testWidgets('세그먼트 선택 칸 3종 — 채움 vs 글자', (tester) async {
        final context = await contextIn(tester, theme);
        for (final difficulty in Difficulty.values) {
          final fill = difficultyFill(context, difficulty);
          expectContrast(
            '$themeName 세그먼트(${difficulty.name}) 글자',
            fill.foreground,
            composite(fill.background, scheme.surfaceContainerLow),
            minRatio,
          );
        }
      });
    });

    group('[$themeName] 면 위에 얹히는 박스·패널', () {
      // ④ 안내 박스·AI 진입점 카드의 본문.
      //    before(다크): 배경이 라이트 전용 #e6eef9로 박혀 있어 밝은 onSurface
      //    본문과 **1.01:1** — 글줄이 통째로 사라졌다. 이번 정비 최악의 자리.
      test('틴트 패널 본문', () {
        expectReadable(
          '$themeName onSurface/tintPanelSurface',
          scheme.onSurface,
          scheme.tintPanelSurface,
        );
      });

      // ⑤ 그 패널은 화면 면·카드 면 **양쪽과** 구분돼야 한다. 셋 중 둘이 붙으면
      //    "패널인지 카드인지 배경인지"가 읽히지 않는다.
      // ⑥ 보더 없는 안쪽 박스(환생 확인 InfoBox · 레벨업 강조 · RewardShowcase ·
      //    메모/사진 박스 · 상점 프리뷰)가 다이얼로그·카드 면과 갈라지는가.
      //
      // ⚠️ ②③과 같은 이유로 **다크에만 건다.** 라이트 정본의 실측 분리폭이
      // 이미 이 바 아래다 — 안쪽 박스 ΔL* 3.89(`#ffffff` ↔ `#eff4ff`),
      // 틴트 패널 ΔL* 4.20(`#f8f9ff` ↔ `#e6eef9`). 라이트는 아래 '정본 그대로다'
      // 블록이 값 자체를 못 박는다.
      //
      // before(다크): 안쪽 박스 ΔL* **2.84** — 박스가 면에 붙어 사라졌다.
      // 틴트 패널은 아예 라이트 값(`#e6eef9`)이 그대로 떠 있었다.
      if (isDark) {
        test('틴트 패널 vs 화면 면 · 카드 면', () {
          expectDistinctSurface(
            '$themeName tintPanelSurface/surface',
            scheme.tintPanelSurface,
            scheme.surface,
          );
          expectDistinctSurface(
            '$themeName tintPanelSurface/카드 면',
            scheme.tintPanelSurface,
            scheme.surfaceContainerLowest,
          );
        });

        test('안쪽 박스 vs 다이얼로그·카드 면', () {
          expectDistinctSurface(
            '$themeName insetSurface/카드 면',
            scheme.insetSurface,
            scheme.surfaceContainerLowest,
          );
        });
      }
    });

    // ⑦-a / ⑧-a **라이트 전용 상수 누수 가드.**
    //
    // ⚠️ 명암비만으로는 이 결함을 못 잡는다. 실기기 다크에서 터졌던 레벨 pill과
    // stat 칩은 **자기들끼리는 대비가 멀쩡했다**(옅은 그린 틴트 `#e9f9ef` 위
    // 진한 그린 `#006e2f` = 5.89:1). 문제는 그 한 쌍이 어두운 화면에 통째로 흰
    // 조각으로 떠 있었다는 것이다 — 즉 "읽히는가"가 아니라 **"라이트 값이 다크로
    // 새어 들었는가"** 가 판정 기준이어야 한다.
    //
    // 대비 가드만 뒀다면 원래의 깨진 값이 그대로 통과했다(뮤테이션으로 확인함).
    if (isDark) {
      testWidgets('[$themeName] 라이트 전용 상수가 다크 렌더에 새어 들지 않는다', (
        tester,
      ) async {
        // 이 위젯들의 **라이트 분기 전용** 값. 다크 렌더에 하나라도 나오면
        // 그 자리는 테마를 우회한 것이다.
        //
        // 제외한 것과 이유:
        // - 🟡 `coinGlow`·`onCoin` — 두 테마가 **공유**하는 값이다.
        // - `AppColors.primary`(#006e2f) — 다크 스킴의 `primaryContainer`가
        //   **바로 이 값**이다(레벨 pill 채움이 정당하게 이 색을 쓴다).
        //   대신 짝인 `primarySurface`가 목록에 있어 같은 결함을 잡는다.
        const lightOnly = <Color>[
          AppColors.primarySurface,
          AppColors.primaryContainer,
          AppColors.secondarySurface,
          AppColors.errorContainer,
          AppColors.onErrorContainer,
        ];

        Future<void> checkNoLeak(String label, Widget widget) async {
          await pumpIn(tester, theme, widget);

          final used = <Color>[
            for (final c in tester.widgetList<Container>(find.byType(Container)))
              if (c.decoration is BoxDecoration)
                ...[(c.decoration! as BoxDecoration).color].nonNulls,
            for (final t in tester.widgetList<Text>(find.byType(Text)))
              ...[t.style?.color].nonNulls,
            for (final i in tester.widgetList<Icon>(find.byType(Icon)))
              ...[i.color].nonNulls,
          ];

          for (final leaked in lightOnly) {
            expect(
              used,
              isNot(contains(leaked)),
              reason:
                  '$label — 다크 렌더에 라이트 전용 상수 $leaked 가 그대로 쓰였다',
            );
          }
        }

        await checkNoLeak('레벨 pill', const LevelPill(level: 12));
        await checkNoLeak(
          'stat 성장 카드',
          const StatCard(icon: Icons.check, label: '완료한 도전', value: '12'),
        );
        await checkNoLeak(
          'stat 보상 카드',
          const StatCard(
            icon: Icons.paid,
            label: '코인',
            value: '1240',
            accent: StatAccent.reward,
          ),
        );
        for (final difficulty in Difficulty.values) {
          await checkNoLeak(
            '난이도 pill(${difficulty.name})',
            DifficultyPill(difficulty: difficulty),
          );
        }
      });
    }

    group('[$themeName] 성장·보상 표시', () {
      // ⑦ 레벨 pill(채움 vs 글자). 히어로 이름표 안의 글줄이라 4.5:1.
      testWidgets('레벨 pill', (tester) async {
        await pumpIn(tester, theme, const LevelPill(level: 12));

        expectContrast(
          '$themeName 레벨 pill',
          tester.widget<Text>(find.byType(Text)).style!.color!,
          fillOf(tester, find.byType(Container)),
          minRatio,
        );
      });

      // ⑧ stat 카드 성장 아이콘 칩(배경 vs 아이콘). 아이콘이라 3:1.
      //    ⚠️ 배경·전경이 **한 쌍**이다 — 한쪽만 테마를 따라가면 밝은 그린이
      //    밝은 칩 위에 얹힌다. 이 가드가 그 짝을 지킨다.
      testWidgets('stat 성장 칩 — 배경 vs 아이콘', (tester) async {
        await pumpIn(
          tester,
          theme,
          const StatCard(
            icon: Icons.check,
            label: '완료한 도전',
            value: '12',
          ),
        );

        final iconColor = tester.widget<Icon>(find.byType(Icon)).color!;
        final chipColor = fillOf(
          tester,
          find.ancestor(of: find.byType(Icon), matching: find.byType(Container)).first,
        );

        expectContrast(
          '$themeName stat 성장 칩',
          iconColor,
          chipColor,
          minGraphicRatio,
        );
      });

      // ⑨ stat 카드 보상 수치 vs 카드 면. 큰 숫자지만 본문 기준으로 건다.
      //    before(다크): `onCoin`(#5c3800)을 **면 위 글자**로 써서 1.47:1이었다.
      //    (`onCoin` 자체는 "밝은 코인색 위 글자"로서 올바른 값이다 — 위 다크
      //     group의 '코인 텍스트 / 노랑'이 그쪽을 계속 지킨다.)
      testWidgets('stat 보상 수치 vs 카드 면', (tester) async {
        await pumpIn(
          tester,
          theme,
          const StatCard(
            icon: Icons.paid,
            label: '코인',
            value: '1240',
            accent: StatAccent.reward,
          ),
        );

        final rich = tester
            .widgetList<Text>(find.byType(Text))
            .firstWhere((t) => t.textSpan != null);
        final valueColor = (rich.textSpan! as TextSpan).style!.color!;

        expectContrast(
          '$themeName stat 보상 수치',
          valueColor,
          scheme.surfaceContainerLowest,
          minRatio,
        );
      });
    });

    group('[$themeName] 전경으로 쓰이는 스킴 색', () {
      // ⑩ 🟢 그린. 완료 체크·XP 수치·stat 아이콘·상점 장착 표시·진행바 채움이
      //    전부 이 한 슬롯에 걸려 있다.
      //    before(다크): 위젯들이 스킴 대신 상수 #006e2f를 직접 써서 2.38:1이었다.
      //    이 가드는 **슬롯 자체**를 지킨다(위젯이 스킴을 부르는지는 ⑧이 지킨다).
      test('primary — 카드 면 위에서 읽히는가', () {
        expectReadable(
          '$themeName primary/카드 면',
          scheme.primary,
          scheme.surfaceContainerLowest,
        );
      });

      // ⑪ 🔵 블루(AI·정보·링크·보조 행동). 아웃라인/텍스트 버튼 전경, AI 라벨,
      //    「방금 나눔」 칩, 원본 목표 줄이 전부 이 슬롯이다.
      //    before(다크): 슬롯이 #2170e4에 머물러 화면 3.68 · 카드 3.28 ·
      //    surfaceContainer 2.75 · surfaceContainerHigh 2.47:1로 **전부 미달**이었다.
      //    `AppColors.darkSecondary`(#9fcaff)가 들어오며 해소됐다.
      test('secondary — 세 층의 면 위에서 모두 읽히는가', () {
        for (final entry in {
          '화면 면': scheme.surface,
          '카드 면': scheme.surfaceContainerLowest,
          '틴트 패널': scheme.surfaceContainerHigh,
        }.entries) {
          expectReadable(
            '$themeName secondary/${entry.key}',
            scheme.secondary,
            entry.value,
          );
        }
      });

      // ⑫ 🔵 블루로 **채운 배지**(AI 아이콘 배지 · 출처 칩 · 알림 홀더)의 짝.
      //    다크에서 `onSecondary`가 밝은 블루의 짝(#003060)으로 뒤집혔으므로,
      //    채운 컨테이너 위 글리프는 반드시 `onSecondaryContainer`여야 한다.
      //    이 쌍이 어긋나면 어두운 글리프 on 어두운 블루(1.4:1)가 된다.
      test('secondaryContainer — 채운 배지 위 글리프', () {
        expectReadable(
          '$themeName onSecondaryContainer/secondaryContainer',
          scheme.onSecondaryContainer,
          scheme.secondaryContainer,
        );
        expectReadable(
          '$themeName onSecondary/secondary',
          scheme.onSecondary,
          scheme.secondary,
        );
      });
    });

    // 라이트 전용 **회귀 핀**.
    //
    // 위 ②③⑤⑥은 라이트에 걸 수 없다(정본 실측이 품질 바 아래다). 그렇다고
    // 무방비로 두면 다크를 고치다 라이트를 바꿔도 아무도 모른다. 품질 바 대신
    // **값을 그대로 못 박는다** — "라이트 렌더는 바뀌지 않는다"가 계약이므로
    // 판정 기준도 '좋은가'가 아니라 '그대로인가'가 맞다.
    if (!isDark) {
      testWidgets('[라이트] 정본 색이 그대로다 — 다크 정비의 부수 변경 감시', (tester) async {
        expect(scheme.primary, AppColors.primary);
        expect(scheme.secondary, AppColors.secondary);
        expect(scheme.tintPanelSurface, AppColors.secondarySurface);
        expect(scheme.insetSurface, AppColors.surfaceContainerLow);

        final context = await contextIn(tester, theme);
        // 난이도 accent 3종(카드 좌측 세로 보더 · 세그먼트 선택 칸 채움).
        expect(difficultyAccent(context, Difficulty.easy), AppColors.primaryContainer);
        expect(difficultyAccent(context, Difficulty.normal), RewardColors.coinGlow);
        expect(difficultyAccent(context, Difficulty.hard), AppColors.error);
        // 그 면 위 글자 3종.
        expect(
          difficultyFill(context, Difficulty.easy).foreground,
          AppColors.onPrimaryContainer,
        );
        expect(
          difficultyFill(context, Difficulty.normal).foreground,
          RewardColors.onCoin,
        );
        expect(
          difficultyFill(context, Difficulty.hard).foreground,
          AppColors.onError,
        );
      });
    }
  }

  test('RewardColors는 ColorScheme에 노출되지 않는다', () {
    // 노랑이 ColorScheme 슬롯에 들어가면 어떤 위젯이든 Theme.of(context)로
    // 노랑에 도달할 수 있어 "코인·보상 전용" 규칙을 강제할 수 없게 된다.
    for (final theme in [AppTheme.light, AppTheme.dark]) {
      final s = theme.colorScheme;
      final slots = <Color>[
        s.primary,
        s.onPrimary,
        s.primaryContainer,
        s.secondary,
        s.secondaryContainer,
        s.tertiary,
        s.onTertiary,
        s.tertiaryContainer,
        s.onTertiaryContainer,
        s.surface,
        s.onSurface,
      ];
      expect(
        slots,
        isNot(contains(RewardColors.coin)),
        reason: 'ColorScheme 슬롯에서 코인 노랑이 발견됐다',
      );
    }
  });
}
