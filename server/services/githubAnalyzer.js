 import { summarizeProject } from './llmClient.js';

const GITHUB_API = 'https://api.github.com';
const USER_AGENT = 'ai-portfolio-agent-prototype';

const FRAMEWORK_HINTS = {
  react: 'React',
  next: 'Next.js',
  vue: 'Vue',
  express: 'Express',
  nestjs: 'NestJS',
  fastapi: 'FastAPI',
  django: 'Django',
  flask: 'Flask',
  'spring-boot': 'Spring Boot',
};

export class AnalyzerError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export function parseRepoUrl(repositoryUrl) {
  const match = String(repositoryUrl || '').trim()
    .match(/github\.com[/:]([^/]+)\/([^/#?]+?)(\.git)?\/?$/i);
  if (!match) {
    throw new AnalyzerError('INVALID_URL', 'GitHub Repository URL 형식이 올바르지 않습니다.');
  }
  return { owner: match[1], repo: match[2] };
}

async function fetchRaw(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github.raw', 'User-Agent': USER_AGENT },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new AnalyzerError('GITHUB_API_ERROR', `GitHub API 요청에 실패했습니다. (status ${res.status})`);
  }
  return res.text();
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': USER_AGENT },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new AnalyzerError('GITHUB_API_ERROR', `GitHub API 요청에 실패했습니다. (status ${res.status})`);
  }
  return res.json();
}

function extractFeatures(readmeText) {
  if (!readmeText) return [];
  return readmeText
    .split(/\n+/)
    .filter((line) => /^#{2,3}\s+/.test(line))
    .map((line) => line.replace(/^#{2,3}\s+/, '').trim())
    .filter((title) => title.length > 0 && title.length < 60)
    .slice(0, 6);
}

function parsePackageJson(raw) {
  try {
    const pkg = JSON.parse(raw);
    const depNames = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    const framework = [];
    for (const dep of depNames) {
      for (const [hint, label] of Object.entries(FRAMEWORK_HINTS)) {
        if (dep.toLowerCase().includes(hint) && !framework.includes(label)) {
          framework.push(label);
        }
      }
    }
    const language = depNames.some((d) => d === 'typescript') ? ['TypeScript'] : ['JavaScript'];
    return { language, framework, library: depNames.slice(0, 15) };
  } catch {
    return null;
  }
}

function parseRequirementsTxt(raw) {
  const packages = raw
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split(/[=<>~]/)[0].trim())
    .filter(Boolean);
  const framework = [];
  for (const pkg of packages) {
    for (const [hint, label] of Object.entries(FRAMEWORK_HINTS)) {
      if (pkg.toLowerCase().includes(hint) && !framework.includes(label)) {
        framework.push(label);
      }
    }
  }
  return { language: ['Python'], framework, library: packages.slice(0, 15) };
}

/**
 * GitHub 공개 REST API로 Repository를 분석해 ProjectMetadataSchema 형태를 생성한다.
 * OAuth 없이 공개 repo만 대상으로 하며, 요청 단위로만 동작한다 (저장/재사용 없음 - Phase 2에서 추가).
 */
export async function analyze(repositoryUrl) {
  const { owner, repo } = parseRepoUrl(repositoryUrl);

  const repoInfo = await fetchJson(`${GITHUB_API}/repos/${owner}/${repo}`);
  if (!repoInfo) {
    throw new AnalyzerError(
      'REPOSITORY_NOT_FOUND',
      'Repository에 접근할 수 없습니다. URL을 확인하거나 공개 저장소인지 확인해주세요.',
    );
  }

  const evidence = [];

  const readmeText = await fetchRaw(`${GITHUB_API}/repos/${owner}/${repo}/readme`);
  if (readmeText) evidence.push({ file: 'README.md' });

  const packageJsonRaw = await fetchRaw(`${GITHUB_API}/repos/${owner}/${repo}/contents/package.json`);
  const requirementsRaw = packageJsonRaw
    ? null
    : await fetchRaw(`${GITHUB_API}/repos/${owner}/${repo}/contents/requirements.txt`);

  let techStackDetail = { language: [], framework: [], library: [] };
  if (packageJsonRaw) {
    const parsed = parsePackageJson(packageJsonRaw);
    if (parsed) {
      techStackDetail = parsed;
      evidence.push({ file: 'package.json' });
    }
  } else if (requirementsRaw) {
    techStackDetail = parseRequirementsTxt(requirementsRaw);
    evidence.push({ file: 'requirements.txt' });
  }

  const features = extractFeatures(readmeText);
  const flatTechStack = [...techStackDetail.language, ...techStackDetail.framework];

  const { purpose, description, confidence } = summarizeProject({
    projectName: repoInfo.name,
    readmeExcerpt: readmeText ? readmeText.slice(0, 1000) : '',
    techStack: flatTechStack,
  });

  return {
    project_name: repoInfo.name,
    description,
    purpose,
    tech_stack: {
      language: techStackDetail.language,
      framework: techStackDetail.framework,
      database: [],
      infra: [],
    },
    features,
    architecture: { type: null, confidence: 0 },
    evidence,
    analysis_confidence: confidence,
  };
}
