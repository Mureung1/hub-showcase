import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../constants/reward_rules.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import 'reward_chip.dart';

/// 축하 연출의 **보상 표시 카드** — 방금 받은 코인·XP를 주인공으로 보여 준다
/// (one-step-design `screens.md` "퀘스트 완료 / 인증 화면"의 보상 표시 카드).
///
/// 퀘스트 완료 연출과 연속 출석 보너스 연출이 **같은 카드**를 쓴다. 축하가 두 가지
/// 모양으로 갈라지면 사용자가 매번 "이건 뭘 받은 화면이지?"를 다시 읽어야 한다.
///
/// **왜 위젯으로 뽑았나 — 폭 규칙을 한 곳에 가둬 두기 위해서다.**
/// [RewardChip]의 확대 표시([RewardChip.large])는 아이콘 28px + `titleLarge`라
/// 글꼴 배율까지 얹히면 코인·XP 묶음 하나가 다이얼로그 안쪽 폭을 통째로 넘는다
/// (E-4 D-3: 배율 2.0 · 폭 320dp에서 70px 오버플로). 그런데 [RewardChip] 안쪽
/// 묶음은 **일부러** 접히지 않게 만들어져 있다 — 아이콘과 숫자가 서로 다른 줄로
/// 갈라지면 "🪙"와 "+10"이 남남처럼 읽히기 때문이다(`reward_chip.dart` 주석).
/// 그래서 칩을 고치는 대신 **부르는 쪽에서 폭 예산을 정한다.**
///
/// 회귀 방어: `test/features/text_scale_layout_test.dart`,
/// `test/features/reward_showcase_test.dart`.
class RewardShowcase extends StatelessWidget {
  const RewardShowcase({super.key, required this.reward});

  /// 표시할 보상. **지급한 쪽이 돌려준 실지급액**을 그대로 넘긴다
  /// (이 위젯은 난이도로 다시 계산하지 않는다).
  final Reward reward;

  /// 보상 숫자에 얹는 글꼴 배율의 상한.
  ///
  /// 1.3 = 안드로이드 "글꼴 크게" 한 단계. 확대 표시(`titleLarge` 20px + 아이콘 28px)에
  /// 이 배율까지 얹어도 가장 좁은 단말(320dp)의 다이얼로그 안쪽 폭에 들어간다는 것이
  /// 실측으로 확인돼 있다.
  ///
  /// **왜 확대를 끄지 않고 배율만 묶는가.** 예전에는 상한을 넘는 사용자에게
  /// `large: false`(12px + 아이콘 14px)로 떨어뜨렸다. 그러면 배율 1.4 사용자가 보는
  /// 실효 크기가 16.8px이라 **아무 설정도 안 한 사용자(20px)보다 작아진다** —
  /// 접근성 설정을 켠 사람에게만 보상이 주인공 자리에서 밀려나는 역전이다.
  /// 1.3↔1.4 경계에서 26px → 16.8px로 급락하는 불연속도 같은 원인이다.
  /// 지금은 확대 표시를 **항상** 유지하고, 폭이 감당 못 하는 부분만 배율 상한으로
  /// 자른다. 결과는 배율이 올라갈수록 실효 크기가 커지거나 그대로인 단조 비감소이고,
  /// 어떤 배율에서도 기본 사용자보다 작아지지 않는다.
  static const double _maxRewardTextScale = 1.3;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final media = MediaQuery.of(context);
    // scale(1)이 곧 배율이다(선형 배율 기준). 시스템 글꼴 설정을 그대로 읽는다.
    final textScale = media.textScaler.scale(1);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.md,
      ),
      decoration: BoxDecoration(
        // 보더 없는 보상 카드 — 다크 다이얼로그 면(`#13263D`)과 L* 차가 2.8뿐이라
        // 축하 연출의 주인공 카드가 배경에 녹아 있었다
        // ([AppSurfaceRoles.insetSurface]가 다크에서만 한 단 올린다).
        color: theme.colorScheme.insetSurface,
        borderRadius: AppRadius.mdAll,
      ),
      child: Center(
        // 상한은 **이 카드 안쪽에만** 적용한다. 같은 다이얼로그의 제목·설명은 사용자가
        // 고른 배율을 그대로 따른다 — 읽어야 할 문장을 대신 줄이지는 않는다.
        child: MediaQuery(
          data: media.copyWith(
            textScaler: TextScaler.linear(
              math.min(textScale, _maxRewardTextScale),
            ),
          ),
          child: RewardChip(reward: reward, large: true),
        ),
      ),
    );
  }
}

/// 축하 다이얼로그(완료 · 연속 출석)의 바깥 여백.
///
/// Material 기본값은 좌우 40px이라 320dp 단말에서 **화면 폭의 4분의 1**을 여백으로
/// 버린다. 보상 카드처럼 가로로 긴 내용이 들어가는 축하 연출에서는 그 여백이 곧
/// 오버플로가 된다(E-4 D-3). 좌우를 토큰값으로 좁혀 안쪽 폭을 48px 되찾는다.
const EdgeInsets kCelebrationDialogInset = EdgeInsets.symmetric(
  horizontal: AppSpacing.md,
  vertical: AppSpacing.lg,
);
