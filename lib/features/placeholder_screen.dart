import 'package:flutter/material.dart';

import '../core/theme/app_spacing.dart';
import '../core/widgets/state_views.dart';

/// 아직 구현하지 않은 탭. 상점(4주차) · 보관함(3주차) · MY.
///
/// 빈 화면 대신 "왜 비어 있는지"를 말해 주는 편이 정직하고, 탭바 데모도 완성된다.
class PlaceholderScreen extends StatelessWidget {
  const PlaceholderScreen({
    super.key,
    required this.title,
    required this.emoji,
    required this.message,
  });

  final String title;
  final String emoji;
  final String message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenH,
                AppSpacing.md,
                AppSpacing.screenH,
                0,
              ),
              child: Text(title, style: theme.textTheme.headlineLarge),
            ),
            Expanded(
              child: EmptyView(title: '준비 중이에요', message: message, emoji: emoji),
            ),
          ],
        ),
      ),
    );
  }
}
