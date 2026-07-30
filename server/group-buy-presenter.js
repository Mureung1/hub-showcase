export function presentGroupBuy(item, viewerId) {
  const voterChoices = item.voterChoices ?? {};
  const isOwner = item.ownerId === viewerId;
  const viewerParticipation = item.participants.find(
    (participant) => participant.userId === viewerId,
  );
  const userJoined = Boolean(viewerParticipation);
  const canSeeParticipantDetails = isOwner || userJoined;
  const pickupCandidateDetails = (item.pickupCandidateDetails ?? []).map((candidate) => ({
    name: candidate.name,
    latitude: Number.isFinite(candidate.latitude) ? Number(candidate.latitude.toFixed(3)) : null,
    longitude: Number.isFinite(candidate.longitude) ? Number(candidate.longitude.toFixed(3)) : null,
  }));
  const participants = canSeeParticipantDetails
    ? item.participants.map((participant) => ({
        nickname: participant.nickname,
        quantity: participant.quantity,
        startLocation: participant.startLocation,
      }))
    : [];
  const publicItem = { ...item };
  delete publicItem.ownerId;
  delete publicItem.pickupLatitude;
  delete publicItem.pickupLongitude;
  delete publicItem.voterChoices;

  return {
    ...publicItem,
    finalPickup: canSeeParticipantDetails ? item.finalPickup : null,
    participants,
    pickupLocation: canSeeParticipantDetails ? item.pickupLocation : "참여 후 공개",
    pickupCandidates: canSeeParticipantDetails ? item.pickupCandidates : [],
    pickupCandidateDetails: canSeeParticipantDetails ? pickupCandidateDetails : [],
    votes: canSeeParticipantDetails ? item.votes : {},
    isOwner,
    ...(isOwner ? {
      pickupLatitude: item.pickupLatitude ?? null,
      pickupLongitude: item.pickupLongitude ?? null,
    } : {}),
    userJoined,
    userQuantity: viewerParticipation?.quantity ?? null,
    userVote: voterChoices[viewerId] || null,
  };
}
