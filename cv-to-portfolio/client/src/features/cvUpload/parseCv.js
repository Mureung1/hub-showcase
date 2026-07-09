// ============================================================
//  마크다운 이력서(CV) → 구조화 데이터 파서
//  업로드된 CV는 형식이 제각각이라 "관대하게" 파싱한다.
//  실패해도 원문(raw)은 항상 보존한다.
// ============================================================

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const URL_RE = /https?:\/\/[^\s)]+/g;

function stripBullet(line) {
  return line.replace(/^\s*[-*•]\s+/, "").trim();
}

// 섹션 제목을 표준 키로 매핑 (한/영 모두)
function sectionKey(title) {
  const t = title.toLowerCase();
  if (/(summary|요약|소개|about)/.test(t)) return "summary";
  if (/(skill|기술|스택|stack)/.test(t)) return "skills";
  if (/(experience|경력|경험|career|work)/.test(t)) return "experience";
  if (/(project|프로젝트|작업)/.test(t)) return "projects";
  if (/(education|학력|교육)/.test(t)) return "education";
  return null;
}

export function parseCv(md) {
  const text = (md || "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");

  let name = "";
  let seenName = false;
  let cur = null; // "__header__" | 섹션 키 | null
  const headerLines = [];
  const sections = {};

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");
    const h1 = line.match(/^#\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);

    if (h1 && !seenName) {
      name = h1[1].trim();
      seenName = true;
      cur = "__header__";
      continue;
    }
    if (h2) {
      cur = sectionKey(h2[1].trim()) || "_" + h2[1].trim();
      sections[cur] = sections[cur] || [];
      continue;
    }
    if (cur === "__header__") {
      if (line.trim()) headerLines.push(line.trim());
    } else if (cur && sections[cur]) {
      sections[cur].push(line);
    }
  }

  // 헤더 블록: 첫 줄 = 직함, 나머지 = 연락처
  const title = headerLines[0] || "";
  const contactText = headerLines.slice(1).join(" · ") || headerLines.join(" ");

  return {
    name,
    title,
    contacts: parseContacts(contactText),
    summary: (sections.summary || []).map((l) => l.trim()).filter(Boolean).join(" "),
    skills: parseSkills(sections.skills || []),
    experience: parseEntries(sections.experience || []),
    projects: parseEntries(sections.projects || []),
    education: (sections.education || []).map(stripBullet).filter(Boolean),
    raw: text,
  };
}

function parseContacts(s) {
  const contacts = [];
  const email = s.match(EMAIL_RE);
  if (email) contacts.push({ type: "email", value: email[0] });
  (s.match(URL_RE) || []).forEach((u) => {
    const value = u.replace(/[.,]$/, "");
    contacts.push({ type: /github/i.test(u) ? "github" : "link", value });
  });
  const gh = s.match(/github\.com\/[\w-]+/i);
  if (gh && !contacts.some((c) => c.value.includes(gh[0]))) {
    contacts.push({ type: "github", value: gh[0] });
  }
  return contacts;
}

function parseSkills(sectionLines) {
  return sectionLines
    .map(stripBullet)
    .filter(Boolean)
    .join(", ")
    .split(/[,·|/]| - /)
    .map((s) => s.trim())
    .filter((s) => s && s.length < 40);
}

// "### 회사 — 역할 (기간)" + 불릿 형태를 엔트리 배열로
function parseEntries(sectionLines) {
  const entries = [];
  let cur = null;
  for (const raw of sectionLines) {
    const line = raw.trim();
    if (!line) continue;
    const h3 = raw.match(/^###\s+(.*)/);
    const bold = raw.match(/^\*\*(.+?)\*\*\s*(.*)$/);
    if (h3 || bold) {
      if (cur) entries.push(cur);
      cur = { ...splitHead((h3 ? h3[1] : bold[1]).trim()), bullets: [] };
      const trailing = bold ? bold[2].trim() : "";
      if (trailing) cur.bullets.push(trailing);
    } else if (/^\s*[-*•]/.test(raw)) {
      if (!cur) cur = { title: "", role: "", period: "", bullets: [] };
      cur.bullets.push(stripBullet(raw));
    } else {
      if (!cur) cur = { title: line, role: "", period: "", bullets: [] };
      else cur.bullets.push(line);
    }
  }
  if (cur) entries.push(cur);
  return entries;
}

// "회사 — 역할 (2021-2023)" 를 title/role/period 로 분해
function splitHead(head) {
  let period = "";
  let rest = head;
  const pm = head.match(/\(([^)]*)\)\s*$/);
  if (pm) {
    period = pm[1].trim();
    rest = head.slice(0, pm.index).trim();
  }
  const parts = rest.split(/\s*[—–-]\s*|\s*\/\s*|\s*·\s*/);
  return {
    title: (parts[0] || rest).trim(),
    role: (parts[1] || "").trim(),
    period,
  };
}
