import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { MailConnectionsService } from "@/services/MailConnectionsService";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.id) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/mail-connection?error=unauthorized`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/mail-connection?error=missing_code`
      );
    }

    const service = new MailConnectionsService(user.id, "gmail");
    await service.handleAuthorizationCode(code);

    //  URL absolue obligatoire
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/mail-connection?success=1`
    );
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(
      `${
        process.env.NEXT_PUBLIC_BASE_URL
      }/mail-connection?error=${encodeURIComponent((err as Error).message)}`
    );
  }
}
