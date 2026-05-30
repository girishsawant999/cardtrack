import { timingSafeEqual } from "node:crypto";

export class CronAuthError extends Error {
  status = 401;
}

export function assertCronAuth(req: Request): void {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    const err = new CronAuthError("CRON_SECRET is not configured on the server");
    err.status = 500;
    throw err;
  }

  const header = req.headers.get("authorization") ?? "";
  const provided = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";

  if (!provided) throw new CronAuthError("Missing bearer token");

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new CronAuthError("Invalid bearer token");
  }
}
