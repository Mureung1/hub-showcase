// 태그와 가중치는 DB가 아니라 코드에 둔다(설계 3.4). 비공개가 목적인데 DB에 있으면
// 노출 경로가 하나 더 생기고, 코드에 있으면 git으로 변경 이력이 남는다.
// 모임장→참여자와 참여자→모임장이 같은 목록을 쓴다(2026-07-28 결정 Δ4).
const POSITIVE_TAGS = ['punctual', 'friendly', 'good_talk', 'again'];
const NEGATIVE_TAGS = ['late', 'rude', 'different'];

const TAG_LABELS = {
  punctual: '시간 약속을 잘 지켜요',
  friendly: '분위기를 좋게 만들어요',
  good_talk: '대화가 즐거웠어요',
  again: '또 만나고 싶어요',
  late: '시간 약속을 안 지켰어요',
  rude: '예의가 부족했어요',
  different: '공지와 달랐어요',
};

// 긍정·부정 각각 최대 3개까지만 점수에 반영한다(설계 5.2).
const MAX_TAGS_PER_SIGN = 3;

function isKnownTag(code) {
  return POSITIVE_TAGS.includes(code) || NEGATIVE_TAGS.includes(code);
}

module.exports = { POSITIVE_TAGS, NEGATIVE_TAGS, TAG_LABELS, MAX_TAGS_PER_SIGN, isKnownTag };
