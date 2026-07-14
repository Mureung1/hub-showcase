import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import database from "../config/database.js";

// 회원가입 함수
export async function register(req, res) {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      message: "이름, 이메일, 비밀번호를 모두 입력해주세요.",
    });
  }

  const existingUser = database
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email);

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: "이미 가입된 이메일입니다.",
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = database
    .prepare(`
      INSERT INTO users (email, password, name)
      VALUES (?, ?, ?)
    `)
    .run(email, hashedPassword, name);

  return res.status(201).json({
    success: true,
    message: "회원가입 성공",
    userId: result.lastInsertRowid,
  });
}


// 로그인 함수
export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "이메일과 비밀번호를 입력해주세요.",
    });
  }

  const user = database
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "이메일 또는 비밀번호가 올바르지 않습니다.",
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "이메일 또는 비밀번호가 올바르지 않습니다.",
    });
  }

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    },
  );

  return res.json({
    success: true,
    message: "로그인 성공",
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
}