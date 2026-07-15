import '../../core/error/app_failure.dart';
import '../../models/quest_draft.dart';
import '../quest_decomposer.dart';
import 'quest_templates.dart';

/// Fake [QuestDecomposer]가 재현할 상황.
///
/// 정상 1개 + 실패/오염 6개. 2주차 checklist의 "AI 응답 검증" 항목들을
/// 실제 파서([QuestDraft.parseList])를 밟아 재현한다.
enum FakeDecomposeScenario {
  /// templateFor(goal) 반환 — 데모 모드 = 그럴듯한 한글 퀘스트.
  success,

  /// [] 반환. 호출자(다음 커밋의 Notifier)가 템플릿 폴백을 결정한다.
  empty,

  /// 깨진 JSON(=List가 아닌 값)을 parseList에 흘린다 → ParseFailure.
  brokenJson,

  /// title/difficulty 누락 항목이 섞인 원본 → 불량 제외, 정상만 생존.
  missingField,

  /// "매우어려움" 같은 오염 난이도가 섞인 원본 → 오염 제외, 정상만 생존.
  difficultyPollution,

  /// 타임아웃 → NetworkFailure.
  timeout,

  /// 서버 5xx → UnknownFailure.
  serverError,
}

/// Firebase/실제 LLM 없이 도는 가짜 분해기.
///
/// 1주차 [InMemoryQuestRepository]의 `failWith` 패턴과 같은 취지다 —
/// [scenario] 하나로 정상·실패·오염 응답을 한 줄로 주입한다.
///
/// ```dart
/// FakeQuestDecomposer(scenario: FakeDecomposeScenario.timeout)
/// ```
///
/// **핵심 규약**: broken/missing/pollution 시나리오는 파싱 로직을 여기서
/// 재구현하지 않는다. "AI가 준 원본"을 만들어 **진짜 [QuestDraft.parseList]에
/// 흘려보내야** 한다. 그래야 테스트가 Fake의 흉내가 아니라 실제 파서를 검증한다.
class FakeQuestDecomposer implements QuestDecomposer {
  FakeQuestDecomposer({this.scenario = FakeDecomposeScenario.success, this.delay});

  final FakeDecomposeScenario scenario;

  /// 로딩 상태 테스트용 인위적 지연. null이면 즉시 반환.
  final Duration? delay;

  @override
  Future<List<QuestDraft>> decompose(String goal) async {
    if (delay != null) await Future<void>.delayed(delay!);

    switch (scenario) {
      case FakeDecomposeScenario.success:
        return templateFor(goal);

      case FakeDecomposeScenario.empty:
        // 조용히 빈 결과. 폴백 여부는 호출자가 정한다(여기서 던지지 않는다).
        return const [];

      case FakeDecomposeScenario.brokenJson:
        // AI가 List가 아닌 깨진 문자열을 뱉은 상황. parseList는 List가 아니면
        // []를 돌려주므로, 그 빈 결과를 "성공"으로 착각하면 안 된다 → 실패로 본다.
        return _parseOrFail('{ this is not json');

      case FakeDecomposeScenario.missingField:
        // 정상 2 + (title 누락) + (difficulty 누락). 불량은 parseStrict가 걷어내고
        // 정상 2개만 살아남아야 한다.
        return _parseOrFail(<Object?>[
          {'title': '공고 페이지 열어 지원 자격 확인하기', 'difficulty': 'easy'},
          {'difficulty': 'normal'}, // title 누락 → 거부
          {'title': '핵심 아이디어 세 줄로 정리하기'}, // difficulty 누락 → 거부
          {'title': '지원서 초안 한 단락 작성하기', 'difficulty': 'hard'},
        ]);

      case FakeDecomposeScenario.difficultyPollution:
        // 정상 2 + 오염 난이도 1("매우어려움"). 오염 항목은 normal로 떨어지지 않고
        // 통째로 제외되어야 한다(난이도=보상 등급이라 조용한 폴백은 보상 왜곡).
        return _parseOrFail(<Object?>[
          {'title': '시험 일정과 응시 자격 확인하기', 'difficulty': 'easy'},
          {'title': '기출문제 한 회분 풀어 보기', 'difficulty': '매우어려움'}, // 오염 → 거부
          {'title': '오답 정리하고 복습하기', 'difficulty': 'normal'},
        ]);

      case FakeDecomposeScenario.timeout:
        // 응답 지연 초과 = 도달 실패 계열.
        throw const NetworkFailure();

      case FakeDecomposeScenario.serverError:
        // 5xx는 서버에 닿았으나 처리에 실패한 것 → 연결 문제(Network)가 아니라
        // 분류되지 않은 상위 실패로 본다.
        throw const UnknownFailure();
    }
  }

  /// 진짜 [QuestDraft.parseList]를 통과시키고, 결과가 비면 [ParseFailure].
  ///
  /// 빈 결과를 조용히 반환하지 않는 이유: 깨진/전부불량 응답은 "성공했는데 0개"가
  /// 아니라 **실패**다. 여기서 [] 로 넘기면 호출자가 실패를 성공으로 오해한다.
  List<QuestDraft> _parseOrFail(Object? rawList) {
    final drafts = QuestDraft.parseList(rawList);
    if (drafts.isEmpty) throw const ParseFailure();
    return drafts;
  }
}
