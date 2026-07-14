import { describe, expect, it } from 'vitest';

import {
  getUrlWithoutAuthCallbackError,
  readAuthCallbackError,
} from './auth_callback_error';

describe('readAuthCallbackError', () => {
  it('explains a cancelled Google login in Korean', () => {
    expect(
      readAuthCallbackError(
        '?error=access_denied&error_description=The+user+cancelled'
      )
    ).toBe('Google 로그인이 취소되었습니다. 다시 시도해 주세요.');
  });

  it('keeps the provider reason for an unexpected callback failure', () => {
    expect(
      readAuthCallbackError(
        '?error=server_error&error_description=Provider+configuration+failed'
      )
    ).toBe('Google 로그인에 실패했습니다. Provider configuration failed');
  });

  it('returns no message when the callback has no auth error', () => {
    expect(readAuthCallbackError('?code=oauth-code')).toBeUndefined();
  });

  it('removes OAuth errors from the query while preserving unrelated URL state', () => {
    expect(
      getUrlWithoutAuthCallbackError(
        'https://amadda.example/?error=access_denied&error_description=cancelled&error_code=oauth_error&keep=value#section'
      )
    ).toBe('/?keep=value#section');
  });

  it('removes OAuth errors from the hash and reports when no cleanup is needed', () => {
    expect(
      getUrlWithoutAuthCallbackError(
        'https://amadda.example/#error=access_denied&error_description=cancelled'
      )
    ).toBe('/');
    expect(
      getUrlWithoutAuthCallbackError('https://amadda.example/?code=oauth-code')
    ).toBeUndefined();
  });
});
