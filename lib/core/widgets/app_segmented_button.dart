import 'package:flutter/material.dart';

import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import 'gradient_button.dart';

/// [AppSegmentedButton]의 세그먼트 하나 — 값 + 화면에 보일 라벨.
@immutable
class AppSegment<T> {
  const AppSegment({required this.value, required this.label});

  final T value;
  final String label;
}

/// Figma 정본 `SegmentedButton`(`40:250`) — **선택된 칸만 그린 그라디언트.**
///
/// Material의 [SegmentedButton]을 쓰지 않는 이유는 두 가지다.
/// 1. 앱에 `segmentedButtonTheme`가 없어 M3 기본값이 나오는데, 그 기본 선택색이
///    `secondaryContainer`(🔵 블루)다. 블루는 **AI·정보 전용**이라 "내가 고른 값"을
///    칠하는 데 쓰면 색 역할이 무너진다. 정본은 이 자리를 🟢 그린으로 지정한다.
/// 2. 정본의 선택 칸은 **그라디언트**(`#006e2f → #22c55e`)인데,
///    [SegmentedButton]의 `backgroundColor`는 단색만 받는다.
///
/// 색은 [GradientButtonStyle.growth]에서 가져온다 — 그린 그라디언트의 정의를
/// 주 버튼과 한곳에 둔다(같은 그린 쌍이 두 군데서 따로 늙지 않게).
///
/// **바깥은 `Row`가 아니라 `Wrap`이다.** 세그먼트는 좌우 패딩 24 + 14px 라벨이라
/// 글꼴 배율을 키우면 세 칸 합이 좁은 단말 폭을 넘긴다(배율 1.3 · 폭 320에서 이미
/// 넘친다). 폭이 모자라면 칸을 통째로 다음 줄로 내려보낸다 — [CoinPill]·`RewardChip`이
/// 쓴 것과 같은 처방이고, 배율 1.0에서의 배치는 `Row`와 같다.
class AppSegmentedButton<T> extends StatelessWidget {
  const AppSegmentedButton({
    super.key,
    required this.segments,
    required this.selected,
    required this.onChanged,
  });

  final List<AppSegment<T>> segments;

  /// 지금 선택된 값. 항상 하나다(다중 선택은 이 위젯의 관심사가 아니다).
  final T selected;

  /// null이면 **비활성** — 눌리지 않고 흐려진다.
  final ValueChanged<T>? onChanged;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final enabled = onChanged != null;

    return Opacity(
      // 비활성 표현은 [GradientButton]과 같은 규칙(같은 그라디언트를 흐리게)이다.
      opacity: enabled ? 1 : 0.4,
      child: Material(
        color: scheme.surfaceContainerLow,
        // 라운드 full + 보더 + 클립: 선택 칸의 그라디언트가 바깥 알약 모양을
        // 넘지 않도록 컨테이너가 직접 잘라 낸다(정본 실측).
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.fullAll,
          side: BorderSide(color: scheme.outlineVariant),
        ),
        clipBehavior: Clip.antiAlias,
        child: Wrap(
          children: [
            for (final segment in segments)
              _Segment(
                label: segment.label,
                selected: segment.value == selected,
                onTap: enabled ? () => onChanged!(segment.value) : null,
              ),
          ],
        ),
      ),
    );
  }
}

/// 세그먼트 상하 패딩(Figma 실측 10). 8·12 어느 토큰과도 다른 값이라 이 파일 안의
/// 상수로 둔다.
const double _segmentPaddingV = 10;

/// 선택 칸의 그린 그라디언트. 색 쌍은 [GradientButtonStyle.growth]가 정본이라
/// 여기서 새 HEX를 만들지 않고 그 값을 그대로 편다.
final _selectedGradient = LinearGradient(
  begin: Alignment.centerLeft,
  end: Alignment.centerRight,
  colors: [GradientButtonStyle.growth.from, GradientButtonStyle.growth.to],
);

class _Segment extends StatelessWidget {
  const _Segment({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    const style = GradientButtonStyle.growth;

    return Semantics(
      button: true,
      selected: selected,
      child: InkWell(
        onTap: onTap,
        child: Ink(
          decoration: selected
              ? BoxDecoration(gradient: _selectedGradient)
              : null,
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.lg,
              vertical: _segmentPaddingV,
            ),
            child: Text(
              label,
              // 14/700 ls 0.14 — 정본 실측과 같은 값이 labelMedium이다.
              style: theme.textTheme.labelMedium?.copyWith(
                color: selected
                    ? style.foreground
                    : theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
