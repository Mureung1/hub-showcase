import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EvidenceCoverageBadge from "./EvidenceCoverageBadge";
import { summarizeEvidenceCoverage } from "./evidenceCoverage";

describe("EvidenceCoverageBadge", () => {
  it("announces partial item coverage with a visible, non-color status", () => {
    render(
      <EvidenceCoverageBadge
        evidenceCount={3}
        validated={2}
        eligible={4}
      />,
    );

    const badge = screen.getByLabelText("근거 연결 2/4 · 인용 3개");
    expect(badge).toHaveClass("partial");
    expect(badge).toHaveTextContent("2/4");
  });

  it("says that evidence was not provided when there is no eligible item", () => {
    render(<EvidenceCoverageBadge evidenceCount={0} validated={0} eligible={0} label="근거 검증" />);
    expect(screen.getByLabelText("근거 검증 · 근거 미제공")).toHaveTextContent("근거 미제공");
  });

  it("summarizes both covered items and exact evidence references", () => {
    expect(summarizeEvidenceCoverage([
      { evidence: [{ sourceRecordId: "source-1", sourceTitle: "회의", quote: "첫 근거" }] },
      { evidence: [] },
      {
        evidence: [
          { sourceRecordId: "source-2", sourceTitle: "피드백", quote: "둘째 근거" },
          { sourceRecordId: "source-2", sourceTitle: "피드백", quote: "셋째 근거" },
        ],
      },
    ])).toEqual({ evidenceCount: 3, validated: 2, eligible: 3 });
  });
});
