import { Request, Response } from "express";
import { z } from "zod";
import {
  acceptPendingInvitation,
  cancelPendingInvitation,
  createInvitation,
  listPendingInvitationsForUser
} from "./invitations.service";

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "시간은 HH:mm 형식으로 입력해주세요.");

const createInvitationSchema = z
  .object({
    inviteeEmail: z.string().trim().email("초대할 이메일을 입력해주세요."),
    hourlyWage: z.number().min(0, "시급은 0 이상이어야 합니다.").nullable().optional(),
    defaultWorkStartTime: timeSchema.nullable().optional(),
    defaultWorkEndTime: timeSchema.nullable().optional()
  })
  .refine(
    (value) =>
      !value.defaultWorkStartTime ||
      !value.defaultWorkEndTime ||
      value.defaultWorkEndTime > value.defaultWorkStartTime,
    {
      message: "기본 종료 시간은 시작 시간보다 늦어야 합니다.",
      path: ["defaultWorkEndTime"]
    }
  );

function getStringParam(value: string | string[] | undefined) {
  if (!value || Array.isArray(value)) {
    return null;
  }

  return value;
}

export async function createInvitationController(req: Request, res: Response) {
  if (!req.authUser) {
    res.status(401).json({
      message: "인증 정보가 없습니다."
    });
    return;
  }

  const storeId = getStringParam(req.params.storeId);

  if (!storeId) {
    res.status(400).json({
      message: "매장 ID가 필요합니다."
    });
    return;
  }

  const result = createInvitationSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: result.error.issues[0]?.message ?? "입력값을 확인해주세요."
    });
    return;
  }

  const response = await createInvitation({
    storeId,
    invitedBy: req.authUser.id,
    inviteeEmail: result.data.inviteeEmail,
    hourlyWage: result.data.hourlyWage,
    defaultWorkStartTime: result.data.defaultWorkStartTime,
    defaultWorkEndTime: result.data.defaultWorkEndTime
  });

  res.status(201).json(response);
}

export async function cancelInvitationController(req: Request, res: Response) {
  const storeId = getStringParam(req.params.storeId);
  const invitationId = getStringParam(req.params.invitationId);

  if (!storeId || !invitationId) {
    res.status(400).json({
      message: "매장 ID와 초대 ID가 필요합니다."
    });
    return;
  }

  const response = await cancelPendingInvitation({
    storeId,
    invitationId
  });

  res.status(200).json(response);
}

export async function listPendingInvitationsController(req: Request, res: Response) {
  if (!req.authUser) {
    res.status(401).json({
      message: "인증 정보가 없습니다."
    });
    return;
  }

  const response = await listPendingInvitationsForUser(req.authUser.email);

  res.status(200).json(response);
}

export async function acceptInvitationController(req: Request, res: Response) {
  if (!req.authUser) {
    res.status(401).json({
      message: "인증 정보가 없습니다."
    });
    return;
  }

  const invitationId = getStringParam(req.params.invitationId);

  if (!invitationId) {
    res.status(400).json({
      message: "초대 ID가 필요합니다."
    });
    return;
  }

  const response = await acceptPendingInvitation({
    invitationId,
    userId: req.authUser.id,
    userEmail: req.authUser.email
  });

  res.status(200).json(response);
}
