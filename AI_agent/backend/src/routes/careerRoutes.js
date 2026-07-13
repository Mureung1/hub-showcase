import { Router } from "express";

import { searchJobs } from "../services/jobService.js";
import { searchQualifications } from "../services/qualificationService.js";

export const careerRouter = Router();

careerRouter.get("/jobs", async (request, response, next) => {
  try {
    const jobs = await searchJobs(String(request.query.keyword || ""));
    response.json({ jobs });
  } catch (error) {
    next(error);
  }
});

careerRouter.get("/qualifications", async (request, response, next) => {
  try {
    const qualifications = await searchQualifications(
      String(request.query.keyword || "")
    );
    response.json({ qualifications });
  } catch (error) {
    next(error);
  }
});
