import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/error/app_failure.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/kst_date.dart';
import '../../core/widgets/state_views.dart';
import '../../models/app_user.dart';
import '../../providers/providers.dart';
import '../shell/tab_scroll_registry.dart';

/// MY — 통계 + 설정.
///
/// 담는 것은 **통계(완료 수·연속·가입일)와 설정**이다(사용자 결정). 캐릭터 요약·지표
/// 3종은 여기 두지 않는다 — 캐릭터는 홈, 성취는 보관함이 이미 맡는다.
///
/// **완료 수의 소스는 성취 기록**([achievementsProvider])이다. 보관함이 세는 것과 같은
/// 소스라 두 화면의 "해낸 도전 수"가 어긋나지 않는다(지급 1건 = 기록 1건). 스트릭·가입일은
/// 사용자 문서([currentUserProvider])에서 온다.
///
/// **색 규칙(one-step-design).** 노랑은 코인·보상·스트릭 전용이지만, 여기 스트릭은 배지가
/// 아니라 요약 통계 수치라 보관함 요약 카드와 같은 판단으로 **그린/중립**으로 둔다
/// (color_role_test 무수정 통과). 이 화면은 노랑에 직접 접근하지 않는다.
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen>
    with TabScrollRegistration {
  @override
  int get tabIndex => 4;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // 헤더·설정은 async 데이터에 의존하지 않으므로 항상 그린다. 통계만 자체적으로
    // 로딩/오류/데이터를 처리한다 — 네트워크가 죽어도 설정(계정 연동 자리)은 닿게 둔다.
    return Scaffold(
      body: SafeArea(
        child: ListView(
          controller: scrollController,
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenH,
            AppSpacing.md,
            AppSpacing.screenH,
            AppSpacing.xl,
          ),
          children: [
            Text('MY', style: theme.textTheme.headlineLarge),
            AppSpacing.gapXs,
            Text(
              '내 도전 기록과 설정이에요.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            AppSpacing.gapLg,

            _SectionLabel('통계'),
            AppSpacing.gapSm,
            _statsSection(),
            AppSpacing.gapXl,

            _SectionLabel('설정'),
            AppSpacing.gapSm,
            const _SettingsSection(),
          ],
        ),
      ),
    );
  }

  /// 통계 영역의 5상태 처리.
  ///
  /// 완료 수(achievements)와 스트릭·가입일(user) 둘 다 필요하므로 두 provider의
  /// AsyncValue를 합쳐 판정한다. **빈 상태는 완료 0을 그대로 렌더**한다(EmptyView가
  /// 아니라 "0"으로 — 프로필은 신규 사용자도 정상 화면이어야 한다).
  Widget _statsSection() {
    final achievementsAsync = ref.watch(achievementsProvider);
    final userAsync = ref.watch(currentUserProvider);

    if (achievementsAsync.isLoading || userAsync.isLoading) {
      return const _StatsSkeleton();
    }

    if (achievementsAsync.hasError || userAsync.hasError) {
      final error = achievementsAsync.error ?? userAsync.error;
      return SizedBox(
        height: 240,
        child: ErrorView(
          message: error is AppFailure ? error.message : '통계를 불러오지 못했어요.',
          onRetry: () {
            ref.invalidate(achievementsProvider);
            ref.invalidate(currentUserProvider);
          },
        ),
      );
    }

    // 완료 수 = 성취 기록 개수. 상수가 아니라 이 스트림 길이라야 기록이 늘 때 함께 는다.
    final completedCount = achievementsAsync.requireValue.length;
    return _StatsContent(
      completedCount: completedCount,
      user: userAsync.requireValue,
    );
  }
}

/// 섹션 제목 라벨(통계 · 설정).
class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Text(
      text,
      style: theme.textTheme.titleMedium?.copyWith(
        color: theme.colorScheme.onSurfaceVariant,
      ),
    );
  }
}

/// 통계 본문 — 완료 수·연속 일수 2분할 카드 + 가입일 행.
class _StatsContent extends StatelessWidget {
  const _StatsContent({required this.completedCount, required this.user});

  final int completedCount;
  final AppUser user;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _StatCard(
          child: Row(
            children: [
              Expanded(
                child: _Stat(
                  icon: Symbols.check_circle,
                  value: '$completedCount',
                  label: '완료한 도전',
                ),
              ),
              const _StatDivider(),
              Expanded(
                child: _Stat(
                  icon: Symbols.local_fire_department,
                  // 스트릭 0이면 숫자 대신 "아직 없음"으로 — 신규 사용자에게 0은
                  // 실패처럼 읽힌다. 요약 수치라 색은 중립/그린이다(노랑 아님).
                  value: user.streak > 0 ? '${user.streak}' : '아직 없음',
                  label: '연속 출석',
                ),
              ),
            ],
          ),
        ),
        // 가입일은 값이 있을 때만 — createdAt이 null(구버전 문서 등)이면 통째로 생략한다.
        if (user.createdAt != null) ...[
          AppSpacing.gapMd,
          _StatCard(
            child: _JoinedRow(createdAt: user.createdAt!),
          ),
        ],
      ],
    );
  }
}

/// 흰 배경 + 소프트 섀도 카드(보관함 요약 카드와 같은 시각 언어).
class _StatCard extends StatelessWidget {
  const _StatCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLowest,
        borderRadius: AppRadius.lgAll,
        border: Border.all(color: theme.colorScheme.outlineVariant),
        boxShadow: AppColors.softShadow,
      ),
      child: child,
    );
  }
}

class _StatDivider extends StatelessWidget {
  const _StatDivider();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 40,
      color: Theme.of(context).colorScheme.outlineVariant,
    );
  }
}

/// 아이콘 + 큰 수치 + 라벨. 색은 그린/중립(노랑 규칙 준수).
class _Stat extends StatelessWidget {
  const _Stat({required this.icon, required this.value, required this.label});

  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        Icon(icon, size: 22, fill: 1, color: AppColors.primary),
        AppSpacing.gapXs,
        Text(
          value,
          style: theme.textTheme.headlineMedium?.copyWith(
            color: AppColors.primary,
          ),
          textAlign: TextAlign.center,
        ),
        Text(
          label,
          style: theme.textTheme.labelMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

/// 가입일 행 — 달력 아이콘 + "가입일" 라벨 + KST 날짜.
class _JoinedRow extends StatelessWidget {
  const _JoinedRow({required this.createdAt});

  final DateTime createdAt;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Row(
      children: [
        Icon(Symbols.calendar_today, size: 20, color: scheme.onSurfaceVariant),
        AppSpacing.gapWMd,
        Text(
          '가입일',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: scheme.onSurfaceVariant,
          ),
        ),
        const Spacer(),
        Text(
          _formatKstDate(createdAt),
          style: theme.textTheme.titleMedium,
        ),
      ],
    );
  }
}

/// 가입일을 KST 벽시계 기준 `yyyy년 M월 d일`로. `completedAt` 포맷과 같은 판단
/// (저장값은 UTC 순간이라 그대로 읽으면 자정 근처가 하루 어긋난다). [kKstOffset] 인용.
String _formatKstDate(DateTime instant) {
  final kst = instant.toUtc().add(kKstOffset);
  return '${kst.year}년 ${kst.month}월 ${kst.day}일';
}

/// 통계 로딩 스켈레톤 — 실제 카드와 같은 실루엣.
class _StatsSkeleton extends StatelessWidget {
  const _StatsSkeleton();

  @override
  Widget build(BuildContext context) {
    return const Column(
      children: [
        SkeletonBox(height: 84, radius: AppRadius.lg),
        AppSpacing.gapMd,
        SkeletonBox(height: 56, radius: AppRadius.lg),
      ],
    );
  }
}

/// 설정 섹션.
///
/// **OAuth 자리만 연다(실제 구현 아님).** 현재 계정은 익명이라 로그아웃하면 진행상황이
/// 통째로 날아간다. 그래서 "Google 계정 연동"을 준비 상태로만 두고, 나중에 익명↔Google
/// 연동(OAuth)이 붙으면 여기서 실제 기능을 연다. 홈의 환생 버튼이 "4주차에 열려요"로
/// 정직하게 비활성인 것과 같은 방식이다.
///
/// **로그아웃 버튼은 두지 않는다** — 익명 로그아웃 = 데이터 유실. 회귀 방어로 테스트가
/// 이 버튼의 부재를 못 박는다. OAuth 연동이 붙은 뒤 재판단한다.
class _SettingsSection extends StatelessWidget {
  const _SettingsSection();

  @override
  Widget build(BuildContext context) {
    return const _SettingsTile(
      icon: Symbols.link,
      title: 'Google 계정 연동',
      subtitle: '다른 기기에서도 이어서 도전할 수 있어요.',
    );
  }
}

/// "준비 중" 설정 항목. 탭하면 "곧 지원돼요"를 안내한다(아직 동작 없음).
///
/// 완전 비활성(onTap=null)이 아니라 탭 가능하게 둔 이유: 사용자가 눌러 보고 "왜 안 되지"
/// 하는 것보다, 눌렀을 때 "곧 지원돼요"라고 정직하게 답하는 편이 낫다.
class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Material(
      color: scheme.surfaceContainerLowest,
      borderRadius: AppRadius.lgAll,
      child: InkWell(
        borderRadius: AppRadius.lgAll,
        onTap: () {
          ScaffoldMessenger.of(context)
            ..hideCurrentSnackBar()
            ..showSnackBar(
              const SnackBar(content: Text('계정 연동은 곧 지원돼요.')),
            );
        },
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            borderRadius: AppRadius.lgAll,
            border: Border.all(color: scheme.outlineVariant),
          ),
          child: Row(
            children: [
              Icon(icon, color: scheme.onSurfaceVariant),
              AppSpacing.gapWMd,
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: theme.textTheme.titleMedium),
                    AppSpacing.gapXs,
                    Text(
                      subtitle,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              AppSpacing.gapWMd,
              const _ComingSoonPill(),
            ],
          ),
        ),
      ),
    );
  }
}

/// "준비 중" 배지. 중립 색만 쓴다(노랑·그린 아님 — 상태 알림일 뿐 보상·완료가 아니다).
class _ComingSoonPill extends StatelessWidget {
  const _ComingSoonPill();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHigh,
        borderRadius: AppRadius.fullAll,
      ),
      child: Text(
        '준비 중',
        style: theme.textTheme.labelSmall?.copyWith(
          color: scheme.onSurfaceVariant,
        ),
      ),
    );
  }
}
