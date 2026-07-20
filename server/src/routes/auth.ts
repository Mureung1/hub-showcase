import { Router } from "express";
import crypto from "crypto";
import { promises as fs } from "fs";
import { writeJson } from "../utils/jsonStore";
import { getSession, SESSION_FILE, StoredSession } from "../utils/session";

const router = Router();

const PORT = process.env.PORT ?? "4000";
const SERVER_BASE_URL = process.env.SERVER_BASE_URL ?? `http://localhost:${PORT}`;
const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";
const CALLBACK_URL = `${SERVER_BASE_URL}/api/auth/github/callback`;
const OAUTH_STATE_COOKIE = "oauth_state";

interface GithubTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
  expires_in?: number;
}

interface GithubUserResponse {
  login: string;
  avatar_url: string;
}

router.get("/github/login", (req, res) => {
  if (!process.env.GITHUB_CLIENT_ID) {
    return res.status(500).send("GITHUB_CLIENT_ID is not configured on the server.");
  }

  const state = crypto.randomBytes(16).toString("hex");
  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    signed: true,
    maxAge: 5 * 60 * 1000,
    sameSite: "lax",
  });

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: CALLBACK_URL,
    scope: "repo",
    state,
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

router.get("/github/callback", async (req, res) => {
  const { code, state } = req.query;
  const expectedState = req.signedCookies?.[OAUTH_STATE_COOKIE];
  res.clearCookie(OAUTH_STATE_COOKIE);

  if (!code || typeof code !== "string" || !state || !expectedState || state !== expectedState) {
    return res.status(400).send("Invalid or missing OAuth state. Please try logging in again.");
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: CALLBACK_URL,
    }),
  });
  const tokenData = (await tokenRes.json()) as GithubTokenResponse;

  if (!tokenData.access_token) {
    return res
      .status(400)
      .send(`GitHub token exchange failed: ${tokenData.error_description ?? "unknown error"}`);
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "GameForge-Agent",
    },
  });
  const userData = (await userRes.json()) as GithubUserResponse;

  const session: StoredSession = {
    github_login: userData.login,
    github_avatar_url: userData.avatar_url,
    access_token: tokenData.access_token,
    expires_at: tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null,
  };

  await writeJson(SESSION_FILE, session);
  // Best-effort: restricts session.json (holds the plaintext access token) to the
  // owner account only. No-op on Windows filesystems that don't enforce POSIX bits,
  // but takes effect wherever the app is later run on Linux/macOS.
  await fs.chmod(SESSION_FILE, 0o600).catch(() => {});

  res.redirect(`${CLIENT_URL}/repo`);
});

router.get("/session", async (_req, res) => {
  const session = await getSession();
  if (!session) {
    return res.json({ loggedIn: false });
  }
  res.json({
    loggedIn: true,
    github_login: session.github_login,
    github_avatar_url: session.github_avatar_url,
  });
});

router.post("/logout", async (_req, res) => {
  await fs.rm(SESSION_FILE, { force: true });
  res.json({ loggedIn: false });
});

export default router;
