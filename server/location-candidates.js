function distanceBetween(first, second) {
  const latitudeScale = 111.32;
  const longitudeScale = 111.32 * Math.cos(((first.latitude + second.latitude) / 2) * Math.PI / 180);
  return Math.hypot(
    (first.latitude - second.latitude) * latitudeScale,
    (first.longitude - second.longitude) * longitudeScale,
  );
}

function mergeCandidate(existing, incoming) {
  const existingHasCoordinates = Number.isFinite(existing.latitude) && Number.isFinite(existing.longitude);
  const incomingHasCoordinates = Number.isFinite(incoming.latitude) && Number.isFinite(incoming.longitude);

  if (!existingHasCoordinates && incomingHasCoordinates) {
    return incoming;
  }

  return existing;
}

function uniqueParticipantsByAddress(participants) {
  const unique = new Map();

  for (const participant of participants) {
    if (!participant.startLocation) continue;

    const existing = unique.get(participant.startLocation);
    if (!existing) {
      unique.set(participant.startLocation, participant);
      continue;
    }

    unique.set(participant.startLocation, mergeCandidate(existing, participant));
  }

  return [...unique.values()];
}

export function hasCompleteCoordinatePair({ latitude, longitude }) {
  return (latitude === null && longitude === null)
    || (Number.isFinite(latitude) && Number.isFinite(longitude));
}

export function findPickupCandidates(participants) {
  const unique = uniqueParticipantsByAddress(participants);
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
    uniqueParticipantsByAddress(participants).map((participant) => [participant.startLocation, participant]),
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
