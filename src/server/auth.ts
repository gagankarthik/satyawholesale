import { CognitoJwtVerifier } from "aws-jwt-verify";
import { env } from "./env";

export type Role = "admin" | "buyer";
export interface AuthUser {
  sub: string;
  email: string;
  roles: Role[];
  /** The buyer's store name (custom:store); admins may not have one. */
  store: string | null;
}

let _verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;
const verifier = () => (_verifier ??= CognitoJwtVerifier.create({
  userPoolId: env.userPoolId,
  clientId: env.clientId,
  tokenUse: "id",
}));

/** Verifies the Bearer ID token; null when absent/invalid. */
export async function getAuth(req: Request): Promise<AuthUser | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    const p = await verifier().verify(token);
    const groups = (p["cognito:groups"] as string[] | undefined) ?? [];
    return {
      sub: String(p.sub),
      email: String(p.email ?? ""),
      roles: groups.filter((g): g is Role => g === "admin" || g === "buyer"),
      store: (p["custom:store"] as string | undefined) ?? null,
    };
  } catch {
    return null;
  }
}

export const isAdmin = (u: AuthUser | null) => !!u?.roles.includes("admin");
export const isBuyer = (u: AuthUser | null) => !!u && (u.roles.includes("buyer") || u.roles.includes("admin"));

export const unauthorized = () =>
  Response.json({ error: "Sign in to continue." }, { status: 401 });
export const forbidden = () =>
  Response.json({ error: "Your account doesn't have access to this." }, { status: 403 });
