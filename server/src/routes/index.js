import { Router } from "express";
import healthRouter from "./health.js";
import postsRouter from "./posts.js";

const router = Router();

router.use(healthRouter);
router.use("/posts", postsRouter);

export default router;
