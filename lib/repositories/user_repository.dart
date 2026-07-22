import '../core/constants/reward_rules.dart';
import '../models/app_user.dart';

/// 사용자 문서 읽기·쓰기.
///
/// 구현체는 실패 시 반드시 `AppFailure`를 던진다.
abstract interface class UserRepository {
  /// 사용자 변화 스트림.
  ///
  /// 문서가 아직 없으면 [AppUser.initial]을 흘린다 — 신규 사용자도 특수 분기 없이
  /// 정상 경로로 Lv.1 / XP 0 / 코인 0이 렌더된다.
  Stream<AppUser> watchUser(String uid);

  Future<AppUser> fetchUser(String uid);

  /// 문서가 없으면 만든다. 여러 번 불러도 안전하다(멱등).
  /// 최초 접속 시 `users/{uid}` 자동 생성이 이걸로 이뤄진다.
  Future<AppUser> ensureUser(String uid);

  /// 오늘의 출석을 기록하고, 7일 연속이면 보너스를 **같은 트랜잭션에서** 지급한다.
  ///
  /// **기준은 "앱을 열었다"이지 "퀘스트를 완료했다"가 아니다.** 퀘스트를 하나도
  /// 하지 않은 날도 출석으로 친다 — 스트릭은 리텐션 지표이지 성과 지표가 아니다.
  /// 그래서 호출 지점은 세션 준비 직후([sessionProvider] 경로)다.
  ///
  /// **[ensureUser]에 합치지 않은 이유**: `ensureUser`는 "문서가 없으면 만든다"는
  /// **멱등** 계약이고, 여러 번 불려도 기존 값을 밀어내지 않는 것이 그 존재 이유다
  /// (트랜잭션인 것도 동시 호출이 지급된 코인을 0으로 되돌리는 걸 막기 위해서다).
  /// 출석은 반대로 **날짜가 바뀔 때마다 문서를 바꾸는 쓰기**라, 합치면 그 멱등성이
  /// 깨진다. 왕복이 하나 늘지만 계약을 섞는 것보다 낫다.
  ///
  /// 같은 날 다시 불려도 안전하다(멱등) — 날짜 키가 같으면 아무것도 쓰지 않고
  /// 보너스도 지급하지 않는다. 앱 재실행·탭 전환으로 여러 번 불릴 수 있기 때문에
  /// 이 성질이 필수다.
  ///
  /// 보너스 코인은 **하루 코인 상한([kDailyCoinCap])을 무시하고** 전액 지급되며,
  /// 하루 카운터(`dailyCoinEarned`)에도 더하지 않는다.
  Future<AttendanceResult> recordAttendance(String uid);

  /// 장착 아이템 변경 (4주차 상점).
  Future<void> updateEquipped(String uid, Map<String, String> equipped);
}
