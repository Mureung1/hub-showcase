import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/decompose_limits.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/repositories/decompose/quest_templates.dart';

/// 템플릿 **원본 개수** 불변식을 정책 상수에 직접 못 박는다.
///
/// 왜 필요한가: 폴백 경로(`_fallback` → [templateFor])는 notifier의 `.take(5)` 캡을
/// **거치지 않는다.** 즉 템플릿 세트가 실수로 6개로 늘면, 화면 캡이 있는 분해 경로에서는
/// 조용히 5개로 잘려 회귀가 안 보이지만, **폴백 화면에서는 6개가 그대로 노출**된다.
/// 그래서 "어떤 템플릿도 kMaxDecomposeDrafts를 넘지 않는다"를 여기서 직접 검증해,
/// 캡이 가려주는 조용한 회귀를 원천 차단한다.
void main() {
  group('quest_templates — 템플릿 크기 정책 불변식', () {
    // 각 키워드 유형을 실제로 타는 대표 목표. (마지막은 어떤 키워드도 안 걸려 _generic.)
    const goalsByType = <String, String>{
      '공모전(contest)': '공모전 지원하기',
      '자격증(cert)': '자격증 시험 공부하기',
      '대외활동(activity)': '대외활동 지원하기',
      '포트폴리오(portfolio)': '포트폴리오 만들기',
      '범용(generic)': '건강하게 살기',
    };

    for (final entry in goalsByType.entries) {
      test('${entry.key} 템플릿은 kMaxDecomposeDrafts(5) 이하이며 비어있지 않다', () {
        final drafts = templateFor(entry.value);

        // 폴백은 언제나 최소 한 세트를 보장한다.
        expect(drafts, isNotEmpty, reason: '${entry.key}: 폴백은 빈 결과를 내면 안 된다');
        // 핵심 불변식: 폴백 경로가 캡을 안 거치므로 템플릿 자체가 상한을 지켜야 한다.
        expect(
          drafts.length,
          lessThanOrEqualTo(kMaxDecomposeDrafts),
          reason: '${entry.key}: 템플릿이 $kMaxDecomposeDrafts개를 초과하면 '
              '폴백 화면에서 캡 없이 그대로 노출된다',
        );
        // order가 0..n 연속인지(구멍 없음).
        for (var i = 0; i < drafts.length; i++) {
          expect(drafts[i].order, i, reason: '${entry.key}: order는 0..n 연속이어야 한다');
        }
        // 난이도는 항상 유효 enum.
        expect(
          drafts.every((d) => Difficulty.values.contains(d.difficulty)),
          isTrue,
        );
      });
    }
  });
}
