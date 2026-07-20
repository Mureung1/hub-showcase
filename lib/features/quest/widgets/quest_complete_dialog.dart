import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/constants/reward_rules.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/reward_chip.dart';

/// 퀘스트 완료 연출 — 트로피 + 퀘스트명 + 방금 받은 보상.
///
/// screens.md "퀘스트 완료 / 인증 화면" 기반. **트로피 원형 · 대상 퀘스트명 ·
/// 보상 표시 카드**에 3주차-B에서 **인증 보너스 한 줄**을 덧붙였다.
/// (메모 입력 자체는 완료 *전* 시트로 분리했다 — `quest_memo_sheet.dart` 참고.
///  사진 업로드는 Storage 도입 전까지 보류.)
///
/// 이 연출은 "보상이 실제로 지급됐을 때"만 뜬다. 이미 지급된 퀘스트를 다시 완료해도
/// 축하가 뜨면 사용자가 코인을 또 받은 것으로 오해한다(`completeQuest`가 null을
/// 반환하는 경우 = 화면이 이 다이얼로그를 띄우지 않는 경우).
///
/// 색 규칙(one-step-design):
/// - 트로피·완료 문구·확인 버튼 = 그린(완료·성장·주요 행동).
/// - 코인 노랑은 [RewardChip]이 전담한다. 이 파일은 노랑에 직접 접근하지 않는다.
class QuestCompleteDialog extends StatelessWidget {
  const QuestCompleteDialog({
    super.key,
    required this.questTitle,
    required this.reward,
    this.verified = false,
  });

  final String questTitle;

  /// 이번 완료로 **실제 지급된** 보상. 인증 보너스가 있으면 **합산된 값**이다.
  final Reward reward;

  /// 메모 인증이 성립해 [kVerificationBonus]가 포함됐는가.
  ///
  /// [reward]에서 역산하지 않는다 — 합산된 값만 보고는 "보통(5) + 보너스(3)"인지
  /// "어려움에서 뭔가 빠진 8"인지 알 수 없다. 지급한 쪽이 사실을 알려 줘야 한다.
  final bool verified;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Dialog(
      shape: const RoundedRectangleBorder(borderRadius: AppRadius.lgAll),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 트로피 원형 — 그린 배경 위 흰 트로피.
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color: scheme.primary,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Symbols.trophy,
                fill: 1,
                size: 44,
                color: scheme.onPrimary,
              ),
            ),
            AppSpacing.gapMd,
            Text(
              '퀘스트 완료!',
              style: theme.textTheme.headlineLarge?.copyWith(
                color: scheme.primary,
              ),
              textAlign: TextAlign.center,
            ),
            AppSpacing.gapSm,
            Text(
              questTitle,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            AppSpacing.gapMd,
            // 보상 표시 카드 — 방금 받은 코인·XP.
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.md,
              ),
              decoration: BoxDecoration(
                color: scheme.surfaceContainerLow,
                borderRadius: AppRadius.mdAll,
              ),
              child: Center(child: RewardChip(reward: reward, large: true)),
            ),
            // 인증 보너스가 포함됐다면 그 사실을 밝힌다. 합산된 총액만 보여 주면
            // 사용자는 "왜 보통 퀘스트인데 8코인이지?"를 알 수 없고, 메모를 쓴
            // 행동이 보상으로 이어졌다는 연결이 끊긴다.
            if (verified) ...[
              AppSpacing.gapSm,
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Symbols.workspace_premium,
                    size: 16,
                    fill: 1,
                    color: scheme.primary,
                  ),
                  AppSpacing.gapWXs,
                  Text(
                    '메모 인증 보너스 +${kVerificationBonus.coin} · '
                    'XP +${kVerificationBonus.xp} 포함',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: scheme.primary,
                    ),
                  ),
                ],
              ),
            ],
            AppSpacing.gapLg,
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('좋아요'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 완료 연출을 띄운다. 사용자가 닫을 때까지 기다린다.
///
/// `barrierDismissible: true` — 축하 연출은 정보 전달일 뿐 사용자의 선택을
/// 요구하지 않는다. 아무 데나 눌러도 닫히는 편이 완료 리듬을 끊지 않는다.
Future<void> showQuestCompleteDialog(
  BuildContext context, {
  required String questTitle,
  required Reward reward,
  bool verified = false,
}) {
  return showDialog<void>(
    context: context,
    builder: (_) => QuestCompleteDialog(
      questTitle: questTitle,
      reward: reward,
      verified: verified,
    ),
  );
}
