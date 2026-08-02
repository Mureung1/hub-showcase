import { describe, expect, it } from "vitest";

import { googleDriveFileId, googleDrivePreviewUrl, googleDriveViewUrl } from "./sceneDrive";

describe("googleDriveFileId", () => {
  it("uses a raw Drive file ID", () => {
    expect(googleDriveFileId("1q0CR2OPkk1kYjSV5TDWFlKOoRlSc8w8s", "fallback-file-id")).toBe(
      "1q0CR2OPkk1kYjSV5TDWFlKOoRlSc8w8s",
    );
  });

  it("extracts an ID from a Drive sharing URL", () => {
    expect(
      googleDriveFileId(
        "https://drive.google.com/file/d/1F-pyWGG_knL45BcsQ2OXgismPhqefMtt/view?usp=drive_link",
        "fallback-file-id",
      ),
    ).toBe("1F-pyWGG_knL45BcsQ2OXgismPhqefMtt");
  });

  it("falls back when an environment value contains a variable name and newline", () => {
    expect(
      googleDriveFileId("VITE_JONGMYO_DRIVE_FILE_ID\n1q0CR2OPkk1kYjSV5TDWFlKOoRlSc8w8s", "fallback-file-id"),
    ).toBe("fallback-file-id");
  });
});

describe("Google Drive URLs", () => {
  it("builds preview and new-window URLs from a file ID", () => {
    const fileId = "1q0CR2OPkk1kYjSV5TDWFlKOoRlSc8w8s";
    expect(googleDrivePreviewUrl(fileId)).toBe(`https://drive.google.com/file/d/${fileId}/preview`);
    expect(googleDriveViewUrl(fileId)).toBe(`https://drive.google.com/file/d/${fileId}/view`);
  });
});
