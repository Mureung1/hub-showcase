import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES } from "../lib/image";
import { handleImageUpload } from "./imageUpload";

function createTestApp() {
  const app = express();
  app.post("/upload", handleImageUpload, (request, response) => {
    response.json({
      mimeType: request.file?.mimetype,
      size: request.file?.size,
      content: request.body.content,
    });
  });
  return app;
}

describe("handleImageUpload", () => {
  it.each([
    ["image/jpeg", "photo.jpg"],
    ["image/png", "photo.png"],
  ])("%s 이미지를 메모리로 받는다", async (mimeType, filename) => {
    const response = await request(createTestApp())
      .post("/upload")
      .field("content", "테스트 내용")
      .attach("image", Buffer.from("image-data"), { filename, contentType: mimeType });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      mimeType,
      size: 10,
      content: "테스트 내용",
    });
  });

  it("지원하지 않는 MIME type을 거부한다", async () => {
    const response = await request(createTestApp())
      .post("/upload")
      .attach("image", Buffer.from("gif"), {
        filename: "photo.gif",
        contentType: "image/gif",
      });

    expect(response.status).toBe(415);
    expect(response.body.error).toContain("지원하지 않는 이미지 형식");
  });

  it("5MB 초과 이미지를 거부한다", async () => {
    const response = await request(createTestApp())
      .post("/upload")
      .attach("image", Buffer.alloc(MAX_IMAGE_BYTES + 1), {
        filename: "large.jpg",
        contentType: "image/jpeg",
      });

    expect(response.status).toBe(413);
    expect(response.body.error).toContain("최대 5MB");
  });

  it("이미지가 없는 multipart 요청도 통과시킨다", async () => {
    const response = await request(createTestApp())
      .post("/upload")
      .field("content", "텍스트만 저장");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ content: "텍스트만 저장" });
  });
});
