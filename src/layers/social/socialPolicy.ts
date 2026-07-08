import type { SocialQuestShard, UserProfile } from "../../domain/types";

export function getVisibleQuestShards(profile: UserProfile, shards: SocialQuestShard[]) {
  if (!profile.publicQuestMode) return [];
  return shards.filter((shard) => shard.visibility === "anonymous_public" || shard.visibility === "friends_only");
}

export const socialPolicySummary = [
  "공개는 사용자가 선택한 퀘스트만 가능",
  "공개 기능을 끄면 다른 사람의 퀘스트 탐색도 비활성화",
  "기본값은 private",
];
