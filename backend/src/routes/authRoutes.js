import express from "express";
import { register, login } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);         // /register 요청이 오면 register 함수를 실행해 라는 뜻
router.post("/login", login);

export default router;