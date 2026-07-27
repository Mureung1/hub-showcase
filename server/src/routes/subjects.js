import { Router } from "express";
import {
  getSubjects,
  postSubject,
  putSubject,
  patchCompleteSubject,
  removeSubject,
} from "../controllers/subjectController.js";

const router = Router();

router.get("/subjects", getSubjects);
router.post("/subjects", postSubject);
router.put("/subjects/:id", putSubject);
router.patch("/subjects/:id/complete", patchCompleteSubject);
router.delete("/subjects/:id", removeSubject);

export default router;
