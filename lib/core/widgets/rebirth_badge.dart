import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../constants/growth_rules.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';

/// 환생 표식 — ★ N · {등급}. 환생 횟수와 등급 타이틀을 함께 보여 준다.
///
/// 🟡 노랑 금지 위젯이다. 표식은 코인·보상이 아니라 **성장의 훈장**이라 그린 계열
/// (`primaryContainer`) 틴트를 쓴다.
///
/// **홈 히어로 좌상단 오버레이와 MY 캐릭터 블록이 같은 배지를 쓴다.** 예전에는 홈의
/// `character_card.dart` 안에 private로만 있어서 MY는 같은 내용을 맨 텍스트로 따로
/// 그렸고, 두 화면의 환생 표시가 서로 다르게 보였다([LevelPill]을 올린 것과 같은
/// 이유로 여기로 옮겼다 — 복제하면 반드시 어긋난다).
///
/// **언제 그릴지는 이 위젯이 정하지 않는다.** 부르는 쪽이 정한다.
/// - 홈: `rebirth > 0`일 때만. 풍경 위 오버레이라 자리 값이 비싸고, 0회에 훈장을
///   얹으면 캐릭터만 가린다.
/// - MY: 항상. "내가 지금 누구인지"를 적는 요약이라 등급은 0회여도 유효한 정보다.
///
/// 홈에서는 풍경 도트아트 위에 얹힌다. 채움이 불투명이라 글자 대비는 배경과 무관하게
/// `onPrimaryContainer` 대 5.6:1로 고정이지만(WCAG AA 통과), 밝은 하늘 위에서는
/// **판의 경계**가 흐려질 수 있어 소프트 섀도로 한 겹 띄운다. MY의 흰 배경에서는
/// 같은 섀도가 카드처럼 살짝 떠 보이는 정도로 무해하다.
class RebirthBadge extends StatelessWidget {
  const RebirthBadge({super.key, required this.rebirth});

  final int rebirth;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: scheme.primaryContainer,
        borderRadius: AppRadius.fullAll,
        boxShadow: AppColors.softShadow,
      ),
      // `mainAxisSize.min`만으로는 넘침을 못 막는다 — 등급 타이틀이 길면
      // ('환생 3 · Master Scholar') 고유 폭이 부모 폭을 넘어 폭 375dp에서 24px가
      // 잘렸다(E-4에서 쓸어담은 고정폭 Row 결함과 같은 계열이고, 환생 1회
      // 이상에서만 렌더돼 그때 표본에 안 걸렸다). 글자 쪽을 접을 수 있게 둔다.
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Symbols.star,
            fill: 1,
            size: 16,
            color: scheme.onPrimaryContainer,
          ),
          AppSpacing.gapWXs,
          Flexible(
            child: Text(
              // 한글과 라틴이 섞인 한 줄이라 기본 서체(Pretendard)다 —
              // 수치 서체(Sora)에는 한글 글리프가 없다.
              '환생 $rebirth · ${rebirthTitle(rebirth)}',
              style: theme.textTheme.labelMedium?.copyWith(
                color: scheme.onPrimaryContainer,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
