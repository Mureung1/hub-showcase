import type { SpotifyTrack } from "../types/music";

export interface MusicRecordFieldErrors {
  track?: string;
  emotion?: string;
}

export function validateMusicRecordInput(
  selectedTrack: SpotifyTrack | null,
  emotion: string,
): MusicRecordFieldErrors {
  const errors: MusicRecordFieldErrors = {};

  if (!selectedTrack) {
    errors.track = "오늘을 대표하는 음악을 선택해주세요.";
  }

  if (!emotion.trim()) {
    errors.emotion = "감정을 한 줄로 남겨주세요.";
  } else if (emotion.trim().length > 160) {
    errors.emotion = "감정은 160자 이하로 입력해주세요.";
  }

  return errors;
}
