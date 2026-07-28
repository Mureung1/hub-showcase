import { writeFile } from "fs/promises";
import {
  extractActivityIds,
  extractNextData,
  extractActivity,
  mapActivityToPosting,
  isTestPosting,
  hasReasonableEssayLoad,
} from "./lib/linkareer.js";

const USER_AGENT = "Mozilla/5.0 (compatible; hub-crawler/1.0; +https://github.com/dohyeon-k/hub)";
const OUTPUT_PATH = new URL("../data/postings.crawled.json", import.meta.url);

const CATEGORY_CONFIG = [
  {
    category: "채용",
    targetCount: 40,
    listingUrl: (page) =>
      `https://linkareer.com/list/recruit?filterBy_jobTypes=NEW&filterBy_orgTypeIDs=1&filterBy_status=OPEN&orderBy_direction=DESC&orderBy_field=RECENT&page=${page}`,
  },
  {
    category: "인턴십",
    targetCount: 20,
    listingUrl: (page) =>
      `https://linkareer.com/list/intern?filterBy_orgTypeIDs=1&filterBy_status=OPEN&orderBy_direction=DESC&orderBy_field=RECENT&page=${page}`,
  },
  {
    category: "공모전",
    targetCount: 20,
    listingUrl: (page) =>
      `https://linkareer.com/list/contest?filterBy_status=OPEN&orderBy_direction=DESC&orderBy_field=RECENT&page=${page}`,
  },
  {
    category: "대외활동",
    targetCount: 20,
    listingUrl: (page) =>
      `https://linkareer.com/list/activity?filterBy_status=OPEN&orderBy_direction=DESC&orderBy_field=RECENT&page=${page}`,
  },
];

const MAX_PAGES_PER_CATEGORY = 10;
const REQUEST_DELAY_MS = 300;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`요청 실패 (${res.status}): ${url}`);
  }
  return res.text();
}

async function collectPostingsForCategory({ category, listingUrl, targetCount }, startId) {
  const postings = [];
  const seenIds = new Set();
  let page = 1;

  while (postings.length < targetCount && page <= MAX_PAGES_PER_CATEGORY) {
    const listingHtml = await fetchText(listingUrl(page));
    const activityIds = extractActivityIds(listingHtml);
    if (activityIds.length === 0) {
      break;
    }

    for (const activityId of activityIds) {
      if (postings.length >= targetCount) break;
      if (seenIds.has(activityId)) continue;
      seenIds.add(activityId);

      await sleep(REQUEST_DELAY_MS);
      try {
        const detailHtml = await fetchText(`https://linkareer.com/activity/${activityId}`);
        const activity = extractActivity(extractNextData(detailHtml));
        if (!activity) {
          console.warn(`[${category}] ${activityId} activity 데이터 없음, 건너뜀`);
          continue;
        }
        if (isTestPosting(activity)) {
          console.warn(`[${category}] ${activityId} 테스트 공고로 판단되어 건너뜀: ${activity.title}`);
          continue;
        }

        const posting = mapActivityToPosting(activity, { id: startId + postings.length, category });
        if (!hasReasonableEssayLoad(posting.essayQuestions)) {
          console.warn(
            `[${category}] ${activityId} 자소서 문항이 과도해(${posting.essayQuestions.length}문항) 건너뜀: ${posting.title}`,
          );
          continue;
        }
        postings.push(posting);
        console.log(`[${category}] (${postings.length}/${targetCount}) ${posting.org} - ${posting.title}`);
      } catch (err) {
        console.warn(`[${category}] ${activityId} 처리 실패: ${err.message}`);
      }
    }

    page += 1;
  }

  return postings;
}

async function main() {
  let nextId = 1;
  const allPostings = [];

  for (const config of CATEGORY_CONFIG) {
    console.log(`\n[${config.category}] 수집 시작 (목표 ${config.targetCount}건)`);
    const postings = await collectPostingsForCategory(config, nextId);
    if (postings.length < config.targetCount) {
      console.warn(`[${config.category}] 목표 미달: ${postings.length}/${config.targetCount}건만 수집됨`);
    }
    allPostings.push(...postings);
    nextId += postings.length;
    await sleep(REQUEST_DELAY_MS);
  }

  await writeFile(OUTPUT_PATH, `${JSON.stringify(allPostings, null, 2)}\n`, "utf-8");
  console.log(`\n총 ${allPostings.length}건 저장 완료: ${OUTPUT_PATH.pathname}`);
}

main().catch((err) => {
  console.error("크롤링 실패:", err);
  process.exit(1);
});
