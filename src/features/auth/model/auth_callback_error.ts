const AUTH_ERROR_PARAMETER_NAMES = [
  'error',
  'error_description',
  'error_code',
] as const;

export function readAuthCallbackError(search: string) {
  const normalized = search.replace(/^[?#]/, '');
  const params = new URLSearchParams(normalized);
  const error = params.get('error');

  if (!error) {
    return undefined;
  }

  if (error === 'access_denied') {
    return 'Google 로그인을 취소했어요. 다시 시도해 주세요.';
  }

  return 'Google 로그인에 실패했어요. 다시 시도해 주세요.';
}

function removeAuthErrorParameters(params: URLSearchParams) {
  if (!params.has('error')) {
    return false;
  }

  AUTH_ERROR_PARAMETER_NAMES.forEach((name) => params.delete(name));
  return true;
}

export function getUrlWithoutAuthCallbackError(href: string) {
  const url = new URL(href);
  let removed = removeAuthErrorParameters(url.searchParams);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));

  if (removeAuthErrorParameters(hashParams)) {
    url.hash = hashParams.toString();
    removed = true;
  }

  return removed ? `${url.pathname}${url.search}${url.hash}` : undefined;
}
