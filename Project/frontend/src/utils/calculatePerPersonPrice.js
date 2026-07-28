export function calculatePerPersonPrice(totalPrice, targetParticipants) {
  if (!Number.isFinite(totalPrice) || !Number.isFinite(targetParticipants) || totalPrice < 0 || targetParticipants <= 0) {
    return 0;
  }

  return Math.round(totalPrice / targetParticipants);
}
