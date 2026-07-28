import { ErrorRequestHandler } from "express";
import { isHttpError } from "../errors/HttpError";

function isJsonParseError(error: unknown) {
  return (
    error instanceof SyntaxError &&
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 400 &&
    "type" in error &&
    error.type === "entity.parse.failed"
  );
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (isJsonParseError(error)) {
    res.status(400).json({
      code: "INVALID_JSON",
      message: "요청 본문이 올바른 JSON 형식이 아닙니다."
    });
    return;
  }

  if (isHttpError(error)) {
    res.status(error.status).json({
      code: error.code,
      message: error.message
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";

  res.status(500).json({
    code: "INTERNAL_SERVER_ERROR",
    message
  });
};
