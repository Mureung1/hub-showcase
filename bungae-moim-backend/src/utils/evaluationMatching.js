// 진술 대조(설계 6장, D14). 노쇼 판정은 일방적이다 — 모임장이 "안 왔어요"를 누르면
// 참여자는 반박할 수단이 없다. 그래서 양쪽 진술을 대조한 뒤에 점수를 매긴다.
//
// 표 9줄을 압축하면:
//   양쪽 다 제출 → 둘 다 attended === true 일 때만 유효 (엇갈리면 양쪽 0, 상호 지목도 양쪽 0)
//   한쪽만 제출 → 그 한쪽이 그대로 유효 (반박이 없으니 노쇼 −5도 그대로 적용된다)
//   둘 다 미제출 → 아무 것도 없다
//
// "안 왔음 + 미제출 → −5"는 미평가를 벌하는 것이 아니다(D7). 평가하지 않은 사실 자체에는
// 점수가 붙지 않고, 다만 반박이 없어 상대의 평가가 그대로 적용될 뿐이다.
function resolveEvaluations(pairs) {
  const validForRatee = [];
  const invalid = [];

  for (const { hostSide, participantSide } of pairs) {
    const submitted = [hostSide, participantSide].filter(Boolean);
    if (submitted.length === 0) continue;

    if (submitted.length === 1) {
      validForRatee.push(submitted[0]);
      continue;
    }

    const bothAttended = hostSide.attended === true && participantSide.attended === true;
    if (bothAttended) {
      validForRatee.push(hostSide, participantSide);
    } else {
      // 누가 맞는지 알 수 없을 때는 벌하지 않는다. 상호 지목을 양쪽 −5로 처리하면
      // 모임장이 안 나타나서 지목당한 뒤 맞지목한 경우에 피해자를 벌하게 된다.
      invalid.push(hostSide, participantSide);
    }
  }

  return { validForRatee, invalid };
}

module.exports = { resolveEvaluations };
