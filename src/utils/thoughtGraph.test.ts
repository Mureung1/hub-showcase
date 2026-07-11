import { describe, expect, it } from "vitest";
import { sampleAnalysis } from "../data/sampleAnalysis";
import { BRAIN_VIEWBOX, buildThoughtGraph, layoutThoughtNodes } from "./thoughtGraph";

describe("thoughtGraph", () => {
  it("derives every structured thought without changing the persisted result", () => {
    const graph = buildThoughtGraph(sampleAnalysis);

    expect(graph.nodes.filter((node) => node.kind === "topic")).toHaveLength(1);
    expect(graph.nodes.filter((node) => node.kind === "perspective")).toHaveLength(sampleAnalysis.participants.length);
    expect(graph.nodes.filter((node) => node.kind === "decision")).toHaveLength(sampleAnalysis.decisions.length);
    expect(graph.nodes.filter((node) => node.kind === "question")).toHaveLength(sampleAnalysis.questions.length);
    expect(graph.nodes.filter((node) => node.kind === "term")).toHaveLength(sampleAnalysis.keyTerms.length);
    expect(graph.nodes.find((node) => node.label === "민지")?.evidence).toEqual(sampleAnalysis.participants[0].evidence);
    expect(graph.edges.some((edge) => edge.relation === "시각화 위험 제기")).toBe(true);
  });

  it("ignores orphan links from legacy maps", () => {
    const graph = buildThoughtGraph({
      nodes: [{ id: "topic", label: "주제", type: "topic", summary: "중심" }],
      links: [{ from: "topic", to: "missing", relation: "고아" }],
    });

    expect(graph.edges).toEqual([]);
  });

  it("lays visual nodes inside the stable brain viewbox", () => {
    const graph = buildThoughtGraph(sampleAnalysis);
    const visible = [
      graph.nodes[0],
      ...graph.nodes.filter((node) => node.kind !== "topic").slice(0, 8),
    ];
    const positions = layoutThoughtNodes(visible, false);

    expect(positions.size).toBe(visible.length);
    for (const position of positions.values()) {
      expect(position.x).toBeGreaterThan(0);
      expect(position.x).toBeLessThan(BRAIN_VIEWBOX.width);
      expect(position.y).toBeGreaterThan(0);
      expect(position.y).toBeLessThan(BRAIN_VIEWBOX.height);
    }
  });
});
