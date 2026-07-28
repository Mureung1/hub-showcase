export interface RecapTrack {
  id: string | number;
  spotifyTrackId: string | null;
  songTitle: string;
  artistName: string;
  albumName: string | null;
  albumImageUrl: string | null;
  externalUrl: string | null;
  emotionText: string;
  recordDate: string;
}

export interface MonthlyRecap {
  year: number;
  month: number;
  recordCount: number;
  recordDays: number;
  topArtists: Array<{
    artistName: string;
    recordCount: number;
  }>;
  firstRecord: RecapTrack | null;
  lastRecord: RecapTrack | null;
  tracks: RecapTrack[];
}

async function getErrorMessage(response: Response) {
  try {
    const body = await response.json();
    return body.error?.message || "월간 기록을 불러오지 못했어요.";
  } catch {
    return "월간 기록을 불러오지 못했어요.";
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isRecapTrack(value: unknown): value is RecapTrack {
  if (!value || typeof value !== "object") return false;
  const track = value as Partial<RecapTrack>;
  const hasValidId = (
    (typeof track.id === "string" && track.id.length > 0)
    || (typeof track.id === "number" && Number.isFinite(track.id))
  );

  return (
    hasValidId
    && isNullableString(track.spotifyTrackId)
    && isNonEmptyString(track.songTitle)
    && isNonEmptyString(track.artistName)
    && isNullableString(track.albumName)
    && isNullableString(track.albumImageUrl)
    && isNullableString(track.externalUrl)
    && isNonEmptyString(track.emotionText)
    && typeof track.recordDate === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(track.recordDate)
  );
}

function isTopArtist(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const artist = value as MonthlyRecap["topArtists"][number];
  return (
    isNonEmptyString(artist.artistName)
    && Number.isInteger(artist.recordCount)
    && artist.recordCount > 0
  );
}

function isMonthlyRecap(
  value: unknown,
  expectedYear: number,
  expectedMonth: number,
): value is MonthlyRecap {
  if (!value || typeof value !== "object") return false;
  const recap = value as Partial<MonthlyRecap>;
  return (
    Number.isInteger(recap.year)
    && recap.year === expectedYear
    && Number.isInteger(recap.month)
    && recap.month === expectedMonth
    && expectedMonth >= 1
    && expectedMonth <= 12
    && isNonNegativeInteger(recap.recordCount)
    && isNonNegativeInteger(recap.recordDays)
    && recap.recordDays <= recap.recordCount
    && Array.isArray(recap.topArtists)
    && recap.topArtists.length <= 3
    && recap.topArtists.every(isTopArtist)
    && Array.isArray(recap.tracks)
    && recap.tracks.length === recap.recordCount
    && recap.tracks.every(isRecapTrack)
    && (recap.firstRecord === null || isRecapTrack(recap.firstRecord))
    && (recap.lastRecord === null || isRecapTrack(recap.lastRecord))
    && (
      recap.recordCount > 0
        ? recap.firstRecord !== null && recap.lastRecord !== null
        : recap.firstRecord === null && recap.lastRecord === null
    )
  );
}

export async function getMonthlyRecap(
  apiBaseUrl: string,
  accessToken: string,
  year: number,
  month: number,
  signal?: AbortSignal,
) {
  const search = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  const response = await fetch(`${apiBaseUrl}/api/recaps/monthly?${search}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });

  if (!response.ok) throw new Error(await getErrorMessage(response));

  const body: { data?: unknown } = await response.json();
  if (!isMonthlyRecap(body.data, year, month)) {
    throw new Error("월간 기록 응답을 확인하지 못했어요.");
  }
  return body.data;
}
