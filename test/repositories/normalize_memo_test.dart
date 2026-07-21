import 'package:characters/characters.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/repositories/quest_repository.dart';

/// `normalizeMemo`는 "인증이 성립하는가"와 "저장소에 들어갈 최종 문자열"을
/// 결정하는 단일 정의처다. 두 저장소 구현이 공유하므로 여기서만 검증하면
/// InMemory·Firestore 양쪽에 일괄 적용된다.
void main() {
  group('normalizeMemo — 공백/빈값 정규화', () {
    test('null은 null', () {
      expect(normalizeMemo(null), isNull);
    });

    test('공백만 있으면 null (인증 불성립)', () {
      expect(normalizeMemo('   '), isNull);
      expect(normalizeMemo('\n\t '), isNull);
    });

    test('정상 입력은 trim된 값', () {
      expect(normalizeMemo('  공고 3개 찾음  '), '공고 3개 찾음');
    });
  });

  group('normalizeMemo — 길이 상한(kMaxMemoLength) 방어 절단', () {
    test('상한 미만은 그대로', () {
      final memo = 'a' * (kMaxMemoLength - 1);
      expect(normalizeMemo(memo), memo);
    });

    test('경계(정확히 kMaxMemoLength)는 그대로 통과', () {
      final memo = 'a' * kMaxMemoLength;
      final result = normalizeMemo(memo);
      expect(result, memo);
      expect(result!.characters.length, kMaxMemoLength);
    });

    test('상한 초과는 정확히 kMaxMemoLength 문자로 절단', () {
      final memo = 'a' * (kMaxMemoLength + 50);
      final result = normalizeMemo(memo);
      expect(result!.characters.length, kMaxMemoLength);
      expect(result, 'a' * kMaxMemoLength);
    });

    test('trim 후 길이로 센다 — 앞뒤 공백은 상한 계산에 포함되지 않는다', () {
      // 앞뒤 공백을 먼저 걷어낸 뒤 상한을 적용해야, 공백 때문에 실제 내용이
      // 억울하게 잘리지 않는다.
      final memo = '   ${'a' * kMaxMemoLength}   ';
      final result = normalizeMemo(memo);
      expect(result, 'a' * kMaxMemoLength);
    });

    test('★ 이모지가 섞인 초과 입력도 문자 경계에서 안전하게 잘린다', () {
      // 이모지는 여러 코드유닛으로 이뤄져, substring(코드유닛)으로 자르면
      // 반토막 난 깨진 문자가 저장된다. characters(그래프임) 기준이어야 안전하다.
      final memo = '🎉' * (kMaxMemoLength + 10);
      final result = normalizeMemo(memo);
      // 문자 수는 정확히 상한, 그리고 원본 이모지가 그대로(깨지지 않고) 반복된다.
      expect(result!.characters.length, kMaxMemoLength);
      expect(result, '🎉' * kMaxMemoLength);
      // 코드유닛이 반토막 났다면 U+FFFD(대체 문자)가 섞인다 — 없어야 한다.
      expect(result.codeUnits.contains(0xFFFD), isFalse);
    });

    test('★ 조합형 한글(자모 나열)이 섞인 초과 입력도 깨지지 않고 잘린다', () {
      // 초성 ᄀ(U+1100) + 중성 ᅡ(U+1161) + 종성 ᆨ(U+11A8) = 한 글자 '각'.
      // 한 글자가 세 코드포인트라, 코드유닛 경계에서 자르면 자모가 흩어진다.
      // characters(그래프임 클러스터) 기준이라야 한 글자로 세고, 통째로 남긴다.
      final syllable = String.fromCharCodes([0x1100, 0x1161, 0x11A8]);
      // 방어적 확인: 이 조합은 실제로 한 그래프임 클러스터다.
      expect(syllable.characters.length, 1);

      final memo = syllable * (kMaxMemoLength + 5);
      final result = normalizeMemo(memo);
      expect(result!.characters.length, kMaxMemoLength);
      expect(result, syllable * kMaxMemoLength);
      // 자모가 반토막 나 대체 문자로 치환되지 않았다.
      expect(result.codeUnits.contains(0xFFFD), isFalse);
    });
  });
}
