import { prisma } from "./client.js";
import type { AvoidanceReason } from "@prisma/client";

export function getCurrentReason(taskId: string): Promise<AvoidanceReason | null> {
  return prisma.avoidanceReason.findFirst({
    where: { taskId },
    orderBy: { createdAt: "desc" },
  });
}
