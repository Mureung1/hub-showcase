import { NextFunction, Request, Response } from "express";
import { supabaseAuthClient } from "../config/supabase";

function getBearerToken(authorizationHeader: string | undefined) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = getBearerToken(req.header("Authorization"));

  if (!token) {
    res.status(401).json({
      message: "인증 토큰이 필요합니다."
    });
    return;
  }

  const { data, error } = await supabaseAuthClient.auth.getUser(token);

  if (error || !data.user?.email) {
    res.status(401).json({
      message: "유효하지 않은 인증 토큰입니다."
    });
    return;
  }

  req.authUser = {
    id: data.user.id,
    email: data.user.email
  };

  next();
}
