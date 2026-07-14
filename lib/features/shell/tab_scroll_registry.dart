import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 탭 재선택 시 해당 탭을 맨 위로 스크롤하기 위한 등록소.
///
/// checklist 1주차: "탭 재선택 시 스크롤 초기화 또는 루트 복귀가 의도대로 동작한다".
/// 하위 라우트에 들어가 있으면 go_router가 루트로 되돌리고(pop),
/// 이미 루트라면 여기 등록된 컨트롤러로 스크롤을 올린다.
class TabScrollRegistry {
  final Map<int, ScrollController> _controllers = {};

  void register(int tabIndex, ScrollController controller) {
    _controllers[tabIndex] = controller;
  }

  void unregister(int tabIndex) {
    _controllers.remove(tabIndex);
  }

  void scrollToTop(int tabIndex) {
    final controller = _controllers[tabIndex];
    if (controller == null || !controller.hasClients) return;
    if (controller.offset == 0) return;

    controller.animateTo(
      0,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
    );
  }
}

final tabScrollRegistryProvider = Provider<TabScrollRegistry>(
  (ref) => TabScrollRegistry(),
);

/// 탭 루트 화면이 자기 ScrollController를 등록하도록 돕는 mixin.
mixin TabScrollRegistration<T extends ConsumerStatefulWidget>
    on ConsumerState<T> {
  final scrollController = ScrollController();

  /// riverpod은 위젯이 dispose된 뒤 `ref` 사용을 금지한다.
  /// 그래서 레지스트리를 initState에서 붙잡아 두고 dispose에서 그 참조를 쓴다.
  TabScrollRegistry? _registry;

  /// 이 화면이 속한 탭 인덱스.
  int get tabIndex;

  @override
  void initState() {
    super.initState();
    final registry = ref.read(tabScrollRegistryProvider);
    registry.register(tabIndex, scrollController);
    _registry = registry;
  }

  @override
  void dispose() {
    _registry?.unregister(tabIndex);
    scrollController.dispose();
    super.dispose();
  }
}
