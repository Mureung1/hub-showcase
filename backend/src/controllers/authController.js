import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import database from "../config/database.js";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return password.length >= 8;
}

// 회원가입 함수
export async function register(req, res) {
  const { email, password, name } = req.body;

  // 빈 값 검사
  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      message: "이름, 이메일, 비밀번호를 모두 입력해주세요.",
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: "올바른 이메일 형식으로 입력해주세요.",
    });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({
      success: false,
      message: "비밀번호는 8자 이상으로 입력해주세요.",
    });
  }

  // 같은 이메일이 있는지 확인
  try {
    const result = await database.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    const existingUser = result.rows[0];

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "이미 가입된 이메일입니다.",
      });
    }
  } catch (error) {
    console.error("사용자 확인 중 에러:", error);
    return res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // 회원 저장
  try {
    const result = await database.query(
      `
        INSERT INTO users (email, password, name)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [email, hashedPassword, name]
    );

    return res.status(201).json({
      success: true,
      message: "회원가입 성공",
      userId: result.rows[0].id,
    });
  } catch (error) {
    console.error("회원가입 중 에러:", error);
    return res.status(500).json({
      success: false,
      message: "회원가입 중 오류가 발생했습니다.",
    });
  }
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

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: "올바른 이메일 형식으로 입력해주세요.",
    });
  }

  try {
    const result = await database.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    // 사용자가 입력한 암호랑 DB에 저장된 암호화된 값이랑 비교해서 맞으면 true 클리면 false
    // 여기서 중요한 점은 절대 암호를 복호화하지 않는다는 것이야.
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    // 로그인 성공 시 JWT 토큰을 만드는 코드
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",           // 토큰을 하루 동안 유효하게 만든다는 뜻
      },
    );

    // 로그인의 마지막 단계!_로그인 성공 응답 보내기
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
  } catch (error) {
    console.error("로그인 중 에러:", error);
    return res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
    });
  }
}
