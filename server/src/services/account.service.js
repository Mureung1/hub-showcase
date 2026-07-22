const { supabase } = require('../db/supabase');
const { ConflictError } = require('../utils/errors');
const { requireEmail, requirePassword } = require('../utils/validators');

const updateAccountCredentials = async (userId, { email, password } = {}) => {
  const updates = {};

  if (email !== undefined) {
    updates.email = requireEmail(email);
    updates.email_confirm = true;
  }

  if (password !== undefined) {
    updates.password = requirePassword(password);
  }

  if (Object.keys(updates).length === 0) return undefined;

  const { data, error } = await supabase.auth.admin.updateUserById(userId, updates);

  if (error) {
    // Supabase는 이메일 중복 시 정상 에러 코드 대신 빈 본문의
    // AuthRetryableFetchError(500)를 반환하므로 이 조합을 중복으로 간주한다.
    const isDuplicateEmail =
      error.code === 'email_exists' ||
      error.status === 422 ||
      (email !== undefined && error.name === 'AuthRetryableFetchError' && error.status === 500);

    if (isDuplicateEmail) {
      throw new ConflictError('이미 사용 중인 이메일입니다.');
    }
    throw error;
  }

  return data.user.email;
};

module.exports = { updateAccountCredentials };
