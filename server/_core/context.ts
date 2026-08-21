import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { COOKIE_NAME } from "../../shared/const";
import type { User } from "../../drizzle/schema";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Remove an invalid browser session so the public access screen can recover.
    opts.res.clearCookie(COOKIE_NAME, {
      ...getSessionCookieOptions(opts.req),
      maxAge: -1,
    });
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
