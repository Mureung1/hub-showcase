import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/growth_rules.dart';
import 'package:one_step/core/theme/app_spacing.dart';
import 'package:one_step/core/theme/app_theme.dart';
import 'package:one_step/core/widgets/pixel_art.dart';
import 'package:one_step/features/home/widgets/character_card.dart';
import 'package:one_step/models/app_user.dart';

/// 캐릭터 접지(接地) 회귀 방어 — **"캐릭터가 잔디에 선다"는 좌표 계약이다.**
///
/// 왜 별도 테스트가 필요한가: 캐릭터를 세우는 것은 `_CharacterStage`의
/// `Positioned(bottom: _groundInset, …)` 한 줄뿐이다. 이 줄을 벗겨 `Stack`
/// 중앙 정렬로 되돌려도 자산 경로·장착·오버플로 테스트는 **전부 그대로 통과한다**
/// (실제로 전 스위트 868건이 한 건도 잡지 못했다). 즉 리팩터링이나 병합 사고로
/// 이 줄이 사라지면 CI는 초록인 채 **캐릭터가 하늘에 뜬 빌드가 배포된다.**
///
/// 그래서 "무엇이 그려졌나"가 아니라 **"어디에 그려졌나"**를 픽셀로 못 박는다.
/// 중앙 정렬로 되돌리면 발밑 간격이 (180-104)/2 = 38.0이 되어 24.0 단언이 잡는다.
void main() {
  /// 홈과 같은 폭 조건에서 카드만 떼어 pump한다. 화면 전체를 띄우면 Firebase·
  /// 라우터가 끼어들어 좌표 측정에 무관한 실패 원인이 섞인다.
  Future<void> pumpStage(WidgetTester tester) async {
    tester.view.physicalSize = const Size(375, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: Padding(
            padding: EdgeInsets.all(AppSpacing.md),
            child: CharacterCard(user: AppUser(uid: 'u')),
          ),
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

  /// 백드롭 채움을 감싸는 클립. 지평선 위치를 계산할 실제 사각형이다.
  final backdrop = find
      .descendant(of: stage, matching: find.byType(ClipRRect))
      .first;

  testWidgets('캐릭터 발밑이 스테이지 바닥에서 정확히 24dp 떠 있다 (잔디 접지)', (tester) async {
    await pumpStage(tester);

    final stageRect = tester.getRect(stage);
    final artRect = tester.getRect(character);

    // 측정 대상이 히어로 영역이 맞는지부터 고정한다. 이게 틀리면 아래 수치는
    // 다른 사각형을 재고 있는 것이라 의미가 없다(375 - 16*2 페이지 패딩
    // - 카드 테두리 1*2 = 341, 높이는 _CharacterStage._height = 180).
    expect(stageRect.size, const Size(341, 180));

    // ① 발밑 인셋 = _groundInset(AppSpacing.lg). 중앙 정렬이면 38.0이 되어 깨진다.
    expect(stageRect.bottom - artRect.bottom, 24.0);

    // ② 드로잉 **박스** 높이 = _characterSize.
    //
    //    주의: 이건 "그려진 그림의 높이"가 아니라 **캐릭터 자리의 높이**다.
    //    width·height를 둘 다 준 Image라 레이아웃 박스는 원본 종횡비와 무관하게
    //    정사각이고(자산은 여백을 자른 뒤 종횡비가 0.80~1.20으로 제각각이다),
    //    contain은 그 박스 **안에서만** 그림을 맞춘다. 가로가 긴 용 계열은
    //    박스 안 위아래에 여백이 남아 실제 발밑이 박스 바닥보다 최대 11dp 위다.
    //
    //    그래도 이 단언은 필요하다 — ①이 어느 사각형을 기준으로 잰 값인지
    //    고정해 준다. 박스가 커지거나 작아지면 24.0의 의미가 달라진다.
    expect(artRect.height, 104.0);
  });

  testWidgets('캐릭터 발밑이 백드롭 지평선(하단 30%)보다 아래에 있다', (tester) async {
    await pumpStage(tester);

    final stageRect = tester.getRect(stage);
    final artRect = tester.getRect(character);
    final backdropRect = tester.getRect(backdrop);

    // 배경 도트아트는 지평선이 위에서 70% 지점이다. 백드롭 높이의 아래 30%가
    // 곧 잔디 영역이므로, 발밑이 그 안에 들어와야 "밟고 서 있다"가 성립한다.
    // ①의 24.0이 **왜** 그 값인지를 설명하는 단언이다 — _groundInset을 다른
    // 값으로 조정하더라도 의도(잔디 위)는 여기서 계속 지켜진다.
    //
    // 다만 이 단언만으로는 부족하다: 중앙 정렬(38.0)도 49.2dp 지평선 아래라
    // 여기는 통과한다. **접지 회귀를 실제로 잡는 것은 ①의 24.0이다.**
    //
    // 또 하나의 한계: 여기서 재는 artRect는 박스라 실제 발밑보다 아래다. 박스 안
    // contain 여백까지 더하면 발밑은 최대 24 + 11.3 = 35.3dp(09_dragon_adult,
    // 종횡비 1.20)로, 지평선 49.2dp까지 여유가 약 14dp 남는다. 가로가 더 긴
    // 자산을 들이거나 여백 패딩을 키우면 이 여유부터 갉아먹는다.
    final footFromStageBottom = stageRect.bottom - artRect.bottom;
    expect(footFromStageBottom, lessThan(backdropRect.height * 0.30));

    // 백드롭 바닥은 스테이지 바닥에 붙어 있다(Positioned.fill에 bottom을 주지
    // 않았다). 이 전제가 깨지면 위 비교의 기준선이 어긋난다.
    expect(backdropRect.bottom, stageRect.bottom);

    // 캐릭터가 백드롭 밖(카드 여백)으로 흘러내리지도 않는다.
    expect(artRect.bottom, greaterThan(backdropRect.top));
    expect(artRect.bottom, lessThanOrEqualTo(backdropRect.bottom));
  });
}
