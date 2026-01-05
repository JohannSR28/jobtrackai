import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { safeNextPath } from "@/utils/auth/safeNextPath";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  // Où rediriger après login

  const nextRaw = url.searchParams.get("next");
  const next = safeNextPath(nextRaw); // empêche open redirect

  if (!code) {
    return NextResponse.redirect(
      new URL(`/login?error=missing_code`, url.origin)
    );
  }

  const supabase = await createClient();

  // échange code -> session (cookies)
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin)
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
