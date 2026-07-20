import { UserRole } from "./role";

export type StoreMembershipContext = {
  id: string;
  storeId: string;
  userId: string;
  role: UserRole;
};
