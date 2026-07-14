const pool = require('../src/config/db');
const {
  findOrCreateUserByProvider,
} = require('../src/services/userService');

afterAll(async () => {
  await pool.end();
});

describe('findOrCreateUserByProvider', () => {
  it('처음 보는 provider/providerId면 새 사용자를 만들고 isNewUser: true를 반환한다', async () => {
    const result = await findOrCreateUserByProvider({
      provider: 'google',
      providerId: 'google-user-1',
      email: 'a@test.com',
      nickname: '홍길동',
    });

    expect(result.isNewUser).toBe(true);
    expect(typeof result.user.id).toBe('number');
    expect(result.user.email).toBe('a@test.com');
    expect(result.user.nickname).toBe('홍길동');
    expect(result.user.birthDate).toBeNull();
    expect(result.user.trustScore).toBe(50);
  });

  it('이미 있는 provider/providerId면 기존 사용자를 반환하고 isNewUser: false를 반환한다', async () => {
    const first = await findOrCreateUserByProvider({
      provider: 'google',
      providerId: 'google-user-2',
      email: 'b@test.com',
      nickname: 'B',
    });

    const second = await findOrCreateUserByProvider({
      provider: 'google',
      providerId: 'google-user-2',
      email: 'b@test.com',
      nickname: 'B',
    });

    expect(second.isNewUser).toBe(false);
    expect(second.user.id).toBe(first.user.id);
  });

  it('provider가 다르면 provider_id가 같아도 별개 사용자로 취급한다', async () => {
    const google = await findOrCreateUserByProvider({
      provider: 'google',
      providerId: 'same-id',
      email: 'g@test.com',
      nickname: 'G',
    });
    const kakao = await findOrCreateUserByProvider({
      provider: 'kakao',
      providerId: 'same-id',
      email: 'k@test.com',
      nickname: 'K',
    });

    expect(kakao.user.id).not.toBe(google.user.id);
  });
});
