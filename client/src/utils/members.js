export function memberName(members, memberId) {
  const member = members.filter((m) => m.id === memberId)[0];
  return member ? member.name : '담당자 없음';
}
