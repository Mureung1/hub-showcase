import { Router } from "express";
import { connectBlog, getBlogAnalysis } from "../services/blogStub.js";

const router = Router();

router.post("/connect", (req, res) => {
  res.json(connectBlog(req.body));
});

router.get("/analysis", (req, res) => {
  res.json(getBlogAnalysis());
});

export default router;
