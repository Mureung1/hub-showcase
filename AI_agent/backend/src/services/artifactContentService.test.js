import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  extractSubmittedFileText,
  fetchSubmittedUrlText,
} from "./artifactContentService.js";

describe("artifact content helpers", () => {
  it("extracts text from text-like submitted file data", () => {
    const text = "문제 정의와 구현 과정을 README로 정리했습니다.";
    const evidence = extractSubmittedFileText({
      submittedFileName: "README.txt",
      submittedFileType: "text/plain",
      submittedFileData: `data:text/plain;base64,${Buffer.from(text).toString("base64")}`,
    });

    assert.equal(evidence.status, "extracted");
    assert.equal(evidence.text, text);
  });

  it("skips binary submitted file data", () => {
    const evidence = extractSubmittedFileText({
      submittedFileName: "result.pdf",
      submittedFileType: "application/pdf",
      submittedFileData: "data:application/pdf;base64,JVBERi0x",
    });

    assert.equal(evidence.status, "skipped");
    assert.match(evidence.reason, /텍스트로 읽을 수 없는 파일 형식/);
  });

  it("blocks localhost URLs before fetching", async () => {
    const evidence = await fetchSubmittedUrlText("http://localhost:4000/internal");

    assert.equal(evidence.status, "blocked");
    assert.match(evidence.reason, /내부망|로컬/);
  });
});
