import 'package:flutter/material.dart';

import 'app_colors.dart';
import 'app_radius.dart';
import 'app_spacing.dart';
import 'app_typography.dart';
import 'reward_colors.dart';

/// One-Step ThemeData.
///
/// `ColorScheme.fromSeed`를 쓰지 않고 **명시적으로 생성**한다. fromSeed는 `#006e2f`,
/// `#0058be` 같은 지정 색을 톤 근사값으로 뭉개는데, 디자인 정본과 체크리스트는
/// 리터럴 HEX가 그대로 살아 있기를 요구한다.
///
/// tertiary 계열에는 **노랑을 넣지 않는다.** 노랑은 [RewardTheme] 확장으로만 전달된다.
abstract final class AppTheme {
  static final light = _build(
    brightness: Brightness.light,
    scheme: const ColorScheme(
      brightness: Brightness.light,
      primary: AppColors.primary,
      onPrimary: AppColors.onPrimary,
      primaryContainer: AppColors.primaryContainer,
      onPrimaryContainer: AppColors.onPrimaryContainer,
      inversePrimary: AppColors.inversePrimary,
      secondary: AppColors.secondary,
      onSecondary: AppColors.onSecondary,
      secondaryContainer: AppColors.secondaryContainer,
      onSecondaryContainer: AppColors.onSecondary,
      // tertiary = 블루 계열. 실수로 colorScheme.tertiary를 써도 노랑이 나오지 않는다.
      tertiary: AppColors.secondary,
      onTertiary: AppColors.onSecondary,
      tertiaryContainer: AppColors.surfaceContainerHigh,
      onTertiaryContainer: AppColors.onSurface,
      error: AppColors.error,
      onError: AppColors.onError,
      errorContainer: AppColors.errorContainer,
      onErrorContainer: AppColors.onErrorContainer,
      surface: AppColors.surface,
      onSurface: AppColors.onSurface,
      onSurfaceVariant: AppColors.onSurfaceVariant,
      surfaceContainerLowest: AppColors.surfaceContainerLowest,
      surfaceContainerLow: AppColors.surfaceContainerLow,
      surfaceContainer: AppColors.surfaceContainer,
      surfaceContainerHigh: AppColors.surfaceContainerHigh,
      surfaceContainerHighest: AppColors.surfaceContainerHigh,
      outline: AppColors.outline,
      outlineVariant: AppColors.outlineVariant,
    ),
    reward: RewardTheme.light,
  );

  static final dark = _build(
    brightness: Brightness.dark,
    scheme: const ColorScheme(
      brightness: Brightness.dark,
      primary: AppColors.inversePrimary,
      onPrimary: AppColors.onPrimaryContainer,
      primaryContainer: AppColors.primary,
      onPrimaryContainer: AppColors.onPrimary,
      inversePrimary: AppColors.primary,
      secondary: AppColors.secondaryContainer,
      onSecondary: AppColors.onSecondary,
      secondaryContainer: AppColors.secondary,
      onSecondaryContainer: AppColors.onSecondary,
      tertiary: AppColors.secondaryContainer,
      onTertiary: AppColors.onSecondary,
      tertiaryContainer: AppColors.darkSurfaceContainerHigh,
      onTertiaryContainer: AppColors.darkOnSurface,
      error: AppColors.darkError,
      onError: AppColors.darkOnError,
      errorContainer: AppColors.darkErrorContainer,
      onErrorContainer: AppColors.darkOnErrorContainer,
      surface: AppColors.darkSurface,
      onSurface: AppColors.darkOnSurface,
      onSurfaceVariant: AppColors.darkOnSurfaceVariant,
      surfaceContainerLowest: AppColors.darkSurfaceContainerLowest,
      surfaceContainerLow: AppColors.darkSurfaceContainerLow,
      surfaceContainer: AppColors.darkSurfaceContainer,
      surfaceContainerHigh: AppColors.darkSurfaceContainerHigh,
      surfaceContainerHighest: AppColors.darkSurfaceContainerHigh,
      outline: AppColors.darkOutline,
      outlineVariant: AppColors.darkOutlineVariant,
    ),
    reward: RewardTheme.dark,
  );

  static ThemeData _build({
    required Brightness brightness,
    required ColorScheme scheme,
    required RewardTheme reward,
  }) {
    final textTheme = AppTypography.textTheme.apply(
      bodyColor: scheme.onSurface,
      displayColor: scheme.onSurface,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: scheme.surface,
      fontFamily: AppTypography.family,
      textTheme: textTheme,
      extensions: [reward],

      iconTheme: IconThemeData(size: 24, color: scheme.onSurfaceVariant),

      cardTheme: CardThemeData(
        color: scheme.surfaceContainerLowest,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.mdAll,
          side: BorderSide(color: scheme.outlineVariant),
        ),
      ),

      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
          shape: const RoundedRectangleBorder(borderRadius: AppRadius.mdAll),
          textStyle: AppTypography.labelMedium,
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          foregroundColor: scheme.secondary,
          side: BorderSide(color: scheme.secondary, width: 1.5),
          shape: const RoundedRectangleBorder(borderRadius: AppRadius.mdAll),
          textStyle: AppTypography.labelMedium,
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: scheme.secondary,
          textStyle: AppTypography.labelMedium,
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: scheme.surfaceContainerLow,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.md,
        ),
        border: OutlineInputBorder(
          borderRadius: AppRadius.mdAll,
          borderSide: BorderSide(color: scheme.outlineVariant),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppRadius.mdAll,
          borderSide: BorderSide(color: scheme.outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppRadius.mdAll,
          borderSide: BorderSide(color: scheme.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: AppRadius.mdAll,
          borderSide: BorderSide(color: scheme.error),
        ),
        hintStyle: AppTypography.bodyMedium.copyWith(
          color: scheme.onSurfaceVariant,
        ),
      ),

      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: scheme.surfaceContainerLowest,
        surfaceTintColor: Colors.transparent,
        shadowColor: Colors.transparent,
        elevation: 0,
        height: 72,
        indicatorColor: scheme.primary,
        indicatorShape: const RoundedRectangleBorder(
          borderRadius: AppRadius.mdAll,
        ),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            size: 24,
            color: selected ? scheme.onPrimary : scheme.onSurfaceVariant,
          );
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return AppTypography.labelSmall.copyWith(
            color: selected ? scheme.primary : scheme.onSurfaceVariant,
          );
        }),
      ),

      dividerTheme: DividerThemeData(
        color: scheme.outlineVariant,
        thickness: 1,
        space: 1,
      ),

      chipTheme: ChipThemeData(
        shape: const StadiumBorder(),
        labelStyle: AppTypography.labelSmall,
        side: BorderSide(color: scheme.outlineVariant),
      ),

      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.mdAll),
        contentTextStyle: AppTypography.bodySmall.copyWith(
          color: scheme.surface,
        ),
      ),

      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: scheme.primary,
        linearTrackColor: scheme.primaryContainer.withValues(alpha: 0.15),
        linearMinHeight: 12,
      ),
    );
  }
}
