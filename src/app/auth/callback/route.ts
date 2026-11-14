import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// The same door as the Ops Tracker, for now (her call, 14 Nov): company Google
// accounts on the approved allow-list; the owner always. Fail CLOSED — any
// error or "not allowed" signs them straight back out.
const COMPANY_DOMAIN = "@rcstructures.com";
const SUPER_ADMIN = "hillary@rcstructures.com";

/** Google sign-in comes back here: swap the code for a session, then check the list. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only a path on this site: "//evil.com" would send someone elsewhere.
  const wanted = searchParams.get("next") ?? "";
  const next = /^\/(?![\/\\])[^\s]*$/.test(wanted) ? wanted : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      const email = (user?.email ?? "").toLowerCase();
      let permitted = false;
      if (email === SUPER_ADMIN) permitted = true;
      else if (email.endsWith(COMPANY_DOMAIN)) {
        const { data: allowed, error: rpcErr } = await supabase.rpc("email_sign_in_allowed", { e: email });
        permitted = !rpcErr && allowed === true;
      }
      if (!permitted) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/sign-in?error=not-authorized`);
      }
      // As the Ops Tracker does on a first sign-in: anything staged for an
      // invited person (job assignments, their name) is applied now.
      await supabase.rpc("apply_pending_memberships");
      await supabase.rpc("claim_invited_name");
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/sign-in?error=auth`);
}
