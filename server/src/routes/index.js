import { Router } from "express";
import healthRouter from "./health.js";
import postsRouter from "./posts.js";
import brandProfileRouter from "./brandProfile.js";
import briefingRouter from "./briefing.js";
import insightsRouter from "./insights.js";
import blogRouter from "./blog.js";
import authRouter from "./auth.js";

const router = Router();

router.use(healthRouter);
router.use("/posts", postsRouter);
router.use("/brand-profile", brandProfileRouter);
router.use("/briefing", briefingRouter);
router.use("/insights", insightsRouter);
router.use("/blog", blogRouter);
router.use("/auth", authRouter);

export default router;
