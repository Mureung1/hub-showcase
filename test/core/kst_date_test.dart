import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/utils/kst_date.dart';

/// 하루 경계는 **KST 자정**이다(UTC 자정이 아니다).
///
/// 이 구분이 무너지면 한국 사용자에게 하루가 오전 9시에 리셋된다 —
/// 아침에 퀘스트를 하던 사람의 코인 카운터가 갑자기 0이 되고, 밤 11시 출석이
/// "어제"로 기록돼 스트릭이 끊긴다. 그래서 UTC와 결과가 갈리는 시각으로 못 박는다.
void main() {
  group('kstDateKey — KST 자정 기준', () {
    test('UTC 15:00 = KST 다음날 00:00 → 날짜가 하루 넘어간다', () {
      final instant = DateTime.utc(2026, 7, 21, 15);

      // UTC로 읽으면 7/21이지만 KST로는 이미 7/22다.
      expect(instant.toUtc().day, 21);
      expect(kstDateKey(instant), '2026-07-22');
    });

    test('UTC 14:59 = KST 23:59 → 아직 같은 날이다', () {
      expect(kstDateKey(DateTime.utc(2026, 7, 21, 14, 59)), '2026-07-21');
    });

    test('UTC 자정은 KST 오전 9시라 날짜가 바뀌지 않는다', () {
      // UTC 기준으로 구현했다면 여기서 날짜가 넘어갔을 것이다.
      expect(kstDateKey(DateTime.utc(2026, 7, 21, 23, 59)), '2026-07-22');
      expect(kstDateKey(DateTime.utc(2026, 7, 22, 0, 0)), '2026-07-22');
      expect(kstDateKey(DateTime.utc(2026, 7, 22, 8, 59)), '2026-07-22');
    });

    test('월·일이 한 자리여도 zero-padding 된다', () {
      expect(kstDateKey(DateTime.utc(2026, 1, 5, 3)), '2026-01-05');
    });

    // 「기기 타임존과 무관하다」는 명제는 **테스트로 세울 수 없다.**
    // `kstDateKey(utc.toLocal())`은 같은 순간을 다시 넘기는 항등식이라 구현이
    // `toUtc()`를 빠뜨려도 통과한다(CI가 UTC로 돌면 로컬 벽시계가 UTC와 같다).
    // 프로세스 타임존을 Dart에서 바꿀 수 없으므로 어느 환경에서도 유효한 단언이
    // 되지 않는다 — 환경에 따라 통과/실패가 갈리는 테스트는 없느니만 못하다.
    // 대신 구현이 `toUtc()`를 반드시 거치도록 `kst_date.dart`에 사유를 명시해 뒀고,
    // 위의 UTC 시각 기반 경계 테스트들이 오프셋 자체를 고정한다.
  });

  group('kstDayNumber / kstDayNumberOfKey — 간격 계산', () {
    test('키에서 구한 일수와 시각에서 구한 일수가 일치한다', () {
      final instant = DateTime.utc(2026, 7, 21, 15);
      expect(
        kstDayNumberOfKey(kstDateKey(instant)),
        kstDayNumber(instant),
      );
    });

    test('월말 경계도 1일 차이로 계산된다', () {
      final feb28 = kstDayNumberOfKey('2026-02-28')!;
      final mar1 = kstDayNumberOfKey('2026-03-01')!;
      expect(mar1 - feb28, 1); // 2026은 평년
    });

    test('윤년 2/29를 건너뛰지 않는다', () {
      expect(kstDayNumberOfKey('2028-03-01')! - kstDayNumberOfKey('2028-02-28')!, 2);
    });

    test('깨진 키는 예외 대신 null (저장 문서가 오염돼도 죽지 않는다)', () {
      expect(kstDayNumberOfKey(null), isNull);
      expect(kstDayNumberOfKey(''), isNull);
      expect(kstDayNumberOfKey('2026-07'), isNull);
      expect(kstDayNumberOfKey('어제'), isNull);
      expect(kstDayNumberOfKey('yyyy-MM-dd'), isNull);
    });
  });
}
