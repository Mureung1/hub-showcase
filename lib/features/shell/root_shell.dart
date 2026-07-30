import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'tab_scroll_registry.dart';

/// 5탭 셸. `StatefulShellRoute.indexedStack`이 탭마다 별도 Navigator를 유지하므로
/// 탭을 오가도 각 탭의 스크롤 위치와 화면 스택이 그대로 보존된다.
class RootShell extends ConsumerWidget {
  const RootShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  /// 탭 하나에 **아이콘 두 개**를 둔다 — 비선택은 외곽선, 선택은 채움.
  ///
  /// Material Symbols 시절엔 아이콘 하나에 `fill: 0/1` 축만 바꿔 썼지만,
  /// Material Icons(Flutter 내장)는 가변폰트가 아니라 **채움과 외곽선이 이름부터
  /// 다른 별개 글리프**다. `fill` 인자는 조용히 무시되므로 이름으로 갈라야 한다.
  static const _destinations = [
    (icon: Icons.home_outlined, selectedIcon: Icons.home, label: '홈'),
    (
      icon: Icons.assignment_outlined,
      selectedIcon: Icons.assignment,
      label: '퀘스트',
    ),
    (
      icon: Icons.storefront_outlined,
      selectedIcon: Icons.storefront,
      label: '상점',
    ),
    (
      icon: Icons.inventory_2_outlined,
      selectedIcon: Icons.inventory_2,
      label: '보관함',
    ),
    (icon: Icons.person_outline, selectedIcon: Icons.person, label: 'MY'),
  ];

  void _onTap(WidgetRef ref, int index) {
    final isReselect = index == navigationShell.currentIndex;

    // 같은 탭을 다시 누르면 그 탭의 하위 화면을 모두 닫고 루트로 돌아간다.
    navigationShell.goBranch(index, initialLocation: isReselect);

    // 이미 루트에 있었다면 대신 맨 위로 스크롤한다.
    if (isReselect) {
      ref.read(tabScrollRegistryProvider).scrollToTop(index);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: DecoratedBox(
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(color: theme.colorScheme.outlineVariant),
          ),
        ),
        child: NavigationBar(
          selectedIndex: navigationShell.currentIndex,
          onDestinationSelected: (index) => _onTap(ref, index),
          destinations: [
            for (final d in _destinations)
              NavigationDestination(
                icon: Icon(d.icon),
                selectedIcon: Icon(d.selectedIcon),
                label: d.label,
              ),
          ],
        ),
      ),
    );
  }
}
