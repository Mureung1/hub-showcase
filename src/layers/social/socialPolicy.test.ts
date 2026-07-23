import { describe, expect, it } from "vitest";
import type { SocialQuestShard, UserProfile } from "../../domain/types";
import { filterPublicQuestShards } from "./socialPolicy";

const profile = { publicQuestMode: true } as UserProfile;
const shards: SocialQuestShard[] = [
  { id: "private", title: "Private", ownerLabel: "me", motif: "star", visibility: "private" as never },
  { id: "public", title: "Public", ownerLabel: "anon", motif: "flower", visibility: "anonymous_public" },
  { id: "friends", title: "Friends", ownerLabel: "friend", motif: "scrap", visibility: "friends_only" },
];

describe("social policy", () => {
  it("only returns anonymous public quest shards for public exploration v1", () => {
    expect(filterPublicQuestShards(profile, shards).map((shard) => shard.id)).toEqual(["public"]);
  });

  it("returns no public quest shards when public quest mode is disabled", () => {
    expect(filterPublicQuestShards({ ...profile, publicQuestMode: false }, shards)).toEqual([]);
  });
});
