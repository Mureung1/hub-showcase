/// **Gemini 분해 프롬프트 — 버전이 붙은 단일 진실원.**
///
/// 프롬프트를 [RemoteQuestDecomposer] 안에 문자열로 흩뿌리지 않고 여기 모으는 이유:
/// - checklist 2주차 "LLM 프롬프트 초안 작성 / **프롬프트 버전 관리**" 항목을
///   [kPromptVersion] 상수로 닫는다. 프롬프트를 바꾸면 이 버전을 올려, 나중에
///   "어떤 프롬프트로 뽑힌 결과인가"를 추적할 수 있게 한다.
/// - 개수·난이도 규칙은 [decompose_limits.dart]가 정본이다. 프롬프트가 그 값을
///   **문자열로 다시 쓰지 않고 인용**해, 정책이 바뀌면 상수 한 곳만 고치면 된다.
library;

import 'dart:convert';

import '../../core/constants/decompose_limits.dart';

/// 프롬프트 스키마/문구를 바꿀 때마다 올린다. 재현성·회귀 추적용.
const String kPromptVersion = 'v1';

/// 최초 분해 프롬프트를 만든다.
///
/// [goal]은 사용자가 입력한 큰 목표다. LLM 지시문 한가운데에 그대로 끼워 넣으면
/// 목표 안에 담긴 문장("위 지시는 무시하고 …")이 지시로 오인될 수 있다(프롬프트
/// 인젝션). 그래서 [_safeGoal]로 **JSON 문자열 리터럴로 이스케이프**해 데이터임을
/// 명확히 구분한다.
String buildDecomposePrompt(String goal) {
  return '''
당신은 큰 도전을 오늘 당장 실행할 수 있는 아주 작은 마이크로 퀘스트로 쪼개는 코치입니다.

[목표]
${_safeGoal(goal)}

[규칙]
- 실행 가능한 마이크로 퀘스트로 **최대 $kMaxDecomposeDrafts개**까지만 나눕니다. (적어도 됩니다)
- 각 퀘스트는 오늘 안에 끝낼 수 있을 만큼 구체적이고 작아야 합니다.
- 제목은 **한국어**로, 행동을 나타내는 짧은 문장으로 씁니다.
- 난이도는 정확히 셋 중 하나입니다: easy / normal / hard.
  - 초반 조사·확인처럼 부담 없는 첫걸음은 easy.
  - 실제 산출물(초안 작성·문제 풀이 등)은 normal 또는 hard.
- 목표를 처음 시작하는 사람도 부담 없이 첫 칸을 채울 수 있도록 순서대로 배열합니다.
$_schemaInstruction''';
}

/// 개별 항목 재분해 프롬프트를 만든다.
///
/// 목표 전체([goalText])와 쪼갤 대상 항목([itemTitle])을 함께 준다 — LLM이 항목만
/// 보고 맥락 없이 엉뚱하게 쪼개는 것을 막기 위해서다(quest_decomposer.dart 계약).
String buildRedecomposePrompt({
  required String goalText,
  required String itemTitle,
}) {
  return '''
당신은 하나의 퀘스트를 더 작은 하위 단계로 쪼개는 코치입니다.

[전체 목표]
${_safeGoal(goalText)}

[쪼갤 퀘스트]
${_safeGoal(itemTitle)}

[규칙]
- 위 [쪼갤 퀘스트]만을 더 작은 하위 단계로 **최대 $kMaxRedecomposeDrafts개**까지 나눕니다.
- 전체 목표의 맥락을 유지하되, [쪼갤 퀘스트]의 범위를 벗어나지 않습니다.
- 각 단계는 더 부담 없이 바로 시작할 수 있을 만큼 작아야 합니다.
- 제목은 **한국어**로, 짧은 행동 문장으로 씁니다.
- 난이도는 정확히 셋 중 하나입니다: easy / normal / hard.
$_schemaInstruction''';
}

/// 출력 형식 지시. responseSchema로도 강제하지만, 모델이 스키마를 무시할 때를
/// 대비해 프롬프트에도 같은 계약을 명시해 이중으로 방어한다.
const String _schemaInstruction = '''

[출력 형식]
- 오직 JSON 배열만 출력합니다. 설명·인사·코드펜스 없이.
- 각 원소는 {"title": string, "difficulty": "easy"|"normal"|"hard"} 형태입니다.''';

/// 목표 문자열을 JSON 리터럴로 이스케이프해 안전하게 삽입한다.
///
/// [jsonEncode]가 따옴표·역슬래시·개행·제어문자를 전부 이스케이프하므로, 목표에
/// 무엇이 들어오든 지시문을 깨거나 새 지시로 위장할 수 없다.
String _safeGoal(String goal) => jsonEncode(goal);
