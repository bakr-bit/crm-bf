import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export async function logAudit({
  userId,
  entity,
  entityId,
  action,
  details,
}: {
  userId: string;
  entity: string;
  entityId: string;
  action: string;
  details?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      userId,
      entity,
      entityId,
      action,
      details: details ?? undefined,
    },
  });
}
