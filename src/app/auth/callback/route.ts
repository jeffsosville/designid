import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const linkError = url.searchParams.get("error_description");

  if (linkError) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(linkError)}`, url.origin));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=Sign-in%20link%20was%20missing%20its%20code", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
  }
  return NextResponse.redirect(new URL("/", url.origin));
}
