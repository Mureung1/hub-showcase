export function readAuthCallbackError(search: string) {
  const normalized = search.replace(/^[?#]/, '');
  const params = new URLSearchParams(normalized);
  const error = params.get('error');

  if (!error) {
    return undefined;
  }

  if (error === 'access_denied') {
    return 'Google 로그인이 취소되었습니다. 다시 시도해 주세요.';
  }

  const description = params.get('error_description')?.trim();
  const reason = description || error;

  return `Google 로그인에 실패했습니다. ${reason}`;
}
