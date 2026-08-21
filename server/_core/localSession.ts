import { parse } from "cookie";
import { decodeProtectedHeader, jwtVerify, SignJWT } from "jose";
import type { Request } from "express";
import { User } from "../../drizzle/schema";
import { getUserById } from "../db";
import { COOKIE_NAME } from "../../shared/const";
import { ENV } from "./env";

const LOCAL_SESSION_TYPE = "wijiedu-local";
const SESSION_DURATION = "7d";

function getSessionKey() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

function getTokenFromRequest(req: Request) {
  const bearer = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer) return bearer;
  return parse(req.headers.cookie ?? "")[COOKIE_NAME];
}

export async function createLocalSession(user: User) {
  return new SignJWT({ role: user.role, loginMethod: "local" })
    .setProtectedHeader({ alg: "HS256", typ: LOCAL_SESSION_TYPE })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSessionKey());
}

export async function authenticateLocalSession(req: Request): Promise<User | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const header = decodeProtectedHeader(token);
  if (header.typ !== LOCAL_SESSION_TYPE) return null;
  const { payload } = await jwtVerify(token, getSessionKey());
  const userId = Number(payload.sub);
  if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error("Invalid local session subject");
  const user = await getUserById(userId);
  if (!user || user.loginMethod !== "local") throw new Error("Local session user not found");
  return user;
}
