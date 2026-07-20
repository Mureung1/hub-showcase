import { Router } from "express";
import { authenticate } from "../../common/middlewares/authenticate";
import { createProfileController, getCurrentUserController } from "./auth.controller";

export const authRouter = Router();
export const meRouter = Router();

authRouter.post("/profile", authenticate, createProfileController);
meRouter.get("/", authenticate, getCurrentUserController);
