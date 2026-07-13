import { signUp } from '../src/services/auth';

test('회원가입 동의 체크박스 미체크 시 가입 차단', async () => {
  await expect(
    signUp({
      email: 'test@example.com',
      password: 'password123',
      storeName: 'Test Store',
      storeCategory: 'cafe',
      agreedToPrivacy: false,
    })
  ).rejects.toThrow('개인정보 수집·이용에 동의해야 가입할 수 있습니다.');
});
