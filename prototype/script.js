const form = document.querySelector("#repo-form");
const repoInput = document.querySelector("#repo-url");
const analyzeButton = document.querySelector("#analyze-button");
const feedback = document.querySelector("#analysis-feedback");

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

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

function escapeHTML(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function getCommitLogin(commit) {
  return commit.author?.login || commit.commit.author?.name || "unknown";
}

function normalizeMessage(message) {
  return message.trim().replace(/\s+/g, " ");
}

function calculateContributors(contributors) {
  const total = contributors.reduce((sum, contributor) => sum + contributor.contributions, 0);

  return contributors.slice(0, 5).map((contributor) => ({
    login: contributor.login,
    count: contributor.contributions,
    percent: total === 0 ? 0 : Math.round((contributor.contributions / total) * 1000) / 10,
  }));
}

async function analyzeRepository(owner, repo) {
  const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;
  const [repository, contributors, commits] = await Promise.all([
    fetchJson(baseUrl),
    fetchJson(`${baseUrl}/contributors?per_page=100`),
    fetchJson(`${baseUrl}/commits?per_page=100`),
  ]);

  const topContributors = calculateContributors(contributors);
  const ownerCommits = commits.filter((commit) => getCommitLogin(commit).toLowerCase() === owner.toLowerCase());
  const ownerMessages = [
    ...new Set(ownerCommits.map((commit) => normalizeMessage(commit.commit.message.split("\n")[0])).filter(Boolean)),
  ].slice(0, 4);

  return {
    name: repository.full_name,
    url: repository.html_url,
    owner,
    contributors: topContributors,
    ownerMessages,
  };
}

function renderSpinner() {
  feedback.innerHTML = `
    <div class="analysis-status" role="status">
      <div class="brand-spinner" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div>
        <strong>Repository를 분석하고 있어요</strong>
        <span>참여자, 기여도, 최근 커밋 흐름을 확인하는 중입니다.</span>
      </div>
    </div>
  `;
}

function renderError(message) {
  feedback.innerHTML = `
    <div class="analysis-status error" role="status">
      <div class="brand-spinner" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div>
        <strong>분석할 수 없습니다</strong>
        <span>${escapeHTML(message)}</span>
      </div>
    </div>
  `;
}

function renderResult(result) {
  const contributors = result.contributors
    .map(
      (contributor) => `
        <li>
          <strong>${escapeHTML(contributor.login)}</strong>
          <span>${contributor.count} commits</span>
          <em>${contributor.percent}%</em>
        </li>
      `,
    )
    .join("");

  const workItems =
    result.ownerMessages.length > 0
      ? result.ownerMessages.map((message) => `<li>${escapeHTML(message)}</li>`).join("")
      : "<p>최근 100개 커밋 안에서 repository owner의 커밋을 찾지 못했습니다.</p>";

  feedback.innerHTML = `
    <section class="analysis-result-page" aria-label="Repository 분석 결과">
      <div class="result-heading">
        <span class="section-label">Analysis Result</span>
        <h2>${escapeHTML(result.name)}</h2>
        <a href="${result.url}" target="_blank" rel="noreferrer">GitHub에서 보기</a>
      </div>

      <div class="result-grid">
        <article>
          <h3>프로젝트 참여자</h3>
          <ul class="contributor-preview">${contributors}</ul>
        </article>

        <article>
          <h3>${escapeHTML(result.owner)}의 주요 작업</h3>
          ${result.ownerMessages.length > 0 ? `<ul class="work-preview">${workItems}</ul>` : workItems}
        </article>
      </div>
    </section>
  `;
}

async function runAnalysis(event) {
  event.preventDefault();
  const parsed = parseGitHubUrl(repoInput.value);

  if (!parsed) {
    renderError("https://github.com/owner/repository 형식으로 입력해 주세요.");
    return;
  }

  analyzeButton.disabled = true;
  analyzeButton.textContent = "분석 중";
  renderSpinner();

  try {
    const [result] = await Promise.all([analyzeRepository(parsed.owner, parsed.repo), wait(900)]);
    renderResult(result);
  } catch (error) {
    renderError("Repository 데이터를 가져오지 못했습니다. 공개 저장소인지 확인해 주세요.");
  } finally {
    analyzeButton.disabled = false;
    analyzeButton.textContent = "분석 시작";
  }
}

function resetFeedback() {
  feedback.innerHTML = "";
}

form.addEventListener("submit", runAnalysis);
repoInput.addEventListener("input", resetFeedback);
