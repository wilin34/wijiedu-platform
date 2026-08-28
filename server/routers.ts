import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { createLocalSession } from "./_core/localSession";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { academicRouter } from "./routers/academic";

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

async function passwordMatches(password: string, savedHash: string) {
  const [algorithm, salt, saved] = savedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !saved) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(saved, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

const RESET_COOKIE_NAME = "wijiedu_password_reset";
const resetMessage = "Si el correo corresponde a una cuenta, se generó un enlace de recuperación de un solo uso.";

function publicUser(user: NonNullable<Awaited<ReturnType<typeof db.getUserById>>>) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
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
    requestPasswordReset: publicProcedure.input(z.object({ email: z.string().trim().toLowerCase().email().max(320) })).mutation(async ({ ctx, input }) => {
      const user = await db.getUserByEmail(input.email);
      const token = randomBytes(32).toString("base64url");
      if (user?.passwordHash) await db.createPasswordResetToken(user.id, hashResetToken(token), new Date(Date.now() + 30 * 60 * 1000));
      ctx.res.cookie(RESET_COOKIE_NAME, token, { httpOnly: true, secure: ctx.req.protocol === "https", sameSite: "lax", maxAge: 30 * 60 * 1000, path: "/" });
      return { message: resetMessage };
    }),
    resetPassword: publicProcedure.input(z.object({ password: z.string().min(8).max(128) })).mutation(async ({ ctx, input }) => {
      const token = ctx.req.headers.cookie?.split(";").map(value => value.trim()).find(value => value.startsWith(`${RESET_COOKIE_NAME}=`))?.slice(RESET_COOKIE_NAME.length + 1);
      const record = token ? await db.getValidPasswordResetToken(hashResetToken(decodeURIComponent(token))) : undefined;
      if (!record || record.expiresAt.getTime() <= Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "El enlace de recuperación no es válido o ya expiró." });
      await db.updateAccountPassword(record.userId, await hashPassword(input.password));
      await db.markPasswordResetTokenUsed(record.id);
      ctx.res.clearCookie(RESET_COOKIE_NAME, { httpOnly: true, secure: ctx.req.protocol === "https", sameSite: "lax", path: "/" });
      return { success: true, message: "Contraseña actualizada. Ya puedes ingresar al portal." };
    }),
  }),
  notifications: router({
    list: protectedProcedure.query(({ ctx }) => db.listNotificationsForUser(ctx.user.id)),
    unreadCount: protectedProcedure.query(({ ctx }) => db.countUnreadNotifications(ctx.user.id)),
    markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await db.markNotificationRead(ctx.user.id, input.id); return { success: true }; }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => { await db.markAllNotificationsRead(ctx.user.id); return { success: true }; }),
    preferences: protectedProcedure.query(({ ctx }) => db.getNotificationPreferences(ctx.user.id)),
    updatePreferences: protectedProcedure.input(z.object({ academicEnabled: z.boolean(), assessmentEnabled: z.boolean(), liveClassEnabled: z.boolean(), messageEnabled: z.boolean() })).mutation(async ({ ctx, input }) => { await db.updateNotificationPreferences(ctx.user.id, { academicEnabled: input.academicEnabled ? 1 : 0, assessmentEnabled: input.assessmentEnabled ? 1 : 0, liveClassEnabled: input.liveClassEnabled ? 1 : 0, messageEnabled: input.messageEnabled ? 1 : 0 }); return { success: true }; }),
    create: protectedProcedure.input(z.object({ userId: z.number().int().positive(), type: z.enum(["academic", "assessment", "live_class", "message", "system"]), title: z.string().trim().min(2).max(220), message: z.string().trim().min(2), href: z.string().max(512).nullable().optional() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Solo administración puede crear notificaciones." });
      return { id: await db.createNotification(input) };
    }),
  }),
  academic: academicRouter,
});

export type AppRouter = typeof appRouter;
