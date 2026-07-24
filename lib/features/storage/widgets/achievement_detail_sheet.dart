import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/kst_date.dart';
import '../../../core/widgets/difficulty_pill.dart';
import '../../../core/widgets/reward_chip.dart';
import '../../../models/quest.dart';

/// 보관함 카드 상세 시트 — **보기 전용**(3단계-a).
///
/// 완료한 퀘스트를 탭하면 "완료 당시 무엇을 남겼나"를 펼쳐 본다: 제목 · 난이도 ·
/// 지급 보상 · 완료 날짜 · 인증 메모 · 인증 사진. 수정·삭제는 없다(다음 조각).
///
/// **저장소도 provider도 모른다.** 화면(`storage_screen`)이 사진 조회를 [loadProof]
/// 클로저로 주입하고, 이 위젯은 그걸 시트가 열릴 때 **한 번만** 호출한다. 덕분에
/// 위젯 테스트가 가짜 클로저(base64 반환·null·예외)만으로 세 경로를 전부 재현한다.
///
/// 색 규칙(one-step-design): 노랑은 코인·보상 전용이라 [RewardChip]이 전담한다.
/// 이 파일은 노랑에 직접 접근하지 않는다(난이도 노랑 틴트는 DifficultyPill 안에 갇힘).
class AchievementDetailSheet extends StatefulWidget {
  const AchievementDetailSheet({
    super.key,
    required this.quest,
    required this.loadProof,
  });

  final Quest quest;

  /// 인증 사진 base64를 lazy 조회하는 클로저. 사진이 없으면 `null`을 돌려준다.
  ///
  /// 왜 미리 받지 않고 클로저인가: proof 문서는 questId당 별도라 목록에서 미리 다
  /// 읽으면 비싸다(3주차 문서 분리 이유). 상세를 **열 때** 그 하나만 읽는다.
  final Future<String?> Function() loadProof;

  @override
  State<AchievementDetailSheet> createState() => _AchievementDetailSheetState();
}

class _AchievementDetailSheetState extends State<AchievementDetailSheet> {
  /// 사진 조회 Future — initState에서 **한 번만** 만든다. build에서 만들면
  /// 리빌드마다 재조회돼 스피너가 깜빡이고 네트워크를 반복해 친다.
  late final Future<String?> _proofFuture = widget.loadProof();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final quest = widget.quest;
    final memo = quest.memo;
    final completedAt = quest.completedAt;

    return SafeArea(
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

              // 지급 보상 — RewardChip이 노랑(코인)을 전담한다.
              RewardChip(reward: quest.reward),
              AppSpacing.gapLg,

              // 인증 메모 — 남긴 게 있을 때만 그린다(없으면 통째로 생략).
              if (memo != null) ...[
                Text('메모', style: theme.textTheme.titleMedium),
                AppSpacing.gapSm,
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
                  child: Text(memo, style: theme.textTheme.bodyMedium),
                ),
                AppSpacing.gapLg,
              ],

              // 인증 사진 — lazy 조회. 로딩/없음/실패를 각각 처리한다.
              Text('사진', style: theme.textTheme.titleMedium),
              AppSpacing.gapSm,
              _ProofPhoto(proofFuture: _proofFuture),
            ],
          ),
        ),
      ),
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
        Icon(
          Symbols.calendar_today,
          size: 14,
          color: scheme.onSurfaceVariant,
        ),
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

/// 인증 사진 영역. [proofFuture]의 세 결과를 각각 그린다:
/// 로딩(스피너) · 사진 있음(썸네일) · 없음/실패("사진 없음" 플레이스홀더).
class _ProofPhoto extends StatelessWidget {
  const _ProofPhoto({required this.proofFuture});

  final Future<String?> proofFuture;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<String?>(
      future: proofFuture,
      builder: (context, snapshot) {
        // 로딩 — 사진 자리를 지키는 스피너.
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const _PhotoFrame(child: Center(child: _LoadingSpinner()));
        }

        // 실패·없음 — 조회가 에러여도(네트워크) 시트는 살아 있고 "사진 없음"을 그린다.
        final base64 = snapshot.hasError ? null : snapshot.data;
        final bytes = _decode(base64);
        if (bytes == null) return const _PhotoPlaceholder();

        // 사진 있음 — 디코딩된 바이트가 깨졌으면 errorBuilder가 플레이스홀더로 폴백.
        return _PhotoFrame(
          child: Image.memory(
            bytes,
            width: double.infinity,
            fit: BoxFit.cover,
            errorBuilder: (_, _, _) => const _PhotoPlaceholder(),
          ),
        );
      },
    );
  }

  /// base64 → 바이트. null·빈 문자열·깨진 인코딩은 전부 null로 떨어뜨린다
  /// (예외가 시트를 죽이지 않게 경계에서 삼킨다).
  static Uint8List? _decode(String? base64) {
    if (base64 == null || base64.isEmpty) return null;
    try {
      return base64Decode(base64);
    } on FormatException {
      return null;
    }
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

/// 보관함 카드 상세 시트를 띄운다(보기 전용).
///
/// [loadProof]는 이 퀘스트의 인증 사진을 lazy 조회하는 클로저다 — 화면이 uid·저장소를
/// 알고 시트는 모른다(경계 유지). 반환 Future는 시트가 닫히면 완료된다.
Future<void> showAchievementDetailSheet(
  BuildContext context, {
  required Quest quest,
  required Future<String?> Function() loadProof,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => AchievementDetailSheet(quest: quest, loadProof: loadProof),
  );
}
