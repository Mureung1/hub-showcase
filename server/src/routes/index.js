import { Router } from "express";
import healthRouter from "./health.js";
import postsRouter from "./posts.js";
import brandProfileRouter from "./brandProfile.js";
import briefingRouter from "./briefing.js";

const router = Router();

router.use(healthRouter);
router.use("/posts", postsRouter);
router.use("/brand-profile", brandProfileRouter);
router.use("/briefing", briefingRouter);

export default router;
