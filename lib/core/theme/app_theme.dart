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

      // 정본 AppBar(Redesign `65:421` 홈 · `66:444` 퀘스트 목록 · `43:251` 상점 ·
      // `45:330` 보관함 · `47:406` MY · `50:440` AI 분해)는 **평평한 surface 한 겹**이다
      // — 배경 `surface`(#f8f9ff), 구분선·그림자·틴트 없음, 좌우 여백 20.
      //
      // Material 3 기본값은 `scrolledUnderElevation: 3`이라 목록을 스크롤하는 순간
      // AppBar에 `surfaceTint`(= primary 그린)가 얹혀 **바 색이 초록으로 물든다.**
      // 정본에는 그 상태가 없으므로 틴트와 스크롤 엘리베이션을 모두 끈다.
      //
      // `toolbarHeight`는 여기서 정하지 않는다 — 제목이 32(`ScreenTitle`, 사용자
      // 결정)라 화면들이 `ScreenTitle.appBarHeight`(64)를 직접 준다. 정본 실측
      // (60/52)과는 그만큼 어긋나며, 그건 알고 내린 결정이다.
      appBarTheme: AppBarTheme(
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
        surfaceTintColor: Colors.transparent,
        shadowColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        // 정본 제목 x = 20(화면 좌우 여백과 같은 줄에 선다). Flutter 기본값은 16이라
        // AppBar 제목만 본문보다 4dp 안쪽으로 들어가 세로선이 어긋나 보였다.
        // ⚠️ leading(뒤로가기)이 있는 화면은 이 값이 leading **뒤에** 붙으므로
        //    화면 쪽에서 따로 좁힌다(`quest_split_screen` · `quest_create_screen`).
        titleSpacing: AppSpacing.screenH,
        iconTheme: IconThemeData(size: 24, color: scheme.onSurface),
        actionsIconTheme: IconThemeData(
          size: 24,
          color: scheme.onSurfaceVariant,
        ),
      ),

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
        // 입력 카운터(`0/60`, `0/200`)는 숫자만 있는 수치라 Sora로 쓴다.
        // Flutter가 helperStyle 기본값 위에 이 스타일을 merge하므로(input_decorator
        // `_getHelperStyle(...).merge(counterStyle)`), **패밀리만** 얹어 크기·색은
        // Material 기본값 그대로 둔다.
        counterStyle: AppTypography.numericOverlay,
      ),

      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: scheme.surfaceContainerLowest,
        surfaceTintColor: Colors.transparent,
        shadowColor: Colors.transparent,
        elevation: 0,
        // 88 — 라벨이 두 줄로 접히지 않을 여유 + 하단 제스처 영역(Figma 리디자인).
        height: 88,
        indicatorColor: scheme.primary,
        // **full radius(스타디움)다 — 표준 12가 아니다.**
        //
        // 정본 `22:151`의 활성 탭 표시는 `rect w53.78 h32 rx16` — 높이의 절반이
        // 곧 반지름이라 양 끝이 완전한 반원인 알약이다. `tokens.md`도 "상태 pill·
        // 칩·진행바 캡은 full"이라 같은 편에 선다.
        //
        // ⚠️ `components.md:13`은 "활성 탭: 라운드(12px)"라고 적혀 있어 정본과
        //    어긋난다. 그 문단은 리디자인 이전 스펙이다(같은 문단의 `primary-
        //    container` 배경 · 흰 라벨도 지금 코드·정본과 다르다). Redesign 페이지를
        //    따른다.
        indicatorShape: const StadiumBorder(),
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
