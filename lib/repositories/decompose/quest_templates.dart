import '../../models/difficulty.dart';
import '../../models/quest_draft.dart';

/// **대표 도전 유형 템플릿.**
///
/// 두 곳에서 쓴다:
/// - 데모 모드: [FakeQuestDecomposer]가 이 결과를 그대로 화면에 띄운다.
/// - 폴백: 실제 AI 호출이 실패하면 상위(다음 커밋)가 이 템플릿으로 대체한다.
///
/// 그래서 실제 사람이 봐도 자연스러운 한글 퀘스트여야 한다.
/// 난이도 배분 원칙: 초반 조사·확인 = easy, 실제 산출물 작성 = normal/hard.
/// prototype의 `decompose(goal)` 키워드 스텁을 참고하되 출력 타입은 [QuestDraft].

/// 목표 텍스트에 가장 맞는 유형을 골라 마이크로 퀘스트 초안을 돌려준다.
///
/// 키워드가 매칭되지 않으면 어떤 목표에도 무난한 [_generic] 세트를 반환한다.
/// (빈 리스트를 돌려주지 않는다 — 폴백은 언제나 최소 한 세트를 보장해야 한다.)
List<QuestDraft> templateFor(String goal) {
  final g = goal.trim().toLowerCase();

  bool hasAny(List<String> keywords) => keywords.any(g.contains);

  final List<_TemplateItem> chosen;
  if (hasAny(_contestKeywords)) {
    chosen = _contest;
  } else if (hasAny(_certKeywords)) {
    chosen = _cert;
  } else if (hasAny(_activityKeywords)) {
    chosen = _activity;
  } else if (hasAny(_portfolioKeywords)) {
    chosen = _portfolio;
  } else {
    chosen = _generic;
  }

  return _toDrafts(chosen);
}

/// **개별 항목 재분해용 "더 작게" 세트.**
///
/// 초안 항목 하나를 더 잘게 쪼갠 2~3개 하위 스텝으로 바꾼다. 시작의 심리적 부담을
/// 낮추는 게 목적이라, 앞쪽은 부담 없는 easy(준비·5분 시작), 마무리만 normal이다.
///
/// **정직한 한계**: 실제 LLM은 [itemTitle]을 읽고 그 항목에 꼭 맞는 하위 스텝을
/// 낸다. 데모 Fake는 그럴 수 없으므로 어떤 항목에도 무난한 **범용 "더 작게" 세트**를
/// 낸다(항목 제목은 첫 스텝에만 녹여 최소한의 맥락을 남긴다). localId/order는
/// Notifier가 splice하며 재부여하므로 여기선 임시값이다([_toDrafts]가 `tpl-*` 부여).
List<QuestDraft> subTemplateFor(String itemTitle) {
  final title = itemTitle.trim();
  return _toDrafts(<_TemplateItem>[
    _TemplateItem(
      title.isEmpty ? '시작 전 딱 필요한 것만 준비하기' : '「$title」 시작 전 딱 필요한 것만 준비하기',
      Difficulty.easy,
    ),
    const _TemplateItem('가장 작은 첫 단계 5분만 해보기', Difficulty.easy),
    const _TemplateItem('이어서 마무리하고 점검하기', Difficulty.normal),
  ]);
}

/// 유형 하나를 순서대로 `tpl-0`, `tpl-1`... 로 매긴 초안 리스트로 바꾼다.
List<QuestDraft> _toDrafts(List<_TemplateItem> items) {
  return [
    for (var i = 0; i < items.length; i++)
      QuestDraft(
        localId: 'tpl-$i',
        title: items[i].title,
        difficulty: items[i].difficulty,
        order: i,
      ),
  ];
}

/// 템플릿 한 항목 (제목 + 난이도).
class _TemplateItem {
  const _TemplateItem(this.title, this.difficulty);
  final String title;
  final Difficulty difficulty;
}

// ===== 키워드 =====

const _contestKeywords = ['공모전', '대회', '공고', '지원', '취업', '해커톤', '경진'];
const _certKeywords = ['자격증', '시험', '공부', '토익', '기사', '자격', '학습'];
const _activityKeywords = ['대외활동', '인턴', '동아리', '봉사', '서포터즈', '활동'];
const _portfolioKeywords = ['포트폴리오', '이력서', '자소서', '자기소개서', '프로젝트'];

// ===== 유형별 템플릿 =====

/// ① 공모전·대회 지원.
/// #4 최대 5개(`kMaxDecomposeDrafts`). 초반 easy 스텝을 하나로 합쳐 줄이되
/// easy→normal→hard 진행과 마지막 hard(제출)는 보존한다.
const _contest = <_TemplateItem>[
  _TemplateItem('공고 페이지 열어 지원 자격 확인하기', Difficulty.easy),
  _TemplateItem('마감일과 제출물 목록 메모하기', Difficulty.easy),
  _TemplateItem('핵심 아이디어 세 줄로 정리하기', Difficulty.normal),
  _TemplateItem('지원서 초안 한 단락 작성하기', Difficulty.normal),
  _TemplateItem('최종 검토 후 제출 완료하기', Difficulty.hard),
];

/// ② 자격증·시험 공부.
/// #4 최대 5개. 초반 조사 스텝을 하나 줄이고 노트→기출→복습 흐름은 유지한다.
const _cert = <_TemplateItem>[
  _TemplateItem('시험 일정과 응시 자격 확인하기', Difficulty.easy),
  _TemplateItem('전체 시험 범위와 과목 훑어보기', Difficulty.easy),
  _TemplateItem('첫 단원 정리 노트 만들기', Difficulty.normal),
  _TemplateItem('기출문제 한 회분 풀어 보기', Difficulty.normal),
  _TemplateItem('약한 단원 다시 복습하고 오답 정리하기', Difficulty.hard),
];

/// ③ 대외활동·인턴 지원.
/// #4 최대 5개. 초반 탐색 스텝을 하나 줄이고 지원 동기→자소서→제출 흐름은 유지한다.
const _activity = <_TemplateItem>[
  _TemplateItem('관심 있는 활동 세 개 찾아 저장하기', Difficulty.easy),
  _TemplateItem('모집 조건과 우대 사항 비교하기', Difficulty.easy),
  _TemplateItem('지원 동기 세 문장 초안 쓰기', Difficulty.normal),
  _TemplateItem('자기소개서 문항 하나 작성하기', Difficulty.normal),
  _TemplateItem('지원서 검토 후 제출하기', Difficulty.hard),
];

/// ④ 포트폴리오·이력서 준비.
const _portfolio = <_TemplateItem>[
  _TemplateItem('넣을 작업물 목록 훑어보기', Difficulty.easy),
  _TemplateItem('참고할 포트폴리오 두 개 살펴보기', Difficulty.easy),
  _TemplateItem('대표 작업 하나 골라 소개 문구 쓰기', Difficulty.normal),
  _TemplateItem('전체 구성과 순서 잡기', Difficulty.normal),
  _TemplateItem('한 페이지로 초안 완성하기', Difficulty.hard),
];

/// ⑤ 범용 — 어떤 목표에도 무난한 "시작하기" 세트.
const _generic = <_TemplateItem>[
  _TemplateItem('목표와 관련된 정보 검색해 보기', Difficulty.easy),
  _TemplateItem('오늘 할 수 있는 첫 단계 정하기', Difficulty.easy),
  _TemplateItem('핵심 내용 세 줄로 메모하기', Difficulty.normal),
  _TemplateItem('작게 초안 또는 1차 시도하기', Difficulty.normal),
  _TemplateItem('결과 점검하고 다음 할 일 정하기', Difficulty.hard),
];
