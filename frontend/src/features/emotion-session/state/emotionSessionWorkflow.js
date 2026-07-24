export function createInitialWorkflowState() {
  return {
    analysisStatus: "completed",
    aiStatus: "waiting",
    analysisError: "",
    isSaving: false
  };
}

export function emotionSessionWorkflowReducer(state, action) {
  switch (action.type) {
    case "ANALYSIS_STARTED":
      return {
        analysisStatus: "analyzing",
        aiStatus: "thinking",
        analysisError: "",
        isSaving: true
      };
    case "REANALYSIS_STARTED":
      return {
        ...state,
        analysisStatus: "analyzing",
        analysisError: "",
        isSaving: false
      };
    case "SAVE_SUCCEEDED":
      return {
        analysisStatus: "completed",
        aiStatus: "speaking",
        analysisError: "",
        isSaving: false
      };
    case "AI_FINISHED":
      return {
        ...state,
        aiStatus: "waiting"
      };
    case "ANALYSIS_COMPLETED":
      return createInitialWorkflowState();
    case "FAILED":
      return {
        analysisStatus: "error",
        aiStatus: "waiting",
        analysisError: action.error,
        isSaving: false
      };
    case "SAVING_FINISHED":
      return {
        ...state,
        isSaving: false
      };
    default:
      return state;
  }
}
