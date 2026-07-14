export interface MusicRecord {
  id: string;
  songTitle: string;
  artistName: string;
  emotion: string;
  recordDate: string;
  liked: boolean;
}

export type MusicRecordDraft = Pick<
  MusicRecord,
  "songTitle" | "artistName" | "emotion" | "recordDate"
>;
