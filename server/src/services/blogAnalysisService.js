import { getProfile } from "./brandProfileRepo.js";
import { getBlogStats } from "./naverBlogRss.js";

// blogId가 없거나(온보딩에서 연동 안 함) RSS 조회에 실패하면(비공개 블로그,
// 잘못된 blogId 등) connected: false와 함께 빈 값을 반환한다.
export async function getBlogAnalysis() {
  const profile = await getProfile();
  const analyzedAt = new Date().toISOString();

  if (!profile?.blogId) {
    return { connected: false, postCount: 0, latestPostDate: null, postingCycle: null, analyzedAt };
  }

  const stats = await getBlogStats(profile.blogId);
  if (!stats) {
    return { connected: false, postCount: 0, latestPostDate: null, postingCycle: null, analyzedAt };
  }

  return { connected: true, ...stats, analyzedAt };
}
