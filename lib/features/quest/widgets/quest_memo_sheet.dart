import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/constants/reward_rules.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/reward_chip.dart';

/// 메모 시트의 결과. **세 갈래를 구분해야 한다.**
///
/// | 사용자 행동 | 값 | 화면이 할 일 |
/// |---|---|---|
/// | 메모를 쓰고 완료 | `QuestMemoResult(memo: '...')` | 완료 + 보너스 |
/// | 건너뛰기 | `QuestMemoResult.skipped()` | 완료 (기본 보상만) |
/// | 취소·바깥 탭·뒤로가기 | `null` (시트가 값 없이 닫힘) | **완료하지 않음** |
///
/// "건너뛰기"와 "취소"를 둘 다 null로 뭉뚱그리면 안 된다. 앞은 "완료는 할게,
/// 메모만 안 쓸래"이고 뒤는 "잘못 눌렀어"다. 같이 취급하면 실수로 체크한 퀘스트가
/// 그대로 완료되고, 보상은 `rewardedAt` 때문에 되돌릴 수도 없다.
class QuestMemoResult {
  const QuestMemoResult({this.memo});

  /// 메모 없이 완료를 진행한다.
  const QuestMemoResult.skipped() : memo = null;

  /// 사용자가 남긴 메모. 건너뛰었으면 `null`.
  /// 빈 문자열은 [showQuestMemoSheet]가 null로 정규화하므로 여기 오지 않는다.
  final String? memo;

  /// 인증이 성립하는가 (= 보너스 지급 대상인가).
  bool get isVerified => memo != null;
}

/// 완료 직전에 뜨는 인증 메모 시트.
///
/// screens.md "퀘스트 완료 / 인증 화면"의 **Verification 박스**를 완료 *전* 단계로
/// 옮긴 것이다. 완료 후에 받으면 보너스가 두 번째 트랜잭션이 되어 중복 지급 가드가
/// 하나 더 필요해진다 — 완료 전에 받으면 지급이 한 트랜잭션으로 끝난다.
///
/// 색 규칙: 노랑(코인)은 [RewardChip]이 전담한다. 이 파일은 노랑에 직접 접근하지
/// 않는다. 강조 보더·아이콘은 그린(완료·주요 행동)을 쓴다.
class QuestMemoSheet extends StatefulWidget {
  const QuestMemoSheet({super.key, required this.questTitle});

  final String questTitle;

  @override
  State<QuestMemoSheet> createState() => _QuestMemoSheetState();
}

class _QuestMemoSheetState extends State<QuestMemoSheet> {
  final _controller = TextEditingController();

  /// 완료 버튼을 이미 눌렀는가.
  ///
  /// pop이 두 번 불리면 시트 아래 화면까지 pop돼 라우팅이 어긋난다.
  /// (완료 요청 자체의 중복 방지는 목록 화면의 `_completing`이 따로 담당한다.)
  bool _submitted = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _close(QuestMemoResult result) {
    if (_submitted) return;
    _submitted = true;
    Navigator.of(context).pop(result);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Padding(
      // 키보드가 올라오면 시트를 그만큼 밀어 올린다. 안 하면 입력 중인 글자가
      // 키보드에 가려 무엇을 쓰는지 보이지 않는다.
      padding: EdgeInsets.only(
        bottom: MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('오늘 어땠나요?', style: theme.textTheme.headlineLarge),
              AppSpacing.gapXs,
              Text(
                widget.questTitle,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
              ),
              AppSpacing.gapMd,

              // 인증 안내 — 좌측 accent 보더 박스 (screens.md Verification 박스).
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: scheme.surfaceContainerLow,
                  borderRadius: AppRadius.mdAll,
                  border: Border(
                    left: BorderSide(color: scheme.primary, width: 3),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      Symbols.workspace_premium,
                      size: 20,
                      color: scheme.primary,
                    ),
                    AppSpacing.gapWSm,
                    Expanded(
                      child: Text(
                        '메모를 남기면 보너스',
                        style: theme.textTheme.bodyMedium,
                      ),
                    ),
                    // 보너스 금액은 상수(kVerificationBonus)에서 온다.
                    // 화면에 숫자를 적어 두면 정책이 바뀔 때 표시만 낡는다.
                    const RewardChip(reward: kVerificationBonus),
                  ],
                ),
              ),
              AppSpacing.gapMd,

              TextField(
                controller: _controller,
                // autofocus를 쓰지 않는다. 시트가 열리자마자 키보드가 올라오면
                // 메모를 쓸 생각이 없던 사용자의 [건너뛰기]까지 가려 버린다
                // (메모는 선택이지 관문이 아니다).
                maxLines: 4,
                minLines: 3,
                maxLength: 200,
                textInputAction: TextInputAction.newline,
                decoration: const InputDecoration(
                  hintText: '무엇을 했는지 짧게 적어보세요.',
                ),
                // 한 글자만 입력해도 버튼 라벨이 바뀌어야 해서 매 변경마다 다시 그린다.
                onChanged: (_) => setState(() {}),
              ),
              AppSpacing.gapSm,

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      // 건너뛰기 = "완료는 진행, 메모만 없음". 취소가 아니다.
                      onPressed: () => _close(const QuestMemoResult.skipped()),
                      child: const Text('건너뛰기'),
                    ),
                  ),
                  AppSpacing.gapWSm,
                  Expanded(
                    child: FilledButton(
                      onPressed: () => _close(
                        QuestMemoResult(memo: _normalize(_controller.text)),
                      ),
                      child: const Text('완료하기'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 공백만 있는 입력은 `null`(= 인증 불성립)로 정규화한다.
/// 저장소도 같은 판정을 하지만(`normalizeMemo`), 화면에서 미리 맞춰 두면
/// "스페이스만 치고 보너스"를 기대하게 만들지 않는다.
String? _normalize(String text) {
  final trimmed = text.trim();
  return trimmed.isEmpty ? null : trimmed;
}

/// 완료 전 메모 시트를 띄운다.
///
/// 반환값 `null`은 **취소**다(바깥 탭·뒤로가기). 호출부는 이때 완료를 진행하면
/// 안 된다 — [QuestMemoResult] 문서 참고.
Future<QuestMemoResult?> showQuestMemoSheet(
  BuildContext context, {
  required String questTitle,
}) {
  return showModalBottomSheet<QuestMemoResult>(
    context: context,
    // 키보드가 올라와도 시트 전체가 보이도록.
    isScrollControlled: true,
    builder: (_) => QuestMemoSheet(questTitle: questTitle),
  );
}
