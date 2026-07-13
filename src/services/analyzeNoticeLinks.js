import { analyzeOpportunity } from "./analyzeOpportunity.js";

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "공지 분석 중 오류가 발생했습니다.";
}

export async function analyzeNoticeLinks({
  analyze = analyzeOpportunity,
  links = [],
  onProgress = () => {},
  profile,
}) {
  const entries = [];
  let failedCount = 0;

  for (const [index, link] of links.entries()) {
    onProgress({
      completed: index,
      entry: { link, status: "analyzing" },
      failedCount,
      total: links.length,
    });

    let entry;

    try {
      const result = await analyze({
        profile,
        rawText: "",
        url: link.url,
      });

      entry = { link, result, status: "complete" };
    } catch (error) {
      failedCount += 1;
      entry = {
        errorMessage: getErrorMessage(error),
        link,
        status: "error",
      };
    }

    entries.push(entry);
    onProgress({
      completed: index + 1,
      entry,
      failedCount,
      total: links.length,
    });
  }

  return {
    entries,
    failedCount,
    successCount: entries.length - failedCount,
    total: entries.length,
  };
}
