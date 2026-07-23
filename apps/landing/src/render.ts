import {
  decodeLandingReleaseDisplay,
  type LandingReleaseDisplay,
} from './release-display.js'

type DecodedLandingReleaseDisplay = ReturnType<
  typeof decodeLandingReleaseDisplay
>

export function renderLandingDocument(input: unknown): string {
  const display = decodeLandingReleaseDisplay(input)
  const release = display.release
  const compatibility = display.compatibility
  const runtime = display.runtime
  const links = display.links

  return `<!doctype html>
<html lang="ko" data-release-channel="${escapeAttribute(release.channel)}" data-release-version="${escapeAttribute(release.applicationVersion)}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="AY-PLE은 Codex와 함께 한 학기를 준비하고 관리하는 local-first 학업 companion입니다.">
    <meta name="color-scheme" content="light">
    <title>AY-PLE — 한 학기를 함께 관리하는 AY</title>
    <link rel="stylesheet" href="./landing.css">
  </head>
  <body>
    <a class="skip-link" href="#main-content">본문으로 바로가기</a>
    <header class="site-header">
      <a class="wordmark" href="#main-content" aria-label="AY-PLE 홈">
        <span class="wordmark-symbol" aria-hidden="true">AY</span>
        <span class="wordmark-copy">
          <strong>AY-PLE</strong>
          <small>Academic Year companion</small>
        </span>
      </a>
      <nav class="site-nav" aria-label="주요 링크">
        <a href="${escapeAttribute(links.docs.url)}">Docs</a>
        <a href="${escapeAttribute(links.github.url)}">GitHub</a>
        <a class="nav-release" href="${escapeAttribute(links.releaseEvidence.url)}">
          Preview ${escapeHtml(release.applicationVersion)}
        </a>
      </nav>
    </header>

    <main id="main-content">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-orbit hero-orbit-one" aria-hidden="true"></div>
        <div class="hero-orbit hero-orbit-two" aria-hidden="true"></div>
        <div class="hero-intro">
          <div class="hero-copy">
            <p class="eyebrow">YOUR SEMESTER, WITH AY</p>
            <h1 id="hero-title">한 학기를 함께 관리하는 AY</h1>
            <p class="hero-lede">
              흩어진 학기 자료와 해야 할 일을, 나만의 학기 공간에서 Codex와 함께
              정리해 가세요. 첫 preview는 그 공간을 안전하게 준비하는 데서 시작합니다.
            </p>
          </div>
          <aside class="hero-note" aria-label="제품 방향">
            <span class="hero-note-index">01</span>
            <p>
              AY는 한 번 답하고 사라지는 챗봇이 아니라, 학기 전체의 맥락을 함께
              쌓아 가는 동료를 지향합니다.
            </p>
          </aside>
        </div>

        <div class="release-card" aria-labelledby="release-card-title">
          <div class="release-main">
            <div class="release-heading">
              <p class="release-kicker">
                <span class="status-dot" aria-hidden="true"></span>
                CURRENT PUBLIC PREVIEW
              </p>
              <p class="release-version">v${escapeHtml(release.applicationVersion)}</p>
            </div>
            <h2 id="release-card-title">Terminal에서 AY를 시작하세요</h2>
            <div class="command-shell">
              <code id="release-command">${escapeHtml(release.exactCommand)}</code>
              <button
                class="copy-button"
                type="button"
                data-copy-command
                data-command="${escapeAttribute(release.exactCommand)}"
                aria-describedby="command-copy-status"
              >
                <span aria-hidden="true">⌘</span>
                명령 복사
              </button>
            </div>
            <p
              class="copy-status"
              id="command-copy-status"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            ></p>
            <p class="command-help">
              npm project 밖의 Terminal에서 실행하세요. 처음에는 npm 설치 확인을 직접
              승인하고, AY를 사용하는 동안 Terminal을 열어 둡니다.
            </p>
          </div>
          <div class="release-boundary">
            <p class="mini-label">이번 preview에서</p>
            <ol class="preview-path">
              <li>Codex 연결</li>
              <li>새 SemesterWorkspace 생성</li>
              <li>학기 공간 준비 완료</li>
              <li>같은 version으로 다시 열기</li>
            </ol>
            <p class="prerequisite-note">
              ${escapeHtml(compatibility.platformLabel)} · macOS
              ${escapeHtml(compatibility.minimumMacosVersion)}+ ·
              ${escapeHtml(compatibility.accountLabel)} 필요
            </p>
          </div>
        </div>
      </section>

      <section class="field-guide section-shell" aria-labelledby="field-guide-title">
        <div class="section-heading">
          <p class="eyebrow">FIRST-RUN FIELD GUIDE</p>
          <h2 id="field-guide-title">Landing에서 학기 준비까지, 한 줄로 이어집니다</h2>
          <p>
            이 페이지는 제품과 release 정보를 설명할 뿐 로그인이나 파일 변경을 하지
            않습니다. 실제 setup은 exact command가 여는 local AY-PLE에서 진행합니다.
          </p>
        </div>
        <ol class="journey-steps">
          <li>
            <span class="step-index">01</span>
            <strong>Landing</strong>
            <p>현재 가능한 범위와 실행 조건을 먼저 확인합니다.</p>
          </li>
          <li>
            <span class="step-index">02</span>
            <strong>Exact npx</strong>
            <p>고정된 application version을 Terminal에서 실행합니다.</p>
          </li>
          <li>
            <span class="step-index">03</span>
            <strong>Verified Runtime</strong>
            <p>환경을 점검하고 exact Runtime을 검증해 준비합니다.</p>
          </li>
          <li>
            <span class="step-index">04</span>
            <strong>Managed OAuth</strong>
            <p>공식 Browser login으로 기존 ChatGPT account를 연결합니다.</p>
          </li>
          <li>
            <span class="step-index">05</span>
            <strong>Guided Setup</strong>
            <p>학년·학기와 위치를 고르면 AY가 새 학기 공간을 만듭니다.</p>
          </li>
          <li>
            <span class="step-index">06</span>
            <strong>Semester Ready</strong>
            <p>Compact status center에서 준비가 끝났음을 확인합니다.</p>
          </li>
        </ol>
      </section>

      <section class="promise-boundary section-shell" aria-labelledby="promise-title">
        <div class="section-heading compact-heading">
          <p class="eyebrow">THE HONEST PREVIEW BOUNDARY</p>
          <h2 id="promise-title">지금 되는 것과 다음에 올 것을 분명히 말합니다</h2>
        </div>
        <div class="promise-grid">
          <article class="promise-card available-card">
            <div class="promise-title-row">
              <span class="availability-badge available">AVAILABLE</span>
              <span>현재 preview</span>
            </div>
            <ul class="check-list">
              <li>Exact <code>npx</code> application 실행</li>
              <li>Immutable verified Runtime 준비와 cache reuse</li>
              <li>Codex-managed ChatGPT Browser 연결</li>
              <li>새 app-owned <code>SemesterWorkspace</code> 생성</li>
              <li><strong>학기 공간 준비 완료</strong>와 same-version relaunch</li>
            </ul>
          </article>
          <article class="promise-card next-card">
            <div class="promise-title-row">
              <span class="availability-badge next">COMING NEXT</span>
              <span>다음 제품 여정</span>
            </div>
            <ul class="arrow-list">
              <li>첫 자료 가져오기와 archive</li>
              <li>Course 구성과 자료 연결</li>
              <li>과제·시험·일정을 함께 조율하는 학업 action</li>
            </ul>
            <p class="scope-note">
              LMS·Calendar·cloud sync와 <code>.app</code>·<code>.dmg</code>는 이번
              preview의 제공 범위가 아닙니다.
            </p>
          </article>
        </div>
      </section>

      <section class="release-ledger section-shell" aria-labelledby="ledger-title">
        <div class="section-heading">
          <p class="eyebrow">COMPATIBILITY &amp; RELEASE TRUTH</p>
          <h2 id="ledger-title">실행 전에 알아야 할 조건을 숨기지 않습니다</h2>
          <p>
            아래 값은 이 Landing이 추측한 값이 아니라, 같은 application release에
            묶인 read-only display artifact를 그대로 표시합니다.
          </p>
        </div>
        <div class="ledger-layout">
          <article class="ledger-card compatibility-card">
            <div class="card-heading-row">
              <h3>지원 환경</h3>
              <span>BOUND TO v${escapeHtml(release.applicationVersion)}</span>
            </div>
            <dl class="compatibility-list">
              <div>
                <dt>Mac</dt>
                <dd>${escapeHtml(compatibility.platformLabel)}</dd>
              </div>
              <div>
                <dt>macOS</dt>
                <dd>${escapeHtml(compatibility.minimumMacosVersion)} 이상</dd>
              </div>
              <div>
                <dt>Node</dt>
                <dd><code>${escapeHtml(compatibility.nodeRange)}</code></dd>
              </div>
              <div>
                <dt>npm</dt>
                <dd><code>${escapeHtml(compatibility.npmRange)}</code></dd>
              </div>
              <div>
                <dt>Browser</dt>
                <dd>${renderBrowserList(compatibility.browsers)}</dd>
              </div>
              <div>
                <dt>Account</dt>
                <dd>${escapeHtml(compatibility.accountLabel)}</dd>
              </div>
            </dl>
          </article>

          <article class="ledger-card runtime-card">
            <div class="card-heading-row">
              <h3>Runtime과 저장 공간</h3>
              <span>RUNTIME ${escapeHtml(runtime.releaseId)}</span>
            </div>
            <div class="metric-grid">
              ${renderByteMetric(
                '첫 Runtime download',
                runtime.firstDownloadBytes,
                'exact archive bytes',
              )}
              ${renderByteMetric(
                '설치된 Runtime',
                runtime.installedRegularBytes,
                'recipient regular bytes',
              )}
              ${renderByteMetric(
                '권장 여유 공간',
                runtime.conservativeFreeSpaceBytes,
                'conservative first-install bound',
              )}
            </div>
            <div class="cache-location">
              <span>Verified cache</span>
              <code>${escapeHtml(runtime.cacheDisplayLocation)}</code>
              <p>
                Verified archive와 generation을 보관해 같은 release를 다시 검증하고
                재사용합니다. AY-PLE app-data parent 전체를 지우는 복구는 권하지 않습니다.
              </p>
            </div>
          </article>
        </div>
        <div class="network-strip">
          <span>첫 실행 network</span>
          <ul>${compatibility.networkLabels
            .map((label) => `<li>${escapeHtml(label)}</li>`)
            .join('')}</ul>
        </div>
        ${renderRollback(display)}
      </section>

      <section class="trust-section section-shell" aria-labelledby="trust-title">
        <div class="section-heading">
          <p class="eyebrow">LOCAL-FIRST, NOT OFFLINE</p>
          <h2 id="trust-title">내 Mac에 두되, network 경계까지 정직하게</h2>
        </div>
        <div class="trust-grid">
          <article>
            <span class="trust-index">01</span>
            <h3>Local workspace</h3>
            <p>
              SemesterWorkspace, AY-PLE app state와 verified Runtime cache는 사용자의
              Mac에 저장합니다.
            </p>
          </article>
          <article>
            <span class="trust-index">02</span>
            <h3>Managed credential</h3>
            <p>
              Official Codex-managed Browser login을 사용합니다. Credential byte는
              AY-PLE product origin·API·Browser storage나 workspace를 통과하지 않습니다.
            </p>
          </article>
          <article>
            <span class="trust-index">03</span>
            <h3>Provider network</h3>
            <p>
              Codex 대화, Agent가 읽은 workspace content와 tool result는 OpenAI로
              전송될 수 있습니다.
            </p>
          </article>
          <article>
            <span class="trust-index">04</span>
            <h3>No AY cloud</h3>
            <p>
              이번 preview에는 AY-PLE-owned analytics·telemetry·crash upload와 cloud
              backend가 없습니다.
            </p>
          </article>
        </div>
      </section>

      <section class="recovery-section section-shell" aria-labelledby="recovery-title">
        <div class="section-heading compact-heading">
          <p class="eyebrow">BOUNDED RECOVERY</p>
          <h2 id="recovery-title">실행이 멈춰도, 다른 version으로 몰래 넘어가지 않습니다</h2>
        </div>
        <div class="recovery-grid">
          <article>
            <h3>환경이 맞지 않을 때</h3>
            <p>발견한 값과 지원 범위를 확인하고 prerequisite를 맞춘 뒤 exact command를 다시 실행합니다.</p>
          </article>
          <article>
            <h3>Network·download가 끊겼을 때</h3>
            <p>연결을 확인하고 같은 command를 다시 실행합니다. Mirror나 다른 Runtime으로 fallback하지 않습니다.</p>
          </article>
          <article>
            <h3>무결성·cache가 안전하지 않을 때</h3>
            <p>손상 byte를 실행하거나 app-data root를 통째로 지우지 않고 release evidence와 recovery guide를 확인합니다.</p>
          </article>
          <article>
            <h3>Codex 연결이 끝나지 않았을 때</h3>
            <p>Local AY-PLE에서 official ChatGPT Browser login을 다시 시작합니다. Workspace Ready를 합성하지 않습니다.</p>
          </article>
        </div>
      </section>

      <section class="trust-links section-shell" aria-labelledby="links-title">
        <div class="section-heading compact-heading">
          <p class="eyebrow">OPEN THE RECEIPTS</p>
          <h2 id="links-title">Source와 trust evidence를 직접 확인하세요</h2>
        </div>
        <div class="link-grid">
          ${renderPublicLink('Docs', '사용 방법과 제품 경계', links.docs.url)}
          ${renderPublicLink('GitHub', 'Public source repository', links.github.url)}
          ${renderPublicLink(
            'Release evidence',
            `Application v${release.applicationVersion}`,
            links.releaseEvidence.url,
          )}
          ${renderPublicLink('Privacy', 'Local·provider data boundary', links.privacy.url)}
          ${renderPublicLink('Security', 'Confidential reporting path', links.security.url)}
          ${renderPublicLink('Apache-2.0', 'First-party license', links.license.url)}
          ${renderPublicLink('NOTICE', 'Copyright and attribution', links.notice.url)}
          ${renderPublicLink(
            'Third-party notices',
            'Redistribution notices',
            links.thirdPartyNotices.url,
          )}
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div>
        <span class="wordmark-symbol footer-symbol" aria-hidden="true">AY</span>
        <p><strong>AY-PLE</strong><br>한 학기를 함께 관리하는 AY</p>
      </div>
      <p>
        Public preview v${escapeHtml(release.applicationVersion)} ·
        <a href="${escapeAttribute(links.license.url)}">Apache-2.0</a>
      </p>
    </footer>

    <script type="module">
      const button = document.querySelector('[data-copy-command]')
      const status = document.querySelector('#command-copy-status')

      button?.addEventListener('click', async () => {
        const command = button.dataset.command
        if (!command || !status) return

        try {
          await navigator.clipboard.writeText(command)
          status.textContent = 'Exact command를 복사했어요.'
          button.dataset.copied = 'true'
        } catch {
          status.textContent = '복사하지 못했어요. 위 명령을 선택해 직접 복사해 주세요.'
          delete button.dataset.copied
        }
      })
    </script>
  </body>
</html>
`
}

function renderBrowserList(
  browsers: LandingReleaseDisplay['compatibility']['browsers'],
): string {
  return browsers
    .map(
      (browser) =>
        `${escapeHtml(browser.name)} ${browser.minimumMajor.toString()}+`,
    )
    .join('<br>')
}

function renderByteMetric(
  label: string,
  bytes: number,
  detail: string,
): string {
  return `<div class="metric" data-bytes="${bytes.toString()}">
    <span class="metric-label">${escapeHtml(label)}</span>
    <strong>${escapeHtml(formatDecimalBytes(bytes))}</strong>
    <span class="metric-bytes">${bytes.toString()} bytes</span>
    <small>${escapeHtml(detail)}</small>
  </div>`
}

function formatDecimalBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) {
    return `${(bytes / 1_000_000_000).toFixed(2)} GB`
  }
  return `${(bytes / 1_000_000).toFixed(2)} MB`
}

function renderRollback(display: DecodedLandingReleaseDisplay): string {
  const rollback = display.rollback
  if (rollback === null) return ''

  return `<aside class="rollback-note">
    <div>
      <span>이전 지원 버전</span>
      <strong>v${escapeHtml(rollback.applicationVersion)}</strong>
    </div>
    <code>${escapeHtml(rollback.exactCommand)}</code>
    <a href="${escapeAttribute(rollback.releaseEvidence.url)}">Release evidence 확인</a>
  </aside>`
}

function renderPublicLink(
  label: string,
  description: string,
  url: string,
): string {
  return `<a class="public-link" href="${escapeAttribute(url)}">
    <span>
      <strong>${escapeHtml(label)}</strong>
      <small>${escapeHtml(description)}</small>
    </span>
    <span aria-hidden="true">↗</span>
  </a>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeAttribute(value: string): string {
  return escapeHtml(value)
}
