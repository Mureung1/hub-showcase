export interface MusicRecord {
  id: string | number;
  songTitle: string;
  artistName: string;
  emotion: string;
  recordDate: string;
  liked: boolean;
}

export type MusicRecordDraft = Pick<
  MusicRecord,
  "songTitle" | "artistName" | "emotion"
>;
