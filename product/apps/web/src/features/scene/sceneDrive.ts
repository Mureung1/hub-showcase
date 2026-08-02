const GOOGLE_DRIVE_FILE_ID_PATTERN = /(?:\/file\/d\/|^)([a-zA-Z0-9_-]{20,})(?:\/|$)/;

export function googleDriveFileId(value: string | undefined, fallback: string) {
  const match = value?.trim().match(GOOGLE_DRIVE_FILE_ID_PATTERN);
  return match?.[1] ?? fallback;
}

export function googleDrivePreviewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
}

export function googleDriveViewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
}
