import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  listNotificationsForUser: vi.fn(async () => [{ id: 1, userId: 7, type: "academic", title: "Aviso", message: "Tienes una actividad nueva.", href: null, readAt: null, createdAt: new Date() }]),
  countUnreadNotifications: vi.fn(async () => 1),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  getNotificationPreferences: vi.fn(async () => ({ userId: 7, academicEnabled: 1, assessmentEnabled: 1, liveClassEnabled: 1, messageEnabled: 1 })),
  updateNotificationPreferences: vi.fn(),
  createNotification: vi.fn(async () => 9),
}));

vi.mock("./db", () => mocks);
const { appRouter } = await import("./routers");

function context(role: "admin" | "student" = "student", institutionId = 1) {
  return {
    user: { id: 7, name: "Usuario", email: "usuario@test.local", role } as TrpcContext["user"],
    institutionId,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("notifications", () => {
  it("solo devuelve las notificaciones del usuario autenticado y permite leerlas", async () => {
    const caller = appRouter.createCaller(context());
    await expect(caller.notifications.list()).resolves.toHaveLength(1);
    await expect(caller.notifications.unreadCount()).resolves.toBe(1);
    await expect(caller.notifications.markRead({ id: 1 })).resolves.toEqual({ success: true });
    await expect(caller.notifications.markAllRead()).resolves.toEqual({ success: true });
    expect(mocks.markNotificationRead).toHaveBeenCalledWith(7, 1, 1);
    expect(mocks.markAllNotificationsRead).toHaveBeenCalledWith(7, 1);
  });

  it("permite preferencias personales y reserva la creación a administración", async () => {
    const student = appRouter.createCaller(context());
    await expect(student.notifications.updatePreferences({ academicEnabled: false, assessmentEnabled: true, liveClassEnabled: false, messageEnabled: true })).resolves.toEqual({ success: true });
    await expect(student.notifications.create({ userId: 7, type: "system", title: "Aviso", message: "Mensaje" })).rejects.toMatchObject({ code: "FORBIDDEN" });

    const admin = appRouter.createCaller(context("admin"));
    await expect(admin.notifications.create({ userId: 7, type: "system", title: "Aviso", message: "Mensaje" })).resolves.toEqual({ id: 9 });
    expect(mocks.createNotification).toHaveBeenCalledWith({ userId: 7, type: "system", title: "Aviso", message: "Mensaje", institutionId: 1 });
  });

  it("mantiene separado el contexto de avisos para membresías múltiples", async () => {
    const secondInstitution = appRouter.createCaller(context("student", 2));
    await secondInstitution.notifications.list();
    await secondInstitution.notifications.unreadCount();
    await secondInstitution.notifications.preferences();
    await secondInstitution.notifications.markRead({ id: 1 });
    expect(mocks.listNotificationsForUser).toHaveBeenLastCalledWith(7, 2);
    expect(mocks.countUnreadNotifications).toHaveBeenLastCalledWith(7, 2);
    expect(mocks.getNotificationPreferences).toHaveBeenLastCalledWith(7, 2);
    expect(mocks.markNotificationRead).toHaveBeenLastCalledWith(7, 1, 2);
  });
});
