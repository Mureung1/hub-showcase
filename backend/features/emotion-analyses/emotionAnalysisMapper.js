export function toEmotionAnalysisDto(record) {
  return {
    id: record.id,
    sessionId: record.session_id,
    situationText: record.situation_text,
    faceSignal: record.face_signal,
    faceSignalSource: record.face_signal_source || "manual",
    faceSignalConfidence: record.face_signal_confidence ?? null,
    faceSignalEvidence: record.face_signal_evidence || [],
    faceSignalHeuristicVersion: record.face_signal_heuristic_version || null,
    voiceSignal: record.voice_signal,
    selectedScenario: record.selected_scenario,
    analysisResult: record.analysis_result,
    aiResponse: record.ai_response,
    createdAt: record.created_at
  };
}
