import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (icons, images)
     * - sw.js (service worker)
     * - manifest (PWA manifest)
     * - api/cron (cron routes)
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|bank-logos/|sw\\.js|manifest|api/cron).*)",
  ],
};
