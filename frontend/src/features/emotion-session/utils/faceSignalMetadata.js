export function createManualFaceSignalMetadata() {
  return {
    source: "manual",
    confidence: null,
    evidence: [],
    heuristicVersion: null
  };
}

export function normalizeFaceSignalMetadata(value = {}) {
  const source = value.source ?? value.faceSignalSource;
  const confidence = value.confidence ?? value.faceSignalConfidence;
  const evidence = value.evidence ?? value.faceSignalEvidence;
  const heuristicVersion =
    value.heuristicVersion ?? value.faceSignalHeuristicVersion;

  if (source !== "camera" || !Number.isFinite(confidence)) {
    return createManualFaceSignalMetadata();
  }

  return {
    source: "camera",
    confidence,
    evidence: Array.isArray(evidence) ? [...evidence] : [],
    heuristicVersion:
      typeof heuristicVersion === "string" ? heuristicVersion : null
  };
}

export function toFaceSignalPayload(metadata) {
  const normalized = normalizeFaceSignalMetadata(metadata);

  return {
    faceSignalSource: normalized.source,
    faceSignalConfidence: normalized.confidence,
    faceSignalEvidence: normalized.evidence,
    faceSignalHeuristicVersion: normalized.heuristicVersion
  };
}
