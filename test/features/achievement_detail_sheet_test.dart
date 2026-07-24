import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/theme/app_theme.dart';
import 'package:one_step/core/widgets/reward_chip.dart';
import 'package:one_step/features/storage/widgets/achievement_detail_sheet.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/models/quest.dart';
import 'package:one_step/models/quest_status.dart';

/// 보관함 상세 시트 (3단계-a) — 보기 전용.
///
/// 시트는 `loadProof` 클로저를 주입받아 저장소·provider 없이 단독 검증된다.
/// 가짜 클로저로 세 경로(사진 있음·없음·실패)를 전부 재현한다.
void main() {
  /// 1x1 투명 PNG의 base64 — 실제 디코딩되는 최소 이미지.
  const tinyPng =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

  // 완료 시각을 **KST 날짜 경계를 넘는** UTC로 잡는다: UTC 7/20 20:00 → KST 7/21 05:00.
  // 오프셋을 빼먹으면 7/20으로 표시돼 날짜 테스트가 KST 변환을 실제로 잡는다
  // (경계를 안 넘는 시각을 쓰면 오프셋 유무와 무관하게 같은 날이라 검증이 헛돈다).
  Quest doneQuest({String? memo}) => Quest(
    id: 'q1',
    title: '지원서 초안 쓰기',
    difficulty: Difficulty.normal,
    status: QuestStatus.done,
    archived: true,
    memo: memo,
    completedAt: DateTime.utc(2026, 7, 20, 20),
  );

  Future<void> pumpSheet(
    WidgetTester tester, {
    required Quest quest,
    required Future<String?> Function() loadProof,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: AchievementDetailSheet(quest: quest, loadProof: loadProof),
        ),
      ),
    );
  }

  testWidgets('제목·보상·완료 날짜를 표시한다', (tester) async {
    await pumpSheet(
      tester,
      quest: doneQuest(),
      loadProof: () async => null,
    );
    await tester.pumpAndSettle();

    expect(find.text('지원서 초안 쓰기'), findsOneWidget);
    expect(find.byType(RewardChip), findsOneWidget);
    // completedAt UTC 7/20 20:00 → KST 7/21 05:00. KST 변환이 없으면 7/20이 떠서 실패.
    expect(find.text('2026년 7월 21일'), findsOneWidget);
  });

  testWidgets('메모가 있으면 전문을 보여준다', (tester) async {
    await pumpSheet(
      tester,
      quest: doneQuest(memo: '오늘 초안 3장 완성'),
      loadProof: () async => null,
    );
    await tester.pumpAndSettle();

    expect(find.text('메모'), findsOneWidget);
    expect(find.text('오늘 초안 3장 완성'), findsOneWidget);
  });

  testWidgets('메모가 없으면 메모 영역이 아예 없다', (tester) async {
    await pumpSheet(
      tester,
      quest: doneQuest(memo: null),
      loadProof: () async => null,
    );
    await tester.pumpAndSettle();

    expect(find.text('메모'), findsNothing);
  });

  testWidgets('사진이 있으면 이미지를 그린다', (tester) async {
    await pumpSheet(
      tester,
      quest: doneQuest(),
      loadProof: () async => tinyPng,
    );
    await tester.pumpAndSettle();

    expect(find.byType(Image), findsOneWidget);
    expect(find.text('사진 없음'), findsNothing);
  });

  testWidgets('사진이 없으면 "사진 없음" 플레이스홀더가 뜬다', (tester) async {
    await pumpSheet(
      tester,
      quest: doneQuest(),
      loadProof: () async => null,
    );
    await tester.pumpAndSettle();

    expect(find.text('사진 없음'), findsOneWidget);
    expect(find.byType(Image), findsNothing);
  });

  testWidgets('깨진 base64는 디코딩 실패로 "사진 없음"이 되고 시트가 죽지 않는다', (tester) async {
    // 조회는 성공했지만 값이 디코딩 불가한 문자열인 경우 — _decode의 FormatException
    // 방어 분기를 못 박는다(예외가 새면 시트가 통째로 죽는다).
    await pumpSheet(
      tester,
      quest: doneQuest(),
      loadProof: () async => '!!!not-base64!!!',
    );
    await tester.pumpAndSettle();

    expect(find.text('사진 없음'), findsOneWidget);
    expect(find.byType(Image), findsNothing);
    // 시트는 살아 있다 — 제목이 여전히 보인다.
    expect(find.text('지원서 초안 쓰기'), findsOneWidget);
  });

  testWidgets('사진 조회가 실패해도 시트가 죽지 않고 "사진 없음"을 그린다', (tester) async {
    await pumpSheet(
      tester,
      quest: doneQuest(),
      loadProof: () async => throw Exception('network'),
    );
    await tester.pumpAndSettle();

    expect(find.text('사진 없음'), findsOneWidget);
    // 제목은 여전히 보인다 — 조회 실패가 시트 전체를 죽이지 않는다.
    expect(find.text('지원서 초안 쓰기'), findsOneWidget);
  });

  testWidgets('보기 전용이다 — 수정 버튼이 없다', (tester) async {
    await pumpSheet(
      tester,
      quest: doneQuest(memo: '메모'),
      loadProof: () async => tinyPng,
    );
    await tester.pumpAndSettle();

    expect(find.text('수정'), findsNothing);
    expect(find.byType(FilledButton), findsNothing);
  });
}
