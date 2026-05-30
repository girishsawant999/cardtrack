import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.id) {
        const providerToken = session.provider_token ?? null;
        const providerRefreshToken = session.provider_refresh_token ?? null;
        const expiresAt = session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : null;

        if (providerToken || providerRefreshToken) {
          await supabase.from("gmail_oauth_tokens").upsert({
            user_id: session.user.id,
            provider: "google",
            access_token: providerToken,
            refresh_token: providerRefreshToken,
            token_type: session.token_type ?? null,
            scope: session.user.app_metadata?.provider
              ? "https://www.googleapis.com/auth/gmail.readonly"
              : null,
            expires_at: expiresAt,
          });

          await supabase
            .from("profiles")
            .update({ gmail_connected: true })
            .eq("id", session.user.id);
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
