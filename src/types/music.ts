export interface SpotifyTrack {
  spotifyTrackId: string;
  title: string;
  artistName: string;
  albumName: string;
  albumImageUrl: string;
  externalUrl: string;
}

export interface MusicRecord {
  id: string | number;
  spotifyTrackId: string | null;
  songTitle: string;
  artistName: string;
  albumName: string | null;
  albumImageUrl: string | null;
  externalUrl: string | null;
  emotion: string;
  recordDate: string;
  liked: boolean;
}

export interface MusicRecordDraft extends SpotifyTrack {
  emotion: string;
}
