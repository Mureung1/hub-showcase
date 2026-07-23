/// 성공 지표 3개를 **이벤트 로그만으로** 계산하는 순수 함수 모음.
///
/// `docs/plan.md`의 지표 정의를 그대로 따른다. `applyXpGain`·`applyDailyCoinCap`과
/// 같은 이유로 순수 함수 + 테스트다 — "로그로 산출할 수 있다"를 발표 때 코드로
/// 보여줄 수 있고, 정의가 두 곳으로 갈라지지 않는다.
///
/// 입력이 비어도 죽지 않고 0/false를 낸다(0으로 나누지 않는다).
library;

import '../../models/analytics_event.dart';
import '../utils/kst_date.dart';

/// 「7일 리텐션」이 보는 날짜 오프셋(가입일로부터 며칠째).
const int kRetentionDayOffset = 7;

/// 등록 이벤트가 나타내는 퀘스트 수. `count` 파라미터를 쓰되, 없으면 1건으로 본다.
int _registeredCount(AnalyticsEvent event) {
  final raw = event.params['count'];
  if (raw is int) return raw;
  if (raw is num) return raw.toInt();
  return 1;
}

int _countOfType(List<AnalyticsEvent> events, AnalyticsEventType type) =>
    events.where((e) => e.type == type).length;

/// **도전 시작률** — 등록한 도전이 실제로 완료까지 이어진 비율.
///
/// plan.md: "등록 후 완료로 이어진 비율". 데모는 단일 uid라 사용자 축을 접고
/// **등록된 퀘스트 수 대비 완료된 퀘스트 수**로 정의한다:
///
///   `questCompleted 이벤트 수 / Σ(questRegistered.count)`
///
/// - 분모는 등록 **이벤트 수**가 아니라 등록된 퀘스트 **개수의 합**이다(한 번의 AI
///   분해가 5개를 등록하면 5로 센다). 분자는 완료 지급이 일어난 이벤트 수다.
/// - `registered == 0`이면 0을 돌려준다(0으로 나누지 않는다).
/// - 완료가 등록을 넘는 오염된 로그에도 폭주하지 않도록 `[0,1]`로 clamp한다.
double challengeStartRate(List<AnalyticsEvent> events) {
  final registered = events
      .where((e) => e.type == AnalyticsEventType.questRegistered)
      .fold<int>(0, (sum, e) => sum + _registeredCount(e));
  if (registered == 0) return 0;

  final completed = _countOfType(events, AnalyticsEventType.questCompleted);
  return (completed / registered).clamp(0.0, 1.0);
}

/// **재분해 복귀율** — 멈춘 퀘스트가 재분해로 이어진 비율.
///
/// plan.md: "멈춘 퀘스트를 더 작게 나눈 뒤 다시 실행한 비율". 데모 지표는
/// **멈춤(questStuck) 대비 재분해(questRedecomposed) 전환**으로 정의한다:
///
///   `questRedecomposed 이벤트 수 / questStuck 이벤트 수`
///
/// (완전한 "다시 실행"까지 보려면 자식 완료가 필요하지만, 그건 별도 이벤트다.
///  분모가 `stuck`이라는 사실이 `QuestStatus.stuck`을 3상태로 유지하는 근거다.)
/// - `stuck == 0`이면 0. `[0,1]`로 clamp.
double redecomposeRecoveryRate(List<AnalyticsEvent> events) {
  final stuck = _countOfType(events, AnalyticsEventType.questStuck);
  if (stuck == 0) return 0;

  final redecomposed = _countOfType(
    events,
    AnalyticsEventType.questRedecomposed,
  );
  return (redecomposed / stuck).clamp(0.0, 1.0);
}

/// **7일 리텐션** — 가입일로부터 7일째(KST)에 접속 기록이 있는가.
///
/// - `signup`이 없으면 false(가입 시점을 모르면 리텐션을 말할 수 없다).
/// - 가입일은 **가장 이른 signup**의 날짜(KST 일련 일수)로 잡는다.
/// - 그 날로부터 정확히 [kRetentionDayOffset]일 뒤에 `appOpen`이 하나라도 있으면
///   true. 날짜 차는 `kstDayNumber`(하루 코인 상한·스트릭과 같은 KST 경계 계산)를
///   재사용한다 — 타임존이 흔들리지 않는다.
bool retainedOnDay7(List<AnalyticsEvent> events) {
  final signups = events
      .where((e) => e.type == AnalyticsEventType.signup)
      .toList();
  if (signups.isEmpty) return false;

  signups.sort((a, b) => a.at.compareTo(b.at));
  final signupDay = kstDayNumber(signups.first.at);

  return events.any(
    (e) =>
        e.type == AnalyticsEventType.appOpen &&
        kstDayNumber(e.at) - signupDay == kRetentionDayOffset,
  );
}

/// 세 지표를 한 번에. 발표·리포트에서 한 줄로 뽑아 쓰기 위한 편의 함수.
({
  double challengeStartRate,
  double redecomposeRecoveryRate,
  bool retainedOnDay7,
})
computeMetrics(List<AnalyticsEvent> events) => (
  challengeStartRate: challengeStartRate(events),
  redecomposeRecoveryRate: redecomposeRecoveryRate(events),
  retainedOnDay7: retainedOnDay7(events),
);
