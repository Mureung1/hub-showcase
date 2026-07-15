import { Router } from "express";
import { authenticate } from "../../common/middlewares/authenticate";
import { createProfileController } from "./auth.controller";

export const authRouter = Router();

authRouter.post("/profile", authenticate, createProfileController);
