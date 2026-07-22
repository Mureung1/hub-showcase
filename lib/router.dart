import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'features/home/home_screen.dart';
import 'features/placeholder_screen.dart';
import 'features/quest/decompose_notifier.dart';
import 'features/quest/quest_create_screen.dart';
import 'features/quest/quest_list_screen.dart';
import 'features/quest/quest_split_screen.dart';
import 'features/shell/root_shell.dart';

/// 앱이 쓰는 라우터 인스턴스.
final router = createRouter();

/// 5탭 라우팅.
///
/// `StatefulShellRoute.indexedStack`을 쓰는 이유:
/// - 탭마다 별도 Navigator를 유지해 **탭 상태가 보존**된다
/// - `goBranch(initialLocation: true)`가 **탭 재선택 시 루트 복귀**를 준다
/// - 안드로이드 뒤로가기 시맨틱이 탭 안에서 올바르게 동작한다
/// 셋 다 checklist 1주차 "하단 내비게이션" 항목이 명시적으로 요구하는 것들이다.
///
/// 팩토리 함수인 이유: 라우터는 **탐색 상태를 들고 있다.** 전역 인스턴스 하나를
/// 테스트마다 재사용하면 앞 테스트가 남긴 탭/스택 상태가 다음 테스트로 샌다.
/// 테스트는 매번 새 라우터를 만든다.
GoRouter createRouter({String initialLocation = '/home'}) => GoRouter(
  initialLocation: initialLocation,
  routes: [
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) =>
          RootShell(navigationShell: navigationShell),
      branches: [
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/home',
              builder: (context, state) => const HomeScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/quest',
              builder: (context, state) => const QuestListScreen(),
              routes: [
                // 퀘스트 탭 안쪽 라우트. 수동 등록(new)과 AI 분해(split)가 공존한다.
                GoRoute(
                  path: 'new',
                  builder: (context, state) => const QuestCreateScreen(),
                ),
                // 무인자 진입 = 큰 목표 분해(기존 그대로).
                // `extra`에 [RedecomposeTarget]을 실어 오면 **멈춘 퀘스트 재분해**
                // 모드가 된다. 쿼리 파라미터가 아니라 extra인 이유: 원본 퀘스트
                // ID·목표 ID·목표 텍스트를 URL에 늘어놓으면 링크가 길어지고
                // 인코딩 문제가 생긴다. 앱 내 이동 전용 경로라 extra로 충분하다.
                // extra가 없거나 타입이 다르면(딥링크·복원) 큰 목표 분해로 떨어진다.
                GoRoute(
                  path: 'split',
                  builder: (context, state) {
                    final extra = state.extra;
                    return QuestSplitScreen(
                      target: extra is RedecomposeTarget ? extra : null,
                    );
                  },
                ),
              ],
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/shop',
              builder: (context, state) => const PlaceholderScreen(
                title: '상점',
                emoji: '🛍️',
                message: '모은 코인으로 배경과 이펙트를 살 수 있어요.\n4주차에 열립니다.',
              ),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/storage',
              builder: (context, state) => const PlaceholderScreen(
                title: '보관함',
                emoji: '🏆',
                message: '완료한 도전을 사진과 메모로 기록해요.\n3주차에 열립니다.',
              ),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/profile',
              builder: (context, state) => const PlaceholderScreen(
                title: 'MY',
                emoji: '👤',
                message: '프로필과 설정이 들어갑니다.',
              ),
            ),
          ],
        ),
      ],
    ),
  ],
  errorBuilder: (context, state) => Scaffold(
    body: Center(child: Text('페이지를 찾을 수 없어요\n${state.uri}')),
  ),
);
