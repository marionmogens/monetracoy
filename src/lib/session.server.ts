import { useSession } from "@tanstack/react-start/server";

export type SessionData = { userId?: string };

export function getMonetraSession() {
  return useSession<SessionData>({
    password:
      process.env.SESSION_SECRET ||
      "monetra-dev-placeholder-secret-please-change-in-production-please-change",
    name: "monetra_session",
    maxAge: 60 * 60 * 24 * 30,
    cookie: {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "none",
    },
  });
}
