import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';

/// [GradientButton]의 색 변형.
///
/// 변형을 열거형이 아니라 **값 객체**로 둔 이유: 색 역할이 늘어날 때(AI 블루 등)
/// 위젯 코드의 `switch`를 건드리지 않고 상수 하나만 추가하면 된다. 색 역할 규칙상
/// 그린(성장·완료·주요 행동)과 블루(AI·정보·보조 행동)는 서로 대체할 수 없으므로,
/// 호출부가 어느 역할인지 **명시적으로** 고르게 만드는 편이 안전하다.
@immutable
class GradientButtonStyle {
  const GradientButtonStyle({
    required this.from,
    required this.to,
    required this.foreground,
    required this.shadow,
  });

  /// 그라디언트 시작색(왼쪽).
  final Color from;

  /// 그라디언트 끝색(오른쪽).
  final Color to;

  /// 아이콘·글자 색.
  final Color foreground;

  /// 떠 있는 느낌을 내는 드롭섀도.
  final List<BoxShadow> shadow;

  /// 🟢 그린 — 성장 · 완료 · 주요 행동. 홈의 「오늘의 퀘스트」가 이 변형이다.
  static const growth = GradientButtonStyle(
    from: AppColors.primary,
    to: AppColors.primaryContainer,
    foreground: AppColors.onPrimary,
    shadow: AppColors.primaryButtonShadow,
  );

  /// 🔵 블루 — **AI 진입점 전용.** 퀘스트 목록 상단 프로모의 「분해하기」,
  /// AI 분해 화면의 「분해하기」가 이 변형이다.
  ///
  /// [growth]와 나란히 놓여도 역할이 갈린다: 그린은 "내가 해낸다"(완료·등록),
  /// 블루는 "AI에게 맡긴다"(분해). 같은 화면에 둘 다 있어도 색만 보고 고를 수 있다.
  static const ai = GradientButtonStyle(
    from: AppColors.secondary,
    to: AppColors.secondaryContainer,
    foreground: AppColors.onSecondary,
    shadow: AppColors.secondaryButtonShadow,
  );
}

/// 그라디언트 + 드롭섀도 주 버튼.
///
/// 평평한 `FilledButton`과 달리 화면에서 **한 눈에 먼저 보이는 자리**를 맡는다.
/// 색은 [GradientButtonStyle]이 정하고, 이 위젯은 모양(높이·라운드·여백·정렬)만
/// 안다 — 나중에 블루 변형이 붙어도 여기는 그대로다.
///
/// **높이는 최소값이다.** Figma 실측 56을 고정 높이로 박으면 글꼴 배율을 키운
/// 사용자에게서 글자가 잘린다. 배율이 커지면 아래로 늘어나게 둔다.
class GradientButton extends StatelessWidget {
  const GradientButton({
    super.key,
    required this.onPressed,
    required this.label,
    this.icon,
    this.style = GradientButtonStyle.growth,
    this.busy = false,
  });

  /// null이면 비활성 — 눌리지 않고 그림자도 걷힌다.
  final VoidCallback? onPressed;

  final String label;
  final IconData? icon;
  final GradientButtonStyle style;

  /// 이 버튼이 시작한 요청이 **아직 날아가 있는가.** true면 라벨 자리에 스피너가
  /// 돌고 버튼이 잠긴다(중복 실행 방지의 시각화).
  ///
  /// [onPressed]를 null로 주는 것만으로는 부족하다 — 비활성은 "지금은 누를 수 없다"만
  /// 말할 뿐, "네 탭이 이미 처리 중"이라는 사실은 말해 주지 않는다.
  final bool busy;

  /// Figma 실측 높이(최소값).
  static const double minHeight = 56;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final enabled = onPressed != null && !busy;

    final content = busy
        // 진행 중: 아이콘·라벨을 치우고 스피너만. 크기를 라벨 높이에 맞춰 고정해
        // 버튼이 들썩이지 않게 한다.
        ? SizedBox(
            width: _spinnerSize,
            height: _spinnerSize,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: style.foreground,
            ),
          )
        : Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 20, color: style.foreground),
                AppSpacing.gapWSm,
              ],
              // 긴 라벨·큰 배율에서 가로로 넘치지 않도록 유연하게 둔다.
              Flexible(
                child: Text(
                  label,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: style.foreground,
                  ),
                ),
              ),
            ],
          );

    return Opacity(
      // 비활성은 색을 따로 만들지 않고 같은 그라디언트를 흐리게 둔다 — 변형이
      // 늘어나도 비활성 팔레트를 변형마다 정의할 필요가 없다.
      opacity: enabled ? 1 : 0.4,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
            colors: [style.from, style.to],
          ),
          borderRadius: AppRadius.mdAll,
          boxShadow: enabled ? style.shadow : null,
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: enabled ? onPressed : null,
            borderRadius: AppRadius.mdAll,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: minHeight),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.lg,
                  vertical: AppSpacing.sm,
                ),
                child: Center(child: content),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// 진행 스피너 지름 — 라벨 한 줄과 같은 높이.
const double _spinnerSize = 20;
