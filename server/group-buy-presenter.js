export function presentGroupBuy(item, viewerId) {
  const voterChoices = item.voterChoices ?? {};
  const isOwner = item.ownerId === viewerId;
  const viewerParticipation = item.participants.find(
    (participant) => participant.userId === viewerId,
  );
  const userJoined = Boolean(viewerParticipation);
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
    userQuantity: viewerParticipation?.quantity ?? null,
    userVote: voterChoices[viewerId] || null,
  };
}
