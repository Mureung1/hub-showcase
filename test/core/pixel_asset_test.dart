import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/dialog_art.dart';
import 'package:one_step/core/constants/empty_art.dart';
import 'package:one_step/core/constants/growth_rules.dart';
import 'package:one_step/core/constants/rebirth_frame.dart';
import 'package:one_step/core/constants/shop_items.dart';

/// 도트아트 자산 경로 계약 — **두 층으로 검증한다.**
///
/// 자산 경로는 컴파일러가 봐 주지 않는 문자열이라, 한 글자만 틀려도 런타임에야
/// 터진다(그것도 이모지 폴백이 조용히 가려 준다). 그래서 두 가지를 따로 본다:
///
/// 1. **디스크 대조** (`File.existsSync`) — 경로 오타·파일 누락을 잡는다.
/// 2. **번들 조회** (`rootBundle.load`) — `pubspec.yaml`의 `assets:` 선언 누락을
///    잡는다. 파일이 디스크에 있어도 선언이 빠지면 앱에서는 못 읽는다. 1번만으로는
///    이 사고를 절대 못 잡는다.
void main() {
  // rootBundle이 테스트 자산 번들(build/unit_test_assets)을 보게 한다.
  TestWidgetsFlutterBinding.ensureInitialized();

  /// 두 층을 한 번에 건다.
  Future<void> expectUsable(String asset) async {
    expect(
      File(asset).existsSync(),
      isTrue,
      reason: '$asset 파일이 디스크에 없다 (경로 오타이거나 파일이 빠졌다)',
    );
    // 번들에 없으면 load가 던진다 — pubspec 선언 누락의 증거다.
    final data = await rootBundle.load(asset);
    expect(
      data.lengthInBytes,
      greaterThan(0),
      reason: '$asset 이 번들에 비어 있다 (pubspec assets 선언을 확인할 것)',
    );
  }

  group('캐릭터 15단계', () {
    // 계열 × 레벨 구간(3×5)을 전부 훑는다. 구간 대표 레벨은 _stageIndexOf 경계
    // (1–9 / 10–19 / 20–29 / 30–44 / 45+)에서 하나씩 고른다.
    const rebirthByFamily = {'새': 0, '용': kDragonRebirth, '피닉스': kPhoenixRebirth};
    const levels = [1, 10, 20, 30, 45];

    for (final family in rebirthByFamily.entries) {
      for (final level in levels) {
        test('${family.key} 계열 Lv.$level 자산', () async {
          final stage = stageOf(level, rebirth: family.value);
          await expectUsable(stage.asset);
        });
      }
    }

    test('15개 경로가 서로 겹치지 않는다 (복사·붙여넣기 사고 방지)', () {
      final assets = <String>{};
      for (final rebirth in rebirthByFamily.values) {
        for (final level in levels) {
          assets.add(stageOf(level, rebirth: rebirth).asset);
        }
      }
      expect(assets, hasLength(15));
    });

    test('모든 단계가 폴백 이모지를 갖는다', () {
      // checklist: "자산 로드 실패 시 대체 표시(이모지)가 나온다".
      for (final rebirth in rebirthByFamily.values) {
        for (final level in levels) {
          expect(stageOf(level, rebirth: rebirth).emoji, isNotEmpty);
        }
      }
    });
  });

  group('상점 아이템 5종', () {
    for (final item in kShopItems) {
      test('${item.id} 자산', () async {
        await expectUsable(shopItemAsset(item));
      });
    }

    test('경로는 슬롯 디렉터리 + id 로 유도된다', () {
      // 규칙이 흔들리면 카드와 상점 미리보기가 서로 다른 그림을 그린다.
      expect(
        shopItemAsset(itemById('bg_forest')!),
        'assets/backgrounds/bg_forest.png',
      );
      expect(
        shopItemAsset(itemById('aura_leaf')!),
        'assets/auras/aura_leaf.png',
      );
    });
  });

  group('빈 화면 일러스트 5종', () {
    // 리터럴을 다시 적지 않고 **화면이 실제로 넘기는 상수**를 검증한다. 사본을
    // 적어 두면 화면 쪽 오타를 절대 못 잡는다(폴백이 이모지로 덮어 버린다).
    for (final asset in kEmptyArt) {
      test(asset, () async => expectUsable(asset));
    }

    test('kEmptyArt가 assets/empty 디렉터리와 정확히 일치한다', () {
      // 위 루프는 "목록에 적힌 것"만 본다. 파일만 추가하고 상수에 안 넣으면
      // 그 자산은 영영 검증 밖이라, 양방향으로 묶어 둔다.
      final onDisk = Directory('assets/empty')
          .listSync()
          .whereType<File>()
          .map((f) => 'assets/empty/${f.uri.pathSegments.last}')
          .where((p) => p.endsWith('.png'))
          .toSet();

      expect(onDisk, kEmptyArt.toSet());
    });
  });

  group('다이얼로그 배지 도트아트 5종', () {
    // 빈 화면 일러스트와 같은 처방 — 리터럴을 다시 적지 않고 **화면이 실제로
    // 넘기는 상수**를 검증한다(경로 오타는 이모지 폴백에 조용히 덮인다).
    for (final asset in kDialogArt) {
      test(asset, () async => expectUsable(asset));
    }

    test('kDialogArt가 assets/dialogs 디렉터리와 정확히 일치한다', () {
      final onDisk = Directory('assets/dialogs')
          .listSync()
          .whereType<File>()
          .map((f) => 'assets/dialogs/${f.uri.pathSegments.last}')
          .where((p) => p.endsWith('.png'))
          .toSet();

      expect(onDisk, kDialogArt.toSet());
    });
  });

  group('환생 액자 3종', () {
    // 같은 처방 — 리터럴을 다시 적지 않고 **화면이 실제로 넘기는 상수**를 본다.
    // 액자의 폴백은 이모지도 아닌 **빈 위젯**이라, 경로가 틀리면 아무 흔적 없이
    // 사라진다. 여기서 못 잡으면 잡을 곳이 없다.
    for (final asset in kRebirthFrames) {
      test(asset, () async => expectUsable(asset));
    }

    test('kRebirthFrames가 assets/frame 디렉터리와 정확히 일치한다', () {
      final onDisk = Directory('assets/frame')
          .listSync()
          .whereType<File>()
          .map((f) => 'assets/frame/${f.uri.pathSegments.last}')
          .where((p) => p.endsWith('.png'))
          .toSet();

      expect(onDisk, kRebirthFrames.toSet());
    });
  });
}
