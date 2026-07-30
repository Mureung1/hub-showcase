import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../../../core/constants/proof_rules.dart';
import '../../../core/constants/reward_rules.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/proof_image_picker.dart';
import '../../../core/widgets/reward_chip.dart';
import '../../../repositories/quest_repository.dart';

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
  const QuestMemoResult({this.memo, this.photoBase64});

  /// 메모·사진 없이 완료를 진행한다.
  const QuestMemoResult.skipped() : memo = null, photoBase64 = null;

  /// 사용자가 남긴 메모. 건너뛰었으면 `null`.
  /// 빈 문자열은 [showQuestMemoSheet]가 null로 정규화하므로 여기 오지 않는다.
  final String? memo;

  /// 첨부한 인증 사진(압축 썸네일)의 base64. 첨부하지 않았으면 `null`.
  /// 크기 상한을 넘긴 사진은 시트가 첨부 단계에서 걸러 여기 오지 않는다.
  final String? photoBase64;

  /// 인증이 성립하는가 (= 보너스 지급 대상인가).
  /// **메모 또는 사진** 중 하나만 있어도 성립한다(둘 다여도 보너스는 1회).
  bool get isVerified => memo != null || photoBase64 != null;
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
  const QuestMemoSheet({super.key, required this.questTitle, this.pickImage});

  final String questTitle;

  /// 사진 한 장을 골라 **압축된 바이트**를 돌려주는 함수. 취소하면 `null`.
  ///
  /// 왜 주입 가능한가: image_picker는 네이티브 플러그인이라 위젯 테스트에서 부를 수
  /// 없다. 기본값(null)이면 실제 갤러리 픽업([_defaultPickImage])을 쓰고, 테스트는
  /// 가짜 함수를 주입해 픽업 결과를 시뮬레이트한다(픽업 자체는 실기기 몫).
  final Future<Uint8List?> Function()? pickImage;

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

  /// 첨부한 사진의 미리보기용 바이트. 없으면 `null`.
  Uint8List? _photoBytes;

  /// 첨부한 사진의 base64(완료 시 반환). `_photoBytes`와 짝이다 — 픽업 때 한 번만
  /// 인코딩해 두고, 완료 버튼에서 다시 인코딩하지 않는다(크기 판정도 이 값으로 끝냈다).
  String? _photoBase64;

  /// 픽업(갤러리 왕복)이 진행 중인가. 진행 중엔 첨부 버튼을 잠가 중복 실행을 막는다.
  bool _picking = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _attachPhoto() async {
    // 중복 실행 방지 — 픽업 중 다시 누르면 무시한다.
    if (_picking) return;
    setState(() => _picking = true);
    try {
      // 기본 픽업은 공용 압축 파이프라인([pickCompressedProofImage])을 쓴다 —
      // 보관함 기록 편집 시트와 같은 압축 규칙을 공유한다(중복 정의 방지).
      final bytes = await (widget.pickImage ?? pickCompressedProofImage)();
      if (bytes == null) return; // 사용자가 픽업을 취소함 — 조용히 종료.

      final encoded = base64Encode(bytes);
      // 화면 1차 방어: 상한을 넘긴 사진은 아예 붙이지 않고 안내한다.
      // (저장소도 ensureProofWithinLimit로 한 번 더 막는다 — 이중 방어.)
      if (encoded.length > kMaxProofBase64Bytes) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text(kProofTooLargeMessage)),
        );
        return;
      }

      if (!mounted) return;
      setState(() {
        _photoBytes = bytes;
        _photoBase64 = encoded;
      });
    } finally {
      if (mounted) setState(() => _picking = false);
    }
  }

  void _removePhoto() {
    setState(() {
      _photoBytes = null;
      _photoBase64 = null;
    });
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
              // 정본 `124:632` — 24/700. 화면 제목(32)이 아니라 시트 제목이라 한 단
              // 낮다. 32로 두면 아래 안내·입력이 전부 밀려 작은 화면에서 버튼이
              // 접힌다(시트는 높이가 제한적이다).
              Text('오늘 어땠나요?', style: theme.textTheme.headlineMedium),
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
                  // 좌측 accent만 있고 나머지 세 변은 보더가 없다 — 다크에서
                  // 시트 면과 붙지 않도록 채움을 한 단 올린다.
                  color: scheme.insetSurface,
                  borderRadius: AppRadius.mdAll,
                  border: Border(
                    left: BorderSide(color: scheme.primary, width: 3),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.workspace_premium_outlined,
                      size: 20,
                      color: scheme.primary,
                    ),
                    AppSpacing.gapWSm,
                    Expanded(
                      child: Text(
                        '사진이나 메모로 인증하면 보너스',
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

              // 정본 순서(`124:629`): 안내 → **메모** → 사진 첨부 → 버튼.
              // 메모가 먼저인 이유는 시트 제목이 묻는 것("오늘 어땠나요?")의 답이
              // 메모이기 때문이다 — 사진을 앞에 두면 질문과 답 사이에 갤러리 왕복이
              // 끼어든다.
              TextField(
                controller: _controller,
                // autofocus를 쓰지 않는다. 시트가 열리자마자 키보드가 올라오면
                // 메모를 쓸 생각이 없던 사용자의 [건너뛰기]까지 가려 버린다
                // (메모는 선택이지 관문이 아니다).
                maxLines: 4,
                minLines: 3,
                // 저장소 절단 상한(normalizeMemo)과 같은 값을 인용한다. 숫자를
                // 여기 직접 적으면 정책이 갈릴 때 UI만 낡는다.
                maxLength: kMaxMemoLength,
                textInputAction: TextInputAction.newline,
                decoration: const InputDecoration(
                  hintText: '무엇을 했는지 짧게 적어보세요.',
                ),
                // 한 글자만 입력해도 버튼 라벨이 바뀌어야 해서 매 변경마다 다시 그린다.
                onChanged: (_) => setState(() {}),
              ),
              AppSpacing.gapSm,

              // 사진 인증 — 첨부 전엔 아웃라인 버튼, 첨부 후엔 썸네일 미리보기.
              // 색 규칙: 사진 UI는 노랑을 쓰지 않는다(노랑은 위 RewardChip 전담).
              _PhotoAttach(
                bytes: _photoBytes,
                picking: _picking,
                onAttach: _attachPhoto,
                onRemove: _removePhoto,
              ),
              AppSpacing.gapMd,

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
                        QuestMemoResult(
                          memo: _normalize(_controller.text),
                          photoBase64: _photoBase64,
                        ),
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

/// 사진 첨부 영역. 첨부 전에는 아웃라인 버튼, 첨부 후에는 썸네일 + 제거(×).
///
/// 색 규칙(one-step-design): 사진은 코인·보상이 아니므로 노랑을 쓰지 않는다.
/// 버튼은 정본 `124:641`대로 **블루 아웃라인(보조 행동)** 이다 — 그린 채움은 아래
/// [완료하기]가 쓰는 주요 행동 자리라, 첨부까지 그린으로 두면 둘이 같은 무게로
/// 읽힌다. (테마의 `OutlinedButton`이 이미 `secondary`를 준다.)
class _PhotoAttach extends StatelessWidget {
  const _PhotoAttach({
    required this.bytes,
    required this.picking,
    required this.onAttach,
    required this.onRemove,
  });

  final Uint8List? bytes;
  final bool picking;
  final VoidCallback onAttach;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    // 첨부 전 — 픽업 중이면 스피너를, 아니면 카메라 아이콘을 보여준다(로딩 상태).
    if (bytes == null) {
      return SizedBox(
        width: double.infinity,
        child: OutlinedButton.icon(
          onPressed: picking ? null : onAttach,
          icon: picking
              ? const SizedBox.square(
                  dimension: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.photo_camera_outlined),
          label: Text(picking ? '사진 여는 중…' : '사진 첨부'),
        ),
      );
    }

    // 첨부 후 — 썸네일 미리보기 위에 제거(×) 버튼을 얹는다.
    return ClipRRect(
      borderRadius: AppRadius.mdAll,
      child: Stack(
        children: [
          Image.memory(
            bytes!,
            width: double.infinity,
            height: 140,
            fit: BoxFit.cover,
          ),
          Positioned(
            top: AppSpacing.xs,
            right: AppSpacing.xs,
            child: Material(
              color: scheme.surface,
              shape: const CircleBorder(),
              clipBehavior: Clip.antiAlias,
              child: IconButton(
                tooltip: '사진 제거',
                iconSize: 18,
                visualDensity: VisualDensity.compact,
                onPressed: onRemove,
                icon: Icon(Icons.close, color: scheme.onSurface),
              ),
            ),
          ),
        ],
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
  Future<Uint8List?> Function()? pickImage,
}) {
  return showModalBottomSheet<QuestMemoResult>(
    context: context,
    // 키보드가 올라와도 시트 전체가 보이도록.
    isScrollControlled: true,
    builder: (_) =>
        QuestMemoSheet(questTitle: questTitle, pickImage: pickImage),
  );
}
