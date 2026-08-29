import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { COOKIE_NAME } from "../../shared/const";
import type { User } from "../../drizzle/schema";
import { getSessionCookieOptions } from "./cookies";
import { authenticateLocalSession } from "./localSession";
import { getInstitutionForUser } from "../db";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  institutionId?: number;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await authenticateLocalSession(opts.req);
    if (!user) user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Remove an invalid browser session so the public access screen can recover.
    opts.res.clearCookie(COOKIE_NAME, {
      ...getSessionCookieOptions(opts.req),
    });
    user = null;
  }

  const requestedInstitutionId = Number(opts.req.cookies?.wijiedu_institution || 0) || undefined;
  const institutionId = user ? await getInstitutionForUser(user.id, requestedInstitutionId) : undefined;

  return {
    req: opts.req,
    res: opts.res,
    user,
    institutionId,
  };
}
