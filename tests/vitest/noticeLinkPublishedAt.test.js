// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { extractPostLinksFromHtml } from "../../src/agents/noticeLinkAgent.js";

describe("notice link published date extraction", () => {
  it("공지 링크가 속한 목록 행의 게시일을 링크 데이터에 포함한다", () => {
    const links = extractPostLinksFromHtml(`
      <table>
        <tbody>
          <tr>
            <td><a class="notice" href="/notice/view?id=2">두 번째 공지</a></td>
            <td>2026.07.23</td>
          </tr>
          <tr>
            <td><a class="notice" href="/notice/view?id=1">첫 번째 공지</a></td>
            <td>2026/07/22</td>
          </tr>
        </tbody>
      </table>
    `, {
      baseUrl: "https://example.com/notice/list",
      linkSelector: "a.notice",
    });

    expect(links.map(({ publishedAt }) => publishedAt)).toEqual([
      "2026-07-23",
      "2026-07-22",
    ]);
  });
});
