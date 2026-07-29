import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import 'pixel_art.dart';

/// 로딩 · 빈 상태 · 오류 상태 공통 위젯.
///
/// checklist 1주차는 화면마다 세 상태가 **각각 구분되어** 표시될 것을 요구한다.
/// 화면에서 매번 새로 그리지 않고 이 위젯들을 재사용해 구분을 보장한다.

/// 데이터 로딩 중 자리를 채우는 회색 블록. 실제 콘텐츠와 같은 실루엣으로 배치한다.
class SkeletonBox extends StatefulWidget {
  const SkeletonBox({
    super.key,
    this.width = double.infinity,
    required this.height,
    this.radius = AppRadius.md,
  });

  final double width;
  final double height;
  final double radius;

  @override
  State<SkeletonBox> createState() => _SkeletonBoxState();
}

class _SkeletonBoxState extends State<SkeletonBox>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final base = Theme.of(context).colorScheme.surfaceContainerHigh;
    return FadeTransition(
      opacity: Tween<double>(begin: 0.45, end: 0.9).animate(
        CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
      ),
      child: Container(
        width: widget.width,
        height: widget.height,
        decoration: BoxDecoration(
          color: base,
          borderRadius: BorderRadius.circular(widget.radius),
        ),
      ),
    );
  }
}

/// 데이터가 아직 없어서 보여줄 것이 없는 상태(오류가 아님).
class EmptyView extends StatelessWidget {
  const EmptyView({
    super.key,
    required this.title,
    this.message,
    this.emoji = '🪺',
    this.asset,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String? message;

  /// [asset]을 못 읽을 때의 대체 표시. 자산이 없는 호출부는 이것만 쓴다.
  final String emoji;

  /// 빈 화면 일러스트 자산. **선택 사항이다** — 넘기지 않으면 예전처럼 이모지만
  /// 그린다(자산 없는 호출부가 무수정으로 계속 컴파일된다).
  final String? asset;

  final String? actionLabel;
  final VoidCallback? onAction;

  /// 일러스트 변의 길이. 이모지 목업(48)보다 크게 잡는다 — 512px 일러스트라
  /// 48로는 무엇을 그렸는지 안 보인다.
  static const double _artSize = 96;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (asset == null)
              Text(emoji, style: const TextStyle(fontSize: 48))
            else
              // 여기만 filterQuality가 medium이다. 다른 도트 자산은 원본 크기
              // 근처거나 확대라 최근접(none)이 맞지만, 빈 화면 일러스트는
              // 512 → 96 = 0.19배 **축소**라 최근접이면 픽셀 행·열이 통째로
              // 버려져 그림이 깨진다.
              PixelArt.emoji(
                asset: asset!,
                emoji: emoji,
                size: _artSize,
                filterQuality: FilterQuality.medium,
              ),
            AppSpacing.gapMd,
            Text(
              title,
              style: theme.textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            if (message != null) ...[
              AppSpacing.gapSm,
              Text(
                message!,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            ],
            if (actionLabel != null && onAction != null) ...[
              AppSpacing.gapLg,
              FilledButton(onPressed: onAction, child: Text(actionLabel!)),
            ],
          ],
        ),
      ),
    );
  }
}

/// 무언가 실패한 상태. 빈 상태와 **시각적으로 명확히 다르다**(에러 색 + 경고 아이콘 + 재시도).
class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Symbols.error,
              size: 48,
              color: theme.colorScheme.error,
              fill: 1,
            ),
            AppSpacing.gapMd,
            Text(
              message,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.error,
              ),
              textAlign: TextAlign.center,
            ),
            if (onRetry != null) ...[
              AppSpacing.gapLg,
              OutlinedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Symbols.refresh),
                label: const Text('다시 시도'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
