import { describe, expect, it } from "vitest";
import type { SpotifyTrack } from "../types/music";
import { validateMusicRecordInput } from "./musicRecordValidation";

const selectedTrack: SpotifyTrack = {
  spotifyTrackId: "spotify-track-1",
  title: "Ditto",
  artistName: "NewJeans",
  albumName: "OMG",
  albumImageUrl: "https://example.com/album.jpg",
  externalUrl: "https://open.spotify.com/track/spotify-track-1",
};

describe("validateMusicRecordInput", () => {
  it("음악을 선택하지 않으면 음악 선택 오류를 반환해야 한다", () => {
    const result = validateMusicRecordInput(null, "오늘은 평온했어요.");

    expect(result).toEqual({
      track: "오늘을 대표하는 음악을 선택해주세요.",
    });
  });

  it("감정이 빈 문자열이면 감정 필수 입력 오류를 반환해야 한다", () => {
    const result = validateMusicRecordInput(selectedTrack, "");

    expect(result).toEqual({
      emotion: "감정을 한 줄로 남겨주세요.",
    });
  });

  it("감정이 공백뿐이면 감정 필수 입력 오류를 반환해야 한다", () => {
    const result = validateMusicRecordInput(selectedTrack, "   ");

    expect(result).toEqual({
      emotion: "감정을 한 줄로 남겨주세요.",
    });
  });

  it("감정이 정확히 160자이면 오류를 반환하지 않아야 한다", () => {
    const emotion = "가".repeat(160);

    const result = validateMusicRecordInput(selectedTrack, emotion);

    expect(result).toEqual({});
  });

  it("감정이 161자이면 감정 길이 오류를 반환해야 한다", () => {
    const emotion = "가".repeat(161);

    const result = validateMusicRecordInput(selectedTrack, emotion);

    expect(result).toEqual({
      emotion: "감정은 160자 이하로 입력해주세요.",
    });
  });

  it("음악과 감정이 모두 정상이면 오류를 반환하지 않아야 한다", () => {
    const result = validateMusicRecordInput(selectedTrack, "오늘은 평온했어요.");

    expect(result).toEqual({});
  });

  it("음악과 감정이 모두 잘못되면 두 오류를 함께 반환해야 한다", () => {
    const result = validateMusicRecordInput(null, "   ");

    expect(result).toEqual({
      track: "오늘을 대표하는 음악을 선택해주세요.",
      emotion: "감정을 한 줄로 남겨주세요.",
    });
  });
});
