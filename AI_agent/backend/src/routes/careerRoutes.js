import { Router } from "express";

import { searchJobs } from "../services/jobService.js";
import { searchQualifications } from "../services/qualificationService.js";
import {
  searchMajorsBySchool,
  searchUniversities,
} from "../services/schoolService.js";

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

careerRouter.get("/schools", async (request, response, next) => {
  try {
    const schools = await searchUniversities(String(request.query.keyword || ""));
    response.json({ schools });
  } catch (error) {
    next(error);
  }
});

careerRouter.get("/majors", async (request, response, next) => {
  try {
    const majors = await searchMajorsBySchool({
      keyword: String(request.query.keyword || ""),
      schoolName: String(request.query.schoolName || ""),
    });
    response.json({ majors });
  } catch (error) {
    next(error);
  }
});
