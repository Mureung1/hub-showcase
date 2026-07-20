import { AuthUser } from "./auth";
import { StoreMembershipContext } from "./storeMembership";

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
      storeMembership?: StoreMembershipContext;
    }
  }
}

export {};
