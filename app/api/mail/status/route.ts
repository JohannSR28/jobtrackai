import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { MailConnectionRepository } from "@/repositories/MailConnectionRepository";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;
  if (error || !user) {
    return NextResponse.json(
      { authenticated: false, connected: false },
      { status: 200 }
    );
  }

  const repo = new MailConnectionRepository(supabase);
  const conn = await repo.getByUserId(user.id);

  if (!conn) {
    return NextResponse.json(
      { authenticated: true, connected: false },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      connected: true,
      provider: conn.provider,
      email: conn.email,
    },
    { status: 200 }
  );
}
