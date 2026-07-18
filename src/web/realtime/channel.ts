export const realtimeDebounceMs = 350;
export function studyChannelName(challengeId: string): string { return `study:${challengeId.replace(/[^a-zA-Z0-9-]/g,'')}`; }
