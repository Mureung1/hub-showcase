// ============================================================
//  포트폴리오 생성 엔진 (프로토타입)
//  입력: 파싱된 CV + 선택한 테마(디자인 토큰)
//  출력: 독립 실행형 HTML 문자열 (그대로 저장/배포 가능)
//
//  실서비스에서는 이 결정적 렌더러를 LLM 호출로 교체할 수 있다.
//  → 같은 폴더의 generateWithAI.js 참고 (seam).
// ============================================================

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function contactHref(c) {
  if (c.type === "email") return "mailto:" + c.value;
  if (/^https?:\/\//i.test(c.value)) return c.value;
  return "https://" + c.value;
}
function contactLabel(c) {
  return c.value.replace(/^https?:\/\//i, "").replace(/^mailto:/, "");
}
function contactChip(c) {
  return `<a class="contact" href="${esc(contactHref(c))}" target="_blank" rel="noopener"><span class="k">${esc(
    c.type
  )}</span>${esc(contactLabel(c))}</a>`;
}

function monogram(name) {
  const n = (name || "").trim();
  if (!n) return "CV";
  if (/[가-힣]/.test(n)) return n.slice(0, 2);
  return n
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function section(title, inner, show, cls = "") {
  if (!show) return "";
  return `<section class="section ${cls}"><div class="section-title">${esc(
    title
  )}</div>${inner}</section>`;
}

function renderEntry(e) {
  const head = `<div class="entry-head"><span class="entry-title">${esc(e.title || "")}</span>${
    e.role ? `<span class="entry-role">${esc(e.role)}</span>` : ""
  }${e.period ? `<span class="entry-period">${esc(e.period)}</span>` : ""}</div>`;
  const bullets =
    e.bullets && e.bullets.length
      ? `<ul class="bullets">${e.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`
      : "";
  return `<div class="entry">${head}${bullets}</div>`;
}

function skillTags(cv) {
  return `<div class="tags">${cv.skills.map((s) => `<span class="tag">${esc(s)}</span>`).join("")}</div>`;
}
function eduList(cv) {
  return `<ul class="edu">${cv.education.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>`;
}

// ── 헤더 (single-column / timeline 레이아웃용) ──
function renderHeader(cv, t) {
  const name = esc(cv.name || "이력서");
  const title = cv.title ? `<div class="title">${esc(cv.title)}</div>` : "";
  const contacts = cv.contacts.length
    ? `<div class="contacts">${cv.contacts.map(contactChip).join("")}</div>`
    : "";

  if (t.headerStyle === "banner") {
    const sum = cv.summary ? `<div class="banner-sum">${esc(cv.summary)}</div>` : "";
    return `<header class="hd hd-banner"><div class="name">${name}</div>${title}${sum}${contacts}</header>`;
  }
  if (t.headerStyle === "split") {
    return `<header class="hd hd-split"><div><div class="name">${name}</div>${title}</div>${contacts}</header>`;
  }
  return `<header class="hd hd-centered"><div class="name">${name}</div>${title}${contacts}</header>`;
}

// ── 세로 스택 본문 (single-column, timeline) ──
function stackBody(cv, t) {
  const bannerHasSummary = t.headerStyle === "banner" && cv.summary;
  return `<div class="wrap">
${renderHeader(cv, t)}
<main class="main">
${section("소개", `<p class="summary">${esc(cv.summary)}</p>`, cv.summary && !bannerHasSummary)}
${section("기술", skillTags(cv), cv.skills.length > 0)}
${section("경력", cv.experience.map(renderEntry).join(""), cv.experience.length > 0, "exp")}
${section("프로젝트", cv.projects.map(renderEntry).join(""), cv.projects.length > 0, "proj")}
${section("학력", eduList(cv), cv.education.length > 0)}
</main>
</div>`;
}

// ── 사이드바 그리드 본문 (sidebar, two-column) ──
function gridBody(cv, t) {
  const avatar =
    t.headerStyle === "sidebar-profile"
      ? `<div class="avatar">${esc(monogram(cv.name))}</div>`
      : "";
  const contacts = cv.contacts.length
    ? `<div class="aside-sec"><h4>Contact</h4><div class="contacts">${cv.contacts
        .map(contactChip)
        .join("")}</div></div>`
    : "";
  const skills = cv.skills.length
    ? `<div class="aside-sec"><h4>Skills</h4>${skillTags(cv)}</div>`
    : "";

  return `<div class="wrap"><div class="grid">
<aside class="aside">
${avatar}
<div class="name">${esc(cv.name || "이력서")}</div>
${cv.title ? `<div class="title">${esc(cv.title)}</div>` : ""}
${contacts}
${skills}
</aside>
<main class="main">
${section("소개", `<p class="summary">${esc(cv.summary)}</p>`, !!cv.summary)}
${section("경력", cv.experience.map(renderEntry).join(""), cv.experience.length > 0, "exp")}
${section("프로젝트", cv.projects.map(renderEntry).join(""), cv.projects.length > 0, "proj")}
${section("학력", eduList(cv), cv.education.length > 0)}
</main>
</div></div>`;
}

function buildCss(t) {
  return `
*{box-sizing:border-box;}
:root{
  --bg:${t.bg};--surface:${t.surface};--text:${t.text};--muted:${t.textMuted};
  --accent:${t.accent};--accent2:${t.accent2};--border:${t.border};--radius:${t.radius};
}
html{scroll-behavior:smooth;}
body{margin:0;background:var(--bg);color:var(--text);font-family:${t.fontBody};line-height:1.65;-webkit-font-smoothing:antialiased;}
h1,h2,h3,h4{font-family:${t.fontHeading};margin:0;line-height:1.22;}
a{color:var(--accent);text-decoration:none;}
a:hover{text-decoration:underline;}
p{margin:0 0 10px;}
ul{margin:0;padding:0;list-style:none;}

.wrap{max-width:860px;margin:0 auto;padding:56px 32px 56px;}
.section{margin-top:32px;}
.section-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:var(--accent);margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid var(--border);}
.summary{font-size:15px;}
.entry{margin-bottom:18px;}
.entry-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;margin-bottom:6px;}
.entry-title{font-weight:700;font-size:16px;}
.entry-role{color:var(--accent2);font-weight:600;font-size:13.5px;}
.entry-period{margin-left:auto;color:var(--muted);font-size:12.5px;}
.bullets li{position:relative;padding-left:16px;margin-bottom:5px;}
.bullets li::before{content:"";position:absolute;left:2px;top:9px;width:5px;height:5px;border-radius:50%;background:var(--accent);}
.tags{display:flex;flex-wrap:wrap;gap:7px;}
.tag{font-size:12.5px;padding:4px 11px;border-radius:999px;background:var(--surface);border:1px solid var(--border);}
.edu li{margin-bottom:6px;}
.contacts{display:flex;flex-wrap:wrap;gap:8px;}
.contact{display:inline-flex;align-items:center;gap:6px;font-size:13px;padding:4px 11px;border-radius:999px;background:var(--surface);border:1px solid var(--border);}
.contact .k{color:var(--muted);font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;}

/* 헤더: centered */
.hd-centered{text-align:center;padding-bottom:22px;border-bottom:1px solid var(--border);}
.hd-centered .name{font-size:40px;font-weight:800;}
.hd-centered .title{color:var(--muted);font-size:16px;margin-top:6px;}
.hd-centered .contacts{justify-content:center;margin-top:14px;}
/* 헤더: split */
.hd-split{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:14px;padding-bottom:22px;border-bottom:1px solid var(--border);}
.hd-split .name{font-size:38px;font-weight:800;}
.hd-split .title{color:var(--muted);font-size:15px;margin-top:4px;}
.hd-split .contacts{flex-direction:column;align-items:flex-end;gap:5px;}
/* 헤더: banner */
.hd-banner{margin:-56px -32px 10px;padding:52px 32px 40px;background-image:linear-gradient(135deg,rgba(0,0,0,.30),rgba(0,0,0,.30)),linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border-radius:0 0 var(--radius) var(--radius);}
.hd-banner .name{font-size:46px;font-weight:800;text-shadow:0 2px 18px rgba(0,0,0,.35);}
.hd-banner .title{font-size:18px;opacity:.96;margin-top:6px;}
.hd-banner .banner-sum{margin-top:12px;max-width:640px;opacity:.95;}
.hd-banner .contacts{margin-top:16px;}
.hd-banner .contact{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.28);color:#fff;}
.hd-banner .contact .k{color:rgba(255,255,255,.8);}

/* 그리드 레이아웃 (sidebar / two-column) */
.grid{display:grid;gap:36px;}
.layout-sidebar .grid{grid-template-columns:290px 1fr;}
.layout-two-column .grid{grid-template-columns:250px 1fr;}
.aside{align-self:start;position:sticky;top:24px;}
.layout-sidebar .aside{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;}
.aside .name{font-size:26px;font-weight:800;line-height:1.15;}
.aside .title{color:var(--muted);font-size:14px;margin:6px 0 4px;}
.aside-sec{margin-top:20px;}
.aside-sec h4{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--accent);margin:0 0 10px;}
.aside .contacts{flex-direction:column;gap:7px;}
.avatar{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:22px;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent2));margin-bottom:14px;}

/* 타임라인 레이아웃 */
.layout-timeline .section.exp .entry,.layout-timeline .section.proj .entry{position:relative;padding-left:22px;border-left:2px solid var(--border);}
.layout-timeline .section.exp .entry::before,.layout-timeline .section.proj .entry::before{content:"";position:absolute;left:-6px;top:6px;width:10px;height:10px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 3px var(--bg);}

.site-footer{max-width:860px;margin:36px auto 0;padding:18px 32px 40px;color:var(--muted);font-size:12px;border-top:1px solid var(--border);text-align:center;}

@media(max-width:640px){
  .wrap{padding:36px 20px 40px;}
  .hd-banner{margin:-36px -20px 10px;padding:38px 20px 30px;}
  .hd-banner .name{font-size:34px;}
  .hd-centered .name,.hd-split .name{font-size:30px;}
  .layout-sidebar .grid,.layout-two-column .grid{grid-template-columns:1fr;}
  .aside{position:static;}
}`;
}

export function generatePortfolio(cv, theme) {
  const t = theme.tokens;
  const isGrid = t.layout === "sidebar" || t.layout === "two-column";
  const body = isGrid ? gridBody(cv, t) : stackBody(cv, t);
  const fontLink = t.googleFontHref
    ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${esc(
        t.googleFontHref
      )}" rel="stylesheet">`
    : "";

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(cv.name || "Portfolio")} — Portfolio</title>
${fontLink}
<style>${buildCss(t)}</style>
</head>
<body class="layout-${t.layout} header-${t.headerStyle}">
${body}
<footer class="site-footer">Generated with <b>CV → 포트폴리오 생성기</b> · ${esc(theme.name)} 테마</footer>
</body>
</html>`;
}
