const {
  exchangeGoogleCode,
  exchangeKakaoCode,
} = require('../src/services/oauthClients');

describe('exchangeGoogleCode', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('토큰 교환 + 프로필 조회 후 정규화된 프로필을 반환한다', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token-abc' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: 'google-user-1',
          email: 'a@test.com',
          name: '홍길동',
        }),
      });

    const profile = await exchangeGoogleCode('auth-code-1');

    expect(profile).toEqual({
      providerId: 'google-user-1',
      email: 'a@test.com',
      nickname: '홍길동',
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('토큰 교환이 실패하면 VALIDATION_ERROR를 던진다', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: false });

    await expect(exchangeGoogleCode('bad-code')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('프로필에 email이 없으면 VALIDATION_ERROR를 던진다', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token-abc' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: 'google-user-1',
          name: '홍길동',
        }),
      });

    await expect(exchangeGoogleCode('auth-code-1')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });
});

describe('exchangeKakaoCode', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('토큰 교환 + 프로필 조회 후 정규화된 프로필을 반환한다', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token-xyz' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 987654321,
          kakao_account: {
            email: 'b@test.com',
            profile: { nickname: '카카오유저' },
          },
        }),
      });

    const profile = await exchangeKakaoCode('auth-code-2');

    expect(profile).toEqual({
      providerId: '987654321',
      email: 'b@test.com',
      nickname: '카카오유저',
    });
  });

  it('토큰 교환이 실패하면 VALIDATION_ERROR를 던진다', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: false });

    await expect(exchangeKakaoCode('bad-code')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('프로필에 email이 없으면 VALIDATION_ERROR를 던진다', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token-xyz' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 987654321,
          kakao_account: {
            profile: { nickname: '카카오유저' },
          },
        }),
      });

    await expect(exchangeKakaoCode('auth-code-2')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });
});
