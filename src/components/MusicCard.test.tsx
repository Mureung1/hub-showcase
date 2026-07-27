import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MusicRecord } from "../types/music";
import { MusicCard } from "./MusicCard";

function createRecord(liked: boolean): MusicRecord {
  return {
    id: 1,
    spotifyTrackId: "track-1",
    songTitle: "Ditto",
    artistName: "NewJeans",
    albumName: "OMG",
    albumImageUrl: null,
    externalUrl: null,
    emotion: "오늘을 천천히 흘려보낸 마음",
    recordDate: "2026-07-27",
    liked,
    likeCount: liked ? 1 : 0,
    author: { nickname: "잔잔한파도", avatarUrl: null },
  };
}

describe("MusicCard like state", () => {
  it("shows the persisted selected state without a temporary action", () => {
    render(<MusicCard record={createRecord(true)} showLikeState />);

    expect(screen.getByRole("img", { name: "Ditto 기억한 음악" })).toHaveTextContent("♥");
    expect(screen.queryByRole("button", { name: /Ditto/ })).not.toBeInTheDocument();
    expect(screen.getByText("1명이 기억했어요")).toBeInTheDocument();
  });

  it("shows an unselected state when the current user has no like", () => {
    render(<MusicCard record={createRecord(false)} showLikeState />);

    expect(screen.getByRole("img", { name: "Ditto 기억하지 않은 음악" })).toHaveTextContent("♡");
    expect(screen.queryByText(/명이 기억했어요/)).not.toBeInTheDocument();
  });
});
