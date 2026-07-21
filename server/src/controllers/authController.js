import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createUser, findUserByUsername, getTastesByUserId, setTastes } from '../models/user.js';

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '7d';
// 존재하지 않는 아이디로 로그인 시 bcrypt.compare 자체를 건너뛰면 응답 시간 차이로
// "그 아이디가 존재하는지"가 새어나갈 수 있어, 항상 비교 연산을 하도록 더미 해시를 하나 둔다.
const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Wm6RQ6cUEZM1TsQ5qMwUYqQwq0k1S';

function issueToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function validateCredentials(username, password) {
  if (!username || !username.trim()) {
    const err = new Error('아이디를 입력해주세요.');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  if (!password || password.length < 4) {
    const err = new Error('비밀번호는 4자 이상이어야 해요.');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
}

export async function signup(req, res, next) {
  try {
    const username = (req.body.username || '').trim();
    const password = req.body.password || '';
    const taste = Array.isArray(req.body.taste) ? req.body.taste : [];
    validateCredentials(username, password);

    if (await findUserByUsername(username)) {
      const err = new Error('이미 사용 중인 아이디예요.');
      err.status = 409;
      err.code = 'USERNAME_TAKEN';
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser(username, passwordHash);
    if (taste.length) await setTastes(user.id, taste);

    const token = issueToken(user);
    res.status(201).json({ success: true, data: { token, user: { id: user.username, taste } } });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const username = (req.body.username || '').trim();
    const password = req.body.password || '';
    validateCredentials(username, password);

    const user = await findUserByUsername(username);
    const passwordOk = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH);
    if (!user || !passwordOk) {
      const err = new Error('아이디 또는 비밀번호가 올바르지 않아요.');
      err.status = 401;
      err.code = 'AUTH_FAILED';
      throw err;
    }

    const token = issueToken(user);
    const taste = await getTastesByUserId(user.id);
    res.json({ success: true, data: { token, user: { id: user.username, taste } } });
  } catch (err) {
    next(err);
  }
}
