import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { createLocalSession } from "./_core/localSession";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { academicRouter } from "./routers/academic";
import { ENV } from "./_core/env";

const scrypt = promisify(scryptCallback);
const localAccountInput = z.object({
  name: z.string().trim().min(2).max(180),
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(8).max(128),
});

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${hash.toString("hex")}`;
}

function isPlatformOwner(user: { openId?: string | null; email?: string | null; role?: string }) {
  return user.role === "admin" && (user.openId === ENV.ownerOpenId || user.email?.trim().toLowerCase() === "wilinton@gmail.com");
}

async function passwordMatches(password: string, savedHash: string) {
  const [algorithm, salt, saved] = savedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !saved) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(saved, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

function publicUser(user: NonNullable<Awaited<ReturnType<typeof db.getUserById>>>) {
  const owner = user.openId === ENV.ownerOpenId;
  return { id: user.id, name: user.name ?? (owner ? "Wilinton" : null), email: user.email ?? (owner ? "wilinton@gmail.com" : null), role: owner ? "admin" as const : user.role, mustChangePassword: user.mustChangePassword === 1 };
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => (opts.ctx.user ? publicUser(opts.ctx.user) : null)),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  localAuth: router({
    register: publicProcedure.input(localAccountInput).mutation(async ({ ctx, input }) => {
      const existing = await db.getUserByEmail(input.email);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Ya existe una cuenta con este correo." });
      const user = await db.createLocalUser({ name: input.name, email: input.email, passwordHash: await hashPassword(input.password) });
      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo crear la cuenta." });
      ctx.res.cookie(COOKIE_NAME, await createLocalSession(user), { ...getSessionCookieOptions(ctx.req), maxAge: 7 * 24 * 60 * 60 * 1000 });
      return publicUser(user);
    }),
    login: publicProcedure.input(z.object({ email: z.string().trim().toLowerCase().email().max(320), password: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
      const user = await db.getUserByEmail(input.email);
      if (!user?.passwordHash || !(await passwordMatches(input.password, user.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Datos incorrectos." });
      }
      await db.updateLastSignedIn(user.id);
      ctx.res.cookie(COOKIE_NAME, await createLocalSession(user), { ...getSessionCookieOptions(ctx.req), maxAge: 7 * 24 * 60 * 60 * 1000 });
      return publicUser(user);
    }),
    requestPasswordReset: publicProcedure.input(z.object({ email: z.string().trim().toLowerCase().email().max(320) })).mutation(async ({ input }) => {
      const user = await db.getUserByEmail(input.email);
      if (user) {
        const institutionId = await db.getInstitutionForUser(user.id);
        const request = await db.createRecoveryRequest({ institutionId, userId: user.id });
        if (request?.status === "pending") {
          const admins = await db.listInstitutionAdmins(institutionId);
          await Promise.all(admins.filter(admin => admin.id !== user.id).map(admin => db.createNotification({ userId: admin.id, institutionId, type: "system", title: "Solicitud de recuperación de contraseña", message: `${user.name || user.email || "Un usuario"} solicita una nueva contraseña. Revisa la bandeja de usuarios de tu institución.`, href: "?section=users" })));
        }
      }
      return { message: "Tu solicitud fue enviada al administrador de tu institución. Recibirás respuesta en menos de 24 horas." };
    }),
    changePassword: protectedProcedure.input(z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(8).max(128) })).mutation(async ({ ctx, input }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user?.passwordHash || !(await passwordMatches(input.currentPassword, user.passwordHash))) throw new TRPCError({ code: "UNAUTHORIZED", message: "La contraseña temporal no es correcta." });
      await db.completeRequiredPasswordChange(user.id, await hashPassword(input.newPassword));
      return { success: true, message: "Contraseña actualizada. Ya puedes continuar." };
    }),
  }),
  institutions: router({
    mine: protectedProcedure.query(({ ctx }) => db.listInstitutionsForUser(ctx.user.id)),
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!isPlatformOwner(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Solo el propietario de WijiEdu puede gestionar instituciones." });
      return db.listInstitutions();
    }),
    admins: protectedProcedure.input(z.object({ institutionId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      if (!isPlatformOwner(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Solo el propietario de WijiEdu puede consultar administradores institucionales." });
      return db.listInstitutionAdmins(input.institutionId);
    }),
    create: protectedProcedure.input(z.object({ name: z.string().trim().min(3).max(180), slug: z.string().trim().min(3).max(80).regex(/^[a-z0-9-]+$/) })).mutation(async ({ ctx, input }) => {
      if (!isPlatformOwner(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Solo el propietario de WijiEdu puede crear instituciones." });
      return { id: await db.createInstitution(input) };
    }),
    remove: protectedProcedure.input(z.object({ institutionId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      if (!isPlatformOwner(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Solo el propietario de WijiEdu puede eliminar instituciones." });
      if (input.institutionId === 1) throw new TRPCError({ code: "BAD_REQUEST", message: "La institución principal no se puede eliminar." });
      await db.deleteInstitution(input.institutionId);
      return { success: true };
    }),
    addMember: protectedProcedure.input(z.object({ institutionId: z.number().int().positive(), userId: z.number().int().positive(), role: z.enum(["admin", "teacher", "student"]) })).mutation(async ({ ctx, input }) => {
      if (!isPlatformOwner(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Solo el propietario de WijiEdu puede asignar miembros." });
      await db.addInstitutionMembership(input);
      return { success: true };
    }),
    createAdmin: protectedProcedure.input(localAccountInput.extend({ institutionId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      if (!isPlatformOwner(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Solo el propietario de WijiEdu puede crear administradores institucionales." });
      const existing = await db.getUserByEmail(input.email);
      if (existing) {
        await db.addInstitutionMembership({ institutionId: input.institutionId, userId: existing.id, role: "admin" });
        return { id: existing.id, created: false };
      }
      const created = await db.createLocalUser({ name: input.name, email: input.email, passwordHash: await hashPassword(input.password), role: "admin", institutionId: input.institutionId });
      return { id: created?.id, created: true };
    }),

  }),
  notifications: router({
    list: protectedProcedure.query(({ ctx }) => db.listNotificationsForUser(ctx.user.id, ctx.institutionId ?? 1)),
    unreadCount: protectedProcedure.query(({ ctx }) => db.countUnreadNotifications(ctx.user.id, ctx.institutionId ?? 1)),
    markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await db.markNotificationRead(ctx.user.id, input.id, ctx.institutionId ?? 1); return { success: true }; }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => { await db.markAllNotificationsRead(ctx.user.id, ctx.institutionId ?? 1); return { success: true }; }),
    preferences: protectedProcedure.query(({ ctx }) => db.getNotificationPreferences(ctx.user.id, ctx.institutionId ?? 1)),
    updatePreferences: protectedProcedure.input(z.object({ academicEnabled: z.boolean(), assessmentEnabled: z.boolean(), liveClassEnabled: z.boolean(), messageEnabled: z.boolean() })).mutation(async ({ ctx, input }) => { await db.updateNotificationPreferences(ctx.user.id, { academicEnabled: input.academicEnabled ? 1 : 0, assessmentEnabled: input.assessmentEnabled ? 1 : 0, liveClassEnabled: input.liveClassEnabled ? 1 : 0, messageEnabled: input.messageEnabled ? 1 : 0, institutionId: ctx.institutionId ?? 1 }); return { success: true }; }),
    create: protectedProcedure.input(z.object({ userId: z.number().int().positive(), type: z.enum(["academic", "assessment", "live_class", "message", "system"]), title: z.string().trim().min(2).max(220), message: z.string().trim().min(2), href: z.string().max(512).nullable().optional() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Solo administración puede crear notificaciones." });
      return { id: await db.createNotification({ ...input, institutionId: ctx.institutionId ?? 1 }) };
    }),
  }),
  academic: academicRouter,
});

export type AppRouter = typeof appRouter;
