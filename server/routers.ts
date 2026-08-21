import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { createLocalSession } from "./_core/localSession";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
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
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Correo o contraseña incorrectos." });
      }
      await db.updateLastSignedIn(user.id);
      ctx.res.cookie(COOKIE_NAME, await createLocalSession(user), { ...getSessionCookieOptions(ctx.req), maxAge: 7 * 24 * 60 * 60 * 1000 });
      return publicUser(user);
    }),
  }),
  academic: academicRouter,
});

export type AppRouter = typeof appRouter;
