import { prisma } from "./prisma";

export async function createNotification({
  userId,
  type,
  title,
  message,
  entityType,
  entityId,
}: {
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      entityType,
      entityId,
    },
  });
}

export async function createNotificationForAllUsers(params: {
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}) {
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  await prisma.notification.createMany({
    data: users.map((user) => ({
      userId: user.id,
      type: params.type,
      title: params.title,
      message: params.message,
      entityType: params.entityType,
      entityId: params.entityId,
    })),
  });
}
