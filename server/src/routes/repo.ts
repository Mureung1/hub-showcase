import { Router } from "express";
import { getSession } from "../utils/session";

const router = Router();

interface GithubRepo {
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
}

interface RepoSummary {
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
}

interface GithubBranch {
  name: string;
}

function githubHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "GameForge-Agent",
  };
}

router.get("/list", async (req, res) => {
  const session = await getSession();
  if (!session) {
    return res.status(401).json({ error: "Not logged in." });
  }

  const page = req.query.page ? Number(req.query.page) : 1;
  const perPage = req.query.per_page ? Number(req.query.per_page) : 100;

  const ghRes = await fetch(
    `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated`,
    { headers: githubHeaders(session.access_token) }
  );

  if (!ghRes.ok) {
    return res.status(ghRes.status).json({ error: "Failed to fetch repositories from GitHub." });
  }

  const repos = (await ghRes.json()) as GithubRepo[];
  const summaries: RepoSummary[] = repos.map((r) => ({
    name: r.name,
    full_name: r.full_name,
    private: r.private,
    default_branch: r.default_branch,
  }));
  res.json(summaries);
});

// Spec says GET /api/repo/:fullName/branches, but a "/" inside a single Express
// param doesn't match — split "owner/repo" into two params instead.
router.get("/:owner/:repo/branches", async (req, res) => {
  const session = await getSession();
  if (!session) {
    return res.status(401).json({ error: "Not logged in." });
  }

  const { owner, repo } = req.params;
  const ghRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`,
    { headers: githubHeaders(session.access_token) }
  );

  if (!ghRes.ok) {
    return res.status(ghRes.status).json({ error: "Failed to fetch branches from GitHub." });
  }

  const branches = (await ghRes.json()) as GithubBranch[];
  res.json(branches.map((b) => b.name));
});

export default router;
