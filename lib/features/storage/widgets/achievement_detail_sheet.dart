import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/constants/proof_rules.dart';
import '../../../core/error/app_failure.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/kst_date.dart';
import '../../../core/widgets/difficulty_pill.dart';
import '../../../core/widgets/reward_chip.dart';
import '../../../models/quest.dart';
import '../../../repositories/quest_repository.dart' show kMaxMemoLength;

/// 보관함 카드 상세 시트 — 보기(3단계-a) + **메모·사진 편집**(3단계-b).
///
/// 완료한 퀘스트를 탭하면 완료 당시 정보(제목·난이도·보상·날짜·메모·사진)를 펼쳐
/// 보고, "수정"을 누르면 같은 시트에서 편집 모드로 전환해 **메모와 사진만** 고친다.
///
/// **정책 구분(중요).** B-5b가 "완료 퀘스트는 수정 메뉴 숨김"으로 막은 것은
/// **오늘의 퀘스트 목록**에서 **제목·난이도**를 못 고치게 한 것이다(재완료로 보상을
/// 유효화하는 파밍 차단). 여기는 **보관함 기록**의 **메모·사진**이고, 코인·XP·난이도·
/// `rewardedAt`·지급 이력을 **전혀 건드리지 않는다** — 보상 경제 밖의 부가 정보라
/// 별개로 허용된다. (저장은 `onSaveMemo`/`onSavePhoto`가 각각 `updateQuest`·
/// `updateProof`로 처리하며, 둘 다 완료·보상 트랜잭션과 무관하다.)
///
/// **저장소도 provider도 image_picker도 모른다.** 화면(`storage_screen`)이 사진 조회
/// ([loadProof])·저장([onSaveMemo]/[onSavePhoto])·픽업([pickImage])을 클로저로 주입
/// 하고, 이 위젯은 순수 UI로 남는다. 덕분에 위젯 테스트가 가짜 클로저만으로 편집
/// 흐름(교체·제거·저장·실패·취소)을 네이티브 없이 전부 재현한다.
///
/// **부분 반영 허용(주석).** 메모(updateQuest)와 사진(updateProof)은 각각 별도
/// 쓰기다. 보상 경제가 아니라 부가 정보라 원자성이 필수가 아니므로, 하나가 실패하면
/// (메모는 됐는데 사진 실패 등) 부분 반영을 허용하고 스낵바로 알린 뒤 편집을 유지한다.
///
/// 색 규칙(one-step-design): 노랑은 코인·보상 전용이라 [RewardChip]이 전담한다.
/// 편집 버튼·저장은 그린(완료·주요 행동), 취소·사진 UI는 중립을 쓴다. 노랑에 직접
/// 접근하지 않는다(난이도 노랑 틴트는 DifficultyPill 안에 갇힘).
class AchievementDetailSheet extends StatefulWidget {
  const AchievementDetailSheet({
    super.key,
    required this.quest,
    required this.loadProof,
    this.onSaveMemo,
    this.onSavePhoto,
    this.pickImage,
  });

  final Quest quest;

  /// 인증 사진 base64를 lazy 조회하는 클로저. 사진이 없으면 `null`을 돌려준다.
  ///
  /// 왜 미리 받지 않고 클로저인가: proof 문서는 questId당 별도라 목록에서 미리 다
  /// 읽으면 비싸다(3주차 문서 분리 이유). 상세를 **열 때** 그 하나만 읽는다.
  final Future<String?> Function() loadProof;

  /// 편집한 메모를 저장하는 클로저. 공백만이면 `null`(= 메모 지움).
  /// 화면이 `updateQuest`로 반영한다(시트는 저장소를 모른다).
  final Future<void> Function(String? memo)? onSaveMemo;

  /// 편집한 사진을 저장하는 클로저. 값이면 교체, `null`이면 제거.
  /// 화면이 `updateProof`로 반영한다.
  final Future<void> Function(String? base64)? onSavePhoto;

  /// 사진 한 장을 골라 **압축된 바이트**를 돌려주는 함수. 취소하면 `null`.
  /// 네이티브 플러그인(image_picker)이라 주입 가능하게 둔다(테스트는 가짜를 넣음).
  final Future<Uint8List?> Function()? pickImage;

  /// 편집 가능한가 — 세 클로저가 모두 주입됐을 때만 "수정"이 뜬다. 하나라도 없으면
  /// 보기 전용이다(3단계-a 호출부·기존 테스트는 클로저 없이 열어 그대로 보기 전용).
  bool get editable =>
      onSaveMemo != null && onSavePhoto != null && pickImage != null;

  @override
  State<AchievementDetailSheet> createState() => _AchievementDetailSheetState();
}

class _AchievementDetailSheetState extends State<AchievementDetailSheet> {
  // ── 확정 상태(보기 모드가 그리는 값) ──
  // 저장에 성공하면 편집 스크래치가 이리로 커밋된다.
  late String? _memo = widget.quest.memo;
  bool _photoLoading = true;
  Uint8List? _photoBytes; // 현재 확정된 사진 바이트(없으면 null)
  String? _photoBase64; // 현재 확정된 사진 base64(교체 저장 시 넘길 값)

  // ── 편집 상태 ──
  bool _editing = false;
  bool _saving = false; // 저장 진행 중(중복 저장 방지)
  bool _picking = false; // 픽업(갤러리 왕복) 진행 중(중복 픽업 방지)
  final _memoController = TextEditingController();
  // 편집 스크래치 — 편집 진입 시 확정값으로 초기화하고, 저장 전까지 여기만 바꾼다.
  Uint8List? _editPhotoBytes;
  String? _editPhotoBase64;
  bool _photoDirty = false; // 편집 중 사진을 바꿨는가(교체 또는 제거)

  @override
  void initState() {
    super.initState();
    _loadInitialProof();
  }

  @override
  void dispose() {
    _memoController.dispose();
    super.dispose();
  }

  /// 사진을 **한 번만** 조회해 확정 상태에 담는다. 실패·없음·깨진 base64는 모두
  /// "사진 없음"으로 떨어뜨린다 — 조회 실패가 시트를 죽이지 않는다(3-a 계약 유지).
  Future<void> _loadInitialProof() async {
    try {
      final b64 = await widget.loadProof();
      final bytes = _decode(b64);
      if (!mounted) return;
      setState(() {
        // 디코딩 가능한 사진만 유효로 본다(깨진 문자열은 없음 처리).
        _photoBase64 = bytes == null ? null : b64;
        _photoBytes = bytes;
        _photoLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _photoBase64 = null;
        _photoBytes = null;
        _photoLoading = false;
      });
    }
  }

  void _enterEdit() {
    setState(() {
      _editing = true;
      _memoController.text = _memo ?? '';
      _editPhotoBytes = _photoBytes;
      _editPhotoBase64 = _photoBase64;
      _photoDirty = false;
    });
  }

  /// 취소 — 편집 스크래치를 버리고 보기 모드로. **아무것도 쓰지 않는다.**
  void _cancelEdit() {
    setState(() {
      _editing = false;
      _photoDirty = false;
    });
  }

  Future<void> _replacePhoto() async {
    // 중복 실행 방지 — 픽업 중 다시 누르면 무시한다.
    if (_picking) return;
    setState(() => _picking = true);
    try {
      final bytes = await widget.pickImage!();
      if (bytes == null) return; // 사용자가 픽업을 취소함.
      final encoded = base64Encode(bytes);
      // 화면 1차 방어: 상한을 넘긴 사진은 붙이지 않고 안내한다(저장소도 재방어).
      if (encoded.length > kMaxProofBase64Bytes) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text(kProofTooLargeMessage)),
        );
        return;
      }
      if (!mounted) return;
      setState(() {
        _editPhotoBytes = bytes;
        _editPhotoBase64 = encoded;
        _photoDirty = true;
      });
    } finally {
      if (mounted) setState(() => _picking = false);
    }
  }

  void _removePhoto() {
    setState(() {
      _editPhotoBytes = null;
      _editPhotoBase64 = null;
      _photoDirty = true;
    });
  }

  Future<void> _save() async {
    if (_saving) return; // 중복 저장 방지.
    setState(() => _saving = true);

    final newMemo = _normalizeMemo(_memoController.text);
    // 바뀐 것만 쓴다 — 변경 없는 필드에 헛쓰기를 내지 않는다.
    final memoChanged = newMemo != _memo;

    try {
      // 메모·사진은 각각 별도 쓰기다(보상 트랜잭션이 아니라 부가 정보라 원자성이
      // 필수가 아니다). 순차로 처리하고, 하나가 실패하면 부분 반영을 허용한다.
      if (memoChanged) {
        await widget.onSaveMemo!(newMemo);
      }
      if (_photoDirty) {
        await widget.onSavePhoto!(_editPhotoBase64);
      }
      if (!mounted) return;
      // 저장 성공 → 편집 스크래치를 확정으로 커밋하고 보기 모드로. 시트를 닫았다
      // 열 필요 없이 즉시 새 값이 반영된다(스트림 왕복 없이 로컬 반영).
      setState(() {
        _memo = newMemo;
        _photoBytes = _editPhotoBytes;
        _photoBase64 = _editPhotoBase64;
        _editing = false;
        _photoDirty = false;
        _saving = false;
      });
    } on AppFailure catch (failure) {
      if (!mounted) return;
      // 실패 시 편집 모드를 유지한다(입력을 날리지 않는다). 부분 반영이 일어났어도
      // 다음 저장에서 바뀐 필드만 다시 쓴다(멱등).
      setState(() => _saving = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(failure.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final quest = widget.quest;
    final completedAt = quest.completedAt;

    return SafeArea(
      child: Padding(
        // 편집 모드 TextField에 키보드가 올라오면 시트를 밀어 올린다(가림 방지).
        padding: EdgeInsets.only(
          bottom: MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg,
            0,
            AppSpacing.lg,
            AppSpacing.lg,
          ),
          // 긴 메모 + 사진이면 시트 높이를 넘길 수 있어 스크롤되게 감싼다.
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(quest.title, style: theme.textTheme.headlineLarge),
                AppSpacing.gapSm,

                // 난이도 + 완료 날짜(달력 아이콘).
                Wrap(
                  spacing: AppSpacing.sm,
                  runSpacing: AppSpacing.xs,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    DifficultyPill(difficulty: quest.difficulty),
                    if (completedAt != null)
                      _CompletedDate(completedAt: completedAt),
                  ],
                ),
                AppSpacing.gapMd,

                // 지급 보상 — RewardChip이 노랑(코인)을 전담한다. 편집으로 바뀌지 않는다.
                RewardChip(reward: quest.reward),
                AppSpacing.gapLg,

                if (_editing) ..._editBody(theme) else ..._viewBody(theme),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ── 보기 모드 ──
  List<Widget> _viewBody(ThemeData theme) {
    return [
      // 인증 메모 — 남긴 게 있을 때만 그린다(없으면 통째로 생략).
      if (_memo != null) ...[
        Text('메모', style: theme.textTheme.titleMedium),
        AppSpacing.gapSm,
        _MemoBox(memo: _memo!),
        AppSpacing.gapLg,
      ],

      // 인증 사진 — 로딩/사진/없음을 각각 처리한다.
      Text('사진', style: theme.textTheme.titleMedium),
      AppSpacing.gapSm,
      _photoView(),

      // 편집 가능하면 하단에 "수정"(그린). 보기 전용 호출부는 이 버튼이 없다.
      if (widget.editable) ...[
        AppSpacing.gapLg,
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: _enterEdit,
            icon: const Icon(Symbols.edit),
            label: const Text('수정'),
          ),
        ),
      ],
    ];
  }

  /// 보기 모드 사진: 로딩(스피너) · 사진 있음(썸네일) · 없음("사진 없음").
  Widget _photoView() {
    if (_photoLoading) {
      return const _PhotoFrame(child: Center(child: _LoadingSpinner()));
    }
    final bytes = _photoBytes;
    if (bytes == null) return const _PhotoPlaceholder();
    return _PhotoFrame(
      child: Image.memory(
        bytes,
        width: double.infinity,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => const _PhotoPlaceholder(),
      ),
    );
  }

  // ── 편집 모드 ──
  List<Widget> _editBody(ThemeData theme) {
    return [
      Text('메모', style: theme.textTheme.titleMedium),
      AppSpacing.gapSm,
      TextField(
        controller: _memoController,
        maxLines: 4,
        minLines: 3,
        // 저장소 절단 상한(normalizeMemo)과 같은 값을 인용한다(정책 단일화).
        maxLength: kMaxMemoLength,
        textInputAction: TextInputAction.newline,
        decoration: const InputDecoration(
          hintText: '무엇을 했는지 짧게 적어보세요.',
        ),
      ),
      AppSpacing.gapMd,

      Text('사진', style: theme.textTheme.titleMedium),
      AppSpacing.gapSm,
      _EditPhoto(
        bytes: _editPhotoBytes,
        picking: _picking,
        onReplace: _replacePhoto,
        onRemove: _removePhoto,
      ),
      AppSpacing.gapLg,

      Row(
        children: [
          Expanded(
            child: OutlinedButton(
              // 취소 — 편집 전 상태로. 아무것도 쓰지 않는다.
              onPressed: _saving ? null : _cancelEdit,
              child: const Text('취소'),
            ),
          ),
          AppSpacing.gapWSm,
          Expanded(
            child: FilledButton(
              // 저장 중엔 비활성(중복 저장 방지) + 스피너.
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('저장'),
            ),
          ),
        ],
      ),
    ];
  }

  /// 공백만 있는 입력은 `null`(= 메모 없음)로 정규화한다(저장소 normalizeMemo와 동치).
  static String? _normalizeMemo(String text) {
    final trimmed = text.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  /// base64 → 바이트. null·빈 문자열·깨진 인코딩은 전부 null(예외를 경계에서 삼킨다).
  static Uint8List? _decode(String? base64) {
    if (base64 == null || base64.isEmpty) return null;
    try {
      return base64Decode(base64);
    } on FormatException {
      return null;
    }
  }
}

/// 좌측 accent 보더가 있는 메모 표시 박스.
class _MemoBox extends StatelessWidget {
  const _MemoBox({required this.memo});

  final String memo;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLow,
        borderRadius: AppRadius.mdAll,
        border: Border(left: BorderSide(color: scheme.primary, width: 3)),
      ),
      child: Text(memo, style: theme.textTheme.bodyMedium),
    );
  }
}

/// 편집 모드 사진 영역: 현재 사진 미리보기 + "사진 바꾸기" + "사진 제거"(있을 때만).
///
/// 색 규칙: 사진은 코인·보상이 아니라 노랑을 쓰지 않는다. 바꾸기 버튼은 그린(주요
/// 행동), 미리보기·제거는 중립이다.
class _EditPhoto extends StatelessWidget {
  const _EditPhoto({
    required this.bytes,
    required this.picking,
    required this.onReplace,
    required this.onRemove,
  });

  final Uint8List? bytes;
  final bool picking;
  final VoidCallback onReplace;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 현재 사진(있으면 썸네일, 없으면 "사진 없음").
        if (bytes != null)
          _PhotoFrame(
            child: Image.memory(
              bytes!,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => const _PhotoPlaceholder(),
            ),
          )
        else
          const _PhotoPlaceholder(),
        AppSpacing.gapSm,

        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: picking ? null : onReplace,
                icon: picking
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Symbols.photo_camera),
                label: Text(picking ? '사진 여는 중…' : '사진 바꾸기'),
              ),
            ),
            // 제거는 사진이 있을 때만 뜬다. Expanded로 감싸야 Row 안에서 바꾸기 버튼
            // (Expanded)과 나란히 유한 폭을 갖는다(비-flex 자식은 무한 폭을 받는다).
            if (bytes != null) ...[
              AppSpacing.gapWSm,
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: picking ? null : onRemove,
                  icon: const Icon(Symbols.delete),
                  label: const Text('제거'),
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }
}

/// 완료 날짜 칩 — 달력 아이콘 + `yyyy년 M월 d일`(KST).
class _CompletedDate extends StatelessWidget {
  const _CompletedDate({required this.completedAt});

  final DateTime completedAt;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Symbols.calendar_today, size: 14, color: scheme.onSurfaceVariant),
        AppSpacing.gapWXs,
        Text(
          _formatKstDate(completedAt),
          style: theme.textTheme.labelMedium?.copyWith(
            color: scheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

/// 사진 썸네일·스피너를 담는 고정 높이 라운드 프레임.
class _PhotoFrame extends StatelessWidget {
  const _PhotoFrame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: AppRadius.mdAll,
      child: SizedBox(width: double.infinity, height: 180, child: child),
    );
  }
}

/// "사진 없음" 플레이스홀더 — 없음·실패·깨진 사진 공통. 중립 색만 쓴다.
class _PhotoPlaceholder extends StatelessWidget {
  const _PhotoPlaceholder();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Container(
      width: double.infinity,
      height: 96,
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHigh,
        borderRadius: AppRadius.mdAll,
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Symbols.image_not_supported,
            color: scheme.onSurfaceVariant,
            size: 28,
          ),
          AppSpacing.gapXs,
          Text(
            '사진 없음',
            style: theme.textTheme.labelMedium?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

/// 사진 로딩용 소형 스피너.
class _LoadingSpinner extends StatelessWidget {
  const _LoadingSpinner();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      width: 28,
      height: 28,
      child: CircularProgressIndicator(strokeWidth: 2),
    );
  }
}

/// 완료 날짜를 KST 벽시계 기준 `yyyy년 M월 d일`로 표시한다.
///
/// 저장된 `completedAt`은 UTC 순간이라 그대로 읽으면 자정 근처 완료가 하루 어긋난다.
/// 앱의 하루 경계가 KST인 것과 맞춘다([kKstOffset] 단일 정의처를 인용).
String _formatKstDate(DateTime instant) {
  final kst = instant.toUtc().add(kKstOffset);
  return '${kst.year}년 ${kst.month}월 ${kst.day}일';
}

/// 보관함 카드 상세 시트를 띄운다.
///
/// [loadProof]는 인증 사진 lazy 조회 클로저다. [onSaveMemo]·[onSavePhoto]·[pickImage]를
/// 함께 주면 시트에 "수정" 버튼이 뜨고 메모·사진을 편집할 수 있다(셋 다 주지 않으면
/// 보기 전용). 화면이 uid·저장소·image_picker를 알고, 시트는 클로저로만 말을 건다.
Future<void> showAchievementDetailSheet(
  BuildContext context, {
  required Quest quest,
  required Future<String?> Function() loadProof,
  Future<void> Function(String? memo)? onSaveMemo,
  Future<void> Function(String? base64)? onSavePhoto,
  Future<Uint8List?> Function()? pickImage,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => AchievementDetailSheet(
      quest: quest,
      loadProof: loadProof,
      onSaveMemo: onSaveMemo,
      onSavePhoto: onSavePhoto,
      pickImage: pickImage,
    ),
  );
}
