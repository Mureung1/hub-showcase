import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/theme/app_theme.dart';
import 'package:one_step/core/theme/reward_colors.dart';

/// checklist 1주차 — "다크/라이트 대비가 텍스트 가독성을 해치지 않는다".
///
/// "눈으로 보니 괜찮더라" 대신 WCAG 2.1 명암비를 계산해 판정한다.
/// 본문 텍스트 기준선은 AA 4.5:1.
void main() {
  const minRatio = 4.5;

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

  void expectReadable(String label, Color fg, Color bg) {
    final ratio = contrast(fg, bg);
    expect(
      ratio,
      greaterThanOrEqualTo(minRatio),
      reason:
          '$label 명암비 ${ratio.toStringAsFixed(2)}:1 — WCAG AA 기준 $minRatio:1 미달',
    );
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
