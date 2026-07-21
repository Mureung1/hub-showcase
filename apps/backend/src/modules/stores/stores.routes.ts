import { Router } from "express";
import { authenticate } from "../../common/middlewares/authenticate";
import { requireStoreRole } from "../../common/middlewares/requireStoreRole";
import {
  createStoreController,
  getStoreController,
  listStoresController,
  updateStoreController
} from "./stores.controller";

export const storesRouter = Router();

storesRouter.post("/", authenticate, createStoreController);
storesRouter.get("/", authenticate, listStoresController);
storesRouter.get("/:storeId", authenticate, requireStoreRole(["OWNER", "WORKER"]), getStoreController);
storesRouter.patch("/:storeId", authenticate, requireStoreRole(["OWNER"]), updateStoreController);
