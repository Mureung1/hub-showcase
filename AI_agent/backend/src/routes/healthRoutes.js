import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (request, response) => {
  response.json({
    ok: true,
    service: "career-mission-api",
  });
});
