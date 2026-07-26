import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/decompose_limits.dart';
import 'package:one_step/core/constants/reward_rules.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/models/quest_draft.dart';

/// # AI 분해 결과 품질 계약 테스트 (checklist 4주차 「AI 분해 결과 품질 테스트」)
///
/// **실제 Gemini는 호출하지 않는다.** 비결정적이고, API 키·비용·네트워크에 묶여
/// 있어 자동 테스트로 넣을 수 없다. 대신 "AI 분해 품질"을 모델의 착함이 아니라
/// **코드가 보장하는 계약**으로 증명한다:
///
/// > AI가 무엇을 뱉든, 화면에 올라오는 초안은 반드시
/// > (1) 제목이 있고 (2) 난이도가 3종 중 하나이며 (3) order에 구멍이 없다.
/// > 그 조건을 못 채운 항목은 **조용히 보정되지 않고 버려진다.**
///
/// 그래서 여기 fixture는 "Gemini가 이렇게 응답했다고 치자"는 **응답 표본**이고,
/// 검증 대상은 [QuestDraft.parseStrict] / [QuestDraft.parseList]다.
/// 실제 HTTP·코드펜스·에러 매핑은 `test/repositories/remote_quest_decomposer_test.dart`,
/// 개수 캡(5개)과 폴백 전환은 `test/features/decompose_notifier_test.dart`가 덮는다.
void main() {
  // ─────────────────────────────────────────────────────────────
  // 항목 1
  // checklist: "대표 목표 입력 세트에 대해 실행 가능한 마이크로 퀘스트가
  //             생성되는지 표본 검증한다."
  // ─────────────────────────────────────────────────────────────
  //
  // **「실행 가능한 마이크로 퀘스트」의 조작적 정의**
  //   parseStrict를 통과한 draft = 실행 가능한 마이크로 퀘스트.
  //   즉 ① 공백이 아닌 제목이 있고 ② 난이도가 easy/normal/hard 중 하나여서
  //   보상 등급이 확정되는 항목. 이 둘이 갖춰지면 사용자는 "무엇을 하는지"와
  //   "얼마를 받는지"를 알 수 있고, 그대로 등록해 오늘 실행할 수 있다.
  //   자연어 품질(문장이 실제로 실행 가능한지)은 코드가 판정할 수 없으므로
  //   대표 표본을 사람이 읽을 수 있게 fixture로 고정해 두고, 코드는
  //   **표본이 위 정의를 100% 만족하는지**를 회귀 방지 차원에서 잠근다.
  group('항목 1 — 대표 목표 세트: 실행 가능한 마이크로 퀘스트 생성(표본)', () {
    for (final fixture in _representativeFixtures) {
      test('${fixture.goal} → 실행 가능한 초안 ${fixture.expectedCount}개', () {
        final drafts = QuestDraft.parseList(jsonDecode(fixture.responseJson));

        // 비지 않는다 = 폴백 없이 이 응답만으로 화면을 채울 수 있다.
        expect(drafts, isNotEmpty, reason: '${fixture.goal}: 표본이 전부 걸러지면 안 된다');
        // 자명 통과 방지: "안 죽는다"가 아니라 **정확히 몇 개**인지 못 박는다.
        expect(drafts, hasLength(fixture.expectedCount));
        // #4 정책상 최초 분해는 최대 5개. 프롬프트가 이 상수를 인용하므로
        // 정상 응답 표본도 이 상한을 넘지 않아야 한다.
        expect(drafts.length, lessThanOrEqualTo(kMaxDecomposeDrafts));

        for (final d in drafts) {
          expect(d.title.trim(), isNotEmpty, reason: '제목 없는 초안은 실행 불가');
        }
        // (여기 있던 `Difficulty.values contains d.difficulty`는 삭제했다 —
        //  difficulty가 enum 타입이라 타입상 항상 참이라 아무것도 지키지 못한다.
        //  난이도 유효성 계약은 항목 2의 parseStrict 거부 테스트가 지킨다.)
        // 대신 실패할 수 있는 것을 본다: 한 목표 안에서 난이도가 한 종류로
        // 뭉치지 않는다(= 난이도 분류가 실제로 구배를 만든다).
        expect(
          drafts.map((d) => d.difficulty).toSet().length,
          greaterThanOrEqualTo(2),
          reason: '${fixture.goal}: 전부 같은 난이도면 난이도 분류가 의미를 잃는다',
        );

        // order 0..n-1 연속(구멍 없음). 순서가 곧 실행 경로라
        // 0,2,4처럼 구멍이 나면 "다음에 뭘 하지"가 깨진다.
        expect(
          drafts.map((d) => d.order).toList(),
          List<int>.generate(fixture.expectedCount, (i) => i),
        );
        // parseList의 localId 계약(살아남은 순번 기준 재발급)도 함께 고정한다.
        expect(
          drafts.map((d) => d.localId).toList(),
          List<String>.generate(fixture.expectedCount, (i) => 'draft-$i'),
        );
      });
    }

    test('표본 전체 합계가 정확히 $_totalExpectedDrafts개 살아남는다', () {
      // 유형별 테스트가 각각 통과해도, 표본 세트가 통째로 줄어드는(예: fixture
      // 하나가 조용히 빈 배열이 되는) 변화를 잡기 위해 합계도 값으로 센다.
      final total = _representativeFixtures
          .map((f) => QuestDraft.parseList(jsonDecode(f.responseJson)).length)
          .fold<int>(0, (a, b) => a + b);

      expect(_representativeFixtures, hasLength(6), reason: '대표 목표 유형 6종');
      expect(total, _totalExpectedDrafts);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 항목 2
  // checklist: "난이도 분류가 상식적으로 타당한지 검토 기준이 있다."
  // ─────────────────────────────────────────────────────────────
  //
  // **「타당한 난이도 분류」의 조작적 정의**
  //   ① 유효 집합: 난이도는 {easy, normal, hard} 밖으로 나갈 수 없다.
  //   ② 조용한 통과 금지: 집합 밖 값은 fallback(normal)으로 보정되지 않고
  //      **항목째 거부**된다. 난이도 = 보상 등급(코인 3/5/10)이라, "매우어려움"
  //      (hard 의도, 코인 10)을 조용히 normal(코인 5)로 떨어뜨리면 사용자가
  //      받아야 할 보상이 절반으로 왜곡된다.
  //   ③ 완전성: 3종 모두 보상표에 매핑돼 있어 어떤 난이도가 나와도 지급액이
  //      확정된다.
  //   ④ 표본 검토 잣대: 대표 응답은 3종을 고루 쓰고, 첫 걸음은 부담이 가장
  //      낮은 easy다(프롬프트 규칙과 같은 잣대 — 사람이 결과를 볼 때 쓰는
  //      기준을 코드로 적어 둔 것).
  group('항목 2 — 난이도 분류 타당성 검토 기준', () {
    test('난이도 종류는 정확히 3종이다', () {
      expect(Difficulty.values, hasLength(3));
      expect(Difficulty.values, [
        Difficulty.easy,
        Difficulty.normal,
        Difficulty.hard,
      ]);
    });

    test('대표 표본의 모든 draft 난이도가 3종 안에 있다', () {
      final all = _representativeFixtures
          .expand((f) => QuestDraft.parseList(jsonDecode(f.responseJson)))
          .toList();

      expect(all, hasLength(_totalExpectedDrafts));
      expect(
        all.map((d) => d.difficulty).toSet(),
        // 3종을 모두 덮는 표본이어야 검토 기준이 의미가 있다.
        {Difficulty.easy, Difficulty.normal, Difficulty.hard},
      );
      // (여기 있던 `every(Difficulty.values.contains)`는 삭제했다 — enum 타입이라
      //  항상 참이고, 바로 위 집합 동등 단언이 이미 같은 것을 더 강하게 본다.)
    });

    test('대표 표본의 첫 스텝은 항상 easy다 (부담 없는 첫걸음 잣대)', () {
      for (final fixture in _representativeFixtures) {
        final drafts = QuestDraft.parseList(jsonDecode(fixture.responseJson));
        expect(
          drafts.first.difficulty,
          Difficulty.easy,
          reason: '${fixture.goal}: 첫 칸이 무거우면 "시작 부담 완화"라는 목적이 깨진다',
        );
      }
    });

    test('★ 이상값 난이도는 조용히 통과하지 않고 거부된다', () {
      // 이 테스트가 이 group의 존재 이유다.
      // fromNameOrDefault(관대 파싱)를 AI 응답에 쓰면 아래 값들이 전부
      // normal로 둔갑한다 — 그러면 보상이 왜곡된 채 사용자에게 나간다.
      for (final polluted in _pollutedDifficulties) {
        final draft = QuestDraft.parseStrict(
          {'title': '기출문제 한 회분 풀기', 'difficulty': polluted},
          localId: 'd0',
          order: 0,
        );

        expect(
          draft,
          isNull,
          reason: '난이도 "$polluted"는 거부되어야 한다(normal 폴백 금지)',
        );

        // 관대 파싱이었다면 어디로 떨어졌을지를 함께 못 박는다.
        // 두 정책이 실제로 갈라진다는 증거 — 엄격 파서를 관대 파서로
        // 바꾸는 순간 위 expect가 깨진다.
        if (polluted is String) {
          expect(Difficulty.fromNameOrDefault(polluted), Difficulty.normal);
          expect(Difficulty.fromName(polluted), isNull);
        }
      }
    });

    test('한글 난이도 라벨은 표시용일 뿐, 응답 값으로는 거부된다', () {
      // Difficulty.label('쉬움'/'보통'/'어려움')은 화면 표시용이고
      // 직렬화 어휘가 아니다. AI가 라벨을 뱉으면 거부돼야 한다.
      for (final d in Difficulty.values) {
        expect(
          QuestDraft.parseStrict(
            {'title': 'x', 'difficulty': d.label},
            localId: 'd0',
            order: 0,
          ),
          isNull,
          reason: '한글 라벨 "${d.label}"이 통과하면 어휘가 두 벌이 된다',
        );
      }
    });

    test('3종 난이도 모두 보상(코인·XP)이 정의돼 있다', () {
      for (final d in Difficulty.values) {
        expect(kBaseRewards.containsKey(d), isTrue, reason: '${d.name} 보상 누락');
        final reward = kBaseRewards[d]!;
        expect(reward.coin, greaterThan(0));
        expect(reward.xp, greaterThan(0));
        // 함수 경로(rewardFor)와 맵이 같은 값을 준다.
        expect(rewardFor(d), reward);
      }

      // 정본(docs/plan.md) 수치를 값으로 고정: 3/5 · 5/10 · 10/20.
      expect(rewardFor(Difficulty.easy), const Reward(coin: 3, xp: 5));
      expect(rewardFor(Difficulty.normal), const Reward(coin: 5, xp: 10));
      expect(rewardFor(Difficulty.hard), const Reward(coin: 10, xp: 20));
      // 난이도가 오를수록 보상도 커진다(등급 역전 방지).
      expect(rewardFor(Difficulty.easy).coin, lessThan(rewardFor(Difficulty.normal).coin));
      expect(rewardFor(Difficulty.normal).coin, lessThan(rewardFor(Difficulty.hard).coin));
    });

    test('파싱된 draft의 보상은 난이도 등급을 그대로 따른다', () {
      final drafts = QuestDraft.parseList(jsonDecode(_rewardProbeJson));

      expect(drafts, hasLength(3));
      expect(drafts.map((d) => d.difficulty).toList(), [
        Difficulty.easy,
        Difficulty.normal,
        Difficulty.hard,
      ]);
      expect(drafts.map((d) => d.reward.coin).toList(), [3, 5, 10]);
      expect(drafts.map((d) => d.reward.xp).toList(), [5, 10, 20]);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 항목 3
  // checklist: "유효하지 않은 결과 비율이 허용 임계 이하이다."
  // ─────────────────────────────────────────────────────────────
  //
  // **임계(테스트 로컬 상수)**
  //   - 정상 항목 보존율 == 1.0  (하나도 잃지 않는다)
  //   - 결과에 남은 불량 항목 == 0개 (허용 잔존 0)
  //   "비율"을 느슨한 상한(예: 10%)으로 두지 않는 이유: 불량이 하나라도
  //   살아남으면 그건 제목 없는 카드이거나 보상이 왜곡된 카드다. 화면·보상에
  //   그대로 직결되므로 허용 임계는 0이다.
  group('항목 3 — 유효하지 않은 결과 비율이 허용 임계 이하', () {
    test('오염 섞인 응답: 정상 ${_dirtyValidTitles.length}개 전량 보존, 불량 $_dirtyInvalidCount개 전량 제거', () {
      final response = jsonDecode(_dirtyResponseJson) as List<Object?>;
      final drafts = QuestDraft.parseList(response);

      // ① 살아남은 개수를 값으로 센다(자명 통과 방지).
      expect(drafts, hasLength(_dirtyValidTitles.length));
      expect(drafts.map((d) => d.title).toList(), _dirtyValidTitles);

      // ①-b 제거된 개수 == _dirtyInvalidCount.
      //     이 상수를 테스트 이름에만 쓰면 fixture에 불량을 더하거나 빼도
      //     이름만 낡고 아무 테스트도 실패하지 않는다. 여기서 단언으로 묶어
      //     fixture와 상수가 같이 움직이도록 강제한다.
      expect(
        response.length - drafts.length,
        _dirtyInvalidCount,
        reason: 'fixture의 불량 개수와 _dirtyInvalidCount가 어긋났다',
      );
      expect(response, hasLength(_dirtyValidTitles.length + _dirtyInvalidCount));

      // ② 정상 보존율 == 임계(1.0)
      final retention = drafts.length / _dirtyValidTitles.length;
      expect(
        retention,
        _kRequiredValidRetention,
        reason: '정상 항목은 오염 항목 옆에 있다는 이유로 버려지면 안 된다',
      );

      // ③ 불량 잔존 == 임계(0). 불량 fixture에는 전부 [BAD] 표식을 박아 뒀다.
      final survivedInvalid =
          drafts.where((d) => d.title.contains(_badMarker)).length;
      expect(
        survivedInvalid,
        _kMaxInvalidSurvivors,
        reason: '불량 항목이 하나라도 남으면 제목 없는 카드나 왜곡된 보상이 화면에 나간다',
      );

      // ④ 유효하지 않은 결과 "비율" 자체도 0.0
      expect(survivedInvalid / drafts.length, 0.0);

      // ⑤ 살아남은 것들은 전부 실행 가능 정의를 만족하고 order에 구멍이 없다.
      //    (난이도 유효성 단언은 삭제했다 — enum 타입이라 항상 참이다.
      //     "이상 난이도가 살아남지 않는다"는 아래 '불량 유형별' 테스트와
      //     항목 2의 parseStrict 거부 테스트가 실제로 지킨다.)
      expect(drafts.every((d) => d.title.trim().isNotEmpty), isTrue);
      expect(
        drafts.map((d) => d.order).toList(),
        List<int>.generate(_dirtyValidTitles.length, (i) => i),
      );
    });

    test('불량 유형별로 하나도 새어 나오지 않는다', () {
      // 유형을 한 덩어리로 섞어 세면 "어떤 유형이 새는지"를 못 잡는다.
      // 유형마다 정상 1 + 불량 1로 두고, 결과가 항상 정확히 1개인지 본다.
      for (final entry in _invalidByKind.entries) {
        final drafts = QuestDraft.parseList([
          {'title': '지원 자격 확인하기', 'difficulty': 'easy'},
          entry.value,
        ]);

        expect(
          drafts,
          hasLength(1),
          reason: '불량 유형 "${entry.key}"이(가) 걸러지지 않았다',
        );
        expect(drafts.single.title, '지원 자격 확인하기');
        expect(drafts.single.order, 0);
      }
    });

    test('전부 불량이면 결과 0개 — 상위 폴백 신호', () {
      // 빈 결과는 "성공했는데 0개"가 아니라 **폴백이 필요하다는 신호**다.
      // RemoteQuestDecomposer는 이 빈 결과를 ParseFailure로 승격하고,
      // DecomposeNotifier가 템플릿 폴백으로 전환한다(그 경로는
      // remote_quest_decomposer_test / decompose_notifier_test가 이미 커버).
      // 여기서는 "전부 불량이면 0개가 나온다"까지만 책임진다.
      final drafts = QuestDraft.parseList(jsonDecode(_allInvalidResponseJson));

      expect(drafts, isEmpty);
      expect(drafts, hasLength(0));
    });

    test('응답이 배열조차 아니면 결과 0개 (역시 폴백 신호)', () {
      expect(QuestDraft.parseList(jsonDecode('{"quests": []}')), isEmpty);
      expect(QuestDraft.parseList(jsonDecode('"그냥 문장"')), isEmpty);
      expect(QuestDraft.parseList(null), isEmpty);
    });
  });
}

// ─────────────────────────────────────────────────────────────
// 임계 상수 (테스트 로컬 — lib 정책이 아니라 이 품질 테스트의 합격선이다)
// ─────────────────────────────────────────────────────────────

/// 정상 항목 보존율 합격선. 1.0 = 하나도 잃지 않는다.
const double _kRequiredValidRetention = 1.0;

/// 결과에 남아도 되는 불량 항목 수. 0 = 단 하나도 허용하지 않는다.
const int _kMaxInvalidSurvivors = 0;

/// 불량 fixture에 박아 두는 표식. 결과에서 이 문자열이 보이면 곧 누수다.
const String _badMarker = '[BAD]';

// ─────────────────────────────────────────────────────────────
// fixture — "Gemini가 이렇게 응답했다고 치자"
// 실제 응답 형태를 그대로 흉내 내기 위해 JSON 문자열로 두고 jsonDecode한다
// (RemoteQuestDecomposer가 parseList에 넘기는 것과 같은 타입이 나온다).
// ─────────────────────────────────────────────────────────────

typedef _GoalFixture = ({String goal, String responseJson, int expectedCount});

/// **출처: 사람이 작성한 대표 응답 형태다. 실제 Gemini 출력을 옮긴 것이 아니다.**
/// (목표 6종은 `docs/plan.md`의 타깃 사용자 시나리오에서 골랐고, 응답 JSON은
///  프롬프트가 요구하는 스키마에 맞춰 손으로 썼다. 따라서 이 테스트가 증명하는 것은
///  "모델이 이런 품질을 낸다"가 아니라 **"이런 형태가 들어오면 코드가 무엇을
///  통과시키고 무엇을 버리는가"**다. 실제 모델 출력 품질은 수동 검증 몫이다.)
const List<_GoalFixture> _representativeFixtures = [
  (
    goal: '교내 아이디어 공모전 지원하기',
    expectedCount: 5,
    responseJson: '''
[
  {"title": "공모전 공고 페이지 열어 지원 자격 확인하기", "difficulty": "easy"},
  {"title": "제출 마감일 달력에 적어 두기", "difficulty": "easy"},
  {"title": "아이디어 후보 3개 메모장에 적기", "difficulty": "normal"},
  {"title": "지원서 문제정의 한 단락 초안 쓰기", "difficulty": "hard"},
  {"title": "친구에게 초안 보여주고 의견 받기", "difficulty": "normal"}
]
''',
  ),
  (
    goal: '정보처리기사 필기 준비하기',
    expectedCount: 4,
    responseJson: '''
[
  {"title": "시험 일정과 접수 기간 확인하기", "difficulty": "easy"},
  {"title": "과목별 출제 비중 표로 정리하기", "difficulty": "normal"},
  {"title": "1과목 개념 1챕터 읽기", "difficulty": "normal"},
  {"title": "기출문제 한 회분 풀고 채점하기", "difficulty": "hard"}
]
''',
  ),
  (
    goal: '주 3회 운동 시작하기',
    expectedCount: 3,
    responseJson: '''
[
  {"title": "운동복과 신발 현관에 꺼내 두기", "difficulty": "easy"},
  {"title": "집 근처 20분 걷기 코스 정하기", "difficulty": "easy"},
  {"title": "오늘 20분 걷고 기록 남기기", "difficulty": "normal"}
]
''',
  ),
  (
    goal: '아침 7시 기상 습관 만들기',
    expectedCount: 5,
    responseJson: '''
[
  {"title": "알람을 침대에서 먼 곳에 두기", "difficulty": "easy"},
  {"title": "취침 시간 30분 앞당겨 알람 맞추기", "difficulty": "easy"},
  {"title": "자기 전 휴대폰 충전기 책상에 두기", "difficulty": "normal"},
  {"title": "일어나서 바로 물 한 잔 마시기", "difficulty": "easy"},
  {"title": "일주일 기상 시간 기록표 만들기", "difficulty": "normal"}
]
''',
  ),
  (
    goal: '전공 시험 대비 공부하기',
    expectedCount: 4,
    responseJson: '''
[
  {"title": "시험 범위 강의자료 목록 뽑기", "difficulty": "easy"},
  {"title": "3주차 강의 노트 다시 읽기", "difficulty": "normal"},
  {"title": "헷갈리는 개념 5개 정리 카드 만들기", "difficulty": "normal"},
  {"title": "연습문제 10문항 풀고 오답 표시하기", "difficulty": "hard"}
]
''',
  ),
  (
    goal: '대외활동 서포터즈 지원하기',
    expectedCount: 3,
    responseJson: '''
[
  {"title": "모집 공고 스크랩하고 자격 확인하기", "difficulty": "easy"},
  {"title": "지원 동기 세 줄로 적어 보기", "difficulty": "normal"},
  {"title": "자기소개서 1번 문항 초안 완성하기", "difficulty": "hard"}
]
''',
  ),
];

/// 대표 표본에서 나와야 하는 초안 총합(5+4+3+5+4+3).
const int _totalExpectedDrafts = 24;

/// 난이도 3종이 보상 등급으로 그대로 이어지는지 보는 최소 표본.
const String _rewardProbeJson = '''
[
  {"title": "공고 확인하기", "difficulty": "easy"},
  {"title": "초안 한 단락 쓰기", "difficulty": "normal"},
  {"title": "제출본 완성하기", "difficulty": "hard"}
]
''';

/// AI가 뱉을 법한 **유효 집합 밖 난이도**들. 전부 거부돼야 한다.
/// (`3`처럼 String이 아닌 값도 섞어 타입 오염까지 함께 본다.)
const List<Object?> _pollutedDifficulties = [
  '매우어려움',
  '삽질',
  'very hard',
  'EXTREME',
  'medium',
  'ez',
  '',
  '   ',
  3,
  true,
  null,
];

// ── 항목 3: 정상 4개 + 불량 6개가 섞인 오염 응답 ────────────────
//
// 불량 6종: 제목 키 누락 · 제목 공백뿐 · 제목 타입 오류(숫자) ·
//          난이도 이상값 · 난이도 타입 오류(숫자) · 원소가 Map이 아님(문자열)
const String _dirtyResponseJson = '''
[
  {"title": "공고 페이지 열어 지원 자격 확인하기", "difficulty": "easy"},
  {"difficulty": "normal"},
  {"title": "제출 마감일 달력에 적어 두기", "difficulty": "easy"},
  {"title": "   ", "difficulty": "hard"},
  {"title": 42, "difficulty": "normal"},
  {"title": "[BAD] 지원서 전체 완성하기", "difficulty": "매우어려움"},
  {"title": "아이디어 후보 3개 메모하기", "difficulty": "normal"},
  {"title": "[BAD] 최종 제출 버튼 누르기", "difficulty": 3},
  "[BAD] 이건 객체가 아니라 문자열입니다",
  {"title": "지원서 초안 한 단락 쓰기", "difficulty": "hard"}
]
''';

/// 위 응답에서 **살아남아야 하는** 정상 항목(순서까지 고정).
const List<String> _dirtyValidTitles = [
  '공고 페이지 열어 지원 자격 확인하기',
  '제출 마감일 달력에 적어 두기',
  '아이디어 후보 3개 메모하기',
  '지원서 초안 한 단락 쓰기',
];

/// 위 응답에 섞인 불량 항목 수(10 - 정상 4).
const int _dirtyInvalidCount = 6;

/// 불량 유형별 단건 표본. 유형마다 따로 세어 "어디가 새는지"를 특정한다.
const Map<String, Object?> _invalidByKind = {
  '제목 키 누락': {'difficulty': 'easy'},
  '제목이 공백뿐': {'title': '  ', 'difficulty': 'easy'},
  '제목 타입 오류': {'title': 7, 'difficulty': 'easy'},
  '난이도 키 누락': {'title': '[BAD] 난이도 없음'},
  '난이도 이상값': {'title': '[BAD] 매우어려움', 'difficulty': '매우어려움'},
  '난이도 타입 오류': {'title': '[BAD] 숫자 난이도', 'difficulty': 2},
  '난이도 빈 문자열': {'title': '[BAD] 빈 난이도', 'difficulty': ''},
  '원소가 Map이 아님': '[BAD] 문자열 원소',
  '원소가 null': null,
};

/// 전부 불량 → 빈 결과(상위 폴백 신호).
const String _allInvalidResponseJson = '''
[
  {"difficulty": "easy"},
  {"title": "[BAD] 이상한 난이도", "difficulty": "매우어려움"},
  {"title": "", "difficulty": "normal"},
  "[BAD] 문자열 원소",
  null
]
''';
