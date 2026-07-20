import { NextFunction, Request, Response } from "express";
import { findStoreMembership } from "../repositories/storeMembership.repository";
import { UserRole } from "../types/role";

export function requireStoreRole(allowedRoles: UserRole[]) {
  return async function requireStoreRoleMiddleware(req: Request, res: Response, next: NextFunction) {
    if (!req.authUser) {
      res.status(401).json({
        message: "인증 정보가 없습니다."
      });
      return;
    }

    const storeId = req.params.storeId;

    if (!storeId || Array.isArray(storeId)) {
      res.status(400).json({
        message: "매장 ID가 필요합니다."
      });
      return;
    }

    const membership = await findStoreMembership(storeId, req.authUser.id);

    if (!membership) {
      res.status(403).json({
        message: "매장 접근 권한이 없습니다."
      });
      return;
    }

    if (!allowedRoles.includes(membership.role)) {
      res.status(403).json({
        message: allowedRoles.length === 1 && allowedRoles[0] === "OWNER"
          ? "사장님 권한이 필요합니다."
          : "요청을 수행할 권한이 없습니다."
      });
      return;
    }

    req.storeMembership = membership;
    next();
  };
}
