import { Router } from "express";
import {
  getSubjects,
  postSubject,
  putSubject,
  removeSubject,
} from "../controllers/subjectController.js";

const router = Router();

router.get("/subjects", getSubjects);
router.post("/subjects", postSubject);
router.put("/subjects/:id", putSubject);
router.delete("/subjects/:id", removeSubject);

export default router;
