import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import type { JwtPayload } from "@/lib/auth";

export async function getServerSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireRole(usertype: "superAdmin" | "retailer"): Promise<JwtPayload> {
  const session = await getServerSession();
  if (!session || session.usertype !== usertype) {
    redirect("/auth/login");
  }
  return session;
}
