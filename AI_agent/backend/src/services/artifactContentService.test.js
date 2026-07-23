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

  it("extracts code file data even when browser MIME type is generic", () => {
    const text = "const result = 'career mission';";
    const evidence = extractSubmittedFileText({
      submittedFileName: "mission.js",
      submittedFileType: "application/octet-stream",
      submittedFileData: `data:application/octet-stream;base64,${Buffer.from(text).toString("base64")}`,
    });

    assert.equal(evidence.status, "extracted");
    assert.equal(evidence.text, text);
  });

  it("attaches PDF submitted file data for OpenAI file evaluation", () => {
    const evidence = extractSubmittedFileText({
      submittedFileName: "result.pdf",
      submittedFileType: "application/pdf",
      submittedFileData: "data:application/pdf;base64,JVBERi0x",
    });

    assert.equal(evidence.status, "attached");
    assert.equal(evidence.modality, "pdf");
    assert.equal(evidence.fileData, "JVBERi0x");
  });

  it("attaches image submitted file data for OpenAI vision evaluation", () => {
    const imageData = "data:image/png;base64,iVBORw0KGgo=";
    const evidence = extractSubmittedFileText({
      submittedFileName: "screen.png",
      submittedFileType: "image/png",
      submittedFileData: imageData,
    });

    assert.equal(evidence.status, "attached");
    assert.equal(evidence.modality, "image");
    assert.equal(evidence.imageUrl, imageData);
  });

  it("blocks localhost URLs before fetching", async () => {
    const evidence = await fetchSubmittedUrlText("http://localhost:4000/internal");

    assert.equal(evidence.status, "blocked");
    assert.match(evidence.reason, /내부망|로컬/);
  });
});
