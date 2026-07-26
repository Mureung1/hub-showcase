import { Router, type Request, type Response } from "express";

import { databasePool } from "../database.js";
import { requireFirebaseAuth } from "../middlewares/requireFirebaseAuth.js";
import {
  acceptTransferInvitation,
  createTransferInvitation,
  getTransferInvitationByCode,
  getTransferInvitationByLink,
  getTransferInvitationCodeSecret,
  TransferInvitationError,
  type TransferInvitationErrorCode,
} from "../services/transferInvitation.service.js";

const router = Router();

const ERROR_RESPONSES: Record<
  TransferInvitationErrorCode,
  { status: number; message: string }
> = {
  VALIDATION_ERROR: {
    status: 400,
    message: "입력값을 확인해 주세요.",
  },
  RECIPE_NOT_FOUND: {
    status: 404,
    message: "레시피를 찾을 수 없습니다.",
  },
  RECIPE_NOT_SHAREABLE: {
    status: 403,
    message: "전달 공유할 수 없는 레시피입니다.",
  },
  TRANSFER_INVITATION_NOT_FOUND: {
    status: 404,
    message: "유효하지 않은 전달 초대입니다.",
  },
  TRANSFER_INVITATION_USED: {
    status: 409,
    message: "이미 사용된 전달 초대입니다.",
  },
  TRANSFER_INVITATION_EXPIRED: {
    status: 410,
    message: "만료된 전달 초대입니다.",
  },
  TRANSFER_INVITATION_SELF_ACCEPT_NOT_ALLOWED: {
    status: 403,
    message: "자신이 만든 전달 초대는 수락할 수 없습니다.",
  },
};

function sendTransferInvitationError(
  res: Response,
  error: unknown,
) {
  if (!(error instanceof TransferInvitationError)) {
    return false;
  }

  const errorResponse = ERROR_RESPONSES[error.code];

  res.status(errorResponse.status).json({
    error: {
      code: error.code,
      message: errorResponse.message,
    },
  });
  return true;
}

function requireFirebaseUid(req: Request, res: Response) {
  if (req.firebaseUser) {
    return req.firebaseUser.uid;
  }

  res.status(401).json({
    error: {
      code: "UNAUTHORIZED",
      message: "로그인이 필요합니다.",
    },
  });
  return null;
}

router.post(
  "/recipes/:recipeId/transfer-invitations",
  requireFirebaseAuth,
  async (req: Request, res: Response) => {
    const firebaseUid = requireFirebaseUid(req, res);

    if (firebaseUid === null) {
      return;
    }

    const recipeId =
      typeof req.params.recipeId === "string"
        ? req.params.recipeId
        : "";

    try {
      const invitation = await createTransferInvitation(
        databasePool,
        firebaseUid,
        recipeId,
        getTransferInvitationCodeSecret(),
      );

      res.status(201).json({ data: invitation });
    } catch (error) {
      if (!sendTransferInvitationError(res, error)) {
        throw error;
      }
    }
  },
);

router.get(
  "/transfer-invitations/by-link/:linkToken",
  requireFirebaseAuth,
  async (req: Request, res: Response) => {
    if (requireFirebaseUid(req, res) === null) {
      return;
    }

    const linkToken =
      typeof req.params.linkToken === "string"
        ? req.params.linkToken
        : "";

    try {
      const preview = await getTransferInvitationByLink(
        databasePool,
        linkToken,
      );

      res.status(200).json({ data: preview });
    } catch (error) {
      if (!sendTransferInvitationError(res, error)) {
        throw error;
      }
    }
  },
);

router.post(
  "/transfer-invitations/by-code",
  requireFirebaseAuth,
  async (req: Request, res: Response) => {
    if (requireFirebaseUid(req, res) === null) {
      return;
    }

    const invitationCode =
      typeof req.body === "object" &&
      req.body !== null &&
      Object.keys(req.body).length === 1 &&
      "invitationCode" in req.body
        ? req.body.invitationCode
        : undefined;

    try {
      const preview = await getTransferInvitationByCode(
        databasePool,
        invitationCode,
        getTransferInvitationCodeSecret(),
      );

      res.status(200).json({ data: preview });
    } catch (error) {
      if (!sendTransferInvitationError(res, error)) {
        throw error;
      }
    }
  },
);

router.post(
  "/transfer-invitations/:invitationId/accept",
  requireFirebaseAuth,
  async (req: Request, res: Response) => {
    const firebaseUser = req.firebaseUser;

    if (!firebaseUser) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        },
      });
      return;
    }

    const invitationId =
      typeof req.params.invitationId === "string"
        ? req.params.invitationId
        : "";

    try {
      const recipe = await acceptTransferInvitation(
        databasePool,
        firebaseUser,
        invitationId,
        req.body,
      );

      res.status(201).json({ data: recipe });
    } catch (error) {
      if (!sendTransferInvitationError(res, error)) {
        throw error;
      }
    }
  },
);

export default router;
