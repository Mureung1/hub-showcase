// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ItemCard from "./ItemCard";

const item = {
  id: 1,
  title: "AWS SAA-C03 자격증 준비 가이드",
  summary: "AWS Solutions Architect 자격증의 핵심 학습 내용을 정리한 글입니다.",
  content: "https://velog.io/example",
  original_url: "https://velog.io/example",
  image_url: null,
  source_platform: "web",
  category_main: "공부",
  category_sub: "클라우드",
  created_at: "2026-07-23T00:00:00.000Z",
};

describe("ItemCard", () => {
  afterEach(cleanup);

  it("카드를 누르면 AI 요약과 원본 링크를 표시하고 수정 버튼은 노출하지 않는다", () => {
    render(
      <ul>
        <ItemCard item={item} onDelete={vi.fn()} />
      </ul>
    );

    expect(screen.getByText("AWS SAA-C03 자격증 준비 가이드")).toBeInTheDocument();
    expect(screen.queryByText(item.summary)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByText(item.summary)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /원본 링크 열기/ })).toHaveAttribute(
      "href",
      item.original_url
    );
    expect(screen.getByRole("link", { name: /원본 링크 열기/ })).toHaveAttribute(
      "target",
      "_blank"
    );
    expect(screen.queryByText("공부 · 클라우드")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "수정" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
  });

  it("기존 URL 제목은 카테고리 기반 제목으로 대체해 표시한다", () => {
    render(
      <ul>
        <ItemCard
          item={{ ...item, title: item.original_url }}
          onDelete={vi.fn()}
        />
      </ul>
    );

    expect(screen.getByText("클라우드 관련 콘텐츠")).toBeInTheDocument();
  });
});
