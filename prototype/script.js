const form = document.querySelector("#repo-form");
const repoInput = document.querySelector("#repo-url");
const myLoginInput = document.querySelector("#my-login");
const contributorsOutput = document.querySelector("#contributors-output");
const myWorkOutput = document.querySelector("#my-work-output");
const summaryOutput = document.querySelector("#summary-output");
const copyButton = document.querySelector("#copy-button");
const copyStatus = document.querySelector("#copy-status");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseGitHubUrl(value) {
  const match = value.trim().match(/^https:\/\/github\.com\/([^/]+)\/([^/#?]+?)(?:\.git)?\/?$/);
  if (!match) {
    return null;
  }

  return {
    owner: match[1],
    repo: match[2],
  };
}

function updateStep(name, state, message) {
  const item = document.querySelector(`[data-step="${name}"]`);
  if (!item) {
    return;
  }

  item.classList.toggle("is-active", state === "active");
  item.classList.toggle("is-done", state === "done");
  item.classList.toggle("is-error", state === "error");
  item.querySelector("span").textContent = message;
}

function resetSteps() {
  document.querySelectorAll("[data-step]").forEach((item) => {
    item.classList.remove("is-active", "is-done", "is-error");
    item.querySelector("span").textContent = "대기 중";
  });
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API 요청 실패: ${response.status}`);
  }

  return response.json();
}

async function fetchRepositoryAnalysis(owner, repo) {
  const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;
  const [repository, contributors, commits] = await Promise.all([
    fetchJson(baseUrl),
    fetchJson(`${baseUrl}/contributors?per_page=100`),
    fetchJson(`${baseUrl}/commits?per_page=100`),
  ]);

  return { repository, contributors, commits };
}

function calculateContributors(contributors) {
  const total = contributors.reduce((sum, contributor) => sum + contributor.contributions, 0);

  return contributors.map((contributor) => ({
    login: contributor.login,
    count: contributor.contributions,
    percent: total === 0 ? 0 : Math.round((contributor.contributions / total) * 1000) / 10,
    url: contributor.html_url,
  }));
}

function getCommitLogin(commit) {
  return commit.author?.login || commit.commit.author?.name || "unknown";
}

function normalizeText(value) {
  return value.trim().replace(/\s+/g, " ");
}

function getMyCommits(commits, myLogin) {
  const normalizedLogin = myLogin.toLowerCase();

  return commits.filter((commit) => {
    const login = getCommitLogin(commit).toLowerCase();
    return login === normalizedLogin;
  });
}

function summarizeCommitMessages(commits) {
  if (commits.length === 0) {
    return ["최근 100개 커밋 안에서 해당 사용자의 커밋을 찾지 못했습니다."];
  }

  const messages = commits
    .map((commit) => normalizeText(commit.commit.message.split("\n")[0]))
    .filter(Boolean);

  const uniqueMessages = [...new Set(messages)];
  return uniqueMessages.slice(0, 6);
}

function renderContributors(contributors) {
  if (contributors.length === 0) {
    contributorsOutput.textContent = "GitHub API에서 참여자 정보를 찾지 못했습니다.";
    return;
  }

  contributorsOutput.innerHTML = contributors
    .map(
      (contributor) => `
        <div class="contributor-row">
          <a href="${contributor.url}" target="_blank" rel="noreferrer">${contributor.login}</a>
          <span>${contributor.count} commits</span>
          <strong>${contributor.percent}%</strong>
        </div>
      `,
    )
    .join("");
}

function renderMyWork(myLogin, myCommits) {
  const messages = summarizeCommitMessages(myCommits);

  myWorkOutput.innerHTML = `
    <p class="work-owner"><strong>${myLogin}</strong> 기준 최근 커밋 분석</p>
    <ul>
      ${messages.map((message) => `<li>${message}</li>`).join("")}
    </ul>
  `;

  return messages;
}

function createSummary({ repository, contributors, myLogin, myMessages }) {
  const contributorLines = contributors
    .map((contributor) => `- ${contributor.login}: ${contributor.percent}% (${contributor.count} commits)`)
    .join("\n");

  const workLines = myMessages.map((message) => `- ${message}`).join("\n");

  return `## ${repository.full_name} 분석 결과

### 프로젝트 참여자 및 기여도
${contributorLines || "- 참여자 정보를 찾지 못했습니다."}

### 내가 주로 작업한 내용 (${myLogin})
${workLines}

> 기준: GitHub 공개 API의 contributors, 최근 commits 데이터`;
}

function renderError(message) {
  contributorsOutput.textContent = message;
  myWorkOutput.textContent = "분석 가능한 데이터가 없어 내 작업 내용을 표시하지 못했습니다.";
  summaryOutput.textContent = `분석 실패\n\n${message}`;
}

async function runAnalysis(event) {
  event.preventDefault();
  copyStatus.textContent = "";

  const parsed = parseGitHubUrl(repoInput.value);
  if (!parsed) {
    resetSteps();
    updateStep("repo", "error", "GitHub URL 형식이 아닙니다.");
    renderError("https://github.com/owner/repository 형식으로 입력해 주세요.");
    return;
  }

  const myLogin = normalizeText(myLoginInput.value) || parsed.owner;

  resetSteps();
  updateStep("repo", "active", `${parsed.owner}/${parsed.repo} 확인 중`);
  await wait(300);

  try {
    updateStep("repo", "done", "Repository URL 형식 확인 완료");

    updateStep("contributors", "active", "GitHub API에서 contributors 요청 중");
    const data = await fetchRepositoryAnalysis(parsed.owner, parsed.repo);
    const contributors = calculateContributors(data.contributors);
    updateStep("contributors", "done", `${contributors.length}명 참여자 확인 완료`);

    updateStep("commits", "active", "최근 100개 커밋 확인 중");
    await wait(300);
    const myCommits = getMyCommits(data.commits, myLogin);
    updateStep("commits", "done", `${myLogin} 커밋 ${myCommits.length}개 확인`);

    updateStep("summary", "active", "참여자/기여도/내 작업 내용 정리 중");
    await wait(300);
    renderContributors(contributors);
    const myMessages = renderMyWork(myLogin, myCommits);
    summaryOutput.textContent = createSummary({
      repository: data.repository,
      contributors,
      myLogin,
      myMessages,
    });
    updateStep("summary", "done", "분석 결과 생성 완료");
  } catch (error) {
    updateStep("contributors", "error", "GitHub API 요청 실패");
    updateStep("commits", "error", "커밋 분석 중단");
    updateStep("summary", "error", "결과 생성 실패");
    renderError(
      "GitHub API에서 Repository 데이터를 가져오지 못했습니다. 공개 저장소인지, URL이 정확한지 확인해 주세요.",
    );
  }
}

async function copySummary() {
  try {
    await navigator.clipboard.writeText(summaryOutput.textContent);
    copyStatus.textContent = "분석 요약을 클립보드에 복사했습니다.";
  } catch (error) {
    copyStatus.textContent = "브라우저 권한 때문에 자동 복사에 실패했습니다. 내용을 직접 선택해 복사해 주세요.";
  }
}

form.addEventListener("submit", runAnalysis);
copyButton.addEventListener("click", copySummary);
