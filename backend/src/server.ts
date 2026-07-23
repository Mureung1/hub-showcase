import cors from "cors";
import express, { type Request, type Response } from "express";
import reviewsRouter from "./routes/reviews";
import { supabase } from "./config/supabase";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.send("Express 서버 실행 중");
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/api/health/supabase", async (_req: Request, res: Response) => {
  const { error } = await supabase.from("stores").select("*", {
    head: true,
    count: "exact",
  });

  if (error) {
    console.error("Supabase health check failed:", error.message);
    res.status(503).json({
      status: "error",
      service: "supabase",
      code: error.code,
      message: "Supabase에 연결했지만 stores 테이블을 조회할 수 없습니다.",
    });
    return;
  }

  res.json({ status: "ok", service: "supabase" });
});

app.get("/api/stores", async (_req: Request, res: Response) => {
  const { data, error } = await supabase.from("stores").select("*");

  if (error) {
    console.error("Failed to fetch stores:", error.message);
    res.status(500).json({
      message: "매장 목록을 불러오지 못했습니다.",
      code: error.code,
    });
    return;
  }

  res.json(data);
});

app.post("/api/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as {
    email?: unknown;
    password?: unknown;
  };

  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ message: "이메일과 비밀번호를 입력해 주세요." });
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.session) {
    res.status(401).json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." });
    return;
  }

  res.json({
    accessToken: data.session.access_token,
    expiresAt: data.session.expires_at,
    user: {
      id: data.user.id,
      email: data.user.email ?? "",
      name:
        typeof data.user.user_metadata.nickname === "string" &&
        data.user.user_metadata.nickname.trim().length > 0
          ? data.user.user_metadata.nickname.trim()
          : data.user.email?.split("@")[0] ?? "사용자",
    },
  });
});

type SignupPreferences = {
  spicy: number;
  valueForMoney: number;
  atmosphere: number;
  waiting: number;
  quietness: number;
};

app.post("/api/auth/signup", async (req: Request, res: Response) => {
  const { name, email, password, preferences } = req.body as {
    name?: unknown;
    email?: unknown;
    password?: unknown;
    preferences?: unknown;
  };
  const trimmedName = typeof name === "string" ? name.trim() : "";
  const trimmedEmail = typeof email === "string" ? email.trim() : "";

  if (
    trimmedName.length < 2 ||
    !/^\S+@\S+\.\S+$/.test(trimmedEmail) ||
    typeof password !== "string" ||
    password.length < 6 ||
    !isValidSignupPreferences(preferences)
  ) {
    res.status(400).json({
      message: "이름, 이메일, 6자 이상의 비밀번호를 확인해 주세요.",
    });
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      data: {
        nickname: trimmedName,
        spicy: preferences.spicy,
        valueForMoney: preferences.valueForMoney,
        atmosphere: preferences.atmosphere,
        waiting: preferences.waiting,
        quietness: preferences.quietness,
      },
    },
  });

  if (error || !data.user) {
    const signupError = error
      ? {
          name: error.name,
          message: error.message,
          status: error.status,
          code: error.code,
          cause: error.cause,
        }
      : null;
    console.error("Signup failed:", signupError);
    res.status(400).json({
      message:
        error?.message === "User already registered"
          ? "이미 가입된 이메일입니다."
          : "회원가입을 완료하지 못했습니다.",
      code: error?.code,
      detail: process.env.NODE_ENV === "production" ? undefined : signupError,
    });
    return;
  }

  res.status(201).json({
    message: data.session
      ? "회원가입이 완료되었습니다."
      : "회원가입이 완료되었습니다. 이메일 인증 후 로그인해 주세요.",
    requiresEmailConfirmation: !data.session,
    user: {
      id: data.user.id,
      email: data.user.email ?? trimmedEmail,
      name: data.user.user_metadata.nickname ?? trimmedName,
    },
  });
});

function isValidSignupPreferences(
  value: unknown,
): value is SignupPreferences {
  if (!value || typeof value !== "object") return false;

  const preferences = value as Record<string, unknown>;
  return [
    preferences.spicy,
    preferences.valueForMoney,
    preferences.atmosphere,
    preferences.waiting,
    preferences.quietness,
  ].every(
    (score) =>
      typeof score === "number" &&
      Number.isInteger(score) &&
      score >= 1 &&
      score <= 10,
  );
}

app.use("/api/reviews", reviewsRouter);

app.listen(port, () => {
  console.log(`서버 실행: http://localhost:${port}`);
});
