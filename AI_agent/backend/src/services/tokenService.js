import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

export const createAuthToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      email: user.email,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    }
  );
};

export const verifyAuthToken = (token) => {
  return jwt.verify(token, env.jwtSecret);
};
