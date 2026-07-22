import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/constants/reward_rules.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/reward_chip.dart';

/// 연속 출석 보너스 연출.
///
/// 일주일에 한 번 오는 사건이라 스낵바로는 무게가 맞지 않는다. 완료 연출과
/// **같은 급의 축하**를 준다 — 그래서 구조·시각 언어를 `QuestCompleteDialog`에서
/// 그대로 가져왔다(원형 아이콘 → 제목 → 안내문 → 보상 카드 → 확인 버튼).
/// 새 규칙을 만들지 않는 것이 요점이다. 축하 연출이 두 가지 언어로 갈라지면
/// 사용자는 매번 "이건 뭘 받은 화면이지?"를 다시 읽어야 한다.
///
/// 색 규칙(one-step-design):
/// - 원형·제목·확인 버튼 = 그린. 완료 연출과 동일하다.
/// - 노랑(스트릭·코인)은 [RewardChip]이 전담한다. **이 파일은 노랑에 직접
///   접근하지 않는다** — 색 역할을 한 위젯에 가둬 두라는 `reward_chip.dart`의
///   지침을 따른 것이고, 덕분에 `test/theme/color_role_test.dart`의 allowlist를
///   넓히지 않아도 됐다.
///
/// 보상 금액은 지급한 쪽이 돌려준 [bonus]를 그대로 표시한다. 화면이 주차별
/// 금액을 다시 계산하면 정책이 바뀌는 순간 표시와 실지급이 어긋난다.
class StreakBonusDialog extends StatelessWidget {
  const StreakBonusDialog({
    super.key,
    required this.streak,
    required this.bonus,
  });

  /// 오늘 기준 **실제** 연속 출석 일수(7·14·21…). 7로 고정해 두면 2주·3주째에도
  /// "7일 연속!"이 떠서 오래 버틴 사실이 화면에서 사라진다.
  final int streak;

  /// 이번 출석으로 **실제 지급된** 보너스. 지급한 쪽(`recordAttendance`)이
  /// 돌려준 값을 그대로 표시한다.
  final Reward bonus;

  /// 안내 문구에서 기간을 부르는 말. 1주는 "일주일"이 자연스럽고 그 뒤는 "N주"다.
  /// 7의 배수가 아닌 값이 들어오더라도 일 단위로 말해 문장이 깨지지 않게 한다.
  String get _periodLabel {
    if (streak % kStreakBonusDays != 0 || streak < kStreakBonusDays) {
      return '$streak일';
    }
    final weeks = streak ~/ kStreakBonusDays;
    return weeks == 1 ? '일주일' : '$weeks주';
  }

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
            // 불꽃 원형 — 그린 배경 위 흰 아이콘(완료 연출의 트로피 원형과 동일 규격).
            // 다크/라이트 모두 primary ↔ onPrimary 쌍이라 대비가 테마에서 보장된다.
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color: scheme.primary,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Symbols.local_fire_department,
                fill: 1,
                size: 44,
                color: scheme.onPrimary,
              ),
            ),
            AppSpacing.gapMd,
            Text(
              '$streak일 연속!',
              style: theme.textTheme.headlineLarge?.copyWith(
                color: scheme.primary,
              ),
              textAlign: TextAlign.center,
            ),
            AppSpacing.gapSm,
            Text(
              '$_periodLabel 동안 하루도 빠지지 않았어요.\n'
              '연속 출석 보너스를 받았어요.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            AppSpacing.gapMd,
            // 보상 표시 카드 — 코인 | XP 2분할 (screens.md "보상 표시 카드").
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
              child: Center(child: RewardChip(reward: bonus, large: true)),
            ),
            AppSpacing.gapSm,
            // 하루 코인 상한과 무관하다는 사실을 밝힌다(reward_rules.dart).
            // 상한을 이미 채운 날에도 전액이 들어오는데, 그걸 말해 주지 않으면
            // 사용자는 잔액을 보고 "덜 받은 것 아닌가"를 의심한다.
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Symbols.info, size: 16, fill: 1, color: scheme.secondary),
                AppSpacing.gapWXs,
                Flexible(
                  child: Text(
                    '연속 출석 보너스는 하루 코인 상한과 상관없이 전액 지급돼요.',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: scheme.secondary,
                    ),
                  ),
                ),
              ],
            ),
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

/// 스트릭 보너스 연출을 띄운다. 사용자가 닫을 때까지 기다린다.
///
/// `barrierDismissible: true` — 완료 연출과 같다. 축하는 정보 전달일 뿐
/// 사용자의 선택을 요구하지 않으므로 아무 데나 눌러도 닫히는 편이 낫다.
Future<void> showStreakBonusDialog(
  BuildContext context, {
  required int streak,
  required Reward bonus,
}) {
  return showDialog<void>(
    context: context,
    builder: (_) => StreakBonusDialog(streak: streak, bonus: bonus),
  );
}
