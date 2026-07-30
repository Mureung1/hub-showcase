function distanceBetween(first, second) {
  const latitudeScale = 111.32;
  const longitudeScale = 111.32 * Math.cos(((first.latitude + second.latitude) / 2) * Math.PI / 180);
  return Math.hypot(
    (first.latitude - second.latitude) * latitudeScale,
    (first.longitude - second.longitude) * longitudeScale,
  );
}

export function hasCompleteCoordinatePair({ latitude, longitude }) {
  return (latitude === null && longitude === null)
    || (Number.isFinite(latitude) && Number.isFinite(longitude));
}

export function findPickupCandidates(participants) {
  const unique = [...new Map(
    participants
      .filter((participant) => participant.startLocation)
      .map((participant) => [participant.startLocation, participant]),
  ).values()];
  const located = unique.filter(
    (participant) => Number.isFinite(participant.latitude) && Number.isFinite(participant.longitude),
  );

  if (located.length < 2) return unique.slice(0, 3).map((participant) => participant.startLocation);

  const ranked = located
    .map((candidate) => ({
      ...candidate,
      score: located.reduce((total, participant) => total + distanceBetween(candidate, participant), 0),
    }))
    .sort((first, second) => first.score - second.score)
    .map((participant) => participant.startLocation);
  const withoutCoordinates = unique
    .filter((participant) => !Number.isFinite(participant.latitude) || !Number.isFinite(participant.longitude))
    .map((participant) => participant.startLocation);

  return [...ranked, ...withoutCoordinates].slice(0, 3);
}

export function findPickupCandidateDetails(participants) {
  const uniqueByName = new Map(
    participants
      .filter((participant) => participant.startLocation)
      .map((participant) => [participant.startLocation, participant]),
  );

  return findPickupCandidates(participants).map((name) => {
    const candidate = uniqueByName.get(name);
    const hasCoordinates = Number.isFinite(candidate?.latitude)
      && Number.isFinite(candidate?.longitude);
    return {
      name,
      latitude: hasCoordinates ? Number(candidate.latitude.toFixed(3)) : null,
      longitude: hasCoordinates ? Number(candidate.longitude.toFixed(3)) : null,
    };
  });
}
