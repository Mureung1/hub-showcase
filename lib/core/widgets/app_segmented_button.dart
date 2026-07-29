import 'package:flutter/material.dart';

import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import 'gradient_button.dart';

/// [AppSegmentedButton]의 세그먼트 하나 — 값 + 화면에 보일 라벨.
///
/// [selectedColor]·[selectedForeground]는 **선택됐을 때만** 쓰인다. 둘 다 비우면
/// 기본값(🟢 그린 그라디언트 + 흰 글자)이라 상점 필터처럼 "고른 칸"만 표시하면 되는
/// 자리는 아무것도 주지 않는다.
///
/// 색을 **호출부가 주입**하는 이유: 난이도 세그먼트는 선택 칸을 난이도 색(쉬움 그린 /
/// 보통 노랑 / 어려움 빨강)으로 칠해야 하는데, 그렇다고 이 제네릭 위젯이 `Difficulty`를
/// 알게 되면 상점 필터·다른 목록에도 난이도 개념이 끌려 들어온다.
@immutable
class AppSegment<T> {
  const AppSegment({
    required this.value,
    required this.label,
    this.selectedColor,
    this.selectedForeground,
  }) : assert(
         (selectedColor == null) == (selectedForeground == null),
         '선택 배경색과 글자색은 한 쌍이다 — 한쪽만 주면 대비를 보장할 수 없다.',
       );

  final T value;
  final String label;

  /// 선택됐을 때 칸을 채우는 **단색.** null이면 기본 그린 그라디언트.
  final Color? selectedColor;

  /// [selectedColor] 위에 얹는 글자 색. 호출부가 대비를 책임진다.
  final Color? selectedForeground;
}

/// Figma 정본 `SegmentedButton`(`40:250` · 상점 인스턴스 `43:259`) — **선택된 칸만
/// 칠한다.**
///
/// Material의 [SegmentedButton]을 쓰지 않는 이유는 두 가지다.
/// 1. 앱에 `segmentedButtonTheme`가 없어 M3 기본값이 나오는데, 그 기본 선택색이
///    `secondaryContainer`(🔵 블루)다. 블루는 **AI·정보 전용**이라 "내가 고른 값"을
///    칠하는 데 쓰면 색 역할이 무너진다. 정본은 이 자리를 🟢 그린으로 지정한다.
/// 2. 정본의 선택 칸은 **그라디언트**(`#006e2f → #22c55e`)인데,
///    [SegmentedButton]의 `backgroundColor`는 단색만 받는다.
///
/// 기본 색은 [GradientButtonStyle.growth]에서 가져온다 — 그린 그라디언트의 정의를
/// 주 버튼과 한곳에 둔다(같은 그린 쌍이 두 군데서 따로 늙지 않게). 칸마다 다른 색이
/// 필요하면 [AppSegment.selectedColor]로 주입한다.
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
    this.expand = false,
  });

  final List<AppSegment<T>> segments;

  /// 지금 선택된 값. 항상 하나다(다중 선택은 이 위젯의 관심사가 아니다).
  final T selected;

  /// null이면 **비활성** — 눌리지 않고 흐려진다.
  final ValueChanged<T>? onChanged;

  /// true면 주어진 폭을 칸들이 **균등 분할**한다(정본 상점 필터 `43:259`가 350폭을
  /// 셋으로 나눈 모습). false면 칸이 라벨만큼만 넓다.
  ///
  /// `Row`+`Expanded`로 나누지 않는 이유: 그러면 큰 글꼴 배율에서 라벨이 칸을 넘겨
  /// 오버플로가 난다. 대신 **최소 폭만** 걸어 두면 평소에는 균등 분할이고, 라벨이
  /// 그보다 넓어지면 `Wrap`이 칸을 통째로 다음 줄로 내려보낸다.
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final enabled = onChanged != null;

    return Opacity(
      // 비활성 표현은 [GradientButton]과 같은 규칙(같은 그라디언트를 흐리게)이다.
      opacity: enabled ? 1 : 0.4,
      child: expand
          ? LayoutBuilder(
              builder: (context, constraints) =>
                  _bar(context, _segmentWidths(context, constraints.maxWidth)),
            )
          : _bar(context, null),
    );
  }

  /// 칸별 **최소** 폭. 합이 정확히 [maxWidth]가 되도록 잡아, 바가 부모 폭을 꽉 채우고
  /// 좌우 끝이 같은 열의 입력 필드와 맞는다.
  ///
  /// 세 갈래다.
  /// 1. 라벨들이 애초에 한 줄에 안 들어가면 **최소 폭을 걸지 않는다**(null). 걸어 봐야
  ///    칸이 밀려 내려갈 뿐이고, 그 상황의 정답은 [Wrap]의 줄바꿈이다.
  /// 2. 가장 넓은 라벨이 균등 몫 안에 들어가면 **균등 분할**한다(정본 상점 필터
  ///    `43:259`의 350폭 3분할). 나누어떨어지지 않는 나머지는 **마지막 칸**이 받는다 —
  ///    내림만 하면 오른쪽 끝에 배경이 몇 px 비쳐 둥근 캡이 잘려 보인다.
  /// 3. 한 칸이 균등 몫보다 넓으면(난이도의 "어려움", 또는 큰 글꼴 배율) 균등 몫을
  ///    고집하지 않는다. 고집하면 `합 > maxWidth`가 되어 **한 줄에 들어갈 수 있는데도**
  ///    칸이 다음 줄로 내려가고, 그러면 바가 되레 좁아져 정렬이 다시 깨진다. 대신 각
  ///    칸에 제 라벨 폭을 주고 **남는 여백만 균등 배분**한다.
  List<double>? _segmentWidths(BuildContext context, double maxWidth) {
    if (!maxWidth.isFinite || segments.isEmpty) return null;

    final natural = _naturalWidths(context);
    final naturalTotal = natural.fold<double>(0, (a, b) => a + b);
    // (1) 한 줄에 못 들어간다 → Wrap에 맡긴다.
    if (naturalTotal > maxWidth) return null;

    final count = segments.length;
    final base = (maxWidth / count).floorToDouble();
    // (2) 균등 분할.
    if (natural.every((w) => w <= base)) {
      return [
        for (var i = 0; i < count; i++)
          i == count - 1 ? maxWidth - base * (count - 1) : base,
      ];
    }

    // (3) 라벨 폭 + 남는 여백 균등 배분. 마지막 칸이 나머지를 받아 합을 정확히
    // maxWidth로 맞춘다(부동소수 누적으로 1px이라도 넘치면 줄이 바뀐다).
    final slack = ((maxWidth - naturalTotal) / count).floorToDouble();
    final widths = [for (var i = 0; i < count - 1; i++) natural[i] + slack];
    final used = widths.fold<double>(0, (a, b) => a + b);
    return [...widths, maxWidth - used];
  }

  /// 칸이 라벨을 자르지 않고 담는 데 필요한 폭 — 텍스트 실측 + 좌우 패딩.
  /// [_Segment]와 **같은 스타일·같은 배율**로 재야 한다(어긋나면 실제 칸이 잰 값보다
  /// 넓어져 줄이 바뀐다). 올림해 소수점 오차 쪽으로 안전하게 둔다.
  List<double> _naturalWidths(BuildContext context) {
    final theme = Theme.of(context);
    final style = theme.textTheme.labelMedium;
    final scaler = MediaQuery.textScalerOf(context);
    const padding = AppSpacing.lg * 2;

    return [
      for (final segment in segments)
        (TextPainter(
                  text: TextSpan(text: segment.label, style: style),
                  textDirection: Directionality.of(context),
                  textScaler: scaler,
                  maxLines: 1,
                )..layout())
                .width
                .ceilToDouble() +
            padding,
    ];
  }

  Widget _bar(BuildContext context, List<double>? widths) {
    final scheme = Theme.of(context).colorScheme;
    final enabled = onChanged != null;

    return Material(
      color: scheme.surfaceContainerLow,
      // 라운드 full + 보더 + 클립: 선택 칸의 채움이 바깥 알약 모양을 넘지 않도록
      // 컨테이너가 직접 잘라 낸다(정본 실측).
      shape: RoundedRectangleBorder(
        borderRadius: AppRadius.fullAll,
        side: BorderSide(color: scheme.outlineVariant),
      ),
      clipBehavior: Clip.antiAlias,
      child: Wrap(
        children: [
          for (var i = 0; i < segments.length; i++)
            _Segment(
              label: segments[i].label,
              selected: segments[i].value == selected,
              selectedColor: segments[i].selectedColor,
              selectedForeground: segments[i].selectedForeground,
              minWidth: widths?[i] ?? 0,
              onTap: enabled ? () => onChanged!(segments[i].value) : null,
            ),
        ],
      ),
    );
  }
}

/// 세그먼트 상하 패딩(Figma 실측 10). 8·12 어느 토큰과도 다른 값이라 이 파일 안의
/// 상수로 둔다.
const double _segmentPaddingV = 10;

/// 선택 칸의 기본 그린 그라디언트. 색 쌍은 [GradientButtonStyle.growth]가 정본이라
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
    required this.selectedColor,
    required this.selectedForeground,
    required this.minWidth,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final Color? selectedColor;
  final Color? selectedForeground;

  /// 0이면 라벨만큼만 넓다. 그 이상이면 **최소 폭**이라 라벨이 더 넓으면 라벨이 이긴다.
  final double minWidth;

  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final foreground = selected
        ? (selectedForeground ?? GradientButtonStyle.growth.foreground)
        : theme.colorScheme.onSurfaceVariant;

    return Semantics(
      button: true,
      selected: selected,
      child: ConstrainedBox(
        constraints: BoxConstraints(minWidth: minWidth),
        child: InkWell(
          onTap: onTap,
          child: Ink(
            decoration: selected
                ? BoxDecoration(
                    color: selectedColor,
                    // 색을 주입받았으면 단색, 아니면 기본 그린 그라디언트.
                    gradient: selectedColor == null ? _selectedGradient : null,
                  )
                : null,
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: _segmentPaddingV,
              ),
              // `widthFactor: 1`이라 라벨만큼만 넓어지되, 부모가 준 최소 폭이 더 크면
              // 그만큼 늘어나며 라벨을 **가운데** 둔다(정본 정렬). widthFactor를 비우면
              // 최소 폭이 아니라 **최대 폭**까지 늘어나 칸 하나가 바를 다 먹는다.
              child: Align(
                widthFactor: 1,
                heightFactor: 1,
                child: Text(
                  label,
                  textAlign: TextAlign.center,
                  // 14/700 ls 0.14 — 정본 실측과 같은 값이 labelMedium이다.
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: foreground,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
