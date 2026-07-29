import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import '../theme/app_typography.dart';
import '../theme/reward_colors.dart';

/// stat 카드의 색 역할. 아이콘 칩과 수치 색이 여기서 갈린다.
///
/// 🟡 [reward]가 **노랑을 쓰는 유일한 이유**다 — 코인·보상·스트릭은 노랑 전용
/// 영역이고, 이 카드가 세 화면(홈·보관함·MY)에서 그 수치를 그린다. 그래서
/// 화면 파일이 아니라 **이 위젯 하나만** `color_role_test`의 allowlist에 오른다.
enum StatAccent {
  /// 성장·완료 계열(그린). 완료한 도전 수 등.
  growth,

  /// 코인·보상·스트릭 계열(🟡 노랑).
  reward,
}

/// 아이콘 칩 + 라벨 + 큰 수치로 이루어진 통계 카드.
///
/// 홈(코인·연속)·보관함(완료·연속 일수)·MY(완료한 도전·연속 출석)가 **같은 모양**을
/// 쓰도록 공통화했다. 이전에는 화면마다 `_SummaryCard`/`_StatCard`/`_Stat`을 따로
/// 들고 있어서 셋의 생김새가 조금씩 어긋났다.
///
/// **배치는 세로가 아니라 가로다** (Figma 정본 `StatCard` `20:69` · 인스턴스는 홈
/// `65:439` · MY `47:417` · 보관함 `45:334`). 실측 169×78 = 패딩 16 + 아이콘 칩 32와
/// **나란한** 글자 묶음(라벨 12/16 + 간격 2 + 수치 20/28 = 46) + 패딩 16. 예전에는
/// 칩을 위에 얹은 세로 배치라 같은 내용이 120dp를 먹었고, 두 칸이 화면의 한 블록을
/// 통째로 차지해 정본과 인상이 달랐다.
///
/// 실제 렌더 높이는 80이다 — Figma는 1px 스트로크를 박스 **안쪽**에 그리지만
/// Flutter의 `BoxDecoration.border`는 패딩 바깥에 1px씩 더한다. 2dp 차이라 패딩을
/// 15로 깎아 맞추지 않는다(그러면 다른 카드들과 내부 여백이 어긋난다).
///
/// **서체 규칙.** [value]는 숫자만 오는 자리라 수치 서체(Sora)로 그린다. 단위처럼
/// 붙는 한글은 [suffix]로 따로 받아 기본 서체(Pretendard)로 그린다 — Sora에는 한글
/// 글리프가 없다. 수치가 아닌 문구(예: '아직 없음')를 넣어야 하면 [numeric]을
/// false로 준다.
///
/// 값과 단위를 두 위젯이 아니라 **한 `Text.rich`의 두 span**으로 그리는 이유:
/// 글꼴 배율을 키운 사용자의 좁은 카드에서 자연스럽게 줄바꿈되고, 두 조각이 서로
/// 다른 줄로 갈라져도 같은 문단 안에 남는다(고정폭 `Row`였다면 넘쳤다).
class StatCard extends StatelessWidget {
  const StatCard({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    this.suffix,
    this.numeric = true,
    this.accent = StatAccent.growth,
  });

  final IconData icon;

  /// 한글 라벨('코인' · '연속 일수' …). 기본 서체로 그린다.
  final String label;

  /// 수치 본문. [numeric]이 true면 Sora로 그리므로 **한글을 넣지 말 것.**
  final String value;

  /// 값 뒤에 붙는 한글 단위('일' 등). 기본 서체로 그린다.
  final String? suffix;

  /// [value]가 숫자인가. false면 [value]도 기본 서체로 그린다('아직 없음' 등).
  final bool numeric;

  final StatAccent accent;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final reward = theme.reward;

    final isDark = theme.brightness == Brightness.dark;
    final isReward = accent == StatAccent.reward;
    // 아이콘 칩은 **배경·전경이 한 쌍**이라 항상 둘을 같이 고른다. 한쪽만 테마를
    // 따라가면 밝은 그린이 밝은 칩 위에 얹혀 읽히지 않는다.
    //
    // 전경은 스킴을 쓴다 — 라이트는 [AppColors.primary]와 같은 값이고, 다크는
    // 밝은 그린(`#4ae176`)으로 이미 뒤집혀 있다.
    final iconColor = isReward ? reward.coin : scheme.primary;
    // 칩 배경. 노랑 쪽은 [CoinPill]과 같은 틴트 규칙을 써서 나란히 놓였을 때 두
    // 위젯의 노랑이 갈라져 보이지 않게 한다(알파 파생이라 다크에서 알아서 어두워진다).
    // 그린 쪽 [AppColors.primarySurface](`#e9f9ef`)는 **라이트 전용 옅은 틴트**라
    // 다크 카드 위에 밝은 판이 뜬다 — 다크는 중립 램프의 높은 단으로 받는다
    // (밝은 그린 아이콘 대비 6.77:1).
    final chipColor = isReward
        ? reward.coinGlow.withValues(alpha: 0.22)
        : (isDark ? scheme.surfaceContainerHigh : AppColors.primarySurface);
    // 수치 색. 노랑 원색(#EF9900)은 흰 배경에서 본문 대비를 못 내므로, 라이트는
    // 코인 pill이 쓰는 진한 갈색(onCoin `#5c3800`)을 그대로 쓴다.
    //
    // ⚠️ 다크에서 그 갈색은 카드(`#13263D`) 위 **1.47:1**이라 읽히지 않는다.
    // `onCoin`은 "밝은 코인색 **위에** 얹는 글자"라 다크에서도 그 값이 맞고
    // (`#ffb95f` 위 6.12:1), 틀린 것은 여기서 그것을 **면 위 글자**로 쓴 쪽이다.
    // [CoinPill]·[CoinPrice]가 쓰는 처방을 그대로 따라 밝은 코인색을 쓴다(9.00:1).
    final valueColor = isReward
        ? (isDark ? reward.coin : reward.onCoin)
        : scheme.primary;

    final valueStyle = numeric
        ? AppTypography.numericTitleLarge
        : AppTypography.titleLarge;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLowest,
        borderRadius: AppRadius.mdAll,
        border: Border.all(color: scheme.outlineVariant),
        boxShadow: AppColors.softShadow,
      ),
      // 정본 실측: 칩 ↔ 글자 묶음 간격 12, 세로 중앙 정렬.
      child: Row(
        children: [
          _IconChip(icon: icon, color: iconColor, background: chipColor),
          AppSpacing.gapWSmd,
          // 남은 폭을 글자가 전부 받는다 — 글꼴 배율을 키우면 여기서 줄바꿈되고
          // 카드가 아래로 자란다(가로로 넘치지 않는다).
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: _labelToValueGap),
                Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(text: value, style: valueStyle),
                      if (suffix != null)
                        TextSpan(text: suffix, style: AppTypography.titleLarge),
                    ],
                    style: TextStyle(color: valueColor),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 라벨 ↔ 수치 사이 간격(정본 실측 2). 8px 리듬 밖의 값이라 토큰이 없다.
const double _labelToValueGap = 2;

/// 32×32 라운드 사각형 아이콘 칩.
class _IconChip extends StatelessWidget {
  const _IconChip({
    required this.icon,
    required this.color,
    required this.background,
  });

  final IconData icon;
  final Color color;
  final Color background;

  /// Figma 실측. 글꼴 배율에 따라 커지지 않는다 — 칩은 그림이지 글자가 아니다.
  static const double _size = 32;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: _size,
      height: _size,
      decoration: BoxDecoration(
        color: background,
        borderRadius: AppRadius.smAll,
      ),
      child: Icon(icon, size: 20, fill: 1, color: color),
    );
  }
}

/// 나란히 놓는 stat 카드 줄. 카드마다 높이가 달라도 아래 선이 맞도록 늘려 준다.
///
/// 세 화면이 모두 "2개를 반씩" 쓰지만, 개수를 고정하지 않고 목록으로 받는다.
class StatCardRow extends StatelessWidget {
  const StatCardRow({super.key, required this.cards});

  final List<StatCard> cards;

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var i = 0; i < cards.length; i++) ...[
            if (i > 0) AppSpacing.gapWSmd,
            Expanded(child: cards[i]),
          ],
        ],
      ),
    );
  }
}
