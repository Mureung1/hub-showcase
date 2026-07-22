export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? "";
  const [scheme, encoded] = header.split(" ");

  if (scheme !== "Basic" || !encoded) {
    res.status(401).json({ error: "로그인이 필요합니다." });
    return;
  }

  const decoded = Buffer.from(encoded, "base64").toString("utf-8");
  const separatorIndex = decoded.indexOf(":");
  const id = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  if (id !== process.env.APP_LOGIN_ID || password !== process.env.APP_LOGIN_PASSWORD) {
    res.status(401).json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." });
    return;
  }

  next();
}
