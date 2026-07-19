const pool = require('../src/config/db');
const {
  findOrCreateUserByProvider,
  normalizeUser,
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

describe('normalizeUser의 birthDate 변환', () => {
  it('pg가 준 Date를 YYYY-MM-DD 문자열로 바꾼다', () => {
    // pg는 date 컬럼을 '로컬 자정' Date로 준다. 그대로 두면 JSON 직렬화 때 UTC로
    // 바뀌면서 KST 기준 하루가 밀린다.
    const row = {
      id: 1,
      email: 'a@test.com',
      nickname: '테스트',
      birth_date: new Date(2001, 4, 20), // 2001-05-20 로컬 자정
      trust_score: '50.0',
    };
    expect(normalizeUser(row).birthDate).toBe('2001-05-20');
  });

  it('birth_date가 없으면 null 그대로 둔다', () => {
    const row = {
      id: 1,
      email: 'a@test.com',
      nickname: '테스트',
      birth_date: null,
      trust_score: '50.0',
    };
    expect(normalizeUser(row).birthDate).toBeNull();
  });
});
