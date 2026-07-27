export function canChangeTargetPeople(groupBuy, nextTargetPeople) {
  if (nextTargetPeople === undefined) return true;
  return groupBuy.status === "open" && groupBuy.currentPeople <= 1;
}
