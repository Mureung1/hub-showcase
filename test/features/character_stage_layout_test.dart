import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/growth_rules.dart';
import 'package:one_step/core/theme/app_theme.dart';
import 'package:one_step/core/widgets/pixel_art.dart';
import 'package:one_step/features/home/widgets/character_card.dart';
import 'package:one_step/models/app_user.dart';

/// 캐릭터 접지(接地) 회귀 방어 — **"캐릭터가 잔디에 선다"는 좌표 계약이다.**
///
/// 왜 별도 테스트가 필요한가: 캐릭터를 세우는 것은 [CharacterHero]의
/// `Positioned(bottom: groundInset, …)` 한 줄뿐이다. 이 줄을 벗겨 `Stack`
/// 중앙 정렬로 되돌려도 자산 경로·장착·오버플로 테스트는 **전부 그대로 통과한다**
/// (실제로 전 스위트 868건이 한 건도 잡지 못했다). 즉 리팩터링이나 병합 사고로
/// 이 줄이 사라지면 CI는 초록인 채 **캐릭터가 하늘에 뜬 빌드가 배포된다.**
///
/// 그래서 "무엇이 그려졌나"가 아니라 **"어디에 그려졌나"**를 픽셀로 못 박는다.
/// 중앙 정렬로 되돌리면 발밑 간격이 (270-150)/2 = 60이 되어 39.0 단언이 잡는다.
///
/// **좌표는 리터럴로 쓴다.** `CharacterHero.groundInset`을 인용하면 상수를 바꾸는
/// 순간 테스트도 같이 따라가 아무것도 지키지 못한다(자기충족 단언).
///
/// 히어로는 Figma 리디자인에서 **full-bleed**가 됐다 — 좌우 여백 0, 백드롭이
/// 히어로를 통째로 채운다. 그래서 여기서도 패딩 없이 pump한다.
///
/// 높이는 **195 → 270**으로 커졌다(캐릭터 머리 위에 환생 훈장을 얹을 하늘을
/// 확보). 지평선이 58.5 → 81로 내려가 발밑 인셋도 같은 비율(잔디 밴드의 약 48%)
/// 로 28 → **39**를 따라갔다. **지키는 계약은 그대로다 — 캐릭터는 잔디에 선다.**
void main() {
  /// 표준 단말 폭 조건에서 카드만 떼어 pump한다. 화면 전체를 띄우면 Firebase·
  /// 라우터가 끼어들어 좌표 측정에 무관한 실패 원인이 섞인다.
  Future<void> pumpStage(WidgetTester tester, {int rebirth = 0}) async {
    tester.view.physicalSize = const Size(375, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: CharacterCard(user: AppUser(uid: 'u', rebirth: rebirth)),
        ),
      ),
    );
  }

  /// 히어로 영역의 Stack. 카드 위쪽 첫 Stack이라 `.first`로 잡힌다.
  final stage = find.byType(Stack).first;

  /// 캐릭터 본체. 자산 경로로 식별한다(레벨 1 = 알 단계).
  final character = find.byWidgetPredicate(
    (w) => w is PixelArt && w.asset == stageOf(1).asset,
    description: 'PixelArt(캐릭터 Lv.1)',
  );

  /// 백드롭 채움. 지평선 위치를 계산할 실제 사각형이다.
  ///
  /// full-bleed가 되면서 백드롭을 감싸던 `ClipRRect`가 사라졌다(라운드는 히어로
  /// 바깥 한 겹이 맡는다). 눈에 보이는 표식이 없는 구조물이라 키로 집는다.
  final backdrop = find.byKey(CharacterHero.backdropKey);

  testWidgets('캐릭터 발밑이 히어로 바닥에서 정확히 39dp 떠 있다 (잔디 접지)', (tester) async {
    await pumpStage(tester);

    final stageRect = tester.getRect(stage);
    final artRect = tester.getRect(character);

    // 측정 대상이 히어로 영역이 맞는지부터 고정한다. 이게 틀리면 아래 수치는
    // 다른 사각형을 재고 있는 것이라 의미가 없다. full-bleed라 폭은 화면 폭
    // 그대로(375)이고, 높이는 CharacterHero.height = 270이다.
    expect(stageRect.size, const Size(375, 270));

    // ① 발밑 인셋 = groundInset. 중앙 정렬이면 60이 되어 깨진다.
    expect(stageRect.bottom - artRect.bottom, 39.0);

    // ② 드로잉 **박스** 높이 = characterSize.
    //
    //    주의: 이건 "그려진 그림의 높이"가 아니라 **캐릭터 자리의 높이**다.
    //    width·height를 둘 다 준 Image라 레이아웃 박스는 원본 종횡비와 무관하게
    //    정사각이고(자산은 여백을 자른 뒤 종횡비가 0.80~1.20으로 제각각이다),
    //    contain은 그 박스 **안에서만** 그림을 맞춘다. 가로가 긴 용 계열은
    //    박스 안 위아래에 여백이 남아 실제 발밑이 박스 바닥보다 최대 16dp 위다.
    //
    //    그래도 이 단언은 필요하다 — ①이 어느 사각형을 기준으로 잰 값인지
    //    고정해 준다. 박스가 커지거나 작아지면 28.0의 의미가 달라진다.
    expect(artRect.height, 150.0);

    // ③ 히어로는 화면 폭을 꽉 채운다(full-bleed). 좌우에 여백이 생기면 배경이
    //    액자 속 그림이 되고, 백드롭 종횡비가 달라져 지평선 전제도 흔들린다.
    expect(stageRect.left, 0.0);
    expect(stageRect.right, 375.0);
  });

  testWidgets('캐릭터 발밑이 백드롭 지평선(하단 30%)보다 아래에 있다', (tester) async {
    await pumpStage(tester);

    final stageRect = tester.getRect(stage);
    final artRect = tester.getRect(character);
    final backdropRect = tester.getRect(backdrop);

    // 배경 도트아트는 지평선이 위에서 70% 지점이다. 백드롭 높이의 아래 30%가
    // 곧 잔디 영역이므로, 발밑이 그 안에 들어와야 "밟고 서 있다"가 성립한다.
    // ①의 39.0이 **왜** 그 값인지를 설명하는 단언이다 — groundInset을 다른
    // 값으로 조정하더라도 의도(잔디 위)는 여기서 계속 지켜진다.
    //
    // 다만 이 단언만으로는 부족하다: 중앙 정렬(60)도 81dp 지평선 아래라
    // 여기는 통과한다. **접지 회귀를 실제로 잡는 것은 ①의 39.0이다.**
    //
    // 또 하나의 한계: 여기서 재는 artRect는 박스라 실제 발밑이 그보다 위일 수
    // 있다. 박스 안 contain 여백까지 더하면 발밑은 최대 39 + 16.3 = 55.3dp
    // (09_dragon_adult, 종횡비 1.20)로, 지평선 81dp까지 여유가 약 26dp 남는다.
    final footFromStageBottom = stageRect.bottom - artRect.bottom;
    expect(footFromStageBottom, lessThan(backdropRect.height * 0.30));

    // 백드롭은 히어로를 통째로 채운다(Positioned.fill에 인셋을 주지 않았다).
    // 이 전제가 깨지면 위 비교의 기준선이 어긋난다.
    expect(backdropRect, stageRect);

    // 캐릭터가 백드롭 밖(하늘 위·히어로 아래)으로 흘러나가지도 않는다.
    expect(artRect.bottom, greaterThan(backdropRect.top));
    expect(artRect.bottom, lessThanOrEqualTo(backdropRect.bottom));
    expect(artRect.top, greaterThanOrEqualTo(backdropRect.top));
  });

  // ── 히어로 **안** 오버레이 두 장. 예전에는 히어로 아래 별도 블록이었다.
  //
  //    "히어로 안에 있다"는 화면 밖으로 나갔는지만 보면 증명되지 않는다(밖에 있던
  //    시절에도 카드 안에는 있었다). 그래서 **히어로 사각형 기준 좌표**로 못 박는다.
  //    좌표는 여기서도 리터럴이다 — 상수를 인용하면 상수를 바꾸는 순간 같이 따라간다.

  testWidgets('환생 훈장은 히어로 안 좌상단(16,16)이고 캐릭터 머리 위 하늘에 든다', (
    tester,
  ) async {
    // 환생 **1회**다. 3회를 주면 용 계열이 해금돼 [character] 파인더(새 계열
    // Lv.1 자산)가 빗나간다 — 여기서 재는 것은 계열이 아니라 자리다.
    await pumpStage(tester, rebirth: 1);

    final stageRect = tester.getRect(stage);
    final artRect = tester.getRect(character);
    final badgeRect = tester.getRect(find.byKey(CharacterHero.rebirthBadgeKey));

    // 좌·상단 인셋 = AppSpacing.md.
    expect(badgeRect.left - stageRect.left, 16.0);
    expect(badgeRect.top - stageRect.top, 16.0);

    // 히어로 안에 완전히 든다 — 훈장이 밖으로 밀려나면 히어로가 다시 195처럼
    // 좁아졌거나 오버레이가 히어로 밖 블록으로 되돌아간 것이다.
    expect(stageRect.contains(badgeRect.topLeft), isTrue);
    expect(stageRect.contains(badgeRect.bottomRight), isTrue);

    // **히어로를 270으로 키운 이유가 바로 이 줄이다.** 훈장이 캐릭터 머리
    // (박스 상단, 히어로 위에서 81dp) 위 하늘 안에서 끝나야 한다. 높이를 195로
    // 되돌리면 하늘이 17dp뿐이라 훈장이 캐릭터를 덮으며 여기서 걸린다.
    expect(badgeRect.bottom, lessThanOrEqualTo(artRect.top));
  });

  testWidgets('환생 0회면 훈장이 없다', (tester) async {
    await pumpStage(tester);
    expect(find.byKey(CharacterHero.rebirthBadgeKey), findsNothing);
  });

  testWidgets('이름표는 히어로 안 우하단(16,16)이다', (tester) async {
    await pumpStage(tester);

    final stageRect = tester.getRect(stage);
    final plateRect = tester.getRect(find.byKey(CharacterHero.namePlateKey));

    expect(stageRect.right - plateRect.right, 16.0);
    expect(stageRect.bottom - plateRect.bottom, 16.0);

    expect(stageRect.contains(plateRect.topLeft), isTrue);
    expect(stageRect.contains(plateRect.bottomRight - const Offset(1, 1)), isTrue);

    // 캐릭터 **얼굴**을 가리지 않는다. 이름표는 발치(캐릭터 박스 아래 절반)에
    // 머문다 — 폭이 좁은 단말에서 가로로 겹치는 것은 허용하되(사용자 결정),
    // 세로로 얼굴까지 올라오면 안 된다.
    final artRect = tester.getRect(character);
    expect(plateRect.top, greaterThan(artRect.center.dy));
  });
}
