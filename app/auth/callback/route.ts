// /app/api/auth/callback/route.ts (Next.js App Router)
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  let next = url.searchParams.get("next") ?? "/";
  if (!next.startsWith("/")) next = "/";

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      const origin = url.origin;
      const forwardedHost = request.headers.get("x-forwarded-host");
      const redirectUrl =
        process.env.NODE_ENV === "development"
          ? `${origin}${next}`
          : forwardedHost
          ? `https://${forwardedHost}${next}`
          : `${origin}${next}`;
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.redirect(`${new URL(request.url).origin}/auth/error`);
}
