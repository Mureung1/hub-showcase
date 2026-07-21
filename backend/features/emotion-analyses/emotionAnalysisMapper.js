export function toEmotionAnalysisDto(record) {
  return {
    id: record.id,
    sessionId: record.session_id,
    situationText: record.situation_text,
    faceSignal: record.face_signal,
    voiceSignal: record.voice_signal,
    selectedScenario: record.selected_scenario,
    analysisResult: record.analysis_result,
    aiResponse: record.ai_response,
    createdAt: record.created_at
  };
}
