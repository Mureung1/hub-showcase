import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import 'tab_scroll_registry.dart';

/// 5탭 셸. `StatefulShellRoute.indexedStack`이 탭마다 별도 Navigator를 유지하므로
/// 탭을 오가도 각 탭의 스크롤 위치와 화면 스택이 그대로 보존된다.
class RootShell extends ConsumerWidget {
  const RootShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  static const _destinations = [
    (icon: Symbols.home, label: '홈'),
    (icon: Symbols.assignment, label: '퀘스트'),
    (icon: Symbols.storefront, label: '상점'),
    (icon: Symbols.inventory_2, label: '보관함'),
    (icon: Symbols.person, label: 'MY'),
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
                selectedIcon: Icon(d.icon, fill: 1),
                label: d.label,
              ),
          ],
        ),
      ),
    );
  }
}
