import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/constants/reward_rules.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/reward_showcase.dart';

/// 퀘스트 완료 연출 — 트로피 + 퀘스트명 + 방금 받은 보상.
///
/// screens.md "퀘스트 완료 / 인증 화면" 기반. **트로피 원형 · 대상 퀘스트명 ·
/// 보상 표시 카드**에 3주차에서 **인증 보너스 한 줄**을 덧붙였다.
/// (인증 입력 자체 — 메모·사진 — 은 완료 *전* 시트로 분리했다: `quest_memo_sheet.dart`.
///  사진은 Storage 없이 압축 썸네일을 Firestore proof 문서에 base64로 저장한다.)
///
/// 이 연출은 "보상이 실제로 지급됐을 때"만 뜬다. 이미 지급된 퀘스트를 다시 완료해도
/// 축하가 뜨면 사용자가 코인을 또 받은 것으로 오해한다(`completeQuest`가 null을
/// 반환하는 경우 = 화면이 이 다이얼로그를 띄우지 않는 경우).
///
/// **연출(4주차).** 트로피가 튕겨 나오고(scale/fade) 코인·XP가 0에서 지급값까지
/// 카운트업한다. 표시값은 여전히 저장소가 준 **실지급액**이다 — 카운트업은 그 값에
/// 도달하는 과정일 뿐, 화면이 난이도로 재계산하지 않는다. **연출은 순수 표시용**이라
/// 보상은 이 다이얼로그가 뜨기 전 트랜잭션에서 이미 지급됐다. 그래서 진행 중 화면
/// 본문을 탭하면 애니메이션을 끝 상태로 건너뛰고(숫자가 즉시 최종값이 된다), 확인
/// 버튼·바깥 탭은 언제든 닫는다.
///
/// 색 규칙(one-step-design):
/// - 트로피·완료 문구·확인 버튼 = 그린(완료·성장·주요 행동).
/// - 코인 노랑은 [RewardChip]이 전담한다. 이 파일은 노랑에 직접 접근하지 않는다.
class QuestCompleteDialog extends StatefulWidget {
  const QuestCompleteDialog({
    super.key,
    required this.questTitle,
    required this.reward,
    this.verified = false,
    this.cutCoin = 0,
  });

  final String questTitle;

  /// 이번 완료로 **실제 지급된** 보상. 인증 보너스가 있으면 **합산된 값**이고,
  /// 하루 코인 상한에 걸렸으면 **절삭된 뒤의 값**이다.
  ///
  /// 지급한 쪽(`completeQuest`)이 돌려준 값을 그대로 표시한다 — 화면이 난이도로
  /// 다시 계산하면 절삭이 일어난 순간 표시와 실지급이 어긋난다.
  final Reward reward;

  /// 하루 코인 상한 때문에 **깎인 코인**. 0이면 절삭이 없었다.
  ///
  /// 깎였다는 사실을 밝히지 않으면 사용자는 "어려움 퀘스트인데 왜 2코인이지?"를
  /// 알 수 없고, 보상 규칙 자체를 못 믿게 된다.
  final int cutCoin;

  /// 인증(메모 또는 사진)이 성립해 [kVerificationBonus]가 포함됐는가.
  ///
  /// [reward]에서 역산하지 않는다 — 합산된 값만 보고는 "보통(5) + 보너스(3)"인지
  /// "어려움에서 뭔가 빠진 8"인지 알 수 없다. 지급한 쪽이 사실을 알려 줘야 한다.
  final bool verified;

  @override
  State<QuestCompleteDialog> createState() => _QuestCompleteDialogState();
}

class _QuestCompleteDialogState extends State<QuestCompleteDialog>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  /// 트로피 등장 — 앞부분에서 튕겨 나온다.
  late final Animation<double> _trophy;

  /// 코인·XP 카운트업 — 트로피가 자리 잡은 뒤 이어서 0 → 지급값.
  late final Animation<double> _count;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 700),
      vsync: this,
    );
    _trophy = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.0, 0.55, curve: Curves.easeOutBack),
    );
    _count = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.35, 1.0, curve: Curves.easeOut),
    );
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// 본문 탭 = 연출 생략. 진행 중이면 끝 상태로 건너뛴다(숫자가 즉시 최종값).
  /// 보상은 이미 지급됐으므로 건너뛰어도 손해가 없다. 닫기는 버튼·바깥 탭이 맡는다.
  void _skip() {
    if (!_controller.isCompleted) _controller.value = 1.0;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Dialog(
      shape: const RoundedRectangleBorder(borderRadius: AppRadius.lgAll),
      insetPadding: kCelebrationDialogInset,
      child: GestureDetector(
        // 본문 아무 데나 탭하면 애니메이션을 끝으로 건너뛴다(연출 생략).
        behavior: HitTestBehavior.opaque,
        onTap: _skip,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // 트로피 원형 — 그린 배경 위 흰 트로피. 튕겨 나오며 등장.
              AnimatedBuilder(
                animation: _trophy,
                builder: (context, child) {
                  final t = _trophy.value.clamp(0.0, 1.0);
                  return Opacity(
                    opacity: t,
                    child: Transform.scale(scale: _trophy.value, child: child),
                  );
                },
                child: Container(
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
                widget.questTitle,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              AppSpacing.gapMd,
              // 보상 표시 카드 — 방금 받은 코인·XP가 0에서 카운트업한다.
              // 카드의 생김새와 확대 표시 규칙은 [RewardShowcase]가 쥐고 있다
              // (연속 출석 보너스 연출과 같은 카드를 쓴다).
              AnimatedBuilder(
                animation: _count,
                builder: (context, _) {
                  final t = _count.value.clamp(0.0, 1.0);
                  // 실지급액에 도달하는 과정일 뿐 — 최종 프레임은 정확히 reward다
                  // (t=1이면 round가 원값과 같다). 재계산이 아니다.
                  final shown = Reward(
                    coin: (widget.reward.coin * t).round(),
                    xp: (widget.reward.xp * t).round(),
                  );
                  return RewardShowcase(reward: shown);
                },
              ),
              // 인증 보너스가 포함됐다면 그 사실을 밝힌다. 합산된 총액만 보여 주면
              // 사용자는 "왜 보통 퀘스트인데 8코인이지?"를 알 수 없고, 인증(메모·사진)
              // 행동이 보상으로 이어졌다는 연결이 끊긴다.
              if (widget.verified) ...[
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
                    // 아래 상한 안내 줄과 같은 처방 — 아이콘은 16px 고정이고
                    // 문구만 글꼴 배율을 타므로 문구 쪽에 접힐 여지를 준다.
                    // (없으면 배율 2.0에서 모든 폭이 넘쳤다: E-4 D-2)
                    Flexible(
                      child: Text(
                        '인증 보너스 +${kVerificationBonus.coin} · '
                        'XP +${kVerificationBonus.xp} 포함',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: scheme.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
              // 하루 상한으로 코인이 깎였다면 그 사실과 이유를 알린다.
              // XP는 깎이지 않았다는 점도 함께 말해 준다 — "오늘은 더 해도 소용없다"는
              // 오해를 막는 것이 상한 안내의 핵심이다.
              if (widget.cutCoin > 0) ...[
                AppSpacing.gapSm,
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Symbols.info,
                      size: 16,
                      fill: 1,
                      color: scheme.secondary,
                    ),
                    AppSpacing.gapWXs,
                    Flexible(
                      child: Text(
                        '오늘 코인 상한($kDailyCoinCap)에 걸려 '
                        '${widget.cutCoin}코인은 지급되지 않았어요. XP는 그대로예요.',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: scheme.secondary,
                        ),
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
  int cutCoin = 0,
}) {
  return showDialog<void>(
    context: context,
    builder: (_) => QuestCompleteDialog(
      questTitle: questTitle,
      reward: reward,
      verified: verified,
      cutCoin: cutCoin,
    ),
  );
}
