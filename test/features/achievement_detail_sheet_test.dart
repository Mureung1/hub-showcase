import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/error/app_failure.dart';
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
    expect(find.text('2026년 7월 21일 완료'), findsOneWidget);
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

  testWidgets('편집 클로저 없이 열면 보기 전용이다 — 수정 버튼이 없다', (tester) async {
    await pumpSheet(
      tester,
      quest: doneQuest(memo: '메모'),
      loadProof: () async => tinyPng,
    );
    await tester.pumpAndSettle();

    expect(find.text('수정'), findsNothing);
    expect(find.byType(FilledButton), findsNothing);
  });

  // ===== 편집 모드 (3단계-b) =====
  //
  // 편집 클로저(onSaveMemo·onSavePhoto·pickImage)를 주입하면 "수정"이 뜨고, 시트가
  // 저장소·image_picker 없이 가짜 클로저만으로 편집 흐름을 전부 검증한다.
  group('편집 모드', () {
    /// 편집 클로저를 주입해 시트를 띄운다. 콜백 호출은 인자 리스트에 기록된다.
    Future<void> pumpEditable(
      WidgetTester tester, {
      required Quest quest,
      required Future<String?> Function() loadProof,
      required List<String?> savedMemos,
      required List<String?> savedPhotos,
      Future<Uint8List?> Function()? pickImage,
      Future<void> Function(String? memo)? onSaveMemo,
      Future<void> Function(String? base64)? onSavePhoto,
    }) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: AchievementDetailSheet(
              quest: quest,
              loadProof: loadProof,
              onSaveMemo:
                  onSaveMemo ??
                  (memo) async {
                    savedMemos.add(memo);
                  },
              onSavePhoto:
                  onSavePhoto ??
                  (base64) async {
                    savedPhotos.add(base64);
                  },
              pickImage: pickImage ?? () async => null,
            ),
          ),
        ),
      );
    }

    testWidgets('수정 버튼을 누르면 편집 모드(TextField)로 전환된다', (tester) async {
      final memos = <String?>[];
      final photos = <String?>[];
      await pumpEditable(
        tester,
        quest: doneQuest(memo: '초안 3장'),
        loadProof: () async => null,
        savedMemos: memos,
        savedPhotos: photos,
      );
      await tester.pumpAndSettle();

      // 보기 모드: TextField 없음.
      expect(find.byType(TextField), findsNothing);

      await tester.tap(find.text('수정'));
      await tester.pumpAndSettle();

      // 편집 모드: 메모 TextField + 저장/취소.
      expect(find.byType(TextField), findsOneWidget);
      expect(find.text('저장'), findsOneWidget);
      expect(find.text('취소'), findsOneWidget);
    });

    testWidgets('★ 메모를 고쳐 저장하면 onSaveMemo가 새 값으로 불린다', (tester) async {
      final memos = <String?>[];
      final photos = <String?>[];
      await pumpEditable(
        tester,
        quest: doneQuest(memo: '옛 메모'),
        loadProof: () async => null,
        savedMemos: memos,
        savedPhotos: photos,
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('수정'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), '새로 고친 메모');
      await tester.tap(find.text('저장'));
      await tester.pumpAndSettle();

      expect(memos, ['새로 고친 메모']);
      // 사진은 안 건드렸으므로 onSavePhoto는 불리지 않는다.
      expect(photos, isEmpty);
      // 저장 성공 → 보기 모드로 돌아가 새 메모가 보인다.
      expect(find.byType(TextField), findsNothing);
      expect(find.text('새로 고친 메모'), findsOneWidget);
    });

    testWidgets('★ 사진을 교체하고 저장하면 onSavePhoto가 base64로 불린다', (tester) async {
      final memos = <String?>[];
      final photos = <String?>[];
      // 픽업이 돌려줄 가짜 바이트 → 시트가 base64Encode 한 값이 콜백에 와야 한다.
      final fakeBytes = Uint8List.fromList([1, 2, 3, 4, 5]);
      await pumpEditable(
        tester,
        quest: doneQuest(memo: '메모'),
        loadProof: () async => null,
        savedMemos: memos,
        savedPhotos: photos,
        pickImage: () async => fakeBytes,
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('수정'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('사진 바꾸기'));
      await tester.pumpAndSettle();

      // 사진 미리보기가 붙으면 저장 버튼이 600px 뷰포트 아래로 밀린다 — 스크롤로 올린다.
      await tester.ensureVisible(find.text('저장'));
      await tester.tap(find.text('저장'));
      await tester.pumpAndSettle();

      expect(photos, [base64Encode(fakeBytes)]);
      // 메모는 안 바꿨으므로 onSaveMemo는 불리지 않는다.
      expect(memos, isEmpty);
    });

    testWidgets('★ 사진을 제거하고 저장하면 onSavePhoto가 null로 불린다', (tester) async {
      final memos = <String?>[];
      final photos = <String?>[];
      await pumpEditable(
        tester,
        quest: doneQuest(memo: '메모'),
        loadProof: () async => tinyPng, // 처음엔 사진이 있다.
        savedMemos: memos,
        savedPhotos: photos,
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('수정'));
      await tester.pumpAndSettle();

      // 사진이 있으므로 "제거" 버튼이 있다.
      await tester.tap(find.text('제거'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('저장'));
      await tester.pumpAndSettle();

      expect(photos, [null]);
    });

    testWidgets('★ 취소하면 아무 콜백도 부르지 않고 원상 복귀한다', (tester) async {
      final memos = <String?>[];
      final photos = <String?>[];
      await pumpEditable(
        tester,
        quest: doneQuest(memo: '원래 메모'),
        loadProof: () async => null,
        savedMemos: memos,
        savedPhotos: photos,
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('수정'));
      await tester.pumpAndSettle();

      // 메모를 바꿔 놓고…
      await tester.enterText(find.byType(TextField), '바꾸다 만 메모');
      // …취소한다.
      await tester.tap(find.text('취소'));
      await tester.pumpAndSettle();

      // 아무 콜백도 불리지 않았다.
      expect(memos, isEmpty);
      expect(photos, isEmpty);
      // 보기 모드로 돌아가 **원래** 메모가 보인다(입력은 버려졌다).
      expect(find.byType(TextField), findsNothing);
      expect(find.text('원래 메모'), findsOneWidget);
      expect(find.text('바꾸다 만 메모'), findsNothing);
    });

    testWidgets('★ 저장이 실패하면 스낵바가 뜨고 편집 모드가 유지된다', (tester) async {
      final photos = <String?>[];
      await pumpEditable(
        tester,
        quest: doneQuest(memo: '옛 메모'),
        loadProof: () async => null,
        savedMemos: <String?>[],
        savedPhotos: photos,
        onSaveMemo: (memo) async {
          throw const NetworkFailure();
        },
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('수정'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), '저장 실패할 메모');
      await tester.tap(find.text('저장'));
      await tester.pumpAndSettle();

      // 스낵바로 실패를 알린다.
      expect(find.byType(SnackBar), findsOneWidget);
      // 편집 모드가 유지돼 입력이 살아 있다(TextField가 여전히 있다).
      expect(find.byType(TextField), findsOneWidget);
    });

    testWidgets('빈 메모로 저장하면 onSaveMemo가 null로 불린다(normalizeMemo 규칙)', (
      tester,
    ) async {
      final memos = <String?>[];
      final photos = <String?>[];
      await pumpEditable(
        tester,
        quest: doneQuest(memo: '지울 메모'),
        loadProof: () async => null,
        savedMemos: memos,
        savedPhotos: photos,
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('수정'));
      await tester.pumpAndSettle();

      // 메모를 공백만 남긴다 → null로 정규화돼야 한다.
      await tester.enterText(find.byType(TextField), '   ');
      await tester.tap(find.text('저장'));
      await tester.pumpAndSettle();

      expect(memos, [null]);
    });
  });
}
