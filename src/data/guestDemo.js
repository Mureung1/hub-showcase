import { sampleAnalysisResults } from "./sampleAnalysisResults.js";
import { rematchAnalysisResult } from "../services/rematchAnalysisResult.js";
import { normalizeAnalysisResult } from "../utils/normalizeAnalysisResult.js";

export const guestDemoSource = Object.freeze({
  category: "시연",
  id: "guest-demo",
  knownUrls: [],
  linkSelector: "a[href]",
  name: "UniRadar 시연 공고",
  sourceMode: "demo",
  targetUrl: "https://demo.uniradar.local/notices",
});

export const guestDemoProfile = Object.freeze({
  availableHoursPerWeek: 6,
  canJoinTeam: true,
  gpa: null,
  grade: 2,
  id: "guest-demo-profile",
  incomeBracket: null,
  interests: ["AI", "소프트웨어", "공모전"],
  languageScores: [],
  majors: ["컴퓨터학부"],
  regions: ["대구", "온라인"],
  school: "시연대학교",
  updatedAt: "2026-07-31T00:00:00.000Z",
});

const demoLinks = Object.freeze([
  { publishedAt: "2026-07-30", title: "2026 AI 소프트웨어 공모전 참가자 모집", url: "https://demo.uniradar.local/notices/ai-contest" },
  { publishedAt: "2026-07-29", title: "지역인재 장학금 신청 안내", url: "https://demo.uniradar.local/notices/scholarship" },
  { publishedAt: "2026-07-28", title: "대학생 대외활동 참가자 모집", url: "https://demo.uniradar.local/notices/activity" },
]);

function sampleForLink(link) {
  if (link.url.includes("scholarship")) return sampleAnalysisResults[1];
  if (link.url.includes("activity")) return sampleAnalysisResults[3];
  return sampleAnalysisResults[0];
}

export function createGuestDemoScan(source = guestDemoSource) {
  return {
    allLinks: demoLinks.map((link) => ({ ...link })),
    fetchedAt: new Date().toISOString(),
    newLinks: demoLinks.map((link) => ({ ...link })),
    sourceMode: "demo",
    targetUrl: source.targetUrl,
  };
}

export function analyzeGuestDemoNotice(link, profile) {
  const sample = sampleForLink(link);
  const baseResult = normalizeAnalysisResult({
    ...sample,
    analyzedAt: new Date().toISOString(),
    id: `guest-demo-${link.url.split("/").pop() || "notice"}`,
    opportunity: {
      ...sample.opportunity,
      sourceUrl: link.url,
      title: link.title || sample.opportunity.title,
    },
  });

  return rematchAnalysisResult(baseResult, profile);
}
