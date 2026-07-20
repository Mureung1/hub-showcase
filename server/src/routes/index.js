import { Router } from "express";
import healthRouter from "./health.js";
import postsRouter from "./posts.js";
import brandProfileRouter from "./brandProfile.js";

const router = Router();

router.use(healthRouter);
router.use("/posts", postsRouter);
router.use("/brand-profile", brandProfileRouter);

export default router;
