export async function readClipboardText(): Promise<string> {
  try {
    return (await navigator.clipboard?.readText?.())?.trim() ?? '';
  } catch {
    return '';
  }
}
