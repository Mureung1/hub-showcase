import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/error/app_failure.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/kst_date.dart';
import '../../core/widgets/level_pill.dart';
import '../../core/widgets/pixel_art.dart';
import '../../core/widgets/rebirth_badge.dart';
import '../../core/widgets/screen_title.dart';
import '../../core/widgets/stat_card.dart';
import '../../core/widgets/state_views.dart';
import '../../models/app_user.dart';
import '../../providers/providers.dart';
import '../shell/tab_scroll_registry.dart';

/// MY — 캐릭터 + 통계 + 설정.
///
/// 정본은 Redesign 페이지 `47:405`다. 위에서부터 AppBar(`47:406`, **코인 pill 없음**) ·
/// 리드 텍스트 · 캐릭터 블록(`47:410`) · 「통계」 + StatCard 2장(`47:417`) ·
/// 「설정」 + SettingsTile(`47:431`) 순이고, 블록 사이 간격은 20 일괄이다.
///
/// **완료 수의 소스는 성취 기록**([achievementsProvider])이다. 보관함이 세는 것과 같은
/// 소스라 두 화면의 "해낸 도전 수"가 어긋나지 않는다(지급 1건 = 기록 1건). 스트릭·가입일·
/// 캐릭터는 사용자 문서([currentUserProvider])에서 온다.
///
/// **색 규칙(one-step-design).** 스트릭은 🟡 노랑이다 — 보관함·홈과 같은 색을 쓴다
/// (사용자 결정: 같은 수치가 화면마다 다른 색이면 "노랑 = 보상" 신호가 약해진다).
/// 이 화면이 노랑 HEX에 직접 닿지는 않는다. 노랑을 아는 것은 [StatCard] 하나뿐이다.
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
    // 가입일은 설정 항목이지만 값은 사용자 문서에서 온다. 못 읽으면(로딩·오류)
    // null이 되어 그 줄만 빠지고, 계정 연동 자리는 그대로 남는다 — 아래 참고.
    final joinedAt = ref.watch(currentUserProvider).valueOrNull?.createdAt;

    // 헤더·설정은 async 데이터에 의존하지 않으므로 항상 그린다. 캐릭터·통계만 자체적으로
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
            // 정본 AppBar(`47:406`)에도 코인 pill이 없다(보관함과 같다).
            // 제목 크기는 5탭 공통([ScreenTitle]) — 사용자 결정이라 정본 실측(20)과 다르다.
            // `leadingMark`는 5탭에만 켠다(→ `ScreenTitle.leadingMark`).
            const ScreenTitle('MY', leadingMark: true),
            // 정본 실측: AppBar 아래 패딩 8 + Content 위 패딩 8 = 16.
            AppSpacing.gapMd,
            Text(
              '내 도전 기록과 설정이에요.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            // 아래로는 정본 Content의 블록 간격 20 일괄이다.
            AppSpacing.gapBlock,

            _characterSection(),
            AppSpacing.gapBlock,

            _SectionLabel('통계'),
            AppSpacing.gapBlock,
            _statsSection(),
            AppSpacing.gapBlock,

            _SectionLabel('설정'),
            AppSpacing.gapBlock,
            _SettingsSection(joinedAt: joinedAt),
          ],
        ),
      ),
    );
  }

  /// 캐릭터 블록(정본 `47:410`)의 상태 처리.
  ///
  /// **오류일 때는 아무것도 그리지 않는다.** 같은 사용자 문서를 통계도 보고 있어서,
  /// 여기서도 [ErrorView]를 띄우면 한 화면에 오류 카드가 두 장 생긴다(재시도 버튼도
  /// 두 개다). 실패는 통계 영역이 한 번만 말하게 두고, 여기는 조용히 접힌다.
  Widget _characterSection() {
    final userAsync = ref.watch(currentUserProvider);

    if (userAsync.isLoading) return const _CharacterSkeleton();
    final user = userAsync.valueOrNull;
    if (user == null) return const SizedBox.shrink();

    return _CharacterBlock(user: user);
  }

  /// 통계 영역의 5상태 처리.
  ///
  /// 완료 수(achievements)와 스트릭(user) 둘 다 필요하므로 두 provider의
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
///
/// 정본(`47:416`·`47:430`)은 20/700/28 `onSurface`다 — 화면 제목과 같은 급이고
/// 색도 낮추지 않는다(예전엔 `titleMedium` + `onSurfaceVariant`라 본문에 묻혔다).
class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(text, style: Theme.of(context).textTheme.titleLarge);
  }
}

/// 캐릭터 블록 — 도트아트 · 단계명 · 레벨 pill · 환생 표식(정본 `47:410`).
///
/// 홈 히어로와 **역할이 다르다.** 홈은 풍경 위에 세운 full-bleed 히어로(배경·오라
/// 장착까지 그린다)고, 여기는 "내가 지금 누구인지"만 말하는 요약이다 — 카드도 배경도
/// 없이 가운데 정렬된 네 줄이다. 그래서 [CharacterHero]를 재사용하지 않는다.
///
/// 정본은 이모지(🐤)를 그렸지만 우리는 진화 단계 **도트아트 자산**을 쓴다(자산을 못
/// 읽으면 이모지로 떨어진다 — 앱 전체의 캐릭터 렌더 규칙). 레벨 pill은 홈 히어로
/// 이름표와 **같은** [LevelPill]이고, 환생 표식도 홈 히어로 좌상단과 **같은**
/// [RebirthBadge]다 — 두 화면이 한 위젯을 공유하므로 따로 어긋날 수 없다.
class _CharacterBlock extends StatelessWidget {
  const _CharacterBlock({required this.user});

  final AppUser user;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final stage = user.stage;

    return Padding(
      // 정본 실측: 블록 위아래 패딩 8.
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      child: Column(
        // 줄 사이 간격은 정본 실측 6이지만 토큰 8을 쓴다 — 2px 차이는 눈에 띄지
        // 않는데 새 간격 단을 만들면 8px 리듬이 흐려진다.
        children: [
          PixelArt.emoji(
            asset: stage.asset,
            emoji: stage.emoji,
            size: _artSize,
            semanticLabel: stage.name,
          ),
          AppSpacing.gapSm,
          // 단계명은 한글이라 기본 서체(Pretendard). 정본 24/700/32.
          Text(stage.name, style: theme.textTheme.headlineMedium),
          AppSpacing.gapSm,
          LevelPill(level: user.level),
          AppSpacing.gapSm,
          // 홈 히어로 좌상단 훈장과 **같은** 배지(`core/widgets/rebirth_badge.dart`).
          //
          // **0회여도 그린다.** 홈은 `rebirth > 0`일 때만 얹는데(풍경 위 오버레이라
          // 캐릭터를 가리는 비용이 있다), MY는 "내가 지금 누구인지"를 적는 요약이라
          // 등급이 상시 정보다. 예전 맨 텍스트도 `환생 0 · Novice`를 항상 보여 줬고,
          // 여기서 숨기면 신규 사용자만 한 줄이 통째로 빠져 블록이 달라 보인다.
          RebirthBadge(rebirth: user.rebirth),
        ],
      ),
    );
  }
}

/// 캐릭터 도트아트 한 변.
///
/// **56 → 120(사용자 결정, 2026-07-29).** 정본 실측은 이모지 글리프 박스 56이지만
/// 도트아트로 바뀐 뒤로는 캐릭터가 누구인지 알아보기 어려웠다. 배경·오라·히어로
/// 연출은 넣지 않는다 — MY는 홈 히어로가 아니라 세로로 쌓은 요약이다.
///
/// 확대해도 흐려지지 않는다: [PixelArt]의 기본 [FilterQuality.none](최근접 보간)이
/// 픽셀 격자를 그대로 키운다. 원본 캔버스는 74×85~268×241이라 120은 축소~약 1.6배
/// 확대 구간이고, 최근접이 깨지는 큰 축소(0.2배 이하)에 해당하지 않는다.
const double _artSize = 120;

/// 통계 본문 — 완료 수 · 연속 출석 2분할 카드.
///
/// 가입일은 여기 없다. 정본(`47:444`)이 가입일을 **설정 항목**으로 옮겼다 —
/// 바뀌지 않는 값이라 "기록"보다 "정보"에 가깝다.
class _StatsContent extends StatelessWidget {
  const _StatsContent({required this.completedCount, required this.user});

  final int completedCount;
  final AppUser user;

  @override
  Widget build(BuildContext context) {
    final hasStreak = user.streak > 0;

    // 홈·보관함과 같은 공통 [StatCard]. 셋의 생김새가 어긋나지 않게 한 곳에서 온다.
    return StatCardRow(
      cards: [
        StatCard(
          icon: Symbols.check_circle,
          label: '완료한 도전',
          value: '$completedCount',
        ),
        StatCard(
          icon: Symbols.local_fire_department,
          label: '연속 출석',
          // 스트릭 0이면 숫자 대신 "아직 없음"으로 — 신규 사용자에게 0은
          // 실패처럼 읽힌다. 한글이라 수치 서체(Sora)를 쓸 수 없어 numeric:false다.
          value: hasStreak ? '${user.streak}' : '아직 없음',
          // 정본 실측 값은 `5일`. '일'은 한글이라 단위로 따로 넘긴다(홈·보관함과 같다).
          suffix: hasStreak ? '일' : null,
          numeric: hasStreak,
          accent: StatAccent.reward,
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

/// 캐릭터 블록 로딩 스켈레톤 — 실제 블록과 같은 실루엣(그림 → 이름 → pill → 표식).
class _CharacterSkeleton extends StatelessWidget {
  const _CharacterSkeleton();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: AppSpacing.sm),
      child: Column(
        children: [
          SkeletonBox(width: _artSize, height: _artSize, radius: AppRadius.sm),
          AppSpacing.gapSm,
          SkeletonBox(width: 96, height: 32, radius: AppRadius.sm),
          AppSpacing.gapSm,
          SkeletonBox(width: 64, height: 28, radius: AppRadius.full),
          AppSpacing.gapSm,
          // 환생 배지 자리 — 실제 배지와 같은 높이(28)·라운드(full)다. 예전엔 맨
          // 텍스트라 16이었고, 로딩에서 실제 크기와 다르면 데이터가 오는 순간 튄다.
          SkeletonBox(width: 140, height: 28, radius: AppRadius.full),
        ],
      ),
    );
  }
}

/// 통계 로딩 스켈레톤 — 실제 카드와 같은 실루엣(가로 배치 stat 카드 높이 80).
class _StatsSkeleton extends StatelessWidget {
  const _StatsSkeleton();

  @override
  Widget build(BuildContext context) {
    return const SkeletonBox(height: 80, radius: AppRadius.md);
  }
}

/// 설정 섹션(정본 `47:431`).
///
/// **OAuth 자리만 연다(실제 구현 아님).** 현재 계정은 익명이라 로그아웃하면 진행상황이
/// 통째로 날아간다. 그래서 "Google 계정 연동"을 준비 상태로만 두고, 나중에 익명↔Google
/// 연동(OAuth)이 붙으면 여기서 실제 기능을 연다. 홈의 환생 버튼이 "4주차에 열려요"로
/// 정직하게 비활성인 것과 같은 방식이다.
///
/// **로그아웃 버튼은 두지 않는다** — 익명 로그아웃 = 데이터 유실. 회귀 방어로 테스트가
/// 이 버튼의 부재를 못 박는다. OAuth 연동이 붙은 뒤 재판단한다.
///
/// 가입일 줄은 [joinedAt]이 있을 때만 그린다. 값이 없는 경우는 둘이다 — 구버전 문서라
/// `createdAt`이 비었거나, 사용자 문서를 아직/끝내 못 읽었거나. 어느 쪽이든 이 줄만
/// 빠지고 계정 연동 자리는 남는다(단절돼도 설정에 닿는다는 설계).
class _SettingsSection extends StatelessWidget {
  const _SettingsSection({this.joinedAt});

  final DateTime? joinedAt;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _SettingsTile(
          title: 'Google 계정 연동',
          subtitle: '다른 기기에서도 이어서 도전할 수 있어요.',
          comingSoon: true,
          onTap: _showComingSoon,
        ),
        if (joinedAt != null) ...[
          // 정본 실측: 항목 사이 12.
          AppSpacing.gapSmd,
          _SettingsTile(
            title: '가입일',
            subtitle: 'One-Step과 함께한 날',
            value: _formatKstDate(joinedAt!),
          ),
        ],
      ],
    );
  }
}

/// "곧 지원돼요" 안내. 탭 콜백이 위젯 밖 상수여야 [_SettingsTile]을 const로 둘 수 있다.
void _showComingSoon(BuildContext context) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(const SnackBar(content: Text('계정 연동은 곧 지원돼요.')));
}

/// 설정 항목 한 줄(정본 `47:404` SettingsTile).
///
/// 실측: 흰 카드 · 보더 `outlineVariant` · 라운드 12 · 패딩 16. 왼쪽은 제목(16/500/24)
/// 위 설명(12/500/16) 두 줄, 오른쪽은 값 pill이다. **아이콘이 없다** — 예전 구현은
/// 왼쪽에 아이콘을 달고 라운드도 24였다.
///
/// [comingSoon]이면 값 자리에 「준비 중」 배지가 온다(아직 구현되지 않은 기능).
/// 완전 비활성(onTap=null)이 아니라 탭 가능하게 둔 이유: 사용자가 눌러 보고 "왜 안 되지"
/// 하는 것보다, 눌렀을 때 "곧 지원돼요"라고 정직하게 답하는 편이 낫다.
class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.title,
    required this.subtitle,
    this.value,
    this.comingSoon = false,
    this.onTap,
  });

  final String title;
  final String subtitle;

  /// 오른쪽에 그대로 찍는 값(가입일 등). [comingSoon]이면 무시된다.
  final String? value;

  final bool comingSoon;

  /// 탭 동작. null이면 정보 표시 전용 줄이다(가입일).
  final void Function(BuildContext context)? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    final content = Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        borderRadius: AppRadius.mdAll,
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: theme.textTheme.titleMedium),
                const SizedBox(height: _labelGap),
                Text(
                  subtitle,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          AppSpacing.gapWSmd,
          if (comingSoon)
            const _ComingSoonPill()
          else if (value != null)
            _ValueText(value!),
        ],
      ),
    );

    final tap = onTap;
    return Material(
      color: scheme.surfaceContainerLowest,
      borderRadius: AppRadius.mdAll,
      child: tap == null
          ? content
          : InkWell(
              borderRadius: AppRadius.mdAll,
              onTap: () => tap(context),
              child: content,
            ),
    );
  }
}

/// 제목 ↔ 설명 사이(정본 실측 2). 한 덩어리로 읽혀야 하는 쌍이라 스케일의 최소
/// 단위(4)보다도 좁다(`GoalGroupSection` 헤더와 같은 판단).
const double _labelGap = 2;

/// 값 자리의 평문(가입일 날짜). 정본 `47:396`은 배경 없는 pill이라 글자만 남는다.
class _ValueText extends StatelessWidget {
  const _ValueText(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Text(
      text,
      style: theme.textTheme.labelSmall?.copyWith(
        color: theme.colorScheme.onSurfaceVariant,
      ),
    );
  }
}

/// "준비 중" 배지(정본 `47:402`). 중립 색만 쓴다 — 상태 알림일 뿐 보상·완료가 아니다.
class _ComingSoonPill extends StatelessWidget {
  const _ComingSoonPill();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Container(
      // 정본 실측 좌우 10 — 토큰 8을 쓴다(2px 차이는 눈에 띄지 않는다).
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: scheme.surfaceContainer,
        borderRadius: AppRadius.fullAll,
      ),
      child: Text(
        '준비 중',
        style: theme.textTheme.labelSmall?.copyWith(
          // 정본 글자색은 `outline`(#6d7b6c)이지만 배지 배경(#e5eeff) 위에서
          // 대비가 3.8:1로 작은 글자 기준(4.5:1)에 못 미친다. 한 단 진한
          // `onSurfaceVariant`(8.0:1)를 쓴다 — 흐린 인상은 유지되고 읽힌다.
          color: scheme.onSurfaceVariant,
        ),
      ),
    );
  }
}
