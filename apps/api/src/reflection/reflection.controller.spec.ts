import { HttpException, HttpStatus } from "@nestjs/common";
import type { ReflectionDraft } from "@ptop/contracts";
import { ReflectionDraftController } from "./reflection.controller";
import { ReflectionDraftPersistence } from "./reflection.persistence";
import {
  InvalidReflectionDraftError,
  ReflectionService,
} from "./reflection.service";

const draft: ReflectionDraft = {
  motivation: "",
  role: "",
  memorableProblem: "",
  postAnalysisReflection: "",
  attempts: "",
  improvement: "",
  customChallengeTitle: "",
  customChallengeNote: "",
  selectedChallengeTitles: [],
  challengeAnswers: {},
};

describe("ReflectionDraftController", () => {
  function createController(error?: Error) {
    const service = {
      save: error
        ? jest.fn().mockRejectedValue(error)
        : jest.fn().mockResolvedValue({ analysisResultId: "analysis-id", draft, savedAt: "now" }),
      find: error
        ? jest.fn().mockRejectedValue(error)
        : jest.fn().mockResolvedValue({ analysisResultId: "analysis-id", draft, savedAt: "now" }),
    };

    return {
      controller: new ReflectionDraftController(service as unknown as ReflectionService),
      service,
    };
  }

  it("delegates a save request to the service", async () => {
    const { controller, service } = createController();

    await expect(controller.save("analysis-id", { draft })).resolves.toEqual(
      expect.objectContaining({ analysisResultId: "analysis-id" }),
    );
    expect(service.save).toHaveBeenCalledWith("analysis-id", draft, undefined);
  });

  it("maps invalid drafts to a stable 400 response", async () => {
    const { controller } = createController(new InvalidReflectionDraftError());

    await expect(controller.save("analysis-id", { draft })).rejects.toMatchObject({
      response: { code: "INVALID_REFLECTION_DRAFT" },
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it("maps persistence failures to a stable 500 response", async () => {
    const { controller } = createController(new Error("database secret detail"));

    await expect(controller.save("analysis-id", { draft })).rejects.toMatchObject({
      response: {
        code: "REFLECTION_SAVE_FAILED",
        message: "회고 저장에 실패했습니다.",
      },
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  });

  it("returns a saved draft through the GET endpoint", async () => {
    const { controller, service } = createController();

    await expect(controller.find("analysis-id")).resolves.toEqual(
      expect.objectContaining({ analysisResultId: "analysis-id" }),
    );
    expect(service.find).toHaveBeenCalledWith("analysis-id");
  });
});
