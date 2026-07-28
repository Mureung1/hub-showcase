import 'package:flutter/material.dart';

import '../../../core/constants/growth_rules.dart';
import '../../../core/constants/shop_items.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/widgets/level_pill.dart';
import '../../../core/widgets/pixel_art.dart';
import '../../../core/widgets/rebirth_badge.dart';
import '../../../models/app_user.dart';

/// 홈 캐릭터 블록 — full-bleed 히어로 + XP.
///
/// 캐릭터는 진화 단계별 **도트아트 자산**으로 그리고, 자산을 못 읽으면 단계 이모지로
/// 떨어진다(checklist: "자산 로드 실패 시 대체 표시(이모지)가 나온다").
///
/// **히어로는 화면 폭을 꽉 채운다.** 그래서 이 위젯은 **좌우 여백이 없는 자리**에
/// 놓여야 하고(홈 `ListView`가 항목별로 여백을 준다), 여백이 필요한 아래 블록(XP)은
/// 자기 패딩을 스스로 챙긴다.
///
/// **이름·레벨과 환생 표식은 히어로 안 오버레이다.** 예전에는 히어로 아래 별도
/// 블록이었지만, 캐릭터·이름·레벨·훈장은 한 덩어리로 읽히는 정보라 풍경 위에
/// 얹어 하나로 묶었다. 대신 풍경 위 가독성은 각 오버레이가 스스로 책임진다.
///
/// 코인·연속 일수는 여기 있지 않다 — 홈의 stat 카드 줄이 맡는다. 이 블록은
/// **캐릭터와 성장 진행도**만 말한다.
class CharacterCard extends StatelessWidget {
  const CharacterCard({super.key, required this.user});

  final AppUser user;

  @override
  Widget build(BuildContext context) {
    final stage = user.stage;

    // 장착 아이템을 해석한다. 고아 방어: itemById가 null이거나 슬롯이 어긋나면
    // (과거 데이터·삭제된 아이템·손상된 문서) 그 슬롯은 장착 없음으로 떨어져
    // 기존 렌더가 그대로 유지된다 — 깨진 장착이 카드를 죽이지 않는다.
    final rawBackground = itemById(user.equipped['background']);
    final background =
        rawBackground != null && rawBackground.slot == ItemSlot.background
        ? rawBackground
        : null;
    final rawAura = itemById(user.equipped['aura']);
    final aura = rawAura != null && rawAura.slot == ItemSlot.aura
        ? rawAura
        : null;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CharacterHero(
          stage: stage,
          level: user.level,
          rebirth: user.rebirth,
          background: background,
          aura: aura,
        ),
        AppSpacing.gapBlock,
        Padding(
          padding: AppSpacing.screenHorizontal,
          child: _XpBlock(user: user),
        ),
      ],
    );
  }
}

/// 히어로 **우하단** 이름표 — 진화 단계명 + 레벨 pill.
///
/// 풍경 도트아트 위에 얹히므로 글자를 그냥 놓을 수 없다. 잔디(중간 녹색) 위의
/// 검정 글자는 대비가 모자라 뭉개지고, 하늘로 넘어가면 또 달라진다. **반투명 흰
/// 판**을 깔아 배경이 무엇이든 같은 대비를 보장하고(0.88 알파라 풍경이 살짝 비쳐
/// 액자 느낌은 남는다), 소프트 섀도로 판 자체를 풍경에서 떼어 놓는다.
///
/// **세로로 쌓지 않고 가로 한 줄이다.** 캐릭터는 히어로 가운데에 서 있어서 우하단
/// 이름표와 오른쪽 끝이 스친다 — 폭이 좁을수록 겹침이 준다. 글자도 24 →
/// [AppTypography.heroName](16)으로 줄였다. 겹치더라도 이름표는 캐릭터 **발치**에
/// 놓여 얼굴을 가리지 않는다.
class _HeroNamePlate extends StatelessWidget {
  const _HeroNamePlate({super.key, required this.stage, required this.level});

  final CharacterStage stage;
  final int level;

  /// 판의 불투명도. 1.0이면 풍경에서 잘려 나온 스티커처럼 보이고, 0.7 아래로 가면
  /// 잔디 위에서 글자 대비가 무너진다.
  static const double _plateOpacity = 0.88;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLowest.withValues(alpha: _plateOpacity),
        borderRadius: AppRadius.fullAll,
        boxShadow: AppColors.softShadow,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 단계명은 한글('참새'·'성룡')이라 기본 서체(Pretendard)다.
          // 긴 단계명('이펙트 독수리')과 큰 글꼴 배율이 겹쳐도 레벨 pill을
          // 밀어내지 않게 접는다 — 히어로는 높이가 고정이라 줄을 늘릴 수 없다.
          Flexible(
            child: Text(
              stage.name,
              style: AppTypography.heroName.copyWith(color: scheme.onSurface),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          AppSpacing.gapWSm,
          // MY 캐릭터 블록과 **같은** pill(`core/widgets/level_pill.dart`).
          LevelPill(level: level),
        ],
      ),
    );
  }
}

/// 경험치 라벨 + 수치 + 진행 트랙.
class _XpBlock extends StatelessWidget {
  const _XpBlock({required this.user});

  final AppUser user;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final labelColor = theme.colorScheme.onSurfaceVariant;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 라벨(왼쪽)과 수치(오른쪽). **둘 다 Flexible이다.**
        //
        // 예전엔 수치 쪽이 유연 위젯이 아니어서 고유 폭을 통째로 요구했고, 큰 값
        // (네 자리 XP)에 큰 글꼴 배율이 겹치면 왼쪽에 줄 자리가 남지 않아 넘쳤다
        // (E-4 D-6: 배율 2.0 · 폭 320dp). loose fit이라 폭이 넉넉하면 둘 다 고유
        // 폭을 쓰고 spaceBetween이 평소 모습을 유지한다.
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(
              child: Text(
                '경험치',
                style: theme.textTheme.bodySmall?.copyWith(color: labelColor),
              ),
            ),
            Flexible(
              // `4 / 10 XP` · `MAX` — 숫자와 라틴 문자뿐이라 수치 서체.
              child: Text(
                user.canRebirth
                    ? 'MAX'
                    : '${user.xp} / ${user.xpForNextLevel} XP',
                style: AppTypography.numericLabelSmallStrong.copyWith(
                  color: labelColor,
                ),
                // 접혔을 때도 오른쪽 정렬을 유지한다.
                textAlign: TextAlign.end,
              ),
            ),
          ],
        ),
        AppSpacing.gapXs,
        _XpBar(progress: user.levelProgress),
      ],
    );
  }
}

/// 캐릭터 도트아트 + 풍경 백드롭 + (장착 시) 오라 스프라이트.
///
/// **화면 폭을 꽉 채우고 아래 두 모서리만 둥근** 히어로다. 좌우 여백을 두지 않는
/// 이유는 배경 도트아트가 풍경이라서다 — 여백을 두면 액자 속 그림이 되고, 꽉 채우면
/// 사용자가 그 세계 안에 있는 것처럼 읽힌다.
///
/// 치장은 두 슬롯으로 표현한다: [background](백드롭 채움)와 [aura](주변 장식).
/// 둘 다 슬롯 검증을 마친 값이라 여기서는 null 여부만 본다 — null이면 미장착이다.
///
/// **백드롭은 장착 여부와 무관하게 같은 자리·같은 크기이고 채움만 갈린다.**
/// 장착이면 풍경 도트아트, 미장착이면 지금까지 쓰던 그린 틴트다. 미장착을 공짜
/// 풍경으로 채우면 `bg_forest`(10코인)를 그냥 주는 셈이라 상점이 무의미해진다.
/// 채움을 공유하는 덕에 장착·해제로 레이아웃이 흔들리지 않는다.
class CharacterHero extends StatelessWidget {
  const CharacterHero({
    super.key,
    required this.stage,
    required this.level,
    this.rebirth = 0,
    this.background,
    this.aura,
  });

  final CharacterStage stage;

  /// 이름표 pill에 찍을 현재 레벨.
  final int level;

  /// 환생 횟수. 0이면 좌상단 훈장을 그리지 않는다.
  final int rebirth;

  /// 장착된 배경 아이템(슬롯 검증 완료). null이면 미장착 → 틴트 채움.
  final ShopItem? background;

  /// 장착된 오라 아이템(슬롯 검증 완료). null이면 오라 없음.
  final ShopItem? aura;

  /// 히어로 높이.
  ///
  /// **195 → 270으로 키웠다.** 195에서는 캐릭터 머리 위 하늘이 17dp뿐이라 좌상단
  /// 환생 훈장(높이 약 32dp)을 얹을 자리가 없었다. 270이면 하늘이 81dp 열려
  /// 훈장이 캐릭터를 건드리지 않는다.
  ///
  /// 대가: 배경 도트아트가 **2:1**(1024×512)이라 폭 390 기준으로 높이만 키우면
  /// cover가 세로를 기준 축으로 잡아 **좌우를 약 28% 잘라낸다**(195일 때는 4%).
  /// 지평선은 세로 비율이라 크롭과 무관하게 [_horizonRatio] 자리를 지키므로
  /// 접지는 깨지지 않는다 — 풍경의 좌우 끝이 조금 덜 보일 뿐이다.
  ///
  /// 폭이 달라져도 높이는 이 값으로 고정한다 — cover가 세로를 기준 축으로 잡아
  /// 지평선 위치가 흔들리지 않게 하기 위해서다.
  static const double height = 270;

  /// 캐릭터 드로잉 **박스**의 한 변. 정사각 박스라 레이아웃 높이는 원본 종횡비와
  /// 무관하게 항상 이 값이고, 그림은 그 안에서 contain으로 맞춰진다.
  ///
  /// 박스 크기와 실제로 칠해지는 크기는 다르다. 자산의 투명 여백을 사방 8px만
  /// 남기고 잘라낸 덕에 이 150 박스 안에서 캐릭터는 **118~141dp**를 차지한다.
  static const double characterSize = 150;

  /// 배경 도트아트의 지평선 위치(위에서부터의 비율). 아래 30%가 잔디다.
  static const double _horizonRatio = 0.30;

  /// 지평선의 바닥 기준 높이 — 270 × 30% = **81dp**. 잔디 밴드는 y 189~270이다.
  static const double horizonFromBottom = height * _horizonRatio;

  /// 캐릭터 발밑을 히어로 바닥에서 얼마나 띄울지.
  ///
  /// 백드롭이 히어로를 통째로 채우므로(예전처럼 여백만큼 작지 않다) 지평선은
  /// 바닥에서 [horizonFromBottom] = 81dp다. 발밑을 그보다 **아래**에 두면 캐릭터가
  /// 하늘에 뜨지 않고 잔디를 밟고, 바닥에 딱 붙지 않아야 잘린 느낌도 없다.
  ///
  /// **값의 근거**: 히어로가 195일 때 인셋은 28이었고 그때 지평선은 58.5였다 —
  /// 발밑은 잔디 밴드의 아래에서 **47.9%** 지점. 높이를 270으로 키우며 같은 비율을
  /// 새 지평선(81)에 옮기면 81 × 0.479 = 38.8 → **39**. 잔디 밴드 81 안에 들어가고
  /// (39 < 81) 바닥에서도 39dp 떠 있다.
  ///
  /// 박스 안 contain 여백까지 더한 최악(종횡비 1.20인 용 계열, 위아래 16.3dp)에도
  /// 실제 발밑은 39 + 16.3 = 55.3dp로 지평선 81dp보다 아래다.
  ///
  /// 눈대중이 아니라 계약이다 — `character_stage_layout_test`가 실제 렌더 좌표로
  /// 못 박는다. 중앙 정렬로 되돌리면 (270-150)/2 = 60이 되어 그 테스트가 깨진다.
  static const double groundInset = 39;

  /// 캐릭터 드로잉 박스의 **위쪽** 좌표(히어로 상단 기준) — 270 - 39 - 150 = 81.
  /// 머리 위 하늘의 높이이기도 하다. 오라 배치가 캐릭터를 따라가도록 여기서 잰다.
  static const double characterTop = height - groundInset - characterSize;

  /// 히어로 안 오버레이(좌상단 훈장 · 우하단 이름표)의 가장자리 인셋.
  /// 라운드 24 모서리 안쪽에서 잘리지 않는 거리다.
  static const double _overlayInset = AppSpacing.md;

  /// 백드롭 사각형을 좌표 테스트에서 집기 위한 키.
  ///
  /// 예전에는 백드롭을 감싸던 `ClipRRect`로 찾았지만, full-bleed가 되면서 라운드는
  /// 히어로 바깥 한 겹이 맡고 백드롭 자체에는 클립이 없다. 지평선 계산의 기준
  /// 사각형은 눈에 보이지 않는 구조물이라 키로 표시해 둔다.
  @visibleForTesting
  static const Key backdropKey = Key('character-hero-backdrop');

  /// 히어로 안 오버레이 두 장을 좌표 테스트에서 집기 위한 키.
  ///
  /// 글자로 찾을 수도 있지만(`환생 3`·`참새`), 그러면 테스트가 **문구**에 묶여
  /// 등급 타이틀이나 단계명이 바뀔 때 같이 깨진다. 여기서 지키려는 것은 문구가
  /// 아니라 **자리**다.
  @visibleForTesting
  static const Key rebirthBadgeKey = Key('character-hero-rebirth-badge');

  @visibleForTesting
  static const Key namePlateKey = Key('character-hero-name-plate');

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      // 위쪽은 AppBar에 맞물리므로 각지게, 아래 두 모서리만 둥글게.
      borderRadius: AppRadius.lgBottom,
      child: SizedBox(
        height: height,
        width: double.infinity,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // 백드롭이 히어로를 통째로 채운다. 폭 375dp 기준 375×270 = 1.389:1로
            // 원본 2:1보다 세로가 한참 긴 박스라, cover는 **세로를 제한 축으로
            // 잡아** 높이를 맞추고 남는 가로를 자른다 — 세로 크롭 0, 가로 크롭 약
            // 28%. 지평선이 위아래로 밀리지 않으므로 70% 지점 전제가 성립한다.
            Positioned.fill(
              child: _Backdrop(key: backdropKey, item: background),
            ),
            // 오라 — 캐릭터 주변에 흩뿌린다(장착했을 때만).
            if (aura != null) ..._auras(aura!),
            // 캐릭터는 가운데가 아니라 **바닥 기준**으로 세운다. 원본이 하단 정렬
            // 그림이라 발밑이 그림의 아래 끝이고, 그 끝을 지평선 아래로 내려야
            // 잔디를 밟은 것처럼 보인다.
            Positioned(
              bottom: groundInset,
              child: PixelArt.emoji(
                asset: stage.asset,
                emoji: stage.emoji,
                size: characterSize,
                semanticLabel: stage.name,
              ),
            ),
            // ── 오버레이 두 장. 캐릭터보다 뒤에 두면 도트아트에 가려지므로
            //    Stack 맨 끝에 온다.
            //
            //    둘 다 `left`·`right`를 함께 줘 **폭 상한**을 히어로 안으로 묶고,
            //    `Align`으로 다시 loose 제약을 만들어 pill이 고유 폭을 쓰게 한다
            //    (left+right만 주면 tight 제약이 되어 pill이 폭 전체로 늘어난다).
            //    상한이 있어야 긴 등급 타이틀·큰 글꼴 배율에서 Row가 넘치지 않는다.
            if (rebirth > 0)
              Positioned(
                top: _overlayInset,
                left: _overlayInset,
                right: _overlayInset,
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: RebirthBadge(key: rebirthBadgeKey, rebirth: rebirth),
                ),
              ),
            Positioned(
              bottom: _overlayInset,
              left: _overlayInset,
              right: _overlayInset,
              child: Align(
                alignment: Alignment.centerRight,
                child: _HeroNamePlate(
                  key: namePlateKey,
                  stage: stage,
                  level: level,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 캐릭터 **주변** 장식 배치. 크기(26/20/24)와 좌우 위치는 이모지 목업 때 그대로다.
  ///
  /// 세로만 히어로 상단이 아니라 **캐릭터 박스 기준**으로 잰다. 예전 값(top 18·40,
  /// bottom 30)은 히어로가 195일 때 캐릭터 박스(top 17 · bottom 28) 바로 옆이라는
  /// 뜻이었는데, 리터럴로 두면 히어로가 270으로 커지는 순간 같은 좌표가 캐릭터에서
  /// 64dp 떨어진 **빈 하늘**이 된다. 오프셋을 [characterTop]·[groundInset]에 매어
  /// "캐릭터 주변"이라는 의도가 히어로 크기와 무관하게 유지되게 한다.
  ///
  /// 장식이라 `semanticLabel`을 주지 않는다(같은 라벨 3연속 낭독 방지).
  List<Widget> _auras(ShopItem item) {
    final asset = shopItemAsset(item);
    final emoji = item.emoji ?? '';
    Widget sprite(double size) =>
        PixelArt.emoji(asset: asset, emoji: emoji, size: size);

    return [
      Positioned(top: characterTop + 1, left: 44, child: sprite(26)),
      Positioned(top: characterTop + 23, right: 48, child: sprite(20)),
      Positioned(bottom: groundInset + 2, right: 60, child: sprite(24)),
    ];
  }
}

/// 백드롭 채움 — 장착이면 풍경 도트아트, 아니면 틴트.
///
/// 자산 로드에 실패해도 **이모지가 아니라 틴트로** 떨어진다. 풍경 자리에 이모지가
/// 뜨면 히어로가 더 망가져 보이고, 틴트는 미장착 렌더와 같아 자연스럽다.
class _Backdrop extends StatelessWidget {
  const _Backdrop({super.key, this.item});

  final ShopItem? item;

  @override
  Widget build(BuildContext context) {
    // 부모가 tight 제약을 주므로 자식은 그 영역을 그대로 채운다.
    final tint = ColoredBox(
      color: (item?.tint ?? AppColors.primaryContainer).withValues(alpha: 0.18),
    );
    final equipped = item;
    if (equipped == null) return tint;

    return PixelArt(
      asset: shopItemAsset(equipped),
      fallback: tint,
      fit: BoxFit.cover,
      semanticLabel: equipped.name,
    );
  }
}

/// XP 진행 트랙. h12 · full radius · 트랙은 중립 파랑 틴트, 채움은 그린.
class _XpBar extends StatelessWidget {
  const _XpBar({required this.progress});

  final double progress;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: AppRadius.fullAll,
      child: LinearProgressIndicator(
        value: progress,
        minHeight: 12,
        backgroundColor: Theme.of(context).colorScheme.surfaceContainer,
        valueColor: const AlwaysStoppedAnimation(AppColors.primary),
      ),
    );
  }
}
