export function presentGroupBuy(item, viewerId) {
  const voterChoices = item.voterChoices ?? {};
  const isOwner = item.ownerId === viewerId;
  const userJoined = item.participants.some(
    (participant) => participant.userId === viewerId,
  );
  const canSeeParticipantDetails = isOwner || userJoined;
  const participants = canSeeParticipantDetails
    ? item.participants.map((participant) => ({
        nickname: participant.nickname,
        quantity: participant.quantity,
        startLocation: participant.startLocation,
      }))
    : [];
  const publicItem = { ...item };
  delete publicItem.ownerId;
  delete publicItem.voterChoices;

  return {
    ...publicItem,
    participants,
    isOwner,
    userJoined,
    userVote: voterChoices[viewerId] || null,
  };
}
