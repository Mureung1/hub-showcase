import { Router } from "express";
import { authenticate } from "../../common/middlewares/authenticate";
import { createStoreController } from "./stores.controller";

export const storesRouter = Router();

storesRouter.post("/", authenticate, createStoreController);
